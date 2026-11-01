-- =====================================================================
-- schema.sql - Sprint 2: Users (RBAC), Tasks/Reports, Leave Requests
-- โรงเรียนบางชันปลื้มวิทยานุสรณ์ | รันใน Supabase > SQL Editor (รันครั้งเดียว)
--
-- Workflow งาน : pending -> reviewed / revision_requested -> approved
-- Workflow ลา  : submitted -> head_approved -> approved   (หรือ rejected)
-- =====================================================================

-- ---------- 1) ชนิดข้อมูล Enum ----------
create type public.user_role    as enum ('student', 'teacher', 'head', 'executive', 'admin');
create type public.task_status  as enum ('pending', 'revision_requested', 'reviewed', 'approved');
create type public.leave_type   as enum ('sick', 'personal', 'out_of_school');   -- ลาป่วย, ลากิจ, ออกนอกสถานที่
create type public.leave_status as enum ('submitted', 'head_approved', 'approved', 'rejected');

-- ---------- 2) departments: สายชั้น / กลุ่มสาระ / กลุ่มพิเศษ ----------
create table public.departments (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  kind       text not null check (kind in ('grade_level', 'subject_group', 'special')),
  created_at timestamptz not null default now()
);

-- ---------- 3) profiles: ผู้ใช้ + Role (ผูก 1:1 กับ Supabase Auth) ----------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  role          public.user_role not null default 'student',   -- สิทธิ์ต่ำสุดเป็นค่าเริ่มต้น Admin เป็นผู้เลื่อนระดับ
  department_id bigint references public.departments(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_department_idx on public.profiles(department_id);

-- ---------- 4) tasks: งาน/รายงาน + Status + Comment ----------
create table public.tasks (
  id               bigint generated always as identity primary key,
  owner_id         uuid not null default auth.uid() references public.profiles(id),
  title            text not null,
  category         text not null,                  -- เช่น สายชั้น / กลุ่มสาระ / กลุ่มพิเศษ / ประกาศข่าว
  description      text,
  file_url         text,                           -- URL ไฟล์ใน Google Drive (จาก GAS)
  file_name        text,
  mime_type        text,
  status           public.task_status not null default 'pending',
  reviewer_comment text,                           -- คอมเมนต์ล่าสุดจากผู้ตรวจ/ตีกลับ
  reviewed_by      uuid references public.profiles(id),
  reviewed_at      timestamptz,
  approved_by      uuid references public.profiles(id),
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tasks_owner_idx  on public.tasks(owner_id);
create index tasks_status_idx on public.tasks(status);

-- ประวัติการเปลี่ยนสถานะ (Audit Trail ใช้เป็นหลักฐานใน Receipt) บันทึกอัตโนมัติด้วย trigger
create table public.task_events (
  id          bigint generated always as identity primary key,
  task_id     bigint not null references public.tasks(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  from_status public.task_status,
  to_status   public.task_status not null,
  comment     text,
  created_at  timestamptz not null default now()
);
create index task_events_task_idx on public.task_events(task_id);

-- ---------- 5) leave_requests: ระบบลา/ขออนุญาตออกนอกสถานศึกษา ----------
create table public.leave_requests (
  id           bigint generated always as identity primary key,
  requester_id uuid not null default auth.uid() references public.profiles(id),
  leave_type   public.leave_type not null,
  start_at     timestamptz not null,               -- เก็บวัน-เวลา (จำเป็นสำหรับออกนอกสถานที่)
  end_at       timestamptz not null,
  reason       text not null,
  status       public.leave_status not null default 'submitted',
  head_id      uuid references public.profiles(id),
  head_at      timestamptz,
  head_comment text,
  exec_id      uuid references public.profiles(id),
  exec_at      timestamptz,
  exec_comment text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_at >= start_at)
);
create index leave_requester_idx on public.leave_requests(requester_id);
create index leave_status_idx    on public.leave_requests(status);
create index leave_range_idx     on public.leave_requests(start_at, end_at);

-- =====================================================================
-- ฟังก์ชันช่วย (security definer เพื่อไม่ให้ RLS วนซ้ำตัวเอง)
-- =====================================================================
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.current_user_dept()
returns bigint language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid() and is_active
$$;

-- TRUE เมื่อผู้ใช้ปัจจุบันเป็น Head และ target อยู่กลุ่มเดียวกัน
create or replace function public.is_head_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'head'
     and public.current_user_dept() is not null
     and exists (select 1 from public.profiles t
                 where t.id = target and t.department_id = public.current_user_dept())
$$;

-- =====================================================================
-- Triggers
-- =====================================================================

-- อัปเดต updated_at อัตโนมัติ
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger tasks_updated    before update on public.tasks    for each row execute function public.set_updated_at();
create trigger leave_updated    before update on public.leave_requests for each row execute function public.set_updated_at();

