const mongoose = require('mongoose');

const allocationConfigSchema = new mongoose.Schema({
    item_type: { type: String, required: true, unique: true }, // 'Pant', 'Shirt', 'T-Shirt'
    permanent_quantity: { type: Number, required: true, default: 0 },
    newcomer_quantity: { type: Number, required: true, default: 0 },
    standard_quantity: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('AllocationConfig', allocationConfigSchema);
