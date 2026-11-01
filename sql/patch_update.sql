-- =====================================================================
-- patch_update.sql - อัปเดตโครงสร้างฐานข้อมูล Supabase (รันใน SQL Editor)
-- แก้ไข Error 42P10 โดยใช้ WHERE NOT EXISTS (ไม่ต้องพึ่งพา Unique Constraint)
-- ปลอดภัย 100%: ไม่ลบข้อมูลเดิม และรันซ้ำได้ไม่จำกัด
-- =====================================================================

-- 1) เพิ่มคอลัมน์ is_active, updated_at, created_at ให้กับตาราง profiles (แก้ Error ทันที)
alter table public.profiles 
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

-- 2) เพิ่มคอลัมน์ kind ให้กับตาราง departments (หากยังไม่มี)
alter table public.departments 
  add column if not exists kind text default 'special';

-- 3) เพิ่มกลุ่มงานการศึกษาพิเศษ (ใช้ WHERE NOT EXISTS ไม่เกิด Error 42P10)
insert into public.departments (name, kind)
select d.name, d.kind
from (values
  ('งานการศึกษาพิเศษ (ห้องเรียนคู่ขนาน)', 'special'),
  ('ระดับชั้นการศึกษาพิเศษ', 'grade_level')
) as d(name, kind)
where not exists (
  select 1 from public.departments where public.departments.name = d.name
);

-- 4) ตารางเก็บการตั้งค่าเว็บไซต์และเนื้อหาหลังบ้าน (Site CMS Settings)
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into public.site_settings (key, value)
select s.key, s.value::jsonb
from (values
  ('admissions', '{"is_open": true, "year": 2569, "notice": "เปิดรับสมัครนักเรียนใหม่ประจำปีการศึกษา 2569"}'::text),
  ('urgent_announcement', '{"is_active": true, "text": "ขอเชิญผู้ปกครองและนักเรียนร่วมกิจกรรมวันวิชาการ 15 มีนาคม 2569", "link": "#activities"}'::text)
) as s(key, value)
where not exists (
  select 1 from public.site_settings where public.site_settings.key = s.key
);

-- 5) สร้างตารางห้องเรียน (classrooms)
create table if not exists public.classrooms (
  id           bigint generated always as identity primary key,
  grade_level  text not null,
  room_number  text not null,
  name         text not null,
  created_at   timestamptz not null default now()
);

