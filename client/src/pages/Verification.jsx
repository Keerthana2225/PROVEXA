import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import dayjs from 'dayjs';
import {
    ShieldCheck, ScanLine, PenTool, CheckCircle2, XCircle,
    AlertTriangle, Clock, Users, Activity, Fingerprint, X
} from 'lucide-react';
import api from '../lib/api';
import OcrScannerPanel from '../components/ui/OcrScannerPanel';
import { toast } from '../components/ui/Toast';

// ── Reusable stat card ────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <div className="text-2xl font-bold text-slate-800">{value ?? '—'}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        Verified:       'bg-emerald-100 text-emerald-700 border-emerald-200',
        Failed:         'bg-red-100 text-red-700 border-red-200',
        'Duplicate Scan': 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {status}
        </span>
    );
};

// ── Method badge ──────────────────────────────────────────────────────────────
const MethodBadge = ({ method }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border
        ${method === 'OCR Scan' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
        {method === 'OCR Scan' ? <ScanLine className="w-3 h-3" /> : <PenTool className="w-3 h-3" />}
        {method}
    </span>
);

// ── Employee result card ──────────────────────────────────────────────────────
const EmployeeCard = ({ data, onClose }) => {
    if (!data) return null;
    const isVerified  = data.status === 'Verified';
    const isDuplicate = data.status === 'Duplicate Scan';
    const isFailed    = data.status === 'Failed';

    return (
        <div className={`rounded-2xl border-2 p-5 animate-fade-in relative
            ${isVerified ? 'border-emerald-400 bg-emerald-50' : isDuplicate ? 'border-amber-400 bg-amber-50' : 'border-red-400 bg-red-50'}`}>

            <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
                {isVerified  && <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
                {isDuplicate && <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />}
                {isFailed    && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
                <div>
                    <div className={`font-bold text-sm ${isVerified ? 'text-emerald-800' : isDuplicate ? 'text-amber-800' : 'text-red-800'}`}>
                        {data.status}
                    </div>
                    <div className="text-xs text-slate-600">{data.message}</div>
                </div>
            </div>

            {data.employee && (
                <div className="flex items-center gap-3 bg-white/60 rounded-xl p-3 border border-white/80">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {data.employee.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 text-sm">{data.employee.name}</div>
                        <div className="text-xs text-slate-500">
                            {data.employee.emp_code} · {data.employee.department} · {data.employee.designation}
                        </div>
                        {data.confidence !== undefined && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                                OCR confidence: {Math.round((data.confidence || 0) * 100)}%
                            </div>
                        )}
                    </div>
                </div>
            )}

            {data.last_scan && (
                <p className="text-xs text-amber-700 mt-2">
                    Last scan: {dayjs(data.last_scan).format('DD MMM YYYY, HH:mm:ss')}
                </p>
            )}
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Verification() {
    const queryClient = useQueryClient();

    // Tabs
    const [activeTab, setActiveTab] = useState('ocr'); // ocr | signature | both

    // OCR result
    const [scanResult, setScanResult] = useState(null);

    // Signature state
    const sigCanvas = useRef(null);
    const [sigEmpty, setSigEmpty] = useState(true);
    const [sigEmployee, setSigEmployee] = useState('');

    // Log filters
    const [logMethod, setLogMethod] = useState('all');
    const [logStatus, setLogStatus] = useState('all');

    // ── Stats ─────────────────────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ['verification-stats'],
        queryFn: async () => {
            const { data } = await api.get('/verification/stats');
            return data;
        },
        refetchInterval: 15000
    });

    // ── Logs ──────────────────────────────────────────────────────────────────
    const { data: logsData, isLoading: logsLoading } = useQuery({
        queryKey: ['verification-logs', logMethod, logStatus],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (logMethod !== 'all') params.set('method', logMethod);
            if (logStatus !== 'all') params.set('status', logStatus);
            params.set('limit', '30');
            const { data } = await api.get(`/verification/logs?${params}`);
            return data;
        },
        refetchInterval: 10000
    });

    // ── Standalone Signature Log ──────────────────────────────────────────────
    const sigMutation = useMutation({
        mutationFn: async (payload) => {
            // Log a standalone signature verification directly in VerificationLog
            const { data } = await api.post('/verification/signature-log', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
            queryClient.invalidateQueries({ queryKey: ['verification-stats'] });
            toast.success('Signature recorded successfully.');
            sigCanvas.current?.clear();
            setSigEmpty(true);
            setSigEmployee('');
        },
        onError: () => toast.error('Failed to record signature.')
    });

    const handleSignatureSave = () => {
        if (sigEmpty || !sigCanvas.current) {
            toast.error('Please provide a signature first.'); return;
        }
        const signatureBase64 = sigCanvas.current.toDataURL('image/png');
        sigMutation.mutate({ emp_code: sigEmployee, signature: signatureBase64 });
    };

    // ── OCR result handler ────────────────────────────────────────────────────
    const handleOcrResult = (result) => {
        setScanResult(result);
        queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
        queryClient.invalidateQueries({ queryKey: ['verification-stats'] });
    };

    const tabs = [
        { key: 'ocr',       label: 'OCR ID Scan',    icon: ScanLine },
        { key: 'signature', label: 'Digital Signature', icon: PenTool },
        { key: 'both',      label: 'Both Methods',    icon: ShieldCheck },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                            <Fingerprint className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Verification Centre</h2>
                    </div>
                    <p className="text-sm text-slate-500 ml-12">
                        AI-powered employee identification via OCR ID scanning and digital signature.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    LIVE
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Today's Scans"      value={stats?.todayTotal}  icon={Activity}    color="bg-blue-50 text-blue-600" />
                <StatCard label="Verified"            value={stats?.verified}    icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Failed"              value={stats?.failed}      icon={XCircle}     color="bg-red-50 text-red-600" />
                <StatCard label="Duplicate Scans"     value={stats?.duplicate}   icon={AlertTriangle} color="bg-amber-50 text-amber-600" />
            </div>

            {/* Method Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all
                            ${activeTab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Verification Panels ─────────────────────────────────────── */}
            <div className={`grid gap-6 ${activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>

                {/* OCR Panel */}
                {(activeTab === 'ocr' || activeTab === 'both') && (
                    <div className="bg-slate-900 rounded-2xl p-6 space-y-4 shadow-xl shadow-slate-900/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                <ScanLine className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">OCR ID Scan</h3>
                                <p className="text-xs text-slate-400">Show physical ID card to camera</p>
                            </div>
                        </div>

                        <OcrScannerPanel onResult={handleOcrResult} />

                        {scanResult && (
                            <EmployeeCard data={scanResult} onClose={() => setScanResult(null)} />
                        )}
                    </div>
                )}

                {/* Signature Panel */}
                {(activeTab === 'signature' || activeTab === 'both') && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                <PenTool className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Digital Signature</h3>
                                <p className="text-xs text-slate-500">For managers, officers & sensitive approvals</p>
                            </div>
                        </div>

                        {/* Optional employee code */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                Employee Code <span className="text-slate-400 font-normal normal-case">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={sigEmployee}
                                onChange={e => setSigEmployee(e.target.value)}
                                placeholder="e.g. 11122"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                            />
                        </div>

                        {/* Signature pad */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Signature <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { sigCanvas.current?.clear(); setSigEmpty(true); }}
                                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    penColor="#1e293b"
                                    canvasProps={{ className: 'w-full cursor-crosshair', height: 160 }}
                                    onEnd={() => setSigEmpty(false)}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 text-center mt-1.5 font-semibold uppercase tracking-widest">
                                Sign inside the box
                            </p>
                        </div>

                        <button
                            onClick={handleSignatureSave}
                            disabled={sigEmpty || sigMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {sigMutation.isPending ? 'Saving…' : 'Record Signature'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Verification History ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Table toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <h3 className="font-bold text-slate-800 text-sm">Verification History</h3>
                        {logsData?.total !== undefined && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                                {logsData.total} total
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* Method filter */}
                        <select
                            value={logMethod}
                            onChange={e => setLogMethod(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold text-slate-600"
                        >
                            <option value="all">All Methods</option>
                            <option value="OCR Scan">OCR Scan</option>
                            <option value="Signature">Signature</option>
                        </select>
                        {/* Status filter */}
                        <select
                            value={logStatus}
                            onChange={e => setLogStatus(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold text-slate-600"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Verified">Verified</option>
                            <option value="Failed">Failed</option>
                            <option value="Duplicate Scan">Duplicate Scan</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-slate-600">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left">Timestamp</th>
                                <th className="px-6 py-3 text-left">Employee</th>
                                <th className="px-6 py-3 text-left">Method</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-right">Confidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logsLoading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(5)].map((_, j) => (
                                            <td key={j} className="px-6 py-3">
                                                <div className="h-3.5 bg-slate-100 rounded w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : logsData?.logs?.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-14 text-center">
                                        <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-400 font-medium text-sm">No verification events yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                logsData?.logs?.map(log => (
                                    <tr key={log._id || log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-slate-700 text-xs">{dayjs(log.timestamp).format('DD MMM YYYY')}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{dayjs(log.timestamp).format('HH:mm:ss')}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-semibold text-slate-800 text-sm">
                                                {log.employee?.name || log.employee_name || <span className="text-slate-400 italic">Unknown</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {log.emp_code || log.employee?.emp_code || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <MethodBadge method={log.method} />
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={log.status} />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {log.ocr_confidence !== undefined && log.ocr_confidence !== null ? (
                                                <span className="text-xs font-bold text-slate-600 font-mono">
                                                    {Math.round(log.ocr_confidence * 100)}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
