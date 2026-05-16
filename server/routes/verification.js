const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const verificationService = require('../services/VerificationService');
const employeeService = require('../services/EmployeeService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8001';
const DUPLICATE_WINDOW_MIN = parseInt(process.env.DUPLICATE_SCAN_WINDOW_MINUTES || '2', 10);
const OCR_TIMEOUT_MS = parseInt(process.env.OCR_SCAN_TIMEOUT_MS || '90000', 10);

function normalizeNumericEmployeeCode(value) {
    return String(value || '').replace(/\D/g, '');
}

// POST /api/verification/ocr-scan
router.post('/ocr-scan', async (req, res) => {
    try {
        const { image, device_info } = req.body;
        if (!image) return res.status(400).json({ message: 'Image data is required' });

        // 1. Call Python OCR service
        let ocrResult;
        try {
            const ocrRes = await fetch(`${OCR_SERVICE_URL}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image }),
                signal: AbortSignal.timeout(OCR_TIMEOUT_MS)
            });
            ocrResult = await ocrRes.json();
            if (!ocrRes.ok) {
                throw new Error(ocrResult?.message || ocrResult?.error || `OCR service returned ${ocrRes.status}`);
            }
        } catch (fetchErr) {
            console.error('OCR service unreachable:', fetchErr.message);
            const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.message?.toLowerCase().includes('timeout');
            return res.status(503).json({
                status: 'Failed',
                message: isTimeout
                    ? 'OCR service is still processing. Please try again in a moment.'
                    : 'OCR service is unavailable.'
            });
        }

        const emp_code = normalizeNumericEmployeeCode(ocrResult.emp_code);

        if (!ocrResult.success || !emp_code) {
            return res.json({
                status: 'Failed',
                message: ocrResult.error || 'Employee ID could not be extracted.',
                confidence: ocrResult.confidence,
                raw_text: ocrResult.raw_text
            });
        }

        const employee = await employeeService.getByCode(emp_code);

        if (!employee) {
            return res.json({
                status: 'Failed',
                message: `Employee ID "${emp_code}" not found.`,
                emp_code,
                confidence: ocrResult.confidence
            });
        }

        // 2. Duplicate Check
        const recentLog = await verificationService.getRecentVerified(employee.id, 'OCR Scan', DUPLICATE_WINDOW_MIN);
        if (recentLog) {
            await verificationService.log({
                type: 'OCR Scan',
                status: 'Duplicate Scan',
                entity_id: employee.id, // Using employee.id as entity_id for standalone
                entity_type: 'Employee',
                details: JSON.stringify({ emp_code, device_info })
            });

            return res.json({
                status: 'Duplicate Scan',
                message: `${employee.name} was already scanned.`,
                employee,
                last_scan: recentLog.timestamp
            });
        }

        // 3. Log Success
        await verificationService.log({
            type: 'OCR Scan',
            status: 'Verified',
            entity_id: employee.id,
            entity_type: 'Employee',
            details: JSON.stringify({ 
                confidence: ocrResult.confidence, 
                raw_text: ocrResult.raw_text,
                device_info 
            })
        });

        return res.json({
            status: 'Verified',
            message: `${employee.name} verified successfully.`,
            employee,
            confidence: ocrResult.confidence,
            elapsed_ms: ocrResult.elapsed_ms
        });

    } catch (error) {
        console.error('OCR scan route error:', error);
        res.status(500).json({ message: 'Server error processing scan.' });
    }
});

// POST /api/verification/signature-log
router.post('/signature-log', async (req, res) => {
    try {
        const { emp_code, signature, device_info } = req.body;
        if (!signature) return res.status(400).json({ message: 'Signature data is required.' });

        const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `sig_verify_${Date.now()}.png`;
        const dir = path.join(__dirname, '..', 'public', 'signatures');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
        const signature_path = `/public/signatures/${filename}`;

        let employee = null;
        if (emp_code) {
            employee = await employeeService.getByCode(emp_code);
        }

        await verificationService.log({
            type: 'Signature',
            status: 'Verified',
            entity_id: employee ? employee.id : null,
            entity_type: 'Employee',
            details: JSON.stringify({ signature_path, device_info, emp_code })
        });

        res.json({ message: 'Signature recorded successfully.', signature_path });
    } catch (error) {
        console.error('Signature log error:', error);
        res.status(500).json({ message: 'Server error saving signature.' });
    }
});

// GET /api/verification/logs
router.get('/logs', async (req, res) => {
    try {
        const result = await verificationService.getLogs(req.query);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching logs.' });
    }
});

// GET /api/verification/stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await verificationService.getStats();
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching stats.' });
    }
});

module.exports = router;
