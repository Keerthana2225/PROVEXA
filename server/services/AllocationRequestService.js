const { ReplacementRequest, Employee, Item, IssueRecord, AllocationConfig, OfficialPriceList } = require('../models');
const mongoose = require('mongoose');

// ── Employee-type free allocation eligibility ─────────────────────
// Maps employee type → lowercase item keywords allowed for FREE (Standard) allocation
const EMPLOYEE_ELIGIBILITY = {
    'Intern':    ['pant', 'shirt', 'intern t-shirt', 't-shirt'],
    'Permanent': ['shirt', 'pant', 't-shirt', 'safety shoes', 'safety shoe', 'liberty shoes', 'shoe', 'coat', 'chudidhar'],
};

function isItemEligibleForFree(itemName, empType) {
    const eligible = EMPLOYEE_ELIGIBILITY[empType] || EMPLOYEE_ELIGIBILITY['Permanent'];
    const n = (itemName || '').toLowerCase();
    return eligible.some(e => n.includes(e));
}

function getItemType(itemName) {
    const name = (itemName || '').toLowerCase();
    if (name.includes('t-shirt') || name.includes('tshirt')) return 'T-Shirt';
    if (name.includes('shirt'))  return 'Shirt';
    if (name.includes('pant'))   return 'Pant';
    return 'Other';
}

async function getStandardLimit(itemType, employeeType = 'Permanent') {
    const config = await AllocationConfig.findOne({ item_type: itemType });
    if (config) {
        if (employeeType === 'Intern') return config.intern_quantity ?? 1;
        return config.permanent_quantity ?? config.standard_quantity;
    }
    const defaults = {
        'Permanent': { 'Pant': 2, 'Shirt': 2, 'T-Shirt': 1 },
        'Intern':    { 'Pant': 3, 'Shirt': 2, 'T-Shirt': 1 },
    };
    return (defaults[employeeType] || defaults['Permanent'])[itemType] || 0;
}

class AllocationRequestService {

    // ── Allocation configs ────────────────────────────────────────
    async getConfigs() {
        return await AllocationConfig.find({});
    }

    async updateConfigs(configs) {
        const results = [];
        for (const conf of configs) {
            const updateFields = {};
            if (conf.permanent_quantity !== undefined) {
                updateFields.permanent_quantity = parseInt(conf.permanent_quantity) || 0;
                updateFields.standard_quantity  = parseInt(conf.permanent_quantity) || 0;
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

    // ── Official price list ───────────────────────────────────────
    async getOfficialPrices() {
        const prices = await OfficialPriceList.find({ active: true }).sort({ gender: 1, item_name: 1 });
        if (prices.length === 0) {
            // Seed defaults from company schedule if table is empty
            await this.seedOfficialPrices();
            return await OfficialPriceList.find({ active: true }).sort({ gender: 1, item_name: 1 });
        }
        return prices;
    }

    async seedOfficialPrices() {
        const defaults = [
            // MEN
            { item_name: 'Shirt',             price: 250.95, gender: 'MEN' },
            { item_name: 'Pant',              price: 349.65, gender: 'MEN' },
            { item_name: 'Shirt Full Sleeve', price: 370.65, gender: 'MEN' },
            { item_name: 'T-Shirt',           price: 267.75, gender: 'MEN' },
            { item_name: 'Intern T-Shirt',    price: 304.50, gender: 'MEN' },
            { item_name: 'Safety Shoes',      price: 588.00, gender: 'MEN' },
            { item_name: 'Liberty Shoes',     price: 1764.10, gender: 'MEN' },
            { item_name: 'Shoe (BATA)',        price: 1475.00, gender: 'MEN' },
            // WOMEN
            { item_name: 'Shirt',             price: 262.50, gender: 'WOMEN' },
            { item_name: 'Pant',              price: 391.65, gender: 'WOMEN' },
            { item_name: 'Coat',              price: 321.30, gender: 'WOMEN' },
            { item_name: 'Chudidhar Top',     price: 375.90, gender: 'WOMEN' },
            { item_name: 'Chudidhar Bottom',  price: 399.00, gender: 'WOMEN' },
            { item_name: 'Chudidhar Coat',    price: 340.20, gender: 'WOMEN' },
            { item_name: 'T-Shirt',           price: 267.75, gender: 'WOMEN' },
            { item_name: 'Safety Shoe',       price: 840.00, gender: 'WOMEN' },
        ];
        for (const p of defaults) {
            await OfficialPriceList.findOneAndUpdate(
                { item_name: p.item_name, gender: p.gender },
                p,
                { upsert: true, new: true }
            );
        }
    }

    async upsertOfficialPrice(item_name, price, gender = 'UNISEX', description = '') {
        return await OfficialPriceList.findOneAndUpdate(
            { item_name },
            { item_name, price, gender, description, active: true },
            { upsert: true, new: true }
        );
    }

    // Lookup by gender (WOMEN/MEN rates from schedule)
    async lookupPriceByGender(itemName, gender) {
        if (!itemName) return null;
        const n = itemName.toLowerCase().trim();
        const prices = await OfficialPriceList.find({ active: true, gender });
        let found = prices.find(p => p.item_name.toLowerCase() === n);
        if (!found) found = prices.find(p => n.includes(p.item_name.toLowerCase()) || p.item_name.toLowerCase().includes(n));
        return found ? found.price : null;
    }

    // Lookup official price for an item by name (fuzzy match, any gender)
    async lookupPrice(itemName) {
        if (!itemName) return null;
        const n = itemName.toLowerCase().trim();
        const prices = await OfficialPriceList.find({ active: true });
        let found = prices.find(p => p.item_name.toLowerCase() === n);
        if (!found) found = prices.find(p => n.includes(p.item_name.toLowerCase()) || p.item_name.toLowerCase().includes(n));
        return found ? found.price : null;
    }

    // ── Get all requests ─────────────────────────────────────────
    async getAll(filters = {}) {
        const { status, employeeId, page, limit, allocation_type } = filters;
        const query = {};
        if (status) {
            if (status.includes(',')) {
                const parts = status.split(',').map(s => s.trim());
                query.status = { $in: [...parts, ...parts.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())] };
            } else {
                const tc = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                query.status = { $in: [status, tc] };
            }
        }
        if (employeeId)     query.employee = employeeId;
        if (allocation_type) query.allocation_type = allocation_type;

        let dbQuery = ReplacementRequest.find(query)
            .populate('employee').populate('item')
            .sort({ requested_date: -1 });

        if (page && limit) {
            dbQuery = dbQuery.skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit));
            const items = await dbQuery;
            const total = await ReplacementRequest.countDocuments(query);
            return { items, total };
        }
        return await dbQuery;
    }

