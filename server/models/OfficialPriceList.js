const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const OfficialPriceList = sequelize.define('OfficialPriceList', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    item_name: { type: DataTypes.STRING, allowNull: false },
    gender: { type: DataTypes.STRING, defaultValue: 'UNISEX' },
    price: { type: DataTypes.FLOAT, allowNull: false },
    effective_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = OfficialPriceList;
