import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, Clock, AlertTriangle, RefreshCw, Plus, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import IssueForm from '../components/ui/IssueForm';
import ReplacementForm from '../components/ui/ReplacementForm';

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card-hover transition-all duration-200 group cursor-default">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900">{value ?? '—'}</h3>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgClass} group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
        </div>
    </div>
);

export default function Dashboard() {
    const navigate = useNavigate();
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [showReplacementForm, setShowReplacementForm] = useState(false);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const { data } = await api.get('/dashboard/stats');
            return data;
        }
    });

    const { data: chartData, isLoading: chartLoading } = useQuery({
        queryKey: ['dashboardChart'],
        queryFn: async () => {
            const { data } = await api.get('/dashboard/chart-data');
            return data;
        }
    });

    return (
        <div className="space-y-8 animate-fade-in pb-12 max-w-7xl mx-auto">

            {/* Stat Cards */}
            {statsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                    <StatCard title="Active Employees" value={stats?.totalEmployees} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" />
                    <StatCard title="Issued This Month" value={stats?.itemsIssuedThisMonth} icon={Package} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
                    <StatCard title="Pending Replacements" value={stats?.pendingReplacements} icon={RefreshCw} colorClass="text-purple-600" bgClass="bg-purple-50" />
                    <StatCard title="Upcoming Renewals" value={stats?.upcomingRenewals} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-50" />
                    <StatCard title="Items Requiring Attention" value={stats?.itemsRequiringAttention} icon={AlertTriangle} colorClass="text-red-600" bgClass="bg-red-50" />
                </div>
            )}

            {/* Uniform Billing Intelligence Row */}
            {!statsLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card-hover transition-all duration-200 group flex items-center justify-between cursor-default">
                        <div>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Additional Allocation Requests</p>
                            <h3 className="text-3xl font-black text-slate-900">{stats?.additionalRequestsCount ?? '0'}</h3>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-1">Total items requested beyond free limits</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Package className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card-hover transition-all duration-200 group flex items-center justify-between cursor-default">
                        <div>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Pending Additional Cost</p>
                            <h3 className="text-3xl font-black text-slate-900">{stats?.pendingDeductionsCount ?? '0'}</h3>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-1">Billing awaiting payroll cycle</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card-hover transition-all duration-200 group flex items-center justify-between cursor-default">
                        <div>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Additional Cost</p>
                            <h3 className="text-3xl font-black text-slate-900">₹{(stats?.totalDeductionAmount || 0).toLocaleString()}</h3>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-1">Aggregated cost of additional uniforms</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Distribution Trends</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Items issued over the last 6 months</p>
                        </div>
                    </div>
                    {chartLoading ? (
                        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc', radius: 6 }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '13px' }}
                                    />
                                    <Bar dataKey="issues" name="Items Issued" fill="#3b82f6" radius={[5, 5, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900 mb-5">Quick Actions</h3>
                    <div className="space-y-3 flex-1">
                        <button
                            onClick={() => setShowIssueForm(true)}
                            className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-sm">Issue Item</div>
                                    <div className="text-xs text-blue-500">Distribute to employee</div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => setShowReplacementForm(true)}
                            className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center">
                                    <RefreshCw className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-sm">New Replacement</div>
                                    <div className="text-xs text-purple-500">Submit a request</div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => navigate('/item-renewal')}
                            className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-sm">View Renewals</div>
                                    <div className="text-xs text-amber-500">{stats?.itemsRequiringAttention || 0} attention · {stats?.upcomingRenewals || 0} upcoming</div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => navigate('/employees')}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-sm">Manage Employees</div>
                                    <div className="text-xs text-slate-500">{stats?.totalEmployees || 0} active employees</div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            <IssueForm isOpen={showIssueForm} onClose={() => setShowIssueForm(false)} />
            <ReplacementForm isOpen={showReplacementForm} onClose={() => setShowReplacementForm(false)} />
        </div>
    );
}