    // ── Summary stats ────────────────────────────────────────────
    async getSummary() {
        const completedRequests = await ReplacementRequest.find({ status: { $in: ['Completed', 'completed'] } });
        let totalCost = 0;
        completedRequests.forEach(r => { totalCost += (r.total_cost || 0); });
        const [pendingCount, paidCount] = await Promise.all([
            ReplacementRequest.countDocuments({ status: { $in: ['Approved', 'Pending', 'approved', 'pending'] } }),
            ReplacementRequest.countDocuments({ status: { $in: ['Completed', 'completed'] } })
        ]);
        return { total_cost: totalCost, pending_count: pendingCount, paid_count: paidCount };
    }

    // ── Create new allocation request ────────────────────────────
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
        if (!emp)  throw new Error('Employee not found');
        if (!item) throw new Error('Item not found');

        const qty    = parseInt(data.quantity) || 1;
        const empType = emp.employee_type || 'Permanent';
        const requestedType = data.allocation_type || 'Standard';
        let finalType = requestedType;
        let approvedStdQty = parseInt(data.approved_standard_quantity) || 0;

        // ── FREE ALLOCATION: quota check + auto-escalation ───────
        if (requestedType === 'Standard') {
            const itemType = getItemType(item.name);
            const limit    = await getStandardLimit(itemType, empType);

            if (limit > 0) {
                const activeIssues = await IssueRecord.find({
                    employee: data.employee_id, archived: false, lifecycle_status: 'Active'
                }).populate('item');

                let alreadyReceived = 0;
                for (const issue of activeIssues) {
                    const name = issue.item_name || issue.item?.name;
                    if (getItemType(name) === itemType) alreadyReceived += (issue.quantity || 0);
                }

                if (alreadyReceived + qty > limit) {
                    // Quota exceeded → escalate to Additional automatically
                    finalType = 'Additional';
                } else {
                    finalType = 'Standard';
                    approvedStdQty = qty;
                }
            }
        }

        // ── COST LOGIC per workflow type ─────────────────────────
        let unitCost = 0;
        let paymentStatus = 'Not Applicable';

        if (finalType === 'Standard') {
            // Company-sponsored: NO cost whatsoever
            unitCost = 0;
            paymentStatus = 'Not Applicable';

        } else if (finalType === 'Additional') {
            // Use price from form (auto-filled from DB price list by frontend)
            unitCost = parseFloat(data.unit_cost) || 0;
            if (unitCost === 0) {
                // Fallback: look up from DB by item name
                const dbPrice = await this.lookupPrice(item.name);
                unitCost = dbPrice || 0;
            }
            paymentStatus = unitCost > 0 ? 'Pending' : 'Not Applicable';

        } else if (finalType === 'Replacement') {
            // Auto-calculate cost = qty × official price based on employee gender
            // Price is looked up automatically — no manual override needed
            const empGender = emp.gender === 'Female' ? 'WOMEN' : 'MEN';
            const dbPrice = await this.lookupPriceByGender(item.name, empGender);
            unitCost = dbPrice ?? (await this.lookupPrice(item.name)) ?? 0;
            paymentStatus = unitCost > 0 ? 'Pending' : 'Not Applicable';
        }

