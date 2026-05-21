/**
 * seed_employees.js
 * Run: node seed_employees.js
 * Seeds realistic Indian employee names — 5-digit codes, Men + Women + Interns only
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Employee = require('./models/Employee');

const EMPLOYEES = [
    // ── MALE PERMANENT ─────────────────────────────────────────
    { emp_code: '10001', name: 'Rajesh Kumar',         department: 'Production',     designation: 'Machine Operator',     gender: 'Male',   employee_type: 'Permanent', doj: '2019-03-15' },
    { emp_code: '10002', name: 'Suresh Babu',          department: 'Maintenance',    designation: 'Technician',           gender: 'Male',   employee_type: 'Permanent', doj: '2018-07-01' },
    { emp_code: '10003', name: 'Arun Selvam',          department: 'Quality',        designation: 'QC Inspector',         gender: 'Male',   employee_type: 'Permanent', doj: '2020-01-10' },
    { emp_code: '10004', name: 'Murugan Pillai',       department: 'Warehouse',      designation: 'Store Keeper',         gender: 'Male',   employee_type: 'Permanent', doj: '2017-09-20' },
    { emp_code: '10005', name: 'Karthik Rajan',        department: 'HR',             designation: 'HR Executive',         gender: 'Male',   employee_type: 'Permanent', doj: '2021-04-05' },
    { emp_code: '10006', name: 'Dinesh Mohan',         department: 'Finance',        designation: 'Accountant',           gender: 'Male',   employee_type: 'Permanent', doj: '2016-11-12' },
    { emp_code: '10007', name: 'Santhosh Prabhu',      department: 'Logistics',      designation: 'Driver',               gender: 'Male',   employee_type: 'Permanent', doj: '2018-05-22' },
    { emp_code: '10008', name: 'Prakash Narayanan',    department: 'Production',     designation: 'Senior Operator',      gender: 'Male',   employee_type: 'Permanent', doj: '2015-08-30' },
    { emp_code: '10009', name: 'Ravi Shankar',         department: 'Security',       designation: 'Security Guard',       gender: 'Male',   employee_type: 'Permanent', doj: '2019-12-01' },
    { emp_code: '10010', name: 'Balaji Sundaram',      department: 'IT',             designation: 'System Administrator', gender: 'Male',   employee_type: 'Permanent', doj: '2022-02-14' },
    { emp_code: '10011', name: 'Vishnu Varadan',       department: 'Production',     designation: 'Machine Operator',     gender: 'Male',   employee_type: 'Permanent', doj: '2024-11-01' },
    { emp_code: '10012', name: 'Gopal Krishnan',       department: 'Maintenance',    designation: 'Helper',               gender: 'Male',   employee_type: 'Permanent', doj: '2025-01-15' },

    // ── FEMALE PERMANENT ────────────────────────────────────────
    { emp_code: '10013', name: 'Priya Lakshmi',        department: 'HR',             designation: 'HR Manager',           gender: 'Female', employee_type: 'Permanent', doj: '2018-06-20' },
    { emp_code: '10014', name: 'Kavitha Devi',         department: 'Finance',        designation: 'Senior Accountant',    gender: 'Female', employee_type: 'Permanent', doj: '2017-03-10' },
    { emp_code: '10015', name: 'Meena Kumari',         department: 'Quality',        designation: 'QC Supervisor',        gender: 'Female', employee_type: 'Permanent', doj: '2019-09-05' },
    { emp_code: '10016', name: 'Anitha Ramesh',        department: 'Production',     designation: 'Packing Operator',     gender: 'Female', employee_type: 'Permanent', doj: '2020-07-18' },
    { emp_code: '10017', name: 'Suganya Murugesan',    department: 'Administration', designation: 'Office Assistant',     gender: 'Female', employee_type: 'Permanent', doj: '2021-01-28' },
    { emp_code: '10018', name: 'Nithya Balakrishnan',  department: 'Accounts',       designation: 'Accounts Executive',   gender: 'Female', employee_type: 'Permanent', doj: '2016-10-14' },
    { emp_code: '10019', name: 'Saranya Prakash',      department: 'Production',     designation: 'Line Supervisor',      gender: 'Female', employee_type: 'Permanent', doj: '2015-04-02' },
    { emp_code: '10020', name: 'Deepa Krishnamurthy',  department: 'Procurement',    designation: 'Purchase Executive',   gender: 'Female', employee_type: 'Permanent', doj: '2018-08-25' },
    { emp_code: '10021', name: 'Selvi Muthu',          department: 'Production',     designation: 'Packing Operator',     gender: 'Female', employee_type: 'Permanent', doj: '2024-12-02' },
    { emp_code: '10022', name: 'Bhavani Sundari',      department: 'Quality',        designation: 'QC Assistant',         gender: 'Female', employee_type: 'Permanent', doj: '2025-02-10' },

    // ── INTERNS (5 — mixed gender) ──────────────────────────────
    { emp_code: '20001', name: 'Akash Venkatesh',      department: 'Production',     designation: 'Production Intern',    gender: 'Male',   employee_type: 'Intern',    doj: '2025-04-01' },
    { emp_code: '20002', name: 'Keerthana Subramanian',department: 'HR',             designation: 'HR Intern',            gender: 'Female', employee_type: 'Intern',    doj: '2025-04-01' },
    { emp_code: '20003', name: 'Harish Annamalai',     department: 'Maintenance',    designation: 'Maintenance Intern',   gender: 'Male',   employee_type: 'Intern',    doj: '2025-04-15' },
    { emp_code: '20004', name: 'Dharshini Raj',        department: 'Quality',        designation: 'Quality Intern',       gender: 'Female', employee_type: 'Intern',    doj: '2025-05-01' },
    { emp_code: '20005', name: 'Vignesh Karthikeyan',  department: 'IT',             designation: 'IT Intern',            gender: 'Male',   employee_type: 'Intern',    doj: '2025-05-01' },
];

async function seedEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ProvexaDB');
        console.log('✅ Connected to MongoDB');

        // Remove old numbered employees (EMP001 format or Employee 1 style)
        const deleted = await Employee.deleteMany({
            emp_code: { $regex: /^(EMP|INT)\d+$/i }
        });
        if (deleted.deletedCount > 0) {
            console.log(`🗑  Removed ${deleted.deletedCount} old-format employee records`);
        }

        for (const emp of EMPLOYEES) {
            await Employee.findOneAndUpdate(
                { emp_code: emp.emp_code },
                { ...emp, doj: emp.doj ? new Date(emp.doj) : undefined },
                { upsert: true, new: true }
            );
            console.log(`  ✓ ${emp.emp_code} — ${emp.name} [${emp.employee_type}/${emp.gender}]`);
        }

        console.log(`\n✅ Done: ${EMPLOYEES.length} employees seeded with 5-digit codes`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

seedEmployees();
