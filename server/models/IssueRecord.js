const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IssueRecord = sequelize.define('IssueRecord', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    employee_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    },
    employee_name: { 
        type: DataTypes.STRING 
    },
    item_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    },
    item_name: { 
        type: DataTypes.STRING 
    },
    quantity: { 
        type: DataTypes.INTEGER, 
        defaultValue: 1 
    },
    size: { 
        type: DataTypes.STRING, 
        defaultValue: 'N/A' 
    },
    issued_date: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    },
    next_due_date: { 
        type: DataTypes.DATE 
    },
    lifecycle_status: { 
        type: DataTypes.STRING, 
        defaultValue: 'Active' 
    },
    issue_status: { 
        type: DataTypes.STRING, 
        defaultValue: 'Pending Acknowledgement' 
    },
    acknowledged: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    return_date: { 
        type: DataTypes.DATE 
    },
    return_remarks: { 
        type: DataTypes.TEXT 
    },
    returned_condition: { 
        type: DataTypes.STRING 
    },
    item_condition: { 
        type: DataTypes.STRING, 
        defaultValue: 'Good' 
    },
    timeline: { 
        type: DataTypes.TEXT, // Store as JSON string for MSSQL
        get() {
            const val = this.getDataValue('timeline');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('timeline', JSON.stringify(val));
        }
    },
    signature_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    verification_method: {
        type: DataTypes.STRING,
        allowNull: true
    },
    acknowledgement_time: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'IssueRecords',
    timestamps: true,
    indexes: [
        { fields: ['employee_id'] },
        { fields: ['item_id'] },
        { fields: ['lifecycle_status'] },
        { fields: ['issued_date'] },
        { fields: ['next_due_date'] }
    ]
});

module.exports = IssueRecord;
