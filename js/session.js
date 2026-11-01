/* ============================================
   session.js - หน้าแรก: แสดงสถานะล็อกอิน และพาไปพื้นที่ทำงานเมื่อกลับมาจาก Google OAuth
   ต้องโหลดหลัง supabase-js (CDN) และ supabase-client.js
   ============================================ */

const WORKSPACE_URL = 'pages/teacher-workspace.html';

document.addEventListener('DOMContentLoaded', initHomeSession);

/** ตรวจ session: ถ้าเพิ่งกลับจาก OAuth ให้ไปพื้นที่ทำงาน ถ้าล็อกอินอยู่แล้วให้เปลี่ยนปุ่มเข้าสู่ระบบ */
async function initHomeSession() {
  if (!window.supabase || !isSupabaseConfigured()) return;
  try {
    // getSession() จะรอให้ Supabase แลก code/token ใน URL เป็น session เสร็จก่อน
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw error;
    const user = data.session && data.session.user;
    if (!user) return;

    // เพิ่งกลับมาจาก Google (มี code/token ใน URL) -> ไปพื้นที่ทำงานเลย
    const returning = /[?&#](code|access_token)=/.test(window.location.search + window.location.hash);
    if (returning) { window.location.replace(WORKSPACE_URL); return; }

    // ล็อกอินอยู่แล้ว: ปุ่ม "เข้าสู่ระบบ" -> "พื้นที่ทำงาน" และแสดงอีเมล
    document.querySelectorAll('[data-login-link]').forEach((el) => {
      el.setAttribute('href', WORKSPACE_URL);
      if (el.dataset.loginLink === 'button') el.textContent = 'พื้นที่ทำงาน';
    });
    const chip = document.getElementById('nav-user-email');
    if (chip) { chip.textContent = '👤 ' + user.email; chip.classList.add('xl:inline-flex'); } // แสดงเฉพาะจอกว้าง ไม่ให้ Navbar แน่น
  } catch (err) {
    console.warn('ตรวจ session หน้าแรกไม่สำเร็จ', err.message || err);
  }
}
