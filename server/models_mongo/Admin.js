const mongoose = require('mongoose');

// Global schema configuration to ensure .id is present in JSON/Object conversions
const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Admin' }
}, schemaOptions);

module.exports = mongoose.model('Admin', adminSchema);
