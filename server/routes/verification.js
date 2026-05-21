const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const verificationService = require('../services/VerificationService');
const employeeService = require('../services/EmployeeService');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

router.use(authMiddleware);

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8001';
const DUPLICATE_WINDOW_MIN = parseInt(process.env.DUPLICATE_SCAN_WINDOW_MINUTES || '2', 10);
const OCR_TIMEOUT_MS = parseInt(process.env.OCR_SCAN_TIMEOUT_MS || '30000', 10); // 30s default

function normalizeNumericEmployeeCode(value) {
    if (!value) return '';
    let str = String(value).trim().toUpperCase();
    
    // 1. Common OCR misreads
    str = str.replace(/O/g, '0');
    str = str.replace(/I/g, '1');
    str = str.replace(/L/g, '1');
    str = str.replace(/Z/g, '2');
    str = str.replace(/S/g, '5');
    str = str.replace(/B/g, '8');
    
    // 2. Extract first 4-6 digit sequence
    const match = str.match(/\d{4,6}/);
    return match ? match[0] : '';
}

// POST /api/verification/ocr-scan
router.post('/ocr-scan', async (req, res) => {
    const reqStart = Date.now();
    try {
        const { image, manual_code, device_info } = req.body;
        
        let emp_code = '';
        let ocrResult = { success: false, confidence: 0 };

        // ── Case A: Manual Code Entry ──
        if (manual_code) {
            // Keep the code as entered — don't strip prefix (e.g. EMP1001 should stay EMP1001)
            emp_code = String(manual_code).trim();
            ocrResult = { success: true, emp_code, confidence: 1.0, method: 'Manual' };
            console.log(`[OCR] Manual Entry: "${emp_code}"`);
        } 
        // ── Case B: OCR Engine ──
        else {
            if (!image) return res.status(400).json({ message: 'Image data is required' });
            console.log(`[OCR] Scan Request: ${(image.length / 1024).toFixed(1)} KB`);

            try {
                const ocrRes = await axios.post(`${OCR_SERVICE_URL}/scan`, 
                    { image },
                    { timeout: OCR_TIMEOUT_MS }
                );
                ocrResult = ocrRes.data;
                emp_code = normalizeNumericEmployeeCode(ocrResult.emp_code);
                
                const ocrMs = Date.now() - reqStart;
                console.log(`[OCR] PaddleOCR Response: ${ocrMs}ms | code=${emp_code} | success=${ocrResult.success}`);
            } catch (fetchErr) {
                console.error('[OCR] Service Unreachable:', fetchErr.message);
                const isTimeout = fetchErr.code === 'ECONNABORTED' || fetchErr.message.includes('timeout');
                return res.status(503).json({
                    status: 'Failed',
                    message: isTimeout ? 'Scan taking too long' : 'OCR Service Offline'
                });
            }
        }

        // 2. Process Result
        if (!ocrResult.success || !emp_code) {
            console.log(`[OCR] Raw text from OCR engine: "${ocrResult.raw_text}" | emp_code="${emp_code}" | confidence=${ocrResult.confidence}`);
            return res.json({
                status: 'Failed',
                message: 'ID not recognized. Hold card steady.',
                confidence: ocrResult.confidence,
                raw_text: ocrResult.raw_text
            });
        }

        // 3. Database Validation
        console.log(`[OCR] Looking for employee with code: "${emp_code}"`);
        const employee = await employeeService.getByCode(emp_code);
        
        if (!employee) {
            console.log(`[OCR] Employee NOT found in database for code: "${emp_code}"`);
            return res.json({
                status: 'Failed',
                message: `ID "${emp_code}" not found`,
                emp_code
            });
        }
        
        console.log(`[OCR] Found Employee: ${employee.name} (ID: ${employee._id})`);

        // 4. Duplicate Check
        const recentLog = await verificationService.getRecentVerified(employee._id, 'OCR Scan', DUPLICATE_WINDOW_MIN);
        if (recentLog) {
            return res.json({
                status: 'Duplicate Scan',
                message: `${employee.name} already verified`,
                employee: employee.toJSON ? employee.toJSON() : employee
            });
        }

        // 5. Final Verification Log
        await verificationService.log({
            type: 'OCR Scan',
            status: 'Verified',
            entity_id: employee._id,
            entity_type: 'Employee',
            // Must pass employee field for Recent Activity
            employee: employee._id,
            ocr_confidence: ocrResult.confidence,
            raw_ocr_text: ocrResult.raw_text
        });

        console.log(`[OCR] ✅ Verified: ${employee.name} (${emp_code})`);

        return res.json({
            status: 'Verified',
            message: `${employee.name} verified successfully`,
            employee: employee.toJSON ? employee.toJSON() : employee,
            confidence: ocrResult.confidence
        });

    } catch (error) {
        console.error('[OCR] Route Error:', error);
        res.status(500).json({ message: 'Server error during scan' });
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
            entity_id: employee ? (employee._id || employee.id) : null,
            entity_type: 'Employee',
            // Must pass employee field for Recent Activity
            employee: employee ? (employee._id || employee.id) : null,
            signature_path
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