-- สร้าง profile อัตโนมัติเมื่อสมัคร/ล็อกอินครั้งแรก และบล็อกอีเมลนอกโดเมน @bcs.ac.th
-- (ถ้า raise exception การสร้างบัญชีจะถูกยกเลิกทั้งหมด)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(split_part(new.email, '@', 2)) <> 'bcs.ac.th' then
    raise exception 'อนุญาตเฉพาะอีเมล @bcs.ac.th เท่านั้น';
  end if;
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ป้องกันผู้ใช้แก้ role / กลุ่ม / สถานะบัญชี ของตัวเอง (เฉพาะ Admin หรือ SQL Editor แก้ได้)
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.current_user_role() = 'admin' then return new; end if;
  new.id := old.id; new.email := old.email; new.role := old.role;
  new.department_id := old.department_id; new.is_active := old.is_active;
  return new;
end $$;
create trigger profiles_guard_trg before update on public.profiles for each row execute function public.profiles_guard();

-- ควบคุม Workflow ของ tasks ตาม Role (ฝั่งฐานข้อมูล แก้จากเบราว์เซอร์ไม่ได้)
create or replace function public.tasks_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.user_role := public.current_user_role();
  uid uuid := auth.uid();
  v_comment text := new.reviewer_comment;
begin
  if uid is null or r = 'admin' then return new; end if;

  -- ล็อกคอลัมน์ผู้ตรวจไว้ก่อน แล้วค่อยประทับตราตามสิทธิ์ด้านล่าง
  new.reviewer_comment := old.reviewer_comment;
  new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  new.approved_by := old.approved_by; new.approved_at := old.approved_at;
  new.owner_id := old.owner_id;

  if uid = old.owner_id then
    -- เจ้าของงาน: ส่งซ้ำได้เฉพาะตอนถูกตีกลับ และอนุมัติงานตัวเองไม่ได้
    if new.status is distinct from old.status
       and not (old.status = 'revision_requested' and new.status = 'pending') then
      raise exception 'เจ้าของงานเปลี่ยนสถานะได้เฉพาะส่งงานซ้ำหลังถูกตีกลับ';
    end if;
    return new;
  end if;

  -- ผู้ตรวจ: แก้เนื้อหางานไม่ได้
  new.title := old.title; new.category := old.category; new.description := old.description;
  new.file_url := old.file_url; new.file_name := old.file_name; new.mime_type := old.mime_type;

  if new.status = old.status then return new; end if;

  if r = 'head' and old.status = 'pending' and new.status in ('reviewed', 'revision_requested') then
    new.reviewer_comment := v_comment; new.reviewed_by := uid; new.reviewed_at := now();
  elsif r = 'executive' and old.status = 'reviewed' and new.status in ('approved', 'revision_requested') then
    new.reviewer_comment := v_comment;
    if new.status = 'approved' then new.approved_by := uid; new.approved_at := now();
    else new.reviewed_by := uid; new.reviewed_at := now(); end if;
  else
    raise exception 'ไม่มีสิทธิ์เปลี่ยนสถานะงานนี้ (% -> %)', old.status, new.status;
  end if;
  return new;
end $$;
create trigger tasks_guard_trg before update on public.tasks for each row execute function public.tasks_guard();

-- บันทึกประวัติเมื่อสถานะงานเปลี่ยน
create or replace function public.tasks_log_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.task_events (task_id, actor_id, from_status, to_status, comment)
    values (new.id, auth.uid(), old.status, new.status, new.reviewer_comment);
  end if;
  return new;
end $$;
create trigger tasks_log_trg after update on public.tasks for each row execute function public.tasks_log_event();

-- ควบคุม Workflow ของใบลา
create or replace function public.leave_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.user_role := public.current_user_role();
  uid uuid := auth.uid();
  v_head_comment text := new.head_comment;
  v_exec_comment text := new.exec_comment;
  req_role public.user_role;
