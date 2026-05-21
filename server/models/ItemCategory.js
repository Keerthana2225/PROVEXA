const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const ItemCategory = sequelize.define('ItemCategory', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    requires_cost_tracking: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ItemCategory;
