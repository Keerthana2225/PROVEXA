const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const VerificationLog = sequelize.define('VerificationLog', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    employee: { type: DataTypes.STRING(36) },
    employee_name: { type: DataTypes.STRING },
    emp_code: { type: DataTypes.STRING },
    reference_id: { type: DataTypes.STRING(36) },
    reference_type: { type: DataTypes.STRING, defaultValue: 'standalone' },
    method: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    ocr_confidence: { type: DataTypes.FLOAT },
    raw_ocr_text: { type: DataTypes.TEXT },
    signature_path: { type: DataTypes.STRING },
    device_info: { type: DataTypes.STRING },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = VerificationLog;
