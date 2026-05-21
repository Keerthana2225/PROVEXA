const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', required: true },
    validity_period: { type: Number, default: 12 }, // Months
    frequency_days: { type: Number },
    fixed_date: { type: Date },
    stock: { type: Number, default: 0 },
    description: { type: String }
}, schemaOptions);

module.exports = mongoose.model('Item', itemSchema);
