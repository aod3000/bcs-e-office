-- =====================================================================
-- patch_update.sql - อัปเดตโครงสร้างฐานข้อมูล Supabase (รันใน SQL Editor)
-- ปรับโครงสร้างห้องเรียนตามโครงสร้างจริงของโรงเรียนบางชัน:
--   - ระดับปฐมวัย (อ.1 - อ.3): 3 ห้องต่อระดับชั้น
--   - ระดับประถมศึกษา (ป.1 - ป.6): 9 ห้องต่อระดับชั้น (ห้อง 1 - 9) รวม 54 ห้อง
--   - ระดับมัธยมศึกษา (ม.1 - ม.3): 7 ห้องต่อระดับชั้น (ห้อง 1 - 7) รวม 21 ห้อง
--   - ระดับการศึกษาพิเศษ (ห้องเรียนคู่ขนาน/การศึกษาพิเศษ)
-- ปลอดภัย 100%: ไม่ลบข้อมูลเดิม และรองรับ IF NOT EXISTS ทั้งหมด
-- =====================================================================

-- 1) เพิ่มคอลัมน์ is_active ให้กับตาราง profiles (แก้ Error ทันที)
alter table public.profiles 
  add column if not exists is_active boolean not null default true;

-- 2) เพิ่มคอลัมน์ kind ให้กับตาราง departments หากยังไม่มี (แก้ Error 42703 ทันที)
alter table public.departments 
  add column if not exists kind text default 'special';

-- 3) เพิ่มกลุ่มงานการศึกษาพิเศษใน departments
insert into public.departments (name, kind) values
  ('งานการศึกษาพิเศษ (ห้องเรียนคู่ขนาน)', 'special'),
  ('ระดับชั้นการศึกษาพิเศษ', 'grade_level')
on conflict (name) do nothing;

-- 4) ตารางเก็บการตั้งค่าเว็บไซต์และเนื้อหาหลังบ้าน (Site CMS Settings)
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ค่าเริ่มต้นสำหรับการตั้งค่าเว็บไซต์
insert into public.site_settings (key, value) values
  ('admissions', '{"is_open": true, "year": 2569, "notice": "เปิดรับสมัครนักเรียนใหม่ประจำปีการศึกษา 2569"}'::jsonb),
  ('urgent_announcement', '{"is_active": true, "text": "ขอเชิญผู้ปกครองและนักเรียนร่วมกิจกรรมวันวิชาการ 15 มีนาคม 2569", "link": "#activities"}'::jsonb)
on conflict (key) do nothing;

-- 5) สร้างตารางห้องเรียน (classrooms)
create table if not exists public.classrooms (
  id           bigint generated always as identity primary key,
  grade_level  text not null,                       -- เช่น 'อนุบาล', 'ป.1', 'ม.1', 'การศึกษาพิเศษ'
  room_number  text not null,                       -- เช่น '1' ถึง '9', 'EP'
  name         text not null unique,                -- เช่น 'ป.1/1', 'ป.1/9', 'ม.1/7'
  created_at   timestamptz not null default now()
);

