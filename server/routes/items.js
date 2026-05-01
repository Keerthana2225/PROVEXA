const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const ItemCategory = require('../models/ItemCategory');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get all items
router.get('/', async (req, res) => {
    try {
        const { category_id } = req.query;
        const query = category_id ? { category: category_id } : {};

        const items = await Item.find(query)
            .populate('category')
            .sort({ name: 1 });

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching items' });
    }
});

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await ItemCategory.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching categories' });
    }
});

// Create new item
router.post('/', async (req, res) => {
    try {
        const { name, category_id, new_category_name, frequency_days, fixed_date, description } = req.body;
        let finalCategoryId = category_id;

        if (new_category_name) {
            let category = await ItemCategory.findOne({ name: new_category_name });
            if (!category) {
                category = new ItemCategory({ name: new_category_name });
                await category.save();
            }
            finalCategoryId = category._id;
        }

        if (!finalCategoryId) return res.status(400).json({ message: 'Category is required' });

        const item = new Item({
            name,
            category: finalCategoryId,
            frequency_days: frequency_days ? parseInt(frequency_days) : null,
            fixed_date: fixed_date ? new Date(fixed_date) : null,
            description
        });
        await item.save();
        
        res.status(201).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating item' });
    }
});

// Update item
router.put('/:id', async (req, res) => {
    try {
        const { name, category_id, new_category_name, frequency_days, fixed_date, description } = req.body;
        let finalCategoryId = category_id;

        if (new_category_name) {
            let category = await ItemCategory.findOne({ name: new_category_name });
            if (!category) {
                category = new ItemCategory({ name: new_category_name });
                await category.save();
            }
            finalCategoryId = category._id;
        }

        const item = await Item.findByIdAndUpdate(
            req.params.id,
            { 
                name, 
                category: finalCategoryId || undefined, 
                frequency_days: frequency_days ? parseInt(frequency_days) : null, 
                fixed_date: fixed_date ? new Date(fixed_date) : null,
                description 
            },
            { new: true }
        );
        
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating item' });
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        // Check for associated issue records
        const IssueRecord = require('../models/IssueRecord');
        const hasIssues = await IssueRecord.exists({ item: req.params.id });
        
        if (hasIssues) {
            return res.status(400).json({ 
                message: 'Cannot delete item with active or historical issue records. Consider renaming it instead.' 
            });
        }

        await Item.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting item' });
    }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const Item = require('../models/Item');
        const itemCount = await Item.countDocuments({ category: req.params.id });
        
        if (itemCount > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete category with assigned items. Reassign items first.' 
            });
        }

        await ItemCategory.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting category' });
    }
});

module.exports = router;
