const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const ReplacementRequest = sequelize.define('ReplacementRequest', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    transaction_id: { type: DataTypes.STRING },
    employee: { type: DataTypes.STRING(36), allowNull: false },
    item: { type: DataTypes.STRING(36), allowNull: false },
    previous_issue: { type: DataTypes.STRING(36) },
    allocation_type: { type: DataTypes.STRING, defaultValue: 'Replacement' },
    reason: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT },
    is_uniform_replacement: { type: DataTypes.BOOLEAN, defaultValue: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    size: { type: DataTypes.STRING },
    unit_cost: { type: DataTypes.FLOAT, defaultValue: 0 },
    total_cost: { type: DataTypes.FLOAT, defaultValue: 0 },
    deduction_amount: { type: DataTypes.FLOAT, defaultValue: 0 },
    payment_status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    requested_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    replacement_date: { type: DataTypes.DATE },
    resolved_date: { type: DataTypes.DATE },
    signature_path: { type: DataTypes.STRING },
    acknowledged: { type: DataTypes.BOOLEAN, defaultValue: false },
    verification_method: { type: DataTypes.STRING },
    ocr_details: { type: DataTypes.TEXT } // JSON string
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ReplacementRequest;
