const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const ReplacementRequest = require('../models/ReplacementRequest');
const IssueRecord = require('../models/IssueRecord');
const Item = require('../models/Item');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get all requests
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};

        const requests = await ReplacementRequest.find(query)
            .populate('employee')
            .populate({ path: 'item', populate: { path: 'category' } })
            .sort({ requested_date: -1 });

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching replacements' });
    }
});

// Create new request
router.post('/', async (req, res) => {
    try {
        const { employee_id, item_id, reason } = req.body;
        
        const employeeObj = await Employee.findById(employee_id);
        const itemObj = await Item.findById(item_id);

        const request = new ReplacementRequest({
            employee: employee_id,
            employee_name: employeeObj ? employeeObj.name : 'Unknown',
            item: item_id,
            item_name: itemObj ? itemObj.name : 'Unknown',
            reason
        });
        await request.save();

        res.status(201).json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating replacement request' });
    }
});

// Approve a request
router.put('/:id/approve', async (req, res) => {
    try {
        const { notes } = req.body;

        const request = await ReplacementRequest.findById(req.params.id).populate('item');
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (request.status !== 'pending') return res.status(400).json({ message: 'Request is already processed' });

        // Auto create an issue record
        const issued_date = dayjs().toDate();
        const next_due_date = request.item.fixed_date ? new Date(request.item.fixed_date) : dayjs().add(request.item.frequency_days, 'day').toDate();

        // Sequential updates (since transactions require replica set)
        request.status = 'approved';
        request.resolved_date = issued_date;
        request.resolved_by = req.admin.id;
        request.notes = notes;
        await request.save();

        const employeeObj = await Employee.findById(request.employee);

        const newIssue = new IssueRecord({
            employee: request.employee,
            employee_name: employeeObj ? employeeObj.name : 'Unknown',
            item: request.item._id,
            item_name: request.item.name,
            quantity: 1,
            issued_date,
            next_due_date,
            notes: `Replacement for request #${request._id}`,
            issued_by: req.admin.id
        });
        await newIssue.save();

        res.json({ message: 'Request approved and issue created', request, issue: newIssue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error approving request' });
    }
});

// Reject a request
router.put('/:id/reject', async (req, res) => {
    try {
        const { notes } = req.body;

        const request = await ReplacementRequest.findByIdAndUpdate(
            req.params.id,
            {
                status: 'rejected',
                resolved_date: dayjs().toDate(),
                resolved_by: req.admin.id,
                notes
            },
            { new: true }
        );

        res.json({ message: 'Request rejected', request });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error rejecting request' });
    }
});

module.exports = router;
