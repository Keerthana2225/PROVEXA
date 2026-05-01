const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const Employee = require('../models/Employee');
const IssueRecord = require('../models/IssueRecord');
const ReplacementRequest = require('../models/ReplacementRequest');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
    try {
        const today = dayjs().startOf('day').toDate();
        const startOfMonth = dayjs().startOf('month').toDate();
        const endOfMonth = dayjs().endOf('month').toDate();
        const nextWeek = dayjs().add(7, 'day').endOf('day').toDate();

        const [
            totalEmployees,
            itemsIssuedThisMonth,
            pendingReplacements,
            itemsDueNext7Days,
            overdueItems
        ] = await Promise.all([
            Employee.countDocuments({ status: 'active' }),
            IssueRecord.countDocuments({
                issued_date: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            ReplacementRequest.countDocuments({ status: 'pending' }),
            IssueRecord.countDocuments({
                next_due_date: { $gte: today, $lte: nextWeek }
            }),
            IssueRecord.countDocuments({
                next_due_date: { $lt: today }
            })
        ]);

        res.json({
            totalEmployees,
            itemsIssuedThisMonth,
            pendingReplacements,
            itemsDueNext7Days,
            overdueItems
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
});

router.get('/chart-data', async (req, res) => {
    try {
        const sixMonthsAgo = dayjs().subtract(6, 'month').startOf('month').toDate();
        
        const issues = await IssueRecord.find({ 
            issued_date: { $gte: sixMonthsAgo } 
        }, 'issued_date');

        const months = {};
        for (let i = 5; i >= 0; i--) {
            months[dayjs().subtract(i, 'month').format('MMM YYYY')] = 0;
        }

        issues.forEach(issue => {
            const monthStr = dayjs(issue.issued_date).format('MMM YYYY');
            if (months[monthStr] !== undefined) {
                months[monthStr]++;
            }
        });

        const chartData = Object.keys(months).map(name => ({
            name,
            issues: months[name]
        }));

        res.json(chartData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching chart data' });
    }
});

module.exports = router;
