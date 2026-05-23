const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

// Create ProvexaDB_New database if it doesn't exist? Tedious doesn't automatically create the db,
// but the prompt says: "Verify tables are created inside: ProvexaDB_New before migration begins."
// We assume ProvexaDB_New exists or we must create it. The simplest is to assume it exists or we can
// create it in SQL Server Management Studio. Let's just connect.

const sequelize = new Sequelize(
    process.env.SQL_DATABASE || 'ProvexaDB_New',
    process.env.SQL_USER || 'provexa_user',
    process.env.SQL_PASSWORD || 'Provexa@123',
    {
        host: process.env.SQL_SERVER || '127.0.0.1',
        dialect: process.env.SQL_DIALECT || 'mssql',
        dialectOptions: {
            options: {
                // If SQL_INSTANCE is specified, use instanceName; otherwise, fall back to port.
                ...(process.env.SQL_INSTANCE
                    ? { instanceName: process.env.SQL_INSTANCE }
                    : { port: parseInt(process.env.SQL_PORT) || 1433 }),
                encrypt: false,
                trustServerCertificate: true,
            }
        },
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 20,
            min: 0,
            acquire: 60000,
            idle: 10000
        }
    }
);

async function connectSQL() {
    try {
        await sequelize.authenticate();
        const server = process.env.SQL_SERVER || 'localhost';
        const db     = process.env.SQL_DATABASE || 'ProvexaDB';
        console.log(`✅ SQL Server Connected: ${server} / ${db}`);
    } catch (error) {
        console.error('❌ Unable to connect to the SQL database:', error);
        process.exit(1);
    }
}

module.exports = { sequelize, connectSQL };
