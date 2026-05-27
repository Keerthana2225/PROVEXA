import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import { 
    ScanLine, PenTool, CheckCircle2, 
    XCircle, AlertTriangle, Loader2, ShieldCheck, X, RefreshCcw, Package
} from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';
import OcrScannerPanel from './OcrScannerPanel';

const STATUS = {
    SELECT_METHOD: 'select_method',
    OCR_SCANNING: 'ocr_scanning',
    SIGNATURE: 'signature',
    SUCCESS: 'success',
    FAILED: 'failed'
};

export default function ReplacementHandoverModal({ isOpen, onClose, request }) {
    const queryClient = useQueryClient();
    
    const [step, setStep] = useState(STATUS.SELECT_METHOD);
    const [method, setMethod] = useState(null); // 'ocr' | 'signature' | 'both'
    const [ocrVerified, setOcrVerified] = useState(false);
    const [ocrData, setOcrData] = useState(null);
    const [notes, setNotes] = useState('');
    const [itemCollected, setItemCollected] = useState(false);
    
    // Signature state
    const sigCanvas = useRef(null);
    const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(STATUS.SELECT_METHOD);
            setMethod(null);
            setOcrVerified(false);
            setOcrData(null);
            setIsSignatureEmpty(true);
            setError('');
            setNotes('');
            setItemCollected(false);
        }
    }, [isOpen]);

    const mutation = useMutation({
        mutationFn: async (payload) => {
            const id = request?._id || request?.id;
            console.log(`[Handover] Submitting for ID: ${id}`, payload);
            const { data } = await api.put(`/replacements/${id}/acknowledge`, {
                ...payload,
                notes,
                item_collected: itemCollected,
                verification_method: method === 'both' ? 'Signature + OCR' : (method === 'ocr' ? 'OCR Scan' : 'Signature'),
                ocr_details: payload.ocr_details || ocrData
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['replacements'] });
            queryClient.invalidateQueries({ queryKey: ['replacements-summary'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
            toast.success('Replacement handover completed successfully!');
            setStep(STATUS.SUCCESS);
            setTimeout(() => {
                onClose();
            }, 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Handover failed');
            toast.error(err.response?.data?.message || 'Failed to complete handover');
        }
    });

    const handleOcrResult = (result) => {
        const empCode = request.employee?.emp_code || '';
        if (result.status === 'Verified' && (result.employee?.emp_code === empCode || `0${result.employee?.emp_code}` === empCode)) {
            setOcrVerified(true);
            setOcrData(result);
            toast.success('ID Card Verified!');
            
            if (method === 'both') {
                setStep(STATUS.SIGNATURE);
            } else {
                // OCR Only
                mutation.mutate({ 
                    ocr_details: result,
                    verification_type: 'ocr'
                });
            }
        } else if (result.status === 'Verified') {
            toast.error(`Employee mismatch! Card belongs to ${result.employee.name}.`);
        }
    };

    const handleSignatureSubmit = () => {
        // Check the canvas directly for emptiness — don't rely on state
        const isEmpty = !sigCanvas.current || sigCanvas.current.isEmpty();
        if (isEmpty) {
            return toast.error('Please draw the employee signature first.');
        }
        
        // Use getCanvas().toDataURL() instead of getTrimmedCanvas() to avoid the trim-canvas bug
        const signatureBase64 = sigCanvas.current.getCanvas().toDataURL('image/png');
        mutation.mutate({ 
            signature: signatureBase64,
            verification_type: 'signature'
        });
    };

    if (!request) return null;

    const displayName = request.employee_name || request.employee?.name || 'Employee';

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Secure Asset Exchange"
            maxWidth="max-w-2xl"
        >
            <div className="p-1">
                {/* ── Step: Select Method & Asset Check ────────────────────── */}
                {step === STATUS.SELECT_METHOD && (
                    <div className="p-6 space-y-8 animate-fade-in">
                        {/* Info Header */}
                        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
                            <div className="relative z-10 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Recipient</p>
                                <h4 className="text-xl font-black tracking-tight">{displayName}</h4>
                                <p className="text-xs text-slate-400 font-medium">{request.item_name} (Qty: {request.quantity})</p>
                            </div>
                            <Package className="w-16 h-16 text-white/10 absolute -right-2 -bottom-2" />
                            {request.allocation_type !== 'Replacement' && (
                                <div className="relative z-10 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                                        {request.allocation_type === 'Additional' ? 'Additional Cost' : 'Deduction'}
                                    </p>
                                    <p className="text-lg font-black text-white">₹{request.total_cost || request.deduction_amount || 0}</p>
                                </div>
                            )}
                        </div>

                        {/* Asset Exchange Confirmation - ONLY FOR REPLACEMENTS */}
                        {request.allocation_type === 'Replacement' && request.return_status !== 'Not Required' && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-200 rounded-2xl flex items-center justify-center text-amber-700">
                                        <RefreshCcw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Old Asset Collection</h4>
                                        <p className="text-xs text-slate-500 font-medium">Verify if the damaged item is being returned now.</p>
                                    </div>
                                </div>
                                
                                <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${itemCollected ? 'bg-white border-amber-500 shadow-lg shadow-amber-200/50' : 'bg-amber-100/50 border-transparent'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="w-6 h-6 rounded-lg border-2 border-amber-300 text-amber-600 focus:ring-amber-500"
                                        checked={itemCollected}
                                        onChange={(e) => setItemCollected(e.target.checked)}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">I have collected the old/damaged item</p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Status: {itemCollected ? 'HANDED OVER TO ADMIN' : 'AWAITING HANDOVER'}</p>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identity Verification</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { id: 'ocr', label: 'OCR ID Scan', icon: ScanLine, color: 'blue' },
                                    { id: 'signature', label: 'Signature', icon: PenTool, color: 'purple' },
                                    { id: 'both', label: 'Both', icon: ShieldCheck, color: 'emerald' },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        disabled={!itemCollected && request.allocation_type === 'Replacement' && request.return_status !== 'Not Required'}
                                        onClick={() => {
                                            setMethod(opt.id);
                                            setStep(opt.id === 'signature' ? STATUS.SIGNATURE : STATUS.OCR_SCANNING);
                                        }}
                                        className={`flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale
                                            ${opt.id === 'ocr' ? 'border-blue-100 hover:border-blue-400 bg-blue-50/50' : 
                                              opt.id === 'signature' ? 'border-purple-100 hover:border-purple-400 bg-purple-50/50' : 
                                              'border-emerald-100 hover:border-emerald-400 bg-emerald-50/50'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6 shadow-lg
                                            ${opt.id === 'ocr' ? 'bg-blue-600 shadow-blue-500/30' : opt.id === 'signature' ? 'bg-purple-600 shadow-purple-500/30' : 'bg-emerald-600 shadow-emerald-500/30'}`}>
                                            <opt.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="font-black text-slate-900 text-[11px] uppercase tracking-wider">{opt.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: OCR Scanning ─────────────────────────────────────── */}
                {step === STATUS.OCR_SCANNING && (
                    <div className="p-6 space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-3">
                                <ScanLine className="w-5 h-5 text-blue-600" /> Identity Verification
                            </h3>
                            <button onClick={() => setStep(STATUS.SELECT_METHOD)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl ring-4 ring-slate-100">
                            <OcrScannerPanel onResult={handleOcrResult} />
                        </div>
                    </div>
                )}

                {/* ── Step: Signature ────────────────────────────────────────── */}
                {step === STATUS.SIGNATURE && (
                    <div className="p-6 space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-3">
                                <PenTool className="w-5 h-5 text-purple-600" /> Final Acknowledgement
                            </h3>
                            {method !== 'both' && <button onClick={() => setStep(STATUS.SELECT_METHOD)} className="text-xs text-slate-400 font-bold hover:text-slate-900">Go Back</button>}
                        </div>

                        {ocrVerified && (
                            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> OCR Identity Verified
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Digital Signature</label>
                                    <button onClick={() => { sigCanvas.current?.clear(); setIsSignatureEmpty(true); }} className="text-[10px] text-red-500 font-black uppercase tracking-widest px-3 py-1 hover:bg-red-50 rounded-lg">Clear</button>
                                </div>
                                <div className="bg-white rounded-2xl overflow-hidden shadow-inner ring-1 ring-slate-200">
                                    <SignatureCanvas ref={sigCanvas} penColor="#0f172a" canvasProps={{ className: 'w-full h-48 cursor-crosshair' }} onEnd={() => setIsSignatureEmpty(false)} />
                                </div>
                            </div>

                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium h-24"
                                placeholder="Add final handover notes..."
                            />

                            <button
                                onClick={handleSignatureSubmit}
                                disabled={mutation.isPending}
                                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-slate-900/20 transition-all disabled:opacity-70 text-[11px] uppercase tracking-[0.2em]"
                            >
                                {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Complete Handover'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Success Overlay ───────────────────────────────────────── */}
                {step === STATUS.SUCCESS && (
                    <div className="p-16 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                        <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Handover Complete</h3>
                            <p className="text-slate-500 font-medium">The asset has been successfully exchanged.</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
