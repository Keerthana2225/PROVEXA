const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
const reportService = require('../services/ReportService');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.use(authMiddleware);

router.get('/export', async (req, res) => {
    try {
        const issues = await reportService.getIssueExportData(req.query);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Issue Records');

        worksheet.columns = [
            { header: 'Employee ID',          key: 'emp_code',      width: 14 },
            { header: 'Employee Name',       key: 'emp_name',      width: 22 },
            { header: 'Department',           key: 'department',    width: 16 },
            { header: 'Item Category',        key: 'item_category', width: 18 },
            { header: 'Asset Name',           key: 'asset_name',    width: 22 },
            { header: 'Quantity',             key: 'quantity',      width: 10 },
            { header: 'Issue Date',           key: 'issued_date',   width: 14 },
            { header: 'Next Due Date',        key: 'next_due_date', width: 14 },
            { header: 'Acknowledgement Status', key: 'ack_status',   width: 20 },
            { header: 'Verification Method',  key: 'verify_method', width: 18 },
            { header: 'Verification Time',    key: 'ack_time',      width: 20 },
            { header: 'Return Status',        key: 'return_status', width: 14 },
            { header: 'Renewal Status',       key: 'renewal_status',width: 16 },
            { header: 'Digital Signature',    key: 'signature',     width: 25 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 30;
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        issues.forEach((issue, index) => {
            const hasOcr = !!(issue.verification_method && issue.verification_method.includes('OCR'));
            const hasSig = !!issue.signature_path;
            
            let ackStatus = 'Pending Verification';
            if (issue.acknowledged) {
                if (hasOcr && hasSig) ackStatus = 'Fully Verified';
                else if (hasOcr) ackStatus = 'Verified (OCR)';
                else if (hasSig) ackStatus = 'Verified (Signature)';
                else ackStatus = 'Verified';
            }

            const rowNumber = index + 2;
            const row = worksheet.addRow({
                emp_code:      issue.employee?.emp_code || 'N/A',
                emp_name:      issue.employee?.name || 'N/A',
                department:    issue.employee?.department || 'N/A',
                item_category: issue.item?.category?.name || 'N/A',
                asset_name:    issue.item?.name || 'N/A',
                quantity:      issue.quantity,
                issued_date:   dayjs(issue.issued_date).format('YYYY-MM-DD'),
                next_due_date: dayjs(issue.next_due_date).format('YYYY-MM-DD'),
                ack_status:    ackStatus,
                verify_method: issue.verification_method || 'None',
                ack_time:      issue.acknowledgement_time ? dayjs(issue.acknowledgement_time).format('YYYY-MM-DD HH:mm') : 'Pending',
                return_status: issue.lifecycle_status === 'Returned' ? 'Returned' : 'Active',
                renewal_status: issue.lifecycle_status,
                signature: hasSig 
                    ? '' 
                    : (hasOcr ? 'Verified via OCR Scan' : 'Pending Verification')
            });

            // Set row height to accommodate signature
            row.height = 60;
            row.alignment = { vertical: 'middle', horizontal: 'center' };

            // Add signature image if exists
            if (hasSig) {
                try {
                    const sigPath = path.join(__dirname, '..', issue.signature_path);
                    if (fs.existsSync(sigPath)) {
                        const imageId = workbook.addImage({
                            filename: sigPath,
                            extension: 'png',
                        });
                        worksheet.addImage(imageId, {
                            tl: { col: 13.2, row: index + 1.1 },
                            ext: { width: 120, height: 50 },
                            editAs: 'oneCell'
                        });
                    }
                } catch (imgError) {
                    console.error('Error adding image to Excel:', imgError);
                }
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Issue_Report_${dayjs().format('YYYY-MM-DD')}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error generating report' });
    }
});

router.get('/replacements/uniform', async (req, res) => {
    try {
        const records = await reportService.getReplacementExportData({ ...req.query, is_uniform_replacement: true });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Uniform Cost Report');

        ws.columns = [
            { header: 'Employee ID',        key: 'emp_code',       width: 14 },
            { header: 'Employee Name',     key: 'emp_name',       width: 22 },
            { header: 'Department',         key: 'department',     width: 16 },
            { header: 'Monthly Salary (₹)', key: 'salary',         width: 18 },
            { header: 'Uniform Type',       key: 'item_name',      width: 22 },
            { header: 'Quantity',           key: 'quantity',       width: 10 },
            { header: 'Size',               key: 'size',           width: 8  },
            { header: 'Unit Cost (₹)',      key: 'unit_cost',      width: 14 },
            { header: 'Total Cost (₹)',     key: 'total_cost',     width: 14 },
            { header: 'Deduction Amt (₹)', key: 'deduction',      width: 16 },
            { header: 'Est. Net Salary (₹)', key: 'net_salary',     width: 18 },
            { header: 'Replacement Date',   key: 'rep_date',       width: 16 },
        ];

        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        });

        let totalCost = 0, totalDeduction = 0;
        records.forEach(r => {
            totalCost += parseFloat(r.total_cost) || 0;
            totalDeduction += parseFloat(r.deduction_amount) || 0;
            ws.addRow({
                emp_code:     r.employee?.emp_code || 'N/A',
                emp_name:     r.employee?.name || 'N/A',
                department:   r.employee?.department || 'N/A',
                salary:       r.employee?.salary || 0,
                item_name:    r.item?.name || 'N/A',
                quantity:     r.quantity,
                size:         r.size || 'N/A',
                unit_cost:    r.unit_cost,
                total_cost:   r.total_cost,
                deduction:    r.deduction_amount,
                net_salary:   (parseFloat(r.employee?.salary || 0) - parseFloat(r.deduction_amount || 0)).toFixed(2),
                rep_date:     r.resolved_date ? dayjs(r.resolved_date).format('YYYY-MM-DD') : 'Pending',
            });
        });

        ws.addRow([]);
        ws.addRow({ emp_name: 'TOTAL', total_cost: totalCost.toFixed(2), deduction: totalDeduction.toFixed(2) });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Uniform_Cost_Report_${dayjs().format('YYYY-MM-DD')}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error generating report' });
    }
});

router.get('/replacements/additional-deductions', async (req, res) => {
    try {
        const records = await reportService.getReplacementExportData({ 
            ...req.query, 
            allocation_type: 'Additional' 
        });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Additional Uniform Costs');

        ws.columns = [
            { header: 'Employee ID',         key: 'emp_code',         width: 14 },
            { header: 'Employee Name',       key: 'emp_name',         width: 22 },
            { header: 'Department',          key: 'department',       width: 16 },
            { header: 'Extra Item Requested',key: 'item_name',        width: 22 },
            { header: 'Quantity',            key: 'quantity',         width: 10 },
            { header: 'Unit Cost (₹)',       key: 'unit_cost',        width: 14 },
            { header: 'Total Cost (₹)',      key: 'deduction',        width: 16 },
            { header: 'Payment Status',      key: 'payment_status',   width: 16 },
            { header: 'Request Date',        key: 'req_date',         width: 16 },
        ];

        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        });

        let totalDeduction = 0;
        records.forEach(r => {
            totalDeduction += parseFloat(r.deduction_amount) || 0;
            ws.addRow({
                emp_code:       r.employee?.emp_code || 'N/A',
                emp_name:       r.employee?.name || 'N/A',
                department:     r.employee?.department || 'N/A',
                item_name:      r.item?.name || r.item_name || 'N/A',
                quantity:       r.quantity,
                unit_cost:      r.unit_cost,
                deduction:      r.deduction_amount,
                payment_status: r.payment_status || 'Pending',
                req_date:       dayjs(r.requested_date).format('YYYY-MM-DD'),
            });
        });

        ws.addRow([]);
        ws.addRow({ emp_name: 'TOTAL ADDITIONAL COST', deduction: totalDeduction.toFixed(2) });

        // Auto shading
        ws.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFBFF' } };
                });
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Additional_Uniform_Cost_Report_${dayjs().format('YYYY-MM-DD')}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error generating deduction report' });
    }
});

