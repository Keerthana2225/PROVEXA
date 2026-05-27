import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Search, Loader2, CheckCircle2, ChevronDown, Filter, RefreshCcw, CreditCard, ClipboardList } from 'lucide-react';
import api from '../lib/api';
import { toast } from '../components/ui/Toast';
import dayjs from 'dayjs';

export default function Reports() {
    // Global/General Filters
    const [department, setDepartment] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    
    // Verification Filters
    const [verificationStatus, setVerificationStatus] = useState('');
    const [verificationMethod, setVerificationMethod] = useState('');
    
    // Replacement Filters
    const [replacementStatus, setReplacementStatus] = useState('');
    const [itemType, setItemType] = useState('all'); // all | Uniform | General

    const [exporting, setExporting] = useState(null); // 'issue' | 'replacement_history' | 'uniform_cost' | null

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await api.get('/items/categories');
            return data;
        }
    });

    const handleExport = async (reportType) => {
        setExporting(reportType);
        try {
            let endpoint = '';
            let filename = '';
            const timestamp = dayjs().format('YYYY-MM-DD');

            const params = new URLSearchParams();
            if (department) params.append('department', department);
            if (startDate) params.append('from_date', startDate);
            if (endDate) params.append('to_date', endDate);
            if (employeeId) params.append('employee_id', employeeId);

            if (reportType === 'issue') {
                endpoint = '/reports/export';
                filename = `Issue_Report_${timestamp}.xlsx`;
                if (categoryId) params.append('category_id', categoryId);
                if (verificationStatus) params.append('verification_status', verificationStatus);
                if (verificationMethod) params.append('verification_method', verificationMethod);
                // Also support the old startDate/endDate params if backend still uses them
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
            } else if (reportType === 'replacement_history') {
                endpoint = '/reports/replacements/history';
                filename = `Replacement_History_${timestamp}.xlsx`;
                if (replacementStatus) params.append('status', replacementStatus);
                if (itemType) params.append('item_type', itemType);
            } else if (reportType === 'uniform_cost') {
                endpoint = '/reports/replacements/uniform';
                filename = `Uniform_Cost_Report_${timestamp}.xlsx`;
            } else if (reportType === 'additional_deductions') {
                endpoint = '/reports/replacements/additional-deductions';
                filename = `Additional_Uniform_Cost_Report_${timestamp}.xlsx`;
            }

            const response = await api.get(`${endpoint}?${params.toString()}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(`Report generated successfully!`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to generate report. Please try again.');
        } finally {
            setExporting(null);
        }
    };

    const handlePolicyExport = async (type, label) => {
        setExporting(type);
        try {
            const timestamp = dayjs().format('YYYY-MM-DD');
            const filename = `${label.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

            const response = await api.get(`/reports/policy-export?type=${type}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(`${label} generated successfully!`);
        } catch (error) {
            console.error('Policy export error:', error);
            toast.error('Failed to generate report. Please try again.');
        } finally {
            setExporting(null);
        }
    };

    const resetFilters = () => {
        setDepartment('');
        setCategoryId('');
        setStartDate('');
        setEndDate('');
        setEmployeeId('');
        setVerificationStatus('');
        setVerificationMethod('');
        setReplacementStatus('');
        setItemType('all');
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Intelligence</h3>
                    <p className="text-slate-500 mt-1">Configure filters and generate enterprise-grade Excel reports.</p>
                </div>
                <button 
                    onClick={resetFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Reset Filters
                </button>
            </div>

            {/* Filter Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">Global Filters</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Department</label>
                        <select 
                            value={department} 
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        >
                            <option value="">All Departments</option>
                            <option value="Production">Production</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Quality">Quality</option>
                            <option value="Stores">Stores</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Employee ID</label>
                        <input 
                            type="text"
                            placeholder="Search ID..."
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Start Date</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">End Date</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General/Asset Reports */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white">General Reports</h4>
                            </div>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Asset Category</label>
                                    <select 
                                        value={categoryId} 
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    >
                                        <option value="">All Categories</option>
                                        {categories?.map(c => (
                                            <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Verification Method</label>
                                    <select 
                                        value={verificationMethod} 
                                        onChange={(e) => setVerificationMethod(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    >
                                        <option value="all">All Methods</option>
                                        <option value="OCR Scan">OCR Verification</option>
                                        <option value="Signature">Digital Signature</option>
                                        <option value="Signature + OCR">Both Methods</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-slate-400 ml-1">Acknowledgement Status</label>
                                    <select 
                                        value={verificationStatus} 
                                        onChange={(e) => setVerificationStatus(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="Issued – Signature Awaited">Signature Awaited (Issued, not yet signed)</option>
                                        <option value="OCR Verified">OCR Verified</option>
                                        <option value="Signature Verified">Signature Verified</option>
                                        <option value="Fully Verified">Fully Verified</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <button 
                                onClick={() => handleExport('issue')}
                                disabled={!!exporting}
                                className="w-full group flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                            >
                                {exporting === 'issue' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <FileSpreadsheet className="w-5 h-5" />
                                )}
                                Export Issue Report (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Replacement Reports */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <RefreshCcw className="w-6 h-6" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white">Additional Cost & Replacement Reports</h4>
                            </div>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status Filter</label>
                                    <select 
                                        value={replacementStatus} 
                                        onChange={(e) => setReplacementStatus(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="Pending">Awaiting Approval</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 space-y-3.5">
                            <button 
                                onClick={() => handleExport('additional_deductions')}
                                disabled={!!exporting}
                                className="w-full group flex items-center justify-center gap-3 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/10 active:scale-[0.99]"
                            >
                                {exporting === 'additional_deductions' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                                Export Additional Items Report (.xlsx)
                            </button>
                            
                            <button 
                                onClick={() => handleExport('replacement_history')}
                                disabled={!!exporting}
                                className="w-full group flex items-center justify-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-[0.99]"
                            >
                                {exporting === 'replacement_history' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                Export Replacements Report (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Enterprise Export:</strong> All reports include frozen headers, alternate row shading, and auto-filters for a professional workflow.
                </p>
            </div>
        </div>
    );
}
