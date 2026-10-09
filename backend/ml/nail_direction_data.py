"""สร้างชุดข้อมูลเทรนโมเดลทิศปลายเล็บ (app/ai/nail_direction.py) จากรูปมือใน Open Images ของ Google

ไม่ต้องติดป้ายเอง: ใช้ MediaPipe Hands เป็น "ครู" -- ถ้าเห็นมือทั้งมือ MediaPipe บอกตำแหน่งข้อนิ้วได้แม่นมาก
(วัดกับรูปที่ติดป้ายด้วยมือ: ไม่ผิดด้านเลย คลาดเฉลี่ย ~4 องศา) จับคู่เล็บแต่ละชิ้น (จากโมเดลตรวจเล็บของเว็บเอง)
กับนิ้วที่เล็บอยู่ ทิศของกระดูกข้อสุดท้าย (DIP -> ปลายนิ้ว) คือป้ายของเล็บนั้น
จากนั้นตัดเฉพาะรอบเล็บมาเทรน โมเดลจึงเรียนเดาทิศจากภาพใกล้ๆ ได้ แม้ในรูปที่ MediaPipe หามือไม่เจอ

ลิขสิทธิ์: รูปใน Open Images เป็น CC BY 2.0 (ป้ายกำกับ CC BY 4.0) ใช้เทรนได้ -- ไม่ commit ตัวรูปลง git
เก็บไว้ในเครื่องที่ ml/datasets/nail_direction/ (อยู่ใน .gitignore) เท่านั้น

ขั้นตอน (ต้องมีอินเทอร์เน็ต, ใช้เวลารวมราว 2-3 ชั่วโมงบนเครื่อง 4 คอร์):
    cd backend
    python -m ml.nail_direction_data lists               # รายชื่อรูปที่มีมือ/เล็บ (สตรีม CSV ของ Open Images ~5GB ไม่เก็บลงดิสก์)
    python -m ml.nail_direction_data label --min-area 0.04
    python -m ml.nail_direction_data label --min-area 0.015   # มือเล็กลงมา (ได้ข้อมูลเพิ่ม)
    python -m ml.nail_direction_data patches            # -> ml/datasets/nail_direction/patches.npz
แล้วเทรนต่อด้วย python -m ml.train_nail_direction
"""

from __future__ import annotations

import argparse
import collections
import csv
import io
import json
import math
import os
import sys
import time
import urllib.request
from multiprocessing import Pool
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.ai.nail_direction import nail_geometry  # noqa: E402

OUT = ROOT / "ml/datasets/nail_direction"
YOLO = ROOT / "ml/models/yolov8_nail_seg.onnx"
OI = "https://storage.googleapis.com/openimages"
OI_IMAGES = "https://s3.amazonaws.com/open-images-dataset"
BOX_CSVS = {
    "validation": f"{OI}/v5/validation-annotations-bbox.csv",
    "test": f"{OI}/v5/test-annotations-bbox.csv",
    "train": f"{OI}/v6/oidv6-train-annotations-bbox.csv",
}
LABEL_CSVS = {
    "validation": f"{OI}/v5/validation-annotations-human-imagelabels.csv",
    "test": f"{OI}/v5/test-annotations-human-imagelabels.csv",
    "train": f"{OI}/v7/oidv7-train-annotations-human-imagelabels.csv",
}
HUMAN_HAND = "/m/0k65p"
# ป้ายระดับรูป: เล็บ/ทำเล็บ/ยาทาเล็บ/ดูแลเล็บ/เล็บปลอม มาก่อน แล้วค่อยนิ้ว/นิ้วโป้ง/มือ
CLASS_PRIORITY = {"/m/023j4r": 10, "/m/01f4cc": 10, "/m/04030j": 10, "/m/0h8nm6p": 10, "/m/05f5g1r": 10,
                  "/m/09cx8": 5, "/m/01bmhj": 5, HUMAN_HAND: 1}
FINGERS = [(4, 3, 2), (8, 7, 6), (12, 11, 10), (16, 15, 14), (20, 19, 18)]  # (ปลาย, ข้อสุดท้าย, ข้อกลาง) โป้งใช้ IP/MCP