        const totalCost = qty * unitCost;

        // ── LOCK OLD ITEM for Replacement ────────────────────────
        // Mark the previous issue as "Pending Replacement Return" so it
        // can't be double-counted in active allocations
        if (finalType === 'Replacement' && data.previous_issue_id && mongoose.Types.ObjectId.isValid(data.previous_issue_id)) {
            await IssueRecord.findByIdAndUpdate(data.previous_issue_id, {
                lifecycle_status: 'Active',          // stays Active until physically returned
                issue_status:     'Pending Acknowledgement',
                notes: (data.notes ? data.notes + ' | ' : '') + 'Pending Replacement Return — new item requested'
            });
        }

        const recordData = {
            employee:      data.employee_id,
            employee_name: emp.name,
            item:          data.item_id,
            item_name:     item.name,
            allocation_type:   finalType,
            allocation_source: finalType,   // immutable snapshot for reporting
            reason:        data.reason || 'Not specified',
            exchange_reason: data.exchange_reason || '',
            notes:         data.notes || '',
            quantity:      qty,
            size:          data.size || 'N/A',
            unit_cost:     unitCost,
            total_cost:    totalCost,
            payment_status: paymentStatus,
            return_status: data.return_status || 'Not Required',
            approved_standard_quantity: approvedStdQty,
            previous_issue_id: (finalType === 'Replacement' && data.previous_issue_id && mongoose.Types.ObjectId.isValid(data.previous_issue_id))
                ? data.previous_issue_id : null,
            apply_cost_override: finalType === 'Replacement' ? (!!data.apply_cost_override) : false,
            status:           'Pending',
            lifecycle_status: 'Active'
        };

        return await ReplacementRequest.create(recordData);
    }

    // ── Approve ───────────────────────────────────────────────────
    async approve(id, data, adminId) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid Request ID');
        const updateData = {
            status:       'Approved',
            resolved_by:  adminId,
            resolved_date: new Date(),
            notes:        data.notes
        };
        if (data.unit_cost !== undefined) {
            updateData.unit_cost = parseFloat(data.unit_cost);
            const req = await ReplacementRequest.findById(id);
            if (req) {
                updateData.total_cost = (req.quantity || 1) * updateData.unit_cost;
                updateData.payment_status = updateData.total_cost > 0 ? 'Pending' : 'Not Applicable';
            }
        }
        return await ReplacementRequest.findByIdAndUpdate(id, updateData, { new: true });
    }

    // ── Handover / Complete ───────────────────────────────────────
    async handover(id, data) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new Error(`Invalid Replacement Request ID: ${id}`);
        const req = await ReplacementRequest.findById(id);
        if (!req) throw new Error(`Replacement request not found with ID: ${id}`);

        const updateData = {
            status:             'Completed',
            lifecycle_status:   'Completed',
            signature_path:     data.signature_path,
            notes:              data.notes || req.notes,
            ocr_details:        data.ocr_details || req.ocr_details,
            verification_method: data.verification_method || 'Signature',
            resolved_by:        data.admin_id,
            resolved_date:      new Date(),
            item_collected:     true,
            acknowledged:       true
        };

        if (req.total_cost > 0) updateData.payment_status = 'Paid';
        if (req.return_status === 'Pending Return') updateData.return_status = 'Returned';

        const updated = await ReplacementRequest.findByIdAndUpdate(id, updateData, { new: true });

        // Decrement stock for new item issued
        if (req.item) {
            await Item.findByIdAndUpdate(req.item, { $inc: { stock: -(req.quantity || 1) } });
        }

        // If there was a previous issue being replaced — mark it as Returned now
        if (req.previous_issue_id) {
            await IssueRecord.findByIdAndUpdate(req.previous_issue_id, {
                lifecycle_status: 'Returned',
                return_date:      new Date(),
                returned_condition: 'Replaced',
                notes: 'Item returned as part of replacement/exchange handover'
            });
        }

        return updated;
    }

    // ── Reject ────────────────────────────────────────────────────
    async reject(id, notes, adminId) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid Request ID');

        const req = await ReplacementRequest.findById(id);

        // If a previous issue was locked, unlock it (restoration)
        if (req?.previous_issue_id) {
            await IssueRecord.findByIdAndUpdate(req.previous_issue_id, {
                $unset: { replacement_lock: 1 }
            });
        }

        return await ReplacementRequest.findByIdAndUpdate(id, {
            status:       'Rejected',
            resolved_by:  adminId,
            resolved_date: new Date(),
            notes
        }, { new: true });
    }
}

module.exports = new AllocationRequestService();
