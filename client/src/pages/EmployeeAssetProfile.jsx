import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
    ArrowLeft, PlusCircle, Package, ShieldCheck, FileText,
    RotateCcw, RefreshCw, Loader2, User, Calendar, Briefcase,
    Tag, IndianRupee, TrendingUp, CheckCircle2, Clock, AlertCircle,
    Layers, ArrowRightLeft, PenTool, ScanLine, Bell, Ruler
} from 'lucide-react';
import api from '../lib/api';
import IssueForm from '../components/ui/IssueForm';
import UnifiedVerificationModal from '../components/ui/UnifiedVerificationModal';
import { toast } from '../components/ui/Toast';

/* ─────────────────────────────────────────────
   Small reusable helpers
───────────────────────────────────────────── */
const Badge = ({ children, color = 'slate' }) => {
    const map = {
        emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        amber:   'bg-amber-100 text-amber-700 border-amber-200',
        blue:    'bg-blue-100 text-blue-700 border-blue-200',
        purple:  'bg-purple-100 text-purple-700 border-purple-200',
        slate:   'bg-slate-100 text-slate-600 border-slate-200',
        red:     'bg-red-100 text-red-700 border-red-200',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${map[color] || map.slate}`}>
            {children}
        </span>
    );
};

const Section = ({ title, icon: Icon, children, accent = 'blue' }) => {
    const accents = {
        blue:   'from-blue-500 to-indigo-500',
        emerald:'from-emerald-500 to-teal-500',
        amber:  'from-amber-500 to-orange-500',
        purple: 'from-purple-500 to-violet-500',
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100`}>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-black text-slate-800 tracking-tight">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
};

