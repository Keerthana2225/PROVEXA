const mongoose = require('mongoose');

const officialPriceSchema = new mongoose.Schema({
    item_name:   { type: String, required: true, trim: true },
    price:       { type: Number, required: true },
    gender:      { type: String, enum: ['MEN', 'WOMEN', 'UNISEX'], default: 'UNISEX' },
    description: { type: String },
    active:      { type: Boolean, default: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound unique index: same item can have different prices for MEN vs WOMEN
officialPriceSchema.index({ item_name: 1, gender: 1 }, { unique: true });

module.exports = mongoose.model('OfficialPriceList', officialPriceSchema);
