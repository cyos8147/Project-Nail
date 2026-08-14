# 01 — ติดตั้งและรันโปรเจกต์ในเครื่อง (Local Setup)

## สิ่งที่ต้องมีในเครื่อง

- **Python 3.11+** — สำหรับ backend
- **Node.js 18+** และ npm — สำหรับ frontend
- (ไม่บังคับ) **Docker** — ถ้าอยากรัน backend เป็น container

ตรวจสอบเวอร์ชัน:
```bash
python3 --version   # Windows ใช้ python --version แทน
node -v
npm -v
```

> **สำคัญสำหรับ Windows:** ถ้ารัน `python3` หรือ `python` แล้วเจอข้อความ "Python was not found; run without
> arguments to install from the Microsoft Store..." แปลว่ายังไม่ได้ติดตั้ง Python จริง (เป็นแค่ shortcut
> หลอกของ Windows) ให้ไปโหลดจาก https://www.python.org/downloads/ (เวอร์ชัน 3.11+) แล้ว **ติ๊ก "Add
> python.exe to PATH"** ตอนติดตั้งด้วย ปิด-เปิด terminal ใหม่แล้วลองเช็คเวอร์ชันอีกครั้ง

## ภาพรวมสถาปัตยกรรม

```
┌──────────────┐      HTTPS/JSON      ┌───────────────┐      SQL / Storage API     ┌──────────────┐
│   Frontend   │  ───────────────►    │    Backend    │  ───────────────────────►  │   Supabase   │
│ React + Vite │  ◄───────────────    │    FastAPI     │  ◄───────────────────────  │ (Postgres +  │
│  (Vercel)    │                      │   (Render)     │                             │   Storage)   │
└──────────────┘                      └───────┬───────┘                             └──────────────┘
                                               │
                                    ┌──────────┼───────────┐
                                    ▼                       ▼
                            AI: MediaPipe Hands       LINE Messaging API
                            OpenCV / YOLOv8-Seg        (แจ้งเตือนลูกค้า)
                            XGBoost (แนะนำลาย)
```

Frontend **ไม่เชื่อม Supabase โดยตรง** อีกต่อไป (ต่างจากเวอร์ชัน demo เริ่มต้น) — คำขอทั้งหมดที่ต้อง
เขียน/อ่านฐานข้อมูลจะผ่าน backend (FastAPI) เสมอ ซึ่งเป็นคนเดียวที่ถือ service role key ของ Supabase
ทำให้ควบคุม business logic (เช่น เช็คคิวซ้ำ, สร้างรหัสคิว, ส่ง LINE แจ้งเตือน) ได้ในที่เดียว

## ขั้นตอนที่ 1: ตั้งค่า Backend

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

**Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```
> ถ้า PowerShell ฟ้อง "running scripts is disabled on this system" ตอน activate ให้เปิด PowerShell
> แบบ Admin แล้วรันครั้งเดียว: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**Windows (Command Prompt):**
```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
```

**ค่าเริ่มต้นใน `.env` รันได้ทันทีโดยไม่ต้องแก้อะไร** — `DATABASE_URL` ปล่อยว่างจะ fallback ไปใช้
SQLite ไฟล์เดียวที่ `backend/nailglow.db` (สร้างอัตโนมัติ) เหมาะสำหรับ dev/ทดสอบ ส่วน production
ให้เปลี่ยนไปใช้ Supabase Postgres ตาม `docs/02_DATABASE_SUPABASE.md`

รันเซิร์ฟเวอร์ (คำสั่งเดียวกันทุก OS หลัง activate venv แล้ว):
```bash
uvicorn app.main:app --reload --port 8000
```

ตอนเริ่มครั้งแรก ระบบจะ:
1. สร้างตารางทั้งหมดอัตโนมัติ (ผ่าน SQLAlchemy `Base.metadata.create_all`)
2. Seed ข้อมูลตั้งต้น: หมวดหมู่บริการ (ทำผม/ทำเล็บ), บริการ 9 รายการ, ลายเล็บ 8 ลาย, เวลาทำการ
   เริ่มต้น (หยุดวันอังคาร), และบัญชีแอดมิน 1 บัญชี (`owner` / `changeme123` — เปลี่ยนได้ที่
   `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` ใน `.env` **ก่อน** รันครั้งแรก)

ทดสอบว่ารันติด: เปิด `http://localhost:8000/api/health` ควรเห็น `{"status": "ok", ...}`
เอกสาร API แบบ interactive (Swagger UI) อยู่ที่ `http://localhost:8000/docs`

