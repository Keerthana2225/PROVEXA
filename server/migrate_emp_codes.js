const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Employee = require('./models/Employee');
const VerificationLog = require('./models/VerificationLog');

dotenv.config();

const migrate = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ProvexaDB');
        console.log('Connected.');

        const employees = await Employee.find({});
        console.log(`Found ${employees.length} employees. Migrating EMPxxx codes to 5-digit format...`);

        let migratedCount = 0;

        for (const emp of employees) {
            const oldCode = emp.emp_code;
            const match = oldCode.match(/^EMP(\d+)$/i);
            if (match) {
                const num = parseInt(match[1]);
                // Map EMP1000 + i to 11000 + i (e.g., EMP1001 -> 11001, EMP1013 -> 11013)
                if (num >= 1000 && num < 2000) {
                    const newCode = `${11000 + (num - 1000)}`;
                    console.log(`Migrating: "${emp.name}" | ${oldCode} ➔ ${newCode}`);
                    
                    // Update employee code
                    emp.emp_code = newCode;
                    await emp.save();
                    migratedCount++;

                    // Update VerificationLog details string if it mentions the old code
                    const logs = await VerificationLog.find({ details: { $regex: oldCode } });
                    for (const log of logs) {
                        try {
                            if (log.details.includes(oldCode)) {
                                log.details = log.details.replace(new RegExp(oldCode, 'g'), newCode);
                                await log.save();
                                console.log(`  Updated verification log: ${log._id}`);
                            }
                        } catch (e) {
                            console.error(`  Failed to update verification log ${log._id}:`, e);
                        }
                    }
                }
            }
        }

        console.log(`🎉 Migration finished! Successfully updated ${migratedCount} employee codes.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
};

migrate();
