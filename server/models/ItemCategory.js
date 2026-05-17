const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const itemCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    requires_cost_tracking: { type: Boolean, default: false }
}, schemaOptions);

module.exports = mongoose.model('ItemCategory', itemCategorySchema);
