const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    emp_code: { 
        type: DataTypes.STRING, 
        unique: true, 
        allowNull: false 
    },
    name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    department: { 
        type: DataTypes.STRING 
    },
    designation: { 
        type: DataTypes.STRING 
    },
    salary: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0 
    },
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'active' 
    }
}, {
    tableName: 'Employees',
    timestamps: true,
    indexes: [
        { fields: ['emp_code'] },
        { fields: ['department'] },
        { fields: ['status'] }
    ]
});

module.exports = Employee;
