const { Item, ItemCategory } = require('../models');

class ItemService {
    async getAll(filters = {}) {
        const { search, categoryId, page, limit } = filters;
        const query = {};

        if (categoryId) query.category = categoryId;
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        let dbQuery = Item.find(query).populate('category').sort({ name: 1 });

        if (page && limit) {
            dbQuery = dbQuery.skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit));
            const items = await dbQuery;
            const total = await Item.countDocuments(query);
            return { items, total };
        }

        return await dbQuery;
    }

    async getById(id) {
        return await Item.findById(id).populate('category');
    }

    async createItem(data) {
        // Map category_id to category for Mongoose
        if (data.category_id) {
            data.category = data.category_id;
            delete data.category_id;
        }
        return await Item.create(data);
    }

    async updateItem(id, data) {
        if (data.category_id) {
            data.category = data.category_id;
            delete data.category_id;
        }
        return await Item.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteItem(id) {
        return await Item.findByIdAndDelete(id);
    }

    async getCategories() {
        return await ItemCategory.find().sort({ name: 1 });
    }

    async createCategory(data) {
        return await ItemCategory.create(data);
    }
}

module.exports = new ItemService();
