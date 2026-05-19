const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const replacementRequestSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employee_name: { type: String },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    item_name: { type: String },
    reason: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    size: { type: String, default: 'N/A' },
    unit_cost: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    deduction_amount: { type: Number, default: 0 },
    payment_status: { type: String, default: 'Not Applicable' },
    return_status: { type: String, default: 'Not Required' },
    allocation_type: { 
        type: String, 
        enum: ['Standard', 'Additional', 'Replacement'], 
        default: 'Standard' 
    },
    is_salary_deduction: { type: Boolean, default: false },
    approved_standard_quantity: { type: Number, default: 0 },
    status: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'pending', 'approved', 'rejected', 'completed'] 
    },
    lifecycle_status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
    requested_date: { type: Date, default: Date.now },
    resolved_date: { type: Date },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    notes: { type: String },
    verification_method: { type: String },
    signature_path: { type: String },
    ocr_details: { type: Object },
    item_collected: { type: Boolean, default: false },
    acknowledged: { type: Boolean, default: false }
}, schemaOptions);

module.exports = mongoose.model('ReplacementRequest', replacementRequestSchema);
