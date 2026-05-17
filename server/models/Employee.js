const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const employeeSchema = new mongoose.Schema({
    emp_code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    salary: { type: Number, default: 0 },
    doj: { type: Date },
    status: { type: String, default: 'active' }
}, schemaOptions);

module.exports = mongoose.model('Employee', employeeSchema);
