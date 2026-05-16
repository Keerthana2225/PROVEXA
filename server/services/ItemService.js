const { Item, ItemCategory } = require('../models');
const { Op } = require('sequelize');

class ItemService {
    async getAll(filters = {}) {
        const where = {};
        if (filters.status) where.status = filters.status;
        if (filters.category_id) where.category_id = filters.category_id;

        return await Item.findAll({
            where,
            include: [{ model: ItemCategory, as: 'category' }],
            order: [['name', 'ASC']]
        });
    }

    async getById(id) {
        return await Item.findByPk(id, { include: [{ model: ItemCategory, as: 'category' }] });
    }

    async getCategories() {
        return await ItemCategory.findAll({ order: [['name', 'ASC']] });
    }

    async createCategory(data) {
        return await ItemCategory.create(data);
    }

    async updateCategory(id, data) {
        const category = await ItemCategory.findByPk(id);
        if (!category) throw new Error('Category not found');
        return await category.update(data);
    }

    async createItem(data) {
        return await Item.create(data);
    }

    async updateItem(id, data) {
        const item = await Item.findByPk(id);
        if (!item) throw new Error('Item not found');
        return await item.update(data);
    }

    async deleteItem(id) {
        const item = await Item.findByPk(id);
        if (!item) throw new Error('Item not found');
        return await item.destroy();
    }
}

module.exports = new ItemService();
