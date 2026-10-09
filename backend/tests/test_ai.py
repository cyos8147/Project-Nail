"""ส่วน AI: ตัวตรวจจับเล็บ (ONNX) รับ/ปฏิเสธรูปถูกต้อง ทำทีละรูป ซูมเข้าเมื่อเจอเล็บน้อย และระบบแนะนำลาย"""

import io
import threading
import time
from pathlib import Path
from unittest import mock

import numpy as np
import pytest
from PIL import Image

from app.ai import nail_onnx
from app.config import get_settings

WEIGHTS = Path(__file__).resolve().parent.parent / get_settings().yolo_nail_seg_weights
needs_model = pytest.mark.skipif(not WEIGHTS.is_file(), reason="ไม่มีไฟล์โมเดล ONNX")


def _png(width=320, height=240, color=(120, 120, 120)):
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, "PNG")
    return buf.getvalue()


def _post(client, data, name="p.png", content_type="image/png"):
    return client.post("/api/ai/detect-nails", files={"file": (name, data, content_type)})


# ---------------------------------------------------------------- endpoint
def test_non_image_upload_is_refused(client):
    assert _post(client, b"hello", "a.txt", "text/plain").status_code == 400
    assert _post(client, b"not really an image", "a.jpg", "image/jpeg").status_code == 400


def test_oversized_upload_is_refused(client):
    assert _post(client, b"\xff\xd8" + b"0" * (9 * 1024 * 1024), "big.jpg", "image/jpeg").status_code == 400


@needs_model
def test_blank_picture_returns_zero_nails_not_an_error(client):
    r = _post(client, _png())
    # directions เป็น [] เมื่อมีโมเดลทิศเล็บ, null เมื่อไม่มี (ดู test_nail_direction.py)
    assert r.status_code == 200 and r.json()["nails"] == [] and r.json()["count"] == 0
    assert r.json()["directions"] in ([], None)


@needs_model
def test_a_large_phone_sized_picture_is_handled(client):
    y, x = np.mgrid[0:3000, 0:4000]
    smooth = np.stack([x / 4000 * 200 + 30, y / 3000 * 160 + 40, (x + y) / 7000 * 180 + 20], -1)
    noisy = np.clip(smooth + np.random.default_rng(2).normal(0, 5, smooth.shape), 0, 255).astype("uint8")
    buf = io.BytesIO()
    Image.fromarray(noisy).save(buf, "JPEG", quality=85)
    assert 500_000 < len(buf.getvalue()) < 7_000_000  # ขนาดแบบรูปมือถือจริง และไม่เกินเพดาน 8MB ของระบบ
    r = _post(client, buf.getvalue(), "big.jpg", "image/jpeg")
    assert r.status_code == 200 and "nails" in r.json()


def test_a_server_side_failure_is_reported_as_503_not_a_crash(client):
    with mock.patch("app.routers.ai.segmentation.detect_nail_polygons", side_effect=RuntimeError("boom")):
        r = _post(client, _png())
    assert r.status_code == 503 and "ไม่สำเร็จ" in r.json()["detail"]


# ---------------------------------------------------------------- ตรรกะของตัวตรวจจับ (ไม่ต้องใช้โมเดลจริง)
def _square(x0, y0, x1, y1):
    return np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], dtype=np.float32)


def test_few_nails_found_triggers_a_zoomed_second_look_and_the_better_result_wins():
    rgb = np.zeros((400, 600, 3), dtype=np.uint8)
    calls = []

    def fake_detect(img, weights):
        calls.append(img.shape[:2])
        return [] if img.shape[:2] == (400, 600) else [_square(0.1, 0.1, 0.2, 0.2)] * 5

    with mock.patch.object(nail_onnx, "_detect", fake_detect):
        result = nail_onnx.detect_nail_polygons(rgb, "ignored")
    assert len(result) == 5
    assert calls[0] == (400, 600) and len(calls) == 2 and calls[1][0] < 400  # รอบที่สองคือภาพที่ครอปกลางภาพ


def test_zoomed_coordinates_map_back_onto_the_full_picture():
    rgb = np.zeros((400, 600, 3), dtype=np.uint8)
    # ในภาพที่ครอปกลาง 50% (กว้าง 300 สูง 200 เริ่มที่ x=150,y=100) จุดกึ่งกลางภาพครอป (0.5,0.5) ต้องกลับมาเป็นกลางภาพเต็ม (0.5,0.5)
    with mock.patch.object(nail_onnx, "_detect", lambda img, w: [np.array([[0.5, 0.5], [0.0, 0.0], [1.0, 1.0]], dtype=np.float32)]):
        polygon = nail_onnx._detect_center_crop(rgb, 0.5, "ignored")[0]
    assert np.allclose(polygon[0], [0.5, 0.5]) and np.allclose(polygon[1], [0.25, 0.25]) and np.allclose(polygon[2], [0.75, 0.75])


def test_a_full_hand_does_not_trigger_the_extra_pass():
    calls = []

    def fake_detect(img, weights):
        calls.append(1)
        return [_square(0.1, 0.1, 0.2, 0.2)] * 5

    with mock.patch.object(nail_onnx, "_detect", fake_detect):
        nail_onnx.detect_nail_polygons(np.zeros((400, 600, 3), dtype=np.uint8), "ignored")
    assert len(calls) == 1


def test_detections_run_one_at_a_time():
    """โมเดลกินแรมต่อรูปมาก (3 รูปพร้อมกัน ~480MB เกินเพดาน 512MB ของ Render ฟรี) จึงต้องไม่ทำพร้อมกัน"""
    running, peak, lock = 0, 0, threading.Lock()

    def slow_detect(img, weights):
        nonlocal running, peak
        with lock:
            running += 1
            peak = max(peak, running)
        time.sleep(0.05)
        with lock:
            running -= 1
        return [_square(0.1, 0.1, 0.2, 0.2)] * 5

    with mock.patch.object(nail_onnx, "_detect", slow_detect):
        threads = [threading.Thread(target=nail_onnx.detect_nail_polygons, args=(np.zeros((50, 50, 3), dtype=np.uint8), "w")) for _ in range(5)]
        [t.start() for t in threads]
        [t.join() for t in threads]
    assert peak == 1


# ---------------------------------------------------------------- ระบบแนะนำลาย (XGBoost)
def test_recommendations_are_ranked_from_the_catalogue(client):
    r = client.post("/api/ai/recommend", json={"skin_tone": "warm", "nail_shape": "oval", "nail_length": "medium", "style_preference": "minimal", "occasion": "daily"})
    assert r.status_code == 200
    items = r.json()["recommendations"] if "recommendations" in r.json() else r.json()
    assert len(items) >= 1
    scores = [i["match_score"] for i in items]
    assert scores == sorted(scores, reverse=True)
