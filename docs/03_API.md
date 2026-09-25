03 — API Reference
Base URL (dev): http://localhost:8000/api เอกสารแบบ interactive (ทดสอบยิง request ได้จริง): http://localhost:8000/docs (Swagger UI, สร้าง อัตโนมัติจาก FastAPI) หรือ http://localhost:8000/redoc

Endpoint ที่ขึ้นต้นด้วย /admin/* ต้องแนบ header Authorization: Bearer <token> ที่ได้จาก POST /admin/login — ดูตัวอย่างเต็มใน Postman collection ที่ postman/NailGlow.postman_collection.json

Rate limiting: /admin/login จำกัด 5 ครั้ง/นาทีต่อ IP (กัน brute-force รหัสผ่าน), /bookings (สร้างการจอง) จำกัด 10 ครั้ง/นาที, endpoint ทุกตัวใน /ai/* จำกัด 20 ครั้ง/นาที (กันสแปม/ปั่นค่า compute) — เกินโควตาจะได้ HTTP 429 พร้อม {"detail": "มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่"}

ความจุ/จำนวนช่าง: คิวว่างนับแยกตามหมวดหมู่บริการ (service_categories.staff_count) ไม่ใช่รวมทั้งร้าน เพราะแต่ละหมวดมีช่างคนละคนกัน (ค่าเริ่มต้นตั้งค่าได้ในหน้าแอดมิน "ตั้งค่าร้าน") — จองหมวดผมกับหมวดเล็บเวลาเดียวกันได้ตามปกติ แต่จองซ้อนหมวดเดียวกันได้ไม่เกินจำนวนช่างของหมวดนั้น

Public (ลูกค้า — ไม่ต้องล็อกอิน)
Method	Path	คำอธิบาย
GET	/health	เช็คสถานะเซิร์ฟเวอร์
GET	/service-categories	รายการหมวดหมู่บริการ (ทำผม/ทำเล็บ)
GET	/services?category_id=	รายการบริการ (กรองตามหมวดหมู่ได้)
GET	/nail-designs?style_tag=	แคตตาล็อกลายเล็บ
GET	/shop-settings	เวลาทำการ, วันหยุดประจำสัปดาห์, LINE OA Basic ID
GET	/availability?date=YYYY-MM-DD&duration_minutes=&category_id=	ช่วงเวลาว่างของวันนั้น (นับแยกตามหมวดหมู่ที่ระบุ)
POST	/bookings	สร้างการจองใหม่ → คืนรหัสคิว (limit 10/นาที, กันจองซ้อน/รหัสชนกันอัตโนมัติ)
GET	/bookings/status?booking_code=&phone=	ตรวจสอบสถานะคิว
GET	/bookings/history?phone=&booking_code=	ประวัติการจอง — ใส่แค่ phone ได้สรุปแบบย่อ (ไม่มี id/เวลา/ราคา) ต้องใส่ booking_code ที่ตรงกับคิวจริงด้วยถึงจะเห็นประวัติ/รีวิว/AI try-on แบบเต็ม
PATCH	/bookings/{id}/reschedule	ลูกค้าแก้ไขวันเวลาคิวของตัวเอง (body: phone, booking_date, booking_time)
PATCH	/bookings/{id}/cancel?phone=	ลูกค้ายกเลิกคิวของตัวเอง
GET	/reviews?limit=	รีวิวล่าสุด (แสดงหน้าแรก)
POST	/reviews	ส่งรีวิว (ต้องเป็นคิวที่สถานะ completed แล้ว และยังไม่เคยรีวิวคิวนี้มาก่อน)
POST	/ai/segment	อัปโหลดรูปมือ → ตำแหน่ง/ขนาดเล็บแต่ละนิ้ว + โทนผิว
POST	/ai/tryon	ทดลองสี/ลายเล็บบนรูปจริง (บันทึกประวัติได้ถ้า save: true)
POST	/ai/analyze-style	วิเคราะห์สไตล์จากรูปอ้างอิง + ประเมินเวลาทำเพิ่ม
POST	/ai/recommend	แนะนำลายเล็บด้วยโมเดล XGBoost จาก 5 ปัจจัย
POST	/ai/recommend/{log_id}/accept	บันทึกว่าลูกค้ากด "จองลายนี้" ตามคำแนะนำ (label สำหรับเทรนรอบถัดไป)
POST	/line/webhook	Webhook รับ event จาก LINE Official Account
Admin (ต้องมี Bearer token)
Method	Path	คำอธิบาย
POST	/admin/login	ล็อกอิน → คืน JWT token (limit 5/นาทีต่อ IP)
GET	/admin/me	ข้อมูลแอดมินที่ล็อกอินอยู่
PUT	/admin/password	เปลี่ยนรหัสผ่านของตัวเอง
GET	/admin/users	รายชื่อบัญชีแอดมินทั้งหมด (เฉพาะ role owner)
POST	/admin/users	สร้างบัญชีแอดมินใหม่ ระบุ role owner/staff ได้ (เฉพาะ role owner)
DELETE	/admin/users/{id}	ลบบัญชีแอดมิน (เฉพาะ role owner, ลบตัวเองไม่ได้, ต้องเหลือ owner อย่างน้อย 1 คนเสมอ)
GET	/admin/bookings?status=&search=&date_from=&date_to=	รายการจองทั้งหมด (กรองได้)
POST	/admin/bookings	แอดมินสร้างคิวแทนลูกค้า (โทรจอง/walk-in) เลือกสถานะเริ่มต้นได้เอง กันจองซ้อนแบบเดียวกับฝั่งลูกค้า
GET	/admin/bookings/{id}	รายละเอียดการจอง
PATCH	/admin/bookings/{id}	เปลี่ยนสถานะ/หมายเหตุ
DELETE	/admin/bookings/{id}	ลบการจองถาวร (ลบรีวิวที่ผูกอยู่ไปด้วย)
GET	/admin/customers?q=	ค้นหาลูกค้า
GET	/admin/customers/{id}	ประวัติเต็มของลูกค้ารายนั้น
PATCH	/admin/service-categories/{id}	ตั้งจำนวนช่างของหมวดหมู่นั้น (staff_count)
GET/POST/PUT/DELETE	/admin/services	จัดการบริการ
GET/POST/PUT/DELETE	/admin/nail-designs	จัดการแคตตาล็อกลายเล็บ
PUT	/admin/shop-settings	แก้ชื่อร้าน/เบอร์โทร/LINE OA Basic ID/เวลาทำการ/วันหยุดประจำสัปดาห์
GET/POST/DELETE	/admin/holidays	จัดการวันหยุดพิเศษ
GET	/admin/dashboard/summary	สรุป Dashboard การเงินทั้งหมด
GET/POST/DELETE	/admin/expenses	บันทึกค่าใช้จ่ายของร้าน
ตัวอย่างการเรียกใช้งาน
จองคิว:

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
ให้ AI แนะนำลายเล็บ:

curl -X POST http://localhost:8000/api/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "skin_tone": "warm", "nail_shape": "almond", "nail_length": "long",
    "style_preference": "bold", "occasion": "party"
  }'
เข้าสู่ระบบแอดมิน แล้วดู Dashboard:

TOKEN=$(curl -s -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"changeme123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl http://localhost:8000/api/admin/dashboard/summary -H "Authorization: Bearer $TOKEN"
แอดมินจองคิวแทนลูกค้า (โทรจอง/walk-in):

curl -X POST http://localhost:8000/api/admin/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category_id": "nail",
    "service_id": "<service-uuid>",
    "booking_date": "2026-08-10",
    "booking_time": "14:00",
    "customer_name": "สมหญิง ใจดี",
    "customer_phone": "0812345678",
    "status": "confirmed"
  }'
สร้างบัญชีแอดมินใหม่ (เฉพาะ role owner):

curl -X POST http://localhost:8000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username": "staff1", "password": "รหัสผ่าน8ตัวขึ้นไป", "full_name": "พนักงาน หนึ่ง", "role": "staff"}'
ตั้งจำนวนช่างของหมวดหมู่ (เช่น หมวดเล็บมีช่าง 1 คน):

curl -X PATCH http://localhost:8000/api/admin/service-categories/nail \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"staff_count": 1}'
ทดสอบด้วย Postman
นำเข้าไฟล์ postman/NailGlow.postman_collection.json เข้า Postman (Import → File) — ตั้งค่า Postman environment variable base_url = http://localhost:8000/api และ admin_token (จะถูกเซ็ต อัตโนมัติหลังยิง request "Admin Login" เพราะมี test script เซ็ต env variable ไว้ให้)
