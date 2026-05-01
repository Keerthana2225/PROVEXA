const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    emp_code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', employeeSchema);
