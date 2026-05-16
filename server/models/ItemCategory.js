const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ItemCategory = sequelize.define('ItemCategory', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    name: { 
        type: DataTypes.STRING, 
        unique: true, 
        allowNull: false 
    },
    requires_cost_tracking: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    }
}, {
    tableName: 'ItemCategories',
    timestamps: true
});

module.exports = ItemCategory;
