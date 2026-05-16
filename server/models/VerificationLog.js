const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VerificationLog = sequelize.define('VerificationLog', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    type: { 
        type: DataTypes.STRING, 
        allowNull: false 
    }, // OCR, Signature
    status: { 
        type: DataTypes.STRING, 
        allowNull: false 
    }, // Verified, Failed
    entity_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    }, // ID of the ReplacementRequest
    entity_type: { 
        type: DataTypes.STRING, 
        defaultValue: 'Replacement' 
    },
    details: { 
        type: DataTypes.TEXT 
    },
    verified_by: { 
        type: DataTypes.UUID 
    },
    timestamp: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    }
}, {
    tableName: 'VerificationLogs',
    timestamps: true,
    indexes: [
        { fields: ['entity_id'] },
        { fields: ['status'] },
        { fields: ['type'] },
        { fields: ['timestamp'] }
    ]
});

module.exports = VerificationLog;
