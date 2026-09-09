# NailGlow

เว็บไซต์จองคิวร้านทำเล็บ ลูกค้าจองคิวออนไลน์ได้เลยโดยไม่ต้องสมัครสมาชิก แค่กรอกชื่อกับเบอร์โทร
พร้อมฟีเจอร์ให้ลองสีและลายเล็บด้วย AI ก่อนตัดสินใจจองจริง

## ทำอะไรได้บ้าง

**ฝั่งลูกค้า**
- เลือกบริการ ดูราคา จองคิวผ่านฟอร์มทีละขั้นตอน
- ลองสี/ลายเล็บบนรูปมือตัวเองด้วย AI ก่อนจอง
- เช็คสถานะคิว และแก้ไขวันเวลาการจองเองได้ด้วยรหัสคิว+เบอร์โทร
- ดูประวัติการจองย้อนหลัง และให้รีวิวหลังใช้บริการ

**ฝั่งร้าน (หน้าแอดมิน)**
- จัดการคิวที่เข้ามา ยืนยัน/ยกเลิก/ใส่หมายเหตุ
- จัดการรายการบริการและลายเล็บ
- ดูรายได้ ค่าใช้จ่าย และสรุปยอดแบบกราฟ
- ตั้งเวลาทำการและวันหยุดร้าน

## เทคโนโลยีที่ใช้

Frontend: React + Vite + Tailwind CSS
Backend: FastAPI (Python) + PostgreSQL ผ่าน Supabase
Deploy: Vercel (frontend) + Render (backend)

## รันโปรเจกต์ในเครื่อง

**Backend**
\`\`\`bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
\`\`\`

**Frontend** (เปิดเทอร์มินัลใหม่)
\`\`\`bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
\`\`\`

เปิด `http://localhost:5173` ได้เลย รายละเอียดการตั้งค่า Supabase, LINE OA และการ deploy จริง อยู่ในโฟลเดอร์ `docs/`
