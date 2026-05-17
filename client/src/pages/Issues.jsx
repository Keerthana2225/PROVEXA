import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { FileText, Plus, PlusCircle, Search, Archive, History, RotateCcw, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import IssueForm from '../components/ui/IssueForm';
import Modal from '../components/ui/Modal';
import UnifiedVerificationModal from '../components/ui/UnifiedVerificationModal';
import { toast } from '../components/ui/Toast';

export default function Issues() {
    const queryClient = useQueryClient();

    const [viewMode, setViewMode] = useState('active');
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewSignatureUrl, setViewSignatureUrl] = useState(null);
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
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 transition-all active:scale-95 uppercase tracking-wider"
                                >
                                    <PlusCircle className="w-4 h-4" /> Issue New Item
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
                                                        <div className="flex flex-col items-end gap-1">
                                                             {issue.signature_path && (
                                                                <button
                                                                    onClick={() => setViewSignatureUrl(`http://localhost:5000${issue.signature_path}`)}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                                                                >
                                                                    View Proof
                                                                </button>
                                                            )}
                                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none mt-1">
                                                                Verified via {issue.verification_method || 'System'}
                                                            </div>
                                                        </div>
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
            <IssueForm isOpen={showForm} onClose={() => setShowForm(false)} />

            <UnifiedVerificationModal
                isOpen={!!signingEmployee}
                onClose={() => { setSigningEmployee(null); setSelectedIssueId(null); }}
                employee={signingEmployee}
                issueId={selectedIssueId}
                pendingCount={pendingCount}
            />


            {/* Signature viewer */}
            <Modal isOpen={!!viewSignatureUrl} onClose={() => setViewSignatureUrl(null)} title="Signature Proof">
                <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-200 rounded-xl">
                    {viewSignatureUrl && (
                        <img src={viewSignatureUrl} alt="Employee Signature" className="max-w-full h-auto bg-white border border-slate-300 rounded-lg shadow-sm" />
                    )}
                    <p className="text-xs text-slate-400 mt-3">Digital signature captured at time of acknowledgement</p>
                </div>
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
