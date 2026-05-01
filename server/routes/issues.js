const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
const IssueRecord = require('../models/IssueRecord');
const Item = require('../models/Item');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get issues with filters
router.get('/', async (req, res) => {
    try {
        const { employee_id, item_id, status, archived } = req.query;
        const query = {};

        // By default show only NON-archived records; pass ?archived=true for history
        query.archived = archived === 'true' ? true : { $ne: true };

        if (employee_id) query.employee = employee_id;
        if (item_id) query.item = item_id;

        const today = dayjs().startOf('day').toDate();
        const nextWeek = dayjs().add(7, 'day').endOf('day').toDate();

        if (status === 'overdue') {
            query.next_due_date = { $lt: today };
        } else if (status === 'due_soon') {
            query.next_due_date = { $gte: today, $lte: nextWeek };
        } else if (status === 'pending_ack') {
            query.acknowledged = { $ne: true };
            query.issue_status = 'Pending Acknowledgement';
        } else if (status === 'acknowledged') {
            query.acknowledged = true;
        }

        const issues = await IssueRecord.find(query)
            .populate('employee')
            .populate({ path: 'item', populate: { path: 'category' } })
            .sort({ issued_date: -1 })
            .limit(200);

        res.json(issues);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching issues' });
    }
});

// Get due tracking data specifically (exclude archived)
router.get('/due', async (req, res) => {
    try {
        const today = dayjs().startOf('day').toDate();
        const nextWeek = dayjs().add(7, 'day').endOf('day').toDate();
        const nextMonth = dayjs().add(30, 'day').endOf('day').toDate();
        const notArchived = { $ne: true };

        const [overdue, dueThisWeek, upcoming] = await Promise.all([
            IssueRecord.find({ archived: notArchived, next_due_date: { $lt: today } })
                .populate('employee item').sort({ next_due_date: 1 }),
            IssueRecord.find({ archived: notArchived, next_due_date: { $gte: today, $lte: nextWeek } })
                .populate('employee item').sort({ next_due_date: 1 }),
            IssueRecord.find({ archived: notArchived, next_due_date: { $gt: nextWeek, $lte: nextMonth } })
                .populate('employee item').sort({ next_due_date: 1 })
        ]);

        res.json({ overdue, dueThisWeek, upcoming });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching due items' });
    }
});