const timelineConfig = {
    issue:        { icon: FileText,   ring: 'ring-blue-200',   bg: 'bg-blue-50',    dot: 'bg-blue-500',    label: 'Issued' },
    verification: { icon: ShieldCheck,ring: 'ring-emerald-200',bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: 'Verified' },
    return:       { icon: RotateCcw,  ring: 'ring-orange-200', bg: 'bg-orange-50',  dot: 'bg-orange-500',  label: 'Returned' },
    replacement:  { icon: RefreshCw,  ring: 'ring-purple-200', bg: 'bg-purple-50',  dot: 'bg-purple-500',  label: 'Request' },
    default:      { icon: FileText,   ring: 'ring-slate-200',  bg: 'bg-slate-50',   dot: 'bg-slate-400',   label: 'Event' },
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function EmployeeAssetProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [verifyIssue, setVerifyIssue] = useState(null); // { employee, issueId, pendingCount }

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['employee-profile', id],
        queryFn: async () => {
            const { data } = await api.get(`/employees/${id}/asset-profile`);
            return data;
        }
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-slate-500 font-medium">Loading employee profile...</p>
            </div>
        </div>
    );
    if (error || !profile) return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
                <p className="text-sm text-red-500 font-medium">Failed to load employee profile</p>
            </div>
        </div>
    );

    const { employee, allocations, additionalCosts, timeline } = profile;

    const handleCancelPendingIssues = async () => {
        if (window.confirm("Are you sure you want to cancel these mistakenly issued items? This will remove the pending allocation records permanently.")) {
            try {
                await api.delete(`/issues/cancel/employee/${id}`);
                toast.success("Mistaken issues cancelled successfully!");
                queryClient.invalidateQueries({ queryKey: ['employee-profile', id] });
                queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
                queryClient.invalidateQueries({ queryKey: ['issues'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            } catch (err) {
                console.error(err);
                toast.error(err.response?.data?.message || "Failed to cancel pending issues.");
            }
        }
    };

    const handleCancelSingleIssue = async (issueId) => {
        if (window.confirm("Are you sure you want to cancel this mistakenly issued item?")) {
            try {
                await api.delete(`/issues/cancel/single/${issueId}`);
                toast.success("Item cancelled successfully!");
                queryClient.invalidateQueries({ queryKey: ['employee-profile', id] });
                queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
                queryClient.invalidateQueries({ queryKey: ['issues'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            } catch (err) {
                console.error(err);
                toast.error(err.response?.data?.message || "Failed to cancel item.");
            }
        }
    };

    // Combine standard issues + additional holdings for "currently with employee"
    const allCurrentItems = [
        ...(allocations.active || []).map(i => ({ ...i, _source: 'issue' })),
        ...(allocations.additionalHoldings || []).map(r => ({ ...r, _source: 'replacement' })),
    ];

    // Compute missing sizes from active items
    const activeSizes = allCurrentItems.reduce((acc, item) => {
        if (item.size && item.size !== 'N/A') {
            const n = (item.item_name || item.item?.name || '').toLowerCase();
            if ((n.includes('shirt') || n.includes('top') || n.includes('coat')) && !acc.shirt) acc.shirt = item.size;
            else if ((n.includes('pant') || n.includes('bottom')) && !acc.pant) acc.pant = item.size;
            else if ((n.includes('shoe') || n.includes('safety')) && !acc.shoe) acc.shoe = item.size;
        }
        return acc;
    }, {});
    
    const displaySizes = {
        shirt: employee.sizes?.shirt || activeSizes.shirt,
        pant: employee.sizes?.pant || activeSizes.pant,
        shoe: employee.sizes?.shoe || activeSizes.shoe
    };

    const pendingAcknowledgements = allCurrentItems.filter(item => {
        const isReplacement = item._source === 'replacement';
        return isReplacement ? item.status?.toLowerCase() !== 'completed' : !item.acknowledged;
    });

    const tabs = [
        { key: 'overview',  label: 'Overview',        icon: Layers },
        { key: 'items',     label: 'Current Holdings', icon: Package },
        { key: 'costs',     label: 'Additional Costs', icon: IndianRupee },
        { key: 'timeline',  label: 'Activity Log',     icon: Clock },
    ];

    return (
        <div className="space-y-0 max-w-7xl mx-auto animate-fade-in">

            {/* ── TOP HEADER BANNER ── */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/employees')}
                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                                {employee.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">{employee.name}</h1>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-slate-500 font-mono text-xs font-semibold">{employee.emp_code}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-slate-500 text-xs">{employee.department}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-slate-500 text-xs">{employee.designation || 'N/A'}</span>
                                    <Badge color={employee.status === 'active' ? 'emerald' : 'slate'}>
                                        {employee.status}
                                    </Badge>
                                    <Badge color={employee.employee_type === 'Intern' ? 'amber' : 'blue'}>
                                        {employee.employee_type || 'Permanent'}
                                    </Badge>
                                    <Badge color={employee.gender === 'Female' ? 'pink' : 'slate'}>
                                        {employee.gender || 'Male'}
                                    </Badge>
                                </div>

                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowIssueForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
                    >
                        <PlusCircle className="w-4 h-4" /> Issue Item
                    </button>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { label: 'Items Currently Held', value: allCurrentItems.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'Pending Signatures', value: pendingAcknowledgements.length, icon: PenTool, color: pendingAcknowledgements.length > 0 ? 'text-amber-500' : 'text-emerald-500', bg: pendingAcknowledgements.length > 0 ? 'bg-amber-50' : 'bg-emerald-50' },
                        { label: 'Additional Requests', value: allocations.additional?.length || 0, icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-50' },
                        { label: 'Total Additional Cost', value: `₹${(additionalCosts?.total || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-amber-500', bg: 'bg-amber-50', isText: true },
                    ].map((stat, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
                            {stat.label === 'Pending Signatures' && stat.value > 0 && (
                                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                            )}
                            <stat.icon className={`w-4 h-4 ${stat.color} mb-1.5`} />
                            <p className={`${stat.isText ? 'text-base' : 'text-2xl'} font-black text-slate-800 leading-none`}>{stat.value}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                            activeTab === tab.key
                                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-blue-500' : 'text-slate-400'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── ACTION BANNER FOR PENDING SIGNATURES ── */}
            {pendingAcknowledgements.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 mb-6 shadow-lg shadow-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-scale-up">
                    <div className="flex items-center gap-4 text-white">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Bell className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">{pendingAcknowledgements.length} Item(s) Awaiting Signature</h3>
                            <p className="text-amber-100 text-sm font-medium">Items have been physically issued but the employee hasn't signed for them yet.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 whitespace-nowrap flex-wrap md:flex-nowrap">
                        <button
                            onClick={handleCancelPendingIssues}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"
                        >
                            Cancel Issue
                        </button>
                        <button
                            onClick={() => setVerifyIssue({ employee, issueId: null, pendingCount: pendingAcknowledgements.length })}
                            className="bg-white text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-xl font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"
                        >
                            <ShieldCheck className="w-4 h-4" /> Verify Now
                        </button>
                    </div>
                </div>
            )}

            {/* ── TAB: OVERVIEW ── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Employee Details */}
                        <Section title="Employee Details" icon={User} accent="blue">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {[
                                    { icon: Briefcase, label: 'Department', value: employee.department },
                                    { icon: Tag, label: 'Designation', value: employee.designation || 'N/A' },
                                    { icon: Calendar, label: 'Joined', value: employee.joining_date ? dayjs(employee.joining_date).format('DD MMM YYYY') : 'N/A' },
                                    { icon: User, label: 'Employee Type', value: employee.employee_type || 'Permanent' },
                                    { icon: CheckCircle2, label: 'Status', value: employee.status },
                                    { icon: Tag, label: 'Employee Code', value: employee.emp_code },
                                    { icon: Ruler, label: 'Recorded Sizes', value: [
                                        displaySizes.shirt && `Top: ${displaySizes.shirt}`,
                                        displaySizes.pant && `Bottom: ${displaySizes.pant}`,
                                        displaySizes.shoe && `Shoe: ${displaySizes.shoe}`
                                    ].filter(Boolean).join(' | ') || 'Not specified' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                                            <item.icon className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{item.label}</p>
                                            <p className="text-sm font-bold text-slate-800 mt-0.5">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Standard Allocation Summary */}
                        <Section title="Free Uniform Quota Status" icon={Layers} accent="emerald">
                            <div className="space-y-3">
                                {allocations.summary.map((sum, i) => {
                                    const pct = sum.allowed > 0 ? Math.min((sum.issued / sum.allowed) * 100, 100) : 0;
                                    const isOver = sum.issued > sum.allowed && sum.allowed > 0;
                                    const isFull = sum.issued >= sum.allowed && sum.allowed > 0;
                                    return (
                                        <div key={i} className={`p-4 rounded-xl border ${isOver ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800">{sum.item}</span>
                                                    {isOver && <Badge color="amber">Exceeded</Badge>}
                                                    {isFull && !isOver && <Badge color="slate">Limit Reached</Badge>}
                                                    {!isFull && sum.allowed > 0 && <Badge color="emerald">Available</Badge>}
                                                </div>
                                                <span className="text-xs font-black text-slate-600">
                                                    {sum.issued} / {sum.allowed > 0 ? sum.allowed : '∞'} units
                                                </span>
                                            </div>
                                            {sum.allowed > 0 && (
                                                <div className="w-full bg-white rounded-full h-2 border border-slate-200">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${isOver ? 'bg-amber-400' : isFull ? 'bg-slate-400' : 'bg-emerald-400'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex justify-between mt-1.5">
                                                <span className="text-[10px] text-slate-400 font-medium">Issued: {sum.issued}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {sum.allowed > 0 ? `${sum.remaining} remaining` : 'No limit set'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    </div>

                    {/* Right col: Mini Timeline */}
                    <div>
                        <Section title="Recent Activity" icon={Clock} accent="purple">
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                {(timeline || []).slice(0, 5).map((event, idx) => {
                                    const cfg = timelineConfig[event.type] || timelineConfig.default;
                                    const Icon = cfg.icon;
                                    return (
                                        <div key={event.id || idx} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg} border border-white`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ${cfg.ring} bg-white`}>
                                                <Icon className="w-3.5 h-3.5" style={{ color: cfg.dot.replace('bg-', '').includes('blue') ? '#3b82f6' : cfg.dot.includes('emerald') ? '#10b981' : cfg.dot.includes('orange') ? '#f97316' : cfg.dot.includes('purple') ? '#a855f7' : '#94a3b8' }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 leading-tight">{event.title}</p>
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight whitespace-pre-line">{event.subtitle}</p>
                                                <p className="text-[9px] text-slate-400 font-mono mt-1">{dayjs(event.date).format('DD MMM, hh:mm A')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!timeline || timeline.length === 0) && (
                                    <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
                                )}
                            </div>
                        </Section>
                    </div>
                </div>
            )}

            {/* ── TAB: CURRENT HOLDINGS ── */}
            {activeTab === 'items' && (
                <div className="space-y-4">
                    <Section title="All Items Currently With This Employee" icon={Package} accent="blue">
                        {allCurrentItems.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <Package className="w-12 h-12 text-slate-200 mx-auto" />
                                <p className="text-sm text-slate-500 font-medium">No items currently allocated</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {allCurrentItems.map((item, i) => {
                                    const isReplacement = item._source === 'replacement';
                                    const name = isReplacement ? item.item?.name : item.item?.name;
                                    const category = isReplacement ? item.item?.category?.name : item.item?.category?.name;
                                    const qty = item.quantity || 1;
                                    const dueDate = item.next_due_date;
                                    const isAcknowledged = isReplacement ? item.status?.toLowerCase() === 'completed' : item.acknowledged;

                                    return (
                                        <div key={i} className={`p-4 rounded-2xl border-2 space-y-3 ${isReplacement ? 'border-purple-100 bg-purple-50/30' : 'border-slate-100 bg-white'}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReplacement ? 'bg-purple-100' : 'bg-blue-50'}`}>
                                                        <Package className={`w-5 h-5 ${isReplacement ? 'text-purple-600' : 'text-blue-500'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm leading-tight">{name || 'Unknown Item'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{category || 'N/A'}</p>
                                                        {item.size && item.size !== 'N/A' && (
                                                            <span className="inline-block mt-1 text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full uppercase tracking-widest">Size: {item.size}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge color={
                                                    item.allocation_type?.toLowerCase() === 'replacement' ? 'purple' : 
                                                    item.allocation_type?.toLowerCase() === 'additional' ? 'amber' : 
                                                    isReplacement ? 'purple' : 'blue'
                                                }>
                                                    {item.allocation_type || (isReplacement ? 'Additional' : 'Standard')}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">QTY</span>
                                                    <span className="text-sm font-black text-slate-800 ml-1">{qty}</span>
                                                </div>
                                                {dueDate && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                        <Calendar className="w-3 h-3" />
                                                        <span className="font-medium">Due {dayjs(dueDate).format('DD MMM YYYY')}</span>
                                                    </div>
                                                )}
                                                {isAcknowledged ? (
                                                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                                                        <ShieldCheck className="w-3 h-3" /> Verified
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {!isReplacement && (
                                                            <button 
                                                                onClick={() => handleCancelSingleIssue(item._id || item.id)}
                                                                className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                        <div className="flex items-center gap-1 text-amber-500 text-[10px] font-black">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {/* ── TAB: ADDITIONAL COSTS ── */}
            {activeTab === 'costs' && (
                <div className="space-y-6">
                    {/* Cost Summary Hero */}
                    <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-xs font-black uppercase tracking-widest mb-1">Total Additional Cost Incurred</p>
                                <p className="text-5xl font-black tracking-tight">₹{(additionalCosts?.total || 0).toLocaleString()}</p>
                                <p className="text-amber-100 text-sm font-medium mt-2">
                                    Across {additionalCosts?.items?.length || 0} additional item request{additionalCosts?.items?.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
                                <IndianRupee className="w-10 h-10 text-white/70" />
                            </div>
                        </div>
                    </div>

                    {/* Breakdown by Reason */}
                    {additionalCosts?.breakdown?.length > 0 && (
                        <Section title="Cost by Reason Type" icon={TrendingUp} accent="amber">
                            <div className="space-y-3">
                                {additionalCosts.breakdown.map((entry, i) => {
                                    const pct = additionalCosts.total > 0 ? (entry.amount / additionalCosts.total) * 100 : 0;
                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-28 flex-shrink-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{entry.reason}</p>
                                            </div>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                                                <div
                                                    className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="w-24 text-right flex-shrink-0">
                                                <p className="text-sm font-black text-slate-800">₹{entry.amount.toLocaleString()}</p>
                                                <p className="text-[10px] text-slate-400">{pct.toFixed(0)}%</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* Individual Cost Records */}
                    <Section title="Individual Cost Records" icon={FileText} accent="amber">
                        {!additionalCosts?.items?.length ? (
                            <div className="text-center py-10 space-y-3">
                                <IndianRupee className="w-10 h-10 text-slate-200 mx-auto" />
                                <p className="text-sm text-slate-400 font-medium">No additional costs recorded</p>
                                <p className="text-xs text-slate-300">Additional costs appear when items beyond free quota are issued</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {additionalCosts.items.map((req, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-amber-50/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                                                <Package className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{req.item?.name || req.item_name || 'Unknown Item'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {dayjs(req.requested_date).format('DD MMM YYYY')}
                                                    </span>
                                                    <span className="text-slate-200">•</span>
                                                    <span className="text-[10px] text-slate-500 font-bold">{req.reason}</span>
                                                    <span className="text-slate-200">•</span>
                                                    <span className="text-[10px] text-slate-400">Qty: {req.quantity}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black text-slate-900">₹{(req.total_cost || 0).toLocaleString()}</p>
                                            <Badge color={req.payment_status === 'Paid' ? 'emerald' : req.payment_status === 'Pending' ? 'amber' : 'slate'}>
                                                {req.payment_status || 'N/A'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {/* ── TAB: ACTIVITY LOG ── */}
            {activeTab === 'timeline' && (
                <Section title="Full Activity Log" icon={Clock} accent="purple">
                    {(!timeline || timeline.length === 0) ? (
                        <div className="text-center py-12 space-y-3">
                            <Clock className="w-12 h-12 text-slate-200 mx-auto" />
                            <p className="text-sm text-slate-400 font-medium">No activity recorded yet</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-5 pb-4">
                            {(timeline || []).map((event, idx) => {
                                const cfg = timelineConfig[event.type] || timelineConfig.default;
                                const Icon = cfg.icon;
                                return (
                                    <div key={event.id || idx} className="relative pl-8">
                                        <div className={`absolute -left-[17px] top-1 w-8 h-8 bg-white border-2 ${cfg.ring.replace('ring', 'border')} rounded-full flex items-center justify-center shadow-sm`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className={`${cfg.bg} border border-white p-3.5 rounded-xl`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{event.title}</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5 whitespace-pre-line leading-relaxed">{event.subtitle}</p>
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <p className="text-[10px] text-slate-400 font-mono">{dayjs(event.date).format('DD MMM YYYY')}</p>
                                                    <p className="text-[10px] text-slate-300 font-mono">{dayjs(event.date).format('hh:mm A')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>
            )}

            {/* ── Modal ── */}
            <IssueForm
                isOpen={showIssueForm}
                onClose={() => setShowIssueForm(false)}
                initialData={{ employee_id: employee._id || employee.id }}
                profileData={profile}
            />

            {verifyIssue && (
                <UnifiedVerificationModal
                    isOpen={!!verifyIssue}
                    onClose={() => setVerifyIssue(null)}
                    employee={verifyIssue.employee}
                    issueId={verifyIssue.issueId}
                    pendingCount={verifyIssue.pendingCount}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['issues'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
                        // Invalidate this specific employee profile to refresh banner
                        queryClient.invalidateQueries({ queryKey: ['employee-profile', id] });
                        queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
                        setVerifyIssue(null);
                    }}
                />
            )}
        </div>
    );
}