PATCH = 192         # ขนาด patch ที่เก็บไว้ทำ augmentation ตอนเทรน
PATCH_NAIL = 26.0   # เส้นผ่านศูนย์กลางเล็บใน patch (พิกเซล)


# ------------------------------------------------------------------ 1) รายชื่อรูป
def cmd_lists(_args):
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for split, url in BOX_CSVS.items():  # กรอบมือที่คนวาด: ไม่ใช่กลุ่ม ไม่ใช่ภาพวาด
        n = 0
        for r in csv.reader(io.TextIOWrapper(urllib.request.urlopen(url, timeout=600), encoding="utf-8")):
            if len(r) > 11 and r[2] == HUMAN_HAND and r[10] == "0" and r[11] == "0":
                area = (float(r[5]) - float(r[4])) * (float(r[7]) - float(r[6]))  # (XMax - XMin) * (YMax - YMin)
                rows.append((split, r[0], f"box:{area:.5f}"))
                n += 1
        print(f"{split}: {n} hand boxes", flush=True)
    for split, url in LABEL_CSVS.items():  # ป้ายระดับรูปที่คนยืนยัน (Confidence = 1)
        n = 0
        for r in csv.reader(io.TextIOWrapper(urllib.request.urlopen(url, timeout=600), encoding="utf-8")):
            if len(r) > 3 and r[2] in CLASS_PRIORITY and r[3] == "1":
                rows.append((split, r[0], f"label:{r[2]}"))
                n += 1
        print(f"{split}: {n} image labels", flush=True)
    with open(OUT / "photos.csv", "w", newline="") as f:
        csv.writer(f).writerows(rows)


def _photo_queue(min_area: float):
    """รูปที่จะติดป้าย เรียงจากน่าจะได้ข้อมูลดีสุดก่อน: ป้ายเล็บ/ทำเล็บ แล้วมือใหญ่ไปเล็ก"""
    best: dict[tuple[str, str], float] = {}
    for split, image_id, what in csv.reader(open(OUT / "photos.csv")):
        kind, val = what.split(":", 1)
        score = CLASS_PRIORITY[val] if kind == "label" else float(val)
        if kind == "box" and score < min_area:
            continue
        key = (split, image_id)
        best[key] = max(best.get(key, 0.0), score)
    return [k for k, _ in sorted(best.items(), key=lambda kv: -kv[1])]


# ------------------------------------------------------------------ 2) ติดป้าย
_hands = None


def _init_worker():
    global _hands
    import mediapipe as mp

    _hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=4, model_complexity=1, min_detection_confidence=0.5)


def _find_hands(rgb):
    h, w = rgb.shape[:2]
    # มือที่เต็มเฟรมมักหาไม่เจอ ลองย่อออก (เติมขอบเทา) อีกสองระดับ
    for pad_frac in (0.0, 0.6, 1.0):
        p = int(pad_frac * max(h, w) / 2)
        im = cv2.copyMakeBorder(rgb, p, p, p, p, cv2.BORDER_CONSTANT, value=(128, 128, 128)) if p else rgb
        res = _hands.process(im)
        ph, pw = im.shape[:2]
        found = [([(l.x * pw - p, l.y * ph - p) for l in lm.landmark], hd.classification[0].score)
                 for lm, hd in zip(res.multi_hand_landmarks or [], res.multi_handedness or [])]
        if found:
            return found
    return []


