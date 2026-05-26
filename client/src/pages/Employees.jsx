import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, UserCircle, Pencil, LayoutDashboard, Briefcase, Tag, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import EmployeeForm from '../components/ui/EmployeeForm';

export default function Employees() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editData, setEditData] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['employees', search, page],
        queryFn: async () => {
            const res = await api.get(`/employees?page=${page}&search=${search}&limit=10`);
            return res.data;
        },
        keepPreviousData: true
    });

    const handleEdit = (emp) => {
        setEditData(emp);
        setShowForm(true);
    };

    const handleClose = () => {
        setShowForm(false);
        setEditData(null);
    };

    const getStatusColor = (status) => {
        return status === 'active' 
            ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100/50 text-slate-600 border-slate-200';
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employee Directory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your workforce, track allocations, and oversee asset distribution across departments.</p>
                </div>
                <button
                    onClick={() => { setEditData(null); setShowForm(true); }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Add Employee
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, code, or department..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse table-fixed">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4 w-2/5">Employee Details</th>
                                <th className="px-6 py-4 w-1/4">Department & Role</th>
                                <th className="px-6 py-4 w-1/6">Status</th>
                                <th className="px-6 py-4 w-1/5 text-right">Quick Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100"></div>
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-slate-100 rounded w-32"></div>
                                                    <div className="h-3 bg-slate-50 rounded w-20"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="h-4 bg-slate-100 rounded w-24"></div>
                                                <div className="h-3 bg-slate-50 rounded w-32"></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-xl w-24 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : data?.employees.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-24 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                                            <UserCircle className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-800 font-bold text-lg">No employees found</p>
                                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">We couldn't find any employees matching your search criteria. Try adjusting your filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                data?.employees.map(emp => {
                                    const empId = emp.id || emp._id;
                                    return (
                                        <tr key={empId} className="hover:bg-indigo-50/30 transition-colors group">
                                            {/* Name & Code */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center border border-indigo-100/50 flex-shrink-0 group-hover:scale-110 transition-transform">
                                                        <span className="text-indigo-600 font-black text-sm">
                                                            {emp.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{emp.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="font-mono text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">{emp.emp_code}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${emp.employee_type === 'Trainee' ? 'text-amber-500' : 'text-blue-500'}`}>
                                                                • {emp.employee_type || 'Permanent Employee'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Dept & Role */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                        {emp.department}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                        <Tag className="w-3 h-3 text-slate-400" />
                                                        {emp.designation || 'No Designation'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(emp.status)}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                    {emp.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/employees/${empId}/profile`)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <LayoutDashboard className="w-3.5 h-3.5" />
                                                        Profile
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(emp)}
                                                        className="inline-flex items-center justify-center w-8 h-8 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data?.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                            Showing page <span className="text-slate-800 font-black">{page}</span> of {data.totalPages} ({data.total} records)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === data.totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <EmployeeForm isOpen={showForm} onClose={handleClose} editData={editData} />
        </div>
    );
}
