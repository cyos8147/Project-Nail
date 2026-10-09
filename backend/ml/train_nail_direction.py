"""เทรนโมเดลทิศปลายเล็บ แล้วแปลงเป็น ONNX ให้เซิร์ฟเวอร์ใช้ (app/ai/nail_direction.py)

โมเดล: CNN เล็ก (~1.1 ล้านพารามิเตอร์, ไฟล์ ~4MB) รับภาพรอบเล็บ 96x96 (RGB + หน้ากากเล็บ) ตอบเวกเตอร์
ที่ชี้ไปทางปลายนิ้ว เทรนแบบ MSE กับเวกเตอร์ยาว 1 ความยาวของคำตอบจึงเป็นความมั่นใจไปในตัว
(ลังเลระหว่างสองฝั่ง -> คำตอบหักล้างกันจนสั้น frontend จะให้น้ำหนักน้อยลงเอง)

ข้อมูล: ml/datasets/nail_direction/patches.npz จาก python -m ml.nail_direction_data (ดูไฟล์นั้น)
แบ่งตามรูป (เล็บจากรูปเดียวกันอยู่ชุดเดียวกันเสมอ): 80% เทรน, 10% validation (เลือก epoch), 10% test (วัดผลครั้งเดียวตอนจบ)
ระหว่างเทรนสุ่มหมุน 0-360 องศา กลับซ้ายขวา ซูม เลื่อน ปรับสี/ความเบลอ ให้ทนรูปจริงหลายแบบ

วิธีรัน (ต้องลง PyTorch ในเครื่องตัวเอง ไม่ต้องมี GPU -- CPU 4 คอร์ใช้เวลาราว 30-60 นาที):
    pip install torch onnx
    cd backend
    python -m ml.train_nail_direction --epochs 40
ได้ ml/models/nail_direction.onnx (วางทับของเดิม) และ ml/models/nail_direction_metrics.json แล้ว commit ตามปกติ
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
import zlib
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.ai.nail_direction import INPUT, crop_for_model  # noqa: E402

PATCH = 192
PATCH_NAIL = 26.0


def _block(cin, cout, stride):
    return nn.Sequential(
        nn.Conv2d(cin, cout, 3, stride, 1, bias=False), nn.BatchNorm2d(cout), nn.ReLU(inplace=True),
        nn.Conv2d(cout, cout, 3, 1, 1, bias=False), nn.BatchNorm2d(cout), nn.ReLU(inplace=True))


class DirNet(nn.Module):
    def __init__(self, width: float = 1.0):
        super().__init__()
        c = [int(round(v * width)) for v in (32, 48, 64, 96, 128)]
        self.features = nn.Sequential(
            nn.Conv2d(4, c[0], 3, 2, 1, bias=False), nn.BatchNorm2d(c[0]), nn.ReLU(inplace=True),  # 48x48
            _block(c[0], c[1], 2), _block(c[1], c[2], 2), _block(c[2], c[3], 2), _block(c[3], c[4], 1))  # 6x6
        # flatten (ไม่ใช่ average pool): ตำแหน่งของนิ้วเทียบกับกลางภาพคือข้อมูลสำคัญของทิศ
        self.head = nn.Sequential(nn.Flatten(), nn.Dropout(0.3), nn.Linear(c[4] * 36, 128), nn.ReLU(inplace=True), nn.Linear(128, 2))

    def forward(self, x):
        return self.head(self.features(x))


def augment(patch: np.ndarray, vec, rng) -> tuple[np.ndarray, np.ndarray]:
    """สุ่มหมุน/กลับด้าน/ซูม/เลื่อน/สี จาก patch ที่เก็บไว้ -> (4, 96, 96) float32 และป้ายที่หมุนตาม"""
    th = rng.uniform(0, 2 * math.pi)
    ctx = rng.uniform(2.8, 5.5)  # ด้านภาพ = 2.8-5.5 เท่าของเล็บ (ตอนใช้งานจริง = 4)
    z = INPUT / (ctx * PATCH_NAIL)
    cs, sn = math.cos(th), math.sin(th)
    shift = rng.normal(0, 0.10 * PATCH_NAIL, 2)
    c0 = np.array([PATCH / 2 + shift[0], PATCH / 2 + shift[1]])
    A = z * np.array([[cs, -sn], [sn, cs]])
    t = np.array([INPUT / 2, INPUT / 2]) - A @ c0
    M = np.hstack([A, t[:, None]]).astype(np.float32)
    img = cv2.warpAffine(patch[..., :3], M, (INPUT, INPUT), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    m = cv2.warpAffine(patch[..., 3], M, (INPUT, INPUT), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    v = np.array([cs * vec[0] - sn * vec[1], sn * vec[0] + cs * vec[1]], np.float32)
    if rng.random() < 0.5:
        img, m, v = img[:, ::-1], m[:, ::-1], v * np.array([-1, 1], np.float32)
    img = img.astype(np.float32) / 255.0
    if rng.random() < 0.8:
        img = img * rng.uniform(0.6, 1.4) + rng.uniform(-0.12, 0.12)
        mean = img.mean()
        img = (img - mean) * rng.uniform(0.7, 1.3) + mean
        img = img * rng.uniform(0.85, 1.15, 3)[None, None, :]
    if rng.random() < 0.1:
        img = np.repeat(img.mean(2, keepdims=True), 3, axis=2)
    if rng.random() < 0.3:
        img = cv2.GaussianBlur(img, (0, 0), rng.uniform(0.4, 1.4))
    if rng.random() < 0.3:
        img = img + rng.normal(0, rng.uniform(0.005, 0.03), img.shape)
    m = m.astype(np.float32) / 255.0
    if rng.random() < 0.3:
        m = (cv2.dilate if rng.random() < 0.5 else cv2.erode)(m, np.ones((3, 3), np.uint8))
    x = np.concatenate([np.clip(img, 0, 1), m[..., None]], axis=2).transpose(2, 0, 1)
    return np.ascontiguousarray(x, np.float32), v


def predict(model, X: np.ndarray, tta: bool = True) -> np.ndarray:
    """(N,4,96,96) -> (N,2) เฉลี่ยจากการหมุน 4 ทิศ x กลับซ้ายขวา (แบบเดียวกับฝั่งเซิร์ฟเวอร์)"""
    model.eval()
    X = torch.from_numpy(np.ascontiguousarray(X))
    variants = [(k, f) for k in range(4) for f in (False, True)] if tta else [(0, False)]
    acc = torch.zeros(len(X), 2)
    with torch.no_grad():
        for k, f in variants:
            xi = torch.rot90(X, k, dims=(2, 3))
            if f:
                xi = torch.flip(xi, dims=(3,))
            o = model(xi)
            if f:
                o = o * torch.tensor([-1.0, 1.0])
            for _ in range(k):
                o = torch.stack([-o[:, 1], o[:, 0]], dim=1)
            acc += o
    return (acc / len(variants)).numpy()


class Patches(torch.utils.data.Dataset):
    """เล็บชุดเทรน สุ่ม augment ใหม่ทุก epoch (ตั้ง .epoch ก่อนวนแต่ละรอบ)"""

    def __init__(self, x, y, idx):
        self.x, self.y, self.idx, self.epoch = x, y, idx, 0

    def __len__(self):
        return len(self.idx)

    def __getitem__(self, j):
        i = self.idx[j]
        xi, vi = augment(self.x[i], self.y[i], np.random.default_rng((1, self.epoch, int(i))))
        return torch.from_numpy(xi), torch.from_numpy(vi)


def angle_errors(pred: np.ndarray, gt: np.ndarray) -> np.ndarray:
    p = pred / (np.linalg.norm(pred, axis=1, keepdims=True) + 1e-9)
    return np.degrees(np.abs(np.arctan2(p[:, 0] * gt[:, 1] - p[:, 1] * gt[:, 0], (p * gt).sum(1))))


def report(name: str, pred: np.ndarray, gt: np.ndarray) -> dict:
    e = angle_errors(pred, gt)
    r = {"set": name, "nails": int(len(e)), "median_error_deg": round(float(np.median(e)), 1),
         "within_20deg": round(float((e < 20).mean()), 3), "wrong_end": int((e > 90).sum()),
         "wrong_end_rate": round(float((e > 90).mean()), 4)}
    print(json.dumps(r, ensure_ascii=False), flush=True)
    return r


def load_corpus(path: str):
    """ชุดทดสอบที่ติดป้ายด้วยมือ (รูปแบบ cases.json: [{file, polys:[[[x,y],...]], gt:[[dx,dy],...]}])"""
    cases = json.load(open(os.path.join(path, "cases.json")))
    X, G = [], []
    for cs in cases:
        rgb = cv2.cvtColor(cv2.imread(os.path.join(path, cs["file"])), cv2.COLOR_BGR2RGB)
        for poly, g in zip(cs["polys"], cs["gt"]):
            X.append(crop_for_model(rgb, np.asarray(poly, np.float64)))
            G.append(g)
    return np.stack(X).astype(np.float32), np.asarray(G, np.float32)


def main():
    ap = argparse.ArgumentParser(description="เทรนโมเดลทิศปลายเล็บ + แปลงเป็น ONNX")
    ap.add_argument("--patches", nargs="+", default=[str(ROOT / "ml/datasets/nail_direction/patches.npz")])
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--width", type=float, default=1.0)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--lr", type=float, default=2e-3)
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--corpus", nargs="*", default=[], help="ชุดที่ติดป้ายด้วยมือเพิ่มเติม (ใช้วัดผลอย่างเดียว)")
    ap.add_argument("--run-dir", default=str(ROOT / "ml/runs/nail_direction"))
    ap.add_argument("--onnx", default=str(ROOT / "ml/models/nail_direction.onnx"))
    a = ap.parse_args()

    torch.set_num_threads(a.threads)
    torch.manual_seed(0)
    run = Path(a.run_dir)
    run.mkdir(parents=True, exist_ok=True)

    parts = [np.load(p) for p in a.patches]
    x = np.concatenate([d["x"] for d in parts])
    y = np.concatenate([d["y"] for d in parts]).astype(np.float32)
    ids = np.concatenate([d["ids"] for d in parts])
    bucket = np.array([zlib.crc32(str(i).encode()) % 10 for i in ids])
    tr, va, te = np.where(bucket >= 2)[0], np.where(bucket == 0)[0], np.where(bucket == 1)[0]
    print(f"nails: train {len(tr)}, validation {len(va)}, test {len(te)} (from {len(set(ids))} photos)", flush=True)

    def fixed(idx, seed):  # ชุด val/test: augment แบบตายตัว (สุ่มมุมไว้ครั้งเดียว) ให้เทียบแต่ละ epoch ได้
        pairs = [augment(x[i], y[i], np.random.default_rng((seed, int(i)))) for i in idx]
        return np.stack([p[0] for p in pairs]), np.stack([p[1] for p in pairs])

    val_x, val_y = fixed(va, 7)
    test_x, test_y = fixed(te, 9)

    ds = Patches(x, y, tr)
    dl = torch.utils.data.DataLoader(ds, batch_size=a.batch, shuffle=True, num_workers=a.workers, drop_last=True)
    model = DirNet(a.width)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=a.lr, total_steps=a.epochs * len(dl), pct_start=0.15)
    best = (float("inf"), -1)
    history = []
    for ep in range(a.epochs):
        ds.epoch = ep
        model.train()
        t0, tot, n = time.time(), 0.0, 0
        for xb, yb in dl:
            loss = F.mse_loss(model(xb), yb)
            opt.zero_grad()
            loss.backward()
            opt.step()
            sched.step()
            tot += loss.item() * len(xb)
            n += len(xb)
        e = angle_errors(predict(model, val_x, tta=False), val_y)
        score = (e > 90).mean() * 100 + np.median(e) / 10  # ผิดด้านสำคัญที่สุด รองลงมาคือความคลาดของมุม
        history.append({"epoch": ep + 1, "loss": round(tot / n, 4), "val_median": round(float(np.median(e)), 2),
                        "val_wrong_end": round(float((e > 90).mean()), 4)})
        print(f"epoch {ep + 1}/{a.epochs} loss {tot / n:.4f} val median {np.median(e):.1f} wrong-end {(e > 90).mean() * 100:.1f}% ({time.time() - t0:.0f}s)", flush=True)
        if score < best[0]:
            best = (score, ep + 1)
            torch.save(model.state_dict(), run / "best.pt")
    model.load_state_dict(torch.load(run / "best.pt"))
    print(f"best epoch {best[1]}", flush=True)

    results = [report("validation (Open Images)", predict(model, val_x), val_y),
               report("test (Open Images, not used for training or model choice)", predict(model, test_x), test_y)]
    for c in a.corpus:
        cx, cg = load_corpus(c)
        results.append(report(f"hand-labelled: {os.path.basename(c.rstrip('/'))}", predict(model, cx), cg))

    # ---- ONNX (batch ยืดได้: เซิร์ฟเวอร์ส่งเล็บทุกชิ้น x 8 แบบหมุน มาในครั้งเดียว)
    model.eval()
    torch.onnx.export(model, torch.zeros(1, 4, INPUT, INPUT), a.onnx, input_names=["crops"], output_names=["direction"],
                      dynamic_axes={"crops": {0: "n"}, "direction": {0: "n"}}, opset_version=17, dynamo=False)
    import onnxruntime as ort

    sess = ort.InferenceSession(a.onnx, providers=["CPUExecutionProvider"])
    probe = test_x[:64] if len(test_x) else val_x[:64]
    with torch.no_grad():
        ref = model(torch.from_numpy(probe)).numpy()
    diff = float(np.abs(sess.run(None, {"crops": probe})[0] - ref).max())
    print(f"ONNX saved to {a.onnx} (max difference vs PyTorch {diff:.2e})", flush=True)
    assert diff < 1e-3

    metrics = {"model": "nail_direction.onnx", "input": "4x96x96 (RGB 0-1 + nail mask), crop side = 4 x nail diameter",
               "output": "2-vector toward the fingertip (image coords, y down); length = confidence",
               "training_data": "Open Images (CC BY 2.0) hand photos, labels from MediaPipe Hands on the whole photo",
               "nails": {"train": int(len(tr)), "validation": int(len(va)), "test": int(len(te))},
               "photos": int(len(set(ids))), "best_epoch": best[1], "epochs": a.epochs, "results": results, "history": history}
    out = Path(a.onnx).with_name("nail_direction_metrics.json")
    out.write_text(json.dumps(metrics, ensure_ascii=False, indent=1))
    print(f"metrics: {out}", flush=True)


if __name__ == "__main__":
    main()
