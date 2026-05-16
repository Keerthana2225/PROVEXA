import { useRef, useState, useCallback, useEffect } from 'react';
import {
    Camera, ScanLine, CheckCircle2, XCircle, AlertTriangle,
    Loader2, Video, VideoOff, Pause, Play
} from 'lucide-react';
import api from '../../lib/api';

const STATUS = {
    IDLE: 'idle',
    LOADING_CAMERA: 'loading_camera',
    READY: 'ready',
    SCANNING: 'scanning',
    VERIFIED: 'verified',
    FAILED: 'failed',
    DUPLICATE: 'duplicate',
    PAUSED: 'paused',
    NO_CAMERA: 'no_camera'
};

const AUTO_SCAN_INTERVAL_MS = 1800;
const RESULT_HOLD_MS        = 2500;
const CAPTURE_MAX_WIDTH     = 720;

function drawVisibleFrame(video, canvas) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const displayWidth = video.clientWidth || videoWidth;
    const displayHeight = video.clientHeight || videoHeight;

    if (!videoWidth || !videoHeight || !displayWidth || !displayHeight) {
        return false;
    }

    // The video element uses object-cover, so convert the visible overlay box
    // back into source-video coordinates before capturing.
    const scale = Math.max(displayWidth / videoWidth, displayHeight / videoHeight);
    const renderedWidth = videoWidth * scale;
    const renderedHeight = videoHeight * scale;
    const hiddenX = Math.max(0, (renderedWidth - displayWidth) / 2);
    const hiddenY = Math.max(0, (renderedHeight - displayHeight) / 2);

    const sourceX = Math.max(0, Math.floor(hiddenX / scale));
    const sourceY = Math.max(0, Math.floor(hiddenY / scale));
    const sourceW = Math.min(videoWidth - sourceX, Math.ceil(displayWidth / scale));
    const sourceH = Math.min(videoHeight - sourceY, Math.ceil(displayHeight / scale));

    const outputScale = sourceW > CAPTURE_MAX_WIDTH ? CAPTURE_MAX_WIDTH / sourceW : 1;
    canvas.width = Math.max(1, Math.round(sourceW * outputScale));
    canvas.height = Math.max(1, Math.round(sourceH * outputScale));
    canvas.getContext('2d').drawImage(
        video,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return true;
}

