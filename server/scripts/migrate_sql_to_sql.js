const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

// 1. Destination is the primary Sequelize instance defined in the project configuration,
// which currently points to SQLEXPRESS01 because of our .env settings.
const { sequelize: destSequelize } = require('../config/database');

// 2. Source is a separate Sequelize instance pointing back to SQLEXPRESS (default port 1433)
const sourceSequelize = new Sequelize(
    process.env.SQL_DATABASE || 'ProvexaDB',
    process.env.SQL_USER || 'provexa_user',
    process.env.SQL_PASSWORD || 'Provexa@123',
    {
        host: '127.0.0.1', // Connect to local
        dialect: 'mssql',
        dialectOptions: {
            options: {
                port: 1433, // Connect directly to SQLEXPRESS on port 1433
                encrypt: false,
                trustServerCertificate: true,
            }
        },
        logging: false,
    }
);

// Import models (which are already bound to destSequelize)
const sqlModels = require('../models');

async function migrate() {
    try {
        console.log('🔗 Connecting to source database (SQLEXPRESS on port 1433)...');
        await sourceSequelize.authenticate();
        console.log('✅ Connected to Source database');

        console.log('🔗 Connecting to destination database (SQLEXPRESS01)...');
        await destSequelize.authenticate();
        console.log('✅ Connected to Destination database');

        // Sync destination models (creates tables using the models registered on destSequelize)
        console.log('🔄 Synchronizing Destination tables (clearing any existing data first)...');
        await destSequelize.sync({ force: true });
        console.log('✅ Destination tables initialized successfully');

        // List of models to copy
        const tablesToCopy = [
            { model: sqlModels.Admin, name: 'Admins' },
            { model: sqlModels.Employee, name: 'Employees' },
            { model: sqlModels.ItemCategory, name: 'ItemCategories' },
            { model: sqlModels.Item, name: 'Items' },
            { model: sqlModels.AllocationConfig, name: 'AllocationConfigs' },
            { model: sqlModels.OfficialPriceList, name: 'OfficialPriceLists' },
            { model: sqlModels.IssueRecord, name: 'IssueRecords' },
            { model: sqlModels.ReplacementRequest, name: 'ReplacementRequests' },
            { model: sqlModels.VerificationLog, name: 'VerificationLogs' }
        ];

        console.log('\n🚀 Starting Table Data Migration...');
        for (const table of tablesToCopy) {
            console.log(`📦 Copying table: ${table.name}...`);
            
            // 1. Fetch from source using raw query
            const [rows] = await sourceSequelize.query(`SELECT * FROM [${table.name}]`);
            
            if (rows.length === 0) {
                console.log(`   -> No records found in source table [${table.name}]. Skipping.`);
                continue;
            }

            console.log(`   -> Found ${rows.length} records in [${table.name}]. Inserting to Destination...`);
            
            // Map raw database columns to fields if they differ, but Sequelize bulkCreate handles this,
            // especially since we are passing database column values.
            // Let's make sure we bulkCreate using the raw rows. We pass ignoreDuplicates: false.
            await table.model.bulkCreate(rows, { 
                validate: false, 
                hooks: false 
            });
            
            console.log(`   -> Successfully migrated ${rows.length} records into [${table.name}]`);
        }

        console.log('\n✨ SQL Server-to-SQL Server Migration Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
