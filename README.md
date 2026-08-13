# NailGlow — ระบบจองคิวร้านเสริมสวยและวิเคราะห์สีเล็บอัจฉริยะ

**Beauty Booking & Intelligent Nail Color Analysis System**

เว็บแอปพลิเคชันสำหรับร้านเสริมสวย/ร้านทำเล็บ ให้ลูกค้าจองคิวออนไลน์โดยไม่ต้องสมัครสมาชิก
พร้อมระบบ AI ทดลองสีและลวดลายเล็บแบบเสมือนจริงบนภาพมือของตนเอง, AI แนะนำลายเล็บด้วย
Machine Learning, แจ้งเตือนผ่าน LINE Official Account อัตโนมัติ และแผงควบคุมสำหรับเจ้าของร้าน
(จัดการคิว ลูกค้า บริการ ลายเล็บ รีวิว และ Dashboard การเงิน)

โครงงานนี้พัฒนาโดยอ้างอิงเครื่องมือ/เทคโนโลยีตามที่ระบุไว้ในเอกสารข้อเสนอโครงงาน (Frontend:
React + Tailwind, Backend: Python + FastAPI, Database/Storage: Supabase (PostgreSQL),
Computer Vision: YOLOv8-Seg + MediaPipe Hands + OpenCV, Machine Learning: XGBoost, Notification:
LINE Official Account / Messaging API)

## โครงสร้างโปรเจกต์

```
Project-Nail/
├── frontend/     React + Vite + Tailwind CSS — เว็บฝั่งลูกค้า + แผงควบคุมเจ้าของร้าน
├── backend/      FastAPI (Python) — REST API, AI pipeline, LINE integration
│   ├── app/          โค้ดเซิร์ฟเวอร์หลัก (routers, models, ai/, services/)
│   ├── ml/            สคริปต์เทรนโมเดล + ชุดข้อมูล + โมเดลที่เทรนแล้ว
│   └── schema.sql      สคีมาฐานข้อมูลสำหรับรันบน Supabase (Postgres)
├── docs/         คู่มือการติดตั้ง/เชื่อมต่อ/เทรน AI/deploy แบบละเอียด (อ่านต่อด้านล่าง)
└── postman/      Postman collection สำหรับทดสอบ API
```

## เริ่มต้นใช้งานอย่างเร็ว (Local Development)

**Backend:**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # ไม่ต้องแก้อะไรก็รันได้ทันที (ใช้ SQLite ในเครื่อง)
uvicorn app.main:app --reload --port 8000
```

**Frontend** (เปิดเทอร์มินัลใหม่):
```bash
cd frontend
npm install
cp .env.example .env.local  # ค่า default ชี้ไปที่ backend localhost:8000 อยู่แล้ว
npm run dev
```

เปิด `http://localhost:5173` — หน้าเว็บจะเชื่อมกับ backend ที่ `http://localhost:8000/api` ทันที
(บริการ/ลายเล็บ/บัญชีแอดมินเริ่มต้นถูกสร้างให้อัตโนมัติตอนรัน backend ครั้งแรก — ดูรายละเอียดใน
`docs/01_SETUP.md`)

บัญชีแอดมินเริ่มต้น: **owner / changeme123** (เปลี่ยนได้ที่ `backend/.env`) — เข้าที่ `/admin/login`

## เอกสารประกอบ (อ่านตามลำดับ)

| เอกสาร | เนื้อหา |
|---|---|
| [`docs/01_SETUP.md`](docs/01_SETUP.md) | ติดตั้งและรันโปรเจกต์ทั้งระบบในเครื่อง ตัวแปรแวดล้อมทั้งหมด |
| [`docs/02_DATABASE_SUPABASE.md`](docs/02_DATABASE_SUPABASE.md) | สร้างโปรเจกต์ Supabase จริง รัน schema.sql ตั้งค่า Storage buckets |
| [`docs/03_API.md`](docs/03_API.md) | รายการ REST API ทั้งหมด พร้อมตัวอย่าง request/response |
| [`docs/04_AI_TRAINING.md`](docs/04_AI_TRAINING.md) | ขั้นตอนเทรน/อัปเกรดโมเดล YOLOv8-Seg และ XGBoost แบบละเอียด |
| [`docs/05_LINE_INTEGRATION.md`](docs/05_LINE_INTEGRATION.md) | สร้าง LINE Official Account เชื่อม Messaging API + webhook |
| [`docs/06_DEPLOYMENT.md`](docs/06_DEPLOYMENT.md) | Deploy frontend ขึ้น Vercel และ backend ขึ้น Render |

## สรุปฟีเจอร์

**ฝั่งลูกค้า** — จองคิวแบบ wizard (ไม่ต้องสมัครสมาชิก), ตรวจสอบสถานะคิวด้วยรหัสคิว+เบอร์โทร,
ดูประวัติการจอง/รีวิว/ผลลัพธ์ AI ย้อนหลังด้วยเบอร์โทร, AI วิเคราะห์สีผิว + แนะนำลายเล็บ (ทั้งแบบ
heuristic บนเบราว์เซอร์ และแบบโมเดล XGBoost จากเซิร์ฟเวอร์), Virtual Nail Try-On สองโหมด (บน
เบราว์เซอร์ทันที ด้วย MediaPipe Hands, และแบบเซิร์ฟเวอร์ที่บันทึกประวัติได้), AI วิเคราะห์ลายจากรูป
อ้างอิง + ประเมินเวลาทำ, ระบบรีวิวให้คะแนน 1–5 ดาว, แจ้งเตือนผ่าน LINE OA อัตโนมัติ

**ฝั่งเจ้าของร้าน** (`/admin`) — Dashboard การเงิน (รายได้/ค่าใช้จ่าย/กำไรสุทธิ/กราฟย้อนหลัง/บริการ
ยอดนิยม), จัดการการจอง (ยืนยัน/เลื่อน/ยกเลิก/หมายเหตุ), ค้นหาลูกค้า+ดูประวัติทั้งหมด, จัดการบริการ+
ราคา+ระยะเวลา, จัดการแคตตาล็อกลายเล็บ, ดูรีวิวทั้งหมด, ตั้งค่าเวลาทำการ+วันหยุด

## หมายเหตุสำหรับผู้ตรวจ/ผู้พัฒนาต่อ

โปรเจกต์นี้รันและทดสอบแล้วในเครื่อง dev (backend เทรนโมเดล XGBoost จริงและมี metrics ให้ดูใน
`backend/ml/models/nail_recommender_metrics.json`, frontend build ผ่านและตรวจสอบด้วย headless
browser แล้วว่าหน้าเว็บ/booking flow/AI Studio/Admin Dashboard เชื่อมกับ backend และแสดงข้อมูล
จริงได้ถูกต้อง) สิ่งที่ยังต้องทำเพิ่มก่อนขึ้นใช้งานจริงกับลูกค้าจริง (ไม่มีเครื่องมือ/บัญชีที่ต้องใช้
ยืนยันตัวตนจริงในสภาพแวดล้อมที่พัฒนาโครงงานนี้):
1. สร้างบัญชี Supabase จริงและรัน `backend/schema.sql`
2. สร้าง LINE Official Account + Messaging API channel จริง
3. (ถ้าต้องการความแม่นยำสูงขึ้น) เก็บชุดข้อมูลภาพมือจริงมาเทรน YOLOv8-Seg ตาม `docs/04_AI_TRAINING.md`
4. Deploy ตาม `docs/06_DEPLOYMENT.md`

ทั้งหมดนี้มีขั้นตอนละเอียดในโฟลเดอร์ `docs/` แล้ว
