const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const issueService = require('../services/IssueService');
const verificationService = require('../services/VerificationService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get issues with filters
router.get('/', async (req, res) => {
    try {
        const issues = await issueService.getAll(req.query);
        res.json(issues);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching issues' });
    }
});

// Get upcoming renewals
router.get('/upcoming', async (req, res) => {
    try {
        const result = await issueService.getUpcomingRenewals();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new issue records (Bulk support)
router.post('/', async (req, res) => {
    try {
        const { employee_ids, employee_id, items, issued_date, notes, item_condition, override } = req.body;
        const targetEmployeeIds = employee_ids || (employee_id ? [employee_id] : []);
        
        if (targetEmployeeIds.length === 0) return res.status(400).json({ message: 'No employees selected' });
        if (!items || items.length === 0) return res.status(400).json({ message: 'No items selected' });

        const results = await issueService.bulkIssue(
            targetEmployeeIds, 
            items, 
            issued_date, 
            notes, 
            item_condition, 
            req.admin.id, 
            override
        );
        
        res.status(201).json({ count: results.length, records: results });
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json(error);
        }
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Renew Item
router.post('/:id/renew', async (req, res) => {
    try {
        const { notes, item_condition } = req.body;
        const newRecord = await issueService.renew(req.params.id, notes, item_condition, req.admin.id);
        res.json({ message: 'Item successfully renewed', newRecord });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Return Item
router.post('/:id/return', async (req, res) => {
    try {
        const { return_remarks, returned_condition } = req.body;
        const record = await issueService.return(req.params.id, return_remarks, returned_condition, req.admin.id);
        res.json({ message: 'Item successfully returned', record });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Acknowledge a single record
router.put('/acknowledge/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { signature, verification_method, ocr_details } = req.body; 

        if (!signature && !ocr_details) {
            return res.status(400).json({ message: 'Signature or OCR verification is required' });
        }

        let signature_path = null;
        if (signature) {
            const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `sig_rec_${Date.now()}_${id}.png`;
            const dir = path.join(__dirname, '..', 'public', 'signatures');
            
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            const filepath = path.join(dir, filename);
            fs.writeFileSync(filepath, buffer);
            signature_path = `/public/signatures/${filename}`;
        }
        
        const issue = await issueService.acknowledge(id, {
            signature_path,
            verification_method,
            ocr_details,
            admin_id: req.admin?.id
        });

        // Create verification log
        await verificationService.log({
            type: ocr_details ? (signature ? 'Signature + OCR' : 'OCR Scan') : 'Signature',
            status: 'Verified',
            entity_id: id,
            entity_type: 'Issue',
            details: JSON.stringify({ ocr_details, signature_path }),
            verified_by: req.admin?.id
        });

        res.json({ message: 'Successfully acknowledged receipt.', issue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
