const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const ItemCategory = require('./models/ItemCategory');
const Item = require('./models/Item');

dotenv.config();

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected.');

        const IssueRecord = require('./models/IssueRecord');
        const ReplacementRequest = require('./models/ReplacementRequest');

        // Clear existing data (optional, but good for a fresh start)
        await Promise.all([
            Admin.deleteMany({}),
            Employee.deleteMany({}),
            ItemCategory.deleteMany({}),
            Item.deleteMany({}),
            IssueRecord.deleteMany({}),
            ReplacementRequest.deleteMany({}),
        ]);
        console.log('Cleared existing data.');

        // 1. Create Admin
        const password_hash = await bcrypt.hash('admin123', 10);
        await Admin.create({
            name: 'System Admin',
            email: 'admin@provexa.com',
            password_hash,
        });
        console.log('Admin created.');

        // 2. Create Categories
        const categoriesData = [
            { name: 'Uniform' },
            { name: 'Shoes' },
            { name: 'Soap' },
            { name: 'Boost/Nutrition' },
            { name: 'Sweet Box' }
        ];
        const categories = await ItemCategory.insertMany(categoriesData);
        console.log('Categories created.');

        const getCatId = (name) => categories.find(c => c.name === name)._id;

        // 3. Create Items
        const itemsData = [
            { name: 'Standard Uniform Set', category: getCatId('Uniform'), frequency_days: 365, description: '2 sets of shirts and pants' },
            { name: 'Safety Shoes', category: getCatId('Shoes'), frequency_days: 180, description: 'Steel toe industrial shoes' },
            { name: 'Bathing Soap', category: getCatId('Soap'), frequency_days: 30, description: 'Monthly soap allocation' },
            { name: 'Boost Drink 500g', category: getCatId('Boost/Nutrition'), frequency_days: 90, description: 'Nutritional supplement' },
            { name: 'Festival Sweet Box', category: getCatId('Sweet Box'), frequency_days: 365, description: 'Diwali sweet box' }
        ];
        await Item.insertMany(itemsData);
        console.log('Items created.');

        // 4. Create 10 Sample Employees
        const depts = ['Production', 'Maintenance', 'Quality', 'Stores'];
        const desigs = ['Operator', 'Technician', 'Supervisor'];
        const employeesData = [];
        
        for (let i = 1; i <= 10; i++) {
            employeesData.push({
                emp_code: `${11000 + i}`,
                name: `Employee ${i}`,
                department: depts[i % depts.length],
                designation: desigs[i % desigs.length],
            });
        }
        await Employee.insertMany(employeesData);
        console.log('Employees created.');

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();
