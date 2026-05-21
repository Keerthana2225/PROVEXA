const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/database');
const { Employee, IssueRecord, ReplacementRequest, Item } = require('../models');

class DashboardService {
    async getStats() {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + 7);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
            totalEmployees,
            itemsIssuedThisMonth,
            pendingReplacements,
            upcomingRenewals,
            itemsRequiringAttention,
            additionalRequestsCount,
            pendingDeductionsCount,
            totalDeductionAmount
        ] = await Promise.all([
            Employee.count({ where: { status: 'active' } }),
            IssueRecord.count({ 
                where: {
                    issued_date: { [Op.gte]: startOfMonth },
                    archived: false 
                }
            }),
            ReplacementRequest.count({ where: { status: { [Op.in]: ['pending', 'Pending', 'approved', 'Approved'] } } }),
            IssueRecord.count({ 
                where: {
                    next_due_date: { [Op.lte]: thresholdDate, [Op.gt]: new Date() },
                    archived: false,
                    lifecycle_status: 'Active'
                }
            }),
            IssueRecord.count({ 
                where: {
                    next_due_date: { [Op.lte]: new Date() },
                    archived: false,
                    lifecycle_status: 'Active'
                }
            }),
            ReplacementRequest.count({ 
                where: {
                    requested_date: { [Op.gte]: todayStart },
                    [Op.or]: [
                        { allocation_type: 'Additional' },
                        { deduction_amount: { [Op.gt]: 0 } }
                    ]
                }
            }),
            ReplacementRequest.count({ 
                where: {
                    requested_date: { [Op.gte]: todayStart },
                    payment_status: 'Pending',
                    deduction_amount: { [Op.gt]: 0 }
                }
            }),
            // Total additional cost — all time, all Additional requests
            ReplacementRequest.sum('total_cost', {
                where: {
                    allocation_type: 'Additional',
                    total_cost: { [Op.gt]: 0 }
                }
            })
        ]);

        return {
            totalEmployees,
            itemsIssuedThisMonth,
            pendingReplacements,
            upcomingRenewals,
            itemsRequiringAttention,
            additionalRequestsCount,
            pendingDeductionsCount,
            totalDeductionAmount: totalDeductionAmount || 0
        };
    }

    async getChartData() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const activity = await IssueRecord.findAll({
            attributes: [
                [fn('MONTH', col('issued_date')), '_id'],
                [fn('COUNT', col('id')), 'issues']
            ],
            where: {
                issued_date: { [Op.gte]: sixMonthsAgo },
                archived: false
            },
            group: [fn('MONTH', col('issued_date'))],
            order: [[fn('MONTH', col('issued_date')), 'ASC']],
            raw: true
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return activity.map(a => ({ 
            name: monthNames[a._id - 1], 
            issues: a.issues 
        }));
    }
}

module.exports = new DashboardService();
