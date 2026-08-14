# 04 — เทรนและอัปเกรดโมเดล AI

ระบบมีโมเดล/เทคนิค AI สามส่วนตามที่ระบุในเอกสารข้อเสนอโครงงาน:

1. **Nail Segmentation** (YOLOv8-Seg / MediaPipe Hands + OpenCV) — หาตำแหน่งเล็บในภาพ
2. **XGBoost Recommender** — แนะนำสี/ลวดลายเล็บจากคุณสมบัติผู้ใช้ 5 อย่าง
3. **Style classification** (heuristic บนความอิ่มตัวสี/variance) — จัดสไตล์ลายจากรูปอ้างอิง

ทั้งหมดใช้งานได้ทันทีตั้งแต่ clone โปรเจกต์มา (ไม่ต้องเทรนก่อน) เอกสารนี้อธิบายว่าทำงานอย่างไร และ
จะอัปเกรดให้แม่นยำขึ้นด้วยข้อมูลจริงได้อย่างไร

---

## 1) Nail Segmentation

### วิธีทำงานปัจจุบัน (ค่าเริ่มต้น, ใช้ได้ทันที ไม่ต้องเทรน)

`backend/app/ai/segmentation.py` ใช้ 2 ขั้นตอน:

1. **MediaPipe Hands** (โมเดล pretrained ของ Google) หา 21 hand landmarks จากภาพมือ
2. จากตำแหน่งข้อนิ้วสุดท้าย→ปลายนิ้ว ประมาณกรอบเล็บเบื้องต้นจากสัดส่วนกายวิภาค แล้วปรับให้แนบขอบ
   เล็บจริงด้วย **region-growing** (ไล่สีจากจุดกึ่งกลางเล็บ เทียบสีแบบ chroma-aware เพื่อทนแสง
   สะท้อน/เงา) — เทคนิคเดียวกับที่ frontend เคยใช้ฝั่งเบราว์เซอร์ (`frontend/src/utils/nailSegmentation.js`)
   ย้ายมาทำฝั่งเซิร์ฟเวอร์แทน (Python/OpenCV) เพื่อบันทึกผลลัพธ์ลงฐานข้อมูลได้

วิธีนี้ **ไม่ต้องมีชุดข้อมูล label ไว้ก่อน** ใช้งานได้จริงตั้งแต่วันแรก แต่ความแม่นยำจะขึ้นกับคุณภาพ
แสง/มุมถ่ายภาพ

### อัปเกรดเป็น YOLOv8-Seg (แม่นยำกว่า, ต้องเทรนด้วยข้อมูล)

ตามที่ระบุในเอกสารโครงงาน (ตัวชี้วัด: IoU, Precision, Recall, mAP) ให้ทำตามนี้:

