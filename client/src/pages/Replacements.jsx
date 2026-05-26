import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { X, Clock, Plus, DollarSign, PenTool, Search, CheckCircle2, LayoutTemplate, ArrowRightLeft, User, Package, ShieldCheck, Loader2, Fingerprint, ScanLine } from 'lucide-react';
import api from '../lib/api';
import ReplacementForm from '../components/ui/ReplacementForm';
import ReplacementHandoverModal from '../components/ui/ReplacementHandoverModal';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

// eslint-disable-next-line react/prop-types
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
    
    // Proof Modal State
    const [selectedProof, setSelectedProof] = useState(null);
    
    const [actionModal, setActionModal] = useState({ 
        isOpen: false, 
        type: '', 
        request: null, 
        notes: '',
        unit_cost: 0
    });

    const [showSettings, setShowSettings] = useState(false);
    const [tempConfigs, setTempConfigs] = useState({
        Pant: { permanent: 2, intern: 2 },
        Shirt: { permanent: 2, intern: 2 },
        'T-Shirt': { permanent: 1, intern: 1 }
    });

    const queryClient = useQueryClient();

    useQuery({
        queryKey: ['allocation-configs'],
        queryFn: async () => {
            const { data } = await api.get('/replacements/configs');
            const mapping = {
                Pant:     { permanent: 2, intern: 2 },
                Shirt:    { permanent: 2, intern: 2 },
                'T-Shirt': { permanent: 1, intern: 1 }
            };
            data.forEach(c => {
                mapping[c.item_type] = {
                    permanent: c.permanent_quantity ?? c.standard_quantity ?? 0,
                    intern:    c.intern_quantity    ?? (c.item_type === 'Pant' ? 2 : c.item_type === 'Shirt' ? 2 : 1)
                };
            });
            setTempConfigs(mapping);
            return data;
        }
    });

    const updateConfigsMutation = useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post('/replacements/configs', { configs: payload });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allocation-configs'] });
            queryClient.invalidateQueries({ queryKey: ['replacements'] });
            toast.success('Uniform limits updated successfully!');
            setShowSettings(false);
        },
        onError: () => toast.error('Failed to update allocation limits')
    });

    const handleSaveConfigs = () => {
        const payload = Object.entries(tempConfigs).map(([type, limits]) => ({
            item_type: type,
            permanent_quantity: limits.permanent,
            intern_quantity: limits.intern
        }));
        updateConfigsMutation.mutate(payload);
    };

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
        return [...result].sort((a, b) => {
            const dateA = dayjs(a.requested_date);
            const dateB = dayjs(b.requested_date);
            if (!dateA.isSame(dateB)) {
                return dateB.isAfter(dateA) ? 1 : -1;
            }
            const statusA = a.status === 'completed' || a.status === 'resolved' ? 1 : 0;
            const statusB = b.status === 'completed' || b.status === 'resolved' ? 1 : 0;
            return statusB - statusA;
        });
    }, [requests, search]);

    const approveMutation = useMutation({
        mutationFn: async ({ id, notes, unit_cost }) => {
            const { data } = await api.put(`/replacements/${id}/approve`, { 
                notes, 
                unit_cost 
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['replacements'] });
            queryClient.invalidateQueries({ queryKey: ['replacements-summary'] });
            toast.success('Request approved successfully!');
            setActionModal({ isOpen: false, type: '', request: null, notes: '', unit_cost: 0 });
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
            setActionModal({ isOpen: false, type: '', request: null, notes: '', unit_cost: 0 });
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
                unit_cost: actionModal.unit_cost
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
            unit_cost: req.unit_cost || 0
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Uniform Allocation & Requests</h1>
                    <p className="text-sm text-slate-500 mt-1">Verify standard free allocations, approve additional requests, and track additional costs.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto shrink-0 justify-end">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        Allocation Settings
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        New Request
                    </button>
                </div>
            </div>

            {/* Dynamic settings drawer */}
            {showSettings && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 animate-slide-down">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Default Standard Uniform Allocations</h3>
                            <p className="text-xs text-slate-400">Configure company-approved default quantities for Permanent employees and Interns.</p>
                        </div>
                    </div>
                    {/* Permanent allocation limits */}
                    <div className="space-y-2">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span> Permanent Employees
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['Pant', 'Shirt', 'T-Shirt'].map(type => {
                                const limits = tempConfigs[type] || { permanent: 2, intern: 1 };
                                return (
                                    <div key={type} className="space-y-1 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                        <span className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">{type}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={limits.permanent ?? 2}
                                                onChange={e => setTempConfigs({
                                                    ...tempConfigs,
                                                    [type]: { ...limits, permanent: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-3 py-1.5 bg-white border border-blue-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold text-slate-700"
                                            />
                                            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">Units</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trainee allocation limits */}
                    <div className="space-y-2">
                        <p className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span> Trainee Employees
                            <span className="text-[9px] font-bold text-slate-400 normal-case tracking-normal ml-1">(Default: Pant 2, Shirt 2, T-Shirt 1)</span>
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { type: 'Pant',   defaultVal: 2 },
                                { type: 'Shirt',  defaultVal: 2 },
                                { type: 'T-Shirt', defaultVal: 1 },
                            ].map(({ type, defaultVal }) => {
                                const limits = tempConfigs[type] || { permanent: 2, intern: defaultVal };
                                return (
                                    <div key={type} className="space-y-1 p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                        <span className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">{type}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={limits.intern ?? defaultVal}
                                                onChange={e => setTempConfigs({
                                                    ...tempConfigs,
                                                    [type]: { ...limits, intern: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-3 py-1.5 bg-white border border-amber-100 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 text-xs font-bold text-slate-700"
                                            />
                                            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">Units</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveConfigs}
                            disabled={updateConfigsMutation.isPending}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 transition-all"
                        >
                            {updateConfigsMutation.isPending ? 'Saving...' : 'Save Limits'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Additional Cost',
                        value: `₹${(summary?.additional_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: 'Extra uniform requests absorbed by company',
                        icon: DollarSign,
                        bg: 'bg-indigo-50',
                        text: 'text-indigo-600'
                    },
                    {
                        label: 'Upcoming Requests',
                        value: summary?.upcoming_count ?? 0,
                        sub: 'Pending approval or awaiting handover',
                        icon: Clock,
                        bg: 'bg-amber-50',
                        text: 'text-amber-600'
                    },
                    {
                        label: 'Verified Handovers',
                        value: summary?.paid_count ?? 0,
                        sub: 'Requests completed & acknowledged',
                        icon: ShieldCheck,
                        bg: 'bg-emerald-50',
                        text: 'text-emerald-600'
                    },
                    {
                        label: 'Awaiting Handover',
                        value: summary?.approved_count ?? 0,
                        sub: 'Approved, not yet handed over',
                        icon: ArrowRightLeft,
                        bg: 'bg-blue-50',
                        text: 'text-blue-600'
                    }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.text} rounded-2xl flex items-center justify-center`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
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
            </div>            {/* Data Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] text-slate-400 uppercase font-bold tracking-widest border-b border-slate-200 z-10">
                            <tr>
                                <th className="px-6 py-3 bg-slate-50">Status</th>
                                <th className="px-6 py-3 bg-slate-50">Asset Holder</th>
                                <th className="px-6 py-3 bg-slate-50">Replacement Item</th>
                                <th className="px-6 py-3 bg-slate-50">Financial Details</th>
                                <th className="px-6 py-3 bg-slate-50">Asset Exchange</th>
                                <th className="px-6 py-3 text-right bg-slate-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} className="px-6 py-2.5"><div className="h-5 bg-slate-100 rounded-full w-full"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredRequests?.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package className="w-8 h-8 text-slate-200" />
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
                                            <td className="px-6 py-2.5">
                                                <div className="flex flex-col gap-1.5">
                                                    <Badge color={
                                                        req.status?.toLowerCase() === 'pending' ? 'amber' : 
                                                        req.status?.toLowerCase() === 'approved' ? 'blue' : 
                                                        req.status?.toLowerCase() === 'completed' ? 'emerald' : 
                                                        'red'
                                                    }>
                                                        {req.status}
                                                    </Badge>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                        {dayjs(req.requested_date).format('DD MMM YYYY')}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-xs leading-none">{req.employee_name || req.employee?.name}</div>
                                                        <div className="text-[9px] text-slate-505 font-bold uppercase mt-1 leading-none tracking-tighter">
                                                            {req.employee?.emp_code || '---'} · {req.employee?.department || 'GENERAL'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-2.5">
                                                <div className="space-y-1">
                                                    <div className="font-bold text-slate-800 text-xs leading-none">{req.item_name || req.item?.name}</div>
                                                    <div className="flex flex-wrap gap-1.5 mt-1 items-center leading-none">
                                                        <Badge color={
                                                            req.allocation_type === 'Standard' ? 'blue' : 
                                                            req.allocation_type === 'Additional' ? 'purple' : 'slate'
                                                        }>
                                                            {req.allocation_type || 'Standard'}
                                                        </Badge>
                                                        <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">Qty: {req.quantity}</span>
                                                        <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">Size: {req.size}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 line-clamp-1 mt-1">
                                                        &quot;{req.reason}&quot;
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-2.5">
                                                {req.allocation_type === 'Replacement' ? (
                                                    <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none">N/A</span>
                                                ) : (req.total_cost > 0) ? (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm font-black text-slate-900 leading-none">₹{(req.total_cost || 0).toLocaleString()}</span>
                                                        </div>
                                                        <Badge color="purple">Deducted</Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none">N/A</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-2.5">
                                                <div className="space-y-1.5">
                                                    {req.allocation_type !== 'Additional' ? (
                                                        <Badge color={req.return_status === 'Returned' ? 'emerald' : req.return_status === 'Pending Return' ? 'amber' : 'slate'}>
                                                            Old: {req.item_name || req.item?.name || 'Item'}
                                                        </Badge>
                                                    ) : !req.acknowledged && (
                                                        <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none">---</span>
                                                    )}
                                                    {req.acknowledged && (
                                                        <div className="flex items-center text-[9px] text-emerald-600 font-black uppercase tracking-widest gap-0.5 leading-none">
                                                            <ShieldCheck className="w-2.5 h-2.5" /> Verified
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {(req.status?.toLowerCase() === 'pending') && (
                                                        <>
                                                            <button 
                                                                onClick={() => openApproveModal(req)} 
                                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => setActionModal({ ...actionModal, isOpen: true, type: 'reject', request: req })} 
                                                                className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {(req.status?.toLowerCase() === 'approved') && (
                                                        <button 
                                                            onClick={() => setHandoverData(req)} 
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow"
                                                        >
                                                            <PenTool className="w-3.5 h-3.5" /> Handover
                                                        </button>
                                                    )}
                                                    {(req.status?.toLowerCase() === 'completed') && (
                                                        <button 
                                                            onClick={() => setSelectedProof(req)} 
                                                            className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-lg transition-all"
                                                            title="View Handover Verification Proof"
                                                        >
                                                            {req.verification_method?.toLowerCase().includes('ocr') ? (
                                                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
                                                            ) : (
                                                                <PenTool className="w-3.5 h-3.5 text-slate-600 group-hover:text-white" />
                                                            )}
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
                                <span className="text-xs font-bold text-slate-800">Qty: {selectedProof.quantity} / Size: {selectedProof.size}</span>
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
                                    {selectedProof.resolved_date ? dayjs(selectedProof.resolved_date).format('DD MMM YYYY, hh:mm A') : '---'}
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
                                    <p className="text-xs text-slate-600 font-medium italic">&quot;{selectedProof.notes}&quot;</p>
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

                    {actionModal.type === 'approve' && actionModal.request?.allocation_type !== 'Replacement' && (
                        <div className="space-y-6">
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

                            {/* Additional Cost Billing Calculator */}
                            <div className="bg-blue-900 rounded-2xl p-5 text-white shadow-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Total Additional Cost</span>
                                    <span className="text-2xl font-black text-blue-400">
                                        ₹{((actionModal.request?.quantity || 1) * (parseFloat(actionModal.unit_cost) || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                            Admin Remarks (Optional)
                        </label>
                        <textarea
                            value={actionModal.notes}
                            onChange={e => setActionModal({...actionModal, notes: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                            rows="3"
                            placeholder="Add internal notes..."
                        ></textarea>
                    </div>

                    <button 
                        type="submit" 
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg ${
                            actionModal.type === 'approve' 
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
                            : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                        } active:scale-95 disabled:opacity-70`}
                    >
                        {approveMutation.isPending || rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
