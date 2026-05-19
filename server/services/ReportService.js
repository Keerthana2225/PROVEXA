const { IssueRecord, ReplacementRequest } = require('../models');

class ReportService {
    async getIssueReport(filters = {}) {
        const { startDate, endDate, employeeId, itemId, status } = filters;
        const query = { archived: false };

        if (startDate && endDate) {
            query.issued_date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (employeeId) query.employee = employeeId;
        if (itemId) query.item = itemId;
        if (status) query.issue_status = status;

        return await IssueRecord.find(query)
            .populate('employee')
            .populate({ path: 'item', populate: { path: 'category' } })
            .populate('issued_by')
            .sort({ issued_date: -1 });
    }

    async getIssueExportData(filters = {}) {
        return await this.getIssueReport(filters);
    }

    async getReplacementReport(filters = {}) {
        const { startDate, endDate, employeeId, itemId, status, allocation_type, is_salary_deduction } = filters;
        const query = {};

        if (startDate && endDate) {
            query.requested_date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (employeeId) query.employee = employeeId;
        if (itemId) query.item = itemId;
        if (status) query.status = status;
        if (allocation_type) {
            if (allocation_type === 'Additional') {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                query.requested_date = { $gte: todayStart };
                query.$or = [
                    { allocation_type: 'Additional' },
                    { is_salary_deduction: true },
                    { deduction_amount: { $gt: 0 } }
                ];
            } else {
                query.allocation_type = allocation_type;
            }
        }
        if (is_salary_deduction !== undefined) {
            query.is_salary_deduction = is_salary_deduction === 'true' || is_salary_deduction === true;
        }

        return await ReplacementRequest.find(query)
            .populate('employee')
            .populate('item')
            .populate('resolved_by')
            .sort({ requested_date: -1 });
    }

    async getReplacementExportData(filters = {}) {
        return await this.getReplacementReport(filters);
    }
}

module.exports = new ReportService();
