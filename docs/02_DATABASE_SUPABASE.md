# 02 — เชื่อมต่อฐานข้อมูลจริงกับ Supabase (PostgreSQL + Storage)

ตาม PDF ข้อเสนอโครงงาน (หัวข้อ 1.3) ระบบใช้ **Supabase (PostgreSQL)** เป็นฐานข้อมูลหลัก และ
**Supabase Storage** เก็บรูปภาพ ขั้นตอนนี้อธิบายวิธีสร้างโปรเจกต์ Supabase จริงและเชื่อมเข้ากับ backend

## ขั้นตอนที่ 1: สร้างโปรเจกต์ Supabase

1. ไปที่ https://supabase.com → สมัคร/ล็อกอิน → **New Project**
2. ตั้งชื่อโปรเจกต์ (เช่น `nailglow-booking`), ตั้งรหัสผ่านฐานข้อมูล (**จดไว้ให้ดี** จะใช้ในขั้นตอนถัดไป),
   เลือก Region ที่ใกล้ผู้ใช้งานที่สุด (เช่น Singapore สำหรับผู้ใช้ในไทย)
3. รอสักครู่จนโปรเจกต์สร้างเสร็จ (สถานะขึ้น "Active")

## ขั้นตอนที่ 2: รัน schema.sql

1. ในเมนูซ้ายของ Supabase Dashboard เลือก **SQL Editor** → **New query**
2. เปิดไฟล์ `backend/schema.sql` ในโปรเจกต์นี้ คัดลอกทั้งหมด แล้ววางในช่อง query
3. กด **Run** — จะได้ตารางทั้งหมด (`customers`, `bookings`, `services`, `nail_designs`,
   `reviews`, `ai_tryon_history`, `ai_recommend_log`, `expenses`, ฯลฯ) พร้อม Row Level Security
   policies สำหรับตารางที่อนุญาตให้อ่านสาธารณะได้ (บริการ, ลายเล็บ, รีวิว, เวลาทำการ)

> หมายเหตุ: schema.sql ใช้ `create table if not exists` จึงรันซ้ำได้โดยไม่ error ถ้าต้องแก้ไข/รันใหม่

## ขั้นตอนที่ 3: สร้าง Storage buckets

ไปที่เมนู **Storage** → **New bucket** สร้าง 3 buckets ต่อไปนี้ (ตั้งเป็น **Public bucket** ทั้งหมด
เพื่อให้ได้ URL รูปที่ใช้แสดงบนเว็บได้ทันทีโดยไม่ต้องเซ็น URL):

| ชื่อ bucket | ใช้เก็บอะไร |
|---|---|
| `booking-references` | รูปลายเล็บ/สีผมตัวอย่างที่ลูกค้าแนบตอนจองคิว |
| `tryon-results` | รูปต้นฉบับ + ผลลัพธ์จาก Virtual Try-On (เซิร์ฟเวอร์) |
| `review-photos` | รูปผลงานที่ลูกค้าแนบตอนรีวิว |

ชื่อ bucket ต้องตรงกับค่าเริ่มต้นใน `backend/app/config.py`
(`supabase_bucket_booking_refs`, `supabase_bucket_tryon`, `supabase_bucket_reviews`) ถ้าตั้งชื่ออื่น
ให้เพิ่ม env var override ตามชื่อ field เหล่านั้น

## ขั้นตอนที่ 4: หา connection string และ API key

**Database connection string:**
Project Settings → Database → Connection string → เลือกแท็บ **URI** จะได้รูปแบบ:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```
แทน `[YOUR-PASSWORD]` ด้วยรหัสผ่านที่ตั้งไว้ตอนสร้างโปรเจกต์

**Service role key (สำหรับ Storage):**
Project Settings → API → คัดลอกค่า:
- `Project URL` → ใช้เป็น `SUPABASE_URL`
- `service_role` key (⚠️ ไม่ใช่ `anon` key — service_role มีสิทธิ์เต็ม ห้ามฝังในโค้ด frontend
  เด็ดขาด ใช้ในฝั่ง backend เท่านั้น) → ใช้เป็น `SUPABASE_SERVICE_ROLE_KEY`

## ขั้นตอนที่ 5: ตั้งค่าใน backend/.env

```bash
DATABASE_URL=postgresql://postgres:your-password@db.xxxxxxxxxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

รี-สตาร์ท backend (`uvicorn app.main:app --reload`) — ตอนเริ่มระบบจะเชื่อมต่อ Supabase Postgres
แทน SQLite ทันที (ตาราง/ข้อมูลตั้งต้นจะถูกสร้างในฐานข้อมูล Supabase แทน เพราะ schema.sql สร้าง
ตารางไว้แล้ว ระบบ seed จะข้ามตารางที่มีข้อมูลอยู่แล้วโดยอัตโนมัติ)

## ตรวจสอบว่าเชื่อมสำเร็จ

1. เปิด `http://localhost:8000/api/health` ควรตอบ 200 ปกติ
2. เปิด `http://localhost:8000/api/services` ควรเห็นรายการบริการ (แปลว่าต่อ Postgres สำเร็จ)
3. ลองจองคิว 1 รายการจากหน้าเว็บ แล้วเข้า Supabase Dashboard → Table Editor → ตาราง `bookings`
   ควรเห็นแถวใหม่ปรากฏ
4. ลองแนบรูปตอนจอง แล้วเช็คที่ Storage → bucket `booking-references` ควรเห็นไฟล์ใหม่

## เกี่ยวกับ Row Level Security (RLS)

Backend เชื่อมด้วย **service role key** ซึ่ง bypass RLS ได้เสมอ (เข้าถึงทุกตารางได้เต็มสิทธิ์) ส่วน
policies ที่ตั้งไว้ใน schema.sql (`public read ...`) เผื่อไว้สำหรับกรณีในอนาคตที่อยากให้ frontend
อ่านข้อมูลบางตาราง (บริการ/ลายเล็บ/รีวิว) ตรงจาก Supabase ได้โดยไม่ต้องผ่าน backend เพื่อลด latency
— ปัจจุบันยังไม่ได้ใช้ path นี้ (frontend เรียกผ่าน backend API ทั้งหมด) แต่เตรียมโครงสร้างไว้ให้แล้ว
