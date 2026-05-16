import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Check, X, Clock, Plus, RefreshCw, DollarSign, PenTool, Search, CheckCircle2, LayoutTemplate, ArrowRightLeft, User, Package, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../lib/api';
import ReplacementForm from '../components/ui/ReplacementForm';
import ReplacementHandoverModal from '../components/ui/ReplacementHandoverModal';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

const Badge = ({ children, color }) => {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-100'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${colors[color] || colors.slate}`}>
            {children}
        </span>
    );
};

export default function Replacements() {
    const [activeTab, setActiveTab] = useState('pending'); // pending, approved, history
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    
    // Handover Modal State
    const [handoverData, setHandoverData] = useState(null);
    
    // Admin Action Modal State (for Approving/Rejecting)
    const [actionModal, setActionModal] = useState({ 
        isOpen: false, 
        type: '', 
        request: null, 
        notes: '',
        unit_cost: 0,
        deduction_amount: 0
    });

    const queryClient = useQueryClient();

    const { data: requests, isLoading } = useQuery({
        queryKey: ['replacements', activeTab],
        queryFn: async () => {
            let status = activeTab;
            if (activeTab === 'history') status = 'completed,rejected';
            const { data } = await api.get(`/replacements?status=${status}`);
            return data;
        }
    });

    const { data: summary } = useQuery({
        queryKey: ['replacements-summary'],
        queryFn: async () => {
            const { data } = await api.get(`/replacements/summary`);
            return data;
        }
    });

    const filteredRequests = useMemo(() => {
        if (!requests) return [];
        let result = requests;
        if (search) {
            const q = search.trim().toLowerCase();
            result = result.filter(r => 
                (r.employee_name || r.employee?.name || '').toLowerCase().includes(q) ||
                (r.employee?.emp_code || '').toLowerCase().includes(q) ||
                (r.item_name || r.item?.name || '').toLowerCase().includes(q)
            );
        }
        return result;
    }, [requests, search]);

    const approveMutation = useMutation({
        mutationFn: async ({ id, notes, unit_cost, deduction_amount }) => {
            const { data } = await api.put(`/replacements/${id}/approve`, { 
                notes, 
                unit_cost, 
                deduction_amount 
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['replacements'] });
            queryClient.invalidateQueries({ queryKey: ['replacements-summary'] });
            toast.success('Replacement approved and costs recorded!');
            setActionModal({ isOpen: false, type: '', request: null, notes: '', unit_cost: 0, deduction_amount: 0 });
        },
        onError: () => toast.error('Failed to approve request')
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, notes }) => {
            const { data } = await api.put(`/replacements/${id}/reject`, { notes });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['replacements'] });
            toast.success('Request rejected.');
            setActionModal({ isOpen: false, type: '', request: null, notes: '', unit_cost: 0, deduction_amount: 0 });
        },
        onError: () => toast.error('Failed to reject request')
    });

    const handleActionSubmit = (e) => {
        e.preventDefault();
        const id = actionModal.request._id || actionModal.request.id;
        if (actionModal.type === 'approve') {
            approveMutation.mutate({ 
                id, 
                notes: actionModal.notes,
                unit_cost: actionModal.unit_cost,
                deduction_amount: actionModal.deduction_amount
            });
        } else if (actionModal.type === 'reject') {
            rejectMutation.mutate({ id, notes: actionModal.notes });
        }
    };

    const tabs = [
        { key: 'pending', label: 'New Requests', icon: Clock, color: 'amber' },
        { key: 'approved', label: 'Handover Queue', icon: ArrowRightLeft, color: 'blue' },
        { key: 'history', label: 'Audit Log', icon: CheckCircle2, color: 'slate' },
    ];

    const openApproveModal = (req) => {
        setActionModal({
            isOpen: true,
            type: 'approve',
            request: req,
            notes: '',
            unit_cost: req.unit_cost || 0,
            deduction_amount: req.deduction_amount || 0
        });
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-12">
            {/* Header & Stats */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Replacement Management</h2>
                    <p className="text-slate-500 font-medium">Approve requests, track costs, and verify item handovers.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Request
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Replacement Cost', value: summary?.total_cost, icon: LayoutTemplate, bg: 'bg-indigo-50', text: 'text-indigo-600' },
                    { label: 'Total Salary Deductions', value: summary?.total_deductions, icon: DollarSign, bg: 'bg-amber-50', text: 'text-amber-600' },
                    { label: 'Verified Handovers', value: summary?.paid_count, icon: ShieldCheck, bg: 'bg-emerald-50', text: 'text-emerald-600', isCount: true },
                    { label: 'Awaiting Handover', value: summary?.pending_count, icon: Clock, bg: 'bg-blue-50', text: 'text-blue-600', isCount: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.text} rounded-2xl flex items-center justify-center`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900">
                                {stat.isCount ? stat.value : `₹${(stat.value || 0).toLocaleString()}`}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation & Search */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 w-full lg:w-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 lg:flex-none px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? `text-${tab.color}-500` : 'text-slate-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search employee, ID or item..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/50 text-[11px] text-slate-400 uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Asset Holder</th>
                                <th className="px-8 py-5">Replacement Item</th>
                                <th className="px-8 py-5">Financial Details</th>
                                <th className="px-8 py-5">Asset Exchange</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} className="px-8 py-6"><div className="h-5 bg-slate-100 rounded-full w-full"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredRequests?.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-24 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">No requests found</h3>
                                        <p className="text-sm text-slate-500">There are no replacement requests in this category.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests?.map(req => {
                                    const requestId = req._id || req.id;
                                    return (
                                        <tr key={requestId} className="group hover:bg-slate-50/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-2">
                                                    <Badge color={req.status === 'Pending' ? 'amber' : req.status === 'Approved' ? 'blue' : req.status === 'Completed' ? 'emerald' : 'red'}>
                                                        {req.status}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                        {dayjs(req.requested_date).format('DD MMM YYYY')}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm leading-none">{req.employee_name || req.employee?.name}</div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 tracking-tighter">
                                                            {req.employee?.emp_code || '---'} · {req.employee?.department || 'GENERAL'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6">
                                                <div className="space-y-1.5">
                                                    <div className="font-bold text-slate-800 text-sm">{req.item_name || req.item?.name}</div>
                                                    <div className="flex gap-2">
                                                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-black uppercase">Qty: {req.quantity}</span>
                                                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-black uppercase">Size: {req.size}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-1">
                                                        "{req.reason}"
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6">
                                                {(req.total_cost > 0 || req.deduction_amount > 0) ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-lg font-black text-slate-900">₹{(req.total_cost || 0).toLocaleString()}</span>
                                                            {req.deduction_amount > 0 && (
                                                                <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 rounded-md">-{req.deduction_amount}</span>
                                                            )}
                                                        </div>
                                                        <Badge color={req.payment_status === 'Deducted' ? 'emerald' : req.payment_status === 'Pending' ? 'amber' : 'slate'}>
                                                            {req.payment_status}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">N/A</span>
                                                )}
                                            </td>

                                            <td className="px-8 py-6">
                                                <div className="space-y-2">
                                                    <Badge color={req.return_status === 'Returned' ? 'emerald' : req.return_status === 'Pending Return' ? 'amber' : 'slate'}>
                                                        Old Item: {req.return_status}
                                                    </Badge>
                                                    {req.acknowledged && (
                                                        <div className="flex items-center text-[10px] text-emerald-600 font-black uppercase tracking-widest gap-1">
                                                            <ShieldCheck className="w-3 h-3" /> Fully Verified
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {req.status === 'Pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => openApproveModal(req)} 
                                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => setActionModal({ ...actionModal, isOpen: true, type: 'reject', request: req })} 
                                                                className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status === 'Approved' && (
                                                        <button 
                                                            onClick={() => setHandoverData(req)} 
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
                                                        >
                                                            <PenTool className="w-4 h-4" /> Handover
                                                        </button>
                                                    )}
                                                    {req.status === 'Completed' && req.signature_path && (
                                                        <button 
                                                            onClick={() => window.open(`http://localhost:5000${req.signature_path}`, '_blank')} 
                                                            className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all"
                                                        >
                                                            <PenTool className="w-4 h-4" />
                                                        </button>
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

            {/* Modals */}
            <ReplacementForm isOpen={showForm} onClose={() => setShowForm(false)} />
            <ReplacementHandoverModal isOpen={!!handoverData} onClose={() => setHandoverData(null)} request={handoverData} />

            <Modal 
                isOpen={actionModal.isOpen} 
                onClose={() => setActionModal({ ...actionModal, isOpen: false })} 
                title={actionModal.type === 'approve' ? 'Review & Approve Replacement' : 'Reject Request'}
            >
                <form onSubmit={handleActionSubmit} className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-sm text-slate-600 font-medium">
                            Requesting: <strong className="text-slate-900">{actionModal.request?.item_name}</strong> (Qty: {actionModal.request?.quantity})
                        </p>
                        <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">
                            For Employee: {actionModal.request?.employee_name}
                        </p>
                    </div>

                    {actionModal.type === 'approve' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Manual Item Cost (₹)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={actionModal.unit_cost}
                                            onChange={e => setActionModal({...actionModal, unit_cost: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Salary Deduction (₹)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={actionModal.deduction_amount}
                                            onChange={e => setActionModal({...actionModal, deduction_amount: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Salary Deduction Calculator */}
                            <div className="bg-blue-900 rounded-2xl p-5 text-white shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Base Monthly Salary</span>
                                    <span className="text-sm font-bold">₹{(actionModal.request?.employee?.salary || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Deduction Amount</span>
                                    <span className="text-sm font-bold text-red-300">- ₹{(Number(actionModal.deduction_amount) || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Net Take Home</span>
                                    <span className="text-xl font-black">₹{(Math.max(0, (actionModal.request?.employee?.salary || 0) - (Number(actionModal.deduction_amount) || 0))).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Internal Remarks</label>
                        <textarea
                            value={actionModal.notes}
                            onChange={e => setActionModal(m => ({ ...m, notes: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm h-24"
                            placeholder="Add notes for audit trail..."
                        ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setActionModal({ ...actionModal, isOpen: false })} 
                            className="flex-1 px-6 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors uppercase tracking-widest text-[10px]"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className={`flex-[2] px-6 py-4 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-xl ${actionModal.type === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
                        >
                            {approveMutation.isPending || rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Confirm ${actionModal.type}`}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
