const { Op } = require('sequelize');
const { Item, ItemCategory } = require('../models');

class ItemService {
    // Normalize Sequelize Item to match frontend expectations (category as object, not just ID)
    _normalize(item) {
        const j = (typeof item.toJSON === 'function') ? item.toJSON() : item;
        // ItemCategory (capital I) is the Sequelize association name — map it to lowercase 'category'
        if (j.ItemCategory) {
            j.category = j.ItemCategory;
        } else if (typeof j.category === 'string') {
            // category is just the ID string — keep it but also add a category name object if available
            j.category = { _id: j.category, id: j.category, name: j.category };
        }
        return j;
    }
    async getAll(filters = {}) {
        const { search, categoryId, page, limit } = filters;
        const where = {};

        if (categoryId) where.category = categoryId;
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        const queryOptions = {
            where,
            include: [{ model: ItemCategory }],
            order: [['name', 'ASC']]
        };

        if (page && limit) {
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
            queryOptions.limit = parseInt(limit);
            
            const { rows, count } = await Item.findAndCountAll(queryOptions);
            return {
                items: rows.map(r => r.toJSON()),
                total: count
            };
        }

        const items = await Item.findAll(queryOptions);
        return items.map(i => this._normalize(i));
    }

    async getById(id) {
        const item = await Item.findByPk(id, { include: [{ model: ItemCategory }] });
        return item ? this._normalize(item) : null;
    }

    async createItem(data) {
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
        const item = await Item.findByPk(id);
        if (item) {
            await item.update(data);
            return item;
        }
        return null;
    }

    async deleteItem(id) {
        const item = await Item.findByPk(id);
        if (item) {
            await item.destroy();
            return item;
        }
        return null;
    }

    async getCategories() {
        const cats = await ItemCategory.findAll({ order: [['name', 'ASC']] });
        return cats.map(c => c.toJSON());
    }

    async createCategory(data) {
        return await ItemCategory.create(data);
    }
}

module.exports = new ItemService();
