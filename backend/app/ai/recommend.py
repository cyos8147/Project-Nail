"""โหลดโมเดล XGBoost ที่เทรนไว้ (backend/ml/train_xgboost_recommender.py) มาทำนายคำแนะนำลายเล็บ
ถ้ายังไม่เคยเทรนโมเดล (ยังไม่มีไฟล์โมเดล/encoders) จะ fallback ไปใช้กฎแนะนำแบบง่าย (เหมือนที่ frontend
เดิมเคยใช้ใน src/data/nailCatalog.js) เพื่อให้ endpoint ยังใช้งานได้ทันทีตั้งแต่วันแรกโดยไม่บังคับต้องเทรนก่อน

หมายเหตุ: ตัวแปลง category<->index เก็บเป็นไฟล์ JSON ธรรมดา (ไม่ใช้ pickle/joblib) เพื่อไม่ให้การโหลด
โมเดลผูกกับเวอร์ชัน scikit-learn ที่ใช้ตอนเทรน — อ่านง่าย ตรวจสอบได้ตรงๆ ด้วยตา และพกพาข้ามเวอร์ชันได้
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from ..config import get_settings

settings = get_settings()

_model = None
_encoders = None
_metrics: dict = {}
_load_attempted = False


def _try_load():
    global _model, _encoders, _metrics, _load_attempted
    if _load_attempted:
        return
    _load_attempted = True

    model_path = Path(settings.xgboost_model_path)
    encoders_path = Path(settings.xgboost_encoders_path)
    if not model_path.is_file() or not encoders_path.is_file():
        return

    import xgboost as xgb

    booster = xgb.XGBClassifier()
    booster.load_model(str(model_path))
    _model = booster
    _encoders = json.loads(encoders_path.read_text(encoding="utf-8"))

    metrics_path = model_path.parent / "nail_recommender_metrics.json"
    if metrics_path.is_file():
        _metrics = json.loads(metrics_path.read_text(encoding="utf-8"))


def is_model_ready() -> bool:
    _try_load()
    return _model is not None


def get_metrics() -> dict:
    _try_load()
    return _metrics or {"note": "ยังไม่ได้เทรนโมเดล — ใช้กฎ fallback อยู่ (ดู docs/04_AI_TRAINING.md)"}


def predict_design_scores(
    skin_tone: str, nail_shape: str, nail_length: str, style_preference: str, occasion: str
) -> dict[str, float]:
    """คืนค่า {design_name: probability_percent} จากโมเดลที่เทรนไว้"""
    _try_load()
    if _model is None:
        return {}

    columns = _encoders["feature_columns"]
    categories = _encoders["feature_categories"]
    label_classes = _encoders["label_classes"]
    values = [skin_tone, nail_shape, nail_length, style_preference, occasion]

    # OrdinalEncoder เข้ารหัสตามลำดับ index ใน categories_[i] (เรียงแบบ sort ปกติตอนเทรน) — ค่าที่ไม่
    # เคยเจอตอนเทรน (category แปลกใหม่) ใช้ index 0 แทน ให้โมเดลยังทำนายได้แทนที่จะ error
    encoded = []
    for col, val in zip(columns, values):
        col_categories = categories[col]
        encoded.append(float(col_categories.index(val)) if val in col_categories else 0.0)

    X = np.array([encoded])
    proba = _model.predict_proba(X)[0]
    return {label_classes[i]: round(float(p) * 100, 2) for i, p in enumerate(proba)}


def fallback_score(design, skin_tone: str) -> float:
    """กฎง่ายๆ แบบเดียวกับที่ frontend เดิมใช้ (scoreDesignForTone) — ใช้ตอนยังไม่ได้เทรนโมเดล"""
    tone_score = (design.tone_fit or {}).get(skin_tone, 50)
    blended = tone_score * 0.75 + design.popularity * 0.25
    return round(min(99, blended), 2)
