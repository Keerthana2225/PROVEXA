const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const verificationLogSchema = new mongoose.Schema({
    type: { type: String, required: true },
    status: { type: String, required: true },
    entity_id: { type: mongoose.Schema.Types.ObjectId },
    entity_type: { type: String },
    details: { type: String },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, schemaOptions);

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
