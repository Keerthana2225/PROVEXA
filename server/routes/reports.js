const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Item = require('../models/Item');
const IssueRecord = require('../models/IssueRecord');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/export', async (req, res) => {
    try {
        const { format, department, category_id, startDate, endDate, include_archived } = req.query;

        const query = {};
        // By default exclude archived records; pass include_archived=true to include them
        if (include_archived !== 'true') {
            query.archived = { $ne: true };
        }

        if (department) {
            const employees = await Employee.find({ department }).select('_id');
            query.employee = { $in: employees.map(e => e._id) };
        }

        if (category_id) {
            const items = await Item.find({ category: category_id }).select('_id');
            query.item = { $in: items.map(i => i._id) };
        }

        if (startDate && endDate) {
            query.issued_date = {
                $gte: dayjs(startDate).startOf('day').toDate(),
                $lte: dayjs(endDate).endOf('day').toDate()
            };
        }

        const issues = await IssueRecord.find(query)
            .populate('employee')
            .populate({ path: 'item', populate: { path: 'category' } })
            .sort({ issued_date: -1 });

        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Issue Records');

            worksheet.columns = [
                { header: 'Employee Name',       key: 'emp_name',      width: 22 },
                { header: 'Employee ID',          key: 'emp_code',      width: 14 },
                { header: 'Department',           key: 'department',    width: 16 },
                { header: 'Item Category',        key: 'item_category', width: 18 },
                { header: 'Asset Name',           key: 'asset_name',    width: 22 },
                { header: 'Quantity',             key: 'quantity',      width: 10 },
                { header: 'Issue Date',           key: 'issued_date',   width: 14 },
                { header: 'Next Due Date',        key: 'next_due_date', width: 14 },
                { header: 'Due Status',           key: 'due_status',    width: 12 },
                { header: 'Issue Status',         key: 'issue_status',  width: 24 },
                { header: 'Acknowledged',         key: 'acknowledged',  width: 14 },
                { header: 'Acknowledgement Time', key: 'ack_time',      width: 24 },
                { header: 'Signature Available',  key: 'sig_avail',     width: 18 },
                { header: 'Signature Proof',      key: 'signature',     width: 48 },  // wide enough to display signature
                { header: 'Notes',                key: 'notes',         width: 24 },
            ];

            // Style header row
            const headerRow = worksheet.getRow(1);
            headerRow.height = 30;
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B4A9A' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
            });

            let rowIndex = 2;
            for (const issue of issues) {
                const isOverdue = dayjs().isAfter(dayjs(issue.next_due_date));
                const hasSig = !!issue.signature_path;

                const row = worksheet.addRow({
                    emp_name:      issue.employee?.name || 'N/A',
                    emp_code:      issue.employee?.emp_code || 'N/A',
                    department:    issue.employee?.department || 'N/A',
                    item_category: issue.item?.category?.name || 'N/A',
                    asset_name:    issue.item?.name || 'N/A',
                    quantity:      issue.quantity,
                    issued_date:   dayjs(issue.issued_date).format('YYYY-MM-DD'),
                    next_due_date: dayjs(issue.next_due_date).format('YYYY-MM-DD'),
                    due_status:    isOverdue ? 'Overdue' : 'Valid',
                    issue_status:  issue.issue_status || 'Pending Acknowledgement',
                    acknowledged:  issue.acknowledged ? 'Yes' : 'No',
                    ack_time:      issue.acknowledgement_time
                                     ? dayjs(issue.acknowledgement_time).format('YYYY-MM-DD HH:mm')
                                     : 'N/A',
                    sig_avail:     hasSig ? 'Yes' : 'No',
                    signature:     '',   // image placed below
                    notes:         issue.notes || '',
                });

                // Set row height — tall enough to show signature
                row.height = hasSig ? 130 : 22;
                row.eachCell({ includeEmpty: true }, cell => {
                    cell.alignment = { vertical: 'middle', wrapText: false };
                });

                // Colour-code the Acknowledged cell
                const ackCell = row.getCell('acknowledged');
                if (issue.acknowledged) {
                    ackCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                    ackCell.font = { bold: true, color: { argb: 'FF065F46' } };
                } else {
                    ackCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
                    ackCell.font = { color: { argb: 'FF92400E' } };
                }

                // Embed signature using ext (pixel width/height) so image stays inside the row
                // and never bleeds into adjacent rows, creating empty rows
                if (hasSig) {
                    const sigFilePath = path.join(
                        __dirname, '..', issue.signature_path.replace(/^\//, '')
                    );
                    if (fs.existsSync(sigFilePath)) {
                        const imageId = workbook.addImage({
                            filename:  sigFilePath,
                            extension: 'png',
                        });
                        // col 12 = 0-based index of 'Signature' (13th column)
                        // row = rowIndex - 1 is the 0-based row index of the current data row
                        // ext fixes the pixel size so image stays fully inside this row
                        worksheet.addImage(imageId, {
                            tl:     { col: 13, row: rowIndex - 1 },
                            ext:    { width: 320, height: 110 },
                            editAs: 'oneCell',
                        });
                    }
                }

                rowIndex++;
            }

            worksheet.views = [{ state: 'frozen', ySplit: 1 }];

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader('Content-Disposition', 'attachment; filename="issue_records.xlsx"');
            await workbook.xlsx.write(res);
            return res.end();

        } else if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="issue_records.pdf"');
            doc.pipe(res);

            doc.fontSize(20).text('Employee Issue Records', { align: 'center' });
            doc.moveDown();

            issues.forEach(issue => {
                doc.fontSize(12).text(
                    `Employee: ${issue.employee?.name || 'N/A'} (${issue.employee?.emp_code || 'N/A'})`
                );
                doc.fontSize(10).text(`Department: ${issue.employee?.department || 'N/A'}`);
                doc.fontSize(10).text(
                    `Item: ${issue.item?.name || 'N/A'} (${issue.item?.category?.name || 'N/A'})`
                );
                doc.fontSize(10).text(
                    `Issued: ${dayjs(issue.issued_date).format('YYYY-MM-DD')} | Due: ${dayjs(issue.next_due_date).format('YYYY-MM-DD')}`
                );
                doc.fontSize(10).text(
                    `Issue Status: ${issue.issue_status || 'N/A'} | Acknowledged: ${issue.acknowledged ? 'Yes' : 'No'}`
                );
                if (issue.acknowledgement_time) {
                    doc.fontSize(10).text(
                        `Acknowledged At: ${dayjs(issue.acknowledgement_time).format('YYYY-MM-DD HH:mm')}`
                    );
                }
                doc.moveDown();
            });

            doc.end();
            return;
        }

        res.status(400).json({ message: 'Invalid format requested' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error generating report' });
    }
});

module.exports = router;