begin
  if uid is null or r = 'admin' then return new; end if;

  new.head_id := old.head_id; new.head_at := old.head_at; new.head_comment := old.head_comment;
  new.exec_id := old.exec_id; new.exec_at := old.exec_at; new.exec_comment := old.exec_comment;
  new.requester_id := old.requester_id;

  if uid = old.requester_id then
    new.status := old.status;     -- ผู้ยื่นแก้ได้เฉพาะรายละเอียดตอนยัง submitted (คุมด้วย RLS)
    return new;
  end if;

  new.leave_type := old.leave_type; new.start_at := old.start_at;
  new.end_at := old.end_at; new.reason := old.reason;

  if new.status = old.status then return new; end if;

  select role into req_role from public.profiles where id = old.requester_id;

  if r = 'head' and old.status = 'submitted' and new.status in ('head_approved', 'rejected') then
    new.head_comment := v_head_comment; new.head_id := uid; new.head_at := now();
  elsif r = 'executive' and old.status = 'head_approved' and new.status in ('approved', 'rejected') then
    new.exec_comment := v_exec_comment; new.exec_id := uid; new.exec_at := now();
  elsif r = 'executive' and old.status = 'submitted' and req_role in ('head', 'executive')
        and new.status in ('approved', 'rejected') then
    -- ใบลาของ Head/Executive ไม่มีขั้น Head ให้ Executive อนุมัติโดยตรง
    new.exec_comment := v_exec_comment; new.exec_id := uid; new.exec_at := now();
  else
    raise exception 'ไม่มีสิทธิ์เปลี่ยนสถานะใบลานี้ (% -> %)', old.status, new.status;
  end if;
  return new;
end $$;
create trigger leave_guard_trg before update on public.leave_requests for each row execute function public.leave_guard();

-- =====================================================================
-- Row Level Security (RLS)
-- =====================================================================
alter table public.departments    enable row level security;
alter table public.profiles       enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_events    enable row level security;
alter table public.leave_requests enable row level security;

-- departments: ทุกคนที่ล็อกอินอ่านได้ / Admin จัดการ
create policy dept_select on public.departments for select to authenticated using (true);
create policy dept_admin  on public.departments for all    to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- profiles: อ่านของตัวเอง / Admin, Executive อ่านทั้งหมด / Head อ่านคนในกลุ่ม
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.current_user_role() in ('admin', 'executive')
  or public.is_head_of(id)
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin');   -- คอลัมน์สำคัญถูกล็อกด้วย profiles_guard

-- tasks
create policy tasks_select on public.tasks for select to authenticated using (
  owner_id = auth.uid()
  or public.current_user_role() in ('admin', 'executive')
  or public.is_head_of(owner_id)
);
create policy tasks_insert on public.tasks for insert to authenticated with check (
  owner_id = auth.uid() and status = 'pending'
  and public.current_user_role() in ('teacher', 'head', 'executive', 'admin')
);
create policy tasks_update on public.tasks for update to authenticated using (
  (owner_id = auth.uid() and status in ('pending', 'revision_requested'))
  or public.current_user_role() in ('admin', 'executive')
  or public.is_head_of(owner_id)
);
create policy tasks_delete on public.tasks for delete to authenticated using (
  (owner_id = auth.uid() and status = 'pending') or public.current_user_role() = 'admin'
);

-- task_events: อ่านได้เท่าที่มองเห็นงานนั้น (เขียนผ่าน trigger เท่านั้น)
create policy task_events_select on public.task_events for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

-- leave_requests
create policy leave_select on public.leave_requests for select to authenticated using (
  requester_id = auth.uid()
  or public.current_user_role() in ('admin', 'executive')
  or public.is_head_of(requester_id)
);
create policy leave_insert on public.leave_requests for insert to authenticated with check (
  requester_id = auth.uid() and status = 'submitted'
  and public.current_user_role() in ('teacher', 'head', 'executive', 'admin')
);
create policy leave_update on public.leave_requests for update to authenticated using (
  (requester_id = auth.uid() and status = 'submitted')
  or public.current_user_role() in ('admin', 'executive')
  or public.is_head_of(requester_id)
);
create policy leave_delete on public.leave_requests for delete to authenticated using (
  (requester_id = auth.uid() and status = 'submitted') or public.current_user_role() = 'admin'
);

-- =====================================================================
-- Daily Dashboard: บุคลากรที่ลา/ออกนอกสถานที่ "วันนี้" (เวลาไทย) เฉพาะที่อนุมัติแล้ว
-- security_invoker = ผู้ใช้เห็นเท่าที่ RLS ของตนอนุญาต (Executive/Admin เห็นทั้งหมด)
-- =====================================================================
create view public.daily_staff_status with (security_invoker = true) as
select p.id as user_id, p.full_name, p.department_id,
       l.id as leave_id, l.leave_type, l.start_at, l.end_at, l.reason
from public.leave_requests l
join public.profiles p on p.id = l.requester_id
where l.status = 'approved'
  and l.start_at <  (((now() at time zone 'Asia/Bangkok')::date + 1)::timestamp at time zone 'Asia/Bangkok')
  and l.end_at   >= ((now() at time zone 'Asia/Bangkok')::date::timestamp at time zone 'Asia/Bangkok');

-- =====================================================================
-- หลังรันเสร็จ: ตั้ง Admin คนแรกด้วยตนเอง (หลังล็อกอินด้วย Google ครั้งแรก)
--   update public.profiles set role = 'admin' where email = 'your.name@bcs.ac.th';
-- =====================================================================
