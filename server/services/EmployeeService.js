const { Employee, IssueRecord, Item } = require('../models');

class EmployeeService {
    async getAll(filters = {}) {
        const { search, department, page, limit } = filters;
        const query = {};

        if (department) query.department = department;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { emp_code: { $regex: search, $options: 'i' } }
            ];
        }

        let dbQuery = Employee.find(query).sort({ created_at: -1 });

        // If pagination OR limit is requested, return the object format
        if (page || limit) {
            const p = parseInt(page) || 1;
            const l = parseInt(limit) || 10;
            const skip = (p - 1) * l;
            
            dbQuery = dbQuery.skip(skip).limit(l);
            const items = await dbQuery;
            const total = await Employee.countDocuments(query);
            
            return { 
                employees: items, 
                total, 
                totalPages: Math.ceil(total / l) 
            };
        }

        // Default: return array directly
        return await dbQuery;
    }

    async getByIdWithRelations(id) {
        const employee = await Employee.findById(id);
        if (!employee) return null;

        const [issues, replacements] = await Promise.all([
            IssueRecord.find({ employee: id, archived: false }).populate('item'),
            require('../models').ReplacementRequest.find({ employee: id }).populate('item')
        ]);

        return {
            ...employee.toObject(),
            issues,
            replacements
        };
    }

    async getByCode(code) {
        if (!code) return null;
        const str = String(code).trim();
        // Try multiple formats: exact, with EMP prefix, without prefix, leading zero variants
        return await Employee.findOne({
            $or: [
                { emp_code: str },
                { emp_code: str.toUpperCase() },
                { emp_code: `EMP${str}` },
                { emp_code: new RegExp(`^(EMP0*|0*)${str}$`, 'i') },
                { emp_code: str.replace(/^0+/, '') },
                { emp_code: str.padStart(str.length + 1, '0') }
            ]
        });
    }

    async create(data) {
        return await Employee.create(data);
    }

    async update(id, data) {
        return await Employee.findByIdAndUpdate(id, data, { new: true });
    }

    async getStats() {
        const [total, active, departments] = await Promise.all([
            Employee.countDocuments(),
            Employee.countDocuments({ status: 'active' }),
            Employee.distinct('department')
        ]);

        return { total, active, departmentCount: departments.length };
    }
}

module.exports = new EmployeeService();
