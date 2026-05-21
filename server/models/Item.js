const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const Item = sequelize.define('Item', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    cost: { type: DataTypes.FLOAT, defaultValue: 0 },
    frequency_days: { type: DataTypes.INTEGER, defaultValue: 365 },
    fixed_date: { type: DataTypes.DATE },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    category: { type: DataTypes.STRING(36), allowNull: false } // Mapped as foreign key in index.js
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Item;
