-- ============================================================================
-- NailGlow Booking — Supabase (PostgreSQL) schema
-- ระบบจองคิวร้านเสริมสวยและวิเคราะห์สีเล็บอัจฉริยะ
--
-- วิธีใช้: เปิดโปรเจกต์ Supabase ของคุณ -> SQL Editor -> New query -> วางไฟล์นี้ทั้งหมด -> Run
-- (ดูขั้นตอนละเอียดใน docs/02_DATABASE_SUPABASE.md)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) ผู้ดูแลระบบ (เจ้าของร้าน / พนักงาน) — ใช้ล็อกอินเข้าหน้า Admin Dashboard
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  full_name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) การตั้งค่าร้าน (แถวเดียว) + วันหยุด
-- ---------------------------------------------------------------------------
create table if not exists shop_settings (
  id int primary key default 1,
  shop_name text not null default 'NailGlow',
  phone text not null default '',
  address text not null default '',
  line_oa_basic_id text not null default '',
  opening_time time not null default '10:00',
  closing_time time not null default '19:00',
  slot_interval_minutes int not null default 60,
  closed_weekdays int[] not null default '{}', -- 0=อาทิตย์ .. 6=เสาร์
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into shop_settings (id) values (1) on conflict (id) do nothing;

create table if not exists shop_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3) หมวดหมู่บริการ + บริการ
-- ---------------------------------------------------------------------------
create table if not exists service_categories (
  id text primary key,            -- 'hair' | 'nail'
  name text not null,
  icon text not null default '',
  sort_order int not null default 0
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references service_categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null,
  duration_minutes int not null,
  is_color_service boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_services_category on services(category_id);

-- ---------------------------------------------------------------------------
-- 4) แคตตาล็อกลายเล็บ — ใช้โดยระบบแนะนำลาย (XGBoost) และ Virtual Try-On
-- ---------------------------------------------------------------------------
create table if not exists nail_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  duration_minutes int not null,
  complexity text not null default 'simple' check (complexity in ('simple', 'medium', 'complex')),
  style_tag text not null default 'classic' check (style_tag in ('minimal', 'classic', 'bold')),
  color_hex text not null default '#B5793A',
  tone_fit jsonb not null default '{"warm":70,"cool":70,"neutral":70}',
  popularity int not null default 50,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) ลูกค้า — จำแนกด้วยเบอร์โทร (ระบบไม่บังคับสมัครสมาชิก แต่ผูกประวัติด้วยเบอร์โทร)
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text not null default '',
  line_id text not null default '',
  line_user_id text,              -- ผูกกับ LINE userId จริง (ได้จาก webhook) สำหรับส่ง push message
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6) การจองคิว
-- ---------------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique not null,     -- เช่น NG-20260807-0001 (ส่งให้ลูกค้าไว้ตรวจสอบสถานะ)
  customer_id uuid not null references customers(id) on delete cascade,
  category_id text not null references service_categories(id),
  service_id uuid references services(id),
  service_name text not null,            -- snapshot ชื่อบริการ ณ ตอนจอง (กันบริการถูกแก้ไข/ลบภายหลัง)
  price numeric(10,2) not null,          -- snapshot ราคา ณ ตอนจอง
  shade_id text,
  shade_name text,
  nail_design_id uuid references nail_designs(id),
  reference_image_url text,
  ai_style_tag text,                     -- ผลวิเคราะห์สไตล์จากรูปอ้างอิง (minimal/classic/bold)
  ai_extra_minutes int not null default 0,
  estimated_duration_minutes int not null,
  booking_date date not null,
  booking_time time not null,
  customer_name text not null,
  customer_phone text not null,
  line_id text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bookings_date on bookings(booking_date);
create index if not exists idx_bookings_customer on bookings(customer_id);
create index if not exists idx_bookings_phone on bookings(customer_phone);
create index if not exists idx_bookings_status on bookings(status);

