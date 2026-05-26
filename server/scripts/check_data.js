const { connectSQL, sequelize } = require('../config/database');
const { Item, ItemCategory } = require('../models');

async function check() {
    await connectSQL();
    try {
        const categories = await ItemCategory.findAll();
        console.log('--- Item Categories ---');
        categories.forEach(c => console.log(`ID: ${c._id || c.id} | Name: ${c.name}`));

        const items = await Item.findAll({ include: [ItemCategory] });
        console.log('\n--- Items ---');
        items.forEach(i => console.log(`ID: ${i._id || i.id} | Name: ${i.name} | Category: ${i.ItemCategory?.name || i.category}`));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
