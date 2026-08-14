# 03 — API Reference

Base URL (dev): `http://localhost:8000/api`
เอกสารแบบ interactive (ทดสอบยิง request ได้จริง): `http://localhost:8000/docs` (Swagger UI, สร้าง
อัตโนมัติจาก FastAPI) หรือ `http://localhost:8000/redoc`

Endpoint ที่ขึ้นต้นด้วย `/admin/*` ต้องแนบ header `Authorization: Bearer <token>` ที่ได้จาก
`POST /admin/login` — ดูตัวอย่างเต็มใน Postman collection ที่ `postman/NailGlow.postman_collection.json`

## Public (ลูกค้า — ไม่ต้องล็อกอิน)

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/health` | เช็คสถานะเซิร์ฟเวอร์ |
| GET | `/service-categories` | รายการหมวดหมู่บริการ (ทำผม/ทำเล็บ) |
| GET | `/services?category_id=` | รายการบริการ (กรองตามหมวดหมู่ได้) |
| GET | `/nail-designs?style_tag=` | แคตตาล็อกลายเล็บ |
| GET | `/shop-settings` | เวลาทำการ, วันหยุดประจำสัปดาห์ |
| GET | `/availability?date=YYYY-MM-DD&duration_minutes=` | ช่วงเวลาว่างของวันนั้น |
| POST | `/bookings` | สร้างการจองใหม่ → คืนรหัสคิว |
| GET | `/bookings/status?booking_code=&phone=` | ตรวจสอบสถานะคิว |
| GET | `/bookings/history?phone=` | ประวัติการจอง/รีวิว/AI try-on ทั้งหมดของเบอร์นี้ |
| PATCH | `/bookings/{id}/cancel?phone=` | ลูกค้ายกเลิกคิวของตัวเอง |
| GET | `/reviews?limit=` | รีวิวล่าสุด (แสดงหน้าแรก) |
| POST | `/reviews` | ส่งรีวิว (ต้องเป็นคิวที่สถานะ `completed` แล้ว) |
| POST | `/ai/segment` | อัปโหลดรูปมือ → ตำแหน่ง/ขนาดเล็บแต่ละนิ้ว + โทนผิว |
| POST | `/ai/tryon` | ทดลองสี/ลายเล็บบนรูปจริง (บันทึกประวัติได้ถ้า `save: true`) |
| POST | `/ai/analyze-style` | วิเคราะห์สไตล์จากรูปอ้างอิง + ประเมินเวลาทำเพิ่ม |
| POST | `/ai/recommend` | แนะนำลายเล็บด้วยโมเดล XGBoost จาก 5 ปัจจัย |
| POST | `/ai/recommend/{log_id}/accept` | บันทึกว่าลูกค้ากด "จองลายนี้" ตามคำแนะนำ (label สำหรับเทรนรอบถัดไป) |
| POST | `/line/webhook` | Webhook รับ event จาก LINE Official Account |

## Admin (ต้องมี Bearer token)

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/admin/login` | ล็อกอิน → คืน JWT token |
| GET | `/admin/me` | ข้อมูลแอดมินที่ล็อกอินอยู่ |
| GET | `/admin/bookings?status=&search=&date_from=&date_to=` | รายการจองทั้งหมด (กรองได้) |
| GET | `/admin/bookings/{id}` | รายละเอียดการจอง |
| PATCH | `/admin/bookings/{id}` | เปลี่ยนสถานะ/หมายเหตุ |
| GET | `/admin/customers?q=` | ค้นหาลูกค้า |
| GET | `/admin/customers/{id}` | ประวัติเต็มของลูกค้ารายนั้น |
| GET/POST/PUT/DELETE | `/admin/services` | จัดการบริการ |
| GET/POST/PUT/DELETE | `/admin/nail-designs` | จัดการแคตตาล็อกลายเล็บ |
| PUT | `/admin/shop-settings` | แก้เวลาทำการ/วันหยุดประจำสัปดาห์ |
| GET/POST/DELETE | `/admin/holidays` | จัดการวันหยุดพิเศษ |
| GET | `/admin/dashboard/summary` | สรุป Dashboard การเงินทั้งหมด |
| GET/POST/DELETE | `/admin/expenses` | บันทึกค่าใช้จ่ายของร้าน |

## ตัวอย่างการเรียกใช้งาน

**จองคิว:**
```bash
curl -X POST http://localhost:8000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "nail",
    "service_id": "<service-uuid>",
    "booking_date": "2026-08-10",
    "booking_time": "14:00",
    "customer_name": "สมหญิง ใจดี",
    "customer_phone": "0812345678",
    "line_id": "somying_j"
  }'
```

**ให้ AI แนะนำลายเล็บ:**
```bash
curl -X POST http://localhost:8000/api/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "skin_tone": "warm", "nail_shape": "almond", "nail_length": "long",
    "style_preference": "bold", "occasion": "party"
  }'
```

**เข้าสู่ระบบแอดมิน แล้วดู Dashboard:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"changeme123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl http://localhost:8000/api/admin/dashboard/summary -H "Authorization: Bearer $TOKEN"
```

## ทดสอบด้วย Postman

นำเข้าไฟล์ `postman/NailGlow.postman_collection.json` เข้า Postman (Import → File) — ตั้งค่า
Postman environment variable `base_url = http://localhost:8000/api` และ `admin_token` (จะถูกเซ็ต
อัตโนมัติหลังยิง request "Admin Login" เพราะมี test script เซ็ต env variable ไว้ให้)
