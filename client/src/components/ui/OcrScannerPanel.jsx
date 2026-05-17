import { useRef, useState, useCallback, useEffect } from 'react';
import {
    Camera, ScanLine, CheckCircle2, XCircle,
    Loader2, Video, VideoOff, RefreshCw, User
} from 'lucide-react';
import api from '../../lib/api';

const STATUS = {
    IDLE: 'idle',
    LOADING_CAMERA: 'loading_camera',
    READY: 'ready',
    PROCESSING: 'processing',
    VERIFIED: 'verified',
    FAILED: 'failed',
    NO_CAMERA: 'no_camera'
};



/** Capture the full visible video frame — simple and reliable */
function captureFrame(video, canvas) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return false;

    // Capture at 1280px max width for good OCR quality without huge payloads
    const outW = Math.min(vw, 1280);
    const outH = Math.round(outW * vh / vw);

    canvas.width  = outW;
    canvas.height = outH;
    canvas.getContext('2d').drawImage(video, 0, 0, vw, vh, 0, 0, outW, outH);
    return true;
}

export default function OcrScannerPanel({ onResult }) {
    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [status,   setStatus]   = useState(STATUS.IDLE);
    const [employee, setEmployee] = useState(null);
    const [errMsg,   setErrMsg]   = useState('');
    const [rawText,  setRawText]  = useState('');
    const [manualCode, setManualCode] = useState('');
    const [manualLoading, setManualLoading] = useState(false);

    // ── Camera controls ────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setStatus(STATUS.LOADING_CAMERA);
        setEmployee(null);
        setErrMsg('');

        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            setStatus(STATUS.NO_CAMERA);
            setErrMsg('Camera requires HTTPS. Please use a secure connection.');
            return;
        }

        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setStatus(STATUS.READY);
        } catch (err) {
            console.error('Camera error:', err);
            setStatus(STATUS.NO_CAMERA);
            setErrMsg('Camera unavailable. Check browser permissions and try again.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setStatus(STATUS.IDLE);
        setEmployee(null);
        setErrMsg('');
    }, []);

    // Cleanup on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    // ── Capture & OCR ──────────────────────────────────────────────────────────
    const handleCapture = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setStatus(STATUS.PROCESSING);
        setErrMsg('');

        const ok = captureFrame(videoRef.current, canvasRef.current);
        if (!ok) {
            setStatus(STATUS.READY);
            setErrMsg('Could not capture frame. Try again.');
            return;
        }

        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85);

        try {
            const { data } = await api.post('/verification/ocr-scan', {
                image: base64,
                device_info: navigator.userAgent
            });

            if (data.status === 'Verified') {
                setStatus(STATUS.VERIFIED);
                setEmployee(data.employee);
                onResult?.(data);
            } else if (data.status === 'Duplicate Scan') {
                setStatus(STATUS.VERIFIED);
                setEmployee(data.employee);
                onResult?.(data);
            } else {
                setStatus(STATUS.FAILED);
                setErrMsg(data.message || 'Employee ID not detected in the image.');
                setRawText(data.raw_text ? `OCR read: "${data.raw_text}"` : 'OCR read nothing from the image.');
                onResult?.(data);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Verification failed';
            setStatus(STATUS.FAILED);
            setRawText('');
            setErrMsg(
                err.response?.status === 503
                    ? 'OCR service is offline. Please start the Python service on port 8001.'
                    : msg
            );
        }
    }, [onResult]);

    const handleRetake = useCallback(() => {
        setStatus(STATUS.READY);
        setEmployee(null);
        setErrMsg('');
        setRawText('');
        setManualCode('');
    }, []);

    const handleManualSubmit = useCallback(async () => {
        const code = manualCode.trim().replace(/\D/g, '');
        if (!code || code.length < 3) return;
        setManualLoading(true);
        try {
            const { data } = await api.post('/verification/ocr-scan', { manual_code: code });
            if (data.status === 'Verified' || data.status === 'Duplicate Scan') {
                setStatus(STATUS.VERIFIED);
                setEmployee(data.employee);
                onResult?.(data);
            } else {
                setErrMsg(data.message || `Employee "${code}" not found in system.`);
            }
        } catch (err) {
            setErrMsg(err.response?.data?.message || 'Lookup failed. Check the ID number.');
        } finally {
            setManualLoading(false);
        }
    }, [manualCode, onResult]);

    // ── UI helpers ─────────────────────────────────────────────────────────────
    const isLiveCamera = [STATUS.READY, STATUS.PROCESSING].includes(status);

    return (
        <div className="flex flex-col gap-4">

            {/* ── Viewport ─────────────────────────────────────────────────── */}
            <div
                className={`relative rounded-2xl overflow-hidden bg-slate-950 border-2 transition-all duration-300
                    ${status === STATUS.VERIFIED  ? 'border-emerald-400 shadow-lg shadow-emerald-500/20' :
                      status === STATUS.FAILED    ? 'border-red-500/60'   :
                      status === STATUS.PROCESSING ? 'border-blue-400 shadow-lg shadow-blue-500/20' :
                      'border-slate-700'}`}
                style={{ aspectRatio: '16/9', minHeight: 240 }}
            >
                {/* Live video */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay playsInline muted
                    style={{ display: isLiveCamera ? 'block' : 'none' }}
                />

                {/* IDLE / NO_CAMERA placeholder */}
                {!isLiveCamera && status !== STATUS.LOADING_CAMERA &&
                 status !== STATUS.VERIFIED && status !== STATUS.FAILED && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium text-center px-4">
                            {status === STATUS.NO_CAMERA
                                ? errMsg || 'Camera unavailable'
                                : 'Press "Start Camera" to begin'}
                        </p>
                    </div>
                )}

                {/* Loading camera */}
                {status === STATUS.LOADING_CAMERA && (
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-950">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        <span className="text-slate-400 text-sm">Starting camera…</span>
                    </div>
                )}

                {/* Camera live overlays */}
                {isLiveCamera && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Dark border vignette */}
                        <div className="absolute inset-0 bg-black/30" />

                        {/* ID Card guide box */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative border-2 border-dashed border-white/70 rounded-xl"
                                 style={{ width: '72%', height: '56%' }}>
                                {/* Corner accents */}
                                <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl-lg" />
                                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr-lg" />
                                <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl-lg" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-white rounded-br-lg" />

                                {/* Guide label */}
                                <div className="absolute -bottom-7 left-0 right-0 flex justify-center">
                                    <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">
                                        Place Employee ID Card Here
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Processing overlay */}
                        {status === STATUS.PROCESSING && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/70">
                                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                                <p className="text-white font-bold text-sm tracking-widest uppercase">
                                    Verifying Employee ID…
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Verified result card */}
                {status === STATUS.VERIFIED && employee && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-emerald-950/80">
                        <CheckCircle2 className="w-14 h-14 text-emerald-400 drop-shadow-lg" />
                        <div className="text-center">
                            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">
                                Identity Verified
                            </p>
                            <p className="text-white font-black text-xl">{employee.name}</p>
                            <p className="text-emerald-400 text-xs font-bold mt-1">
                                {employee.emp_code || employee.employee_code || ''}
                            </p>
                        </div>
                    </div>
                )}

                {/* Failed result */}
                {status === STATUS.FAILED && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-950/80 px-6">
                        <XCircle className="w-12 h-12 text-red-400 drop-shadow-lg flex-shrink-0" />
                        <div className="text-center">
                            <p className="text-red-300 text-[10px] font-black uppercase tracking-widest mb-1">
                                ID Not Detected
                            </p>
                            <p className="text-white/80 text-xs font-medium">
                                {errMsg || 'Could not read the employee ID. Please retake.'}
                            </p>
                            {rawText && (
                                <p className="text-yellow-300/80 text-[10px] mt-2 font-mono bg-black/30 px-2 py-1 rounded">
                                    {rawText}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Action Buttons ───────────────────────────────────────────── */}
            <div className="flex gap-2">
                {status === STATUS.IDLE || status === STATUS.NO_CAMERA ? (
                    <button
                        onClick={startCamera}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm"
                    >
                        <Video className="w-4 h-4" />
                        Start Camera
                    </button>
                ) : status === STATUS.LOADING_CAMERA ? (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-slate-400 py-3 rounded-xl text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Starting camera…
                    </div>
                ) : status === STATUS.READY ? (
                    <>
                        <button
                            onClick={handleCapture}
                            className="flex-[3] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm uppercase tracking-widest"
                        >
                            <ScanLine className="w-4 h-4" />
                            Capture Employee ID
                        </button>
                        <button
                            onClick={stopCamera}
                            className="px-4 py-3 border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-800 rounded-xl transition-all"
                            title="Stop Camera"
                        >
                            <VideoOff className="w-4 h-4" />
                        </button>
                    </>
                ) : status === STATUS.PROCESSING ? (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-blue-600/30 text-blue-300 py-3 rounded-xl text-sm font-bold">
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Employee ID…
                    </div>
                ) : status === STATUS.FAILED ? (
                    <>
                        <button
                            onClick={handleRetake}
                            className="flex-[3] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm uppercase tracking-widest"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retake Image
                        </button>
                        <button
                            onClick={stopCamera}
                            className="px-4 py-3 border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-800 rounded-xl transition-all"
                            title="Stop Camera"
                        >
                            <VideoOff className="w-4 h-4" />
                        </button>
                    </>
                ) : status === STATUS.VERIFIED ? (
                    <button
                        onClick={stopCamera}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all text-sm"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Verified — Done
                    </button>
                ) : null}
            </div>

            {/* ── Manual Entry Fallback ────────────────────────────────── */}
            {status === STATUS.FAILED && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        Or Enter Employee ID Manually
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={7}
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                            placeholder="e.g. 11222"
                            className="flex-1 px-3 py-2 border-2 border-amber-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-amber-500 bg-white"
                        />
                        <button
                            onClick={handleManualSubmit}
                            disabled={manualLoading || manualCode.length < 3}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                            {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