## ขั้นตอนที่ 2: ตั้งค่า Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` ค่าเริ่มต้น `VITE_API_BASE_URL=http://localhost:8000/api` ชี้ไปที่ backend ในเครื่อง
อยู่แล้ว เปิด `http://localhost:5173`

## ขั้นตอนที่ 3: ทดสอบ flow หลัก

1. หน้าแรก (`/`) — เลื่อนลงไปที่ "จองคิวออนไลน์" เลือกบริการ → วันเวลา (ควรเห็นช่วงเวลาว่างที่ดึง
   จาก backend จริง ไม่ใช่ mock) → กรอกข้อมูลติดต่อ → ยืนยัน จะได้รหัสคิว `NG-YYYYMMDD-XXXX`
2. `/status` — ใส่รหัสคิว + เบอร์โทรที่เพิ่งจอง ควรเห็นสถานะ "รอยืนยัน"
3. `/ai` — ทดลอง AI วิเคราะห์สีผิว, AI แนะนำลาย (XGBoost), Virtual Try-On ทั้งสองโหมด
4. `/admin/login` — ล็อกอินด้วย `owner` / `changeme123` แล้วดู Dashboard, ไปที่ "การจอง" ยืนยันคิว
   ที่เพิ่งจองไว้ แล้วกลับไปหน้า `/status` ดูว่าสถานะเปลี่ยนเป็น "ยืนยันแล้ว" จริง

## ตัวแปรแวดล้อมทั้งหมด (Backend)

ดูคำอธิบายเต็มในคอมเมนต์ของ `backend/.env.example` — สรุปตัวที่สำคัญที่สุด:

| ตัวแปร | ใช้ทำอะไร | จำเป็นตอนไหน |
|---|---|---|
| `DATABASE_URL` | connection string ฐานข้อมูล | ว่าง = SQLite (dev), ใส่ Supabase Postgres URI ตอน production |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | อัปโหลดรูปภาพขึ้น Supabase Storage | ว่าง = เก็บไฟล์ในเครื่อง (`backend/static/uploads/`) แทน |
| `JWT_SECRET` | เซ็น token ล็อกอินแอดมิน | **ต้องเปลี่ยนก่อนขึ้น production เสมอ** |
| `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` | ส่ง/รับข้อความ LINE OA | ว่าง = ข้ามการแจ้งเตือน LINE เงียบๆ (ไม่ error) |
| `YOLO_NAIL_SEG_WEIGHTS` | path โมเดล YOLOv8-Seg ที่เทรนแล้ว | ถ้าไม่มีไฟล์ = ใช้ MediaPipe+OpenCV แทนอัตโนมัติ |

## Troubleshooting

- **`ModuleNotFoundError: mediapipe` หรือ `cv2`**: ตรวจว่า activate venv แล้ว และ `pip install -r requirements.txt` ผ่านครบ (mediapipe/opencv ใช้เวลาติดตั้งนานกว่าปกติ)
- **Frontend เรียก API แล้ว CORS error**: ตรวจว่า backend `.env` มี `CORS_ORIGINS` รวม origin ของ frontend (ค่าเริ่มต้นรองรับ `http://localhost:5173` แล้ว)
- **อยากเริ่มฐานข้อมูล SQLite ใหม่หมด**: ลบไฟล์ `backend/nailglow.db` แล้วรัน uvicorn ใหม่ (seed ข้อมูลตั้งต้นให้อัตโนมัติอีกครั้ง)
- **Windows: "Python was not found; run without arguments to install from the Microsoft Store"**: ยังไม่ได้ติดตั้ง Python จริง ไปโหลดจาก python.org แล้วติ๊ก "Add python.exe to PATH" ตอนติดตั้ง (ดูกล่องหมายเหตุด้านบน)
- **Windows: `source .venv/bin/activate` ใช้ไม่ได้**: คำสั่งนี้เป็นของ macOS/Linux เท่านั้น บน Windows ให้ใช้ `.venv\Scripts\Activate.ps1` (PowerShell) หรือ `.venv\Scripts\activate.bat` (cmd) แทน
- **Windows: `cp` หรือ `python3` ไม่รู้จัก**: Windows ไม่มีคำสั่ง `cp` (ใช้ `copy` แทน) และปกติใช้ `python` ไม่ใช่ `python3` — ดูคำสั่งเวอร์ชัน Windows ในขั้นตอนที่ 1 ด้านบน
