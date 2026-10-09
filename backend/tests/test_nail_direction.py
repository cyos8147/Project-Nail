"""ทิศปลายเล็บ (ai/nail_direction.py): ตัดภาพรอบเล็บถูกต้อง หมุนรูปแล้วคำตอบหมุนตาม และ endpoint ไม่ล้มถ้าโมเดลมีปัญหา"""

import io
import math
from pathlib import Path
from unittest import mock

import cv2
import numpy as np
import pytest
from PIL import Image

from app.ai import nail_direction
from app.config import get_settings

ROOT = Path(__file__).resolve().parent.parent
DIRECTION_WEIGHTS = ROOT / get_settings().nail_direction_weights
needs_direction_model = pytest.mark.skipif(not DIRECTION_WEIGHTS.is_file(), reason="ไม่มีไฟล์โมเดลทิศเล็บ")


def _finger_photo(size=400):
    """นิ้ววาดง่ายๆ ชี้ขึ้น: ตัวนิ้วสีผิวจากขอบล่างขึ้นมา ปลายมน มีเล็บสีชมพูอ่อนที่ปลาย -- คืนรูป RGB กับ polygon เล็บ (พิกเซล)"""
    img = np.full((size, size, 3), (236, 232, 226), np.uint8)
    cx = size // 2
    cv2.rectangle(img, (cx - 38, int(size * 0.42)), (cx + 38, size), (196, 150, 128), -1)
    cv2.circle(img, (cx, int(size * 0.42)), 38, (196, 150, 128), -1)
    nail = cv2.ellipse2Poly((cx, int(size * 0.45)), (24, 32), 0, 0, 360, 10).astype(np.float64)
    cv2.fillPoly(img, [nail.astype(np.int32)], (232, 190, 196))
    return img, nail


def _rotate_quarter(img, poly, k):
    """หมุนรูป (และ polygon) ทวนเข็ม 90 องศา k ครั้ง แบบเดียวกับ np.rot90"""
    h, w = img.shape[:2]
    p = poly.copy()
    for _ in range(k % 4):
        p = np.stack([p[:, 1], (w - 1) - p[:, 0]], axis=1)
        h, w = w, h
    return np.ascontiguousarray(np.rot90(img, k)), p


def test_crop_is_four_channels_with_the_nail_mask_in_the_middle():
    img, nail = _finger_photo()
    x = nail_direction.crop_for_model(img, nail)
    assert x.shape == (4, 96, 96) and x.dtype == np.float32
    assert 0.0 <= x.min() and x.max() <= 1.0
    assert x[3, 48, 48] == 1.0  # กลางภาพคือเล็บ
    assert x[3, 2, 2] == 0.0 and x[3, 93, 93] == 0.0  # มุมภาพไม่ใช่เล็บ


def test_the_part_of_the_crop_past_the_photo_edge_is_black():
    img = np.full((200, 200, 3), 200, np.uint8)
    corner_nail = np.array([[2, 2], [30, 2], [30, 40], [2, 40]], np.float64)
    x = nail_direction.crop_for_model(img, corner_nail)
    assert x[:3, 0, 0].max() == 0.0  # มุมบนซ้ายของภาพที่ตัดอยู่นอกรูป
    assert x[:3, 60, 60].min() > 0.7  # ส่วนที่อยู่ในรูปยังเป็นสีเดิม


def test_no_model_file_means_no_answer_rather_than_an_error():
    img, nail = _finger_photo()
    assert nail_direction.predict_directions(img, [nail / 400], "/nonexistent/model.onnx") is None


@needs_direction_model
def test_no_nails_gives_an_empty_list():
    assert nail_direction.predict_directions(np.zeros((50, 50, 3), np.uint8), [], str(DIRECTION_WEIGHTS)) == []


@needs_direction_model
def test_turning_the_photo_turns_the_answer_with_it():
    img, nail = _finger_photo()
    answers = []
    for k in range(4):
        im, p = _rotate_quarter(img, nail, k)
        h, w = im.shape[:2]
        (dx, dy, conf), = nail_direction.predict_directions(im, [p / [w, h]], str(DIRECTION_WEIGHTS))
        assert abs(math.hypot(dx, dy) - 1) < 1e-3 and conf > 0
        # หมุนกลับ k ครั้งให้เทียบกับรูปตั้งต้นได้ (ภาพหมุนทวนเข็ม = เวกเตอร์ (dx, dy) -> (dy, -dx))
        for _ in range(k):
            dx, dy = -dy, dx
        answers.append((dx, dy))
    for dx, dy in answers[1:]:
        assert math.degrees(math.acos(max(-1, min(1, dx * answers[0][0] + dy * answers[0][1])))) < 5


@needs_direction_model
def test_a_drawn_finger_pointing_up_is_read_as_pointing_up():
    img, nail = _finger_photo()
    (dx, dy, conf), = nail_direction.predict_directions(img, [nail / 400], str(DIRECTION_WEIGHTS))
    assert dy < -0.8, (dx, dy, conf)  # แกน y ของรูปชี้ลง ปลายนิ้วอยู่ด้านบน


# ---------------------------------------------------------------- endpoint
def _png():
    buf = io.BytesIO()
    Image.fromarray(_finger_photo()[0]).save(buf, "PNG")
    return buf.getvalue()


def _post(client):
    return client.post("/api/ai/detect-nails", files={"file": ("f.png", _png(), "image/png")})


def _one_nail(_rgb):
    return [(_finger_photo()[1] / 400).astype(np.float32)]


@needs_direction_model
def test_detect_nails_returns_one_direction_per_nail(client):
    with mock.patch("app.routers.ai.segmentation.yolo_weights_available", return_value=True), \
         mock.patch("app.routers.ai.segmentation.detect_nail_polygons", side_effect=_one_nail):
        r = _post(client)
    body = r.json()
    assert r.status_code == 200 and body["count"] == 1
    assert len(body["directions"]) == 1
    dx, dy, conf = body["directions"][0]
    assert abs(math.hypot(dx, dy) - 1) < 1e-3 and conf > 0


def test_a_broken_direction_model_does_not_break_nail_detection(client):
    with mock.patch("app.routers.ai.segmentation.yolo_weights_available", return_value=True), \
         mock.patch("app.routers.ai.segmentation.detect_nail_polygons", side_effect=_one_nail), \
         mock.patch.object(get_settings(), "nail_direction_weights", __file__), \
         mock.patch("app.ai.nail_direction._get_session", side_effect=RuntimeError("model file is damaged")):
        r = _post(client)
    assert r.status_code == 200
    assert r.json()["count"] == 1 and r.json()["directions"] is None
