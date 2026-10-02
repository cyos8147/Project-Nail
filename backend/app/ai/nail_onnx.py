"""ตรวจจับเล็บ (instance segmentation) ด้วยโมเดล YOLOv8-Seg ที่แปลงเป็น ONNX แล้ว รันผ่าน ONNX Runtime

ใช้แทน ultralytics + PyTorch ซึ่งกินแรมเกิน 512MB ของ Render แผนฟรี (โปรเซสโดน kill ตอนโหลดโมเดล
request เลยค้างไม่ตอบ) ขั้นตอน pre/post-process ด้านล่างทำตาม ultralytics 8.2 ทุกขั้น (LetterBox,
non_max_suppression, process_mask_native, masks2segments) เพื่อให้ได้ polygon เหมือนเดิม
"""

from __future__ import annotations

import ctypes
import gc
import logging
import threading

import cv2
import numpy as np

log = logging.getLogger("uvicorn.error")  # logger ตัวนี้ uvicorn ตั้งให้พิมพ์ขึ้น Render Logs อยู่แล้ว

INPUT_SIZE = 640
CONF_THRESHOLD = 0.25
IOU_THRESHOLD = 0.7
MAX_DET = 300
MAX_NMS = 30000
MAX_WH = 7680
NUM_MASK_COEFFS = 32
# รูปที่ใหญ่กว่านี้จะถูกย่อก่อน (ผลลัพธ์เป็นพิกัดสัดส่วน 0-1 ไม่ขึ้นกับความละเอียด) กันแรมพุ่งตอนขยาย mask
# (โมเดลรับภาพ 640x640 อยู่แล้ว 1024 จึงเหลือเฟือ)
MAX_SIDE = 1024
# ตรวจพร้อมกันได้กี่รูป: วัดแล้วแต่ละรูปกินแรมเพิ่มราว 190MB (ตรวจ 3 รูปซ้อนกัน โปรเซสพุ่งไป ~480MB, 4 รูป ~580MB)
# ขณะที่ Render แผนฟรีมีแรมแค่ 512MB -> เกินแล้วโดนรีสตาร์ต ผู้ใช้เลยเจอ "ใช้ได้บ้างไม่ได้บ้าง" รูปที่เหลือให้รอคิว
MAX_CONCURRENT_DETECTIONS = 1
# ถ้าตรวจทั้งรูปแล้วเจอเล็บน้อยกว่านี้ จะลองซูมเข้ากลางรูปแล้วตรวจซ้ำ (มือปกติเห็นเล็บ 4-5 นิ้ว ถ้าเจอน้อยกว่านั้นมักเพราะ
# มืออยู่ไกล/เล็กในเฟรม โมเดลที่รับภาพ 640 พิกเซลจะมองเล็บเล็กๆ ไม่เห็น) -- วัดกับรูปที่มือเหลือ 25-30% ของเฟรม
# ตรวจทั้งรูปเจอ 4-13 เล็บจาก 25 แต่ซูมเข้ากลางรูปเจอครบ 25
MIN_NAILS_BEFORE_ZOOM = 4
ZOOM_FRACTIONS = (0.5, 0.33)

_session = None
_session_lock = threading.Lock()
_gate = threading.BoundedSemaphore(MAX_CONCURRENT_DETECTIONS)


def _get_session(weights_path: str):
    global _session
    if _session is None:
        with _session_lock:
            if _session is None:
                import onnxruntime as ort

                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 1
                opts.inter_op_num_threads = 1
                # ปิด memory arena: คืนแรมหลังรันแต่ละครั้ง แทนการกันไว้/ขยายเรื่อยๆ (สำคัญบนเครื่องแรม 512MB)
                opts.enable_cpu_mem_arena = False
                opts.enable_mem_pattern = False
                _session = ort.InferenceSession(weights_path, sess_options=opts, providers=["CPUExecutionProvider"])
    return _session


