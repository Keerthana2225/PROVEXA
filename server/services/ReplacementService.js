const { ReplacementRequest, Employee, Item, IssueRecord, AllocationConfig } = require('../models');
const mongoose = require('mongoose');

// ── Employee-type allocation eligibility ──────────────────────────
// Maps employee type → array of lowercase item name keywords allowed for FREE allocation
const EMPLOYEE_ELIGIBILITY = {
    'Intern':    ['intern t-shirt', 't-shirt'],
    'Newcomer':  ['shirt', 'pant', 't-shirt', 'safety shoes', 'safety shoe'],
    'Permanent': ['shirt', 'pant', 't-shirt', 'safety shoes', 'safety shoe', 'liberty shoes', 'shoe', 'coat', 'chudidhar'],
};

function isItemEligibleForType(itemName, empType) {
    const eligible = EMPLOYEE_ELIGIBILITY[empType] || EMPLOYEE_ELIGIBILITY['Permanent'];
    const n = (itemName || '').toLowerCase();
    return eligible.some(e => n.includes(e));
}

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
        'Newcomer':  { 'Pant': 3, 'Shirt': 2, 'T-Shirt': 1 },
        'Intern':    { 'T-Shirt': 1 }
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
        completedRequests.forEach(r => {
            totalCost += (r.total_cost || 0);
        });

        const [pendingCount, paidCount] = await Promise.all([
            ReplacementRequest.countDocuments({ status: { $in: ['Approved', 'Pending', 'approved', 'pending'] } }),
            ReplacementRequest.countDocuments({ status: { $in: ['Completed', 'completed'] } })
        ]);

        return { 
            total_cost: totalCost, 
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
        const empType = emp.employee_type || 'Permanent';

        let finalAllocationType = requestedAllocationType;
        let approvedStandardQuantity = parseInt(data.approved_standard_quantity) || 0;

        // ── FREE ALLOCATION (Standard) ──────────────────────────────
        // Force zero cost. Validate against quota. Auto-escalate to Additional if over limit.
        if (requestedAllocationType === 'Standard') {
            const itemType = getItemType(item.name);
            const limit = await getStandardLimit(itemType, empType);

            if (limit > 0) {
                const activeIssues = await IssueRecord.find({
                    employee: data.employee_id,
                    archived: false,
                    lifecycle_status: 'Active'
                }).populate('item');

                let alreadyReceived = 0;
                for (const issue of activeIssues) {
                    const name = issue.item_name || issue.item?.name;
                    if (getItemType(name) === itemType) alreadyReceived += (issue.quantity || 0);
                }

                if (alreadyReceived + qty > limit) {
                    // Over free quota → flag as Additional automatically
                    finalAllocationType = 'Additional';
                } else {
                    finalAllocationType = 'Standard';
                    approvedStandardQuantity = qty;
                }
            }
        }

        // ── COST LOGIC per workflow ─────────────────────────────────
        let unitCost = 0;
        let paymentStatus = 'Not Applicable';

        if (finalAllocationType === 'Standard') {
            // No cost ever for free allocation
            unitCost = 0;
            paymentStatus = 'Not Applicable';

        } else if (finalAllocationType === 'Additional') {
            // Accept the official price sent from the form
            unitCost = parseFloat(data.unit_cost) || 0;
            paymentStatus = unitCost > 0 ? 'Pending' : 'Not Applicable';

        } else if (finalAllocationType === 'Replacement') {
            // Replacement: NO cost by default
            // Only apply cost if admin explicitly sets apply_cost_override = true
            if (data.apply_cost_override && parseFloat(data.unit_cost) > 0) {
                unitCost = parseFloat(data.unit_cost);
                paymentStatus = 'Pending';
            } else {
                unitCost = 0;
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
            notes: data.notes || '',
            quantity: qty,
            size: data.size || 'N/A',
            unit_cost: unitCost,
            total_cost: totalCost,
            payment_status: paymentStatus,
            return_status: data.return_status || 'Not Required',
            allocation_type: finalAllocationType,
            approved_standard_quantity: approvedStandardQuantity,
            // Replacement: reference to the old issued item being replaced
            previous_issue_id: data.previous_issue_id && mongoose.Types.ObjectId.isValid(data.previous_issue_id)
                ? data.previous_issue_id : null,
            apply_cost_override: finalAllocationType === 'Replacement' ? (!!data.apply_cost_override) : false,
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
                if (updateData.total_cost > 0) {
                    updateData.payment_status = 'Pending';
                } else {
                    updateData.payment_status = 'Not Applicable';
                }
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

        // Update payment status if there was an additional cost
        if (req.total_cost > 0) {
            updateData.payment_status = 'Paid';
        }
        
        if (req.return_status === 'Pending Return') {
            updateData.return_status = 'Returned';
        }

        const updated = await ReplacementRequest.findByIdAndUpdate(id, updateData, { new: true });
        
        // Decrement stock
        if (req.item) {
            await Item.findByIdAndUpdate(req.item, { $inc: { stock: -(req.quantity || 1) } });
        }
        
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
