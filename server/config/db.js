const mongoose = require('mongoose');
const AllocationConfig = require('../models/AllocationConfig');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/provexa');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        await seedDefaultConfigs();
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

const seedDefaultConfigs = async () => {
    try {
        const defaults = [
            { item_type: 'Pant', permanent_quantity: 2, newcomer_quantity: 3, standard_quantity: 2 },
            { item_type: 'Shirt', permanent_quantity: 2, newcomer_quantity: 2, standard_quantity: 2 },
            { item_type: 'T-Shirt', permanent_quantity: 1, newcomer_quantity: 1, standard_quantity: 1 }
        ];
        for (const def of defaults) {
            // Delete old one if it has standard_quantity but lacks permanent_quantity field
            await AllocationConfig.deleteOne({ item_type: def.item_type, permanent_quantity: { $exists: false } });
            
            const exists = await AllocationConfig.findOne({ item_type: def.item_type });
            if (!exists) {
                await AllocationConfig.create(def);
                console.log(`🌱 Seeded default limits for ${def.item_type}: Permanent = ${def.permanent_quantity}, Newcomer = ${def.newcomer_quantity}`);
            }
        }
    } catch (err) {
        console.error('Failed to seed default allocation configs:', err);
    }
};

module.exports = connectDB;

