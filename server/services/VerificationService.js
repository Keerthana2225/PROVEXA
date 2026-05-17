const { VerificationLog } = require('../models');

class VerificationService {
    async log(data) {
        return await VerificationLog.create(data);
    }

    async getLogs(filters = {}) {
        const { type, status, page = 1, limit = 20 } = filters;
        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;

        const logs = await VerificationLog.find(query)
            .populate('verified_by')
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await VerificationLog.countDocuments(query);
        return { logs, total };
    }

    async getRecentVerified(entityId, type, minutes) {
        const since = new Date(Date.now() - minutes * 60000);
        return await VerificationLog.findOne({
            entity_id: entityId,
            type: type,
            status: 'Verified',
            created_at: { $gte: since }
        });
    }

    async getStats() {
        const totalVerified = await VerificationLog.countDocuments({ status: 'Verified' });
        const ocrScans = await VerificationLog.countDocuments({ type: 'OCR Scan', status: 'Verified' });
        const signatures = await VerificationLog.countDocuments({ type: 'Signature', status: 'Verified' });
        
        return {
            total: totalVerified,
            ocr: ocrScans,
            signature: signatures
        };
    }
}

module.exports = new VerificationService();
