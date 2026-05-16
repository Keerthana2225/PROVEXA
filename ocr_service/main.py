"""
PROVEXA OCR Microservice
Extracts Employee ID from physical ID cards using OpenCV + PaddleOCR.

Employee ID Format on cards: "Emp.No : 11122"
Extracted value: "11122" (numeric only)

Run with: uvicorn main:app --host 0.0.0.0 --port 8001 --reload
"""

import base64
import logging
import os
import re
import time

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from pydantic import BaseModel

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger("provexa-ocr")
FAST_MODE = os.getenv("OCR_FAST_MODE", "1").lower() not in {"0", "false", "no"}
MIN_ID_DIGITS = int(os.getenv("OCR_MIN_ID_DIGITS", "3"))
MAX_ID_DIGITS = int(os.getenv("OCR_MAX_ID_DIGITS", "7"))

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="PROVEXA OCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted further in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── PaddleOCR — initialise once at startup (expensive) ───────────────────────
logger.info("Initialising PaddleOCR engine ...")
ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang="en",
    use_gpu=False,
    show_log=False,
    enable_mkldnn=True,  # Speedup on CPU
)
logger.info("PaddleOCR ready.")


# ── Pydantic models ───────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    image: str  # base64-encoded image (data-URL or raw base64)


# ── Image helpers ─────────────────────────────────────────────────────────────
def decode_image(b64: str) -> np.ndarray | None:
    """Decode a base64 image string to an OpenCV BGR array."""
    try:
        if "," in b64:          # strip "data:image/png;base64," prefix
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error("decode_image failed: %s", e)
        return None


def preprocess(img: np.ndarray, method: str = "standard") -> np.ndarray:
    """
    OpenCV preprocessing pipeline with multiple methods for robustness.
    """
    # 1. Resize
    h, w = img.shape[:2]
    if w > 1200:
        img = cv2.resize(img, (1200, int(h * 1200 / w)), interpolation=cv2.INTER_AREA)

    # 2. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if method == "high_contrast":
        # Adaptive thresholding for low-contrast/handwritten text
        return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    
    if method == "sharpen":
        # Extreme sharpening
        kernel = np.array([[-1,-1,-1], [-1,10,-1], [-1,-1,-1]])
        return cv2.filter2D(gray, -1, kernel)

    # 3. Standard (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # 4. Sharpen (simple and fast)
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    sharpened = cv2.filter2D(enhanced, -1, kernel)
    
    return sharpened


def extract_roi(gray: np.ndarray) -> np.ndarray:
    """
    Crop a wider ROI from the center of the image.
    """
    h, w = gray.shape[:2]

    # Wider ROI band (35% to 75% height)
    y1 = int(h * 0.35)
    y2 = int(h * 0.75)
    roi = gray[y1:y2, 0:w]

    # Upscale ROI 2× — improves OCR accuracy on small text
    roi = cv2.resize(roi, (roi.shape[1] * 2, roi.shape[0] * 2), interpolation=cv2.INTER_CUBIC)

    return roi


def extract_number_strip(gray: np.ndarray) -> np.ndarray | None:
    """Find the most card-like bright horizontal strip without showing a UI ROI."""
    h, w = gray.shape[:2]
    if h < 80 or w < 120:
        return None

    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 5))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best = None
    best_score = 0.0
    frame_area = float(w * h)

    for contour in contours:
        x, y, cw, ch = cv2.boundingRect(contour)
        if cw <= 0 or ch <= 0:
            continue

        area = cw * ch
        aspect = cw / max(ch, 1)
        if area < frame_area * 0.025 or cw < w * 0.25 or not (1.8 <= aspect <= 12):
            continue
        if ch < h * 0.06 or ch > h * 0.55:
            continue

        center_x = x + cw / 2
        center_y = y + ch / 2
        center_score = 1.0 - min(abs(center_x - w / 2) / (w / 2), 1.0)
        vertical_score = 1.0 - min(abs(center_y - h * 0.55) / (h * 0.55), 1.0)
        score = (area / frame_area) * 3.0 + center_score + vertical_score + min(aspect / 6.0, 1.0)

        if score > best_score:
            best_score = score
            best = (x, y, cw, ch)

    if not best:
        return None

    x, y, cw, ch = best
    pad_x = int(cw * 0.08)
    pad_y = int(ch * 0.28)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + cw + pad_x)
    y2 = min(h, y + ch + pad_y)
    strip = gray[y1:y2, x1:x2]
    if strip.size == 0:
        return None
    return cv2.resize(strip, (strip.shape[1] * 2, strip.shape[0] * 2), interpolation=cv2.INTER_CUBIC)


