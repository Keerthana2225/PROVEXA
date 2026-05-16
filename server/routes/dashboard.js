const express = require('express');
const router = express.Router();
const dashboardService = require('../services/DashboardService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
    try {
        const stats = await dashboardService.getStats();
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
});

router.get('/chart-data', async (req, res) => {
    try {
        const chartData = await dashboardService.getChartData();
        res.json(chartData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching chart data' });
    }
});

module.exports = router;
