const { Employee } = require('../models');
const { Op } = require('sequelize');

class EmployeeService {
    async getAll(filters = {}) {
        const { search, department, status, page = 1, limit = 10 } = filters;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { emp_code: { [Op.like]: `%${search}%` } }
            ];
        }
        if (department) where.department = department;
        if (status) where.status = status;

        const { rows, count } = await Employee.findAndCountAll({ 
            where,
            offset,
            limit: limitNum,
            order: [['createdAt', 'DESC']]
        });

        return { 
            employees: rows, 
            total: count, 
            page: pageNum, 
            totalPages: Math.ceil(count / limitNum) 
        };
    }

    async getByIdWithRelations(id) {
        const employee = await Employee.findByPk(id);
        if (!employee) return null;

        const [issues, replacements] = await Promise.all([
            IssueRecord.findAll({
                where: { employee_id: id },
                include: [{ model: Item, as: 'item', include: [{ model: ItemCategory, as: 'category' }] }],
                order: [['issued_date', 'DESC']]
            }),
            ReplacementRequest.findAll({
                where: { employee_id: id },
                include: [{ model: Item, as: 'item', include: [{ model: ItemCategory, as: 'category' }] }],
                order: [['requested_date', 'DESC']]
            })
        ]);

        const employeeObj = employee.get({ plain: true });
        employeeObj.issue_records = issues;
        employeeObj.replacement_requests = replacements;

        return employeeObj;
    }

    async getById(id) {
        return await Employee.findByPk(id);
    }

    async getByCode(emp_code) {
        const code = String(emp_code || '').trim();
        if (!code) return null;

        return await Employee.findOne({ where: { emp_code: code } }) ||
               await Employee.findOne({ where: { emp_code: { [Op.like]: code } } });
    }

    async create(data) {
        return await Employee.create(data);
    }

    async update(id, data) {
        const employee = await Employee.findByPk(id);
        if (!employee) throw new Error('Employee not found');
        return await employee.update(data);
    }

    async delete(id) {
        const employee = await Employee.findByPk(id);
        if (!employee) throw new Error('Employee not found');
        return await employee.destroy();
    }

    async getStats() {
        const total = await Employee.count({ where: { status: 'active' } });
        const depts = await Employee.findAll({
            attributes: ['department', [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count']],
            group: ['department']
        });
        return { total, departments: depts };
    }
}

module.exports = new EmployeeService();
