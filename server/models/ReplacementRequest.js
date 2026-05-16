const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReplacementRequest = sequelize.define('ReplacementRequest', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    employee_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    },
    item_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    },
    reason: { 
        type: DataTypes.TEXT, 
        allowNull: false 
    },
    is_uniform_replacement: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    quantity: { 
        type: DataTypes.INTEGER, 
        defaultValue: 1 
    },
    size: { 
        type: DataTypes.STRING 
    },
    unit_cost: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0 
    },
    total_cost: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0 
    },
    deduction_amount: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0 
    },
    payment_status: { 
        type: DataTypes.STRING, 
        defaultValue: 'Pending' 
    },
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'Pending' 
    },
    requested_date: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    },
    replacement_date: { 
        type: DataTypes.DATE 
    },
    resolved_date: { 
        type: DataTypes.DATE 
    },
    signature_path: { 
        type: DataTypes.STRING 
    },
    acknowledged: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    verification_method: { 
        type: DataTypes.STRING, 
        defaultValue: 'Manual' 
    }
}, {
    tableName: 'ReplacementRequests',
    timestamps: true,
    indexes: [
        { fields: ['employee_id'] },
        { fields: ['item_id'] },
        { fields: ['status'] },
        { fields: ['payment_status'] },
        { fields: ['requested_date'] }
    ]
});

module.exports = ReplacementRequest;
