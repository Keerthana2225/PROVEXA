import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Check, X, Clock, Plus, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import ReplacementForm from '../components/ui/ReplacementForm';
import { toast } from '../components/ui/Toast';

export default function Replacements() {
    const [statusFilter, setStatusFilter] = useState('pending');
    const [showForm, setShowForm] = useState(false);
    const queryClient = useQueryClient();

    const { data: requests, isLoading } = useQuery({
        queryKey: ['replacements', statusFilter],
        queryFn: async () => {
            const status = statusFilter === 'all' ? '' : statusFilter;
            const { data } = await api.get(`/replacements?status=${status}`);
            return data;
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (id) => {
            const { data } = await api.put(`/replacements/${id}/approve`, { notes: 'Approved via dashboard' });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['replacements']);
            queryClient.invalidateQueries(['dashboardStats']);
            queryClient.invalidateQueries(['issues']);
            toast.success('Request approved and new issue record created!');
        },
        onError: () => toast.error('Failed to approve request')
    });

    const rejectMutation = useMutation({
        mutationFn: async (id) => {
            const { data } = await api.put(`/replacements/${id}/reject`, { notes: 'Rejected via dashboard' });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['replacements']);
            queryClient.invalidateQueries(['dashboardStats']);
            toast.success('Request has been rejected');
        },
        onError: () => toast.error('Failed to reject request')
    });

    const statusTabs = [
        { key: 'pending', label: '⏳ Pending' },
        { key: 'approved', label: '✅ Approved' },
        { key: 'rejected', label: '❌ Rejected' },
        { key: 'all', label: 'All' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl gap-1">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === tab.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-primary/20 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Request
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                    ))
                ) : requests?.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <RefreshCw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No {statusFilter !== 'all' ? statusFilter : ''} requests</p>
                        <p className="text-slate-400 text-sm mt-1">Replacement requests will appear here.</p>
                    </div>
                ) : (
                    requests?.map(req => {
                        const requestId = req.id || req._id;
                        return (
                            <div key={requestId} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col animate-fade-in">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                        ${req.status === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {req.status === 'pending' && <Clock className="w-3 h-3" />}
                                        {req.status === 'approved' && <Check className="w-3 h-3" />}
                                        {req.status === 'rejected' && <X className="w-3 h-3" />}
                                        {req.status}
                                    </span>
                                    <span className="text-xs text-slate-400">{dayjs(req.requested_date).format('DD MMM YYYY')}</span>
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                                        {req.employee?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{req.employee?.name || 'Unknown Employee'}</h4>
                                        <p className="text-xs text-slate-500">{req.employee?.emp_code || 'N/A'} · {req.employee?.department || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-700/50">
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Item</div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-3">{req.item?.name || 'Unknown Item'}</div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Reason</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400 italic">"{req.reason || 'No reason provided'}"</div>
                                </div>

                                {req.notes && req.status !== 'pending' && (
                                    <div className="text-xs text-slate-500 mb-4 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                                        Admin note: {req.notes}
                                    </div>
                                )}

                                {req.status === 'pending' && (
                                    <div className="flex gap-3 mt-auto">
                                        <button
                                            onClick={() => approveMutation.mutate(requestId)}
                                            disabled={approveMutation.isPending || rejectMutation.isPending}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 shadow-sm shadow-emerald-500/20"
                                        >
                                            <Check className="w-4 h-4" /> Approve
                                        </button>
                                        <button
                                            onClick={() => rejectMutation.mutate(requestId)}
                                            disabled={approveMutation.isPending || rejectMutation.isPending}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 dark:border-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                                        >
                                            <X className="w-4 h-4" /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <ReplacementForm isOpen={showForm} onClose={() => setShowForm(false)} />
        </div>
    );
}
