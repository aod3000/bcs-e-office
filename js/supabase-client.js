/* ============================================
   supabase-client.js - ตั้งค่าและเชื่อมต่อ Supabase
   ต้องโหลดหลัง supabase-js (CDN) และก่อนไฟล์ js อื่นๆ
   ============================================ */

/* ⚠️ กรอกค่าจริงจาก Supabase Dashboard > Project Settings > API */
// แก้ไข 1: ตัด /rest/v1/ ออก เหลือแค่ URL หลัก
const SUPABASE_URL = 'https://kbamwoqbbfqovqzamzui.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiYW13b3FiYmZxb3ZxemFtenVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMzM2OTIsImV4cCI6MjEwODkwOTY5Mn0.oo0aAV-W9nyTtasXWaXrFCpuNd-PtQH0ay7byeHtm-0';

// แก้ไข 2: เปลี่ยนชื่อตารางให้ตรงกับ SQL ที่เราสร้างไว้ในระบบ E-Office
const TASKS_TABLE = 'tasks'; 

let supabaseClient = null;

/** ตรวจว่ากรอกค่า Supabase ครบแล้วหรือยัง */
function isSupabaseConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_');
}

/** สร้าง client ครั้งเดียวแล้วใช้ซ้ำ */
function getSupabase() {
  if (!window.supabase) throw new Error('โหลดไลบรารี Supabase ไม่สำเร็จ');
  if (!isSupabaseConfigured()) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_ANON_KEY ใน js/supabase-client.js');
  if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

/** บันทึกข้อมูลงานลงตาราง tasks */
async function insertTask(record) {
  const { data, error } = await getSupabase().from(TASKS_TABLE).insert([record]).select();
  if (error) throw new Error('บันทึกฐานข้อมูลไม่สำเร็จ: ' + error.message);
  return data;
}