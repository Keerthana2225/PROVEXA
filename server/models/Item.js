const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', required: true },
    frequency_days: { type: Number }, // Optional now
    fixed_date: { type: Date }, // Optional fixed due date
    description: { type: String }
});

module.exports = mongoose.model('Item', itemSchema);
