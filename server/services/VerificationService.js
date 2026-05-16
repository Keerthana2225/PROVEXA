const { VerificationLog, ReplacementRequest, Employee, Item } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

class VerificationService {
    async log(data) {
        return await VerificationLog.create(data);
    }

    async getByEntity(entity_id) {
        return await VerificationLog.findAll({
            where: { entity_id },
            order: [['timestamp', 'DESC']]
        });
    }

    async getRecentVerified(employee_id, method, minutes = 2) {
        const windowStart = dayjs().subtract(minutes, 'minute').toDate();
        return await VerificationLog.findOne({
            where: {
                employee_id,
                type: method,
                status: 'Verified',
                timestamp: { [Op.gte]: windowStart }
            }
        });
    }

    async getLogs(filters = {}) {
        const { method, status, limit = 50, page = 1 } = filters;
        const limitNum = parseInt(limit);
        const offset = (parseInt(page) - 1) * limitNum;
        const where = {};
        
        if (method && method !== 'all') where.type = method;
        if (status && status !== 'all') {
            where.status = status;
        } else {
            where.status = { [Op.ne]: 'Failed' };
        }

        const { rows, count } = await VerificationLog.findAndCountAll({
            where,
            include: [
                { 
                    model: ReplacementRequest, 
                    as: 'replacement', 
                    required: false,
                    include: [
                        { model: Employee, as: 'employee' },
                        { model: Item, as: 'item' }
                    ]
                }
            ],
            order: [['timestamp', 'DESC']],
            offset,
            limit: limitNum
        });

        return { 
            logs: rows, 
            total: count, 
            page: parseInt(page), 
            pages: Math.ceil(count / limitNum) 
        };
    }

    async getStats() {
        const today = dayjs().startOf('day').toDate();
        
        const total = await VerificationLog.count();
        const todayTotal = await VerificationLog.count({ where: { timestamp: { [Op.gte]: today } } });
        const verified = await VerificationLog.count({ where: { status: 'Verified' } });
        const failed = await VerificationLog.count({ where: { status: 'Failed' } });
        const duplicate = await VerificationLog.count({ where: { status: 'Duplicate Scan' } });

        return { total, todayTotal, verified, failed, duplicate };
    }
}

module.exports = new VerificationService();