def ocr_targets(gray: np.ndarray) -> list[tuple[str, np.ndarray]]:
    """Return OCR targets from broadest to narrowest for robust extraction."""
    targets = []
    h, w = gray.shape[:2]

    if h >= 80 and w >= 80:
        number_strip = extract_number_strip(gray)
        if number_strip is not None:
            targets.append(("number_strip", number_strip))

        targets.append(("center_band", extract_roi(gray)))

        y1 = int(h * 0.20)
        y2 = int(h * 0.85)
        wide = gray[y1:y2, 0:w]
        if wide.size:
            wide = cv2.resize(
                wide,
                (wide.shape[1] * 2, wide.shape[0] * 2),
                interpolation=cv2.INTER_CUBIC,
            )
            targets.append(("wide_band", wide))

    targets.append(("full", gray))
    return targets


def flatten_ocr_result(result) -> list[tuple[str, float]]:
    """
    Convert PaddleOCR's nested result shapes into (text, confidence) pairs.
    Different PaddleOCR versions return either [lines] or [[lines]].
    """
    lines = []

    def walk(node):
        if not node:
            return
        if (
            isinstance(node, (list, tuple))
            and len(node) >= 2
            and isinstance(node[1], (list, tuple))
            and len(node[1]) >= 2
            and isinstance(node[1][0], str)
        ):
            try:
                lines.append((node[1][0], float(node[1][1])))
            except (TypeError, ValueError):
                lines.append((node[1][0], 0.0))
            return
        if isinstance(node, (list, tuple)):
            for child in node:
                walk(child)

    walk(result)
    return lines


# ── Employee ID extraction ────────────────────────────────────────────────────
# Numeric-only patterns ordered from most-specific to most-general.
_EMP_PATTERNS = [
    re.compile(
        r"(?:Employee|Emp)[\s\.\-]*(?:ID|Code|No|Number|N[o0])?[\s\.\-:]*([0-9OQDILSBZ\s\.\-]{3,18})",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:Emp|Employee|No)[\.\s\-]*[Nn]?[Oo0][\.\s:\-]*\s*([0-9OQDILSBZ\s\.\-]{3,18})",
        re.IGNORECASE,
    ),
    re.compile(
        r"[Nn][Oo0][\.\s:\-]+\s*([0-9OQDILSBZ\s\.\-]{3,18})",
        re.IGNORECASE,
    ),
    re.compile(r"\b(\d{3,7})\b", re.IGNORECASE),
]


