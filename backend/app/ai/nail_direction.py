"""ทิศปลายเล็บ: เล็บแต่ละชิ้นชี้ไปทางไหน (ใช้ตอนต่อเล็บให้ยาวในหน้า AI ลองเล็บ ส่วนที่ต่อต้องงอกไปทางปลายนิ้ว)

โมเดล CNN เล็ก (ml/models/nail_direction.onnx ~4MB) ดูรูปรอบเล็บทีละชิ้น (สี่เหลี่ยมด้านละ 4 เท่าของขนาดเล็บ
ย่อเป็น 96x96 + หน้ากากรูปเล็บอีกชั้น) แล้วตอบเวกเตอร์ 2 มิติที่ชี้ไปทางปลายนิ้ว ความยาวเวกเตอร์คือความมั่นใจ
(เทรนแบบ MSE กับเวกเตอร์ยาว 1 ถ้าโมเดลลังเลระหว่างสองฝั่ง ค่าที่ได้จะหักล้างกันจนสั้น)

ข้อมูลเทรน: รูปมือจาก Open Images (Google) ติดป้ายอัตโนมัติด้วย MediaPipe Hands ซึ่งแม่นมากเมื่อเห็นทั้งมือ
แล้วตัดเฉพาะรอบเล็บมาเทรน โมเดลจึงเดาทิศได้แม้รูปซูมใกล้นิ้วเดียว (ที่ MediaPipe หามือไม่เจอ)
วิธีเทรนใหม่อยู่ใน ml/train_nail_direction.py และ docs/04_AI_TRAINING.md

ถ้าโหลด/รันโมเดลไม่ได้ จะคืน None แล้ว frontend ใช้วิธีเดาทิศแบบเดิม (ดูเส้นขอบนิ้ว) ต่อได้ตามปกติ
"""

from __future__ import annotations

import logging
import math
import threading
from pathlib import Path

import cv2
import numpy as np

log = logging.getLogger("uvicorn.error")

INPUT = 96
CONTEXT = 4.0  # ด้านของภาพที่ตัด = 4 เท่าของเส้นผ่านศูนย์กลางเล็บ (ต้องตรงกับตอนเทรน)

_session = None
_session_lock = threading.Lock()


def _get_session(weights_path: str):
    global _session
    if _session is None:
        with _session_lock:
            if _session is None:
                import onnxruntime as ort

                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 1
                opts.inter_op_num_threads = 1
                opts.enable_cpu_mem_arena = False
                opts.enable_mem_pattern = False
                _session = ort.InferenceSession(weights_path, sess_options=opts, providers=["CPUExecutionProvider"])
    return _session


def nail_geometry(poly: np.ndarray) -> tuple[float, float, float]:
    """จุดกลาง (ของเปลือกนูน) และเส้นผ่านศูนย์กลาง (ระยะไกลสุดข้ามเล็บ ไม่ขึ้นกับว่ารูปหมุนแค่ไหน) หน่วยพิกเซล"""
    hull = cv2.convexHull(poly.astype(np.float32)).reshape(-1, 2).astype(np.float64)
    d = hull[:, None, :] - hull[None, :, :]
    diam = float(np.sqrt((d**2).sum(-1)).max())
    m = cv2.moments(hull.astype(np.float32))
    if m["m00"] > 1e-6:
        cx, cy = m["m10"] / m["m00"], m["m01"] / m["m00"]
    else:
        cx, cy = poly.mean(0)
    return float(cx), float(cy), max(diam, 4.0)


