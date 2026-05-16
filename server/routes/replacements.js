const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const replacementService = require('../services/ReplacementService');
const itemService = require('../services/ItemService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get all requests
router.get('/', async (req, res) => {
    try {
        const requests = await replacementService.getAll(req.query);
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Summary Stats
router.get('/summary', async (req, res) => {
    try {
        const summary = await replacementService.getSummary();
        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new request
router.post('/', async (req, res) => {
    try {
        const { employee_id, item_id, reason, quantity, size, unit_cost, deduction_amount, payment_status } = req.body;
        
        const item = await itemService.getById(item_id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const qty = parseInt(quantity) || 1;
        const isCostTrackingItem = !!item.category?.requires_cost_tracking;

        const request = await replacementService.create({
            employee_id,
            item_id,
            reason,
            quantity: qty,
            size: size || 'N/A',
            is_uniform_replacement: isCostTrackingItem,
            unit_cost: isCostTrackingItem ? (parseFloat(unit_cost) || 0) : 0,
            total_cost: isCostTrackingItem ? qty * (parseFloat(unit_cost) || 0) : 0,
            deduction_amount: isCostTrackingItem ? (parseFloat(deduction_amount) || 0) : 0,
            payment_status: isCostTrackingItem ? (payment_status || 'Pending') : 'Not Applicable',
            status: 'Pending'
        });

        res.status(201).json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve a request
router.put('/:id/approve', async (req, res) => {
    try {
        const request = await replacementService.approve(req.params.id, req.body, req.admin.id);
        res.json({ message: 'Request approved successfully', request });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Acknowledge and Complete Handover
router.put('/:id/acknowledge', async (req, res) => {
    try {
        const { signature, notes, ocr_details, verification_method = 'Signature' } = req.body;
        
        if (!signature && !ocr_details) {
            return res.status(400).json({ message: 'Signature or OCR verification is required' });
        }

        const id = req.params.id;
        let signature_path = null;
        if (signature) {
            const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `sig_replace_${Date.now()}_${id}.png`;
            const dir = path.join(__dirname, '..', 'public', 'signatures');
            
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            const filepath = path.join(dir, filename);
            fs.writeFileSync(filepath, buffer);
            signature_path = `/public/signatures/${filename}`;
        }
        
        const result = await replacementService.handover(id, {
            signature_path,
            notes,
            ocr_details,
            verification_method,
            admin_id: req.admin.id
        });

        res.json({ message: 'Handover completed successfully', issue: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error completing handover' });
    }
});

// Reject a request
router.put('/:id/reject', async (req, res) => {
    try {
        const request = await replacementService.reject(req.params.id, req.body.notes, req.admin.id);
        res.json({ message: 'Request rejected', request });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
