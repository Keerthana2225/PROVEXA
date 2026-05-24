const { Op } = require('sequelize');
const { Employee, IssueRecord, Item, ReplacementRequest } = require('../models');
const eligibilityService = require('./EligibilityService');

class EmployeeService {
    async getAll(filters = {}) {
        const { search, department, page, limit } = filters;
        const where = {};

        if (department) where.department = department;
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { emp_code: { [Op.like]: `%${search}%` } }
            ];
        }

        const queryOptions = { where, order: [['created_at', 'DESC']] };

        if (page || limit) {
            const p = parseInt(page) || 1;
            const l = parseInt(limit) || 10;
            queryOptions.offset = (p - 1) * l;
            queryOptions.limit = l;
            
            const { rows, count } = await Employee.findAndCountAll(queryOptions);
            return {
                employees: rows,
                total: count,
                totalPages: Math.ceil(count / l)
            };
        }

        const rows = await Employee.findAll(queryOptions);
        return rows.map(r => r.toJSON());
    }

    async getByIdWithRelations(id) {
        const employee = await Employee.findByPk(id);
        if (!employee) return null;

        const issues = await IssueRecord.findAll({
            where: { employee: id, archived: false },
            include: [{ model: Item }]
        });

        const replacements = await ReplacementRequest.findAll({
            where: { employee: id },
            include: [{ model: Item }]
        });

        return {
            ...employee.toJSON(),
            issues: issues.map(i => i.toJSON()),
            replacements: replacements.map(r => r.toJSON())
        };
    }

    async getAssetProfile(id) {
        return await eligibilityService.getAssetProfile(id);
    }

    async getByCode(code) {
        if (!code) return null;
        const str = String(code).trim();
        
        const emp = await Employee.findOne({
            where: {
                [Op.or]: [
                    { emp_code: str },
                    { emp_code: str.toUpperCase() },
                    { emp_code: `EMP${str}` },
                    { emp_code: { [Op.like]: `%${str}` } }
                ]
            }
        });
        // Always return plain JSON so _id is consistently accessible
        return emp ? emp.toJSON() : null;
    }

    async create(data) {
        if (data.sizes) {
            data.sizes_shirt = data.sizes.shirt || '';
            data.sizes_pant = data.sizes.pant || '';
            data.sizes_shoe = data.sizes.shoe || '';
            delete data.sizes; // remove nested object so VIRTUAL field isn't set directly
        }
        return await Employee.create(data);
    }

    async update(id, data) {
        const emp = await Employee.findByPk(id);
        if (emp) {
            if (data.sizes) {
                data.sizes_shirt = data.sizes.shirt || '';
                data.sizes_pant = data.sizes.pant || '';
                data.sizes_shoe = data.sizes.shoe || '';
                delete data.sizes; // remove nested object so VIRTUAL field isn't set directly
            }
            await emp.update(data);
            return emp;
        }
        return null;
    }

    async getStats() {
        const total = await Employee.count();
        const active = await Employee.count({ where: { status: 'active' } });
        const departments = await Employee.findAll({
            attributes: [[require('../config/database').sequelize.fn('DISTINCT', require('../config/database').sequelize.col('department')), 'department']],
            raw: true
        });

        return { total, active, departmentCount: departments.length };
    }
}

module.exports = new EmployeeService();