-- ข้อมูลห้องเรียนตามโครงสร้างจริงของโรงเรียนบางชัน
insert into public.classrooms (grade_level, room_number, name) values
  -- ระดับปฐมวัย (อนุบาล 1 - 3)
  ('อ.1', '1', 'อนุบาล 1/1'), ('อ.1', '2', 'อนุบาล 1/2'), ('อ.1', '3', 'อนุบาล 1/3'),
  ('อ.2', '1', 'อนุบาล 2/1'), ('อ.2', '2', 'อนุบาล 2/2'), ('อ.2', '3', 'อนุบาล 2/3'),
  ('อ.3', '1', 'อนุบาล 3/1'), ('อ.3', '2', 'อนุบาล 3/2'), ('อ.3', '3', 'อนุบาล 3/3'),

  -- ระดับประถมศึกษาปีที่ 1 (9 ห้อง)
  ('ป.1', '1', 'ป.1/1'), ('ป.1', '2', 'ป.1/2'), ('ป.1', '3', 'ป.1/3'),
  ('ป.1', '4', 'ป.1/4'), ('ป.1', '5', 'ป.1/5'), ('ป.1', '6', 'ป.1/6'),
  ('ป.1', '7', 'ป.1/7'), ('ป.1', '8', 'ป.1/8'), ('ป.1', '9', 'ป.1/9 (EP)'),

  -- ระดับประถมศึกษาปีที่ 2 (9 ห้อง)
  ('ป.2', '1', 'ป.2/1'), ('ป.2', '2', 'ป.2/2'), ('ป.2', '3', 'ป.2/3'),
  ('ป.2', '4', 'ป.2/4'), ('ป.2', '5', 'ป.2/5'), ('ป.2', '6', 'ป.2/6'),
  ('ป.2', '7', 'ป.2/7'), ('ป.2', '8', 'ป.2/8'), ('ป.2', '9', 'ป.2/9'),

  -- ระดับประถมศึกษาปีที่ 3 (9 ห้อง)
  ('ป.3', '1', 'ป.3/1'), ('ป.3', '2', 'ป.3/2'), ('ป.3', '3', 'ป.3/3'),
  ('ป.3', '4', 'ป.3/4'), ('ป.3', '5', 'ป.3/5'), ('ป.3', '6', 'ป.3/6'),
  ('ป.3', '7', 'ป.3/7'), ('ป.3', '8', 'ป.3/8'), ('ป.3', '9', 'ป.3/9'),

  -- ระดับประถมศึกษาปีที่ 4 (9 ห้อง)
  ('ป.4', '1', 'ป.4/1'), ('ป.4', '2', 'ป.4/2'), ('ป.4', '3', 'ป.4/3'),
  ('ป.4', '4', 'ป.4/4'), ('ป.4', '5', 'ป.4/5'), ('ป.4', '6', 'ป.4/6'),
  ('ป.4', '7', 'ป.4/7'), ('ป.4', '8', 'ป.4/8'), ('ป.4', '9', 'ป.4/9'),

  -- ระดับประถมศึกษาปีที่ 5 (9 ห้อง)
  ('ป.5', '1', 'ป.5/1'), ('ป.5', '2', 'ป.5/2'), ('ป.5', '3', 'ป.5/3'),
  ('ป.5', '4', 'ป.5/4'), ('ป.5', '5', 'ป.5/5'), ('ป.5', '6', 'ป.5/6'),
  ('ป.5', '7', 'ป.5/7'), ('ป.5', '8', 'ป.5/8'), ('ป.5', '9', 'ป.5/9'),

  -- ระดับประถมศึกษาปีที่ 6 (9 ห้อง)
  ('ป.6', '1', 'ป.6/1'), ('ป.6', '2', 'ป.6/2'), ('ป.6', '3', 'ป.6/3'),
  ('ป.6', '4', 'ป.6/4'), ('ป.6', '5', 'ป.6/5'), ('ป.6', '6', 'ป.6/6'),
  ('ป.6', '7', 'ป.6/7'), ('ป.6', '8', 'ป.6/8'), ('ป.6', '9', 'ป.6/9'),

  -- ระดับมัธยมศึกษาปีที่ 1 (7 ห้อง)
  ('ม.1', '1', 'ม.1/1'), ('ม.1', '2', 'ม.1/2'), ('ม.1', '3', 'ม.1/3'),
  ('ม.1', '4', 'ม.1/4'), ('ม.1', '5', 'ม.1/5'), ('ม.1', '6', 'ม.1/6'), ('ม.1', '7', 'ม.1/7'),

  -- ระดับมัธยมศึกษาปีที่ 2 (7 ห้อง)
  ('ม.2', '1', 'ม.2/1'), ('ม.2', '2', 'ม.2/2'), ('ม.2', '3', 'ม.2/3'),
  ('ม.2', '4', 'ม.2/4'), ('ม.2', '5', 'ม.2/5'), ('ม.2', '6', 'ม.2/6'), ('ม.2', '7', 'ม.2/7'),

  -- ระดับมัธยมศึกษาปีที่ 3 (7 ห้อง)
  ('ม.3', '1', 'ม.3/1'), ('ม.3', '2', 'ม.3/2'), ('ม.3', '3', 'ม.3/3'),
  ('ม.3', '4', 'ม.3/4'), ('ม.3', '5', 'ม.3/5'), ('ม.3', '6', 'ม.3/6'), ('ม.3', '7', 'ม.3/7'),

  -- ระดับการศึกษาพิเศษ (ห้องเรียนคู่ขนาน/กศ.พ.)
  ('การศึกษาพิเศษ', '1', 'การศึกษาพิเศษ 1'),
  ('การศึกษาพิเศษ', '2', 'การศึกษาพิเศษ 2'),
  ('การศึกษาพิเศษ', '3', 'การศึกษาพิเศษ 3')
