"""Nail segmentation — หาตำแหน่ง/ขอบเขตเล็บแต่ละนิ้วจากภาพมือ

Pipeline หลัก (ค่าเริ่มต้น, ใช้ได้ทันทีไม่ต้องเทรนโมเดลเพิ่ม):
  1. MediaPipe Hands (Google, pretrained) หา 21 hand landmarks
  2. จากตำแหน่งข้อนิ้วสุดท้าย (DIP) -> ปลายนิ้ว (TIP) ประมาณกรอบเล็บเบื้องต้นจากสัดส่วนกายวิภาค
  3. ปรับกรอบให้แนบขอบเล็บจริงด้วย region-growing (OpenCV flood-fill เทียบสีแบบ chroma-aware)
     — เทคนิคเดียวกับที่ frontend ใช้ฝั่งเบราว์เซอร์ (src/utils/nailSegmentation.js) แต่ทำฝั่งเซิร์ฟเวอร์
     เพื่อให้ใช้ประวัติ/บันทึกผลลัพธ์ลงฐานข้อมูลได้ และเป็นจุดเสียบโมเดลที่แม่นกว่าในอนาคต

Pipeline สำรอง (แม่นกว่า, ต้องเทรนก่อน — ดู backend/ml/train_yolo_seg.py):
  ถ้ามีไฟล์น้ำหนักโมเดล YOLOv8-Seg ที่เทรนเฉพาะเล็บแล้วอยู่ที่ settings.yolo_nail_seg_weights
  ระบบจะสลับไปใช้ YOLOv8-Seg แทนโดยอัตโนมัติ (แม่นยำกว่า ไม่ต้องพึ่ง landmark ประมาณการ)
"""

from __future__ import annotations

import base64
import io
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from ..config import get_settings

settings = get_settings()

FINGERS = [
    {"id": "thumb", "label": "โป้ง", "tip": 4, "joint": 3},
    {"id": "index", "label": "ชี้", "tip": 8, "joint": 7},
    {"id": "middle", "label": "กลาง", "tip": 12, "joint": 11},
    {"id": "ring", "label": "นาง", "tip": 16, "joint": 15},
    {"id": "pinky", "label": "ก้อย", "tip": 20, "joint": 19},
]

CENTER_T = 0.725
LENGTH_RATIO = 0.225
WIDTH_RATIO = 0.85
ROI_BACK, ROI_FORWARD, ROI_HALF_WIDTH = 0.55, 1.9, 1.8
LOCAL_STEP_THRESHOLD = 18
ABS_SEED_THRESHOLD = 48
MIN_POINTS = 25

_hands_singleton = None
_yolo_singleton = None


def _get_mediapipe_hands():
    global _hands_singleton
    if _hands_singleton is None:
        import mediapipe as mp

        _hands_singleton = mp.solutions.hands.Hands(
            static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5
        )
    return _hands_singleton


def _yolo_weights_available() -> bool:
    return Path(settings.yolo_nail_seg_weights).is_file()


def _get_yolo_model():
    global _yolo_singleton
    if _yolo_singleton is None:
        from ultralytics import YOLO  # optional heavy dependency, see requirements.txt

        _yolo_singleton = YOLO(settings.yolo_nail_seg_weights)
    return _yolo_singleton


