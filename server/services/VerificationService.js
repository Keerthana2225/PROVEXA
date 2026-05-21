const { Op } = require('sequelize');
const { VerificationLog, Employee } = require('../models');

class VerificationService {

    // Unified log function — maps all calling conventions to the actual model fields
    async log(data) {
        const logData = {
            // employee field: accept entity_id (when entity_type=Employee) or direct employee field
            employee: data.employee || (data.entity_type === 'Employee' ? data.entity_id : null),
            reference_id: data.reference_id || (data.entity_type !== 'Employee' ? data.entity_id : null),
            reference_type: data.reference_type || data.entity_type || 'standalone',
            method: data.method || data.type || 'Manual',
            status: data.status || 'Verified',
            ocr_confidence: data.ocr_confidence || null,
            raw_ocr_text: data.raw_ocr_text || null,
            signature_path: data.signature_path || null,
            device_info: data.device_info ? JSON.stringify(data.device_info) : null,
            timestamp: new Date()
        };
        return await VerificationLog.create(logData);
    }

    async getRecentVerified(employeeId, method, windowMinutes) {
        const cutoff = new Date();
        cutoff.setMinutes(cutoff.getMinutes() - windowMinutes);
        const log = await VerificationLog.findOne({
            where: {
                employee: employeeId,
                method,
                status: 'Verified',
                timestamp: { [Op.gte]: cutoff }
            }
        });
        return log ? log.toJSON() : null;
    }

    async getHistoryByEmployee(employeeId) {
        const logs = await VerificationLog.findAll({
            where: { employee: employeeId },
            order: [['timestamp', 'DESC']]
        });
        return logs.map(l => l.toJSON());
    }

    async getRecentActivity(limit = 10) {
        const logs = await VerificationLog.findAll({
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit)
        });
        return logs.map(l => l.toJSON());
    }

    async getLogs(filters = {}) {
        const { employeeId, limit = 50 } = filters;
        const where = {};
        if (employeeId) where.employee = employeeId;
        const logs = await VerificationLog.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit)
        });
        return logs.map(l => l.toJSON());
    }

    async getStats() {
        const total = await VerificationLog.count();
        const verified = await VerificationLog.count({ where: { status: 'Verified' } });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await VerificationLog.count({
            where: { timestamp: { [Op.gte]: today } }
        });
        return { total, verified, today: todayCount };
    }
}

module.exports = new VerificationService();
