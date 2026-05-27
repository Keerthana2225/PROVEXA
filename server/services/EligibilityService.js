const { Op } = require('sequelize');
const { Employee, IssueRecord, ReplacementRequest, Item, ItemCategory } = require('../models');
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

        // --- Extracted Employee Parameters ---
        const empType = employee.employee_type || 'Permanent Employee';
        const isUnion = employee.is_union_member === true || empType === 'Union Operator';
        const gender = employee.gender || 'Male';
        const dept = employee.department || '';
        const desig = employee.designation || '';
        const gradeStr = employee.grade || '';
        const altAttire = employee.is_alternative_attire === true && gender === 'Female';

        // DOJ handling
        const doj = employee.doj ? dayjs(employee.doj) : dayjs();
        const daysJoined = dayjs().diff(doj, 'day');

        // --- 1. Dynamic Quota Policies Calculations ---
        let pantAllowed = 0;
        let shirtAllowed = 0;
        let tshirtAllowed = 1;
        let socksAllowed = 2;
        let uniformCycleText = '';

        // Detect if this is a first-time new joiner who hasn't received their joining kit yet.
        // New joining kit applies to ALL employee types (including Trainees/Interns).
        // Condition: joined within last 90 days AND has never received any uniform item.
        const hasReceivedUniform = activeIssues.some(i => {
            const n = (i.item_name || i.item?.name || '').toLowerCase();
            return n.includes('pant') || n.includes('shirt') || n.includes('socks')
                || n.includes('chudidhar') || n.includes('coat');
        });
        const isNewJoining = daysJoined < 90; // All employees in first 90 days use new joining kit quota

        if (isNewJoining) {
            // First-time joining kit for ALL employee types
            pantAllowed = 3;
            shirtAllowed = 2;
            tshirtAllowed = 1;
            socksAllowed = 2;
            uniformCycleText = 'New Joining Kit';
        } else if (empType === 'Intern' || empType === 'Trainee') {
            pantAllowed = 2;
            shirtAllowed = 2;
            tshirtAllowed = 1;
            socksAllowed = 2;
            uniformCycleText = empType === 'Intern' ? 'Intern/Trainee Allocation' : 'Trainee Annual Allocation';
        } else if (empType === 'Newcomer') {
            pantAllowed = 3;
            shirtAllowed = 2;
            tshirtAllowed = 1;
            socksAllowed = 2;
            uniformCycleText = 'New Joining Kit';
        } else {
            // Permanent, Operator, Union Operator, Supervisor, etc.
            if (daysJoined < 365) {
                // First Year Allocation
                pantAllowed = 2;
                shirtAllowed = 2;
                tshirtAllowed = 1;
                socksAllowed = 2;
                uniformCycleText = 'First Year Allocation';
            } else {
                // Subsequent Years Allocation — same as Year 1
                pantAllowed = 2;
                shirtAllowed = 2;
                tshirtAllowed = 1;
                socksAllowed = 2;
                uniformCycleText = 'Annual Allocation';
            }
        }

        // Alternative Attire item name resolution
        const pantName = altAttire ? 'Chudidhar Bottom' : 'Pant';
        const shirtName = altAttire ? 'Chudidhar Top' : 'Shirt';
        const tshirtName = altAttire ? 'Chudidhar Coat' : 'T-Shirt';
        const socksName = 'Socks';

        // Female Coat Policy — mandatory for all females EXCEPT Corporate Employee
        let coatAllowed = 0;
        let coatStatus = 'Not Eligible';
        if (gender === 'Female' && empType !== 'Corporate Employee') {
            coatAllowed = 1;
            coatStatus = 'Mandatory';
        }

        // Footwear Allocation
        let footwearName = 'Shoe (BATA)';
        if (empType === 'Trainee' || empType === 'Intern') {
            footwearName = 'Safety Shoes';
        } else if (empType === 'Supervisor' || empType === 'Union Operator' || desig === 'Supervisor' || desig === 'Union Operator') {
            footwearName = 'Liberty Shoes';
        } else if (['Production', 'Maintenance', 'Quality', 'Stores', 'Shop Floor'].includes(dept)) {
            footwearName = 'Safety Shoes';
        }

        let shoeAllowed = 1;

        // Safety Helmet Eligibility
        let isGradeEligible = false;
        const gradeMatch = gradeStr.match(/\d+/);
        if (gradeMatch) {
            const gradeNum = parseInt(gradeMatch[0]);
            if (gradeNum <= 13) isGradeEligible = true;
        }
        const isOperator = ['Operator', 'Union Operator'].includes(empType) || desig.toLowerCase().includes('operator');
        const isSupervisor = ['Supervisor'].includes(empType) || desig.toLowerCase().includes('supervisor');
        const isHelmetEligible = empType !== 'Intern' && empType !== 'Trainee' && (
            isOperator ||
            (isSupervisor && isGradeEligible)
        );

        // Safety Spectacles Eligibility — Union Operators only (3-year renewal)
        const isSpectaclesEligible = isUnion && employee.status !== 'resigned';

        // Raincoat Eligibility
        const isRaincoatEligible = empType !== 'Intern' && empType !== 'Trainee' && (['Operator', 'Union Operator'].includes(empType) || desig.toLowerCase().includes('operator'));

        // Bedsheet Eligibility — only for Union employees (part of the Union linen program)
        const isBedsheetEligible = isUnion && employee.status !== 'resigned';

        // Towel Quarterly Eligibility (Union Linen program)
        const isTowelEligible = isUnion && employee.status !== 'resigned';
        const currentMonth = dayjs().month() + 1; // 1-12
        let currentQuarterTowel = 'N/A';
        let currentQuarterTowelIssue = 'N/A';
        if (isTowelEligible) {
            if (currentMonth >= 1 && currentMonth <= 3) {
                currentQuarterTowel = 'Turkey Towel';
                currentQuarterTowelIssue = 'First Week of April';
            } else if (currentMonth >= 4 && currentMonth <= 6) {
                currentQuarterTowel = '3-Piece Towel Set';
                currentQuarterTowelIssue = 'First Week of July';
            } else if (currentMonth >= 7 && currentMonth <= 9) {
                currentQuarterTowel = 'Bedsheet'; // Bedsheet is issued as towel split in Q3
                currentQuarterTowelIssue = 'First Week of October';
            } else {
                currentQuarterTowel = '3-Piece Towel Set';
                currentQuarterTowelIssue = 'First Week of January';
            }
        }

        // Soap Eligibility & Quarterly counts (Standard Operator only, excluding Union Operators / union members)
        const isSoapEligible = (empType === 'Operator' || desig.toLowerCase().includes('operator')) && !isUnion && employee.status !== 'resigned';
        let currentQuarterSoapCount = 0;
        if (isSoapEligible) {
            if (daysJoined <= 90) {
                currentQuarterSoapCount = 3; // First 3 months: 3 soaps per quarter
            } else {
                currentQuarterSoapCount = 4; // After 3 months: 4 soaps per quarter
            }
        }

        // Sweet Box Eligibility (All get Standard; Union get bonus)
        const sweetBoxEventStandard = 1;
        const sweetBoxEventBonus = isUnion ? 1 : 0;
        const sweetBoxEventTotal = sweetBoxEventStandard + sweetBoxEventBonus;

        // --- Helper to aggregate issued items in active holdings ---
        // Uses exact name match or startsWith+space to prevent 'Shirt' matching 'T-Shirt',
        // or 'T-Shirt' matching 'Intern T-Shirt', etc.
        const nameMatches = (itemName, targetNames) => {
            const n = itemName.toLowerCase();
            return targetNames.some(name => {
                const kw = name.toLowerCase();
                return n === kw || n.startsWith(kw + ' ');
            });
        };

        const getIssuedQty = (names) => {
            return activeIssues
                .filter(i => {
                    const n = (i.item_name || i.item?.name || '');
                    return nameMatches(n, names);
                })
                .reduce((sum, i) => sum + (i.quantity || 1), 0);
        };

        // --- Helper to get last active next_due_date ---
        const getNextDueDate = (names) => {
            const list = activeIssues.filter(i => {
                const n = (i.item_name || i.item?.name || '');
                return nameMatches(n, names);
            });
            if (list.length > 0 && list[0].next_due_date) {
                return list[0].next_due_date;
            }
            return null;
        };


        // --- Uniform Annual Cycle Start ---
        // Each year the employee gets a fresh quota. Cycle resets on their joining anniversary.
        // Year 0 (0–364 days):   2P, 2S, 1TS  — cycle starts at DOJ
        // Year 1+ (365+ days):   3P, 3S, 1TS  — cycle starts at last anniversary
        // Newcomers: entire allocation starts from DOJ (no cycle split).
        const yearsCompleted = Math.floor(daysJoined / 365);
        const uniformCycleStart = empType === 'Newcomer'
            ? doj                                               // full kit from DOJ
            : doj.add(yearsCompleted * 365, 'day');            // current anniversary start

        // Counts uniform items issued ONLY within the current annual cycle.
        const getUniformIssuedQty = (names) => {
            return activeIssues
                .filter(i => {
                    const n = (i.item_name || i.item?.name || '');
                    if (!nameMatches(n, names)) return false;
                    // Only count if issued on or after current cycle start
                    return dayjs(i.issued_date).valueOf() >= uniformCycleStart.valueOf();
                })
                .reduce((sum, i) => sum + (i.quantity || 1), 0);
        };

        // --- 2. Allocation Summary Table Builders ---
        const allocationSummary = [];

        // Uniform Items — use cycle-scoped count so Year 1 items don't eat into Year 2 quota
        const pantIssued = getUniformIssuedQty(['Pant', 'Chudidhar Bottom']);

        allocationSummary.push({
            item: pantName,
            allowed: pantAllowed,
            issued: pantIssued,
            remaining: Math.max(0, pantAllowed - pantIssued),
            status: pantIssued >= pantAllowed ? 'Limit Reached' : 'Eligible',
            cycle: uniformCycleText
        });

        const shirtIssued = getUniformIssuedQty(['Shirt', 'Chudidhar Top']);
        allocationSummary.push({
            item: shirtName,
            allowed: shirtAllowed,
            issued: shirtIssued,
            remaining: Math.max(0, shirtAllowed - shirtIssued),
            status: shirtIssued >= shirtAllowed ? 'Limit Reached' : 'Eligible',
            cycle: uniformCycleText
        });

        const tshirtIssued = getUniformIssuedQty(['T-Shirt', 'Chudidhar Coat', 'Intern T-Shirt']);
        allocationSummary.push({
            item: tshirtName,
            allowed: tshirtAllowed,
            issued: tshirtIssued,
            remaining: Math.max(0, tshirtAllowed - tshirtIssued),
            status: tshirtIssued >= tshirtAllowed ? 'Limit Reached' : 'Eligible',
            cycle: uniformCycleText
        });

        const socksIssued = getUniformIssuedQty(['Socks']);
        allocationSummary.push({
            item: socksName,
            allowed: socksAllowed,
            issued: socksIssued,
            remaining: Math.max(0, socksAllowed - socksIssued),
            status: socksIssued >= socksAllowed ? 'Limit Reached' : 'Eligible',
            cycle: uniformCycleText
        });

        // Female Coat (if eligible)
        if (gender === 'Female') {
            const coatIssued = getIssuedQty(['Coat']);
            allocationSummary.push({
                item: 'Coat',
                allowed: coatAllowed,
                issued: coatIssued,
                remaining: Math.max(0, coatAllowed - coatIssued),
                status: coatStatus, // Mandatory or Optional
                cycle: 'Annual Renewal'
            });
        }

        // Footwear (Shoes)
        const shoeIssued = getIssuedQty(['Safety Shoes', 'Liberty Shoes', 'BATA', 'Shoe']);
        allocationSummary.push({
            item: footwearName,
            allowed: shoeAllowed,
            issued: shoeIssued,
            remaining: Math.max(0, shoeAllowed - shoeIssued),
            status: shoeAllowed <= 0 ? 'Not Eligible' : (shoeIssued >= shoeAllowed ? 'Limit Reached' : 'Eligible'),
            cycle: shoeAllowed <= 0 ? 'N/A' : 'Every 1 Year'
        });

        // Safety Helmet
        if (isHelmetEligible) {
            const helmetIssued = getIssuedQty(['Safety Helmet']);
            allocationSummary.push({
                item: 'Safety Helmet',
                allowed: 1,
                issued: helmetIssued,
                remaining: Math.max(0, 1 - helmetIssued),
                status: helmetIssued >= 1 ? 'Limit Reached' : 'Eligible',
                cycle: 'Every 2 Years'
            });
        }

        // Safety Spectacles
        if (isSpectaclesEligible) {
            const specIssued = getIssuedQty(['Safety Spectacles']);
            allocationSummary.push({
                item: 'Safety Spectacles',
                allowed: 1,
                issued: specIssued,
                remaining: Math.max(0, 1 - specIssued),
                status: specIssued >= 1 ? 'Limit Reached' : 'Eligible',
                cycle: 'Every 3 Years'
            });
        }

        // Raincoat
        if (isRaincoatEligible) {
            const rainIssued = getIssuedQty(['raincoat', 'Raincoat']);
            allocationSummary.push({
                item: 'Raincoat',
                allowed: 1,
                issued: rainIssued,
                remaining: Math.max(0, 1 - rainIssued),
                status: rainIssued >= 1 ? 'Limit Reached' : 'Eligible',
                cycle: 'Every 3 Years'
            });
        }

        // Bedsheet
        if (isBedsheetEligible) {
            const bedIssued = getIssuedQty(['Bedsheet']);
            allocationSummary.push({
                item: 'Bedsheet',
                allowed: 1,
                issued: bedIssued,
                remaining: Math.max(0, 1 - bedIssued),
                status: bedIssued >= 1 ? 'Limit Reached' : 'Eligible',
                cycle: 'Every 1 Year'
            });
        }

        // Yearly Calendar (Allowed: 1, Cycle: Every 1 Year)
        const calendarIssued = getIssuedQty(['Yearly Calendar', 'Monthly Calendar']);
        allocationSummary.push({
            item: 'Yearly Calendar',
            allowed: 1,
            issued: calendarIssued,
            remaining: Math.max(0, 1 - calendarIssued),
            status: calendarIssued >= 1 ? 'Limit Reached' : 'Eligible',
            cycle: 'Every 1 Year'
        });

        const currentQuarter = Math.ceil(currentMonth / 3);
        const issuedSoapQuarterly = activeIssues
            .filter(i => {
                const n = (i.item_name || i.item?.name || '').toLowerCase();
                if (!n.includes('soap')) return false;
                const issuedMonth = dayjs(i.issued_date).month() + 1;
                const issuedQuarter = Math.ceil(issuedMonth / 3);
                return issuedQuarter === currentQuarter && dayjs(i.issued_date).year() === dayjs().year();
            })
            .reduce((sum, i) => sum + (i.quantity || 1), 0);

        const totalAnnualSoaps = activeIssues
            .filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('soap') && dayjs(i.issued_date).year() === dayjs().year())
            .reduce((sum, i) => sum + (i.quantity || 1), 0);

        const hasTowelIssuedThisQuarter = activeIssues.some(i => {
            const name = (i.item_name || i.item?.name || '').toLowerCase();
            const issuedMonth = dayjs(i.issued_date).month() + 1;
            const issuedQuarter = Math.ceil(issuedMonth / 3);
            const issuedYear = dayjs(i.issued_date).year();
            return (name.includes('towel') || name === 'bedsheet') && issuedQuarter === currentQuarter && issuedYear === dayjs().year();
        });

        const welfareBenefits = {
            soap: {
                eligible: isSoapEligible,
                allowedQuarterly: currentQuarterSoapCount,
                issuedQuarterly: issuedSoapQuarterly,
                remainingQuarterly: Math.max(0, currentQuarterSoapCount - issuedSoapQuarterly),
                totalAnnualSoaps,
                allowedAnnual: isSoapEligible ? 45 : 0,
                remainingAnnualSoaps: Math.max(0, (isSoapEligible ? 45 : 0) - totalAnnualSoaps),
            },
            towel: (() => {
                const linenIssued = activeIssues.filter(i => {
                    const n = (i.item_name || i.item?.name || '').toLowerCase();
                    return (n.includes('towel') || n.includes('bedsheet')) && dayjs(i.issued_date).year() === dayjs().year();
                });
                return {
                    eligible: isTowelEligible,
                    currentQuarterItem: currentQuarterTowel,
                    nextIssueDate: currentQuarterTowelIssue,
                    hasIssuedThisQuarter: hasTowelIssuedThisQuarter,
                    totalIssuedThisYear: linenIssued.reduce((sum, i) => sum + (i.quantity || 1), 0),
                    breakdown: linenIssued.map(i => {
                        const month = dayjs(i.issued_date).month() + 1; // 1-12
                        const qtr = Math.ceil(month / 3);
                        const qtrLabel = qtr === 1 ? 'Q1 (Jan–Mar)' : qtr === 2 ? 'Q2 (Apr–Jun)' : qtr === 3 ? 'Q3 (Jul–Sep)' : 'Q4 (Oct–Dec)';
                        return {
                            name: i.item?.name || i.item_name || 'Linen Item',
                            date: i.issued_date,
                            quantity: i.quantity || 1,
                            quarter: qtrLabel
                        };
                    }).sort((a, b) => {
                            // Sort by quarter number so display order is always:
                            // Q1 Turkey Towel → Q2 3-Piece Towel Set → Q3 Bedsheet → Q4 3-Piece Towel Set
                            const qNum = label => parseInt(label.charAt(1)); // 'Q2 (Apr–Jun)' → 2
                            const diff = qNum(a.quarter) - qNum(b.quarter);
                            if (diff !== 0) return diff;
                            return new Date(a.date) - new Date(b.date); // secondary: oldest first within same quarter
                        })
                };
            })(),

            sweetBox: {
                standardBoxes: sweetBoxEventStandard,
                bonusBoxes: sweetBoxEventBonus,
                totalPerEvent: sweetBoxEventTotal,
                eventsReceived: activeIssues
                    .filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('sweet box'))
                    .map(i => ({
                        event: i.notes || 'Festival Event',
                        qty: i.quantity || 1,
                        date: i.issued_date
                    }))
            },
            boost: {
                eligible: true, // Blood donation based
                totalBoostPackets: activeIssues
                    .filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('boost'))
                    .reduce((sum, i) => sum + (i.quantity || 1), 0),
                donations: activeIssues
                    .filter(i => (i.item_name || i.item?.name || '').toLowerCase().includes('boost'))
                    .map(i => ({
                        date: i.issued_date,
                        quantity: i.quantity || 1,
                        remarks: i.notes || 'Blood Donation Benefit'
                    }))
            }
        };

        // --- 3. Risks & Warnings Flags ---
        const risks = [];
        let excessAllocations = 0;
        
        allocationSummary.forEach(sum => {
            if (sum.issued > sum.allowed && sum.allowed > 0) {
                excessAllocations++;
            }
        });

        const upcomingRenewals = activeIssues.filter(i => i.next_due_date && dayjs(i.next_due_date).isBefore(dayjs().add(30, 'day')));
        if (upcomingRenewals.length > 0) risks.push({ type: 'renewal', label: 'Renewal Due Soon', severity: 'info' });
        if (excessAllocations > 0) risks.push({ type: 'excess', label: 'Excess Quota Allocation', severity: 'warning' });

        // --- 4. Historical Timelines Builder ---
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
                title: tx.issues.length > 1 ? 'Items Distributed' : `${tx.issues[0].item?.name || tx.issues[0].item_name || 'Item'} Distributed`,
                subtitle: tx.issues.length > 1 ? `${itemsList}\n\nStatus: ${tx.status}` : `Qty: ${tx.issues[0].quantity || 1} • Status: ${tx.status}`,
                icon: 'FileText'
            });

            if (tx.verified && tx.ack_time) {
                timeline.push({
                    id: `tx_verify_${txId}`,
                    date: tx.ack_time,
                    type: 'verification',
                    title: `Distribution Acknowledged`,
                    subtitle: `Method: ${tx.method}\nStatus: Electronically Signed`,
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
                    title: `${issue.item?.name || 'Item'} Returned / Exchanged`,
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

        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        // --- 5. Upcoming Renewal Calendar Arrays ---
        // Welfare/event items have no renewal cycle — exclude them from this view.
        const WELFARE_KEYWORDS = ['boost', 'soap', 'sweet box', 'towel', 'bedsheet', 'turkey towel', '3-piece towel'];
        const renewalCalendar = [];
        activeIssues.forEach(i => {
            if (i.next_due_date) {
                const name = (i.item?.name || i.item_name || '').toLowerCase();
                const isWelfare = WELFARE_KEYWORDS.some(kw => name.includes(kw));
                if (isWelfare) return; // skip — not a renewable item

                const daysRemaining = dayjs(i.next_due_date).diff(dayjs(), 'day');
                let status = 'Active';
                if (daysRemaining < 0) status = 'Overdue';
                else if (daysRemaining <= 30) status = 'Renewal Due';
                
                renewalCalendar.push({
                    itemName: i.item?.name || i.item_name || 'Item',
                    issuedDate: i.issued_date,
                    nextDueDate: i.next_due_date,
                    daysRemaining,
                    status
                });
            }
        });

        const empJson = employee.toJSON();
        empJson.sizes = {
            shirt: employee.getDataValue('sizes_shirt') || '',
            pant:  employee.getDataValue('sizes_pant')  || '',
            shoe:  employee.getDataValue('sizes_shoe')  || ''
        };

        const eligibleKeywords = [];
        if (pantAllowed > 0) {
            eligibleKeywords.push('Pant');
            // Female employees can choose Chudidhar Bottom as alternative to Pant
            if (gender === 'Female') eligibleKeywords.push('Chudidhar Bottom');
        }
        if (shirtAllowed > 0) {
            eligibleKeywords.push('Shirt');
            // Female employees can choose Chudidhar Top as alternative to Shirt
            if (gender === 'Female') eligibleKeywords.push('Chudidhar Top');
        }
        if (tshirtAllowed > 0) {
            eligibleKeywords.push('T-Shirt');
            // Female employees can choose Chudidhar Coat as alternative to T-Shirt
            if (gender === 'Female') eligibleKeywords.push('Chudidhar Coat');
            if (empType === 'Intern' || empType === 'Trainee') {
                eligibleKeywords.push('Intern T-Shirt');
            }
        }
        if (socksAllowed > 0) eligibleKeywords.push(socksName);
        if (shoeAllowed > 0) eligibleKeywords.push(footwearName);
        // Shirt Full Sleeve: not for Interns or Trainees
        if (shirtAllowed > 0 && empType !== 'Intern' && empType !== 'Trainee') eligibleKeywords.push('Shirt Full Sleeve');
        
        eligibleKeywords.push('Yearly Calendar');
        if (gender === 'Female' && coatAllowed > 0) eligibleKeywords.push('Coat');
        if (isHelmetEligible) eligibleKeywords.push('Safety Helmet');
        if (isSpectaclesEligible) eligibleKeywords.push('Safety Spectacles');
        if (isRaincoatEligible) eligibleKeywords.push('Raincoat');
        if (isBedsheetEligible) eligibleKeywords.push('Bedsheet');

        // --- Additional Costs Summary ---
        // Build the additionalCosts object the frontend expects:
        // { total, items[], breakdown[{ reason, amount }] }
        const additionalItems = replacements.filter(r =>
            r.allocation_type === 'Additional' &&
            (r.status?.toLowerCase() === 'completed' || r.status?.toLowerCase() === 'approved')
        );
        const additionalTotal = additionalItems.reduce((sum, r) => sum + (parseFloat(r.total_cost) || 0), 0);
        const additionalBreakdown = Object.values(
            additionalItems.reduce((acc, r) => {
                const key = r.reason || 'Other';
                if (!acc[key]) acc[key] = { reason: key, amount: 0 };
                acc[key].amount += parseFloat(r.total_cost) || 0;
                return acc;
            }, {})
        );

        return {
            employee: empJson,
            employee_type: empType,
            uniformCycleText,
            isNewJoining,
            eligibility: eligibleKeywords,
            additionalCosts: {
                total: additionalTotal,
                items: additionalItems,
                breakdown: additionalBreakdown
            },
            allocations: {
                summary: allocationSummary,
                active: activeIssues,
                additionalHoldings: replacements.filter(r => (r.status?.toLowerCase() === 'completed' || r.status?.toLowerCase() === 'approved') && r.allocation_type !== 'Standard'),
                additional: replacements.filter(r => r.allocation_type === 'Additional')
            },
            welfareBenefits,
            renewalCalendar,
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
            where: { id: { [Op.in]: itemIds } },
            include: [{ model: ItemCategory }] 
        });
        const items = itemsModel.map(i => i.toJSON());

        const errors = [];
        const warnings = [];

        items.forEach(item => {
            const catName = item.ItemCategory?.name || '';
            const itemName = item.name || '';
            const itemLower = itemName.toLowerCase();

            if (itemLower.includes('soap')) {
                const soap = profile.welfareBenefits?.soap;
                if (!soap?.eligible) {
                    warnings.push(`Employee is NOT eligible for Soap under current company policies.`);
                } else if (soap.remainingQuarterly <= 0) {
                    warnings.push(`Soap quota for the current quarter has already been reached. Proceeding will trigger an HR Override.`);
                }
            } else if (itemLower.includes('towel') || (itemLower === 'bedsheet' && (profile.employee.is_union_member === true || profile.employee_type === 'Union Operator'))) {
                const towel = profile.welfareBenefits?.towel;
                if (!towel?.eligible) {
                    warnings.push(`Employee is NOT eligible for the Union Linen Distribution Program.`);
                } else if (towel.hasIssuedThisQuarter) {
                    warnings.push(`Employee has already received their Union Linen distribution for the current quarter.`);
                }
            } else if (itemLower.includes('sweet box')) {
                // All active employees are eligible, standard event notes are checked during issue
            } else if (itemLower.includes('boost')) {
                // Benefit triggered (blood donation), no warning
            } else {
                // Standard annual/renewal items
                const summary = profile.allocations.summary.find(s => 
                    s.item.toLowerCase() === itemName.toLowerCase() ||
                    s.item.toLowerCase() === catName.toLowerCase() ||
                    (itemLower.includes('shirt') && s.item.toLowerCase().includes('shirt'))
                );

                if (summary) {
                    if (summary.remaining <= 0 && summary.allowed > 0) {
                        warnings.push(`Allocation quota exceeded for ${itemName || catName}. Proceeding will flag as an HR Override / Additional Request.`);
                    }
                } else {
                    warnings.push(`Employee is NOT eligible for item: ${itemName} under current company policies.`);
                }
            }
        });

        return {
            valid: true,
            warnings
        };
    }
}

module.exports = new EligibilityService();
