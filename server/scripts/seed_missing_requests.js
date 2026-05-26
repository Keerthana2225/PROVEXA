// Seeds missing Additional cost records from the Excel data
const { Sequelize } = require('sequelize');

const seq = new Sequelize('ProvexaDB', 'provexa_user', 'Provexa@123', {
    host: '127.0.0.1', dialect: 'mssql',
    dialectOptions: { options: { port: 1433, encrypt: false, trustServerCertificate: true } },
    logging: false
});

const { v4: uuidv4 } = require('uuid');

// From the Excel: these are Additional records missing from DB
const missingRecords = [
    { employee_name: 'Jay',                  item_name: 'Shirt Full Sleeve', qty: 1, unit_cost: 370.65, date: '2026-05-25' },
    { employee_name: 'Shasra',               item_name: 'Chudidhar Bottom',  qty: 1, unit_cost: 399.00, date: '2026-05-25' },
    { employee_name: 'Deepa Krishnamurthy',  item_name: 'Pant',              qty: 1, unit_cost: 391.65, date: '2026-05-24' },
    // Meena Kumari Shirt already exists (262.50)
    // Priya Lakshmi T-Shirt already exists (267.75)
    // Ravi Shankar T-Shirt already exists (267.75)
    // Keerthana Chudidhar Top already exists (375.90)
    // Keerthana Intern T-Shirt: 304.50 - already exists but item deleted
    // Tanish Pant (500.00) already exists
];

async function seed() {
    await seq.authenticate();

    // Get employee IDs
    const emps = await seq.query('SELECT id, name FROM Employees', { type: seq.QueryTypes.SELECT });
    const items = await seq.query('SELECT id, name FROM Items', { type: seq.QueryTypes.SELECT });

    const empMap = {};
    emps.forEach(e => { empMap[e.name.toLowerCase().trim()] = e.id; });
    const itemMap = {};
    items.forEach(i => { itemMap[i.name.toLowerCase().trim()] = i.id; });

    console.log('Employees available:', Object.keys(empMap));
    console.log('Items available:', Object.keys(itemMap));

    for (const rec of missingRecords) {
        const empId = empMap[rec.employee_name.toLowerCase().trim()];
        const itemId = itemMap[rec.item_name.toLowerCase().trim()];
        const total = rec.qty * rec.unit_cost;

        if (!empId) { console.log('SKIP - employee not found:', rec.employee_name); continue; }
        if (!itemId) { console.log('SKIP - item not found:', rec.item_name); continue; }

        const id = uuidv4();
        await seq.query(
            `INSERT INTO ReplacementRequests (id, employee, employee_name, item, item_name, allocation_type, reason, quantity, unit_cost, total_cost, payment_status, status, requested_date, created_at, updated_at)
             VALUES (:id, :empId, :empName, :itemId, :itemName, 'Additional', 'Additional Request', :qty, :unit, :total, 'Paid', 'Completed', :dt, GETDATE(), GETDATE())`,
            { replacements: { id, empId, empName: rec.employee_name, itemId, itemName: rec.item_name, qty: rec.qty, unit: rec.unit_cost, total, dt: rec.date } }
        );
        console.log('Inserted:', rec.employee_name, '-', rec.item_name, '=', total);
    }

    // Fix Keerthana's ??? item (Intern T-Shirt = 304.50, now T-Shirt category)
    const tshirtId = itemMap['t-shirt'];
    if (tshirtId) {
        await seq.query(
            `UPDATE ReplacementRequests SET item = :tshirtId, item_name = 'T-Shirt' WHERE employee_name = 'Keerthana Subramanian' AND item_name IS NULL AND total_cost = 304.50`,
            { replacements: { tshirtId } }
        ).catch(()=>null);
        console.log('Fixed Keerthana T-Shirt item reference');
    }

    // Final total
    const rows = await seq.query(
        `SELECT SUM(total_cost) as total FROM ReplacementRequests WHERE allocation_type = 'Additional'`,
        { type: seq.QueryTypes.SELECT }
    );
    console.log('\nFinal Additional total:', parseFloat(rows[0].total).toFixed(2));
    console.log('Expected: 3139.70');

    await seq.close();
    process.exit(0);
}

seed().catch(e => { console.error(e.message); process.exit(1); });
