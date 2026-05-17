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
            .populate('item')
            .populate('issued_by')
            .sort({ issued_date: -1 });
    }

    async getIssueExportData(filters = {}) {
        return await this.getIssueReport(filters);
    }

    async getReplacementReport(filters = {}) {
        const { startDate, endDate, employeeId, itemId, status } = filters;
        const query = {};

        if (startDate && endDate) {
            query.requested_date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (employeeId) query.employee = employeeId;
        if (itemId) query.item = itemId;
        if (status) query.status = status;

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