on conflict (name) do nothing;

-- 4) ครูประจำชั้น (classroom_teachers)
create table if not exists public.classroom_teachers (
  id           bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (classroom_id, teacher_id)
);

-- 5) ประธานสายชั้น และ IT ประจำสายชั้น (grade_level_staff)
create table if not exists public.grade_level_staff (
  id           bigint generated always as identity primary key,
  grade_level  text not null,
  staff_id     uuid not null references public.profiles(id) on delete cascade,
  role_type    text not null check (role_type in ('chairperson', 'it_admin')),
  created_at   timestamptz not null default now(),
  unique (grade_level, staff_id, role_type)
);

-- 6) ข้อมูลนักเรียน (students)
create table if not exists public.students (
  id           bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  student_code text not null unique,
  first_name   text not null,
  last_name    text not null,
  gender       text check (gender in ('M', 'F')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists students_classroom_idx on public.students(classroom_id);

-- 7) บันทึกเช็คชื่อนักเรียน (student_attendance)
create table if not exists public.student_attendance (
  id           bigint generated always as identity primary key,
  student_id   bigint not null references public.students(id) on delete cascade,
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  date         date not null default current_date,
  status       text not null check (status in ('present', 'absent', 'leave', 'late')),
  recorded_by  uuid not null references public.profiles(id),
  remark       text,
  created_at   timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists attendance_date_room_idx on public.student_attendance(date, classroom_id);

-- 8) งานที่มอบหมายและการส่งงานของนักเรียน (assignments & submissions)
create table if not exists public.assignments (
  id           bigint generated always as identity primary key,
  teacher_id   uuid not null references public.profiles(id),
  classroom_id bigint references public.classrooms(id) on delete cascade,
  subject      text not null,
  title        text not null,
  description  text,
  due_date     timestamptz,
  max_score    numeric(5,2) default 100,
  created_at   timestamptz not null default now()
);

create table if not exists public.student_submissions (
  id            bigint generated always as identity primary key,
  assignment_id bigint not null references public.assignments(id) on delete cascade,
  student_code  text not null,
  student_name  text not null,
  file_url      text not null,
  file_name     text,
  notes         text,
  score         numeric(5,2),
  feedback      text,
  status        text not null default 'submitted' check (status in ('submitted', 'graded', 'revision')),
  created_at    timestamptz not null default now()
);

-- 9) ระบบรายงานหน้าเดียว (one_page_reports)
create table if not exists public.one_page_reports (
  id           bigint generated always as identity primary key,
  title        text not null,
  grade_level  text,
  report_date  date not null default current_date,
  summary_text text not null,
  metrics_json jsonb default '{}'::jsonb,
  photo_urls   text[],
  drive_folder text,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- 10) กำหนดสิทธิ์ SuperAdmin ให้ admin@bcs.ac.th
update public.profiles 
set role = 'admin', is_active = true 
where lower(email) = 'admin@bcs.ac.th';

-- 11) บังคับให้ Supabase อัปเดตโครงสร้างตารางใหม่ทันที (Reload Schema Cache)
notify pgrst, 'reload schema';
