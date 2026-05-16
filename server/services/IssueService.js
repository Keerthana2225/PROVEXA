const { IssueRecord, Employee, Item, ItemCategory } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

class IssueService {
    async getAll(filters = {}) {
        const where = {};
        if (filters.employee_id) where.employee_id = filters.employee_id;
        if (filters.item_id) where.item_id = filters.item_id;
        
        if (filters.status === 'pending_ack') {
            where.issue_status = 'Pending Acknowledgement';
            where.lifecycle_status = { [Op.ne]: 'Returned' };
        } else if (filters.status === 'acknowledged') {
            where.issue_status = 'Acknowledged';
        } else if (filters.status === 'renewal_due') {
            where.lifecycle_status = 'Renewal Due';
        } else if (filters.lifecycle_status) {
            where.lifecycle_status = filters.lifecycle_status;
        } else {
            where.lifecycle_status = { [Op.ne]: 'Returned' };
        }

        return await IssueRecord.findAll({
            where,
            include: [
                { model: Employee, as: 'employee' },
                { model: Item, as: 'item', include: [{ model: ItemCategory, as: 'category' }] }
            ],
            order: [['issued_date', 'DESC']]
        });
    }

    async getUpcomingRenewals(days = 30) {
        const today = dayjs().startOf('day').toDate();
        const futureDate = dayjs().add(days, 'day').endOf('day').toDate();

        const upcoming = await IssueRecord.findAll({
            where: {
                lifecycle_status: 'Active',
                next_due_date: { [Op.lte]: futureDate }
            },
            include: [
                { model: Employee, as: 'employee' },
                { model: Item, as: 'item' }
            ],
            order: [['next_due_date', 'ASC']]
        });

        const nextWeek = dayjs().add(7, 'day').endOf('day').toDate();
        const actionNeeded = upcoming.filter(i => dayjs(i.next_due_date).isBefore(nextWeek));
        const futureRenewals = upcoming.filter(i => dayjs(i.next_due_date).isAfter(nextWeek));

        return { actionNeeded, futureRenewals };
    }

    async create(data) {
        return await IssueRecord.create(data);
    }

    async bulkIssue(employee_ids, items, issued_date, notes, item_condition, admin_id, override = false) {
        const results = [];
        const issuedDateObj = dayjs(issued_date).toDate();

        for (const empId of employee_ids) {
            const employeeObj = await Employee.findByPk(empId);
            const employeeName = employeeObj ? employeeObj.name : 'Unknown';

            for (const targetItem of items) {
                const itId = targetItem.item_id;
                const qty = parseInt(targetItem.quantity) || 1;
                
                const item = await Item.findByPk(itId);
                if (!item) continue;

                const next_due_date = item.fixed_date 
                    ? new Date(item.fixed_date) 
                    : dayjs(issuedDateObj).add(item.frequency_days, 'day').toDate();

                // Check for active issues
                const activeIssue = await IssueRecord.findOne({
                    where: {
                        employee_id: empId,
                        item_id: itId,
                        lifecycle_status: 'Active'
                    }
                });

                if (activeIssue && !override) {
                    throw { 
                        status: 400, 
                        message: `Employee ${employeeName} already has an active issue for ${item.name}`,
                        itemId: itId 
                    };
                }

                // If override, return the old one
                if (override && activeIssue) {
                    await activeIssue.update({
                        lifecycle_status: 'Returned',
                        return_date: new Date(),
                        return_remarks: 'Superseded by new issuance',
                        timeline: [...activeIssue.timeline, {
                            status: 'Returned',
                            date: new Date(),
                            by_admin: admin_id,
                            notes: 'Automatically returned due to override new issue'
                        }]
                    });
                }

                const record = await IssueRecord.create({
                    employee_id: empId,
                    employee_name: employeeName,
                    item_id: itId,
                    item_name: item.name,
                    quantity: qty,
                    issued_date: issuedDateObj,
                    next_due_date,
                    notes,
                    issued_by: admin_id,
                    issue_status: 'Pending Acknowledgement',
                    acknowledged: false,
                    lifecycle_status: 'Active',
                    item_condition: item_condition || 'Good',
                    timeline: [{
                        status: 'Issued',
                        date: new Date(),
                        by_admin: admin_id,
                        notes: `Issued ${qty} quantity. Condition: ${item_condition || 'Good'}`
                    }]
                });
                results.push(record);
            }
        }
        return results;
    }

    async renew(id, notes, item_condition, admin_id) {
        const oldRecord = await IssueRecord.findByPk(id, { include: [{ model: Item, as: 'item' }] });
        if (!oldRecord) throw new Error('Record not found');

        // Close old record
        await oldRecord.update({
            lifecycle_status: 'Renewed',
            return_date: new Date(),
            return_remarks: notes || 'Returned for renewal',
            timeline: [...oldRecord.timeline, {
                status: 'Returned (Renewal)',
                date: new Date(),
                by_admin: admin_id,
                notes: notes || 'Returned as part of renewal process'
            }]
        });

        // Create new record
        const next_due_date = oldRecord.item.fixed_date 
            ? new Date(oldRecord.item.fixed_date) 
            : dayjs().add(oldRecord.item.frequency_days, 'day').toDate();

        return await IssueRecord.create({
            employee_id: oldRecord.employee_id,
            employee_name: oldRecord.employee_name,
            item_id: oldRecord.item_id,
            item_name: oldRecord.item_name,
            quantity: oldRecord.quantity,
            issued_date: new Date(),
            next_due_date,
            notes,
            issued_by: admin_id,
            issue_status: 'Pending Acknowledgement',
            acknowledged: false,
            lifecycle_status: 'Active',
            item_condition: item_condition || 'Good',
            timeline: [{
                status: 'Issued (Renewal)',
                date: new Date(),
                by_admin: admin_id,
                notes: `Issued as renewal. Condition: ${item_condition || 'Good'}`
            }]
        });
    }

    async acknowledge(id, { signature_path, verification_method, ocr_details, admin_id }) {
        const issue = await IssueRecord.findByPk(id);
        if (!issue) throw new Error('Record not found');

        return await issue.update({
            issue_status: 'Acknowledged',
            acknowledged: true,
            signature_path,
            acknowledgement_time: new Date(),
            verification_method: verification_method || 'Signature',
            timeline: [...issue.timeline, {
                status: 'Acknowledged',
                date: new Date(),
                by_admin: admin_id || null,
                notes: `Employee acknowledged receipt via ${verification_method || 'Signature'}`
            }]
        });
    }

    async return(id, remarks, condition, admin_id) {
        const record = await IssueRecord.findByPk(id);
        if (!record) throw new Error('Record not found');

        return await record.update({
            lifecycle_status: 'Returned',
            return_date: new Date(),
            return_remarks: remarks,
            returned_condition: condition || 'Good',
            timeline: [...record.timeline, {
                status: 'Returned',
                date: new Date(),
                by_admin: admin_id,
                notes: `Returned condition: ${condition}. ${remarks || ''}`
            }]
        });
    }
}

module.exports = new IssueService();
