const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.SQL_DATABASE,
    process.env.SQL_USER,
    process.env.SQL_PASSWORD,
    {
        host: process.env.SQL_SERVER,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 1433,
        dialect: 'mssql',

        dialectOptions: {
            options: {
                instanceName: process.env.SQL_INSTANCE,
                trustServerCertificate: true,
                encrypt: true
            }
        },

        logging: process.env.NODE_ENV === 'development'
            ? console.log
            : false,

        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectSQL = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ SQL Server Connected successfully');
    } catch (error) {
        console.error('❌ Unable to connect to SQL Server:', error.message);
        throw error;
    }
};

module.exports = { sequelize, connectSQL };