const { ReplacementRequest, Employee, Item, IssueRecord, AllocationConfig } = require('../models');
const mongoose = require('mongoose');

function getItemType(itemName) {
    const name = (itemName || '').toLowerCase();
    if (name.includes('t-shirt') || name.includes('tshirt')) return 'T-Shirt';
    if (name.includes('shirt')) return 'Shirt';
    if (name.includes('pant')) return 'Pant';
    return 'Other';
}

async function getStandardLimit(itemType, employeeType = 'Permanent') {
    const config = await AllocationConfig.findOne({ item_type: itemType });
    if (config) {
        if (employeeType === 'Newcomer') {
            return config.newcomer_quantity !== undefined ? config.newcomer_quantity : config.standard_quantity;
        } else {
            return config.permanent_quantity !== undefined ? config.permanent_quantity : config.standard_quantity;
        }
    }
    const defaults = {
        'Permanent': { 'Pant': 2, 'Shirt': 2, 'T-Shirt': 1 },
        'Newcomer': { 'Pant': 3, 'Shirt': 2, 'T-Shirt': 1 }
    };
    return (defaults[employeeType] || defaults['Permanent'])[itemType] || 0;
}

class ReplacementService {
    async getConfigs() {
        return await AllocationConfig.find({});
    }

    async updateConfigs(configs) {
        const results = [];
        for (const conf of configs) {
            const updateFields = {};
            if (conf.permanent_quantity !== undefined) {
                updateFields.permanent_quantity = parseInt(conf.permanent_quantity) || 0;
                // Backwards compatibility standard_quantity fallback
                updateFields.standard_quantity = parseInt(conf.permanent_quantity) || 0;
            }
            if (conf.newcomer_quantity !== undefined) {
                updateFields.newcomer_quantity = parseInt(conf.newcomer_quantity) || 0;
            }
            if (conf.standard_quantity !== undefined && updateFields.standard_quantity === undefined) {
                updateFields.standard_quantity = parseInt(conf.standard_quantity) || 0;
            }
            const updated = await AllocationConfig.findOneAndUpdate(
                { item_type: conf.item_type },
                updateFields,
                { new: true, upsert: true }
            );
            results.push(updated);
        }
        return results;
    }

    async getAll(filters = {}) {
        const { status, employeeId, page, limit, allocation_type } = filters;
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
        if (allocation_type) query.allocation_type = allocation_type;

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
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        let totalCost = 0;
        let totalDeductions = 0;
        completedRequests.forEach(r => {
            totalCost += (r.total_cost || 0);
            if (r.requested_date >= todayStart) {
                totalDeductions += (r.deduction_amount || 0);
            }
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

        const [emp, item] = await Promise.all([
            Employee.findById(data.employee_id),
            Item.findById(data.item_id)
        ]);

        if (!emp) throw new Error('Employee not found');
        if (!item) throw new Error('Item not found');

        const qty = parseInt(data.quantity) || 1;
        const requestedAllocationType = data.allocation_type || 'Standard';
        
        let finalAllocationType = requestedAllocationType;
        let isSalaryDeduction = data.is_salary_deduction === true || data.is_salary_deduction === 'true';
        let approvedStandardQuantity = parseInt(data.approved_standard_quantity) || 0;

        const itemType = getItemType(item.name);
        const limit = await getStandardLimit(itemType, emp.employee_type || 'Permanent');

        if (requestedAllocationType !== 'Replacement' && limit > 0) {
            const activeIssues = await IssueRecord.find({
                employee: data.employee_id,
                archived: false,
                lifecycle_status: 'Active'
            }).populate('item');

            let alreadyReceived = 0;
            for (const issue of activeIssues) {
                const name = issue.item_name || issue.item?.name;
                if (getItemType(name) === itemType) {
                    alreadyReceived += (issue.quantity || 0);
                }
            }

            if (alreadyReceived + qty > limit) {
                finalAllocationType = 'Additional';
                isSalaryDeduction = true;
            } else {
                finalAllocationType = 'Standard';
                isSalaryDeduction = false;
                approvedStandardQuantity = qty;
            }
        }

        let unitCost = parseFloat(data.unit_cost) || 0;
        let deductionAmount = parseFloat(data.deduction_amount) || 0;
        let paymentStatus = data.payment_status || 'Not Applicable';

        if (finalAllocationType === 'Standard') {
            unitCost = 0;
            deductionAmount = 0;
            paymentStatus = 'Not Applicable';
            isSalaryDeduction = false;
        } else if (finalAllocationType === 'Additional') {
            isSalaryDeduction = true;
            if (unitCost === 0) {
                if (itemType === 'Pant') unitCost = 250;
                else if (itemType === 'Shirt') unitCost = 150;
                else if (itemType === 'T-Shirt') unitCost = 100;
                else unitCost = 200;
            }
            if (deductionAmount === 0) {
                deductionAmount = qty * unitCost;
            }
            paymentStatus = 'Pending';
        } else if (finalAllocationType === 'Replacement') {
            if (isSalaryDeduction) {
                paymentStatus = 'Pending';
            } else {
                deductionAmount = 0;
                paymentStatus = 'Not Applicable';
            }
        }

        const totalCost = qty * unitCost;

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
            deduction_amount: deductionAmount,
            payment_status: paymentStatus,
            return_status: data.return_status || 'Not Required',
            allocation_type: finalAllocationType,
            is_salary_deduction: isSalaryDeduction,
            approved_standard_quantity: approvedStandardQuantity,
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
