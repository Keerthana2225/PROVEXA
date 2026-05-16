const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Item = sequelize.define('Item', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    description: { 
        type: DataTypes.TEXT 
    },
    cost: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0 
    },
    frequency_days: { 
        type: DataTypes.INTEGER, 
        defaultValue: 180 
    },
    fixed_date: { 
        type: DataTypes.DATEONLY 
    },
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'Active' 
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    tableName: 'Items',
    timestamps: true
});

module.exports = Item;
