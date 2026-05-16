const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const IssueRecord = require('./models/IssueRecord');
const Employee = require('./models/Employee');
const Item = require('./models/Item');

async function cleanupDuplicates() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to MongoDB');

        // Find all active (non-archived) issue records
        const activeRecords = await IssueRecord.find({ archived: { $ne: true } })
            .populate('employee item')
            .sort({ issued_date: -1 }); // newest first

        console.log(`Total active records: ${activeRecords.length}`);

        // Group by employee + item combination
        const groups = {};
        for (const record of activeRecords) {
            const empId = record.employee?._id?.toString() || record.employee?.toString();
            const itemId = record.item?._id?.toString() || record.item?.toString();
            if (!empId || !itemId) continue;
            const key = `${empId}_${itemId}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(record);
        }

        let totalArchived = 0;

        for (const [key, records] of Object.entries(groups)) {
            if (records.length <= 1) continue;

            // Keep the newest record (index 0, sorted by issued_date desc)
            const toKeep = records[0];
            const toDuplicate = records.slice(1);

            const empName = toKeep.employee?.name || toKeep.employee_name || 'Unknown';
            const itemName = toKeep.item?.name || toKeep.item_name || 'Unknown';

            console.log(`\nDuplicate found: ${empName} → ${itemName} (${records.length} records)`);
            console.log(`  Keeping: ${toKeep._id} (issued: ${toKeep.issued_date?.toISOString().split('T')[0]})`);

            for (const dup of toDuplicate) {
                console.log(`  Archiving: ${dup._id} (issued: ${dup.issued_date?.toISOString().split('T')[0]})`);
                await IssueRecord.findByIdAndUpdate(dup._id, {
                    $set: {
                        archived: true,
                        archived_at: new Date(),
                        archive_reason: 'Duplicate cleanup - superseded by newer record'
                    }
                });
                totalArchived++;
            }
        }

        console.log(`\n✅ Cleanup complete! Archived ${totalArchived} duplicate record(s).`);
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

cleanupDuplicates();
