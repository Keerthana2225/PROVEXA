import { useState, useMemo, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    ShieldCheck, ScanLine, PenTool, CheckCircle2, 
    XCircle, AlertTriangle, Loader2, Camera, VideoOff, 
    Pause, Play, Users, ArrowRight, UserCheck, Search,
    Fingerprint, QrCode
} from 'lucide-react';
import Modal from './Modal';
import { toast } from './Toast';
import api from '../../lib/api';
import OcrScannerPanel from './OcrScannerPanel';

export default function BulkOcrModal({ isOpen, onClose, initialIssues = [] }) {
    const queryClient = useQueryClient();
    
    // We maintain a local state of which issues are being verified in this session
    const [pendingIssues, setPendingIssues] = useState([]);
    const [verifiedIssues, setVerifiedIssues] = useState([]);
    const [search, setSearch] = useState('');
    const [activeTarget, setActiveTarget] = useState(null);

    // Initialize when modal opens
    useEffect(() => {
        if (isOpen) {
            const pending = initialIssues.filter(i => i.issue_status === 'Pending Acknowledgement');
            setPendingIssues(pending);
            setVerifiedIssues([]);
            setActiveTarget(null);
        }
    }, [isOpen, initialIssues]);

    const acknowledgeMutation = useMutation({
        mutationFn: async ({ issueId, employeeName, ocrResult }) => {
            const { data } = await api.put(`/issues/acknowledge/${issueId}`, {
                verification_type: 'ocr',
                verification_method: 'OCR Scan (Bulk Mode)',
                ocr_details: ocrResult
            });
            return { data, issueId, employeeName };
        },
        onSuccess: ({ data, issueId, employeeName }) => {
            // Move from pending to verified
            setPendingIssues(prev => {
                const item = prev.find(i => i.id === issueId || i._id === issueId);
                if (item) {
                    setVerifiedIssues(v => [{ ...item, verifiedAt: new Date() }, ...v]);
                }
                return prev.filter(i => i.id !== issueId && i._id !== issueId);
            });
            
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            
            toast.success(`Verified: ${employeeName}`);
            setActiveTarget(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Verification failed');
            setActiveTarget(null);
        }
    });

    const handleOcrResult = useCallback((result) => {
        if (result.status === 'Verified') {
            // Find employee in our pending list
            const empCode = String(result.employee?.emp_code || '').trim();
            const issue = pendingIssues.find(i => 
                String(i.employee?.emp_code || '').trim() === empCode ||
                String(i.employee?.emp_code || '').trim() === `0${empCode}`
            );

            if (issue) {
                setActiveTarget(issue.employee?.name);
                acknowledgeMutation.mutate({ 
                    issueId: issue.id || issue._id, 
                    employeeName: issue.employee?.name,
                    ocrResult: result
                });
            } else {
                toast.error(`Employee ${result.employee?.name} (${empCode}) has no pending items in this queue.`);
            }
        }
    }, [pendingIssues, acknowledgeMutation]);

    const filteredPending = useMemo(() => {
        return pendingIssues.filter(i => 
            i.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
            i.employee?.emp_code?.includes(search)
        );
    }, [pendingIssues, search]);

    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Bulk Identity Verification"
            maxWidth="max-w-6xl"
        >
            <div className="flex flex-col lg:flex-row h-[80vh] overflow-hidden">
                {/* Left Side: Scanner */}
                <div className="flex-1 p-6 flex flex-col gap-6 bg-slate-950 border-r border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                                <ScanLine className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Bulk Scan Engine</h3>
                                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">PaddleOCR v4 Ready</p>
                            </div>
                        </div>
                        {activeTarget && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-[10px] font-bold uppercase">Verifying: {activeTarget}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-h-0 relative group">
                        <OcrScannerPanel 
                            onResult={handleOcrResult} 
                            autoStart={true}
                        />
                        
                        {/* Overlay helper */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white text-center pointer-events-none group-hover:opacity-0 transition-opacity">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Instruction</p>
                            <p className="text-xs font-medium text-slate-300">Show ID card to the camera for instant verification</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Progress & Queue */}
                <div className="w-full lg:w-[400px] flex flex-col min-w-0 bg-white">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Scan Session Queue</h3>
                            <p className="text-[10px] text-slate-500 font-medium">{pendingIssues.length} employees remaining</p>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-black text-indigo-600">{verifiedIssues.length}</div>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Verified</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100">
                        <div 
                            className="h-full bg-indigo-600 transition-all duration-700 ease-out" 
                            style={{ width: `${(verifiedIssues.length / (pendingIssues.length + verifiedIssues.length || 1)) * 100}%` }}
                        />
                    </div>

                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Filter queue..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                        {pendingIssues.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-fade-in">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">Queue Completed</h4>
                                <p className="text-xs text-slate-500">All employees in this session have been verified.</p>
                            </div>
                        )}

                        {filteredPending.map((issue) => (
                            <div 
                                key={issue.id || issue._id}
                                className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[10px] shrink-0">
                                    {issue.employee?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-xs truncate">{issue.employee?.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">{issue.employee?.emp_code} · {issue.item?.name}</div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            </div>
                        ))}

                        {verifiedIssues.length > 0 && (
                            <div className="pt-6 pb-2">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" /> Just Verified
                                </div>
                                <div className="space-y-2">
                                    {verifiedIssues.map((issue) => (
                                        <div key={issue.id || issue._id} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-scale-up">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-emerald-800 text-[11px] truncate">{issue.employee?.name}</div>
                                                <div className="text-[9px] text-emerald-600 font-medium">Verified at {issue.verifiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                        >
                            Finish & Close
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
