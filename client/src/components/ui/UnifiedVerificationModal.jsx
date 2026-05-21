import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import { 
    ShieldCheck, ScanLine, PenTool, CheckCircle2, 
    XCircle, AlertTriangle, Loader2, Camera, VideoOff, Pause, Play
} from 'lucide-react';
import Modal from './Modal';
import { toast } from './Toast';
import api from '../../lib/api';
import OcrScannerPanel from './OcrScannerPanel';

const STATUS = {
    SELECT_METHOD: 'select_method',
    OCR_SCANNING: 'ocr_scanning',
    SIGNATURE: 'signature',
    SUCCESS: 'success',
    FAILED: 'failed'
};

export default function UnifiedVerificationModal({ isOpen, onClose, employee, issueId, pendingCount, onSuccess }) {
    const queryClient = useQueryClient();
    // Resolve employee ID — SQL uses _id, old Mongo used id
    const employeeId = employee?._id || employee?.id;
    
    const [step, setStep] = useState(STATUS.SELECT_METHOD);
    const [method, setMethod] = useState(null); // 'ocr' | 'signature' | 'both'
    const [ocrVerified, setOcrVerified] = useState(false);
    const [ocrData, setOcrData] = useState(null);
    
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
        }
    }, [isOpen]);

    const acknowledgeMutation = useMutation({
        mutationFn: async (payload) => {
            const { ocr_details: directOcrDetails, ...rest } = payload;
            const endpoint = issueId 
                ? `/issues/acknowledge/${issueId}` 
                : `/issues/acknowledge/employee/${employeeId}`;
            
            if (!issueId && !employeeId) {
                throw new Error('No employee or issue ID provided for acknowledgement');
            }
            
            const { data } = await api.put(endpoint, {
                ...rest,
                verification_method: method === 'both' ? 'OCR + Signature' : (method === 'ocr' ? 'OCR Scan' : 'Signature'),
                ocr_details: directOcrDetails || ocrData
            });
            return data;
        },
        onSuccess: (data) => {
            // Invalidate all relevant queries so UI updates immediately
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
            queryClient.invalidateQueries({ queryKey: ['dueTracking'] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle'] });
            // Also refetch the specific employee profile
            if (employeeId) {
                queryClient.invalidateQueries({ queryKey: ['employee-profile', employeeId] });
            }
            toast.success(data.message || 'Verification & Acknowledgement completed!');
            setStep(STATUS.SUCCESS);
            // Call parent onSuccess callback if provided
            if (onSuccess) onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Verification failed');
            setStep(STATUS.FAILED);
        }
    });

    const handleOcrResult = (result) => {
        if (result.status === 'Verified') {
            // Normalize both codes to pure digits for comparison
            const scannedCode = String(result.employee?.emp_code || '').replace(/\D/g, '');
            const expectedCode = String(employee?.emp_code || '').replace(/\D/g, '');

            if (scannedCode && expectedCode && scannedCode !== expectedCode) {
                // Different employee's card scanned
                toast.error(`Wrong card! This belongs to ${result.employee?.name}. Please scan ${displayName}'s card.`);
                return;
            }

            // Correct card (or no expected code to compare against)
            setOcrVerified(true);
            setOcrData(result);
            toast.success(`✓ ${result.employee?.name} verified via ID card!`);

            if (method === 'both') {
                setStep(STATUS.SIGNATURE);
            } else {
                // OCR Only — complete acknowledgement immediately
                acknowledgeMutation.mutate({
                    verification_type: 'ocr',
                    confidence: result.confidence,
                    ocr_details: result
                });
            }
        }
    };

    const handleSignatureSubmit = () => {
        if (isSignatureEmpty || !sigCanvas.current) {
            toast.error('Please provide a signature first.');
            return;
        }

        const signatureData = sigCanvas.current.toDataURL('image/png');
        acknowledgeMutation.mutate({
            verification_type: 'signature',
            signature: signatureData
        });
    };

    const clearSignature = () => {
        sigCanvas.current.clear();
        setIsSignatureEmpty(true);
    };

    if (!isOpen) return null;

    const displayName = employee?.name || 'Employee';

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Unified Identity Verification"
            maxWidth="max-w-3xl"
        >
            <div className="p-1">
                {/* ── Step 1: Select Method ────────────────────────────────────── */}
                {step === STATUS.SELECT_METHOD && (
                    <div className="p-8 space-y-8 animate-fade-in">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Identity Verification</h3>
                                <p className="text-sm text-slate-500 font-medium max-w-sm">
                                    How would you like to verify <span className="text-indigo-600 font-bold">{displayName}</span> for <span className="font-bold">{pendingCount} item(s)</span>?
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {[
                                { id: 'ocr', label: 'AI ID Scan', icon: ScanLine, color: 'blue', desc: 'Auto-read card' },
                                { id: 'signature', label: 'Signature', icon: PenTool, color: 'purple', desc: 'Digital sign' },
                                { id: 'both', label: 'Dual Mode', icon: ShieldCheck, color: 'emerald', desc: 'Maximum security' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setMethod(opt.id);
                                        setStep(opt.id === 'signature' ? STATUS.SIGNATURE : STATUS.OCR_SCANNING);
                                    }}
                                    className={`flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] group
                                        ${opt.id === 'ocr' ? 'border-blue-100 hover:border-blue-400 bg-blue-50/50' : 
                                          opt.id === 'signature' ? 'border-purple-100 hover:border-purple-400 bg-purple-50/50' : 
                                          'border-emerald-100 hover:border-emerald-400 bg-emerald-50/50'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6 shadow-lg
                                        ${opt.id === 'ocr' ? 'bg-blue-600 shadow-blue-500/30' : opt.id === 'signature' ? 'bg-purple-600 shadow-purple-500/30' : 'bg-emerald-600 shadow-emerald-500/30'}`}>
                                        <opt.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="font-black text-slate-900 text-xs uppercase tracking-widest">{opt.label}</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{opt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-center">
                            <button onClick={onClose} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest px-8 py-2 transition-colors">
                                Skip for now
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step: OCR Scanning ─────────────────────────────────────── */}
                {step === STATUS.OCR_SCANNING && (
                    <div className="p-6 space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                                    <ScanLine className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">Scan Employee ID Card</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">System is reading handwriting...</p>
                                </div>
                            </div>
                            <button onClick={() => setStep(STATUS.SELECT_METHOD)} className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl ring-8 ring-slate-100 border border-slate-800">
                            <OcrScannerPanel onResult={handleOcrResult} />
                        </div>

                        <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                <strong>Tip:</strong> Ensure the card is within the blue box. The AI will automatically detect the handwritten <strong>Emp. No.</strong>
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Step: Signature ────────────────────────────────────────── */}
                {step === STATUS.SIGNATURE && (
                    <div className="p-8 space-y-8 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200">
                                    <PenTool className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Digital Signature</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Confirming receipt of items</p>
                                </div>
                            </div>
                            {method !== 'both' && (
                                <button onClick={() => setStep(STATUS.SELECT_METHOD)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors px-4 py-2 bg-indigo-50 rounded-xl">
                                    Change Method
                                </button>
                            )}
                        </div>

                        {ocrVerified && (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-5 py-4 rounded-3xl animate-scale-up">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none">Identity Secured</p>
                                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Verified via AI Handwriting Recognition</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <PenTool className="w-3.5 h-3.5" /> Hand-drawn Signature
                                </label>
                                <button 
                                    onClick={clearSignature}
                                    className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                                >
                                    Clear Canvas
                                </button>
                            </div>
                            <div className="border-4 border-slate-100 rounded-[2.5rem] bg-white overflow-hidden shadow-inner ring-1 ring-slate-200">
                                <SignatureCanvas 
                                    ref={sigCanvas}
                                    onBegin={() => setIsSignatureEmpty(false)}
                                    canvasProps={{
                                        className: "w-full h-56 cursor-crosshair",
                                    }}
                                    penColor="#0f172a"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-4 border-2 border-slate-100 text-slate-500 font-black text-[11px] rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSignatureSubmit}
                                disabled={acknowledgeMutation.isPending || isSignatureEmpty}
                                className="flex-[2] py-4 bg-slate-900 text-white font-black text-[11px] rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                            >
                                {acknowledgeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                Finalize Verification
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step: Success ────────────────────────────────────────── */}
                {step === STATUS.SUCCESS && (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-up space-y-6">
                        <div className="relative">
                            <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-emerald-500/20">
                                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-emerald-50">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        <div className="space-y-2 px-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Identity Verified!</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                The acknowledgement has been successfully logged. Items are now officially handed over.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Step: Failed ─────────────────────────────────────────── */}
                {step === STATUS.FAILED && (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-shake space-y-6 px-12">
                        <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-500/20">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Verification Failed</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{error}</p>
                        </div>
                        <button 
                            onClick={() => setStep(STATUS.SELECT_METHOD)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl"
                        >
                            Back to Selection
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
