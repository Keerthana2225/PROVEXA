const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const AllocationConfig = sequelize.define('AllocationConfig', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    item_type: { type: DataTypes.STRING, allowNull: false, unique: true },
    standard_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    permanent_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    newcomer_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    intern_quantity: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = AllocationConfig;
