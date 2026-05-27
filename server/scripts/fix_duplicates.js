/**
 * Script to find and delete duplicate ReplacementRequest records.
 * Keeps the OLDEST record per employee+item+requested_date+cost group.
 */
require('dotenv').config();
const { ReplacementRequest } = require('../models');

async function fixDuplicates() {
    const allInstances = await ReplacementRequest.findAll({
        order: [['requested_date', 'ASC']]
    });

    // Group by employee+item+date+cost (day precision)
    const groups = {};
    allInstances.forEach(instance => {
        const j = instance.toJSON();
        const dateKey = j.requested_date ? new Date(j.requested_date).toISOString().split('T')[0] : 'nodate';
        const key = `${j.employee}::${j.item}::${dateKey}::${j.total_cost}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(instance); // store the actual Sequelize instance
    });

    let deletedCount = 0;
    for (const [key, instances] of Object.entries(groups)) {
        if (instances.length > 1) {
            console.log(`\nDuplicate group: ${instances.length} records`);
            const j0 = instances[0].toJSON();
            console.log(`  Keeping:  item=${j0.item_name}, employee=${j0.employee_name}, date=${j0.requested_date}`);

            // Delete all but the first (oldest)
            for (let i = 1; i < instances.length; i++) {
                const j = instances[i].toJSON();
                console.log(`  Deleting: transaction_id=${j.transaction_id}, employee=${j.employee_name}, date=${j.requested_date}`);
                await instances[i].destroy();
                deletedCount++;
            }
        }
    }

    if (deletedCount === 0) {
        console.log('\nNo duplicates found — all records are unique.');
    } else {
        console.log(`\n✅ Done. Deleted ${deletedCount} duplicate record(s).`);
    }
}

fixDuplicates()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
