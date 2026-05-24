const express = require('express');
const router = express.Router();
const employeeService = require('../services/EmployeeService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get all employees
router.get('/', async (req, res) => {
    try {
        const result = await employeeService.getAll(req.query);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await employeeService.getStats();
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get employee asset profile
router.get('/:id/asset-profile', async (req, res) => {
    try {
        const profile = await employeeService.getAssetProfile(req.params.id);
        if (!profile) return res.status(404).json({ message: 'Employee not found' });
        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a single employee by ID
router.get('/:id', async (req, res) => {
    try {
        const employee = await employeeService.getByIdWithRelations(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create employee
router.post('/', async (req, res) => {
    try {
        const employee = await employeeService.create(req.body);
        res.status(201).json(employee);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 11000) {
            return res.status(400).json({ message: 'Employee code already exists' });
        }
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update employee
router.put('/:id', async (req, res) => {
    try {
        const employee = await employeeService.update(req.params.id, req.body);
        res.json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