def decode_base64_image(image_base64: str) -> np.ndarray:
    if "," in image_base64 and image_base64.strip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    raw = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def encode_image_base64(bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", bgr)
    if not ok:
        raise ValueError("encode-failed")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def classify_skin_tone(bgr: np.ndarray) -> str:
    b, g, r = cv2.mean(bgr)[:3]
    warmth = (r - b) / 255
    if warmth > 0.12:
        return "warm"
    if warmth < 0.04:
        return "cool"
    return "neutral"


def _color_distance(c1, c2):
    r1, g1, b1 = c1
    r2, g2, b2 = c2
    s1, s2 = r1 + g1 + b1 + 3, r2 + g2 + b2 + 3
    chroma = math.hypot(r1 / s1 - r2 / s2, g1 / s1 - g2 / s2, b1 / s1 - b2 / s2)
    bright = abs(s1 - s2) / 3
    return chroma * 260 + bright * 0.35


def _region_grow(gray_rgb: np.ndarray, seed: tuple[int, int], roi, prior) -> tuple[list, list] | None:
    h, w, _ = gray_rgb.shape
    x0, y0 = int(seed[0]), int(seed[1])
    if not (0 <= x0 < w and 0 <= y0 < h):
        return None

    patch = gray_rgb[max(0, y0 - 2) : y0 + 3, max(0, x0 - 2) : x0 + 3].reshape(-1, 3)
    if patch.size == 0:
        return None
    seed_color = patch.mean(axis=0)

    cx, cy, ux, uy, vx, vy, L, W = prior
    min_x, min_y, max_x, max_y = roi
    visited = np.zeros((max_y - min_y + 1, max_x - min_x + 1), dtype=bool)
    stack = [(x0, y0, tuple(seed_color))]
    us, vs = [], []
    max_points = max(400, math.pi * L * W * 5)

    while stack:
        x, y, ref = stack.pop()
        if not (min_x <= x <= max_x and min_y <= y <= max_y):
            continue
        ly, lx = y - min_y, x - min_x
        if visited[ly, lx]:
            continue
        visited[ly, lx] = True
        pixel = tuple(int(v) for v in gray_rgb[y, x])
        if _color_distance(pixel, ref) > LOCAL_STEP_THRESHOLD or _color_distance(pixel, seed_color) > ABS_SEED_THRESHOLD:
            continue
        du = (x - cx) * ux + (y - cy) * uy
        dv = (x - cx) * vx + (y - cy) * vy
        us.append(du)
        vs.append(dv)
        if len(us) > max_points:
            return None
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            stack.append((nx, ny, pixel))

    if len(us) < MIN_POINTS:
        return None
    return us, vs


def _segment_with_mediapipe_opencv(bgr: np.ndarray) -> list[dict]:
    hands = _get_mediapipe_hands()
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)
    h, w = bgr.shape[:2]
    out = []
    if not result.multi_hand_landmarks:
        return out

    landmarks = result.multi_hand_landmarks[0].landmark
    for finger in FINGERS:
        joint = landmarks[finger["joint"]]
        tip = landmarks[finger["tip"]]
        p1 = (joint.x * w, joint.y * h)
        p2 = (tip.x * w, tip.y * h)
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]
        seg_len = math.hypot(dx, dy) or 1
        ux, uy = dx / seg_len, dy / seg_len
        vx, vy = -uy, ux
        cx = p1[0] + dx * CENTER_T
        cy = p1[1] + dy * CENTER_T
        L = seg_len * LENGTH_RATIO
        W = L * WIDTH_RATIO

        roi = (
            max(0, int(cx - (L * ROI_FORWARD + L * ROI_BACK))),
            max(0, int(cy - W * ROI_HALF_WIDTH)),
            min(w - 1, int(cx + (L * ROI_FORWARD + L * ROI_BACK))),
            min(h - 1, int(cy + W * ROI_HALF_WIDTH)),
        )
        prior = (cx, cy, ux, uy, vx, vy, L, W)

        best = None
        for t in (0, 0.35, -0.35, 0.65):
            seed = (cx + ux * L * t, cy + uy * L * t)
            grown = _region_grow(rgb, seed, roi, prior)
            if grown is None:
                continue
            us, vs = grown
            u_min, u_max = np.percentile(us, [3, 97])
            v_min, v_max = np.percentile(vs, [3, 97])
            area = (u_max - u_min) * (v_max - v_min)
            if best is None or area > best[0]:
                best = (area, u_min, u_max, v_min, v_max)

        if best is not None:
            _, u_min, u_max, v_min, v_max = best
            length = (u_max - u_min) / 2
            width = (v_max - v_min) / 2
            center_u = (u_min + u_max) / 2
            center_v = (v_min + v_max) / 2
            fcx = cx + ux * center_u + vx * center_v
            fcy = cy + uy * center_u + vy * center_v
            matched = True
        else:
            fcx, fcy, length, width = cx, cy, L, W
            matched = False

        angle_deg = math.degrees(math.atan2(uy, ux))
        out.append(
            {
                "finger": finger["id"],
                "matched": matched,
                "center": {"x": round(fcx, 1), "y": round(fcy, 1)},
                "length": round(length, 1),
                "width": round(width, 1),
                "angle_deg": round(angle_deg, 1),
                "ux": ux,
                "uy": uy,
                "vx": vx,
                "vy": vy,
            }
        )
    return out


def _segment_with_yolo(bgr: np.ndarray) -> list[dict]:
    model = _get_yolo_model()
    results = model.predict(bgr, verbose=False)[0]
    out = []
    if results.masks is None:
        return out
    for i, mask in enumerate(results.masks.xy):
        pts = np.array(mask)
        if len(pts) < 3:
            continue
        (cx, cy), (mw, mh), angle = cv2.minAreaRect(pts.astype(np.float32))
        out.append(
            {
                "finger": f"nail_{i}",
                "matched": True,
                "center": {"x": round(float(cx), 1), "y": round(float(cy), 1)},
                "length": round(max(mw, mh) / 2, 1),
                "width": round(min(mw, mh) / 2, 1),
                "angle_deg": round(float(angle), 1),
                "ux": math.cos(math.radians(angle)),
                "uy": math.sin(math.radians(angle)),
                "vx": -math.sin(math.radians(angle)),
                "vy": math.cos(math.radians(angle)),
            }
        )
    return out


def segment_nails(bgr: np.ndarray) -> tuple[list[dict], str]:
    """คืนค่า (รายการเล็บที่ตรวจพบ, ชื่อ engine ที่ใช้จริง)"""
    if _yolo_weights_available():
        try:
            return _segment_with_yolo(bgr), "yolov8-seg"
        except Exception:
            pass  # fallback ไป mediapipe+opencv ถ้าโหลด/รันโมเดลไม่สำเร็จ
    return _segment_with_mediapipe_opencv(bgr), "mediapipe+opencv"
