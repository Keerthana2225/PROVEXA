const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Create Admin
    const password_hash = await bcrypt.hash('admin123', 10);
    const existingAdmin = await prisma.admin.findUnique({
        where: { email: 'admin@provexa.com' }
    });

    if (!existingAdmin) {
        await prisma.admin.create({
            data: {
                name: 'System Admin',
                email: 'admin@provexa.com',
                password_hash,
            },
        });
        console.log('Admin created.');
    } else {
        console.log('Admin already exists.');
    }

    // 2. Create Categories
    const categoriesData = [
        { name: 'Uniform' },
        { name: 'Shoes' },
        { name: 'Soap' },
        { name: 'Boost/Nutrition' },
        { name: 'Sweet Box' }
    ];

    for (const cat of categoriesData) {
        const existingCat = await prisma.itemCategory.findUnique({
            where: { name: cat.name }
        });
        if (!existingCat) {
            await prisma.itemCategory.create({ data: cat });
        }
    }
    console.log('Categories processed.');

    const categories = await prisma.itemCategory.findMany();
    const getCatId = (name) => categories.find(c => c.name === name).id;

    // 3. Create Items
    const itemsData = [
        { name: 'Standard Uniform Set', category_id: getCatId('Uniform'), frequency_days: 365, description: '2 sets of shirts and pants' },
        { name: 'Safety Shoes', category_id: getCatId('Shoes'), frequency_days: 180, description: 'Steel toe industrial shoes' },
        { name: 'Bathing Soap', category_id: getCatId('Soap'), frequency_days: 30, description: 'Monthly soap allocation' },
        { name: 'Boost Drink 500g', category_id: getCatId('Boost/Nutrition'), frequency_days: 90, description: 'Nutritional supplement' },
        { name: 'Festival Sweet Box', category_id: getCatId('Sweet Box'), frequency_days: 365, description: 'Diwali sweet box' }
    ];

    for (const item of itemsData) {
        const existing = await prisma.item.findFirst({ where: { name: item.name } });
        if (!existing) {
            await prisma.item.create({ data: item });
        }
    }
    console.log('Items processed.');

    // 4. Create 10 Sample Employees
    const depts = ['Production', 'Maintenance', 'Quality', 'Stores'];
    const desigs = ['Operator', 'Technician', 'Supervisor'];
    
    for (let i = 1; i <= 10; i++) {
        const emp_code = `EMP${1000 + i}`;
        const existingEmp = await prisma.employee.findUnique({
            where: { emp_code }
        });
        if (!existingEmp) {
            await prisma.employee.create({
                data: {
                    emp_code,
                    name: `Employee ${i}`,
                    department: depts[i % depts.length],
                    designation: desigs[i % desigs.length],
                }
            });
        }
    }

    console.log('Seed data successfully generated.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
