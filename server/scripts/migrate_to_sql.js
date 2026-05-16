const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { sequelize } = require('../config/database');
const sqlModels = require('../models');

// Mongo Models (using the moved ones)
const AdminMongo = require('../models/mongo/Admin');
const EmployeeMongo = require('../models/mongo/Employee');
const ItemCategoryMongo = require('../models/mongo/ItemCategory');
const ItemMongo = require('../models/mongo/Item');
const IssueRecordMongo = require('../models/mongo/IssueRecord');
const ReplacementRequestMongo = require('../models/mongo/ReplacementRequest');
const VerificationLogMongo = require('../models/mongo/VerificationLog');

dotenv.config();

const idMap = new Map();

function getSqlId(mongoId) {
    if (!mongoId) return null;
    const mId = mongoId.toString();
    if (!idMap.has(mId)) {
        idMap.set(mId, uuidv4());
    }
    return idMap.get(mId);
}

async function migrate() {
    try {
        console.log('🚀 Starting Data Migration to SQL Server...');

        // 1. Connect to Mongo
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to MongoDB');

        // 2. Sync SQL (Controlled)
        // Using alter: true to create tables without dropping data
        await sequelize.sync({ alter: true });
        console.log('✅ SQL Tables Synchronized');

        // --- Stage 1: Admins ---
        console.log('📦 Migrating Admins...');
        const admins = await AdminMongo.find();
        for (const a of admins) {
            await sqlModels.Admin.create({
                id: getSqlId(a._id),
                username: a.email,
                password: a.password_hash,
                name: a.name,
                role: a.role || 'Admin',
                createdAt: a.createdAt || a.created_at || new Date(),
                updatedAt: a.updatedAt
            });
        }

        // --- Stage 2: Employees ---
        console.log('📦 Migrating Employees...');
        const employees = await EmployeeMongo.find();
        for (const e of employees) {
            await sqlModels.Employee.create({
                id: getSqlId(e._id),
                emp_code: e.emp_code,
                name: e.name,
                department: e.department,
                designation: e.designation,
                salary: e.salary,
                status: e.status,
                createdAt: e.createdAt,
                updatedAt: e.updatedAt
            });
        }

        // --- Stage 3: Item Categories ---
        console.log('📦 Migrating Item Categories...');
        const categories = await ItemCategoryMongo.find();
        for (const c of categories) {
            await sqlModels.ItemCategory.create({
                id: getSqlId(c._id),
                name: c.name,
                requires_cost_tracking: c.requires_cost_tracking,
                createdAt: c.createdAt || new Date(),
                updatedAt: c.updatedAt || new Date()
            });
        }

        // --- Stage 4: Items ---
        console.log('📦 Migrating Items...');
        const items = await ItemMongo.find();
        for (const i of items) {
            await sqlModels.Item.create({
                id: getSqlId(i._id),
                name: i.name,
                description: i.description,
                cost: i.cost,
                frequency_days: i.frequency_days,
                fixed_date: i.fixed_date,
                status: i.status,
                category_id: getSqlId(i.category),
                createdAt: i.createdAt,
                updatedAt: i.updatedAt
            });
        }

        // --- Stage 5: Issue Records ---
        console.log('📦 Migrating Issue Records...');
        const issues = await IssueRecordMongo.find();
        for (const is of issues) {
            await sqlModels.IssueRecord.create({
                id: getSqlId(is._id),
                employee_id: getSqlId(is.employee),
                employee_name: is.employee_name,
                item_id: getSqlId(is.item),
                item_name: is.item_name,
                quantity: is.quantity,
                size: is.size,
                issued_date: is.issued_date,
                next_due_date: is.next_due_date,
                lifecycle_status: is.lifecycle_status,
                issue_status: is.issue_status,
                acknowledged: is.acknowledged,
                return_date: is.return_date,
                return_remarks: is.return_remarks,
                returned_condition: is.returned_condition,
                item_condition: is.item_condition,
                timeline: is.timeline,
                createdAt: is.createdAt,
                updatedAt: is.updatedAt
            });
        }

        // --- Stage 6: Replacement Requests ---
        console.log('📦 Migrating Replacement Requests...');
        const replacements = await ReplacementRequestMongo.find();
        for (const r of replacements) {
            await sqlModels.ReplacementRequest.create({
                id: getSqlId(r._id),
                employee_id: getSqlId(r.employee),
                item_id: getSqlId(r.item),
                reason: r.reason,
                is_uniform_replacement: r.is_uniform_replacement,
                quantity: r.quantity,
                size: r.size,
                unit_cost: r.unit_cost,
                total_cost: r.total_cost,
                deduction_amount: r.deduction_amount,
                payment_status: r.payment_status,
                status: r.status,
                requested_date: r.requested_date,
                replacement_date: r.replacement_date,
                resolved_date: r.resolved_date,
                signature_path: r.signature_path,
                acknowledged: r.acknowledged,
                verification_method: r.verification_method,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            });
        }

        // --- Stage 7: Verification Logs ---
        console.log('📦 Migrating Verification Logs...');
        const logs = await VerificationLogMongo.find();
        for (const l of logs) {
            const detailsObj = {
                ocr_confidence: l.ocr_confidence,
                raw_ocr_text: l.raw_ocr_text,
                signature_path: l.signature_path,
                device_info: l.device_info,
                emp_code: l.emp_code,
                employee_name: l.employee_name
            };

            const targetEntityId = getSqlId(l.reference_id) || getSqlId(l.employee);
            if (!targetEntityId) continue; // Skip logs without a valid entity reference

            await sqlModels.VerificationLog.create({
                id: getSqlId(l._id),
                type: l.method || 'Manual',
                status: l.status,
                entity_id: targetEntityId,
                entity_type: (l.reference_type === 'standalone' || l.reference_type === 'attendance') ? 'Employee' : 'Replacement',
                details: JSON.stringify(detailsObj),
                verified_by: null,
                timestamp: l.timestamp || new Date(),
                createdAt: l.createdAt || l.timestamp || new Date(),
                updatedAt: l.updatedAt || l.timestamp || new Date()
            });
        }

        console.log('✨ Migration Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
