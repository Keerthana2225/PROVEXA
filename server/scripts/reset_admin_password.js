const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

async function resetAdminPassword() {
    try {
        console.log('🔗 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected successfully.');

        // Hash the new password: admin@123
        const newPassword = 'admin@123';
        const saltRounds = 10;
        console.log(`🔑 Hashing password "${newPassword}"...`);
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the password for the admin user
        // We will update where username is 'admin' or email is 'admin@provexa.com' to be completely safe
        console.log('📝 Updating admin password in database...');
        const [result] = await sequelize.query(`
            UPDATE Admins 
            SET password = :password 
            WHERE username = 'admin' OR email = 'admin@provexa.com'
        `, {
            replacements: { password: hashedPassword }
        });

        console.log('✅ Admin password updated successfully!');
        console.log('   Username: admin');
        console.log('   Email:    admin@provexa.com');
        console.log('   Password: admin@123');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to reset admin password:', error);
        process.exit(1);
    }
}

resetAdminPassword();
