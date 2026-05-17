const { ReplacementRequest, Employee, Item } = require('../models');
const mongoose = require('mongoose');

class ReplacementService {
    async getAll(filters = {}) {
        const { status, employeeId, page, limit } = filters;
        const query = {};

        if (status) {
            if (status.includes(',')) {
                const parts = status.split(',').map(s => s.trim());
                const statusList = [...parts, ...parts.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())];
                query.status = { $in: statusList };
            } else {
                const titleCase = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                query.status = { $in: [status, titleCase] };
            }
        }
        if (employeeId) query.employee = employeeId;

        let dbQuery = ReplacementRequest.find(query)
            .populate('employee')
            .populate('item')
            .sort({ requested_date: -1 });

        if (page && limit) {
            dbQuery = dbQuery.skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit));
            const items = await dbQuery;
            const total = await ReplacementRequest.countDocuments(query);
            return { items, total };
        }

        return await dbQuery;
    }

    async getSummary() {
        const completedRequests = await ReplacementRequest.find({ status: { $in: ['Completed', 'completed'] } });
        
        let totalCost = 0;
        let totalDeductions = 0;
        completedRequests.forEach(r => {
            totalCost += (r.total_cost || 0);
            totalDeductions += (r.deduction_amount || 0);
        });

        const [pendingCount, paidCount] = await Promise.all([
            ReplacementRequest.countDocuments({ status: { $in: ['Approved', 'Pending', 'approved', 'pending'] } }),
            ReplacementRequest.countDocuments({ status: { $in: ['Completed', 'completed'] } })
        ]);

        return { 
            total_cost: totalCost, 
            total_deductions: totalDeductions,
            pending_count: pendingCount,
            paid_count: paidCount
        };
    }

    async create(data) {
        if (!data.employee_id || !mongoose.Types.ObjectId.isValid(data.employee_id)) {
            throw new Error('Invalid Employee ID');
        }
        if (!data.item_id || !mongoose.Types.ObjectId.isValid(data.item_id)) {
            throw new Error('Invalid Item ID');
        }

        const qty = parseInt(data.quantity) || 1;
        const unitCost = parseFloat(data.unit_cost) || 0;
        const totalCost = data.total_cost !== undefined ? parseFloat(data.total_cost) : (qty * unitCost);
        
        const [emp, item] = await Promise.all([
            Employee.findById(data.employee_id),
            Item.findById(data.item_id)
        ]);

        if (!emp) throw new Error('Employee not found');
        if (!item) throw new Error('Item not found');

        const recordData = {
            employee: data.employee_id,
            employee_name: emp.name,
            item: data.item_id,
            item_name: item.name,
            reason: data.reason || 'Not specified',
            quantity: qty,
            size: data.size || 'N/A',
            unit_cost: unitCost,
            total_cost: totalCost,
            deduction_amount: parseFloat(data.deduction_amount) || 0,
            payment_status: data.payment_status || (parseFloat(data.deduction_amount) > 0 ? 'Pending' : 'Not Applicable'),
            return_status: data.return_status || 'Not Required',
            status: 'Pending',
            lifecycle_status: 'Active'
        };

        return await ReplacementRequest.create(recordData);
    }

    async approve(id, data, adminId) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid Request ID');

        const updateData = {
            status: 'Approved',
            resolved_by: adminId,
            resolved_date: new Date(),
            notes: data.notes
        };

        if (data.unit_cost !== undefined) {
            updateData.unit_cost = parseFloat(data.unit_cost);
            const req = await ReplacementRequest.findById(id);
            if (req) {
                updateData.total_cost = (req.quantity || 1) * updateData.unit_cost;
            }
        }
        
        if (data.deduction_amount !== undefined) {
            updateData.deduction_amount = parseFloat(data.deduction_amount);
            if (updateData.deduction_amount > 0) {
                updateData.payment_status = 'Pending';
            }
        }

        return await ReplacementRequest.findByIdAndUpdate(id, updateData, { new: true });
    }

    async handover(id, data) {
        console.log(`[Service] Handover starting for ID: ${id}`);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid Replacement Request ID: ${id}`);
        }

        const req = await ReplacementRequest.findById(id);
        if (!req) {
            throw new Error(`Replacement request not found with ID: ${id}`);
        }

        const updateData = {
            status: 'Completed',
            lifecycle_status: 'Completed',
            signature_path: data.signature_path,
            notes: data.notes || req.notes,
            ocr_details: data.ocr_details || req.ocr_details,
            verification_method: data.verification_method || 'Signature',
            resolved_by: data.admin_id,
            resolved_date: new Date(),
            item_collected: true,
            acknowledged: true
        };

        // Update payment status if deduction exists
        if (req.deduction_amount > 0) {
            updateData.payment_status = 'Deducted';
        }
        
        if (req.return_status === 'Pending Return') {
            updateData.return_status = 'Returned';
        }

        const updated = await ReplacementRequest.findByIdAndUpdate(id, updateData, { new: true });
        console.log(`[Service] Handover completed for ID: ${id}`);
        return updated;
    }

    async reject(id, notes, adminId) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid Request ID');

        return await ReplacementRequest.findByIdAndUpdate(id, {
            status: 'Rejected',
            resolved_by: adminId,
            resolved_date: new Date(),
            notes: notes
        }, { new: true });
    }
}

module.exports = new ReplacementService();
