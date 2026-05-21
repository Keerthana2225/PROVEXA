const mongoose = require('mongoose');
const { IssueRecord, Employee, Item, VerificationLog } = require('../models');
class IssueService {
    async getAll(filters = {}) {
        const { search, status, lifecycle_status, employeeId, page, limit } = filters;
        
        // If lifecycle_status is explicitly requested, do not force archived: false
        const query = {};
        if (lifecycle_status) {
            query.lifecycle_status = lifecycle_status;
        } else {
            query.archived = false;
        }

        if (status) {
            if (status === 'pending_ack') query.issue_status = 'Pending Acknowledgement';
            else if (status === 'acknowledged') query.issue_status = 'Acknowledged';
            else query.issue_status = status;
        }

        if (employeeId) query.employee = employeeId;
        
        if (search) {
            query.$or = [
                { employee_name: { $regex: search, $options: 'i' } },
                { item_name: { $regex: search, $options: 'i' } }
            ];
        }

        let dbQuery = IssueRecord.find(query)
            .populate('employee')
            .populate({
                path: 'item',
                populate: { path: 'category' }
            })
            .sort({ issued_date: -1 });

        let records = [];
        let total = 0;

        if (page && limit) {
            dbQuery = dbQuery.skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit));
            records = await dbQuery;
            total = await IssueRecord.countDocuments(query);
        } else {
            records = await dbQuery;
        }

        // Populate timeline for each record!
        const itemsWithTimeline = await Promise.all(records.map(async (rec) => {
            const allComboRecords = await IssueRecord.find({
                employee: rec.employee?._id || rec.employee,
                item: rec.item?._id || rec.item
            }).sort({ issued_date: 1 });

            const timeline = [];

            for (const cRec of allComboRecords) {
                // Event 1: Initial Issue
                timeline.push({
                    status: cRec.archive_reason === 'Renewed' ? 'Issued (Renewed)' : 'Initial Issue',
                    date: cRec.issued_date,
                    notes: cRec.notes || `Asset issued in condition: ${cRec.item_condition || 'Good'}`
                });

                // Event 2: Acknowledgment
                if (cRec.acknowledged) {
                    timeline.push({
                        status: `Verified (${cRec.verification_method || 'Signature'})`,
                        date: cRec.acknowledgement_time || cRec.updated_at,
                        notes: `Receipt acknowledged by employee`
                    });
                }

                // Event 3: Return / Archive
                if (cRec.archived) {
                    timeline.push({
                        status: cRec.archive_reason || 'Archived',
                        date: cRec.return_date || cRec.archived_at || cRec.updated_at,
                        notes: cRec.archive_reason ? `Asset marked as: ${cRec.archive_reason} (${cRec.returned_condition || 'N/A'})` : 'Archived'
                    });
                }
            }

            // Sort timeline by date descending
            timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                ...rec.toObject(),
                timeline
            };
        }));

        if (page && limit) {
            return { items: itemsWithTimeline, total };
        }
        return itemsWithTimeline;
    }

    async getUpcomingRenewals(days = 7) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + days);

        const query = {
            archived: false,
            lifecycle_status: 'Active'
        };

        const records = await IssueRecord.find(query)
            .populate('employee')
            .populate({
                path: 'item',
                populate: { path: 'category' }
            })
            .sort({ next_due_date: 1 });

        // For each record, fetch its verification history (timeline)
        const itemsWithTimeline = await Promise.all(records.map(async (rec) => {
            const allComboRecords = await IssueRecord.find({
                employee: rec.employee?._id || rec.employee,
                item: rec.item?._id || rec.item
            }).sort({ issued_date: 1 });

            const timeline = [];

            for (const cRec of allComboRecords) {
                // Event 1: Initial Issue
                timeline.push({
                    status: cRec.archive_reason === 'Renewed' ? 'Issued (Renewed)' : 'Initial Issue',
                    date: cRec.issued_date,
                    notes: cRec.notes || `Asset issued in condition: ${cRec.item_condition || 'Good'}`
                });

                // Event 2: Acknowledgment
                if (cRec.acknowledged) {
                    timeline.push({
                        status: `Verified (${cRec.verification_method || 'Signature'})`,
                        date: cRec.acknowledgement_time || cRec.updated_at,
                        notes: `Receipt acknowledged by employee`
                    });
                }

                // Event 3: Return / Archive
                if (cRec.archived) {
                    timeline.push({
                        status: cRec.archive_reason || 'Archived',
                        date: cRec.return_date || cRec.archived_at || cRec.updated_at,
                        notes: cRec.archive_reason ? `Asset marked as: ${cRec.archive_reason} (${cRec.returned_condition || 'N/A'})` : 'Archived'
                    });
                }
            }

            timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                ...rec.toObject(),
                timeline
            };
        }));

        return { items: itemsWithTimeline, actionNeeded: itemsWithTimeline, futureRenewals: [] };
    }

    async bulkIssue(employeeIds, items, issuedDate, notes, condition, adminId, override = false) {
        const results = [];
        
        for (const empId of employeeIds) {
            const transaction_id = new mongoose.Types.ObjectId().toString();
            const employee = await Employee.findById(empId);
            if (!employee) continue;

            for (const itemInput of items) {
                const itemId = itemInput.item_id || itemInput.id;
                const item = await Item.findById(itemId);
                if (!item) continue;

                // Duplicate Check: Check if this employee already has this item active
                if (!override) {
                    const existing = await IssueRecord.findOne({
                        employee: empId,
                        item: itemId,
                        archived: false,
                        lifecycle_status: 'Active'
                    });
                    if (existing) {
                        const err = new Error('Active issue already exists');
                        err.status = 400;
                        err.itemId = itemId;
                        err.activeIssue = existing;
                        throw err;
                    }
                } else {
                    // If override is true, archive any existing active records for this emp/item first
                    await IssueRecord.updateMany(
                        { employee: empId, item: itemId, archived: false },
                        { 
                            archived: true, 
                            archive_reason: 'Overridden by new issue',
                            archived_at: new Date(),
                            archived_by: adminId,
                            return_date: new Date()
                        }
                    );
                }

                const issuedAt = new Date(issuedDate);
                const nextDue = new Date(issuedAt);
                nextDue.setMonth(nextDue.getMonth() + (item.validity_period || 12));

                const record = await IssueRecord.create({
                    transaction_id,
                    employee: empId,
                    employee_name: employee.name,
                    item: itemId,
                    item_name: item.name,
                    issued_date: issuedAt,
                    next_due_date: nextDue,
                    quantity: itemInput.quantity || 1,
                    issued_by: adminId,
                    notes,
                    issue_status: 'Pending Acknowledgement',
                    lifecycle_status: 'Active',
                    item_condition: condition || 'Good'
                });
                
                // Decrement stock
                await Item.findByIdAndUpdate(itemId, { $inc: { stock: -(itemInput.quantity || 1) } });
                
                results.push(record);
            }
        }
        return results;
    }

    async renew(id, notes, condition, adminId) {
        const oldRecord = await IssueRecord.findById(id);
        if (!oldRecord) throw new Error('Record not found');

        oldRecord.archived = true;
        oldRecord.archive_reason = 'Renewed';
        oldRecord.lifecycle_status = 'Returned';
        oldRecord.return_date = new Date();
        await oldRecord.save();

        const nextDue = new Date();
        const item = await Item.findById(oldRecord.item);
        nextDue.setMonth(nextDue.getMonth() + (item?.validity_period || 12));

        return await IssueRecord.create({
            employee: oldRecord.employee,
            employee_name: oldRecord.employee_name,
            item: oldRecord.item,
            item_name: oldRecord.item_name,
            issued_date: new Date(),
            next_due_date: nextDue,
            quantity: oldRecord.quantity,
            issued_by: adminId,
            notes: notes || 'Renewal',
            issue_status: 'Pending Acknowledgement',
            lifecycle_status: 'Active',
            item_condition: condition || 'Good',
            is_renewal: true
        });
        
        // Decrement stock for the renewal item
        await Item.findByIdAndUpdate(oldRecord.item, { $inc: { stock: -(oldRecord.quantity || 1) } });
        
        return newRecord;
    }

    async return(id, remarks, condition, adminId) {
        const record = await IssueRecord.findByIdAndUpdate(id, {
            lifecycle_status: 'Returned',
            issue_status: 'Acknowledged',
            notes: remarks,
            archived: true,
            archived_at: new Date(),
            archived_by: adminId,
            archive_reason: 'Returned',
            return_date: new Date(),
            returned_condition: condition || 'Good'
        }, { new: true });
        
        // Increment stock if condition is Good
        if (record && (condition === 'Good' || !condition)) {
            await Item.findByIdAndUpdate(record.item, { $inc: { stock: record.quantity || 1 } });
        }
        
        return record;
    }

    async acknowledge(id, data) {
        const { signature_path, verification_method, ocr_details, admin_id } = data;
        
        return await IssueRecord.findByIdAndUpdate(id, {
            signature_path,
            verification_method,
            ocr_details,
            acknowledged: true,
            issue_status: 'Acknowledged',
            acknowledgement_time: new Date()
        }, { new: true });
    }

    async archiveReset(data, adminId) {
        const { scope, employeeId, itemId, reason, issue_ids } = data;
        const query = { archived: false };

        if (scope === 'employee') query.employee = employeeId;
        else if (scope === 'item') query.item = itemId;
        else if (scope === 'single') query._id = data.issueId;
        else if (scope === 'selected' && issue_ids) query._id = { $in: issue_ids };

        const result = await IssueRecord.updateMany(query, {
            archived: true,
            archived_at: new Date(),
            archived_by: adminId,
            archive_reason: reason || 'Batch Reset'
        });

        return { message: `Successfully archived ${result.modifiedCount} records.`, count: result.modifiedCount };
    }
}

module.exports = new IssueService();
