const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { IssueRecord, Employee, Item, ItemCategory, VerificationLog } = require('../models');

// Normalize Sequelize PascalCase joins → lowercase for frontend compatibility
function normalizeIssue(r) {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    if (j.Employee) { j.employee = j.Employee; delete j.Employee; }
    else if (typeof j.employee === 'string') {
        j.employee = { _id: j.employee, id: j.employee, name: j.employee_name || 'Unknown', emp_code: 'N/A', department: 'N/A' };
    }
    if (j.Item) {
        const it = j.Item;
        if (it.ItemCategory) { it.category = it.ItemCategory; delete it.ItemCategory; }
        j.item = it; delete j.Item;
    } else if (typeof j.item === 'string') {
        j.item = { _id: j.item, id: j.item, name: j.item_name || 'Unknown', category: { name: 'N/A' } };
    }
    return j;
}

class IssueService {
    async getAll(filters = {}) {
        const { search, status, lifecycle_status, employeeId, page, limit } = filters;
        const where = {};
        
        if (lifecycle_status) {
            where.lifecycle_status = lifecycle_status;
            if (lifecycle_status === 'Active') {
                where.archived = false;
            }
        } else {
            where.archived = false;
        }

        if (status) {
            if (status === 'pending_ack') where.issue_status = 'Pending Acknowledgement';
            else if (status === 'acknowledged') where.issue_status = 'Acknowledged';
            else where.issue_status = status;
        }

        if (employeeId) where.employee = employeeId;
        
        if (search) {
            where[Op.or] = [
                { employee_name: { [Op.like]: `%${search}%` } },
                { item_name: { [Op.like]: `%${search}%` } }
            ];
        }

        const queryOptions = {
            where,
            include: [
                { model: Employee },
                { model: Item, include: [{ model: ItemCategory }] }
            ],
            order: [['issued_date', 'DESC']]
        };

        let records = [];
        let total = 0;

        if (page && limit) {
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
            queryOptions.limit = parseInt(limit);
            const { rows, count } = await IssueRecord.findAndCountAll(queryOptions);
            records = rows.map(r => normalizeIssue(r));
            total = count;
        } else {
            const rows = await IssueRecord.findAll(queryOptions);
            records = rows.map(r => normalizeIssue(r));
        }

        const itemsWithTimeline = await Promise.all(records.map(async (rec) => {
            const allComboRecordsModel = await IssueRecord.findAll({
                where: {
                    employee: typeof rec.employee === 'string' ? rec.employee : (rec.employee?._id || rec.employee?.id),
                    item: typeof rec.item === 'string' ? rec.item : (rec.item?._id || rec.item?.id)
                },
                order: [['issued_date', 'ASC']]
            });
            const allComboRecords = allComboRecordsModel.map(r => r.toJSON());

            const timeline = [];

            for (const cRec of allComboRecords) {
                timeline.push({
                    status: cRec.archive_reason === 'Renewed' ? 'Issued (Renewed)' : 'Initial Issue',
                    date: cRec.issued_date,
                    notes: cRec.notes || `Asset issued in condition: ${cRec.item_condition || 'Good'}`
                });

                if (cRec.acknowledged) {
                    timeline.push({
                        status: `Verified (${cRec.verification_method || 'Signature'})`,
                        date: cRec.acknowledgement_time || cRec.updated_at,
                        notes: `Receipt acknowledged by employee`
                    });
                }

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
                ...rec,
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

        const recordsModel = await IssueRecord.findAll({
            where: {
                archived: false,
                lifecycle_status: 'Active',
                next_due_date: { [Op.lte]: threshold } // To replicate Mongoose sorting logic somewhat. Wait, getUpcomingRenewals didn't have next_due_date in the query in Mongo? Actually it sorted by next_due_date: 1. Let's just return all active and sort.
            },
            include: [
                { model: Employee },
                { model: Item, include: [{ model: ItemCategory }] }
            ],
            order: [['next_due_date', 'ASC']]
        });
        const records = recordsModel.map(r => normalizeIssue(r));

        const itemsWithTimeline = await Promise.all(records.map(async (rec) => {
            const allComboRecordsModel = await IssueRecord.findAll({
                where: {
                    employee: typeof rec.employee === 'string' ? rec.employee : (rec.employee?._id || rec.employee?.id),
                    item: typeof rec.item === 'string' ? rec.item : (rec.item?._id || rec.item?.id)
                },
                order: [['issued_date', 'ASC']]
            });
            const allComboRecords = allComboRecordsModel.map(r => r.toJSON());
            const timeline = [];

            for (const cRec of allComboRecords) {
                timeline.push({
                    status: cRec.archive_reason === 'Renewed' ? 'Issued (Renewed)' : 'Initial Issue',
                    date: cRec.issued_date,
                    notes: cRec.notes || `Asset issued in condition: ${cRec.item_condition || 'Good'}`
                });
                if (cRec.acknowledged) {
                    timeline.push({
                        status: `Verified (${cRec.verification_method || 'Signature'})`,
                        date: cRec.acknowledgement_time || cRec.updated_at,
                        notes: `Receipt acknowledged by employee`
                    });
                }
                if (cRec.archived) {
                    timeline.push({
                        status: cRec.archive_reason || 'Archived',
                        date: cRec.return_date || cRec.archived_at || cRec.updated_at,
                        notes: cRec.archive_reason ? `Asset marked as: ${cRec.archive_reason} (${cRec.returned_condition || 'N/A'})` : 'Archived'
                    });
                }
            }

            timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
            return { ...rec, timeline };
        }));

        return { items: itemsWithTimeline, actionNeeded: itemsWithTimeline, futureRenewals: [] };
    }

    async bulkIssue(employeeIds, items, issuedDate, notes, condition, adminId, override = false) {
        const results = [];
        const eligibilityService = require('./EligibilityService');
        
        for (const empId of employeeIds) {
            const transaction_id = uuidv4();
            const employee = await Employee.findByPk(empId);
            if (!employee) continue;

            // Load employee profile once for efficiency
            const profile = await eligibilityService.getAssetProfile(empId);

            for (const itemInput of items) {
                const itemId = itemInput.item_id || itemInput.id;
                const item = await Item.findByPk(itemId, { include: [{ model: require('../models/ItemCategory') }] });
                if (!item) continue;

                // --- 1. Policy Quota & Eligibility Check ---
                if (profile) {
                    const qtyToIssue = itemInput.quantity || 1;
                    const catName = item.ItemCategory?.name || '';
                    const itemName = item.name || '';
                    const itemLower = itemName.toLowerCase();
                    const catLower = catName.toLowerCase();
                    const isUnion = employee.is_union_member === true || employee.employee_type === 'Union Operator';

                    if (itemLower.includes('soap')) {
                        const soap = profile.welfareBenefits?.soap;
                        if (!soap?.eligible) {
                            if (!override) {
                                const err = new Error(`Employee is not eligible for Soap under company policy.`);
                                err.status = 400;
                                throw err;
                            }
                        } else if (soap.issuedQuarterly + qtyToIssue > soap.allowedQuarterly) {
                            if (!override) {
                                const err = new Error(`Soap allocation limit reached for this quarter. Allowed: ${soap.allowedQuarterly}, Already Issued: ${soap.issuedQuarterly}.`);
                                err.status = 400;
                                throw err;
                            }
                        }
                    } else if (itemLower.includes('towel') || (itemLower.includes('bedsheet') && isUnion)) {
                        const towel = profile.welfareBenefits?.towel;
                        if (!towel?.eligible && !override) {
                            const err = new Error(`Employee is not eligible for the Union Linen Distribution Program. Only confirmed Union members receive quarterly linen. Use "Yes, Proceed" to issue as an override.`);
                            err.status = 400;
                            err.activeIssue = { message: err.message };
                            throw err;
                        } else if (towel?.hasIssuedThisQuarter && !override) {
                            const err = new Error(`Employee has already received their Union Linen distribution for Q${Math.ceil((new Date().getMonth() + 1) / 3)} this year.`);
                            err.status = 400;
                            err.activeIssue = { message: err.message };
                            throw err;
                        }
                    } else if (itemLower.includes('sweet box')) {
                        const sweetBox = profile.welfareBenefits?.sweetBox;
                        const allowed = sweetBox?.totalPerEvent || 1;
                        const eventName = notes || 'Festival Event';
                        const alreadyIssued = profile.allocations.active
                            .filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('sweet box') && (i.notes || '').toLowerCase().includes(eventName.toLowerCase()))
                            .reduce((sum, i) => sum + (i.quantity || 1), 0);
                        
                        if (alreadyIssued + qtyToIssue > allowed && !override) {
                            const err = new Error(`Sweet Box allocation limit reached for this event (${eventName}). Allowed: ${allowed}.`);
                            err.status = 400;
                            throw err;
                        }
                    } else if (itemLower.includes('boost')) {
                        // Boost is benefit-triggered (blood donation), only allowed if they have donated blood
                        const hasDonated = notes && (
                            notes.toLowerCase().includes('donation') || 
                            notes.toLowerCase().includes('donated') || 
                            notes.toLowerCase().includes('blood')
                        );
                        if (!hasDonated) {
                            const err = new Error(`Boost packets can only be issued to employees who have donated blood. Please verify and document the blood donation in the notes.`);
                            err.status = 400;
                            throw err;
                        }
                    } else {
                        // Standard annual/renewal items
                        const summary = profile.allocations.summary.find(s => 
                            s.item.toLowerCase() === itemLower ||
                            s.item.toLowerCase() === catLower ||
                            (itemLower.includes('shirt') && s.item.toLowerCase().includes('shirt'))
                        );
                        
                        if (!summary) {
                            if (!override) {
                                const err = new Error(`Employee is not eligible for ${itemName} according to company policy.`);
                                err.status = 400;
                                err.itemId = itemId;
                                err.activeIssue = { message: `Employee is not eligible for ${itemName} according to company policy.` };
                                throw err;
                            }
                        } else if (summary.remaining < qtyToIssue && summary.allowed > 0) {
                            if (!override) {
                                const err = new Error(`Quota limit reached for ${itemName}.`);
                                err.status = 400;
                                err.itemId = itemId;
                                err.activeIssue = { 
                                    message: `Allocation limit reached for ${itemName}. Proceeding will exceed the allowed quota of ${summary.allowed}.`,
                                    allowed: summary.allowed,
                                    issued: summary.issued,
                                    remaining: summary.remaining
                                };
                                throw err;
                            }
                        }
                    }
                }

                // --- 2. Active Duplicate Check ---
                if (!override) {
                    const existing = await IssueRecord.findOne({
                        where: {
                            employee: empId,
                            item: itemId,
                            archived: false,
                            lifecycle_status: 'Active'
                        }
                    });
                    if (existing) {
                        const err = new Error('Active issue already exists');
                        err.status = 400;
                        err.itemId = itemId;
                        err.activeIssue = existing.toJSON();
                        throw err;
                    }
                } else {
                    await IssueRecord.update({ 
                        archived: true, 
                        archive_reason: 'Overridden by new issue',
                        archived_at: new Date(),
                        archived_by: adminId,
                        return_date: new Date()
                    }, {
                        where: { employee: empId, item: itemId, archived: false }
                    });
                }

                const issuedAt = new Date(issuedDate);
                const nextDue = new Date(issuedAt);
                nextDue.setMonth(nextDue.getMonth() + (item.frequency_days ? Math.round(item.frequency_days/30) : 12));

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
                
                await item.decrement('stock', { by: itemInput.quantity || 1 }).catch(()=>null);
                
                results.push(record.toJSON());
            }
        }
        return results;
    }

    async renew(id, notes, condition, adminId) {
        const oldRecord = await IssueRecord.findByPk(id);
        if (!oldRecord) throw new Error('Record not found');

        await oldRecord.update({
            archived: true,
            archive_reason: 'Renewed',
            lifecycle_status: 'Returned',
            return_date: new Date()
        });

        const nextDue = new Date();
        const item = await Item.findByPk(oldRecord.item);
        nextDue.setMonth(nextDue.getMonth() + (item?.frequency_days ? Math.round(item.frequency_days/30) : 12));

        const newRecord = await IssueRecord.create({
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
        
        if (item) await item.decrement('stock', { by: oldRecord.quantity || 1 }).catch(()=>null);
        
        return newRecord.toJSON();
    }

    async return(id, remarks, condition, adminId) {
        const record = await IssueRecord.findByPk(id);
        if (record) {
            await record.update({
                lifecycle_status: 'Returned',
                issue_status: 'Acknowledged',
                notes: remarks,
                archived: true,
                archived_at: new Date(),
                archived_by: adminId,
                archive_reason: 'Returned',
                return_date: new Date(),
                returned_condition: condition || 'Good'
            });

            if (condition === 'Good' || !condition) {
                const item = await Item.findByPk(record.item);
                if (item) await item.increment('stock', { by: record.quantity || 1 }).catch(()=>null);
            }
            return record.toJSON();
        }
        return null;
    }

    async acknowledge(id, data) {
        const { signature_path, verification_method, ocr_details } = data;
        
        const record = await IssueRecord.findByPk(id);
        if (record) {
            await record.update({
                signature_path,
                verification_method,
                ocr_details: ocr_details ? JSON.stringify(ocr_details) : null,
                acknowledged: true,
                issue_status: 'Acknowledged',
                acknowledgement_time: new Date()
            });
            return record.toJSON();
        }
        return null;
    }

    async archiveReset(data, adminId) {
        const { scope, employeeId, itemId, reason, issue_ids } = data;
        const where = { archived: false };

        if (scope === 'employee') where.employee = employeeId;
        else if (scope === 'item') where.item = itemId;
        else if (scope === 'single') where._id = data.issueId;
        else if (scope === 'selected' && issue_ids) where._id = { [Op.in]: issue_ids };

        const [affectedCount] = await IssueRecord.update({
            archived: true,
            archived_at: new Date(),
            archived_by: adminId,
            archive_reason: reason || 'Batch Reset'
        }, { where });

        return { message: `Successfully archived ${affectedCount} records.`, count: affectedCount };
    }
}

module.exports = new IssueService();
