const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const issueRecordSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employee_name: { type: String },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    item_name: { type: String },
    issued_date: { type: Date, required: true },
    next_due_date: { type: Date, required: true },
    quantity: { type: Number, default: 1 },
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    issue_status: { type: String, enum: ['Pending Acknowledgement', 'Acknowledged'], default: 'Pending Acknowledgement' },
    lifecycle_status: { type: String, enum: ['Active', 'Returned'], default: 'Active' },
    signature_path: { type: String },
    acknowledged: { type: Boolean, default: false },
    acknowledgement_time: { type: Date },
    verification_method: { type: String },
    ocr_details: { type: Object },
    notes: { type: String },
    item_condition: { type: String, default: 'Good' },
    returned_condition: { type: String },
    return_date: { type: Date },
    archived: { type: Boolean, default: false },
    archived_at: { type: Date },
    archived_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    archive_reason: { type: String },
    is_renewal: { type: Boolean, default: false }
}, schemaOptions);

module.exports = mongoose.model('IssueRecord', issueRecordSchema);
