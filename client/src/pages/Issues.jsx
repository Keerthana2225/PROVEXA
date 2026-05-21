import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { FileText, Plus, PlusCircle, Search, Archive, History, RotateCcw, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Fingerprint, ScanLine, PenTool, Users } from 'lucide-react';
import api from '../lib/api';
import IssueForm from '../components/ui/IssueForm';
import Modal from '../components/ui/Modal';
import UnifiedVerificationModal from '../components/ui/UnifiedVerificationModal';
import EmployeeIdentificationModal from '../components/ui/EmployeeIdentificationModal';
import { toast } from '../components/ui/Toast';

export default function Issues() {
    const queryClient = useQueryClient();

    const [viewMode, setViewMode] = useState('active');
    const [showForm, setShowForm] = useState(false);
    const [showIdentification, setShowIdentification] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewSignatureUrl, setViewSignatureUrl] = useState(null);
    const [selectedProof, setSelectedProof] = useState(null);
    const [signingEmployee, setSigningEmployee] = useState(null);
    const [selectedIssueId, setSelectedIssueId] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetScope, setResetScope] = useState('all');
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const isHistory = viewMode === 'history';

    const { data: issues, isLoading } = useQuery({
        queryKey: ['issues', statusFilter, viewMode],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (isHistory) {
                params.set('lifecycle_status', 'Returned');
            } else {
                params.set('lifecycle_status', 'Active');
            }
            const { data } = await api.get(`/issues?${params.toString()}`);
            return data;
        }
    });

    const archiveMutation = useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.put('/issues/archive-reset', payload);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['dueTracking'] });
            toast.success(data.message || 'Issues archived successfully.');
            setShowResetModal(false);
            setSelectedIds([]);
            setIsSelectionMode(false);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to archive issues.')
    });

    const handleReset = () => {
        if (resetScope === 'selected') {
            if (selectedIds.length === 0) { toast.error('Select at least one record to archive.'); return; }
            archiveMutation.mutate({ scope: 'selected', issue_ids: selectedIds });
        } else {
            archiveMutation.mutate({ scope: 'all' });
        }
    };

    // Issue status badge
    const getIssueStatusBadge = (status) => {
        if (status === 'Acknowledged')
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3" /> Acknowledged</span>;
        if (status === 'Archived' || status === 'Reset Archived')
            return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-widest">Archived</span>;
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-widest animate-pulse"><Clock className="w-3 h-3" /> Pending</span>;
    };

    // Renewal date badge
    const getDueBadge = (dueDate) => {
        const due = dayjs(dueDate);
        const today = dayjs().startOf('day');
        const nextWeek = today.add(7, 'day');
        if (due.isBefore(today))
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wide">Renewal Due</span>;
        if (due.isBefore(nextWeek))
            return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide">Upcoming Renewal</span>;
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">Valid</span>;
    };

    const handleSignClick = (employee, issueId = null) => {
        if (!issues) return;
        if (issueId) {
            setSelectedIssueId(issueId);
            setSigningEmployee(employee);
            setPendingCount(1);
        } else {
            const count = issues.filter(i => i.employee?.id === employee.id && !i.acknowledged).length;
            setPendingCount(count);
            setSigningEmployee(employee);
            setSelectedIssueId(null);
        }
    };

    const filtered = useMemo(() => {
        if (!issues) return [];
        let result = issues;
        if (search) {
            const q = search.trim().toLowerCase();
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');
            const isNumericOnly = /^\d+$/.test(q);
            result = result.filter(i =>
                wordRegex.test(i.employee?.name || '') ||
                (!isNumericOnly && i.employee?.emp_code?.toLowerCase().includes(q)) ||
                i.item?.name?.toLowerCase().includes(q)
            );
        }
        return [...result].sort((a, b) => {
            // Sort by issued_date descending (recent on top)
            const dateA = dayjs(a.issued_date);
            const dateB = dayjs(b.issued_date);
            if (!dateA.isSame(dateB)) {
                return dateB.isAfter(dateA) ? 1 : -1;
            }
            // Secondary: Acknowledged/Verified first
            const statusA = a.issue_status === 'Acknowledged' || a.acknowledged ? 1 : 0;
            const statusB = b.issue_status === 'Acknowledged' || b.acknowledged ? 1 : 0;
            return statusB - statusA;
        });
    }, [issues, search]);

    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) setSelectedIds([]);
        else setSelectedIds(filtered.map(i => i.id || i._id));
    };

    const filterButtons = [
        { val: '', label: 'All', color: 'slate' },
        { val: 'renewal_due', label: '⏳ Renewal Due', color: 'orange' },
        { val: 'pending_ack', label: '✍️ Pending Signature', color: 'amber' },
        { val: 'acknowledged', label: '✅ Acknowledged', color: 'emerald' },
        { val: 'upcoming', label: '📅 Upcoming Renewal', color: 'amber' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">

            {/* ── Toolbar ── */}
            <div className="flex flex-col gap-4">

                {/* Row 1: Search + View toggle + Actions */}
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employee or item..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                        />
                    </div>

                    {/* View toggle */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => { setViewMode('active'); setSelectedIds([]); setStatusFilter(''); }}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'active' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileText className="w-4 h-4" /> Active Issues
                        </button>
                        <button
                            onClick={() => { setViewMode('history'); setSelectedIds([]); setStatusFilter(''); }}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'history' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <History className="w-4 h-4" /> Issue History
                        </button>
                    </div>

                    <div className="flex gap-2 ml-auto shrink-0">
                        {!isHistory && (
                            <button
                                onClick={() => {
                                    setIsSelectionMode(!isSelectionMode);
                                    if (isSelectionMode) setSelectedIds([]);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm border ${isSelectionMode ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                            >
                                <RotateCcw className={`w-4 h-4 ${isSelectionMode ? 'animate-spin-once' : ''}`} />
                                {isSelectionMode ? 'Cancel Selection' : 'Reset Issues'}
                            </button>
                        )}
                        {!isHistory && isSelectionMode && (
                            <button
                                onClick={() => { setResetScope('all'); setShowResetModal(true); }}
                                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm shadow-sm"
                            >
                                <Archive className="w-4 h-4" /> Reset All Active
                            </button>
                        )}
                        {!isHistory && (
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setShowIdentification(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase tracking-wider"
                                >
                                    <ScanLine className="w-4 h-4" /> Identify & Issue
                                </button>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95 tracking-wider"
                                >
                                    <Users className="w-4 h-4" /> Bulk Issue
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Status filters (active view only) */}
                {!isHistory && (
                    <div className="flex gap-2 flex-wrap">
                        {filterButtons.map(s => (
                            <button key={s.val} onClick={() => setStatusFilter(s.val)}
                                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap
                                    ${statusFilter === s.val
                                        ? 'bg-primary text-white border-primary shadow-md scale-[1.02]'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selection bar */}
            {!isHistory && selectedIds.length > 0 && (
                <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-blue-700">{selectedIds.length} record(s) selected</span>
                    <button
                        onClick={() => { setResetScope('selected'); setShowResetModal(true); }}
                        className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Archive className="w-3.5 h-3.5" /> Archive Selected
                    </button>
                    <button onClick={() => setSelectedIds([])} className="text-xs text-blue-500 hover:text-blue-700 ml-auto">Clear</button>
                </div>
            )}

            {/* History info banner */}
            {isHistory && (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700">
                    <History className="w-4 h-4 flex-shrink-0" />
                    <span>Viewing archived issue history. These records are preserved for audit purposes only.</span>
                </div>
            )}

            {/* ── Table ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 border-collapse">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-slate-200 dark:border-slate-700 z-10">
                            <tr>
                                {isSelectionMode && !isHistory && (
                                    <th className="px-4 py-3 w-10 bg-slate-50 dark:bg-slate-800">
                                        <input type="checkbox"
                                            checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                            onChange={toggleSelectAll}
                                            className="rounded cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3 bg-slate-50 dark:bg-slate-800">Employee Details</th>
                                <th className="px-6 py-3 bg-slate-50 dark:bg-slate-800">Item Issued</th>
                                <th className="px-6 py-3 text-center bg-slate-50 dark:bg-slate-800">Qty</th>
                                <th className="px-6 py-3 bg-slate-50 dark:bg-slate-800">Issue Date</th>
                                <th className="px-6 py-3 bg-slate-50 dark:bg-slate-800">Status</th>
                                <th className="px-6 py-3 text-right bg-slate-50 dark:bg-slate-800">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(7)].map((_, j) => (
                                            <td key={j} className="px-6 py-3"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-20 text-center">
                                        {isHistory
                                            ? <><History className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No archived records found</p></>
                                            : <><FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No records found</p><p className="text-slate-400 text-sm mt-1">Try a different filter or issue an item.</p></>
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(issue => {
                                    const issueId = issue.id || issue._id;
                                    const isSelected = selectedIds.includes(issueId);
                                    const isPending = !issue.acknowledged && issue.issue_status === 'Pending Acknowledgement';
                                    const isAcknowledged = issue.acknowledged;
 
                                    return (
                                        <tr key={issueId}
                                            className={`transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}>
                                            {isSelectionMode && !isHistory && (
                                                <td className="px-4 py-2.5">
                                                    <input type="checkbox" checked={isSelected}
                                                        onChange={() => toggleSelect(issueId)}
                                                        className="rounded cursor-pointer"
                                                    />
                                                </td>
                                            )}
 
                                            {/* Employee */}
                                            <td className="px-6 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                                                        {issue.employee?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-xs leading-none">{issue.employee?.name || 'Unknown'}</div>
                                                        <div className="text-[9px] text-slate-400 font-mono mt-1 leading-none">{issue.employee?.emp_code || 'N/A'} · {issue.employee?.department || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
 
                                            {/* Item */}
                                            <td className="px-6 py-2.5">
                                                <div className="font-bold text-slate-900 dark:text-slate-200 text-xs leading-none">{issue.item?.name || 'Unknown Item'}</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-semibold mt-1 leading-none">{issue.item?.category?.name || 'N/A'}</div>
                                            </td>
 
                                            {/* Qty */}
                                            <td className="px-6 py-2.5 text-center">
                                                <span className="inline-block font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{issue.quantity}</span>
                                            </td>
 
                                            {/* Date */}
                                            <td className="px-6 py-2.5">
                                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-none">{dayjs(issue.issued_date).format('DD MMM YYYY')}</div>
                                                <div className="text-[9px] text-slate-400 mt-1 leading-none">Due: {dayjs(issue.next_due_date).format('DD MMM YYYY')}</div>
                                            </td>
 
                                            {/* Status */}
                                            <td className="px-6 py-2.5">
                                                <div className="flex flex-col gap-1">
                                                    {getIssueStatusBadge(issue.archived ? 'Archived' : issue.issue_status)}
                                                    {getDueBadge(issue.next_due_date)}
                                                </div>
                                            </td>
 
                                            {/* Actions */}
                                            <td className="px-6 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isAcknowledged ? (
                                                        <button 
                                                            onClick={() => setSelectedProof(issue)} 
                                                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 border ${
                                                                issue.verification_method?.toLowerCase().includes('ocr') 
                                                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100' 
                                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white border-slate-200/60'
                                                            }`}
                                                            title={`View Proof (Verified via ${issue.verification_method || 'Signature'})`}
                                                        >
                                                            {issue.verification_method?.toLowerCase().includes('ocr') ? (
                                                                <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:text-white" />
                                                            ) : (
                                                                <PenTool className="w-4 h-4 text-slate-600 group-hover:text-white" />
                                                            )}
                                                        </button>
                                                    ) : !isHistory ? (
                                                        <button
                                                            onClick={() => handleSignClick(issue.employee, issueId)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow active:scale-95 uppercase tracking-widest"
                                                        >
                                                            <ShieldCheck className="w-3 h-3" /> Verify
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-400 italic">Archived</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modals ── */}
            <EmployeeIdentificationModal isOpen={showIdentification} onClose={() => setShowIdentification(false)} />
            <IssueForm isOpen={showForm} onClose={() => setShowForm(false)} />

            <UnifiedVerificationModal
                isOpen={!!signingEmployee}
                onClose={() => { setSigningEmployee(null); setSelectedIssueId(null); }}
                employee={signingEmployee}
                issueId={selectedIssueId}
                pendingCount={pendingCount}
            />


            {/* Signature viewer */}
            {/* Handover Verification Proof Modal */}
            <Modal
                isOpen={!!selectedProof}
                onClose={() => setSelectedProof(null)}
                title="Handover Verification Proof"
                maxWidth="max-w-xl"
            >
                {selectedProof && (
                    <div className="p-6 space-y-6">
                        {/* Header Badge */}
                        <div className="flex flex-col items-center justify-center text-center space-y-3 pb-2 border-b border-slate-100">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-md">
                                <ShieldCheck className="w-9 h-9" />
                            </div>
                            <div className="space-y-1">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-750 border border-emerald-100 uppercase tracking-widest">
                                    Secure Handover Verified
                                </span>
                                <h4 className="text-lg font-black text-slate-900 tracking-tight mt-1">
                                    {selectedProof.employee_name || selectedProof.employee?.name || 'Employee Handover'}
                                </h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    {selectedProof.employee?.emp_code || '---'} · {selectedProof.employee?.department || 'GENERAL'}
                                </p>
                            </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Issued</span>
                                <span className="text-xs font-bold text-slate-800">{selectedProof.item_name || selectedProof.item?.name}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Specifications</span>
                                <span className="text-xs font-bold text-slate-800">Qty: {selectedProof.quantity || 1} / Cond: {selectedProof.item_condition || 'Good'}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Handover Method</span>
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                    {selectedProof.verification_method?.toLowerCase().includes('ocr') ? (
                                        <ScanLine className="w-3.5 h-3.5 text-blue-650" />
                                    ) : (
                                        <Fingerprint className="w-3.5 h-3.5 text-purple-650" />
                                    )}
                                    {selectedProof.verification_method || 'Signature'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified At</span>
                                <span className="text-xs font-bold text-slate-800">
                                    {selectedProof.acknowledgement_time ? dayjs(selectedProof.acknowledgement_time).format('DD MMM YYYY, hh:mm A') : '---'}
                                </span>
                            </div>
                        </div>

                        {/* Visual Proof Section */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Evidence</label>
                            
                            {/* Case A: Digital Signature */}
                            {selectedProof.signature_path && (
                                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Employee Digital Signature</span>
                                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 w-full flex justify-center">
                                        <img 
                                            src={`http://localhost:5000${selectedProof.signature_path}`} 
                                            alt="Employee Signature" 
                                            className="max-h-36 object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Case B: OCR Details */}
                            {selectedProof.ocr_details && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                                            <ScanLine className="w-3.5 h-3.5" /> OCR Scan Match Log
                                        </span>
                                        {selectedProof.ocr_details.confidence !== undefined && (
                                            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">
                                                Confidence: {Math.round(selectedProof.ocr_details.confidence * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between border-b border-blue-100/50 pb-1.5">
                                            <span className="text-slate-500">Scanned Code</span>
                                            <span className="font-mono font-bold text-slate-800">{selectedProof.ocr_details.employee?.emp_code || selectedProof.employee?.emp_code}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-blue-100/50 pb-1.5">
                                            <span className="text-slate-500">Scanned Holder</span>
                                            <span className="font-bold text-slate-800">{selectedProof.ocr_details.employee?.name || selectedProof.employee?.name}</span>
                                        </div>
                                        {selectedProof.ocr_details.device_info && (
                                            <div className="flex flex-col gap-1 pt-1">
                                                <span className="text-slate-500 text-[10px]">Scanner Device</span>
                                                <span className="font-mono text-[9px] text-slate-400 bg-slate-100/50 p-2 rounded-lg break-all leading-tight border border-slate-200/30">
                                                    {selectedProof.ocr_details.device_info}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Internal Remarks */}
                            {selectedProof.notes && (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Handover Notes / Remarks</span>
                                    <p className="text-xs text-slate-600 font-medium italic">"{selectedProof.notes}"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer button */}
                        <div className="pt-2">
                            <button
                                onClick={() => setSelectedProof(null)}
                                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 transition-all text-[10px] uppercase tracking-[0.2em] active:scale-95"
                            >
                                Close Proof
                            </button>
                        </div>
                    </div>
                )}
            </Modal>




            {/* Reset Confirmation Modal */}
            <Modal isOpen={showResetModal} onClose={() => { setShowResetModal(false); setResetScope('all'); }} title="Archive Issue Records">
                <div className="p-4 space-y-5">
                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                        <RotateCcw className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-800 text-sm">Archive Active Issue Records</p>
                            <p className="text-red-700 text-xs mt-1">
                                This will <strong>archive</strong> (not delete) active issue records so you can issue fresh items.
                                All archived records remain accessible in <em>Issue History</em> for audit purposes.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-700">Select scope:</p>
                        {[
                            { value: 'all', label: 'All active issues', desc: 'Archive every non-archived issue record' },
                            { value: 'selected', label: `Selected records (${selectedIds.length})`, desc: 'Archive only the checked rows' },
                        ].map(opt => (
                            <label key={opt.value}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${resetScope === opt.value ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="resetScope" value={opt.value}
                                    checked={resetScope === opt.value}
                                    onChange={() => setResetScope(opt.value)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                                    <div className="text-xs text-slate-500">{opt.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => { setShowResetModal(false); setResetScope('all'); }}
                            className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={archiveMutation.isPending || (resetScope === 'selected' && selectedIds.length === 0)}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            <Archive className="w-4 h-4" />
                            {archiveMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
