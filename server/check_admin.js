const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const bcrypt = require('bcryptjs');

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        const admin = await Admin.findOne({ email: 'admin@provexa.com' });
        if (admin) {
            console.log('Admin found:', admin.email);
            const isMatch = await bcrypt.compare('admin123', admin.password_hash);
            console.log('Password match (admin123):', isMatch);
        } else {
            console.log('Admin NOT found');
        }
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAdmin();