def _label_photo(job):
    split, image_id, out_dir = job
    from app.ai import nail_onnx

    rec = {"id": image_id, "split": split, "status": "ok"}
    try:
        with urllib.request.urlopen(f"{OI_IMAGES}/{split}/{image_id}.jpg", timeout=60) as r:
            data = r.read()
    except Exception as e:
        rec["status"] = f"download:{type(e).__name__}"
        return rec
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        rec["status"] = "decode"
        return rec
    s = min(1.0, 1600.0 / max(bgr.shape[:2]))
    if s < 1:
        bgr = cv2.resize(bgr, (int(round(bgr.shape[1] * s)), int(round(bgr.shape[0] * s))), interpolation=cv2.INTER_AREA)
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    polys = nail_onnx._detect(rgb, str(YOLO))  # รอบเดียวพอ (การซูมเข้าช่วยแค่มือเล็กมาก ซึ่งได้ภาพเล็บไม่ชัดอยู่ดี)
    nail_onnx.release_memory()
    if not polys:
        rec["status"] = "no_nails"
        return rec
    hands = _find_hands(rgb)
    if not hands:
        rec["status"] = "no_hand"
        return rec

    cands, stats = [], []
    for ni, poly in enumerate(polys):
        pp = np.asarray(poly, np.float64) * [w, h]
        p0 = pp - pp.mean(0)
        ev, evec = np.linalg.eigh(p0.T @ p0 / len(pp))
        aspect = math.sqrt(max(ev[1], 1e-9) / max(ev[0], 1e-9))
        size = float(max(np.ptp(pp[:, 0]), np.ptp(pp[:, 1])))
        c = pp.mean(0)
        stats.append((pp, size, evec[:, 1], aspect))
        for hi, (pts, _) in enumerate(hands):
            for fi, (t, d, _) in enumerate(FINGERS):
                vx, vy = pts[t][0] - pts[d][0], pts[t][1] - pts[d][1]
                bone = math.hypot(vx, vy)
                if bone < 4:
                    continue
                ux, uy = vx / bone, vy / bone
                rx, ry = c[0] - pts[d][0], c[1] - pts[d][1]
                along = (rx * ux + ry * uy) / bone  # 0 ที่ข้อ, 1 ที่ปลายนิ้ว
                across = abs(rx * uy - ry * ux) / bone
                if -0.1 <= along <= 1.5 and across <= 0.6:
                    cands.append((across + 0.5 * abs(along - 0.65), ni, hi, fi))
    cands.sort()
    used_n, used_f, nails = set(), set(), []
    for cost, ni, hi, fi in cands:
        if ni in used_n or (hi, fi) in used_f:
            continue
        used_n.add(ni)
        used_f.add((hi, fi))
        pp, size, major, aspect = stats[ni]
        pts, score = hands[hi]
        t, d, p = FINGERS[fi]
        vx, vy = pts[t][0] - pts[d][0], pts[t][1] - pts[d][1]
        n = math.hypot(vx, vy)
        ux, uy = vx / n, vy / n
        wx, wy = pts[d][0] - pts[p][0], pts[d][1] - pts[p][1]
        bend = math.degrees(math.acos(max(-1.0, min(1.0, (ux * wx + uy * wy) / (math.hypot(wx, wy) or 1)))))
        axis_off = math.degrees(math.acos(min(1.0, abs(ux * major[0] + uy * major[1]))))
        nails.append({"poly": np.round(pp, 1).tolist(), "dir": [round(ux, 4), round(uy, 4)], "finger": fi,
                      "hand_score": round(score, 3), "cost": round(cost, 3), "size": round(size, 1),
                      "aspect": round(aspect, 2), "axis_off": round(axis_off, 1), "bend": round(bend, 1)})
    if not nails:
        rec["status"] = "no_match"
        return rec
    cv2.imwrite(str(Path(out_dir) / "images" / f"{image_id}.jpg"), bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    rec.update({"file": f"{image_id}.jpg", "w": w, "h": h, "nails": nails})
    return rec


def cmd_label(args):
    (OUT / "images").mkdir(parents=True, exist_ok=True)
    labels = OUT / "labels.jsonl"
    done = set()
    if labels.exists():
        done = {json.loads(line)["id"] for line in open(labels)}
    jobs = [(s, i, str(OUT)) for s, i in _photo_queue(args.min_area) if i not in done]
    if args.limit:
        jobs = jobs[: args.limit]
    print(f"{len(jobs)} photos to label ({len(done)} done before)", flush=True)
    t0, n, nails, stats = time.time(), 0, 0, collections.Counter()
    with Pool(args.workers, initializer=_init_worker) as pool, open(labels, "a") as out:
        for rec in pool.imap_unordered(_label_photo, jobs, chunksize=2):
            out.write(json.dumps(rec) + "\n")
            n += 1
            nails += len(rec.get("nails", []))
            stats[rec["status"]] += 1
            if n % 500 == 0:
                out.flush()
                print(f"{n}/{len(jobs)} {n / (time.time() - t0):.1f}/s nails {nails} {dict(stats)}", flush=True)
    print(f"done: {n} photos, {nails} labelled nails {dict(stats)}", flush=True)


# ------------------------------------------------------------------ 3) patch สำหรับเทรน
def keep_label(n: dict) -> str | None:
    """เหตุผลที่ไม่ใช้ป้ายนี้ หรือ None ถ้าใช้ได้"""
    if n["hand_score"] < 0.8:
        return "hand_score"   # MediaPipe ไม่มั่นใจว่าเป็นมือ
    if n["size"] < 16:
        return "small"        # เล็บเล็กเกินจะเห็นรายละเอียด
    if n["bend"] > 60:
        return "bent"         # นิ้วงอมาก ข้อนิ้วที่ได้มักเพี้ยน
    if n["cost"] > 0.5:
        return "match"        # เล็บไม่ได้อยู่บนข้อสุดท้ายของนิ้วนั้นชัดเจน
    if n["aspect"] >= 2.0 and n["axis_off"] > 60:
        return "axis"         # เล็บยาวชัดเจนแต่วางขวางกระดูกนิ้ว = จับคู่ผิด
    return None


def training_patch(bgr: np.ndarray, poly) -> np.ndarray:
    """patch 192x192x4 (RGB + หน้ากากเล็บ) ที่ปรับขนาดให้เล็บกว้าง 26 พิกเซลเท่ากันทุกรูป"""
    poly = np.asarray(poly, np.float64)
    cx, cy, diam = nail_geometry(poly)
    side = PATCH * diam / PATCH_NAIL
    h, w = bgr.shape[:2]
    n = max(int(math.ceil(side)), 1)
    x0, y0 = int(math.floor(cx - side / 2)), int(math.floor(cy - side / 2))
    region = np.zeros((n, n, 3), np.uint8)
    sx0, sy0, sx1, sy1 = max(x0, 0), max(y0, 0), min(x0 + n, w), min(y0 + n, h)
    if sx1 > sx0 and sy1 > sy0:
        region[sy0 - y0 : sy1 - y0, sx0 - x0 : sx1 - x0] = bgr[sy0:sy1, sx0:sx1]
    img = cv2.resize(cv2.cvtColor(region, cv2.COLOR_BGR2RGB), (PATCH, PATCH), interpolation=cv2.INTER_AREA if n > PATCH else cv2.INTER_LINEAR)
    mask = np.zeros((PATCH, PATCH), np.uint8)
    cv2.fillPoly(mask, [np.round((poly - [x0, y0]) * (PATCH / n)).astype(np.int32)], 255)
    return np.concatenate([img, mask[..., None]], axis=2)


def cmd_patches(args):
    X, Y, IDS, reasons = [], [], [], collections.Counter()
    for line in open(OUT / "labels.jsonl"):
        r = json.loads(line)
        img = None
        for n in r.get("nails", []):
            why = keep_label(n)
            if why:
                reasons[why] += 1
                continue
            if img is None:
                img = cv2.imread(str(OUT / "images" / r["file"]))
            X.append(training_patch(img, n["poly"]))
            Y.append(n["dir"])
            IDS.append(r["id"])
    print(f"kept {len(X)} nails from {len(set(IDS))} photos, dropped {dict(reasons)}")
    np.savez_compressed(args.out, x=np.stack(X), y=np.asarray(Y, np.float32), ids=np.asarray(IDS))


def main():
    ap = argparse.ArgumentParser(description="สร้างข้อมูลเทรนโมเดลทิศปลายเล็บจาก Open Images")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("lists")
    p = sub.add_parser("label")
    p.add_argument("--min-area", type=float, default=0.04, help="กรอบมือเล็กสุด (สัดส่วนพื้นที่รูป)")
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--limit", type=int, default=0)
    p = sub.add_parser("patches")
    p.add_argument("--out", default=str(OUT / "patches.npz"))
    a = ap.parse_args()
    {"lists": cmd_lists, "label": cmd_label, "patches": cmd_patches}[a.cmd](a)


if __name__ == "__main__":
    main()
