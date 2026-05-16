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

export default function UnifiedVerificationModal({ isOpen, onClose, employee, issueId, pendingCount }) {
    const queryClient = useQueryClient();
    
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
                : `/issues/acknowledge/employee/${employee.id}`;
            
            const { data } = await api.put(endpoint, {
                ...rest,
                verification_method: method === 'both' ? 'OCR + Signature' : (method === 'ocr' ? 'OCR Scan' : 'Signature'),
                ocr_details: directOcrDetails || ocrData
            });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success(data.message || 'Verification & Acknowledgement completed!');
            setStep(STATUS.SUCCESS);
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
        if (result.status === 'Verified' && result.employee?.emp_code === employee.emp_code) {
            setOcrVerified(true);
            setOcrData(result);
            toast.success('ID Card Verified!');
            
            if (method === 'both') {
                setStep(STATUS.SIGNATURE);
            } else {
                // OCR Only - complete now
                acknowledgeMutation.mutate({ 
                    verification_type: 'ocr',
                    confidence: result.confidence,
                    ocr_details: result // Pass directly
                });
            }
        } else if (result.status === 'Verified') {
            toast.error(`Employee mismatch! Card belongs to ${result.employee.name}.`);
        }
    };

    const handleSignatureSubmit = (e) => {
        e.preventDefault();
        if (isSignatureEmpty || !sigCanvas.current) {
            return setError('Employee signature is required.');
        }
        
        const signatureBase64 = sigCanvas.current.toDataURL('image/png');
        acknowledgeMutation.mutate({ 
            signature: signatureBase64,
            verification_type: method === 'both' ? 'both' : 'signature'
        });
    };

    if (!employee && !issueId) return null;

    const displayName = employee?.name || 'Employee';
    const displayCode = employee?.emp_code || '';

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Complete Employee Verification"
            maxWidth="max-w-2xl"
        >
            <div className="p-1">
                {/* ── Step: Select Method ───────────────────────────────────── */}
                {step === STATUS.SELECT_METHOD && (
                    <div className="p-4 space-y-6 animate-fade-in">
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-slate-800">Choose Verification Method</h3>
                            <p className="text-sm text-slate-500">Select how you want to verify the employee's identity for this acknowledgement.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { id: 'ocr', label: 'OCR ID Scan', icon: ScanLine, desc: 'Scan physical ID card', color: 'blue' },
                                { id: 'signature', label: 'Digital Signature', icon: PenTool, desc: 'Draw signature on screen', color: 'purple' },
                                { id: 'both', label: 'Both Methods', icon: ShieldCheck, desc: 'Maximum security check', color: 'emerald' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setMethod(opt.id);
                                        setStep(opt.id === 'signature' ? STATUS.SIGNATURE : STATUS.OCR_SCANNING);
                                    }}
                                    className={`flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] group
                                        ${opt.id === 'ocr' ? 'border-blue-100 hover:border-blue-400 bg-blue-50/30' : 
                                          opt.id === 'signature' ? 'border-purple-100 hover:border-purple-400 bg-purple-50/30' : 
                                          'border-emerald-100 hover:border-emerald-400 bg-emerald-50/30'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6
                                        ${opt.id === 'ocr' ? 'bg-blue-600' : opt.id === 'signature' ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                                        <opt.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="font-bold text-slate-800 text-sm mb-1">{opt.label}</div>
                                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{opt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-primary font-bold flex items-center justify-center shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Target Employee</div>
                                <div className="font-bold text-slate-800">{displayName} <span className="text-slate-400 font-mono ml-2">({displayCode})</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: OCR Scanning ─────────────────────────────────────── */}
                {step === STATUS.OCR_SCANNING && (
                    <div className="p-4 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <ScanLine className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-bold text-slate-800">OCR ID Verification</h3>
                            </div>
                            <button 
                                onClick={() => setStep(STATUS.SELECT_METHOD)}
                                className="text-xs text-slate-500 hover:text-slate-700 font-bold"
                            >
                                Change Method
                            </button>
                        </div>

                        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                            <OcrScannerPanel onResult={handleOcrResult} />
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Please ensure the employee's ID card is clearly visible within the frame. 
                                The system will automatically verify if the ID belongs to <strong>{displayName}</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Step: Signature ────────────────────────────────────────── */}
                {step === STATUS.SIGNATURE && (
                    <form onSubmit={handleSignatureSubmit} className="p-4 space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                    <PenTool className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-bold text-slate-800">
                                    {method === 'both' ? 'Final Acknowledgment' : 'Digital Signature'}
                                </h3>
                            </div>
                            {method !== 'both' && (
                                <button 
                                    type="button"
                                    onClick={() => setStep(STATUS.SELECT_METHOD)}
                                    className="text-xs text-slate-500 hover:text-slate-700 font-bold"
                                >
                                    Change Method
                                </button>
                            )}
                        </div>

                        {method === 'both' && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" /> OCR Verification Successful
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Signature Panel</label>
                                    <button
                                        type="button"
                                        onClick={() => { sigCanvas.current?.clear(); setIsSignatureEmpty(true); }}
                                        className="text-xs text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl overflow-hidden">
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        penColor="#0f172a"
                                        canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
                                        onEnd={() => setIsSignatureEmpty(false)}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-3 font-semibold uppercase tracking-widest">Employee must sign above</p>
                            </div>

                            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2"><XCircle className="w-4 h-4" /> {error}</div>}

                            <button
                                type="submit"
                                disabled={acknowledgeMutation.isPending || isSignatureEmpty}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 text-sm uppercase tracking-widest"
                            >
                                {acknowledgeMutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : 'Complete Acknowledge'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Success Overlay ───────────────────────────────────────── */}
                {step === STATUS.SUCCESS && (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 animate-bounce-in">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Verification Complete</h3>
                        <p className="text-slate-500">The acknowledgement has been recorded successfully.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
