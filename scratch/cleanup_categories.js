const mongoose = require('mongoose');
const path = require('path');

async function cleanup() {
    try {
        await mongoose.connect('mongodb://localhost:27017/provexa');
        console.log('Connected to DB');

        const ItemCategory = require('./server/models/ItemCategory');
        const Item = require('./server/models/Item');

        const toRemove = [
            'Bedsheet', 'Boost/Nutrition', 'Helmet', 'Laptop', 'Shoes', 
            'Snacks', 'Soap', 'Sweet Box', 'Towel', 'Uniform', 'notes'
        ];

        for (const name of toRemove) {
            const cat = await ItemCategory.findOne({ name });
            if (cat) {
                // Check if any items use this category
                const itemCount = await Item.countDocuments({ category: cat._id });
                if (itemCount > 0) {
                    console.log(`Skipping category "${name}" because ${itemCount} items are still using it.`);
                } else {
                    await ItemCategory.deleteOne({ _id: cat._id });
                    console.log(`Deleted empty category: "${name}"`);
                }
            } else {
                console.log(`Category "${name}" not found.`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanup();
