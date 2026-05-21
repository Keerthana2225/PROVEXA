const { Op } = require('sequelize');
const { Employee, IssueRecord, ReplacementRequest, AllocationConfig, Item, ItemCategory } = require('../models');
const dayjs = require('dayjs');

// Normalize Sequelize PascalCase joins to lowercase
function normIssue(i) {
    const j = typeof i.toJSON === 'function' ? i.toJSON() : { ...i };
    if (j.Item) {
        const it = j.Item;
        if (it.ItemCategory) { it.category = it.ItemCategory; delete it.ItemCategory; }
        j.item = it; delete j.Item;
    } else if (typeof j.item === 'string') {
        j.item = { _id: j.item, id: j.item, name: j.item_name || 'Unknown', category: { name: 'N/A' } };
    }
    return j;
}
function normReplacement(r) {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    if (j.Item) {
        const it = j.Item;
        if (it.ItemCategory) { it.category = it.ItemCategory; delete it.ItemCategory; }
        j.item = it; delete j.Item;
    } else if (typeof j.item === 'string') {
        j.item = { _id: j.item, id: j.item, name: j.item_name || 'Unknown' };
    }
    return j;
}

class EligibilityService {
    async getAssetProfile(employeeId) {
        const employee = await Employee.findByPk(employeeId);
        if (!employee) return null;

        const activeIssuesModel = await IssueRecord.findAll({ 
            where: {
                employee: employeeId, 
                lifecycle_status: 'Active',
                archived: false
            },
            include: [{
                model: Item,
                include: [{ model: ItemCategory }]
            }],
            order: [['issued_date', 'DESC']]
        });
        const activeIssues = activeIssuesModel.map(i => normIssue(i));

        const replacementsModel = await ReplacementRequest.findAll({ 
            where: { employee: employeeId },
            include: [{
                model: Item,
                include: [{ model: ItemCategory }]
            }],
            order: [['requested_date', 'DESC']]
        });
        const replacements = replacementsModel.map(r => normReplacement(r));

        const historicalIssuesModel = await IssueRecord.findAll({
            where: {
                employee: employeeId,
                [Op.or]: [{ lifecycle_status: 'Returned' }, { archived: true }]
            },
            include: [{
                model: Item,
                include: [{ model: ItemCategory }]
            }],
            order: [['return_date', 'DESC'], ['archived_at', 'DESC'], ['issued_date', 'DESC']]
        });
        const historicalIssues = historicalIssuesModel.map(h => normIssue(h));

        const configsModel = await AllocationConfig.findAll();
        const configs = configsModel.map(c => c.toJSON());

        const configMap = {};
        for (const cfg of configs) {
            configMap[cfg.item_type.toLowerCase()] = {
                permanent: cfg.permanent_quantity || cfg.standard_quantity || 0,
                newcomer:  cfg.newcomer_quantity  || cfg.standard_quantity || 0,
                intern:    cfg.intern_quantity    || 1,
            };
        }

        const empType = employee.employee_type || 'Permanent';
        const ELIGIBILITY_MAP = {
            'Intern':    ['t-shirt'],
            'Permanent': ['pant', 'shirt', 't-shirt', 'safety shoes', 'safety shoe', 'liberty shoes', 'shoe', 'coat', 'chudidhar'],
        };
        const eligibleKeywords = ELIGIBILITY_MAP[empType] || ELIGIBILITY_MAP['Permanent'];

        const defaultLimits = {
            'Permanent': { pant: 2, shirt: 2, 't-shirt': 1, shoes: 1 },
            'Intern':    { 't-shirt': 1 },
        };
        const mockConfig = defaultLimits[empType] || defaultLimits['Permanent'];

        const allocationSummary = [];
        const eligibleCategories = new Set();
        activeIssues.forEach(i => {
            const cat = i.item?.category?.name || i.item?.name || i.item_name;
            if (cat) eligibleCategories.add(cat);
        });

        if (empType === 'Intern') {
            eligibleCategories.add('T-Shirt');
        } else {
            ['Pant', 'Shirt', 'T-Shirt'].forEach(c => eligibleCategories.add(c));
        }

        let excessAllocations = 0;

        for (const cat of eligibleCategories) {
            const catNameLower = cat.toLowerCase();
            const cfgEntry = configMap[catNameLower];
            const allowed = cfgEntry !== undefined
                ? (cfgEntry.permanent || cfgEntry)
                : (mockConfig[catNameLower] || 0);

            const issuedInCat = activeIssues.filter(i => {
                const cat = (i.item?.category?.name || '').toLowerCase();
                const name = (i.item?.name || i.item_name || '').toLowerCase();
                
                if (cat === catNameLower) return true;
                
                // Prevent 'shirt' from falsely counting 't-shirt'
                if (catNameLower === 'shirt' && (name.includes('t-shirt') || name.includes('tshirt'))) {
                    return false;
                }
                
                return name.includes(catNameLower);
            });
            const issuedQty = issuedInCat.reduce((sum, issue) => sum + (issue.quantity || 1), 0);
            const remaining = Math.max(0, allowed - issuedQty);

            let status = 'Eligible';
            if (issuedQty >= allowed && allowed > 0) status = 'Limit Reached';
            if (issuedQty > allowed && allowed > 0) { status = 'Excess Allocation'; excessAllocations++; }

            allocationSummary.push({ item: cat, allowed, issued: issuedQty, remaining, status });
        }

        const risks = [];
        const upcomingRenewals = activeIssues.filter(i => i.next_due_date && dayjs(i.next_due_date).isBefore(dayjs().add(14, 'day')));
        if (upcomingRenewals.length > 0) risks.push({ type: 'renewal', label: 'Renewal Due Soon', severity: 'info' });
        if (excessAllocations > 0) risks.push({ type: 'excess', label: 'Excess Allocation', severity: 'warning' });

        const timeline = [];
        const issuesByTx = {};
        
        activeIssues.forEach(issue => {
            const txId = issue.transaction_id || dayjs(issue.issued_date).format('YYYY-MM-DD HH:mm');
            if (!issuesByTx[txId]) {
                issuesByTx[txId] = { issues: [], verified: false, ack_time: null, method: null, status: 'Pending Acknowledgement' };
            }
            issuesByTx[txId].issues.push(issue);
            if (issue.acknowledged) {
                issuesByTx[txId].verified = true;
                issuesByTx[txId].ack_time = issue.acknowledgement_time || issue.updated_at;
                issuesByTx[txId].method = issue.verification_method || 'Signature';
                issuesByTx[txId].status = 'Acknowledged';
            }
        });

        Object.keys(issuesByTx).forEach(txId => {
            const tx = issuesByTx[txId];
            
            const itemsList = tx.issues.map(i => `• ${i.item?.name || i.item_name || 'Item'} ×${i.quantity || 1}`).join('\n');
            
            timeline.push({
                id: `tx_${txId}`,
                date: tx.issues[0].issued_date,
                type: 'issue',
                title: tx.issues.length > 1 ? 'Items Issued' : `${tx.issues[0].item?.name || tx.issues[0].item_name || 'Item'} Issued`,
                subtitle: tx.issues.length > 1 ? `${itemsList}\n\nStatus: ${tx.status}` : `Qty: ${tx.issues[0].quantity || 1} • Status: ${tx.status}`,
                icon: 'FileText'
            });

            if (tx.verified && tx.ack_time) {
                timeline.push({
                    id: `tx_verify_${txId}`,
                    date: tx.ack_time,
                    type: 'verification',
                    title: `Verification Completed`,
                    subtitle: `Method: ${tx.method}\nStatus: Verified`,
                    icon: 'ShieldCheck'
                });
            }
        });

        historicalIssues.forEach(issue => {
            if (issue.return_date) {
                timeline.push({
                    id: issue._id + '_return',
                    date: issue.return_date,
                    type: 'return',
                    title: `${issue.item?.name || 'Item'} Returned`,
                    subtitle: `Condition: ${issue.returned_condition || 'N/A'}`,
                    icon: 'RotateCcw'
                });
            }
        });

        replacements.forEach(rep => {
            const typeLabel = rep.allocation_type === 'Additional' ? 'Additional Item Request'
                : rep.allocation_type === 'Replacement' ? 'Replacement / Exchange'
                : 'Standard Allocation';
            timeline.push({
                id: rep._id,
                date: rep.requested_date,
                type: 'replacement',
                title: `${typeLabel}: ${rep.item?.name || rep.item_name || 'Item'}`,
                subtitle: `Reason: ${rep.reason} · Status: ${rep.status}${
                    rep.total_cost > 0 ? ` · Cost: ₹${rep.total_cost.toLocaleString()}` : ''
                }`,
                icon: 'RefreshCw'
            });
        });

        const additionalCostItems = replacements.filter(r => r.allocation_type === 'Additional' && (r.total_cost || 0) > 0);
        const totalAdditionalCost = additionalCostItems.reduce((sum, r) => sum + (r.total_cost || 0), 0);

        const additionalCostBreakdown = {};
        additionalCostItems.forEach(r => {
            const reason = r.reason || 'Other';
            if (!additionalCostBreakdown[reason]) additionalCostBreakdown[reason] = 0;
            additionalCostBreakdown[reason] += (r.total_cost || 0);
        });

        const additionalItemCounts = {};
        replacements
            .filter(r => r.allocation_type === 'Additional')
            .forEach(r => {
                const name = r.item_name || r.Item?.name || 'Unknown';
                additionalItemCounts[name] = (additionalItemCounts[name] || 0) + (r.quantity || 1);
            });
        const mostRequestedAdditional = Object.entries(additionalItemCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        const pendingAdditionalCost = replacements
            .filter(r => r.allocation_type === 'Additional' && r.payment_status === 'Pending')
            .reduce((sum, r) => sum + (r.total_cost || 0), 0);

        const lifetimeAdditionalCost = replacements
            .filter(r => r.allocation_type === 'Additional')
            .reduce((sum, r) => sum + (r.total_cost || 0), 0);

        const activeReplacementHoldings = replacements.filter(r =>
            (r.status?.toLowerCase() === 'completed' || r.status?.toLowerCase() === 'approved') &&
            r.allocation_type !== 'Standard'
        );

        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            employee: employee.toJSON(),
            employee_type: empType,
            eligibility: eligibleKeywords,
            allocations: {
                summary: allocationSummary,
                active: activeIssues,
                additionalHoldings: activeReplacementHoldings,
                additional: replacements.filter(r => r.allocation_type === 'Additional')
            },
            additionalCosts: {
                total: totalAdditionalCost,
                lifetime: lifetimeAdditionalCost,
                pending: pendingAdditionalCost,
                breakdown: Object.entries(additionalCostBreakdown).map(([reason, amount]) => ({ reason, amount })),
                items: additionalCostItems,
                mostRequested: mostRequestedAdditional,
            },
            risks,
            history: {
                replacements,
                returned: historicalIssues
            },
            timeline
        };
    }

    async validateIssue(employeeId, itemIds) {
        const profile = await this.getAssetProfile(employeeId);
        if (!profile) return { valid: false, reason: 'Employee not found' };

        const itemsModel = await Item.findAll({ 
            where: { _id: { [Op.in]: itemIds } },
            include: [{ model: ItemCategory }] 
        });
        const items = itemsModel.map(i => i.toJSON());

        const errors = [];
        const warnings = [];

        items.forEach(item => {
            const catName = item.ItemCategory?.name;
            if (catName) {
                const summary = profile.allocations.summary.find(s => s.item.toLowerCase() === catName.toLowerCase());
                if (summary && summary.remaining <= 0 && summary.allowed > 0) {
                    warnings.push(`Allocation limit reached for ${catName}. Proceeding will flag as Additional Request.`);
                }
            }
        });

        if (profile.risks && profile.risks.some(r => r.type === 'deduction' || r.type === 'return')) {
            warnings.push(`Employee has active risk flags (Pending Returns or Deductions).`);
        }

        return {
            valid: true,
            warnings
        };
    }
}

module.exports = new EligibilityService();
