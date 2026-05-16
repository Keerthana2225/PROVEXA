import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Clock, RefreshCw, Archive, CheckCircle, Package, ArrowRight, Activity, RotateCcw, Loader2 } from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

dayjs.extend(relativeTime);

const Badge = ({ children, color }) => {
    const colors = {
        emerald: 'bg-emerald-100 text-emerald-700',
        blue: 'bg-blue-100 text-blue-700',
        amber: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
        slate: 'bg-slate-100 text-slate-700'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${colors[color] || colors.slate}`}>
            {children}
        </span>
    );
};

export default function ItemRenewal() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('active'); // active, upcoming, history
    
    // Modals state
    const [renewModalOpen, setRenewModalOpen] = useState(false);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [timelineModalOpen, setTimelineModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form states
    const [notes, setNotes] = useState('');
    const [itemCondition, setItemCondition] = useState('Good');

    // Fetch Active Items (Current Assets)
    const { data: activeItems, isLoading: loadingActive } = useQuery({
        queryKey: ['issues', 'Active'],
        queryFn: async () => {
            const { data } = await api.get('/issues?lifecycle_status=Active');
            return data;
        },
        enabled: activeTab === 'active'
    });

    // Fetch Upcoming Renewals (Action Alerts)
    const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
        queryKey: ['upcomingRenewals'],
        queryFn: async () => {
            const { data } = await api.get('/issues/upcoming');
            return data;
        },
        enabled: activeTab === 'upcoming'
    });

    // Fetch History (Returned + Renewed)
    const { data: historyItems, isLoading: loadingHistory } = useQuery({
        queryKey: ['issues', 'History'],
        queryFn: async () => {
            // We want both Returned and Renewed for history
            const [retRes, renRes] = await Promise.all([
                api.get('/issues?lifecycle_status=Returned'),
                api.get('/issues?lifecycle_status=Renewed')
            ]);
            return [...retRes.data, ...renRes.data].sort((a, b) => new Date(b.return_date) - new Date(a.return_date));
        },
        enabled: activeTab === 'history'
    });

    // Mutations
    const renewMutation = useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post(`/issues/${selectedItem._id || selectedItem.id}/renew`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['upcomingRenewals'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Item cycle renewed successfully!');
            setRenewModalOpen(false);
            setSelectedItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to renew item')
    });

    const returnMutation = useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post(`/issues/${selectedItem._id || selectedItem.id}/return`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['upcomingRenewals'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Item returned and archived.');
            setReturnModalOpen(false);
            setSelectedItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to return item')
    });

    const handleRenew = (e) => {
        e.preventDefault();
        renewMutation.mutate({ notes, item_condition: itemCondition });
    };

    const handleReturn = (e) => {
        e.preventDefault();
        returnMutation.mutate({ return_remarks: notes, returned_condition: itemCondition });
    };

    const openRenewModal = (item) => {
        setSelectedItem(item);
        setNotes('');
        setItemCondition('Good');
        setRenewModalOpen(true);
    };

    const openReturnModal = (item) => {
        setSelectedItem(item);
        setNotes('');
        setItemCondition('Good');
        setReturnModalOpen(true);
    };

    const openTimelineModal = (item) => {
        setSelectedItem(item);
        setTimelineModalOpen(true);
    };

    const renderTable = (items, type) => {
        if (!items || items.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Records Found</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">There are no items currently in this lifecycle stage.</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/50 text-[11px] text-slate-400 uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Asset Holder</th>
                                <th className="px-8 py-5">Item Details</th>
                                <th className="px-8 py-5">Condition</th>
                                {type !== 'history' && <th className="px-8 py-5">Next Renewal</th>}
                                {type === 'history' && <th className="px-8 py-5">Closing Type</th>}
                                {type === 'history' && <th className="px-8 py-5">Processed Date</th>}
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {items.map(item => (
                                <tr key={item._id || item.id} className="group hover:bg-slate-50/30 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                {item.employee?.name?.[0] || 'E'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{item.employee?.name || item.employee_name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{item.employee?.emp_code || '---'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-semibold text-slate-800 text-sm">{item.item?.name || item.item_name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">Qty: {item.quantity}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Badge color={item.item_condition === 'Good' ? 'emerald' : item.item_condition === 'Damaged' ? 'red' : 'amber'}>
                                            {type === 'history' ? (item.returned_condition || 'N/A') : item.item_condition}
                                        </Badge>
                                    </td>
                                    {type !== 'history' && (
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm ${dayjs(item.next_due_date).isBefore(dayjs().add(7, 'day')) ? 'text-red-500' : 'text-slate-700'}`}>
                                                    {dayjs(item.next_due_date).format('DD MMM YYYY')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {dayjs(item.next_due_date).fromNow()}
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                    {type === 'history' && (
                                        <td className="px-8 py-5">
                                            <Badge color={item.lifecycle_status === 'Renewed' ? 'blue' : 'slate'}>
                                                {item.lifecycle_status}
                                            </Badge>
                                        </td>
                                    )}
                                    {type === 'history' && (
                                        <td className="px-8 py-5">
                                            <div className="font-medium text-slate-600 text-sm">
                                                {dayjs(item.return_date).format('DD MMM YYYY')}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => openTimelineModal(item)} 
                                                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="View History Log"
                                            >
                                                <Activity className="w-4 h-4" />
                                            </button>
                                            {type !== 'history' && (
                                                <button 
                                                    onClick={() => openRenewModal(item)} 
                                                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border shadow-sm ${dayjs(item.issued_date).isAfter(dayjs().subtract(24, 'hour')) ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/50'}`}
                                                    disabled={dayjs(item.issued_date).isAfter(dayjs().subtract(24, 'hour'))}
                                                >
                                                    {dayjs(item.issued_date).isAfter(dayjs().subtract(24, 'hour')) ? 'Renewed Today' : 'Renew'}
                                                </button>
                                            )}
                                            {type !== 'history' && (
                                                <button 
                                                    onClick={() => openReturnModal(item)} 
                                                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200/50 shadow-sm"
                                                >
                                                    Return
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-12">
            {/* Header section */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lifecycle Management</h2>
                    <p className="text-slate-500 font-medium">Monitor active assets, process renewals, and manage returns.</p>
                </div>
                <div className="flex gap-3">
                    <div className="px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Active Assets</p>
                        <p className="text-xl font-black text-blue-900">{activeItems?.length || 0}</p>
                    </div>
                    <div className="px-6 py-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Renewal Due</p>
                        <p className="text-xl font-black text-amber-900">{upcomingData?.actionNeeded?.length || 0}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl w-fit border border-slate-200/50">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center gap-2.5 ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package className={`w-4 h-4 ${activeTab === 'active' ? 'text-blue-500' : 'text-slate-400'}`} />
                    Active Inventory
                </button>
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center gap-2.5 ${activeTab === 'upcoming' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Clock className={`w-4 h-4 ${activeTab === 'upcoming' ? 'text-amber-500' : 'text-slate-400'}`} />
                    Renewal Action Center
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center gap-2.5 ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Archive className={`w-4 h-4 ${activeTab === 'history' ? 'text-slate-800' : 'text-slate-400'}`} />
                    Past Archives
                </button>
            </div>

            {/* Content Display */}
            <div className="min-h-[400px]">
                {activeTab === 'active' && (
                    loadingActive ? <div className="grid grid-cols-1 gap-4"><div className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div><div className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div><div className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div></div> : renderTable(activeItems, 'active')
                )}
                
                {activeTab === 'upcoming' && (
                    loadingUpcoming ? <div className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div> : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Requires Immediate Attention</h3>
                                </div>
                                {renderTable(upcomingData?.actionNeeded, 'active')}
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Expiring Soon</h3>
                                </div>
                                {renderTable(upcomingData?.futureRenewals, 'active')}
                            </div>
                        </div>
                    )
                )}

                {activeTab === 'history' && (
                    loadingHistory ? <div className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div> : renderTable(historyItems, 'history')
                )}
            </div>

            {/* Workflow Modals */}
            <Modal isOpen={renewModalOpen} onClose={() => setRenewModalOpen(false)} title="Asset Renewal Process">
                <form onSubmit={handleRenew} className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                            <RotateCcw className="w-4 h-4" /> Renewal Impact
                        </div>
                        <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                            Renewing this item will **archive the current record** as 'Renewed' and automatically issue a **fresh record** for the next cycle.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">New Item Condition</label>
                            <select 
                                value={itemCondition} 
                                onChange={e => setItemCondition(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
                            >
                                <option value="Good">Perfect / New</option>
                                <option value="Needs Service">Needs Service / Refurbished</option>
                                <option value="Damaged">Damaged / Worn Out</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Internal Notes (Optional)</label>
                            <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 h-28 text-sm"
                                placeholder="Details about this renewal cycle..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={renewMutation.isPending} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
                            {renewMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Complete Renewal Cycle</>}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Asset Return Processing">
                <form onSubmit={handleReturn} className="p-6 space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            Processing return for <strong className="text-slate-900">{selectedItem?.item_name}</strong> from <strong className="text-slate-900">{selectedItem?.employee_name}</strong>.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Returned Condition</label>
                            <select 
                                value={itemCondition} 
                                onChange={e => setItemCondition(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
                            >
                                <option value="Good">Good Condition</option>
                                <option value="Needs Service">Requires Maintenance</option>
                                <option value="Damaged">Severely Damaged</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Return Remarks</label>
                            <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 h-28 text-sm"
                                placeholder="Why is this item being returned? (e.g. Employee resignation, hardware upgrade)"
                                required
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={returnMutation.isPending} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-500/20 transition-all flex items-center justify-center gap-2">
                            {returnMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Archive className="w-4 h-4" /> Process Asset Return</>}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={timelineModalOpen} onClose={() => setTimelineModalOpen(false)} title="Comprehensive Asset Audit Log">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 tracking-tight">{selectedItem?.item_name}</h3>
                            <p className="text-sm text-slate-500 font-medium">Holder: {selectedItem?.employee_name}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-100">
                        {selectedItem?.timeline?.length > 0 ? (
                            selectedItem.timeline.map((event, i) => (
                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-4 border-white bg-blue-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ml-[2px] md:ml-0 transition-transform group-hover:scale-125"></div>
                                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2rem)] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm ml-6 md:ml-0 hover:border-blue-100 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-bold text-sm text-slate-900 uppercase tracking-tight">{event.status}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dayjs(event.date).format('DD MMM, HH:mm')}</div>
                                        </div>
                                        {event.notes && <div className="text-xs text-slate-500 italic bg-slate-50/50 p-3 rounded-xl border border-slate-50">{event.notes}</div>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-500 py-12 font-medium">No historical logs available for this asset.</div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
