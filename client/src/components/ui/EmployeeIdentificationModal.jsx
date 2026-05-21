import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, User, FileText, CreditCard, ChevronRight, RefreshCw, ScanLine, X } from 'lucide-react';
import Modal from './Modal';
import OcrScannerPanel from './OcrScannerPanel';
import api from '../../lib/api';

export default function EmployeeIdentificationModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState('ocr'); // 'ocr' | 'search' | 'preview'
    const [identifiedEmployeeId, setIdentifiedEmployeeId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: employees } = useQuery({
        queryKey: ['employees-search-list'],
        queryFn: async () => {
            const { data } = await api.get('/employees?limit=500');
            return data.employees;
        },
        enabled: isOpen && mode === 'search',
    });

    const { data: profile, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['employee-preview-profile', identifiedEmployeeId],
        queryFn: async () => {
            const { data } = await api.get(`/employees/${identifiedEmployeeId}/asset-profile`);
            return data;
        },
        enabled: !!identifiedEmployeeId,
    });

    useEffect(() => {
        if (!isOpen) {
            setMode('ocr');
            setIdentifiedEmployeeId(null);
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleOcrResult = (result) => {
        if ((result.status === 'Verified' || result.status === 'Duplicate Scan') && result.employee) {
            setIdentifiedEmployeeId(result.employee._id || result.employee.id);
            setMode('preview');
        }
    };

    const handleManualSelect = (id) => {
        setIdentifiedEmployeeId(id);
        setMode('preview');
    };

    const handleContinue = () => {
        onClose();
        navigate(`/employees/${identifiedEmployeeId}/profile`);
    };

    const handleRescan = () => {
        setIdentifiedEmployeeId(null);
        setMode('ocr');
    };

    const filteredEmployees = employees?.filter(emp => 
        emp.status === 'active' && 
        (emp.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
         emp.emp_code.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
         emp.department.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Identify Employee" maxWidth="max-w-2xl">
            <div className="p-1">
                {mode === 'preview' && profile && (
                    <div className="p-5 space-y-5 animate-fade-in">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <User className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">{profile.employee.name}</h3>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                                {profile.employee.emp_code} • {profile.employee.department}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                <FileText className="w-5 h-5 text-indigo-500 mb-1" />
                                <span className="text-2xl font-black text-slate-800">{profile.allocations.active.length}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Allocations</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                <CreditCard className={`w-5 h-5 mb-1 ${profile.additionalCosts?.pending > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                                <span className={`text-2xl font-black ${profile.additionalCosts?.pending > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                    {profile.additionalCosts?.pending > 0 ? 'Yes' : 'None'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Deductions</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleRescan}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <RefreshCw className="w-4 h-4" /> Rescan / Search
                            </button>
                            <button
                                onClick={handleContinue}
                                className="flex-[2] bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                            >
                                Continue to Profile <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'preview' && isLoadingProfile && (
                    <div className="p-12 text-center text-slate-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                        <p className="font-semibold">Loading employee profile preview...</p>
                    </div>
                )}

                {mode !== 'preview' && (
                    <div className="p-4 space-y-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setMode('ocr')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'ocr' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ScanLine className="w-4 h-4" /> OCR Scan ID
                            </button>
                            <button
                                onClick={() => setMode('search')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'search' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Search className="w-4 h-4" /> Manual Search
                            </button>
                        </div>

                        {mode === 'ocr' ? (
                            <OcrScannerPanel onResult={handleOcrResult} />
                        ) : (
                            <div className="space-y-4 min-h-[300px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID, or department..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {filteredEmployees?.map(emp => (
                                        <div
                                            key={emp.id || emp._id}
                                            onClick={() => handleManualSelect(emp.id || emp._id)}
                                            className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{emp.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{emp.emp_code} • {emp.department}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    ))}
                                    {filteredEmployees?.length === 0 && (
                                        <div className="text-center p-8 text-slate-500 text-sm">No employees found.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