def normalize_ocr_text(text: str) -> str:
    text = text.replace("\n", " ")
    text = re.sub(r"[_|]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_emp_candidate(candidate: str) -> str | None:
    candidate = re.sub(r"[^A-Za-z0-9]", "", candidate).upper()
    if not candidate:
        return None

    candidate = candidate.translate(str.maketrans({
        "O": "0",
        "Q": "0",
        "D": "0",
        "I": "1",
        "L": "1",
        "S": "5",
        "B": "8",
        "Z": "2",
    }))
    digits = re.sub(r"\D", "", candidate)

    if not (MIN_ID_DIGITS <= len(digits) <= MAX_ID_DIGITS):
        return None

    return digits


def extract_emp_id(text: str) -> str | None:
    """
    Apply regex patterns in priority order.
    Returns the numeric employee code string, or None.
    """
    normalized = normalize_ocr_text(text)
    for pattern in _EMP_PATTERNS:
        m = pattern.search(normalized)
        if m:
            candidate = normalize_emp_candidate(m.group(1))
            if candidate:
                logger.debug("Matched '%s' -> candidate '%s'", normalized, candidate)
                return candidate
    return None


def extract_emp_id_from_lines(lines: list[tuple[str, float]]) -> str | None:
    """Prefer OCR lines that are mostly digits, then fall back to combined text."""
    best_code = None
    best_score = 0.0

    for text, conf in lines:
        code = extract_emp_id(text)
        if not code:
            continue
        compact = re.sub(r"\s+", "", text)
        digit_ratio = len(re.sub(r"\D", "", compact)) / max(len(compact), 1)
        score = float(conf) + digit_ratio + min(len(code), MAX_ID_DIGITS) * 0.05
        if score > best_score:
            best_score = score
            best_code = code

    return best_code or extract_emp_id(" ".join(txt for txt, _ in lines))


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "PROVEXA OCR Service", "version": "1.0.0"}


@app.post("/scan")
async def scan(request: ScanRequest):
    t0 = time.time()
    
    # Log incoming request size
    size_kb = len(request.image) / 1024
    logger.info("OCR request received. Image size: %.1f KB", size_kb)

    # 1. Decode
    img = decode_image(request.image)
    if img is None:
        return {
            "success": False,
            "error": "Invalid or unreadable image data.",
            "emp_code": None,
            "confidence": 0.0,
            "raw_text": "",
            "elapsed_ms": 0,
        }

    # ── Multi-pass OCR logic ───────────────────────────────────────────
    methods = ["standard", "high_contrast"] if FAST_MODE else ["standard", "sharpen", "high_contrast"]
    max_conf = 0.0
    best_emp_code = None
    best_raw_text = ""

    for method in methods:
        logger.info("OCR Pass: %s", method)
        proc_gray = preprocess(img, method=method)

        targets = ocr_targets(proc_gray)
        if FAST_MODE:
            targets = targets[:2]
        for target_name, target_gray in targets:
            target_rgb = cv2.cvtColor(target_gray, cv2.COLOR_GRAY2BGR)

            try:
                result = ocr_engine.ocr(target_rgb, cls=True)
                lines = flatten_ocr_result(result)
                if not lines:
                    continue

                raw_text = " ".join(txt for txt, _ in lines).strip()
                pass_conf = max(conf for _, conf in lines)
                emp_code = extract_emp_id_from_lines(lines)

                if emp_code:
                    logger.info(
                        "Match found in '%s/%s' pass: %s (conf: %.4f)",
                        method,
                        target_name,
                        emp_code,
                        pass_conf,
                    )

                    if FAST_MODE or pass_conf > 0.85:
                        return {
                            "success": True,
                            "emp_code": emp_code,
                            "confidence": round(pass_conf, 4),
                            "raw_text": raw_text,
                            "elapsed_ms": int((time.time() - t0) * 1000),
                        }

                    if pass_conf > max_conf:
                        max_conf = pass_conf
                        best_emp_code = emp_code
                        best_raw_text = raw_text
                elif pass_conf > max_conf:
                    max_conf = pass_conf
                    best_raw_text = raw_text
            except Exception as e:
                logger.error("Pass %s/%s failed: %s", method, target_name, e)

    elapsed = int((time.time() - t0) * 1000)

    if best_emp_code:
        return {
            "success": True,
            "emp_code": best_emp_code,
            "confidence": round(max_conf, 4),
            "raw_text": best_raw_text,
            "elapsed_ms": elapsed,
        }

    return {
        "success": False,
        "error": "Employee ID not found. Ensure the card is clear and well-lit.",
        "emp_code": None,
        "confidence": round(max_conf, 4),
        "raw_text": best_raw_text,
        "elapsed_ms": elapsed,
    }
