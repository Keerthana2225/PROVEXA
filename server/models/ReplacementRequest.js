const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const replacementRequestSchema = new mongoose.Schema({
    // ── Core references ───────────────────────────────────────────
    employee:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employee_name: { type: String },
    item:          { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    item_name:     { type: String },

    // ── Workflow classification ────────────────────────────────────
    allocation_type: {
        type: String,
        enum: ['Standard', 'Additional', 'Replacement'],
        default: 'Standard'
    },
    // Source label for reporting/analytics — mirrors allocation_type but is immutable after creation
    allocation_source: {
        type: String,
        enum: ['Standard', 'Additional', 'Replacement'],
        default: 'Standard'
    },

    // ── Request details ───────────────────────────────────────────
    reason: {
        type: String,
        required: true,
        enum: ['Additional Request', 'Damage', 'Size Change', 'Lost Item', 'Renewal', 'Exchange', 'Other']
    },
    // Specific reason for Replacement/Exchange workflow
    exchange_reason: {
        type: String,
        enum: ['Size Change', 'Damaged', 'Defective', 'Worn Out', 'Lost Item', ''],
        default: ''
    },
    quantity: { type: Number, default: 1 },
    size:     { type: String, default: 'N/A' },
    notes:    { type: String },

    // ── Cost tracking (Additional only — Replacement defaults to 0) ──
    unit_cost:   { type: Number, default: 0 },
    total_cost:  { type: Number, default: 0 },
    payment_status:    { type: String, default: 'Not Applicable' },
    apply_cost_override: { type: Boolean, default: false },
    approved_standard_quantity: { type: Number, default: 0 },

    // ── Replacement workflow ──────────────────────────────────────
    // Reference to the IssueRecord being replaced/exchanged
    previous_issue_id: { type: mongoose.Schema.Types.ObjectId, ref: 'IssueRecord', default: null },
    return_status: { type: String, default: 'Not Required' },

    // ── Lifecycle ─────────────────────────────────────────────────
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'pending', 'approved', 'rejected', 'completed']
    },
    lifecycle_status:  { type: String, enum: ['Active', 'Completed'], default: 'Active' },
    requested_date:    { type: Date, default: Date.now },
    resolved_date:     { type: Date },
    resolved_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // ── Verification ──────────────────────────────────────────────
    verification_method: { type: String },
    signature_path:      { type: String },
    ocr_details:         { type: Object },
    item_collected:      { type: Boolean, default: false },
    acknowledged:        { type: Boolean, default: false },
}, schemaOptions);

module.exports = mongoose.model('ReplacementRequest', replacementRequestSchema);
