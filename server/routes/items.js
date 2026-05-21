const express = require('express');
const router = express.Router();
const itemService = require('../services/ItemService');
const { IssueRecord } = require('../models');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get all items
router.get('/', async (req, res) => {
    try {
        const items = await itemService.getAll(req.query);
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await itemService.getCategories();
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new item
router.post('/', async (req, res) => {
    try {
        const { name, category_id, new_category_name, frequency_days, fixed_date, description, cost } = req.body;
        let finalCategoryId = category_id;

        if (new_category_name) {
            const categories = await itemService.getCategories();
            let category = categories.find(c => c.name.toLowerCase() === new_category_name.toLowerCase());
            if (!category) {
                category = await itemService.createCategory({ name: new_category_name });
            }
            finalCategoryId = category.id;
        }

        if (!finalCategoryId) return res.status(400).json({ message: 'Category is required' });

        const item = await itemService.createItem({
            name,
            category_id: finalCategoryId,
            frequency_days: frequency_days ? parseInt(frequency_days) : 180,
            fixed_date: fixed_date || null,
            description,
            cost: cost || 0
        });
        
        res.status(201).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update item
router.put('/:id', async (req, res) => {
    try {
        const { name, category_id, new_category_name, frequency_days, fixed_date, description, cost, status } = req.body;
        let finalCategoryId = category_id;

        if (new_category_name) {
            const categories = await itemService.getCategories();
            let category = categories.find(c => c.name.toLowerCase() === new_category_name.toLowerCase());
            if (!category) {
                category = await itemService.createCategory({ name: new_category_name });
            }
            finalCategoryId = category.id;
        }

        const item = await itemService.updateItem(req.params.id, { 
            name, 
            category_id: finalCategoryId || undefined, 
            frequency_days: frequency_days ? parseInt(frequency_days) : undefined, 
            fixed_date: fixed_date || undefined,
            description,
            cost,
            status
        });
        
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        const hasIssues = await IssueRecord.findOne({ where: { item: req.params.id } });
        if (hasIssues) {
            return res.status(400).json({ 
                message: 'Cannot delete item with active or historical records.' 
            });
        }

        await itemService.deleteItem(req.params.id);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
