const { Op } = require('sequelize');
const { ReplacementRequest, Employee, Item, IssueRecord, AllocationConfig, OfficialPriceList } = require('../models');

// Normalize Sequelize PascalCase joins → lowercase
function normalizeRequest(r) {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    if (j.Employee) { j.employee = j.Employee; delete j.Employee; }
    else if (typeof j.employee === 'string') {
        j.employee = { _id: j.employee, id: j.employee, name: j.employee_name || 'Unknown', emp_code: 'N/A', department: 'GENERAL' };
    }
    if (j.Item) { j.item = j.Item; delete j.Item; }
    else if (typeof j.item === 'string') {
        j.item = { _id: j.item, id: j.item, name: j.item_name || 'Unknown' };
    }
    return j;
}

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
    const config = await AllocationConfig.findOne({ where: { item_type: itemType } });
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

    async getConfigs() {
        const configs = await AllocationConfig.findAll();
        return configs.map(c => c.toJSON());
    }

    async updateConfigs(configs) {
        const results = [];
        for (const conf of configs) {
            const updateFields = { item_type: conf.item_type };
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

            const [updated] = await AllocationConfig.upsert(updateFields, { returning: true });
            results.push(updated.toJSON());
        }
        return results;
    }

    async getOfficialPrices() {
        let prices = await OfficialPriceList.findAll({ order: [['gender', 'ASC'], ['item_name', 'ASC']] });
        if (prices.length === 0) {
            await this.seedOfficialPrices();
            prices = await OfficialPriceList.findAll({ order: [['gender', 'ASC'], ['item_name', 'ASC']] });
        }
        return prices.map(p => p.toJSON());
    }

    async seedOfficialPrices() {
        const defaults = [
            { item_name: 'Shirt',             price: 250.95, gender: 'MEN' },
            { item_name: 'Pant',              price: 349.65, gender: 'MEN' },
            { item_name: 'Shirt Full Sleeve', price: 370.65, gender: 'MEN' },
            { item_name: 'T-Shirt',           price: 267.75, gender: 'MEN' },
            { item_name: 'Intern T-Shirt',    price: 304.50, gender: 'MEN' },
            { item_name: 'Safety Shoes',      price: 588.00, gender: 'MEN' },
            { item_name: 'Liberty Shoes',     price: 1764.10, gender: 'MEN' },
            { item_name: 'Shoe (BATA)',        price: 1475.00, gender: 'MEN' },
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
            const exists = await OfficialPriceList.findOne({ where: { item_name: p.item_name, gender: p.gender } });
            if (exists) {
                await exists.update(p);
            } else {
                await OfficialPriceList.create(p);
            }
        }
    }

    async upsertOfficialPrice(item_name, price, gender = 'UNISEX', description = '') {
        const exists = await OfficialPriceList.findOne({ where: { item_name } });
        if (exists) {
            return await exists.update({ price, gender, description });
        }
        return await OfficialPriceList.create({ item_name, price, gender, description });
    }

    async lookupPriceByGender(itemName, gender) {
        if (!itemName) return null;
        const n = itemName.toLowerCase().trim();
        const prices = await OfficialPriceList.findAll({ where: { gender } });
        let found = prices.find(p => p.item_name.toLowerCase() === n);
        if (!found) found = prices.find(p => n.includes(p.item_name.toLowerCase()) || p.item_name.toLowerCase().includes(n));
        return found ? found.price : null;
    }

    async lookupPrice(itemName) {
        if (!itemName) return null;
        const n = itemName.toLowerCase().trim();
        const prices = await OfficialPriceList.findAll();
        let found = prices.find(p => p.item_name.toLowerCase() === n);
        if (!found) found = prices.find(p => n.includes(p.item_name.toLowerCase()) || p.item_name.toLowerCase().includes(n));
        return found ? found.price : null;
    }

    async getAll(filters = {}) {
        const { status, employeeId, page, limit, allocation_type } = filters;
        const where = {};
        if (status) {
            if (status.includes(',')) {
                const parts = status.split(',').map(s => s.trim());
                where.status = { [Op.in]: [...parts, ...parts.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())] };
            } else {
                const tc = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                where.status = { [Op.in]: [status, tc] };
            }
        }
        if (employeeId)     where.employee = employeeId;
        if (allocation_type) where.allocation_type = allocation_type;

        const queryOptions = {
            where,
            include: [{ model: Employee }, { model: Item }],
            order: [['requested_date', 'DESC']]
        };

        if (page && limit) {
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
            queryOptions.limit = parseInt(limit);
            const { rows, count } = await ReplacementRequest.findAndCountAll(queryOptions);
            return { items: rows.map(r => normalizeRequest(r)), total: count };
        }
        const records = await ReplacementRequest.findAll(queryOptions);
        return records.map(r => normalizeRequest(r));
    }

    async getSummary() {
        // Additional cost = sum of all Additional allocation requests (any status)
        const additionalRequests = await ReplacementRequest.findAll({
            where: { allocation_type: 'Additional' }
        });
        let additionalCost = 0;
        additionalRequests.forEach(r => { additionalCost += (parseFloat(r.total_cost) || 0); });
        
        const [pendingCount, approvedCount, paidCount] = await Promise.all([
            ReplacementRequest.count({ where: { status: { [Op.in]: ['Pending', 'pending'] } } }),
            ReplacementRequest.count({ where: { status: { [Op.in]: ['Approved', 'approved'] } } }),
            ReplacementRequest.count({ where: { status: { [Op.in]: ['Completed', 'completed'] } } })
        ]);
        return { total_cost: additionalCost, additional_cost: additionalCost, pending_count: pendingCount, approved_count: approvedCount, paid_count: paidCount };
    }

    async create(data) {
        if (!data.employee_id) throw new Error('Invalid Employee ID');
        if (!data.item_id) throw new Error('Invalid Item ID');

        const emp = await Employee.findByPk(data.employee_id);
        const item = await Item.findByPk(data.item_id);
        if (!emp)  throw new Error('Employee not found');
        if (!item) throw new Error('Item not found');

        const qty    = parseInt(data.quantity) || 1;
        const empType = emp.employee_type || 'Permanent';
        const requestedType = data.allocation_type || 'Standard';
        let finalType = requestedType;
        let approvedStdQty = parseInt(data.approved_standard_quantity) || 0;

        if (requestedType === 'Standard') {
            const itemType = getItemType(item.name);
            const limit    = await getStandardLimit(itemType, empType);

            if (limit > 0) {
                const activeIssues = await IssueRecord.findAll({
                    where: { employee: data.employee_id, archived: false, lifecycle_status: 'Active' },
                    include: [{ model: Item }]
                });

                let alreadyReceived = 0;
                for (const issue of activeIssues) {
                    const name = issue.item_name || issue.Item?.name;
                    if (getItemType(name) === itemType) alreadyReceived += (issue.quantity || 0);
                }

                if (alreadyReceived + qty > limit) {
                    finalType = 'Additional';
                } else {
                    finalType = 'Standard';
                    approvedStdQty = qty;
                }
            }
        }

        let unitCost = 0;
        let paymentStatus = 'Not Required';

        if (finalType === 'Standard') {
            unitCost = 0;
            paymentStatus = 'Not Required';
        } else if (finalType === 'Additional') {
            unitCost = parseFloat(data.unit_cost) || 0;
            if (unitCost === 0) {
                const dbPrice = await this.lookupPrice(item.name);
                unitCost = dbPrice || 0;
            }
            paymentStatus = unitCost > 0 ? 'Pending' : 'Not Required';
        } else if (finalType === 'Replacement') {
            const empGender = emp.gender === 'Female' ? 'WOMEN' : 'MEN';
            const dbPrice = await this.lookupPriceByGender(item.name, empGender);
            unitCost = dbPrice ?? (await this.lookupPrice(item.name)) ?? 0;
            paymentStatus = unitCost > 0 ? 'Pending' : 'Not Required';
        }

        const totalCost = qty * unitCost;

        if (finalType === 'Replacement' && data.previous_issue_id) {
            const prevIssue = await IssueRecord.findByPk(data.previous_issue_id);
            if (prevIssue) {
                await prevIssue.update({
                    lifecycle_status: 'Active',
                    issue_status:     'Pending Acknowledgement',
                    notes: (data.notes ? data.notes + ' | ' : '') + 'Pending Replacement Return — new item requested'
                });
            }
        }

        const recordData = {
            employee:      data.employee_id,
            employee_name: emp.name,
            item:          data.item_id,
            item_name:     item.name,
            allocation_type:   finalType,
            reason:        data.reason || 'Not specified',
            notes:         data.notes || '',
            quantity:      qty,
            size:          data.size || 'N/A',
            unit_cost:     unitCost,
            total_cost:    totalCost,
            payment_status: paymentStatus,
            previous_issue: data.previous_issue_id || null,
            status:        'Pending',
            requested_date: new Date()
        };

        const newRequest = await ReplacementRequest.create(recordData);
        return await ReplacementRequest.findByPk(newRequest._id, { include: [{ model: Employee }, { model: Item }] });
    }

    async getById(id) {
        const req = await ReplacementRequest.findByPk(id, { include: [{ model: Employee }, { model: Item }] });
        return req ? req.toJSON() : null;
    }

    async updateStatus(id, updateData) {
        const request = await ReplacementRequest.findByPk(id);
        if (!request) throw new Error('Request not found');

        if (updateData.status === 'Completed' && request.status !== 'Completed') {
            updateData.resolved_date = new Date();

            const item = await Item.findByPk(request.item);
            let nextDue = new Date();
            nextDue.setDate(nextDue.getDate() + (item ? item.frequency_days || 365 : 365));

            await IssueRecord.create({
                employee: request.employee,
                employee_name: request.employee_name,
                item: request.item,
                item_name: request.item_name,
                issued_date: new Date(),
                next_due_date: nextDue,
                quantity: request.quantity,
                issued_by: updateData.resolved_by || null,
                issue_status: 'Acknowledged',
                lifecycle_status: 'Active',
                notes: `Issued via ${request.allocation_type} (ID: ${request._id})`
            });

            if (request.previous_issue) {
                const oldIssue = await IssueRecord.findByPk(request.previous_issue);
                if (oldIssue) {
                    await oldIssue.update({
                        lifecycle_status: 'Returned',
                        return_date: new Date(),
                        returned_condition: 'Replaced'
                    });
                }
            }
        }

        await request.update(updateData);
        const updated = await ReplacementRequest.findByPk(id, { include: [{ model: Employee }, { model: Item }] });
        return updated ? normalizeRequest(updated) : null;
    }

    async verifyMultiple(ids, method, ocrDetails, signaturePath, adminId = null) {
        const results = [];
        for (const id of ids) {
            const req = await ReplacementRequest.findByPk(id);
            if (req) {
                await req.update({
                    acknowledged: true,
                    status: 'Completed',
                    resolved_date: new Date(),
                    verification_method: method,
                    ocr_details: ocrDetails ? JSON.stringify(ocrDetails) : null,
                    signature_path: signaturePath
                });
                
                // Also create an IssueRecord
                const item = await Item.findByPk(req.item);
                let nextDue = new Date();
                nextDue.setDate(nextDue.getDate() + (item ? item.frequency_days || 365 : 365));

                await IssueRecord.create({
                    employee: req.employee,
                    employee_name: req.employee_name,
                    item: req.item,
                    item_name: req.item_name,
                    issued_date: new Date(),
                    next_due_date: nextDue,
                    quantity: req.quantity,
                    issued_by: adminId,  // now passed from route
                    issue_status: 'Acknowledged',
                    lifecycle_status: 'Active',
                    verification_method: method,
                    signature_path: signaturePath,
                    acknowledged: true,
                    acknowledgement_time: new Date(),
                    notes: `Issued via ${req.allocation_type} (ID: ${req._id})`
                });

                if (req.previous_issue) {
                    const oldIssue = await IssueRecord.findByPk(req.previous_issue);
                    if (oldIssue) {
                        await oldIssue.update({
                            lifecycle_status: 'Returned',
                            return_date: new Date(),
                            returned_condition: 'Replaced'
                        });
                    }
                }

                results.push(req);
            }
        }
        return results;
    }
}

module.exports = new AllocationRequestService();
