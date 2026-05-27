const { Op } = require('sequelize');
const { IssueRecord, ReplacementRequest, Employee, Item, ItemCategory, Admin } = require('../models');

// ─── Normalize Sequelize joins to lowercase field names ─────────────────────
// Sequelize uses PascalCase association names (Employee, Item, ItemCategory)
// but all frontend/route code expects lowercase (employee, item, item.category)
function normalizeIssue(r) {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    // Map Employee → employee (preserve string FK too)
    if (j.Employee) {
        j.employee = j.Employee;
        delete j.Employee;
    } else if (typeof j.employee === 'string') {
        // employee is the FK string — supplement with name fields already on record
        j.employee = {
            _id: j.employee, id: j.employee,
            name: j.employee_name || 'Unknown',
            emp_code: j.emp_code || 'N/A',
            department: j.department || 'N/A'
        };
    }
    // Map Item → item
    if (j.Item) {
        const itemJ = j.Item;
        // Map ItemCategory inside Item
        if (itemJ.ItemCategory) {
            itemJ.category = itemJ.ItemCategory;
            delete itemJ.ItemCategory;
        }
        j.item = itemJ;
        delete j.Item;
    } else if (typeof j.item === 'string') {
        j.item = { _id: j.item, id: j.item, name: j.item_name || 'Unknown', category: { name: 'N/A' } };
    }
    return j;
}

function normalizeReplacement(r) {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    if (j.Employee) { j.employee = j.Employee; delete j.Employee; }
    else if (typeof j.employee === 'string') {
        j.employee = { _id: j.employee, id: j.employee, name: j.employee_name || 'Unknown', emp_code: 'N/A', department: 'N/A' };
    }
    if (j.Item) { j.item = j.Item; delete j.Item; }
    else if (typeof j.item === 'string') {
        j.item = { _id: j.item, id: j.item, name: j.item_name || 'Unknown' };
    }
    return j;
}

class ReportService {
    async getIssueReport(filters = {}) {
        const { startDate, endDate, employeeId, itemId, status } = filters;
        const where = { archived: false };

        if (startDate && endDate) {
            where.issued_date = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
        }
        if (employeeId) where.employee = employeeId;
        if (itemId) where.item = itemId;
        if (status) where.issue_status = status;

        const records = await IssueRecord.findAll({
            where,
            include: [
                { model: Employee },
                { model: Item, include: [{ model: ItemCategory }] }
            ],
            order: [['issued_date', 'DESC']]
        });
        
        return records.map(r => normalizeIssue(r));
    }

    async getIssueExportData(filters = {}) {
        return await this.getIssueReport(filters);
    }

    async getReplacementReport(filters = {}) {
        const { startDate, endDate, employeeId, itemId, status, allocation_type, is_salary_deduction } = filters;
        const where = {};

        if (startDate && endDate) {
            where.requested_date = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
        }
        if (employeeId) where.employee = employeeId;
        if (itemId) where.item = itemId;
        if (status) where.status = status;
        if (allocation_type) {
            where.allocation_type = allocation_type;
        }
        if (is_salary_deduction !== undefined) {
            if (is_salary_deduction === 'true' || is_salary_deduction === true) {
                where.deduction_amount = { [Op.gt]: 0 };
            }
        }

        const records = await ReplacementRequest.findAll({
            where,
            include: [
                { model: Employee },
                { model: Item }
            ],
            order: [['requested_date', 'DESC']]
        });
        
        return records.map(r => normalizeReplacement(r));
    }

    async getReplacementExportData(filters = {}) {
        const records = await this.getReplacementReport(filters);
        // Deduplicate by primary key — prevents same record appearing twice
        const seen = new Set();
        return records.filter(r => {
            const key = r.id || r._id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

module.exports = new ReportService();