export default function OcrScannerPanel({ onResult }) {
    const videoRef    = useRef(null);
    const canvasRef   = useRef(null);
    const streamRef   = useRef(null);
    const intervalRef = useRef(null);
    const holdingRef  = useRef(false);  // True while showing a result (don't re-scan)

    const [status,     setStatus]     = useState(STATUS.IDLE);
    const [message,    setMessage]    = useState('');
    const [confidence, setConfidence] = useState(null);
    const [isPaused,   setIsPaused]   = useState(false);
    const [scanLinePos, setScanLinePos] = useState(0);
    const animRef = useRef(null);

    // ── Animated scan line ────────────────────────────────────────────────────
    useEffect(() => {
        const running = [STATUS.READY, STATUS.SCANNING].includes(status) && !isPaused;
        if (!running) { cancelAnimationFrame(animRef.current); return; }

        let pos = 0, dir = 1;
        const tick = () => {
            pos += dir * 0.9;
            if (pos >= 100) dir = -1;
            if (pos <= 0)   dir =  1;
            setScanLinePos(pos);
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [status, isPaused]);

    // ── Core: capture one frame and send to OCR service ───────────────────────
    const doScan = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        if (holdingRef.current) return;  // Still showing a previous result
        if (isPaused) return;

        setStatus(STATUS.SCANNING);
        holdingRef.current = true;  // Prevent overlapping scans immediately

        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!drawVisibleFrame(video, canvas)) {
            holdingRef.current = false;
            setStatus(STATUS.READY);
            return;
        }
        // Keep the payload small so OCR requests do not pile up on slower machines.
        const base64 = canvas.toDataURL('image/jpeg', 0.78);

        try {
            const { data } = await api.post('/verification/ocr-scan', {
                image: base64,
                device_info: navigator.userAgent
            });

            setConfidence(data.confidence ?? null);

            if (data.status === 'Verified') {
                setStatus(STATUS.VERIFIED);
                setMessage(`✓ ${data.employee?.name} — verified`);
            } else if (data.status === 'Duplicate Scan') {
                setStatus(STATUS.DUPLICATE);
                setMessage(data.message);
            } else {
                // Failed / not extracted — stay quiet, just show brief indicator
                setStatus(STATUS.FAILED);
                setMessage(data.message || 'No ID detected');
            }

            onResult?.(data);

            // Resume scanning after hold period
            setTimeout(() => {
                holdingRef.current = false;
                setStatus(STATUS.READY);
                setMessage('Scanning for ID card…');
                setConfidence(null);
            }, RESULT_HOLD_MS);

        } catch (err) {
            const isOffline = err.response?.status === 503 ||
                              err.message?.toLowerCase().includes('network') ||
                              !err.response;
            holdingRef.current = true;

            if (isOffline) {
                setStatus(STATUS.FAILED);
                setMessage(err.response?.data?.message || 'OCR service offline - start the Python service at :8001');
                // Back off for 10 s when offline (don't spam)
                setTimeout(() => {
                    holdingRef.current = false;
                    setStatus(STATUS.READY);
                    setMessage('Scanning for ID card…');
                }, 10000);
            } else {
                setStatus(STATUS.FAILED);
                setMessage(err.response?.data?.message || 'Scan error — retrying…');
                setTimeout(() => {
                    holdingRef.current = false;
                    setStatus(STATUS.READY);
                    setMessage('Scanning for ID card…');
                }, RESULT_HOLD_MS);
            }
        }
    }, [isPaused, onResult]);

    // ── Auto-scan loop: starts when camera is ready, stops when paused ────────
    useEffect(() => {
        const isLive = [STATUS.READY, STATUS.SCANNING, STATUS.VERIFIED,
                        STATUS.FAILED, STATUS.DUPLICATE].includes(status);

        if (!isLive || isPaused) {
            clearInterval(intervalRef.current);
            return;
        }

        // Kick off one immediately, then repeat
        intervalRef.current = setInterval(doScan, AUTO_SCAN_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [status, isPaused, doScan]);

    // ── Camera controls ───────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setStatus(STATUS.LOADING_CAMERA);
        setMessage('');
        
        // Check for Secure Context (HTTPS or localhost)
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            setStatus(STATUS.NO_CAMERA);
            setMessage('Camera requires a secure (HTTPS) connection to work on mobile. Please use https:// or access via localhost.');
            return;
        }

        try {
            // Try ideal constraints first (Environment/Back camera, High res)
            const constraints = {
                video: { 
                    facingMode: 'environment', 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 } 
                }
            };
            
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                console.warn("Ideal constraints failed, trying basic video...", err);
                // Fallback to any available camera
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setStatus(STATUS.READY);
            setMessage('Scanning for ID card…');
            setIsPaused(false);
        } catch (err) {
            console.error("Camera start failed:", err);
            setStatus(STATUS.NO_CAMERA);
            setMessage('Camera unavailable. Please check permissions and ensure no other app is using the camera.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        clearInterval(intervalRef.current);
        cancelAnimationFrame(animRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        holdingRef.current = false;
        setStatus(STATUS.IDLE);
        setMessage('');
        setConfidence(null);
        setIsPaused(false);
    }, []);

    const togglePause = useCallback(() => {
        setIsPaused(p => {
            const next = !p;
            setStatus(next ? STATUS.PAUSED : STATUS.READY);
            setMessage(next ? 'Auto-scan paused.' : 'Scanning for ID card…');
            return next;
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    // ── Visual config ─────────────────────────────────────────────────────────
    const borderColor = {
        [STATUS.VERIFIED]:  'border-emerald-400 shadow-emerald-500/20',
        [STATUS.FAILED]:    'border-red-500/60   shadow-red-500/10',
        [STATUS.DUPLICATE]: 'border-amber-400    shadow-amber-500/20',
        [STATUS.SCANNING]:  'border-blue-400     shadow-blue-500/20',
        [STATUS.PAUSED]:    'border-slate-500',
        [STATUS.READY]:     'border-slate-600',
        [STATUS.NO_CAMERA]: 'border-red-600',
    }[status] ?? 'border-slate-700';

    const msgColor = {
        [STATUS.VERIFIED]:  'text-emerald-400',
        [STATUS.FAILED]:    'text-red-400',
        [STATUS.DUPLICATE]: 'text-amber-400',
        [STATUS.SCANNING]:  'text-blue-400',
        [STATUS.PAUSED]:    'text-slate-400',
    }[status] ?? 'text-slate-400';

    const isLiveCamera = [STATUS.READY, STATUS.SCANNING, STATUS.VERIFIED,
                          STATUS.FAILED, STATUS.DUPLICATE, STATUS.PAUSED].includes(status);

    return (
        <div className="flex flex-col gap-3">

            {/* ── Camera viewport ─────────────────────────────────────────── */}
            <div className={`relative rounded-2xl overflow-hidden bg-slate-950 border-2 transition-all duration-300 shadow-lg ${borderColor}`}
                 style={{ aspectRatio: '16/9', minHeight: 240 }}>

                {/* Live video */}
                <video ref={videoRef} className="w-full h-full object-cover"
                       autoPlay playsInline muted
                       style={{ display: isLiveCamera ? 'block' : 'none' }} />

                {/* Idle placeholder */}
                {!isLiveCamera && status !== STATUS.LOADING_CAMERA && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">
                            {status === STATUS.NO_CAMERA ? 'Camera unavailable' : 'Press Start Camera to begin auto-scanning'}
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

                {/* Scanner overlay */}
                {isLiveCamera && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-black/35" />

                        {/* Scan line */}
                        {[STATUS.READY, STATUS.SCANNING].includes(status) && !isPaused && (
                            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                 style={{ top: `${scanLinePos}%`, opacity: 0.9 }} />
                        )}

                        {/* Result overlay */}
                        {[STATUS.VERIFIED, STATUS.FAILED, STATUS.DUPLICATE].includes(status) && (
                            <div className={`absolute inset-0 flex items-center justify-center rounded-2xl
                                ${status === STATUS.VERIFIED  ? 'bg-emerald-950/55' :
                                  status === STATUS.DUPLICATE ? 'bg-amber-950/55'   : 'bg-red-950/30'}`}>
                                {status === STATUS.VERIFIED  && <CheckCircle2  className="w-16 h-16 text-emerald-400 drop-shadow-lg" />}
                                {status === STATUS.FAILED    && <XCircle       className="w-14 h-14 text-red-400/80 drop-shadow-lg" />}
                                {status === STATUS.DUPLICATE && <AlertTriangle className="w-16 h-16 text-amber-400 drop-shadow-lg" />}
                            </div>
                        )}

                        {/* Paused overlay */}
                        {status === STATUS.PAUSED && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                                <div className="text-slate-400 text-sm font-bold flex items-center gap-2">
                                    <Pause className="w-5 h-5" /> Paused
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Top-right badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                    {/* Auto-scan pulsing dot */}
                    {isLiveCamera && !isPaused && (
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse
                                ${status === STATUS.SCANNING ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                            <span className="text-[10px] text-white font-bold">
                                {status === STATUS.SCANNING ? 'SCANNING' : 'AUTO'}
                            </span>
                        </div>
                    )}

                    {/* Confidence */}
                    {confidence !== null && isLiveCamera && (
                        <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] text-white font-bold">
                            {Math.round(confidence * 100)}%
                        </div>
                    )}
                </div>
            </div>

            {/* Status message */}
            {message && (
                <div className={`flex items-center gap-2 text-sm font-medium ${msgColor} min-h-5`}>
                    {status === STATUS.VERIFIED  && <CheckCircle2  className="w-4 h-4 flex-shrink-0" />}
                    {status === STATUS.FAILED    && <XCircle       className="w-4 h-4 flex-shrink-0" />}
                    {status === STATUS.DUPLICATE && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                    {status === STATUS.SCANNING  && <Loader2       className="w-4 h-4 flex-shrink-0 animate-spin" />}
                    <span>{message}</span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
                {!isLiveCamera && status !== STATUS.LOADING_CAMERA ? (
                    <button onClick={startCamera}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 text-sm">
                        <Video className="w-4 h-4" /> Start Camera (Auto-Scan)
                    </button>
                ) : status === STATUS.LOADING_CAMERA ? (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-slate-400 py-2.5 rounded-xl text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Starting camera…
                    </div>
                ) : (
                    <>
                        {/* Pause / Resume */}
                        <button onClick={togglePause}
                                className={`flex-1 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl transition-all text-sm active:scale-95
                                    ${isPaused
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                            {isPaused
                                ? <><Play  className="w-4 h-4" /> Resume Auto-Scan</>
                                : <><Pause className="w-4 h-4" /> Pause</>}
                        </button>

                        {/* Stop camera */}
                        <button onClick={stopCamera}
                                className="px-4 py-2.5 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-800 rounded-xl transition-all"
                                title="Stop Camera">
                            <VideoOff className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Hidden canvas */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
