const mongoose = require('mongoose');
const { sequelize } = require('../config/database');
const sqlModels = require('../models');
const dotenv = require('dotenv');

dotenv.config();

// Old Mongo Models
const AdminMongo = require('../models_mongo/Admin');
const EmployeeMongo = require('../models_mongo/Employee');
const ItemCategoryMongo = require('../models_mongo/ItemCategory');
const ItemMongo = require('../models_mongo/Item');
const IssueRecordMongo = require('../models_mongo/IssueRecord');
const ReplacementRequestMongo = require('../models_mongo/ReplacementRequest');
const VerificationLogMongo = require('../models_mongo/VerificationLog');
const AllocationConfigMongo = require('../models_mongo/AllocationConfig');
const OfficialPriceListMongo = require('../models_mongo/OfficialPriceList');

async function runMigration() {
    try {
        console.log('🚀 Starting Data Migration to SQL Server v2...');

        // 1. Connect MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ProvexaDB');
        console.log('✅ Connected to MongoDB');

        // 2. Connect SQL Server & Sync
        await sequelize.authenticate();
        await sequelize.sync({ force: true }); // DANGER: Force true during initial migration to clear old tests
        console.log('✅ SQL Tables Synchronized (Clean slate)');

        // Migrate Admins
        console.log('📦 Migrating Admins...');
        const admins = await AdminMongo.find().lean();
        for (const a of admins) {
            await sqlModels.Admin.create({
                _id: a._id.toString(),
                name: a.name,
                username: a.username,
                email: a.email,
                password: a.password,
                role: a.role || 'Admin',
                created_at: a.createdAt || new Date(),
                updated_at: a.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${admins.length} Admins`);

        // Migrate Employees
        console.log('📦 Migrating Employees...');
        const employees = await EmployeeMongo.find().lean();
        for (const e of employees) {
            await sqlModels.Employee.create({
                _id: e._id.toString(),
                emp_code: e.emp_code,
                name: e.name,
                department: e.department,
                designation: e.designation,
                doj: e.doj,
                gender: e.gender || 'Male',
                employee_type: e.employee_type || 'Permanent',
                status: e.status || 'active',
                sizes_shirt: e.sizes?.shirt || '',
                sizes_pant: e.sizes?.pant || '',
                sizes_shoe: e.sizes?.shoe || '',
                created_at: e.createdAt || new Date(),
                updated_at: e.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${employees.length} Employees`);

        // Migrate Categories
        console.log('📦 Migrating Item Categories...');
        const categories = await ItemCategoryMongo.find().lean();
        for (const c of categories) {
            await sqlModels.ItemCategory.create({
                _id: c._id.toString(),
                name: c.name,
                requires_cost_tracking: c.requires_cost_tracking || false,
                created_at: c.createdAt || new Date(),
                updated_at: c.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${categories.length} Categories`);

        // Migrate Items
        console.log('📦 Migrating Items...');
        const items = await ItemMongo.find().lean();
        for (const i of items) {
            await sqlModels.Item.create({
                _id: i._id.toString(),
                name: i.name,
                description: i.description,
                cost: i.cost || 0,
                frequency_days: i.frequency_days || 365,
                fixed_date: i.fixed_date,
                status: i.status || 'active',
                category: i.category?.toString(),
                created_at: i.createdAt || new Date(),
                updated_at: i.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${items.length} Items`);

        // Migrate Allocation Configs
        console.log('📦 Migrating Allocation Configs...');
        const configs = await AllocationConfigMongo.find().lean();
        for (const c of configs) {
            await sqlModels.AllocationConfig.create({
                _id: c._id.toString(),
                item_type: c.item_type,
                standard_quantity: c.standard_quantity || 0,
                permanent_quantity: c.permanent_quantity || 0,
                newcomer_quantity: c.newcomer_quantity || 0,
                intern_quantity: c.intern_quantity || 0,
                created_at: c.createdAt || new Date(),
                updated_at: c.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${configs.length} Configs`);

        // Migrate Official Prices
        console.log('📦 Migrating Official Prices...');
        const prices = await OfficialPriceListMongo.find().lean();
        for (const p of prices) {
            await sqlModels.OfficialPriceList.create({
                _id: p._id.toString(),
                item_name: p.item_name,
                gender: p.gender || 'UNISEX',
                price: p.price || 0,
                effective_date: p.effective_date,
                created_at: p.createdAt || new Date(),
                updated_at: p.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${prices.length} Prices`);

        // Migrate Issue Records
        console.log('📦 Migrating Issue Records...');
        const issues = await IssueRecordMongo.find().lean();
        for (const is of issues) {
            await sqlModels.IssueRecord.create({
                _id: is._id.toString(),
                transaction_id: is.transaction_id,
                employee: is.employee?.toString(),
                employee_name: is.employee_name,
                item: is.item?.toString(),
                item_name: is.item_name,
                issued_date: is.issued_date,
                next_due_date: is.next_due_date,
                quantity: is.quantity || 1,
                issued_by: is.issued_by?.toString() || admins[0]?._id?.toString(),
                issue_status: is.issue_status || 'Pending Acknowledgement',
                lifecycle_status: is.lifecycle_status || 'Active',
                signature_path: is.signature_path,
                acknowledged: is.acknowledged || false,
                acknowledgement_time: is.acknowledgement_time,
                verification_method: is.verification_method,
                ocr_details: is.ocr_details ? JSON.stringify(is.ocr_details) : null,
                notes: is.notes,
                item_condition: is.item_condition || 'Good',
                returned_condition: is.returned_condition,
                return_date: is.return_date,
                archived: is.archived || false,
                archived_at: is.archived_at,
                archived_by: is.archived_by?.toString(),
                archive_reason: is.archive_reason,
                is_renewal: is.is_renewal || false,
                created_at: is.createdAt || new Date(),
                updated_at: is.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${issues.length} Issue Records`);

        // Migrate Replacement Requests
        console.log('📦 Migrating Replacement Requests...');
        const replacements = await ReplacementRequestMongo.find().lean();
        for (const r of replacements) {
            await sqlModels.ReplacementRequest.create({
                _id: r._id.toString(),
                transaction_id: r.transaction_id,
                employee: r.employee?.toString(),
                item: r.item?.toString(),
                previous_issue: r.previous_issue?.toString(),
                allocation_type: r.allocation_type || 'Replacement',
                reason: r.reason,
                notes: r.notes,
                is_uniform_replacement: r.is_uniform_replacement || false,
                quantity: r.quantity || 1,
                size: r.size,
                unit_cost: r.unit_cost || 0,
                total_cost: r.total_cost || 0,
                deduction_amount: r.deduction_amount || 0,
                payment_status: r.payment_status || 'Pending',
                status: r.status || 'Pending',
                requested_date: r.requested_date,
                replacement_date: r.replacement_date,
                resolved_date: r.resolved_date,
                signature_path: r.signature_path,
                acknowledged: r.acknowledged || false,
                verification_method: r.verification_method,
                ocr_details: r.ocr_details ? JSON.stringify(r.ocr_details) : null,
                created_at: r.createdAt || new Date(),
                updated_at: r.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${replacements.length} Replacements`);

        // Migrate Verification Logs
        console.log('📦 Migrating Verification Logs...');
        const logs = await VerificationLogMongo.find().lean();
        for (const l of logs) {
            await sqlModels.VerificationLog.create({
                _id: l._id.toString(),
                employee: l.employee?.toString(),
                employee_name: l.employee_name,
                emp_code: l.emp_code,
                reference_id: l.reference_id?.toString(),
                reference_type: l.reference_type || 'standalone',
                method: l.method || 'Manual',
                status: l.status || 'Pending',
                ocr_confidence: l.ocr_confidence,
                raw_ocr_text: l.raw_ocr_text,
                signature_path: l.signature_path,
                device_info: l.device_info,
                timestamp: l.timestamp || new Date(),
                created_at: l.createdAt || new Date(),
                updated_at: l.updatedAt || new Date()
            });
        }
        console.log(`   -> Migrated ${logs.length} Verification Logs`);

        console.log('✨ Data Migration Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

runMigration();
