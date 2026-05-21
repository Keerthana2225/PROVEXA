const mongoose = require('mongoose');

const schemaOptions = {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
};

const employeeSchema = new mongoose.Schema({
    emp_code:      { type: String, required: true, unique: true },
    name:          { type: String, required: true },
    department:    { type: String, required: true },
    designation:   { type: String, required: true },
    doj:           { type: Date },
    gender:        { type: String, enum: ['Male', 'Female'], default: 'Male' },
    employee_type: { type: String, enum: ['Permanent', 'Intern'], default: 'Permanent' },
    status:        { type: String, default: 'active' },
    sizes: {
        shirt: { type: String, default: '' },
        pant:  { type: String, default: '' },
        shoe:  { type: String, default: '' },
    }
}, schemaOptions);

module.exports = mongoose.model('Employee', employeeSchema);