-- ข้อมูลห้องเรียนตามโครงสร้างจริง: ประถม 9 ห้อง / มัธยม 7 ห้อง / อนุบาล 3 ห้อง / การศึกษาพิเศษ
-- ใช้ WHERE NOT EXISTS เพื่อป้องกัน Error 42P10
insert into public.classrooms (grade_level, room_number, name)
select c.grade_level, c.room_number, c.name
from (values
  -- อนุบาล 1-3
  ('อ.1', '1', 'อนุบาล 1/1'), ('อ.1', '2', 'อนุบาล 1/2'), ('อ.1', '3', 'อนุบาล 1/3'),
  ('อ.2', '1', 'อนุบาล 2/1'), ('อ.2', '2', 'อนุบาล 2/2'), ('อ.2', '3', 'อนุบาล 2/3'),
  ('อ.3', '1', 'อนุบาล 3/1'), ('อ.3', '2', 'อนุบาล 3/2'), ('อ.3', '3', 'อนุบาล 3/3'),

  -- ประถม ป.1 ถึง ป.6 (ละ 9 ห้อง รวม 54 ห้อง)
  ('ป.1', '1', 'ป.1/1'), ('ป.1', '2', 'ป.1/2'), ('ป.1', '3', 'ป.1/3'), ('ป.1', '4', 'ป.1/4'), ('ป.1', '5', 'ป.1/5'), ('ป.1', '6', 'ป.1/6'), ('ป.1', '7', 'ป.1/7'), ('ป.1', '8', 'ป.1/8'), ('ป.1', '9', 'ป.1/9 (EP)'),
  ('ป.2', '1', 'ป.2/1'), ('ป.2', '2', 'ป.2/2'), ('ป.2', '3', 'ป.2/3'), ('ป.2', '4', 'ป.2/4'), ('ป.2', '5', 'ป.2/5'), ('ป.2', '6', 'ป.2/6'), ('ป.2', '7', 'ป.2/7'), ('ป.2', '8', 'ป.2/8'), ('ป.2', '9', 'ป.2/9'),
  ('ป.3', '1', 'ป.3/1'), ('ป.3', '2', 'ป.3/2'), ('ป.3', '3', 'ป.3/3'), ('ป.3', '4', 'ป.3/4'), ('ป.3', '5', 'ป.3/5'), ('ป.3', '6', 'ป.3/6'), ('ป.3', '7', 'ป.3/7'), ('ป.3', '8', 'ป.3/8'), ('ป.3', '9', 'ป.3/9'),
  ('ป.4', '1', 'ป.4/1'), ('ป.4', '2', 'ป.4/2'), ('ป.4', '3', 'ป.4/3'), ('ป.4', '4', 'ป.4/4'), ('ป.4', '5', 'ป.4/5'), ('ป.4', '6', 'ป.4/6'), ('ป.4', '7', 'ป.4/7'), ('ป.4', '8', 'ป.4/8'), ('ป.4', '9', 'ป.4/9'),
  ('ป.5', '1', 'ป.5/1'), ('ป.5', '2', 'ป.5/2'), ('ป.5', '3', 'ป.5/3'), ('ป.5', '4', 'ป.5/4'), ('ป.5', '5', 'ป.5/5'), ('ป.5', '6', 'ป.5/6'), ('ป.5', '7', 'ป.5/7'), ('ป.5', '8', 'ป.5/8'), ('ป.5', '9', 'ป.5/9'),
  ('ป.6', '1', 'ป.6/1'), ('ป.6', '2', 'ป.6/2'), ('ป.6', '3', 'ป.6/3'), ('ป.6', '4', 'ป.6/4'), ('ป.6', '5', 'ป.6/5'), ('ป.6', '6', 'ป.6/6'), ('ป.6', '7', 'ป.6/7'), ('ป.6', '8', 'ป.6/8'), ('ป.6', '9', 'ป.6/9'),

  -- มัธยม ม.1 ถึง ม.3 (ละ 7 ห้อง รวม 21 ห้อง)
  ('ม.1', '1', 'ม.1/1'), ('ม.1', '2', 'ม.1/2'), ('ม.1', '3', 'ม.1/3'), ('ม.1', '4', 'ม.1/4'), ('ม.1', '5', 'ม.1/5'), ('ม.1', '6', 'ม.1/6'), ('ม.1', '7', 'ม.1/7'),
  ('ม.2', '1', 'ม.2/1'), ('ม.2', '2', 'ม.2/2'), ('ม.2', '3', 'ม.2/3'), ('ม.2', '4', 'ม.2/4'), ('ม.2', '5', 'ม.2/5'), ('ม.2', '6', 'ม.2/6'), ('ม.2', '7', 'ม.2/7'),
  ('ม.3', '1', 'ม.3/1'), ('ม.3', '2', 'ม.3/2'), ('ม.3', '3', 'ม.3/3'), ('ม.3', '4', 'ม.3/4'), ('ม.3', '5', 'ม.3/5'), ('ม.3', '6', 'ม.3/6'), ('ม.3', '7', 'ม.3/7'),

  -- ห้องเรียนการศึกษาพิเศษ (ห้องเรียนคู่ขนาน)
  ('การศึกษาพิเศษ', '1', 'การศึกษาพิเศษ 1'),
  ('การศึกษาพิเศษ', '2', 'การศึกษาพิเศษ 2'),
  ('การศึกษาพิเศษ', '3', 'การศึกษาพิเศษ 3')
) as c(grade_level, room_number, name)
where not exists (
  select 1 from public.classrooms where public.classrooms.name = c.name
);

-- 6) อัปเดตรีเฟรช Schema Cache
notify pgrst, 'reload schema';
