const mongoose = require('mongoose');
const ReplacementRequest = require('./models/ReplacementRequest');
const ItemCategory = require('./models/ItemCategory');

async function fix() {
    await mongoose.connect('mongodb://localhost:27017/ProvexaDB');
    console.log('Connected...');

    // 1. Update categories to ensure cost tracking is enabled for Uniforms/PPE
    const catUpdate = await ItemCategory.updateMany(
        { name: /Uniform|PPE|Safety/i },
        { requires_cost_tracking: true }
    );
    console.log(`Updated ${catUpdate.modifiedCount} categories.`);

    // 2. Patch existing replacement records that have costs
    const reqUpdate = await ReplacementRequest.updateMany(
        { total_cost: { $gt: 0 } },
        { is_uniform_replacement: true }
    );
    console.log(`Patched ${reqUpdate.modifiedCount} replacement records.`);

    process.exit();
}

fix();
