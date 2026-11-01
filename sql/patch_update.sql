-- =====================================================================
-- patch_update.sql - อัปเดตโครงสร้างฐานข้อมูล Supabase (รันใน SQL Editor)
-- แก้ไข Error: "Could not find the 'is_active' column of 'profiles'"
-- ปลอดภัย 100%: ไม่ลบข้อมูลเดิม และรองรับ IF NOT EXISTS ทั้งหมด
-- =====================================================================

-- 1) เพิ่มคอลัมน์ is_active ให้กับตาราง profiles (หากยังไม่มี)
alter table public.profiles 
  add column if not exists is_active boolean not null default true;

-- 2) สร้างตารางห้องเรียน (classrooms) หากยังไม่มี
create table if not exists public.classrooms (
  id           bigint generated always as identity primary key,
  grade_level  text not null,                       -- เช่น 'ป.1', 'ป.2', 'ม.1'
  room_number  text not null,                       -- เช่น '1', '2', 'EP'
  name         text not null unique,                -- เช่น 'ป.1/1', 'ป.1/2'
  created_at   timestamptz not null default now()
);

-- ข้อมูลห้องเรียนเริ่มต้นของโรงเรียนบางชัน
insert into public.classrooms (grade_level, room_number, name) values
  ('อนุบาล', '1', 'อนุบาล 1'),
  ('อนุบาล', '2', 'อนุบาล 2'),
  ('อนุบาล', '3', 'อนุบาล 3'),
  ('ป.1', '1', 'ป.1/1'),
  ('ป.1', '2', 'ป.1/2'),
  ('ป.1', 'EP', 'ป.1/EP'),
  ('ป.2', '1', 'ป.2/1'),
  ('ป.2', '2', 'ป.2/2'),
  ('ป.3', '1', 'ป.3/1'),
  ('ป.3', '2', 'ป.3/2'),
  ('ป.4', '1', 'ป.4/1'),
  ('ป.4', '2', 'ป.4/2'),
  ('ป.5', '1', 'ป.5/1'),
  ('ป.5', '2', 'ป.5/2'),
  ('ป.6', '1', 'ป.6/1'),
  ('ป.6', '2', 'ป.6/2'),
  ('ม.1', '1', 'ม.1/1'),
  ('ม.1', '2', 'ม.1/2'),
  ('ม.2', '1', 'ม.2/1'),
  ('ม.2', '2', 'ม.2/2'),
  ('ม.3', '1', 'ม.3/1'),
  ('ม.3', '2', 'ม.3/2')
on conflict (name) do nothing;

-- 3) ครูประจำชั้น (classroom_teachers)
create table if not exists public.classroom_teachers (
  id           bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (classroom_id, teacher_id)
);

-- 4) ประธานสายชั้น และ IT ประจำสายชั้น (grade_level_staff)
create table if not exists public.grade_level_staff (
  id           bigint generated always as identity primary key,
  grade_level  text not null,
  staff_id     uuid not null references public.profiles(id) on delete cascade,
  role_type    text not null check (role_type in ('chairperson', 'it_admin')),
  created_at   timestamptz not null default now(),
  unique (grade_level, staff_id, role_type)
);

-- 5) ข้อมูลนักเรียน (students)
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

-- 6) บันทึกเช็คชื่อนักเรียนประจำวัน (student_attendance)
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

-- 7) งานที่มอบหมายและการส่งงานของนักเรียน (assignments & submissions)
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

-- 8) ระบบรายงานหน้าเดียว พร้อมจัดเก็บรูปภาพ (one_page_reports)
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

-- 9) ยืนยันสิทธิ์ SuperAdmin ให้กับ admin@bcs.ac.th
update public.profiles 
set role = 'admin', is_active = true 
where lower(email) = 'admin@bcs.ac.th';

-- 10) สั่งรีเฟรชแคชของ Supabase PostgREST ให้เห็นคอลัมน์ใหม่ทันที
notify pgrst, 'reload schema';
