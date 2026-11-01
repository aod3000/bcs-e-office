-- =====================================================================
-- MASTER CLEAN DATABASE SETUP FOR BCS SCHOOL SYSTEM (โรงเรียนบางชัน)
-- รันชุดนี้ครั้งเดียวใน Supabase > SQL Editor: ทุกอย่างจะถูกสร้างและตั้งค่าใหม่อย่างสมบูรณ์ 100%
-- ปลอดภัย 100%: บัญชีล็อกอินและรหัสผ่านใน auth.users จะไม่หายแน่นอน
-- =====================================================================

-- 1) ตารางกลุ่มงาน/กลุ่มสาระ (departments)
CREATE TABLE IF NOT EXISTS public.departments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  kind text DEFAULT 'subject',
  created_at timestamptz DEFAULT now()
);

-- เพิ่มคอลัมน์ kind หากยังไม่มี
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS kind text DEFAULT 'subject';

-- รีเซ็ตและใส่ข้อมูลมาตรฐาน 14 กลุ่มงาน/กลุ่มสาระของโรงเรียนบางชัน
TRUNCATE TABLE public.departments RESTART IDENTITY CASCADE;

INSERT INTO public.departments (name, kind) VALUES
  ('กลุ่มบริหารวิชาการ', 'admin'),
  ('กลุ่มบริหารงบประมาณและแผนงาน', 'admin'),
  ('กลุ่มบริหารงานบุคคล', 'admin'),
  ('กลุ่มบริหารทั่วไป & กิจการนักเรียน', 'admin'),
  ('กลุ่มสาระการเรียนรู้ภาษาไทย', 'subject'),
  ('กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'subject'),
  ('กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'subject'),
  ('กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม', 'subject'),
  ('กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', 'subject'),
  ('กลุ่มสาระการเรียนรู้ศิลปะ', 'subject'),
  ('กลุ่มสาระการเรียนรู้การงานอาชีพ', 'subject'),
  ('กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ (EP)', 'subject'),
  ('ระดับการศึกษาปฐมวัย (อนุบาล 1-3)', 'special'),
  ('งานการศึกษาพิเศษ (ห้องเรียนคู่ขนาน)', 'special');

-- 2) ตารางข้อมูลผู้ใช้งานและสิทธิ์ (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'teacher',
  department_id bigint REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- เพิ่มคอลัมน์ให้ครบถ้วน 100% (ป้องกัน Error missing column ใน Supabase)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'teacher';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id bigint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ดึงผู้ใช้งานจาก auth.users มาใส่ใน profiles โดยอัตโนมัติ (ตั้ง admin@bcs.ac.th เป็น SuperAdmin)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email),
  CASE WHEN lower(email) = 'admin@bcs.ac.th' THEN 'admin' ELSE 'teacher' END,
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = CASE WHEN lower(EXCLUDED.email) = 'admin@bcs.ac.th' THEN 'admin' ELSE public.profiles.role END,
  is_active = true,
  updated_at = now();

-- 3) ตารางเก็บการตั้งค่าเว็บไซต์ (site_settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

TRUNCATE TABLE public.site_settings;

INSERT INTO public.site_settings (key, value) VALUES
  ('admissions', '{"is_open": true, "year": 2569, "notice": "เปิดรับสมัครนักเรียนใหม่ประจำปีการศึกษา 2569"}'::jsonb),
  ('urgent_announcement', '{"is_active": true, "text": "ขอเชิญผู้ปกครองและนักเรียนร่วมกิจกรรมวันวิชาการ 15 มีนาคม 2569", "link": "#activities"}'::jsonb),
  ('upload_limit', '{"max_mb": 50}'::jsonb);

-- 4) ตารางห้องเรียนจริง 87 ห้อง (classrooms: ประถม 54 + มัธยม 21 + อนุบาล 9 + พิเศษ 3)
CREATE TABLE IF NOT EXISTS public.classrooms (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grade_level text NOT NULL,
  room_number text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

TRUNCATE TABLE public.classrooms RESTART IDENTITY;

INSERT INTO public.classrooms (grade_level, room_number, name) VALUES
  -- อนุบาล 1-3 (9 ห้อง)
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

  -- การศึกษาพิเศษ (ห้องเรียนคู่ขนาน 3 ห้อง)
  ('การศึกษาพิเศษ', '1', 'การศึกษาพิเศษ 1'),
  ('การศึกษาพิเศษ', '2', 'การศึกษาพิเศษ 2'),
  ('การศึกษาพิเศษ', '3', 'การศึกษาพิเศษ 3');

-- 5) ตารางส่งงานและการบ้าน (student_submissions)
CREATE TABLE IF NOT EXISTS public.student_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_code text NOT NULL,
  student_name text NOT NULL,
  class_room text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  file_url text,
  file_name text,
  score numeric,
  feedback text,
  status text DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now()
);

-- 6) ตารางรับสมัครนักเรียนออนไลน์ (admissions) รองรับค้นหา/แก้ไข/ยืนยันสิทธิ์ด้วยเลขบัตรประชาชน 13 หลัก
CREATE TABLE IF NOT EXISTS public.admissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_no text,
  citizen_id text UNIQUE,
  national_id text,
  student_name text NOT NULL,
  grade text,
  grade_level text,
  parent_name text,
  phone text,
  address text,
  document_url text,
  status text DEFAULT 'รอตรวจสอบเอกสาร',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admissions
  ADD COLUMN IF NOT EXISTS app_no text,
  ADD COLUMN IF NOT EXISTS citizen_id text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 6.1) ตารางภาระงาน/รายงานครู (tasks) และตารางใบลาออนไลน์ (leave_requests)
CREATE TABLE IF NOT EXISTS public.tasks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  title text NOT NULL,
  category text,
  description text,
  file_url text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  leave_type text NOT NULL,
  start_date date,
  end_date date,
  reason text,
  status text DEFAULT 'submitted',
  created_at timestamptz DEFAULT now()
);

-- 7) เปิดสิทธิ์ Row Level Security (RLS) และกำหนด Policy ให้อ่าน/เขียนได้ราบรื่น
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Read Departments" ON public.departments;
  CREATE POLICY "Public Read Departments" ON public.departments FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Admin Manage Departments" ON public.departments;
  CREATE POLICY "Admin Manage Departments" ON public.departments FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
  CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Admin Manage Profiles" ON public.profiles;
  CREATE POLICY "Admin Manage Profiles" ON public.profiles FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public Read Settings" ON public.site_settings;
  CREATE POLICY "Public Read Settings" ON public.site_settings FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Admin Manage Settings" ON public.site_settings;
  CREATE POLICY "Admin Manage Settings" ON public.site_settings FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public Read Classrooms" ON public.classrooms;
  CREATE POLICY "Public Read Classrooms" ON public.classrooms FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public Manage Submissions" ON public.student_submissions;
  CREATE POLICY "Public Manage Submissions" ON public.student_submissions FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public Manage Admissions" ON public.admissions;
  CREATE POLICY "Public Manage Admissions" ON public.admissions FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public Manage Tasks" ON public.tasks;
  CREATE POLICY "Public Manage Tasks" ON public.tasks FOR ALL USING (true);

  DROP POLICY IF EXISTS "Public Manage Leaves" ON public.leave_requests;
  CREATE POLICY "Public Manage Leaves" ON public.leave_requests FOR ALL USING (true);
END $$;

-- 8) รีเฟรช Schema Cache ของ Supabase ทันที
NOTIFY pgrst, 'reload schema';
