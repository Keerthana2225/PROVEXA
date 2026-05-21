const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const allocationService = require('../services/AllocationRequestService');
const itemService = require('../services/ItemService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ── Official Price List ───────────────────────────────────────────

// GET all active official prices (used by frontend form)
router.get('/prices', async (req, res) => {
    try {
        const prices = await allocationService.getOfficialPrices();
        res.json(prices);
    } catch (error) {
        console.error('Price List Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// PUT upsert a single price entry
router.put('/prices', async (req, res) => {
    try {
        const { item_name, price, gender, description } = req.body;
        if (!item_name || price === undefined) {
            return res.status(400).json({ message: 'item_name and price are required' });
        }
        const updated = await allocationService.upsertOfficialPrice(item_name, parseFloat(price), gender, description);
        res.json(updated);
    } catch (error) {
        console.error('Price Upsert Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ── Allocation Configs ────────────────────────────────────────────

router.get('/configs', async (req, res) => {
    try {
        const configs = await allocationService.getConfigs();
        res.json(configs);
    } catch (error) {
        console.error('Get Configs Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

router.post('/configs', async (req, res) => {
    try {
        const { configs } = req.body;
        if (!Array.isArray(configs)) return res.status(400).json({ message: 'configs must be an array' });
        const updated = await allocationService.updateConfigs(configs);
        res.json(updated);
    } catch (error) {
        console.error('Update Configs Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ── Get all requests ──────────────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const requests = await allocationService.getAll(req.query);
        res.json(requests);
    } catch (error) {
        console.error('Get All Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ── Summary stats ─────────────────────────────────────────────────

router.get('/summary', async (req, res) => {
    try {
        const summary = await allocationService.getSummary();
        res.json(summary);
    } catch (error) {
        console.error('Summary Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ── Create new request ────────────────────────────────────────────

router.post('/', async (req, res) => {
    try {
        const {
            employee_id, item_id, reason, exchange_reason, notes,
            quantity, size, unit_cost, payment_status,
            allocation_type, approved_standard_quantity,
            return_status, previous_issue_id, apply_cost_override
        } = req.body;

        const item = await itemService.getById(item_id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const qty = parseInt(quantity) || 1;

        const request = await allocationService.create({
            employee_id,
            item_id,
            reason,
            exchange_reason:  exchange_reason || '',
            notes,
            quantity:         qty,
            size:             size || 'N/A',
            unit_cost:        parseFloat(unit_cost) || 0,
            payment_status,
            allocation_type,
            approved_standard_quantity,
            return_status,
            previous_issue_id,
            apply_cost_override: !!apply_cost_override,
        });

        res.status(201).json(request);
    } catch (error) {
        console.error('Create Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ── Approve ───────────────────────────────────────────────────────

router.put('/:id/approve', async (req, res) => {
    try {
        const request = await allocationService.approve(req.params.id, req.body, req.admin.id);
        res.json({ message: 'Request approved successfully', request });
    } catch (error) {
        console.error('Approve Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// ── Handover / Acknowledge ────────────────────────────────────────

router.put('/:id/acknowledge', async (req, res) => {
    try {
        const { signature, notes, ocr_details, verification_method = 'Signature' } = req.body;
        if (!signature && !ocr_details) {
            return res.status(400).json({ message: 'Signature or OCR verification is required' });
        }

        const id = req.params.id;
        let signature_path = null;
        if (signature) {
            const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `sig_replace_${Date.now()}_${id}.png`;
            const dir = path.join(__dirname, '..', 'public', 'signatures');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, filename), buffer);
            signature_path = `/public/signatures/${filename}`;
        }

        const result = await allocationService.handover(id, {
            signature_path, notes, ocr_details, verification_method, admin_id: req.admin.id
        });

        res.json({ message: 'Handover completed successfully', issue: result });
    } catch (error) {
        console.error('Handover Error:', error);
        res.status(500).json({ message: error.message || 'Server error completing handover' });
    }
});

// ── Reject ────────────────────────────────────────────────────────

router.put('/:id/reject', async (req, res) => {
    try {
        const request = await allocationService.reject(req.params.id, req.body.notes, req.admin.id);
        res.json({ message: 'Request rejected', request });
    } catch (error) {
        console.error('Reject Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

module.exports = router;
