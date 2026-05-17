const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Admin } = require('./models');

dotenv.config();

const seedMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ProvexaDB');
        
        const adminData = {
            name: 'System Admin',
            username: 'admin',
            email: 'admin@provexa.com',
            password: 'password123',
            role: 'Admin'
        };

        // Try to update by email first, as that's the unique constraint causing issues
        const updated = await Admin.findOneAndUpdate(
            { email: 'admin@provexa.com' },
            adminData,
            { upsert: true, new: true }
        );

        console.log(`✅ Admin account stabilized in ProvexaDB (ID: ${updated._id})`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
};

seedMongoDB();
