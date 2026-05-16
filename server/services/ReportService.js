const { Employee, IssueRecord, ReplacementRequest, Item, ItemCategory } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

class ReportService {
    async getIssueExportData(filters = {}) {
        const where = {};
        if (filters.include_archived !== 'true') {
            where.lifecycle_status = { [Op.ne]: 'Returned' };
        }

        if (filters.employee_id) where.employee_id = filters.employee_id;

        if (filters.startDate && filters.endDate) {
            where.issued_date = {
                [Op.between]: [
                    dayjs(filters.startDate).startOf('day').toDate(),
                    dayjs(filters.endDate).endOf('day').toDate()
                ]
            };
        }

        const include = [
            { 
                model: Employee, 
                as: 'employee',
                where: filters.department ? { department: filters.department } : {}
            },
            { 
                model: Item, 
                as: 'item', 
                include: [{ model: ItemCategory, as: 'category' }],
                where: filters.category_id ? { category_id: filters.category_id } : {}
            }
        ];

        // Verification filters
        if (filters.verification_status) {
            if (filters.verification_status === 'Pending Verification') {
                where.acknowledged = false;
            } else if (filters.verification_status === 'OCR Verified') {
                where.acknowledged = true;
                where.verification_method = 'OCR Scan';
            } else if (filters.verification_status === 'Signature Verified') {
                where.acknowledged = true;
                where.verification_method = 'Signature';
            } else if (filters.verification_status === 'Fully Verified') {
                where.acknowledged = true;
                where.verification_method = 'Signature + OCR';
            }
        }

        if (filters.verification_method && filters.verification_method !== 'all') {
            where.verification_method = filters.verification_method;
        }

        return await IssueRecord.findAll({
            where,
            include,
            order: [['issued_date', 'DESC']]
        });
    }

    async getReplacementExportData(filters = {}) {
        const where = {};
        if (filters.is_uniform_replacement !== undefined) {
            where.is_uniform_replacement = filters.is_uniform_replacement;
        }
        if (filters.employee_id) where.employee_id = filters.employee_id;
        if (filters.payment_status && filters.payment_status !== 'all') where.payment_status = filters.payment_status;
        if (filters.status && filters.status !== 'all') where.status = filters.status;

        if (filters.from_date || filters.to_date) {
            where.requested_date = {};
            if (filters.from_date) where.requested_date[Op.gte] = new Date(filters.from_date);
            if (filters.to_date) where.requested_date[Op.lte] = dayjs(filters.to_date).endOf('day').toDate();
        }

        const include = [
            { 
                model: Employee, 
                as: 'employee',
                where: filters.department ? { department: filters.department } : {}
            },
            { 
                model: Item, 
                as: 'item', 
                include: [{ model: ItemCategory, as: 'category' }] 
            }
        ];

        return await ReplacementRequest.findAll({
            where,
            include,
            order: [['requested_date', 'DESC']]
        });
    }
}

module.exports = new ReportService();
