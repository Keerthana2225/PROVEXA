const { Employee, IssueRecord, ReplacementRequest, Item } = require('../models');

class DashboardService {
    async getStats() {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + 7); // 7 days window

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
            deductionAgg
        ] = await Promise.all([
            Employee.countDocuments({ status: 'active' }),
            IssueRecord.countDocuments({ 
                issued_date: { $gte: startOfMonth },
                archived: false 
            }),
            ReplacementRequest.countDocuments({ status: 'pending' }),
            IssueRecord.countDocuments({ 
                next_due_date: { $lte: thresholdDate, $gt: new Date() },
                archived: false,
                lifecycle_status: 'Active'
            }),
            IssueRecord.countDocuments({ 
                next_due_date: { $lte: new Date() },
                archived: false,
                lifecycle_status: 'Active'
            }),
            ReplacementRequest.countDocuments({ 
                requested_date: { $gte: todayStart },
                $or: [
                    { allocation_type: 'Additional' },
                    { is_salary_deduction: true },
                    { deduction_amount: { $gt: 0 } }
                ]
            }),
            ReplacementRequest.countDocuments({ 
                requested_date: { $gte: todayStart },
                payment_status: 'Pending',
                $or: [
                    { is_salary_deduction: true },
                    { deduction_amount: { $gt: 0 } }
                ]
            }),
            ReplacementRequest.aggregate([
                { 
                    $match: { 
                        requested_date: { $gte: todayStart },
                        $or: [{ is_salary_deduction: true }, { deduction_amount: { $gt: 0 } }] 
                    } 
                },
                { $group: { _id: null, total: { $sum: '$deduction_amount' } } }
            ])
        ]);

        const totalDeductionAmount = deductionAgg.length > 0 ? deductionAgg[0].total : 0;

        return {
            totalEmployees,
            itemsIssuedThisMonth,
            pendingReplacements,
            upcomingRenewals,
            itemsRequiringAttention,
            additionalRequestsCount,
            pendingDeductionsCount,
            totalDeductionAmount
        };
    }

    async getChartData() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const activity = await IssueRecord.aggregate([
            { $match: { issued_date: { $gte: sixMonthsAgo }, archived: false } },
            {
                $group: {
                    _id: { $month: '$issued_date' },
                    issues: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Return a plain array of objects for Recharts
        return activity.map(a => ({ 
            name: monthNames[a._id - 1], 
            issues: a.issues 
        }));
    }
}

module.exports = new DashboardService();
