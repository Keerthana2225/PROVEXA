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
            { header: 'Acknowledgement Status', key: 'ack_status',   width: 24 },
            { header: 'Verification Method',  key: 'verify_method', width: 18 },
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
            
            let ackStatus = 'Issued – Signature Awaited';
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
                return_status: issue.lifecycle_status === 'Returned' ? 'Returned' : 'Active',
                renewal_status: issue.lifecycle_status,
                signature: hasSig 
                    ? '' 
                    : (hasOcr ? 'Verified via OCR Scan' : 'Issued – Signature Awaited')
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
                            tl: { col: 12.1, row: index + 1.1 },
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
                rep_date:     r.resolved_date ? dayjs(r.resolved_date).format('YYYY-MM-DD') : 'In Progress',
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
            { header: 'Request Date',        key: 'req_date',         width: 16 },
        ];

        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        });

        let totalDeduction = 0;
        records.forEach(r => {
            const cost = parseFloat(r.total_cost) || 0;
            totalDeduction += cost;
            ws.addRow({
                emp_code:       r.employee?.emp_code || 'N/A',
                emp_name:       r.employee?.name || 'N/A',
                department:     r.employee?.department || 'N/A',
                item_name:      r.item?.name || r.item_name || 'N/A',
                quantity:       r.quantity,
                unit_cost:      r.unit_cost,
                deduction:      cost,
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
            ...req.query
        });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Replacement History');

        ws.columns = [
            { header: 'Employee ID',      key: 'emp_code',   width: 14 },
            { header: 'Employee Name',   key: 'emp_name',   width: 22 },
            { header: 'Department',       key: 'department', width: 16 },
            { header: 'Item Name',        key: 'item_name',  width: 22 },
            { header: 'Request Type',     key: 'allocation_type', width: 18 },
            { header: 'Reason',           key: 'reason',    width: 30 },
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
                allocation_type: r.allocation_type || 'Replacement',
                reason:      r.reason,
                quantity:    r.quantity,
                size:        r.size || 'N/A',
                status:      r.status,
                req_date:    dayjs(r.requested_date).format('YYYY-MM-DD'),
                rep_date:    r.resolved_date ? dayjs(r.resolved_date).format('YYYY-MM-DD') : 'In Progress',
                verify:      verifyStatus,
                signature: hasSig 
                    ? '' 
                    : (hasOcr ? 'Verified via OCR Scan' : 'Issued – Signature Awaited')
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
                            tl: { col: 12, row: index + 1.1 },
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

router.get('/policy-export', async (req, res) => {
    try {
        const { type } = req.query;
        const workbook = new ExcelJS.Workbook();
        let worksheet;
        let filename = `Policy_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`;

        const { IssueRecord, Employee, Item, ItemCategory } = require('../models');

        // Load all active employees and issues
        const employees = await Employee.findAll({ order: [['name', 'ASC']] });
        const issues = await IssueRecord.findAll({
            where: { archived: false },
            include: [{ model: Employee }, { model: Item, include: [{ model: ItemCategory }] }],
            order: [['issued_date', 'DESC']]
        });
        
        // Helper to format worksheets
        function styleHeader(ws) {
            const headerRow = ws.getRow(1);
            headerRow.height = 30;
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Dark charcoal gray header
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        }
        function styleRows(ws) {
            ws.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    row.height = 24;
                    row.alignment = { vertical: 'middle', horizontal: 'center' };
                    if (rowNumber % 2 === 0) {
                        row.eachCell(cell => {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; // light zebra shading
                        });
                    }
                }
            });
        }

        if (type === 'uniform') {
            worksheet = workbook.addWorksheet('Uniform Distribution');
            filename = `Uniform_Distribution_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Gender', key: 'gender', width: 10 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Attire Preference', key: 'attire', width: 22 },
                { header: 'Item Distributed', key: 'item', width: 22 },
                { header: 'Quantity', key: 'qty', width: 10 },
                { header: 'Issued Date', key: 'issued_date', width: 15 },
                { header: 'Next Renewal Date', key: 'next_due', width: 18 }
            ];

            const uniformIssues = issues.filter(i => {
                const n = (i.item_name || i.item?.name || '').toLowerCase();
                return n.includes('pant') || n.includes('shirt') || n.includes('t-shirt') || n.includes('socks') || n.includes('chudidhar') || n.includes('coat');
            });

            uniformIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || i.employee_name || 'N/A',
                    name: emp.name || i.employee_name || 'N/A',
                    category: emp.employee_type || 'N/A',
                    gender: emp.gender || 'N/A',
                    dept: emp.department || 'N/A',
                    attire: emp.is_alternative_attire ? 'Chudidhar' : 'Standard',
                    item: i.item_name || 'N/A',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD'),
                    next_due: i.next_due_date ? dayjs(i.next_due_date).format('YYYY-MM-DD') : 'N/A'
                });
            });
        }
        else if (type === 'safety') {
            worksheet = workbook.addWorksheet('Safety Equipment');
            filename = `Safety_Equipment_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Designation', key: 'desig', width: 18 },
                { header: 'Safety Gear Item', key: 'item', width: 22 },
                { header: 'Quantity', key: 'qty', width: 10 },
                { header: 'Issued Date', key: 'issued_date', width: 15 },
                { header: 'Next Renewal Date', key: 'next_due', width: 18 }
            ];

            const safetyIssues = issues.filter(i => {
                const n = (i.item_name || i.item?.name || '').toLowerCase();
                return n.includes('helmet') || n.includes('spectacles') || n.includes('raincoat') || n.includes('safety shoes');
            });

            safetyIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || 'N/A',
                    name: emp.name || 'N/A',
                    category: emp.employee_type || 'N/A',
                    dept: emp.department || 'N/A',
                    desig: emp.designation || 'N/A',
                    item: i.item_name || 'N/A',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD'),
                    next_due: i.next_due_date ? dayjs(i.next_due_date).format('YYYY-MM-DD') : 'N/A'
                });
            });
        }
        else if (type === 'welfare') {
            worksheet = workbook.addWorksheet('Welfare Distributions');
            filename = `Welfare_Distribution_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Welfare Item', key: 'item', width: 22 },
                { header: 'Quantity', key: 'qty', width: 10 },
                { header: 'Issued Date', key: 'issued_date', width: 15 },
                { header: 'Event / Remarks', key: 'notes', width: 25 }
            ];

            const welfareIssues = issues.filter(i => {
                const n = (i.item_name || i.item?.name || '').toLowerCase();
                return n.includes('soap') || n.includes('towel') || n.includes('sweet box') || n.includes('boost') || n.includes('bedsheet');
            });

            welfareIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || 'N/A',
                    name: emp.name || 'N/A',
                    category: emp.employee_type || 'N/A',
                    dept: emp.department || 'N/A',
                    item: i.item_name || 'N/A',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD'),
                    notes: i.notes || 'Welfare Distribution'
                });
            });
        }
        else if (type === 'towel') {
            worksheet = workbook.addWorksheet('Towel Splits');
            filename = `Towel_Distribution_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Union Member', key: 'is_union', width: 15 },
                { header: 'Quarterly Towel Item', key: 'item', width: 22 },
                { header: 'Quantity', key: 'qty', width: 10 },
                { header: 'Issued Date', key: 'issued_date', width: 15 }
            ];

            const towelIssues = issues.filter(i => {
                const n = (i.item_name || i.item?.name || '').toLowerCase();
                return n.includes('towel') || (n.includes('bedsheet') && i.Employee?.is_union_member);
            });

            towelIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || 'N/A',
                    name: emp.name || 'N/A',
                    dept: emp.department || 'N/A',
                    is_union: emp.is_union_member ? 'Yes' : 'No',
                    item: i.item_name || 'N/A',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD')
                });
            });
        }
        else if (type === 'bedsheet') {
            worksheet = workbook.addWorksheet('Bedsheet Distribution');
            filename = `Bedsheet_Distribution_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Bedsheet Item', key: 'item', width: 22 },
                { header: 'Quantity', key: 'qty', width: 10 },
                { header: 'Issued Date', key: 'issued_date', width: 15 }
            ];

            const bedIssues = issues.filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('bedsheet'));
            bedIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || 'N/A',
                    name: emp.name || 'N/A',
                    category: emp.employee_type || 'N/A',
                    dept: emp.department || 'N/A',
                    item: i.item_name || 'N/A',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD')
                });
            });
        }
        else if (type === 'sweetbox') {
            worksheet = workbook.addWorksheet('Sweet Boxes');
            filename = `SweetBox_Distribution_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Union Member', key: 'is_union', width: 15 },
                { header: 'Festival Event', key: 'event', width: 20 },
                { header: 'Sweet Box Qty', key: 'qty', width: 14 },
                { header: 'Issued Date', key: 'issued_date', width: 15 }
            ];

            const sweetIssues = issues.filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('sweet box'));
            sweetIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || 'N/A',
                    name: emp.name || 'N/A',
                    category: emp.employee_type || 'N/A',
                    is_union: emp.is_union_member ? 'Yes' : 'No',
                    event: i.notes || 'Festival Event',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD')
                });
            });
        }
        else if (type === 'boost') {
            worksheet = workbook.addWorksheet('Boost Distributions');
            filename = `BloodDonation_Boost_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Item Issued', key: 'item', width: 18 },
                { header: 'Quantity', key: 'qty', width: 10 },
                { header: 'Issued Date', key: 'issued_date', width: 15 },
                { header: 'Blood Donation Log / Notes', key: 'notes', width: 30 }
            ];

            const boostIssues = issues.filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('boost'));
            boostIssues.forEach(i => {
                const emp = i.Employee || {};
                worksheet.addRow({
                    emp_code: emp.emp_code || 'N/A',
                    name: emp.name || 'N/A',
                    dept: emp.department || 'N/A',
                    item: i.item_name || 'N/A',
                    qty: i.quantity || 1,
                    issued_date: dayjs(i.issued_date).format('YYYY-MM-DD'),
                    notes: i.notes || 'Blood Donated Benefit'
                });
            });
        }
        else if (type === 'renewals') {
            worksheet = workbook.addWorksheet('Upcoming Renewals');
            filename = `Upcoming_Renewals_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Item Name', key: 'item', width: 22 },
                { header: 'Last Issued', key: 'last_issued', width: 15 },
                { header: 'Next Renewal Date', key: 'next_due', width: 18 },
                { header: 'Countdown Status', key: 'countdown', width: 20 },
                { header: 'Status Flag', key: 'status', width: 15 }
            ];

            issues.forEach(i => {
                if (i.next_due_date) {
                    const days = dayjs(i.next_due_date).diff(dayjs(), 'day');
                    let status = 'Active';
                    if (days < 0) status = 'Overdue';
                    else if (days <= 30) status = 'Renewal Due';

                    const emp = i.Employee || {};
                    worksheet.addRow({
                        emp_code: emp.emp_code || 'N/A',
                        name: emp.name || 'N/A',
                        dept: emp.department || 'N/A',
                        item: i.item_name || 'N/A',
                        last_issued: dayjs(i.issued_date).format('YYYY-MM-DD'),
                        next_due: dayjs(i.next_due_date).format('YYYY-MM-DD'),
                        countdown: days < 0 ? `${Math.abs(days)} Days Overdue` : `${days} Days Left`,
                        status
                    });
                }
            });
        }
        else if (type === 'balance') {
            worksheet = workbook.addWorksheet('Allocation Balance');
            filename = `Allocation_Balances_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            worksheet.columns = [
                { header: 'Employee ID', key: 'emp_code', width: 15 },
                { header: 'Employee Name', key: 'name', width: 22 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Grade', key: 'grade', width: 12 },
                { header: 'Union Status', key: 'is_union', width: 15 },
                { header: 'Item / Category Name', key: 'item', width: 22 },
                { header: 'Allowed Quota', key: 'allowed', width: 14 },
                { header: 'Issued Quota', key: 'issued', width: 14 },
                { header: 'Remaining Balance', key: 'remaining', width: 18 },
                { header: 'Eligibility Status', key: 'status', width: 18 }
            ];

            const eligibilityService = require('../services/EligibilityService');

            for (const emp of employees) {
                const profile = await eligibilityService.getAssetProfile(emp._id || emp.id);
                if (profile && profile.allocations && profile.allocations.summary) {
                    profile.allocations.summary.forEach(sum => {
                        worksheet.addRow({
                            emp_code: emp.emp_code || 'N/A',
                            name: emp.name || 'N/A',
                            category: emp.employee_type || 'N/A',
                            dept: emp.department || 'N/A',
                            grade: emp.grade || 'N/A',
                            is_union: emp.is_union_member ? 'Union' : 'Non-Union',
                            item: sum.item,
                            allowed: sum.allowed,
                            issued: sum.issued,
                            remaining: sum.remaining,
                            status: sum.status
                        });
                    });
                }
            }
        } else {
            return res.status(400).json({ message: 'Invalid report type requested' });
        }

        styleHeader(worksheet);
        styleRows(worksheet);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Policy Export Error:', error);
        res.status(500).json({ message: 'Server error generating policy report' });
    }
});

module.exports = router;