-- ---------------------------------------------------------------------------
-- 7) รีวิว
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references bookings(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  photo_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8) ประวัติการทดลองลายเล็บด้วย AI (Virtual Try-On) — เก็บไว้ทั้งใช้แสดงประวัติผู้ใช้
--    และใช้เป็น dataset ต่อยอดในอนาคต (feedback loop)
-- ---------------------------------------------------------------------------
create table if not exists ai_tryon_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  customer_phone text,
  source_image_url text,
  result_image_url text,
  nail_design_id uuid references nail_designs(id),
  color_hex text,
  pattern text,
  nail_shape text,
  skin_tone text,
  segmentation_engine text not null default 'mediapipe+opencv'
    check (segmentation_engine in ('mediapipe+opencv', 'yolov8-seg')),
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_tryon_customer on ai_tryon_history(customer_id);

-- ---------------------------------------------------------------------------
-- 9) log คำแนะนำจาก XGBoost — เก็บ feature/ผลลัพธ์ทุกครั้งที่เรียกใช้ เพื่อใช้เป็นข้อมูลเทรนรอบถัดไป
-- ---------------------------------------------------------------------------
create table if not exists ai_recommend_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  skin_tone text not null,
  nail_shape text not null,
  nail_length text not null,
  style_preference text not null,
  occasion text not null,
  recommended_design_id uuid references nail_designs(id),
  confidence numeric(5,4),
  accepted boolean,               -- true ถ้าลูกค้ากด "จองลายนี้" ตามคำแนะนำ (label สำหรับเทรนรอบถัดไป)
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10) ค่าใช้จ่ายของร้าน — ใช้คำนวณกำไรสุทธิใน Dashboard การเงิน
-- ---------------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null default 'อื่นๆ',
  amount numeric(10,2) not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 11) log การแจ้งเตือนผ่าน LINE (debug/ตรวจสอบย้อนหลัง)
-- ---------------------------------------------------------------------------
create table if not exists line_notify_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  message_type text not null,
  payload jsonb,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Storage buckets (สร้างผ่าน Supabase Dashboard > Storage หรือรันผ่าน supabase-py ก็ได้)
--   booking-references : รูปลายเล็บ/สีผมที่ลูกค้าแนบตอนจอง
--   tryon-results       : รูปผลลัพธ์ Virtual Try-On
--   review-photos       : รูปผลงานที่แนบตอนรีวิว
-- (ตั้งเป็น public bucket เพื่อให้ได้ URL ตรงใช้แสดงผลได้เลย — ดูขั้นตอนใน docs/02_DATABASE_SUPABASE.md)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Backend เชื่อมด้วย service role key เสมอ (bypass RLS ได้อัตโนมัติ) ส่วนนโยบายด้านล่างนี้
-- ครอบไว้เผื่อกรณีในอนาคตที่อยากให้ frontend อ่านข้อมูลบางตารางตรงจาก Supabase ได้อย่างปลอดภัย
-- ---------------------------------------------------------------------------
alter table service_categories enable row level security;
alter table services enable row level security;
alter table nail_designs enable row level security;
alter table reviews enable row level security;
alter table shop_settings enable row level security;
alter table shop_holidays enable row level security;

drop policy if exists "public read categories" on service_categories;
create policy "public read categories" on service_categories for select using (true);

drop policy if exists "public read active services" on services;
create policy "public read active services" on services for select using (active = true);

drop policy if exists "public read active designs" on nail_designs;
create policy "public read active designs" on nail_designs for select using (active = true);

drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);

drop policy if exists "public read shop settings" on shop_settings;
create policy "public read shop settings" on shop_settings for select using (true);

drop policy if exists "public read holidays" on shop_holidays;
create policy "public read holidays" on shop_holidays for select using (true);

-- ตารางที่เหลือ (customers, bookings, ai_*, expenses, admin_users, line_notify_log) ไม่เปิด public
-- policy ใดๆ ทั้งสิ้น เข้าถึงได้เฉพาะผ่าน backend (service role key) เท่านั้น
