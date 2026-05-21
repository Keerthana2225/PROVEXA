const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const IssueRecord = sequelize.define('IssueRecord', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    transaction_id: { type: DataTypes.STRING },
    employee: { type: DataTypes.STRING(36), allowNull: false },
    employee_name: { type: DataTypes.STRING },
    item: { type: DataTypes.STRING(36), allowNull: false },
    item_name: { type: DataTypes.STRING },
    issued_date: { type: DataTypes.DATE, allowNull: false },
    next_due_date: { type: DataTypes.DATE, allowNull: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    issued_by: { type: DataTypes.STRING(36), allowNull: true },
    issue_status: { type: DataTypes.STRING, defaultValue: 'Pending Acknowledgement' },
    lifecycle_status: { type: DataTypes.STRING, defaultValue: 'Active' },
    signature_path: { type: DataTypes.STRING },
    acknowledged: { type: DataTypes.BOOLEAN, defaultValue: false },
    acknowledgement_time: { type: DataTypes.DATE },
    verification_method: { type: DataTypes.STRING },
    ocr_details: { type: DataTypes.TEXT }, // Store as JSON string
    notes: { type: DataTypes.TEXT },
    item_condition: { type: DataTypes.STRING, defaultValue: 'Good' },
    returned_condition: { type: DataTypes.STRING },
    return_date: { type: DataTypes.DATE },
    archived: { type: DataTypes.BOOLEAN, defaultValue: false },
    archived_at: { type: DataTypes.DATE },
    archived_by: { type: DataTypes.STRING(36) },
    archive_reason: { type: DataTypes.STRING },
    is_renewal: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = IssueRecord;