router.get('/replacements/history', async (req, res) => {
    try {
        const records = await reportService.getReplacementExportData({
            ...req.query,
            allocation_type: 'Replacement'
        });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Replacement History');

        ws.columns = [
            { header: 'Employee ID',      key: 'emp_code',   width: 14 },
            { header: 'Employee Name',   key: 'emp_name',   width: 22 },
            { header: 'Department',       key: 'department', width: 16 },
            { header: 'Item Name',        key: 'item_name',  width: 22 },
            { header: 'Replacement Reason', key: 'reason',    width: 30 },
            { header: 'Quantity',         key: 'quantity',   width: 10 },
            { header: 'Size',             key: 'size',       width: 8  },
            { header: 'Status',           key: 'status',     width: 14 },
            { header: 'Request Date',     key: 'req_date',   width: 14 },
            { header: 'Replacement Date', key: 'rep_date',   width: 16 },
            { header: 'Verification Status', key: 'verify',     width: 20 },
            { header: 'Digital Signature',    key: 'signature',  width: 25 },
        ];

        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
        });

        records.forEach((r, index) => {
            const hasSig = !!r.signature_path;
            const hasOcr = !!(r.verification_method && r.verification_method.includes('OCR'));
            
            let verifyStatus = r.verification_method || 'None';
            if (r.acknowledged) {
                if (hasOcr && hasSig) verifyStatus = 'Fully Verified';
                else if (hasOcr) verifyStatus = 'Verified (OCR)';
                else if (hasSig) verifyStatus = 'Verified (Signature)';
            }

            const row = ws.addRow({
                emp_code:    r.employee?.emp_code || 'N/A',
                emp_name:    r.employee?.name || 'N/A',
                department:  r.employee?.department || 'N/A',
                item_name:   r.item?.name || 'N/A',
                reason:      r.reason,
                quantity:    r.quantity,
                size:        r.size || 'N/A',
                status:      r.status,
                req_date:    dayjs(r.requested_date).format('YYYY-MM-DD'),
                rep_date:    r.resolved_date ? dayjs(r.resolved_date).format('YYYY-MM-DD') : 'Pending',
                verify:      verifyStatus,
                signature: hasSig 
                    ? '' 
                    : (hasOcr ? 'Verified via OCR Scan' : 'Pending Verification')
            });

            row.height = 60;
            row.alignment = { vertical: 'middle', horizontal: 'center' };

            if (hasSig) {
                try {
                    const sigPath = path.join(__dirname, '..', r.signature_path);
                    if (fs.existsSync(sigPath)) {
                        const imageId = workbook.addImage({
                            filename: sigPath,
                            extension: 'png',
                        });
                        ws.addImage(imageId, {
                            tl: { col: 11, row: index + 1.1 },
                            ext: { width: 120, height: 50 },
                            editAs: 'oneCell'
                        });
                    }
                } catch (imgError) {
                    console.error('Error adding image to replacement report:', imgError);
                }
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Replacement_History_${dayjs().format('YYYY-MM-DD')}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
