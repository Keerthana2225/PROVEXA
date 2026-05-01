import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText, Search, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { toast } from '../components/ui/Toast';

export default function Reports() {
    const [department, setDepartment] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [includeArchived, setIncludeArchived] = useState(false);
    const [exporting, setExporting] = useState(null); // 'xlsx' | 'pdf' | null

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await api.get('/items/categories');
            return data;
        }
    });

    const handleExport = async (format) => {
        setExporting(format);
        try {
            const params = new URLSearchParams({ format });
            if (department) params.append('department', department);
            if (categoryId) params.append('category_id', categoryId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (includeArchived) params.append('include_archived', 'true');

            const response = await api.get(`/reports/export?${params.toString()}`, {
                responseType: 'blob'
            });

            // Mobile-friendly blob download
            const blob = new Blob([response.data], { 
                type: format === 'xlsx' 
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                    : 'application/pdf' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = `Provexa_Report_${new Date().getTime()}.${format}`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(`${format.toUpperCase()} report generated successfully!`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to generate report. Please try again.');
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Intelligence</h3>
                    <p className="text-slate-500 mt-1">Configure filters and generate detailed asset distribution reports.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Search className="w-5 h-5 text-primary" />
                            Report Configuration
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Department</label>
                                <select 
                                    value={department} 
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                                >
                                    <option value="">All Departments</option>
                                    <option value="Production">Production</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Quality">Quality</option>
                                    <option value="Stores">Stores</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Item Category</label>
                                <select 
                                    value={categoryId} 
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                                >
                                    <option value="">All Categories</option>
                                    {categories?.map(c => (
                                        <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={includeArchived}
                                        onChange={(e) => setIncludeArchived(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-6 rounded-full transition-colors ${includeArchived ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${includeArchived ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">Include Archived (History) Records</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Export Options */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm h-full">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Download Options</h4>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => handleExport('xlsx')}
                                disabled={!!exporting}
                                className={`w-full group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl transition-all ${exporting === 'xlsx' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/30'}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${exporting === 'xlsx' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                    {exporting === 'xlsx' ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileSpreadsheet className="w-8 h-8" />}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white">Excel Spreadsheet</span>
                                <span className="text-xs text-slate-500 mt-1 text-center">Includes embedded signature images and styled columns.</span>
                                
                                <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Download className="w-3 h-3 mr-1" />
                                    Download .xlsx
                                </div>
                            </button>

                            <button 
                                onClick={() => handleExport('pdf')}
                                disabled={!!exporting}
                                className={`w-full group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl transition-all ${exporting === 'pdf' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-red-400 hover:bg-red-50/30'}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${exporting === 'pdf' ? 'bg-red-500 text-white animate-pulse' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                    {exporting === 'pdf' ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileText className="w-8 h-8" />}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white">PDF Document</span>
                                <span className="text-xs text-slate-500 mt-1 text-center">Tablet-friendly clean layout for quick preview and printing.</span>

                                <div className="mt-4 flex items-center text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/40 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Download className="w-3 h-3 mr-1" />
                                    Download .pdf
                                </div>
                            </button>
                        </div>

                        <div className="mt-8 flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] leading-tight text-slate-500">
                                Pro Tip: PDF is recommended for mobile devices if your Excel viewer is not configured.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
