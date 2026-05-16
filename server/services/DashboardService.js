const { Employee, IssueRecord, ReplacementRequest } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

class DashboardService {
    async getStats() {
        const totalEmployees = await Employee.count({ where: { status: 'active' } });
        
        const startOfMonth = dayjs().startOf('month').toDate();
        const itemsIssuedThisMonth = await IssueRecord.count({
            where: {
                issued_date: { [Op.gte]: startOfMonth }
            }
        });

        const pendingReplacements = await ReplacementRequest.count({
            where: { status: 'Pending' }
        });

        const today = dayjs().startOf('day').toDate();
        const nextMonth = dayjs().add(30, 'day').endOf('day').toDate();
        const upcomingRenewals = await IssueRecord.count({
            where: {
                lifecycle_status: 'Active',
                next_due_date: { [Op.gt]: today, [Op.lte]: nextMonth }
            }
        });

        const itemsRequiringAttention = await IssueRecord.count({
            where: {
                lifecycle_status: 'Active',
                next_due_date: { [Op.lte]: today }
            }
        });

        return {
            totalEmployees,
            itemsIssuedThisMonth,
            pendingReplacements,
            upcomingRenewals,
            itemsRequiringAttention
        };
    }

    async getChartData() {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            months.push(dayjs().subtract(i, 'month').format('MMM YYYY'));
        }

        const chartData = [];
        for (const month of months) {
            const start = dayjs(month, 'MMM YYYY').startOf('month').toDate();
            const end = dayjs(month, 'MMM YYYY').endOf('month').toDate();
            
            const count = await IssueRecord.count({
                where: {
                    issued_date: { [Op.between]: [start, end] }
                }
            });
            
            chartData.push({ name: month.split(' ')[0], issues: count });
        }

        return chartData;
    }
}

module.exports = new DashboardService();