def _letterbox(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    r = min(INPUT_SIZE / h, INPUT_SIZE / w)
    new_w, new_h = int(round(w * r)), int(round(h * r))
    dw, dh = (INPUT_SIZE - new_w) / 2, (INPUT_SIZE - new_h) / 2
    if (w, h) != (new_w, new_h):
        rgb = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    return cv2.copyMakeBorder(rgb, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thres: float) -> np.ndarray:
    areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    order = scores.argsort(kind="stable")[::-1]
    keep = []
    while order.size:
        i = order[0]
        keep.append(i)
        rest = order[1:]
        xx1 = np.maximum(boxes[i, 0], boxes[rest, 0])
        yy1 = np.maximum(boxes[i, 1], boxes[rest, 1])
        xx2 = np.minimum(boxes[i, 2], boxes[rest, 2])
        yy2 = np.minimum(boxes[i, 3], boxes[rest, 3])
        inter = np.clip(xx2 - xx1, 0, None) * np.clip(yy2 - yy1, 0, None)
        union = areas[i] + areas[rest] - inter
        iou = np.divide(inter, union, out=np.zeros_like(inter), where=union > 0)
        order = rest[iou <= iou_thres]
    return np.asarray(keep, dtype=np.int64)


def _postprocess(pred: np.ndarray, protos: np.ndarray, orig_h: int, orig_w: int) -> list[np.ndarray]:
    pred = pred.T  # (anchors, 4 + nc + 32)
    nc = pred.shape[1] - 4 - NUM_MASK_COEFFS
    cls_scores = pred[:, 4 : 4 + nc]
    conf = cls_scores.max(1)
    keep = conf > CONF_THRESHOLD
    if not keep.any():
        return []
    pred, conf, cls_id = pred[keep], conf[keep], cls_scores[keep].argmax(1)

    xywh = pred[:, :4]
    boxes = np.empty_like(xywh)
    boxes[:, 0] = xywh[:, 0] - xywh[:, 2] / 2
    boxes[:, 1] = xywh[:, 1] - xywh[:, 3] / 2
    boxes[:, 2] = xywh[:, 0] + xywh[:, 2] / 2
    boxes[:, 3] = xywh[:, 1] + xywh[:, 3] / 2
    coeffs = pred[:, 4 + nc :]

    if len(conf) > MAX_NMS:
        top = conf.argsort()[::-1][:MAX_NMS]
        boxes, conf, cls_id, coeffs = boxes[top], conf[top], cls_id[top], coeffs[top]
    idx = _nms(boxes + cls_id[:, None] * MAX_WH, conf, IOU_THRESHOLD)[:MAX_DET]
    boxes, coeffs = boxes[idx], coeffs[idx]

    # กรอบจากพิกัด 640x640 (มีขอบ letterbox) -> พิกัดรูปจริง
    gain = min(INPUT_SIZE / orig_h, INPUT_SIZE / orig_w)
    pad_x = round((INPUT_SIZE - orig_w * gain) / 2 - 0.1)
    pad_y = round((INPUT_SIZE - orig_h * gain) / 2 - 0.1)
    boxes[:, [0, 2]] -= pad_x
    boxes[:, [1, 3]] -= pad_y
    boxes /= gain
    boxes[:, [0, 2]] = boxes[:, [0, 2]].clip(0, orig_w)
    boxes[:, [1, 3]] = boxes[:, [1, 3]].clip(0, orig_h)

    # ตัดขอบ letterbox ออกจาก prototype mask (ความละเอียด 160x160) ก่อนขยายเท่ารูปจริง
    c, mh, mw = protos.shape
    mgain = min(mh / orig_h, mw / orig_w)
    mpad_w, mpad_h = (mw - orig_w * mgain) / 2, (mh - orig_h * mgain) / 2
    top, left = int(mpad_h), int(mpad_w)
    bottom, right = int(mh - mpad_h), int(mw - mpad_w)
    protos_flat = protos.reshape(c, -1)

    cols = np.arange(orig_w)[None, :]
    rows = np.arange(orig_h)[:, None]
    polygons = []
    for box, coeff in zip(boxes, coeffs):
        # ขยาย logits (ยังไม่ผ่าน sigmoid) แล้วตัดที่ 0 ตรงกับ ultralytics process_mask_native
        logits = (coeff @ protos_flat).reshape(mh, mw)
        logits = cv2.resize(logits[top:bottom, left:right], (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        x1, y1, x2, y2 = box
        inside = (cols >= x1) & (cols < x2) & (rows >= y1) & (rows < y2)
        mask = ((logits > 0.0) & inside).astype(np.uint8)
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
        if not contours:
            continue
        largest = max(contours, key=len).reshape(-1, 2).astype(np.float32)
        largest[:, 0] /= orig_w
        largest[:, 1] /= orig_h
        polygons.append(largest)
    return polygons


def _detect(rgb: np.ndarray, weights_path: str) -> list[np.ndarray]:
    h, w = rgb.shape[:2]
    scale = min(1.0, MAX_SIDE / max(h, w))
    if scale < 1.0:
        w, h = int(round(w * scale)), int(round(h * scale))
        rgb = cv2.resize(rgb, (w, h), interpolation=cv2.INTER_AREA)

    x = _letterbox(rgb).astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    session = _get_session(weights_path)
    pred, protos = session.run(None, {session.get_inputs()[0].name: x})[:2]
    return _postprocess(pred[0], protos[0], h, w)


def _detect_center_crop(rgb: np.ndarray, frac: float, weights_path: str) -> list[np.ndarray]:
    """ตรวจเฉพาะกลางรูป (ซูมเข้า) แล้วแปลงพิกัดกลับเป็นสัดส่วนของรูปเต็ม"""
    h, w = rgb.shape[:2]
    ch, cw = max(int(h * frac), 32), max(int(w * frac), 32)
    y0, x0 = (h - ch) // 2, (w - cw) // 2
    polygons = _detect(np.ascontiguousarray(rgb[y0 : y0 + ch, x0 : x0 + cw]), weights_path)
    return [
        np.stack([(p[:, 0] * cw + x0) / w, (p[:, 1] * ch + y0) / h], axis=1).astype(np.float32) for p in polygons
    ]


def release_memory() -> None:
    """คืนแรมที่ glibc ยังถือไว้หลังรันโมเดล (Linux เท่านั้น ที่อื่นไม่ทำอะไร)"""
    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:
        pass


def rss_mb() -> int:
    """แรมที่โปรเซสนี้ใช้อยู่ (MB) ไว้ใส่ log ดูว่าใกล้เพดาน 512MB ของ Render แค่ไหน (อ่านไม่ได้ให้คืน 0)"""
    try:
        with open("/proc/self/status", encoding="ascii") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1]) // 1024
    except Exception:
        pass
    return 0


def detect_nail_polygons(rgb: np.ndarray, weights_path: str) -> list[np.ndarray]:
    """คืนค่ารายการ polygon ของเล็บแต่ละชิ้น เป็นพิกัดสัดส่วน 0-1 ของความกว้าง/สูงรูป (shape N x 2)

    ตรวจทีละรูปเท่านั้น (ดู MAX_CONCURRENT_DETECTIONS) และถ้าทั้งรูปเจอเล็บน้อย จะลองซูมเข้ากลางรูปตรวจซ้ำ
    แล้วเลือกรอบที่เจอมากที่สุด"""
    with _gate:
        try:
            best = _detect(rgb, weights_path)
            for frac in ZOOM_FRACTIONS:
                if len(best) >= MIN_NAILS_BEFORE_ZOOM:
                    break
                zoomed = _detect_center_crop(rgb, frac, weights_path)
                if len(zoomed) > len(best):
                    log.info("nail detection: zoom %.2f found %d nails (whole photo: %d)", frac, len(zoomed), len(best))
                    best = zoomed
            return best
        finally:
            release_memory()


def warm_up(weights_path: str) -> None:
    """โหลดโมเดลและรันเปล่าหนึ่งรอบตอนเซิร์ฟเวอร์เริ่ม ให้ผู้ใช้คนแรกไม่ต้องรอโหลด และไม่ต้องให้การโหลดโมเดลมาชนกับ
    คำขออื่นตอนที่แรมกำลังพุ่ง"""
    with _gate:
        try:
            _detect(np.full((480, 640, 3), 127, dtype=np.uint8), weights_path)
        finally:
            release_memory()
