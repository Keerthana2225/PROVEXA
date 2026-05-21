const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
    _id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4(),
        field: 'id'
    },
    emp_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    department: { type: DataTypes.STRING, allowNull: false },
    designation: { type: DataTypes.STRING, allowNull: false },
    doj: { type: DataTypes.DATE },
    gender: { type: DataTypes.STRING, defaultValue: 'Male' },
    employee_type: { type: DataTypes.STRING, defaultValue: 'Permanent' },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    sizes_shirt: { type: DataTypes.STRING, defaultValue: '' },
    sizes_pant: { type: DataTypes.STRING, defaultValue: '' },
    sizes_shoe: { type: DataTypes.STRING, defaultValue: '' }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    getterMethods: {
        sizes() {
            return {
                shirt: this.sizes_shirt,
                pant: this.sizes_pant,
                shoe: this.sizes_shoe
            };
        }
    }
});

module.exports = Employee;
