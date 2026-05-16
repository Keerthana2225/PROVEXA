const { ReplacementRequest, Employee, Item } = require('../models');
const { Op, fn, col } = require('sequelize');

class ReplacementService {
    async getAll(filters = {}) {
        const where = {};
        if (filters.status && filters.status !== 'all') {
            const statusArray = filters.status.split(',').map(s => {
                const trimmed = s.trim();
                return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            });
            where.status = { [Op.in]: statusArray };
        }
        if (filters.employee_id) where.employee_id = filters.employee_id;
        if (filters.item_id) where.item_id = filters.item_id;

        return await ReplacementRequest.findAll({
            where,
            include: [
                { model: Employee, as: 'employee' },
                { model: Item, as: 'item' }
            ],
            order: [['requested_date', 'DESC']]
        });
    }

    async getById(id) {
        return await ReplacementRequest.findByPk(id, {
            include: [
                { model: Employee, as: 'employee' },
                { model: Item, as: 'item' }
            ]
        });
    }

    async create(data) {
        return await ReplacementRequest.create(data);
    }

    async update(id, data) {
        const request = await ReplacementRequest.findByPk(id);
        if (!request) throw new Error('Replacement request not found');
        return await request.update(data);
    }

    async approve(id, { notes, unit_cost, deduction_amount }, admin_id) {
        const request = await ReplacementRequest.findByPk(id);
        if (!request) throw new Error('Request not found');
        if (request.status !== 'Pending') throw new Error('Request must be pending to approve');

        const updateData = { status: 'Approved', notes };
        
        if (unit_cost !== undefined && unit_cost !== null) {
            updateData.unit_cost = unit_cost;
            updateData.total_cost = Number(unit_cost) * request.quantity;
        }
        
        if (deduction_amount !== undefined && deduction_amount !== null) {
            updateData.deduction_amount = deduction_amount;
            updateData.payment_status = Number(deduction_amount) > 0 ? 'Pending' : 'No Deduction';
        }
        
        return await request.update(updateData);
    }

    async handover(id, { signature_path, notes, ocr_details, verification_method, admin_id }) {
        const request = await ReplacementRequest.findByPk(id, { include: [{ model: Item, as: 'item' }] });
        if (!request) throw new Error('Request not found');
        if (request.status !== 'Approved') throw new Error('Request must be approved before handover');

        const now = new Date();

        // 1. Complete Request
        await request.update({
            status: 'Completed',
            replacement_date: now,
            resolved_date: now,
            resolved_by: admin_id,
            signature_path,
            acknowledged: true,
            acknowledgement_time: now,
            verification_method,
            notes: notes ? `${request.notes || ''} | Handover: ${notes}` : request.notes,
            payment_status: request.deduction_amount > 0 ? 'Pending' : 'No Deduction'
        });

        // 2. Close Old Issue
        const IssueService = require('./IssueService');
        const oldIssue = await IssueRecord.findOne({
            where: {
                employee_id: request.employee_id,
                item_id: request.item_id,
                lifecycle_status: 'Active'
            }
        });

        if (oldIssue) {
            await oldIssue.update({
                lifecycle_status: 'Returned',
                return_date: now,
                return_remarks: `Returned for replacement (Request #${id})`,
                returned_condition: 'Returned',
                timeline: [...oldIssue.timeline, {
                    status: 'Returned (Replacement)',
                    date: now,
                    by_admin: admin_id,
                    notes: `Automatically returned during replacement handover.`
                }]
            });
        }

        // 3. Create New Issue
        const next_due_date = request.item.fixed_date 
            ? new Date(request.item.fixed_date) 
            : dayjs(now).add(request.item.frequency_days, 'day').toDate();

        const employeeObj = await Employee.findByPk(request.employee_id);

        return await IssueRecord.create({
            employee_id: request.employee_id,
            employee_name: employeeObj ? employeeObj.name : 'Unknown',
            item_id: request.item_id,
            item_name: request.item.name,
            quantity: request.quantity,
            issued_date: now,
            next_due_date,
            notes: `Replacement for request #${id}. Size: ${request.size}`,
            issued_by: admin_id,
            issue_status: 'Acknowledged',
            acknowledged: true,
            signature_path,
            verification_method,
            acknowledgement_time: now,
            lifecycle_status: 'Active',
            item_condition: 'Good',
            timeline: [{
                status: 'Issued (Replacement)',
                date: now,
                by_admin: admin_id,
                notes: `Issued as a replacement. Size: ${request.size}`
            }, {
                status: 'Acknowledged',
                date: now,
                by_admin: admin_id,
                notes: `Employee verified via ${verification_method} on replacement receipt.`
            }]
        });
    }

    async reject(id, notes, admin_id) {
        const request = await ReplacementRequest.findByPk(id);
        if (!request) throw new Error('Request not found');
        return await request.update({
            status: 'Rejected',
            resolved_date: new Date(),
            resolved_by: admin_id,
            notes
        });
    }

    async getSummary() {
        const totalApproved = await ReplacementRequest.count({ where: { status: 'Approved' } });
        const totalCompleted = await ReplacementRequest.count({ where: { status: 'Completed' } });
        
        const financialStats = await ReplacementRequest.findAll({
            where: {
                [Op.or]: [
                    { is_uniform_replacement: true },
                    { total_cost: { [Op.gt]: 0 } }
                ],
                status: { [Op.in]: ['Approved', 'Completed'] }
            },
            attributes: [
                [fn('SUM', col('total_cost')), 'total_cost'],
                [fn('SUM', col('deduction_amount')), 'total_deductions']
            ],
            raw: true
        });

        return {
            pendingHandover: totalApproved,
            totalCompleted: totalCompleted,
            totalCost: financialStats[0]?.total_cost || 0,
            totalDeductions: financialStats[0]?.total_deductions || 0
        };
    }
}

module.exports = new ReplacementService();
