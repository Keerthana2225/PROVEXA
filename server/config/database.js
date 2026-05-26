const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

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

        // --- T-SQL Auto-Migrations for New Employee Columns ---
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'grade')
            BEGIN
                ALTER TABLE Employees ADD grade NVARCHAR(255) NULL;
            END
        `);
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'is_union_member')
            BEGIN
                ALTER TABLE Employees ADD is_union_member BIT NULL DEFAULT 0;
            END
        `);
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'is_alternative_attire')
            BEGIN
                ALTER TABLE Employees ADD is_alternative_attire BIT NULL DEFAULT 0;
            END
        `);

        // --- Auto-Migrate ReplacementRequests: add employee_name + item_name columns ---
        await sequelize.query(`ALTER TABLE ReplacementRequests ADD employee_name NVARCHAR(255) NULL`).catch(() => null);
        await sequelize.query(`ALTER TABLE ReplacementRequests ADD item_name NVARCHAR(255) NULL`).catch(() => null);
        // Backfill: update employee_name from Employees table where FK links
        await sequelize.query(`
            UPDATE rr SET rr.employee_name = e.name
            FROM ReplacementRequests rr
            INNER JOIN Employees e ON rr.employee = CAST(e.id AS NVARCHAR(255))
            WHERE rr.employee_name IS NULL OR rr.employee_name = ''
        `).catch(() => null);
        // Backfill: update item_name from Items table where FK links
        await sequelize.query(`
            UPDATE rr SET rr.item_name = i.name
            FROM ReplacementRequests rr
            INNER JOIN Items i ON rr.item = CAST(i.id AS NVARCHAR(255))
            WHERE rr.item_name IS NULL OR rr.item_name = ''
        `).catch(() => null);

        console.log(`✅ SQL Schema Columns Verified & Altered Successfully`);

        // --- SQL Master Cleanup Migrations (Welfare Category, Towel Merger, Mock Deletion) ---
        // --- Dynamic Seeding & Migration Helpers ---
        const { v4: uuidv4 } = require('uuid');

        async function getOrCreateCategory(name) {
            const rows = await sequelize.query(`SELECT id FROM ItemCategories WHERE name = :name`, {
                replacements: { name },
                type: sequelize.QueryTypes.SELECT
            });
            if (rows && rows.length > 0) {
                return rows[0].id;
            }
            const id = uuidv4();
            await sequelize.query(`INSERT INTO ItemCategories (id, name, requires_cost_tracking, created_at, updated_at) VALUES (:id, :name, 0, GETDATE(), GETDATE())`, {
                replacements: { id, name }
            });
            console.log(`🌱 Created category: ${name}`);
            return id;
        }

        async function ensureItemExists(name, categoryName, frequencyDays = 365, cost = 0) {
            const rows = await sequelize.query(`SELECT id FROM Items WHERE name = :name`, {
                replacements: { name },
                type: sequelize.QueryTypes.SELECT
            });
            if (rows && rows.length > 0) return; // already exists, skip silently
            const catId = await getOrCreateCategory(categoryName);
            const id = uuidv4();
            await sequelize.query(`INSERT INTO Items (id, name, category, frequency_days, cost, status, created_at, updated_at) VALUES (:id, :name, :catId, :frequencyDays, :cost, 'active', GETDATE(), GETDATE())`, {
                replacements: { id, name, catId, frequencyDays, cost }
            });
            console.log(`🌱 Seeded missing item: ${name} (Category: ${categoryName})`);
        }

        // 1. Create/Retrieve the 4 clean categories
        const catUniformsId = await getOrCreateCategory('Uniforms');
        const catLinenId = await getOrCreateCategory('Linen');
        const catWelfareId = await getOrCreateCategory('Welfare');
        const catSafetyGearId = await getOrCreateCategory('Safety Gear');

        // 2. Merging redundant Cotton Towel/Towel into Turkey Towel
        // Ensure Turkey Towel exists under Linen
        await ensureItemExists('Turkey Towel', 'Linen', 365, 150);

        // Retrieve Turkey Towel's ID
        const turkeyRows = await sequelize.query(`SELECT id FROM Items WHERE name = 'Turkey Towel'`, {
            type: sequelize.QueryTypes.SELECT
        });
        if (turkeyRows && turkeyRows.length > 0) {
            const turkeyId = turkeyRows[0].id;
            
            // Find any old towel items named 'Cotton Towel' or 'Towel'
            const oldTowels = await sequelize.query(`SELECT id FROM Items WHERE name = 'Cotton Towel' OR name = 'Towel'`, {
                type: sequelize.QueryTypes.SELECT
            });
            
            for (const ot of oldTowels) {
                // Update historical issue records
                await sequelize.query(`UPDATE IssueRecords SET item = :turkeyId, item_name = 'Turkey Towel' WHERE item = :oldId OR item_name = 'Cotton Towel' OR item_name = 'Towel'`, {
                    replacements: { turkeyId, oldId: ot.id }
                });
                
                // Update historical replacement requests
                await sequelize.query(`UPDATE ReplacementRequests SET item = :turkeyId WHERE item = :oldId`, {
                    replacements: { turkeyId, oldId: ot.id }
                });
                
                // Delete the old towel
                await sequelize.query(`DELETE FROM Items WHERE id = :oldId`, { replacements: { oldId: ot.id } });
            }
        }

        // 3. Move, Rename & Align Frequencies of Standard Items
        // Only updates (and logs) if the item's category or name actually needs to change
        async function updateItemClean(oldName, newName, catId, frequencyDays = 365) {
            const items = await sequelize.query(
                `SELECT id, name, category, frequency_days FROM Items WHERE name = :oldName`,
                { replacements: { oldName }, type: sequelize.QueryTypes.SELECT }
            );
            if (!items || items.length === 0) return; // item doesn't exist, skip
            const item = items[0];
            const needsUpdate = item.name !== newName || item.category !== catId || item.frequency_days !== frequencyDays;
            if (!needsUpdate) return; // already correct, skip silently
            await sequelize.query(
                `UPDATE Items SET name = :newName, category = :catId, frequency_days = :frequencyDays, updated_at = GETDATE() WHERE id = :id`,
                { replacements: { id: item.id, newName, catId, frequencyDays } }
            );
            console.log(`🔧 Updated item: "${oldName}" → "${newName}" (category/frequency changed)`);
        }

        // Uniforms items
        await updateItemClean('Shirt', 'Shirt', catUniformsId, 365);
        await updateItemClean('Shirt Full Sleeve', 'Shirt Full Sleeve', catUniformsId, 365);
        await updateItemClean('Pant', 'Pant', catUniformsId, 365);
        await updateItemClean('T-Shirt', 'T-Shirt', catUniformsId, 365);
        await updateItemClean('Socks', 'Socks', catUniformsId, 365);
        await updateItemClean('Coat', 'Coat', catUniformsId, 365);
        await updateItemClean('Chudidhar Top', 'Chudidhar Top', catUniformsId, 365);
        await updateItemClean('Chudidhar Bottom', 'Chudidhar Bottom', catUniformsId, 365);
        await updateItemClean('Chudidhar Coat', 'Chudidhar Coat', catUniformsId, 365);
        await updateItemClean('Liberty Shoes', 'Liberty Shoes', catUniformsId, 365);
        await updateItemClean('Shoe (BATA)', 'Shoe (BATA)', catUniformsId, 365);

        // Linen items
        await updateItemClean('Turkey Towel', 'Turkey Towel', catLinenId, 365);
        await updateItemClean('3-Piece Towel Set', '3-Piece Towel Set', catLinenId, 365);
        await updateItemClean('Cotton Bedsheet', 'Bedsheet', catLinenId, 365);
        await updateItemClean('Bedsheet', 'Bedsheet', catLinenId, 365);

        // Welfare items
        await updateItemClean('Bathing Soap', 'Soap', catWelfareId, 90);
        await updateItemClean('Soap', 'Soap', catWelfareId, 90);
        await updateItemClean('Festival Sweet Box', 'Sweet Box', catWelfareId, 365);
        await updateItemClean('Sweet Box', 'Sweet Box', catWelfareId, 365);
        await updateItemClean('Boost', 'Boost', catWelfareId, 90);
        await updateItemClean('Monthly Calendar', 'Yearly Calendar', catWelfareId, 365);
        await updateItemClean('Yearly Calendar', 'Yearly Calendar', catWelfareId, 365);

        // Safety Gear items
        await updateItemClean('Safety Shoes', 'Safety Shoes', catSafetyGearId, 365);
        await updateItemClean('Safety Helmet', 'Safety Helmet', catSafetyGearId, 730);
        await updateItemClean('Safety Spectacles', 'Safety Spectacles', catSafetyGearId, 1095);
        await updateItemClean('raincoat', 'Raincoat', catSafetyGearId, 1095);
        await updateItemClean('Raincoat', 'Raincoat', catSafetyGearId, 1095);

        // 4. Delete obsolete unwanted items (silent — no-op if already gone)
        await sequelize.query(`DELETE FROM Items WHERE name IN ('Daily Snacks', 'HP Laptop', 'Intern T-Shirt')`);

        // 5. Delete obsolete categories once empty (silent — no-op if already gone)
        const obsoleteCategoryNames = ['Consumables', 'IT Assets', 'Office Supplies', 'Uniform & Apparel', 'Welfare & Linen', 'PPE / Safety'];
        for (const name of obsoleteCategoryNames) {
            await sequelize.query(`DELETE FROM ItemCategories WHERE name = :name`, { replacements: { name } }).catch(() => null);
        }

        // Seed necessary policy items
        await ensureItemExists('Socks', 'Uniforms', 365, 50);
        await ensureItemExists('Safety Spectacles', 'Safety Gear', 1095, 200);
        await ensureItemExists('Turkey Towel', 'Linen', 365, 150);
        await ensureItemExists('3-Piece Towel Set', 'Linen', 365, 350);

        // Update item descriptions in DB to match exact policy descriptions
        async function updateItemDescription(itemName, description) {
            await sequelize.query(`UPDATE Items SET description = :description, updated_at = GETDATE() WHERE name = :itemName`, {
                replacements: { itemName, description }
            });
        }

        await updateItemDescription('Soap', 'Quarterly soap distribution for Operators (Annual Quota: 15 Soaps)');
        await updateItemDescription('Sweet Box', 'Event based distribution (New Year, Ayudha Pooja, Founders Day, Union Bonus)');
        await updateItemDescription('Boost', 'Issued to employees after blood donation (1 KG Boost)');
        await updateItemDescription('Turkey Towel', 'Q1 Distribution - Issued First Week of April');
        await updateItemDescription('3-Piece Towel Set', 'Q2 & Q4 Distribution - Issued First Week of July & January');
        await updateItemDescription('Bedsheet', 'Q3 Distribution - Issued First Week of October / Annual for General Staff');
        await updateItemDescription('Yearly Calendar', 'Yearly calendar distributed to all active employees');
        await updateItemDescription('Raincoat', 'Issued to eligible Operators every 3 years');
        await updateItemDescription('Safety Spectacles', 'Eligible for Union Operators only (Renewal every 3 years)');
        await updateItemDescription('Safety Helmet', 'Eligible for Operators, Supervisors and Grade ≤13 employees (Renewal every 2 years)');

    } catch (error) {
        console.error('❌ Unable to connect to the SQL database:', error);
        process.exit(1);
    }
}

module.exports = { sequelize, connectSQL };
