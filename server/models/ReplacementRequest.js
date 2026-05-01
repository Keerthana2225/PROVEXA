const mongoose = require('mongoose');

const replacementRequestSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employee_name: { type: String }, // For easier viewing in MongoDB Compass
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    item_name: { type: String }, // For easier viewing in MongoDB Compass
    reason: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    requested_date: { type: Date, default: Date.now },
    resolved_date: { type: Date },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    notes: { type: String }
});

module.exports = mongoose.model('ReplacementRequest', replacementRequestSchema);
