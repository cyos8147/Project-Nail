import base64
import uuid

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..ai import recommend as recommend_ai
from ..ai import segmentation, tryon
from ..database import get_db
from ..storage import upload_bytes

router = APIRouter(prefix="/ai", tags=["ai"])

STYLE_EXTRA_MINUTES = {"minimal": 0, "classic": 15, "bold": 30}
COMPLEXITY_EXTRA_MINUTES = {"simple": 0, "medium": 15, "complex": 30}


@router.post("/segment", response_model=schemas.SegmentResponse)
def segment(payload: schemas.SegmentRequest):
    try:
        bgr = segmentation.decode_base64_image(payload.image_base64)
    except Exception:
        raise HTTPException(400, "อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองรูปอื่น")

    nails, engine = segmentation.segment_nails(bgr)
    if not nails:
        raise HTTPException(422, "ตรวจไม่พบมือในรูปภาพ กรุณาถ่ายรูปมือให้ชัดเจนและอยู่ในเฟรมทั้งหมด")

    skin_tone = segmentation.classify_skin_tone(bgr)
    h, w = bgr.shape[:2]
    return schemas.SegmentResponse(
        image_width=w,
        image_height=h,
        skin_tone=skin_tone,
        engine=engine,
        nails=[
            schemas.SegmentResult(
                finger=n["finger"], matched=n["matched"], center=n["center"],
                length=n["length"], width=n["width"], angle_deg=n["angle_deg"],
            )
            for n in nails
        ],
    )


@router.post("/tryon", response_model=schemas.TryOnResponse)
def try_on(payload: schemas.TryOnRequest, db: Session = Depends(get_db)):
    try:
        bgr = segmentation.decode_base64_image(payload.image_base64)
    except Exception:
        raise HTTPException(400, "อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองรูปอื่น")

    nails, engine = segmentation.segment_nails(bgr)
    if not nails:
        raise HTTPException(422, "ตรวจไม่พบมือในรูปภาพ กรุณาถ่ายรูปมือให้ชัดเจนและอยู่ในเฟรมทั้งหมด")

    skin_tone = segmentation.classify_skin_tone(bgr)
    result_bgr = tryon.apply_tryon(bgr, nails, payload.color_hex, payload.pattern, payload.nail_shape)
    result_b64 = segmentation.encode_image_base64(result_bgr)

    history_id = None
    if payload.save:
        source_url = upload_bytes(
            cv2.imencode(".jpg", bgr)[1].tobytes(), "source.jpg", "tryon-results", "image/jpeg"
        )
        result_url = upload_bytes(
            cv2.imencode(".png", result_bgr)[1].tobytes(), "result.png", "tryon-results", "image/png"
        )
        customer = None
        if payload.customer_phone:
            customer = db.query(models.Customer).filter(models.Customer.phone == payload.customer_phone).first()
        history = models.AiTryonHistory(
            customer_id=customer.id if customer else None,
            customer_phone=payload.customer_phone,
            source_image_url=source_url,
            result_image_url=result_url,
            color_hex=payload.color_hex,
            pattern=payload.pattern,
            nail_shape=payload.nail_shape,
            skin_tone=skin_tone,
            segmentation_engine=engine,
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        history_id = history.id

    return schemas.TryOnResponse(
        result_image_base64=result_b64,
        skin_tone=skin_tone,
        nails_detected=len(nails),
        engine=engine,
        history_id=history_id,
    )


@router.post("/analyze-style", response_model=schemas.ReferenceStyleResponse)
def analyze_style(payload: schemas.ReferenceStyleRequest, db: Session = Depends(get_db)):
    try:
        bgr = segmentation.decode_base64_image(payload.image_base64)
    except Exception:
        raise HTTPException(400, "อ่านไฟล์รูปภาพไม่สำเร็จ กรุณาลองรูปอื่น")

    small = cv2.resize(bgr, (60, 60)).astype(np.float64)
    b, g, r = small[:, :, 0], small[:, :, 1], small[:, :, 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    sat = np.where(maxc > 0, (maxc - minc) / np.maximum(maxc, 1e-6), 0)
    avg_saturation = float(sat.mean())
    lightness = (r + g + b) / 3
    norm_variance = float(min(1.0, lightness.std() / 128))

    if avg_saturation < 0.28 and norm_variance < 0.22:
        style_tag = "minimal"
    elif avg_saturation > 0.5 or norm_variance > 0.4:
        style_tag = "bold"
    else:
        style_tag = "classic"

    designs = (
        db.query(models.NailDesign)
        .filter(models.NailDesign.style_tag == style_tag, models.NailDesign.active == True)  # noqa: E712
        .order_by(models.NailDesign.popularity.desc())
        .limit(3)
        .all()
    )

    return schemas.ReferenceStyleResponse(
        style_tag=style_tag,
        saturation=round(avg_saturation, 4),
        variance=round(norm_variance, 4),
        extra_minutes=STYLE_EXTRA_MINUTES[style_tag],
        similar_designs=designs,
    )


@router.post("/recommend", response_model=schemas.RecommendResponse)
def recommend(payload: schemas.RecommendRequest, db: Session = Depends(get_db)):
    designs = db.query(models.NailDesign).filter(models.NailDesign.active == True).all()  # noqa: E712
    if not designs:
        raise HTTPException(404, "ยังไม่มีลายเล็บในระบบ")

    model_scores = recommend_ai.predict_design_scores(
        payload.skin_tone, payload.nail_shape, payload.nail_length, payload.style_preference, payload.occasion
    )

    items = []
    if model_scores:
        for d in designs:
            score = model_scores.get(d.name)
            if score is not None:
                items.append((d, score))
        items.sort(key=lambda x: x[1], reverse=True)
    else:
        for d in designs:
            items.append((d, recommend_ai.fallback_score(d, payload.skin_tone)))
        items.sort(key=lambda x: x[1], reverse=True)

    top = items[:5]

    customer = None
    if payload.customer_phone:
        customer = db.query(models.Customer).filter(models.Customer.phone == payload.customer_phone).first()

    log = models.AiRecommendLog(
        customer_id=customer.id if customer else None,
        skin_tone=payload.skin_tone,
        nail_shape=payload.nail_shape,
        nail_length=payload.nail_length,
        style_preference=payload.style_preference,
        occasion=payload.occasion,
        recommended_design_id=top[0][0].id if top else None,
        confidence=(top[0][1] / 100 if top else None),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return schemas.RecommendResponse(
        log_id=log.id,
        recommendations=[schemas.RecommendItem(design=d, match_score=s) for d, s in top],
        model_metrics=recommend_ai.get_metrics(),
    )


@router.post("/recommend/{log_id}/accept")
def mark_recommendation_accepted(log_id: str, db: Session = Depends(get_db)):
    log = db.get(models.AiRecommendLog, log_id)
    if log is None:
        raise HTTPException(404, "ไม่พบ log นี้")
    log.accepted = True
    db.commit()
    return {"ok": True}
