# 06 — Deploy ขึ้นใช้งานจริง (Vercel + Render)

ตามเอกสารข้อเสนอโครงงาน: **Vercel** สำหรับ Frontend, **Render** สำหรับ Backend

ทำตามลำดับ: Supabase (docs/02) → Backend บน Render → Frontend บน Vercel → LINE webhook (docs/05)

## ขั้นตอนที่ 1: Push โค้ดขึ้น GitHub

```bash
git add -A
git commit -m "..."
git push origin <branch>
```

## ขั้นตอนที่ 2: Deploy Backend บน Render

1. ไปที่ https://render.com → **New** → **Web Service** → เชื่อม GitHub repo นี้
2. ตั้งค่า:
   - **Root Directory:** `backend`
   - **Environment:** Docker (Render จะใช้ `backend/Dockerfile` ที่มีอยู่แล้วอัตโนมัติ)
   - หรือถ้าไม่ใช้ Docker: **Build Command** `pip install -r requirements.txt`,
     **Start Command** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. ไปที่แท็บ **Environment** เพิ่มตัวแปรทั้งหมดจาก `backend/.env.example` พร้อมค่าจริง โดยเฉพาะ:
   - `DATABASE_URL` = Supabase connection string (docs/02)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` = สุ่มค่าใหม่ที่ยาวและคาดเดายาก (**ห้ามใช้ค่า default**)
   - `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` = ตั้งรหัสผ่านแอดมินจริงจัง
   - `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
   - `CORS_ORIGINS` = URL ของ frontend บน Vercel (เช่น `https://nailglow.vercel.app`) — ตั้งหลังจาก
     deploy frontend เสร็จแล้วในขั้นตอนที่ 3
4. กด **Create Web Service** — รอ build เสร็จ จะได้ URL เช่น `https://nailglow-api.onrender.com`
5. ทดสอบ: เปิด `https://nailglow-api.onrender.com/api/health`

> หมายเหตุ: mediapipe/opencv/xgboost ทำให้ image ใหญ่และ build ใช้เวลานานกว่าปกติ (5-10 นาที)
> เป็นเรื่องปกติ ไม่ใช่ error

## ขั้นตอนที่ 3: Deploy Frontend บน Vercel

1. ไปที่ https://vercel.com → **New Project** → เชื่อม GitHub repo นี้
2. ตั้งค่า:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (Vercel ตรวจจับอัตโนมัติ)
   - **Build Command:** `npm run build` (ค่า default)
   - **Output Directory:** `dist` (ค่า default)
3. **Environment Variables:** เพิ่ม `VITE_API_BASE_URL` = URL ของ backend บน Render + `/api`
   (เช่น `https://nailglow-api.onrender.com/api`)
4. กด **Deploy** — จะได้ URL เช่น `https://nailglow.vercel.app`

## ขั้นตอนที่ 4: อัปเดต CORS ฝั่ง backend

กลับไปที่ Render → แก้ env var `CORS_ORIGINS` ให้รวม URL ของ Vercel ที่ได้จริง เช่น:
```
CORS_ORIGINS=https://nailglow.vercel.app
```
บันทึก → Render จะ redeploy อัตโนมัติ

## ขั้นตอนที่ 5: ตั้งค่า LINE Webhook ให้ชี้มาที่ Render

ทำตาม `docs/05_LINE_INTEGRATION.md` ขั้นตอนที่ 4 แต่ใช้ URL จริงของ Render แทน ngrok:
```
https://nailglow-api.onrender.com/api/line/webhook
```

## Checklist ก่อนเปิดใช้งานจริง

- [ ] เปลี่ยน `JWT_SECRET` และรหัสผ่านแอดมินเริ่มต้นแล้ว
- [ ] `DATABASE_URL` ชี้ไป Supabase Postgres จริง (ไม่ใช่ SQLite)
- [ ] Storage buckets สร้างครบ 3 อัน และเป็น public bucket
- [ ] `CORS_ORIGINS` ตรงกับโดเมน frontend จริง
- [ ] LINE webhook verify ผ่าน และปิด auto-reply/greeting message ของ LINE เองแล้ว
- [ ] ทดสอบจองคิว 1 รอบเต็ม (จอง → แอดมินยืนยัน → ลูกค้าได้รับ LINE แจ้งเตือน → รีวิวหลังเสร็จงาน)
- [ ] (ถ้าต้องการ) เทรน YOLOv8-Seg ด้วยข้อมูลจริงแล้วอัปโหลดโมเดลไปพร้อม deploy (ดู docs/04)

## Custom Domain (ถ้ามี)

Vercel: Project Settings → Domains → เพิ่มโดเมนของร้าน แล้วตั้ง DNS ตามที่ Vercel แนะนำ
อย่าลืมอัปเดต `CORS_ORIGINS` ฝั่ง backend และ Webhook URL ฝั่ง LINE ให้ตรงกับโดเมนใหม่ด้วย
