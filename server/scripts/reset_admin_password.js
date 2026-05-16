const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

async function resetAdminPassword() {
    const seq = new Sequelize(
        process.env.SQL_DATABASE,
        process.env.SQL_USER,
        process.env.SQL_PASSWORD,
        {
            host: process.env.SQL_SERVER,
            port: parseInt(process.env.SQL_PORT),
            dialect: 'mssql',
            dialectOptions: {
                options: {
                    trustServerCertificate: true,
                    encrypt: true
                }
            },
            logging: false
        }
    );

    const hash = await bcrypt.hash('admin123', 10);
    await seq.query(`UPDATE Admins SET password = '${hash}' WHERE username = 'admin@provexa.com'`);
    console.log('✅ Admin password reset successfully.');
    console.log('   Email:    admin@provexa.com');
    console.log('   Password: admin123');
    await seq.close();
    process.exit(0);
}

resetAdminPassword().catch(e => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
});