def crop_for_model(rgb: np.ndarray, poly: np.ndarray) -> np.ndarray:
    """ข้อมูลเข้าโมเดลของเล็บหนึ่งชิ้น: 4 x 96 x 96 (RGB 0-1 + หน้ากากเล็บ 0-1) ส่วนที่เลยขอบรูปเติมดำ"""
    h, w = rgb.shape[:2]
    cx, cy, diam = nail_geometry(poly)
    side = CONTEXT * diam
    n = max(int(math.ceil(side)), 1)
    x0, y0 = int(math.floor(cx - side / 2)), int(math.floor(cy - side / 2))
    region = np.zeros((n, n, 3), dtype=np.uint8)
    sx0, sy0, sx1, sy1 = max(x0, 0), max(y0, 0), min(x0 + n, w), min(y0 + n, h)
    if sx1 > sx0 and sy1 > sy0:
        region[sy0 - y0 : sy1 - y0, sx0 - x0 : sx1 - x0] = rgb[sy0:sy1, sx0:sx1]
    img = cv2.resize(region, (INPUT, INPUT), interpolation=cv2.INTER_AREA if n > INPUT else cv2.INTER_LINEAR)
    k = INPUT / n
    local = np.round((poly - [x0, y0]) * k).astype(np.int32)
    mask = np.zeros((INPUT, INPUT), np.uint8)
    cv2.fillPoly(mask, [local], 255)
    x = np.concatenate([img.astype(np.float32) / 255.0, (mask.astype(np.float32) / 255.0)[..., None]], axis=2)
    return x.transpose(2, 0, 1)


def _with_turns(batch: np.ndarray) -> np.ndarray:
    """แต่ละภาพหมุน 0/90/180/270 องศา ทั้งแบบปกติและกลับซ้ายขวา (8 แบบ) -- เฉลี่ยคำตอบแล้วแม่นและนิ่งกว่า"""
    out = []
    for k in range(4):
        r = np.rot90(batch, k, axes=(2, 3))
        out.append(r)
        out.append(r[:, :, :, ::-1])
    return np.ascontiguousarray(np.concatenate(out), dtype=np.float32)


def _undo_turns(pred: np.ndarray, n: int) -> np.ndarray:
    acc = np.zeros((n, 2), np.float64)
    for v in range(8):
        k, mirrored = divmod(v, 2)
        o = pred[v * n : (v + 1) * n].astype(np.float64)
        if mirrored:
            o = o * [-1.0, 1.0]
        for _ in range(k):  # หมุนภาพทวนเข็ม 90 องศา = เวกเตอร์ (แกน y ชี้ลง) หมุนไป -90 องศา หมุนกลับทีละครั้ง
            o = np.stack([-o[:, 1], o[:, 0]], axis=1)
        acc += o
    return acc / 8


def predict_directions(rgb: np.ndarray, polygons: list[np.ndarray], weights_path: str) -> list[list[float]] | None:
    """ทิศปลายนิ้วของเล็บแต่ละชิ้น [[dx, dy, ความมั่นใจ], ...] เรียงตาม polygons -- dx, dy เป็นเวกเตอร์ยาว 1
    ในพิกัดพิกเซลของรูป (แกน y ชี้ลง) polygons เป็นพิกัดสัดส่วน 0-1 แบบที่ nail_onnx คืนมา
    คืน None ถ้าไม่มีไฟล์โมเดลหรือรันไม่สำเร็จ"""
    if not Path(weights_path).is_file():
        return None
    if not polygons:
        return []
    try:
        h, w = rgb.shape[:2]
        crops = np.stack([crop_for_model(rgb, np.asarray(p, dtype=np.float64) * [w, h]) for p in polygons])
        session = _get_session(weights_path)
        pred = session.run(None, {session.get_inputs()[0].name: _with_turns(crops)})[0]
        out = []
        for dx, dy in _undo_turns(pred, len(polygons)):
            norm = math.hypot(dx, dy)
            if norm < 1e-6:
                out.append([0.0, 0.0, 0.0])
            else:
                out.append([round(dx / norm, 4), round(dy / norm, 4), round(min(norm, 1.5), 3)])
        return out
    except Exception:
        log.exception("nail direction model failed")
        return None


def warm_up(weights_path: str) -> None:
    if Path(weights_path).is_file():
        predict_directions(np.full((200, 200, 3), 127, np.uint8), [np.array([[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]])], weights_path)
