const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

async function check() {
  const sequelize = new Sequelize('ProvexaDB', 'provexa_user', 'Provexa@123', {
    host: '127.0.0.1',
    dialect: 'mssql',
    dialectOptions: {
      options: {
        port: 1433,
        encrypt: false,
        trustServerCertificate: true,
      }
    },
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connected!');

    const [admins] = await sequelize.query("SELECT id, username, email FROM Admins");
    console.log('\n--- Existing Admins ---');
    console.log(admins);

    if (admins.length === 0) {
      console.log('🌱 No admins found! Creating default admin account...');
      const hashedPassword = await bcrypt.hash('admin@123', 10);
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      await sequelize.query(`
        INSERT INTO Admins (id, username, email, password, name, status, role, created_at, updated_at) 
        VALUES (:id, 'admin', 'admin@provexa.com', :password, 'Administrator', 'active', 'admin', GETDATE(), GETDATE())
      `, {
        replacements: { id, password: hashedPassword }
      });
      console.log('✅ Default admin account created successfully!');
      console.log('   Username: admin');
      console.log('   Email:    admin@provexa.com');
      console.log('   Password: admin@123');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

check();