// Create new issue records (Bulk support)
router.post('/', async (req, res) => {
    try {
        const { employee_id, employee_ids, items, issued_date, notes } = req.body;
        const issuedDateObj = dayjs(issued_date).toDate();
        const results = [];

        const targetEmployeeIds = employee_ids || (employee_id ? [employee_id] : []);
        // items should be an array of { item_id, quantity }
        const targetItems = items || [];
        
        if (targetEmployeeIds.length === 0) return res.status(400).json({ message: 'No employees selected' });
        if (targetItems.length === 0) return res.status(400).json({ message: 'No items selected' });

        for (const empId of targetEmployeeIds) {
            const employeeObj = await Employee.findById(empId);
            const employeeName = employeeObj ? employeeObj.name : 'Unknown';

            for (const targetItem of targetItems) {
                const itId = targetItem.item_id;
                const qty = parseInt(targetItem.quantity) || 1;
                
                const item = await Item.findById(itId);
                if (!item) continue;

                const next_due_date = item.fixed_date ? new Date(item.fixed_date) : dayjs(issuedDateObj).add(item.frequency_days, 'day').toDate();

                // Check for active issues
                const activeIssue = await IssueRecord.findOne({
                    employee: empId,
                    item: itId,
                    next_due_date: { $gte: dayjs().startOf('day').toDate() }
                });

                if (activeIssue && !req.body.override) {
                    if (targetEmployeeIds.length === 1 && targetItems.length === 1) {
                        return res.status(400).json({ 
                            message: `Employee already has an active issue for ${item.name}`,
                            activeIssue
                        });
                    }
                    continue; 
                }

                const record = new IssueRecord({
                    employee: empId,
                    employee_name: employeeName,
                    item: itId,
                    item_name: item.name,
                    quantity: qty,
                    issued_date: issuedDateObj,
                    next_due_date,
                    notes,
                    issued_by: req.admin.id,
                    issue_status: 'Pending Acknowledgement',
                    acknowledged: false
                });
                await record.save();
                results.push(record);
            }
        }

        res.status(201).json({ count: results.length, records: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating issue records' });
    }
});

// Acknowledge all pending issues for an employee
router.put('/acknowledge/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { signature } = req.body; // Base64 string

        if (!signature) {
            return res.status(400).json({ message: 'Signature is required' });
        }

        // Find all pending issues for this employee
        const pendingIssues = await IssueRecord.find({
            employee: employeeId,
            issue_status: 'Pending Acknowledgement'
        });

        if (pendingIssues.length === 0) {
            return res.status(404).json({ message: 'No pending issues found for this employee' });
        }

        // Process and save the signature image
        const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `sig_emp_${Date.now()}_${employeeId}.png`;
        const dir = path.join(__dirname, '..', 'public', 'signatures');
        
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filepath = path.join(dir, filename);
        fs.writeFileSync(filepath, buffer);
        
        const signature_path = `/public/signatures/${filename}`;
        const acknowledgement_time = new Date();

        // Update all pending records for this employee with the same signature proof
        await IssueRecord.updateMany(
            { employee: employeeId, issue_status: 'Pending Acknowledgement' },
            { 
                $set: { 
                    issue_status: 'Acknowledged', 
                    acknowledged: true, 
                    signature_path, 
                    acknowledgement_time 
                } 
            }
        );

        res.json({ message: `Successfully acknowledged ${pendingIssues.length} items.`, count: pendingIssues.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error acknowledging issues' });
    }
});

// Acknowledge a single record
router.put('/acknowledge/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { signature } = req.body; // Base64 string

        if (!signature) {
            return res.status(400).json({ message: 'Signature is required' });
        }

        const issue = await IssueRecord.findById(id);
        if (!issue) return res.status(404).json({ message: 'Issue record not found' });

        // Process and save the signature image
        const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `sig_rec_${Date.now()}_${id}.png`;
        const dir = path.join(__dirname, '..', 'public', 'signatures');
        
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filepath = path.join(dir, filename);
        fs.writeFileSync(filepath, buffer);
        
        const signature_path = `/public/signatures/${filename}`;
        
        issue.issue_status = 'Acknowledged';
        issue.acknowledged = true;
        issue.signature_path = signature_path;
        issue.acknowledgement_time = new Date();
        
        await issue.save();

        res.json({ message: 'Successfully acknowledged receipt.', issue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error acknowledging issue' });
    }
});

// Archive-reset: marks active issues as archived WITHOUT deleting them
// Body: { scope: 'all' | 'employee' | 'selected', employee_id?, issue_ids?: [] }
router.put('/archive-reset', async (req, res) => {
    try {
        const { scope, employee_id, issue_ids } = req.body;
        const archiveData = {
            archived: true,
            archived_at: new Date(),
            archived_by: req.admin.id,
            archive_reason: 'Reset for new issuance'
        };

        let filter = { archived: { $ne: true } }; // only target non-archived records
        let result;

        if (scope === 'all') {
            result = await IssueRecord.updateMany(filter, { $set: archiveData });
        } else if (scope === 'employee' && employee_id) {
            filter.employee = employee_id;
            result = await IssueRecord.updateMany(filter, { $set: archiveData });
        } else if (scope === 'selected' && Array.isArray(issue_ids) && issue_ids.length > 0) {
            filter._id = { $in: issue_ids };
            result = await IssueRecord.updateMany(filter, { $set: archiveData });
        } else {
            return res.status(400).json({ message: 'Invalid scope or missing parameters' });
        }

        res.json({
            message: `${result.modifiedCount} issue record(s) archived successfully.`,
            count: result.modifiedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error archiving issues' });
    }
});

module.exports = router;
