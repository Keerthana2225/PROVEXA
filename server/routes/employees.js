const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const IssueRecord = require('../models/IssueRecord');
const ReplacementRequest = require('../models/ReplacementRequest');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get all employees with pagination and filters
router.get('/', async (req, res) => {
    try {
        const { search, department, status, page = 1, limit = 10 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = {};
        if (status) query.status = status;
        if (department) query.department = department;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { emp_code: { $regex: search, $options: 'i' } }
            ];
        }

        const [employees, total] = await Promise.all([
            Employee.find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limitNum),
            Employee.countDocuments(query)
        ]);

        res.json({ employees, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching employees' });
    }
});

// Get a single employee by ID
router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const [issues, replacements] = await Promise.all([
            IssueRecord.find({ employee: employee._id })
                .populate({ path: 'item', populate: { path: 'category' } })
                .sort({ issued_date: -1 }),
            ReplacementRequest.find({ employee: employee._id })
                .populate({ path: 'item', populate: { path: 'category' } })
                .sort({ requested_date: -1 })
        ]);
        
        const employeeObj = employee.toObject();
        employeeObj.issue_records = issues;
        employeeObj.replacement_requests = replacements;

        res.json(employeeObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching employee' });
    }
});

// Create a new employee
router.post('/', async (req, res) => {
    try {
        const { emp_code, name, department, designation } = req.body;
        
        const existing = await Employee.findOne({ emp_code });
        if (existing) return res.status(400).json({ message: 'Employee code already exists' });

        const employee = new Employee({ emp_code, name, department, designation });
        await employee.save();
        
        res.status(201).json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating employee' });
    }
});

// Update employee
router.put('/:id', async (req, res) => {
    try {
        const { name, department, designation, status } = req.body;
        
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { name, department, designation, status },
            { new: true }
        );
        
        res.json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating employee' });
    }
});

module.exports = router;