**ขั้นตอนที่ 1 — เตรียมชุดข้อมูล**
- เก็บภาพมือจริงอย่างน้อย ~500–1000 ภาพ (มือหลายแบบ พื้นหลังต่างกัน มีเล็บทาสี/ไม่ทาสี) หรือเริ่ม
  จากชุดข้อมูลสาธารณะบน [Roboflow Universe](https://universe.roboflow.com) (ค้นหา "nail segmentation")
- Label ขอบเขตเล็บแต่ละนิ้วด้วย polygon โดยใช้ Roboflow / CVAT / Label Studio
- Export เป็นฟอร์แมต **YOLOv8 (segmentation)** → จะได้โฟลเดอร์ที่มี `data.yaml` + `images/` +
  `labels/` แบ่งเป็น **train/valid/test สัดส่วน 70/20/10** (ตามที่ระบุในเอกสารโครงงาน)
- วางไว้ที่ `backend/ml/datasets/nail_seg/` (ให้ `data.yaml` อยู่ตรงนั้น)

**ขั้นตอนที่ 2 — ติดตั้งและเทรน**
```bash
cd backend
source .venv/bin/activate
pip install ultralytics        # แยกจาก requirements.txt หลัก เพราะหนัก (มี torch)
python -m ml.train_yolo_seg --data ml/datasets/nail_seg/data.yaml --epochs 100
```
สคริปต์จะพิมพ์ผลประเมิน (mAP50-95, mAP50, Precision, Recall) ให้ตอนจบ

**ขั้นตอนที่ 3 — ใช้งานโมเดลที่เทรนแล้ว**
```bash
cp runs/segment/train/weights/best.pt backend/ml/models/yolov8_nail_seg.pt
```
รี-สตาร์ท backend — `app/ai/segmentation.py` จะตรวจพบไฟล์นี้อัตโนมัติ (เช็คจาก
`YOLO_NAIL_SEG_WEIGHTS` ใน `.env`) และสลับไปใช้ YOLOv8-Seg แทน MediaPipe+OpenCV ทันที โดยไม่ต้อง
แก้โค้ดใดๆ (ดู endpoint response field `"engine"` จะเปลี่ยนจาก `"mediapipe+opencv"` เป็น
`"yolov8-seg"`)

---

## 2) XGBoost Recommender

`backend/ml/train_xgboost_recommender.py` เทรนโมเดล multiclass classification:

- **Feature (categorical):** สีผิว (`skin_tone`), รูปทรงเล็บ (`nail_shape`), ความยาวเล็บ
  (`nail_length`), สไตล์ที่ต้องการ (`style_preference`), ประเภทของโอกาส (`occasion`)
- **Label:** ลวดลายเล็บที่แนะนำ (1 คลาสต่อ 1 ลายในแคตตาล็อก)
- **ตัวชี้วัด:** Accuracy, Precision (macro), Recall (macro), F1-score (macro) — ตามที่ระบุใน
  เอกสารโครงงาน

### ชุดข้อมูลที่ใช้เทรนตอนนี้ (synthetic, cold start)

ระบบยังไม่มีผู้ใช้งานจริงมาก่อน จึงไม่มีประวัติ "ลูกค้าแบบไหนเลือกลายไหน" ให้เทรนตั้งแต่ต้น
`backend/ml/generate_recommendation_dataset.py` จึงสร้างชุดข้อมูลสังเคราะห์ (6,000 แถว) จากกฎที่
อิงหลักการจริงของช่างทำเล็บ (โทนผิว/สไตล์/โอกาส ควรแมทช์กับคุณสมบัติของลายแบบไหน — ดูสูตร
`score_design()` ในไฟล์นั้น) ผสม label noise 10% เพื่อจำลองความหลากหลายของรสนิยมจริง

**ผลการเทรนล่าสุด** (`backend/ml/models/nail_recommender_metrics.json`, commit ไว้ในโปรเจกต์แล้ว):

| ตัวชี้วัด | ค่า |
|---|---|
| Accuracy | 92.7% |
| Precision (macro) | 81.3% |
| Recall (macro) | 81.1% |
| F1-score (macro) | 81.2% |
| ขนาดชุดข้อมูล | 6,000 แถว (train 4,800 / test 1,200) |

### เทรนใหม่ / ปรับปรุงด้วยข้อมูลจริง

เมื่อระบบใช้งานจริงแล้ว ตาราง `ai_recommend_log` ในฐานข้อมูล (คอลัมน์ `accepted` = ลูกค้ากด
"จองลายนี้" ตามคำแนะนำหรือไม่) จะกลายเป็น**ข้อมูลพฤติกรรมจริง** ที่ควรผสมเข้ากับชุดข้อมูลสังเคราะห์
แทนการใช้ synthetic data ล้วนๆ ต่อไปเรื่อยๆ:

```bash
cd backend
source .venv/bin/activate

# (ทางเลือก) ปรับ n_rows ในสคริปต์ หรือแก้ให้ query ai_recommend_log จากฐานข้อมูลจริงมาผสม
python -m ml.generate_recommendation_dataset
python -m ml.train_xgboost_recommender
```

โมเดล+ตัวแปลง category ใหม่จะถูกเขียนทับที่ `backend/ml/models/` โดยอัตโนมัติ รี-สตาร์ท backend
เพื่อโหลดโมเดลใหม่ (endpoint `/api/ai/recommend` จะคืนค่า `model_metrics` ล่าสุดมาแสดงในหน้าเว็บด้วย)

---

## 3) Style Classification (จากรูปอ้างอิง)

`app/ai/segmentation` ไม่ได้ทำส่วนนี้ — endpoint `/api/ai/analyze-style` ใน `app/routers/ai.py`
ใช้ heuristic ง่ายๆ (วัดความอิ่มตัวของสีเฉลี่ยและ variance ของความสว่างในภาพ จัดกลุ่มเป็น
Minimal/Classic/Bold) เหมาะสำหรับ demo และใช้งานได้จริงระดับหนึ่ง ถ้าต้องการแม่นยำขึ้นสามารถแทนที่
ด้วยโมเดล image classification (เช่น fine-tune ResNet/EfficientNet บนภาพลายเล็บที่ label สไตล์ไว้)
ในจุดเดียวกันนี้โดยไม่กระทบส่วนอื่นของระบบ

---

## เครื่องมือที่ใช้ระหว่างพัฒนา/เทรน

- **Postman** — ทดสอบ API แต่ละ endpoint (`postman/NailGlow.postman_collection.json`)
- **Visual Studio Code** — พัฒนาโค้ด
- **Git/GitHub** — จัดการซอร์สโค้ด
- **Roboflow / CVAT / Label Studio** — label ชุดข้อมูล segmentation (ถ้าจะเทรน YOLOv8-Seg)
