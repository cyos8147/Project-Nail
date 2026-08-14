"""Virtual Try-On — วาดสี/ลวดลายเล็บทับตำแหน่งเล็บที่ตรวจพบจริงในรูปมือของผู้ใช้ (photo-realistic overlay)
ใช้ผลลัพธ์จาก app.ai.segmentation.segment_nails() เป็นตำแหน่ง/ขนาด/มุมของเล็บแต่ละนิ้ว
"""

from __future__ import annotations

import random

import cv2
import numpy as np

NAIL_SHAPES = {
    "round": {"length_ratio": 1.0, "tip_width_ratio": 1.0},
    "oval": {"length_ratio": 1.16, "tip_width_ratio": 0.6},
    "square": {"length_ratio": 1.05, "tip_width_ratio": 1.0},
    "squoval": {"length_ratio": 1.08, "tip_width_ratio": 1.0},
    "almond": {"length_ratio": 1.32, "tip_width_ratio": 0.05},
    "coffin": {"length_ratio": 1.38, "tip_width_ratio": 0.5},
    "stiletto": {"length_ratio": 1.6, "tip_width_ratio": 0.02},
}


def _hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return (b, g, r)


def _draw_nail_mask(shape_mask: np.ndarray, nail: dict, shape_id: str) -> None:
    shape = NAIL_SHAPES.get(shape_id, NAIL_SHAPES["round"])
    cx, cy = nail["center"]["x"], nail["center"]["y"]
    length = nail["length"] * shape["length_ratio"]
    width = nail["width"] * max(shape["tip_width_ratio"], 0.35)
    angle = nail["angle_deg"]
    axes = (max(2, int(length)), max(2, int(width)))
    cv2.ellipse(shape_mask, (int(cx), int(cy)), axes, angle, 0, 360, 255, thickness=-1)


def apply_tryon(bgr: np.ndarray, nails: list[dict], color_hex: str, pattern: str, nail_shape: str) -> np.ndarray:
    result = bgr.copy()
    color_bgr = np.array(_hex_to_bgr(color_hex), dtype=np.float64)
    overlay = bgr.copy().astype(np.float64)
    full_mask = np.zeros(bgr.shape[:2], dtype=np.uint8)

    for nail in nails:
        nail_mask = np.zeros(bgr.shape[:2], dtype=np.uint8)
        _draw_nail_mask(nail_mask, nail, nail_shape)

        if pattern == "french":
            # ทาสีขาวเฉพาะโซนปลายเล็บ ~35% ส่วนโคนปล่อยสีธรรมชาติ
            tip_mask = np.zeros_like(nail_mask)
            cx, cy = nail["center"]["x"], nail["center"]["y"]
            ux, uy = nail["ux"], nail["uy"]
            tip_cx = cx + ux * nail["length"] * 0.55
            tip_cy = cy + uy * nail["length"] * 0.55
            axes = (max(2, int(nail["length"] * 0.5)), max(2, int(nail["width"])))
            cv2.ellipse(tip_mask, (int(tip_cx), int(tip_cy)), axes, nail["angle_deg"], 0, 360, 255, -1)
            tip_mask = cv2.bitwise_and(tip_mask, nail_mask)
            m = tip_mask.astype(np.float64) / 255.0
            for c, val in enumerate((235, 235, 245)):  # ขาวนวล (BGR)
                overlay[:, :, c] = overlay[:, :, c] * (1 - m) + val * m
            full_mask = cv2.bitwise_or(full_mask, tip_mask)
            continue

        m = nail_mask.astype(np.float64) / 255.0
        for c in range(3):
            overlay[:, :, c] = overlay[:, :, c] * (1 - m * 0.88) + color_bgr[c] * (m * 0.88)

        if pattern == "glitter":
            ys, xs = np.where(nail_mask > 0)
            n_specks = max(6, len(xs) // 40)
            rng = random.Random(int(nail["center"]["x"] + nail["center"]["y"]))
            for _ in range(min(n_specks, len(xs))):
                idx = rng.randrange(len(xs))
                y, x = ys[idx], xs[idx]
                cv2.circle(overlay, (int(x), int(y)), 1, (255, 255, 255), -1)

        full_mask = cv2.bitwise_or(full_mask, nail_mask)

    # เกลี่ยขอบให้เนียนขึ้นเล็กน้อยรอบบริเวณที่แต่งสี (feather) ก่อนผสมกลับเข้ารูปจริง
    blurred_mask = cv2.GaussianBlur(full_mask, (5, 5), 0).astype(np.float64) / 255.0
    for c in range(3):
        result[:, :, c] = (
            bgr[:, :, c].astype(np.float64) * (1 - blurred_mask) + overlay[:, :, c] * blurred_mask
        ).astype(np.uint8)

    return result
