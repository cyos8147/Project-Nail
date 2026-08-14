# 05 — เชื่อมต่อ LINE Official Account (LINE Messaging API)

ระบบใช้ LINE OA ส่งข้อความยืนยันการจอง, แจ้งเปลี่ยนสถานะคิว, และชวนรีวิวหลังบริการเสร็จ
(`backend/app/services/line_notify.py` + webhook ที่ `backend/app/routers/line.py`)

## ทำไมต้อง "ผูกบัญชี" ก่อนถึงจะส่งแจ้งเตือนได้

ตอนจองคิว ลูกค้ากรอกแค่ **LINE ID** (ชื่อบัญชีที่ตั้งเอง) ซึ่ง LINE Messaging API **ใช้ส่งข้อความหา
ใครไม่ได้** — การ push message ต้องใช้ **LINE userId** (รหัสภายในที่ไม่ซ้ำกัน) ซึ่งได้มาจาก event ที่
LINE ส่งเข้า webhook ของเราเท่านั้น (ตอนลูกค้าเพิ่มเพื่อน OA หรือทักแชท) ระบบจึงใช้วิธี "ผูกบัญชี":
ให้ลูกค้าเพิ่มเพื่อน OA ของร้าน แล้วพิมพ์ **เบอร์โทรศัพท์** หรือ **รหัสคิว** ที่ใช้ตอนจองส่งในแชท
ระบบจะจับคู่ userId เข้ากับลูกค้าคนนั้นในฐานข้อมูลอัตโนมัติ ตั้งแต่นั้นจะส่งแจ้งเตือนผ่าน LINE ให้เอง

## ขั้นตอนที่ 1: สร้าง LINE Official Account

1. ไปที่ https://www.linebiz.com/th/ (หรือ https://manager.line.biz) → สมัครสร้าง Official Account
2. ตั้งชื่อร้าน อัปโหลดรูปโปรไฟล์ ฯลฯ ตามขั้นตอนปกติ

## ขั้นตอนที่ 2: เปิดใช้ Messaging API

1. ไปที่ https://developers.line.biz/console/ → ล็อกอินด้วยบัญชีเดียวกับ LINE OA
2. เลือก Provider (สร้างใหม่ถ้ายังไม่มี) → เลือก OA ที่สร้างไว้ → แท็บ **Messaging API**
3. กด **Issue** เพื่อเปิดใช้ Messaging API ให้กับ OA นี้

## ขั้นตอนที่ 3: หา Channel Secret และ Channel Access Token

ในหน้า Messaging API settings ของ channel:
- **Channel secret** (อยู่แท็บ Basic settings) → ใช้เป็น `LINE_CHANNEL_SECRET`
- **Channel access token** (แท็บ Messaging API, กด Issue ถ้ายังไม่มี — เลือกแบบ long-lived หรือ
  channel access token v2.1) → ใช้เป็น `LINE_CHANNEL_ACCESS_TOKEN`

ใส่ลงใน `backend/.env`:
```bash
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ขั้นตอนที่ 4: ตั้งค่า Webhook URL

Backend ต้องมี URL สาธารณะที่ LINE เรียกถึงได้ (ใช้งานจริงหลัง deploy ขึ้น Render แล้ว — ดู
`docs/06_DEPLOYMENT.md`) ตอน dev ในเครื่องใช้ [ngrok](https://ngrok.com) เปิด tunnel ชั่วคราวได้:

```bash
ngrok http 8000
```

จะได้ URL แบบ `https://xxxx.ngrok-free.app` — นำไปตั้งใน LINE Developers Console:
1. แท็บ **Messaging API settings** → **Webhook URL** → ใส่ `https://<your-url>/api/line/webhook`
2. กด **Verify** ควรขึ้น Success
3. เปิด **Use webhook** เป็น ON
4. ปิด **Auto-reply messages** และ **Greeting messages** เป็น OFF (ป้องกันข้อความอัตโนมัติของ LINE
   ชนกับข้อความที่ระบบเราส่งเอง)

## ขั้นตอนที่ 5: ทดสอบ

1. สแกน QR code ของ OA (อยู่หน้า Messaging API settings) เพิ่มเพื่อนด้วย LINE ส่วนตัว
2. ควรได้รับข้อความต้อนรับอัตโนมัติจากระบบ (จาก `FollowEvent` ใน `app/routers/line.py`)
3. พิมพ์เบอร์โทรที่เคยใช้จองคิว (เช่น `0812345678`) หรือรหัสคิว (เช่น `NG-20260807-0001`) ส่งในแชท
4. ควรได้รับข้อความ "ผูกบัญชีไลน์สำเร็จแล้ว"
5. เข้าหน้าแอดมิน → เปลี่ยนสถานะคิวของเบอร์นั้น → ควรได้รับข้อความแจ้งเตือนผ่าน LINE ทันที

## หมายเหตุ

- ถ้ายังไม่ได้ตั้งค่า `LINE_CHANNEL_ACCESS_TOKEN`/`LINE_CHANNEL_SECRET` ระบบจะ **ข้ามการส่ง LINE
  เงียบๆ** ไม่ error — ทำให้ทดสอบฟีเจอร์อื่นได้ตามปกติแม้ยังไม่ได้ผูก LINE จริง
- Log การส่งข้อความทั้งหมดถูกเตรียมตารางไว้ที่ `line_notify_log` (เปิดใช้เพิ่มได้ในโค้ด
  `line_notify.py` หากต้องการ audit trail ละเอียดขึ้น)
