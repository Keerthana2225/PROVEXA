const mongoose = require('mongoose');

const issueRecordSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employee_name: { type: String }, // For easier viewing in MongoDB Compass
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    item_name: { type: String }, // For easier viewing in MongoDB Compass
    issued_date: { type: Date, required: true },
    next_due_date: { type: Date, required: true },
    quantity: { type: Number, default: 1 },
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    issue_status: { type: String, enum: ['Pending Acknowledgement', 'Acknowledged'], default: 'Pending Acknowledgement' },
    signature_path: { type: String }, // Path to stored signature image
    acknowledged: { type: Boolean, default: false }, // Whether employee signed
    acknowledgement_time: { type: Date }, // When the signature was captured
    notes: { type: String },
    // Archive (Reset) fields — records are NEVER deleted, only archived
    archived: { type: Boolean, default: false },
    archived_at: { type: Date },
    archived_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    archive_reason: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IssueRecord', issueRecordSchema);
