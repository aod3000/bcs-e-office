/* ============================================
   session.js - หน้าแรก: แสดงสถานะล็อกอิน และพาไปพื้นที่ทำงานเมื่อกลับมาจาก Google OAuth
   ต้องโหลดหลัง supabase-js (CDN) และ supabase-client.js
   ============================================ */

const WORKSPACE_URL = 'pages/teacher-workspace.html';
const ADMIN_URL = 'pages/admin-panel.html';

document.addEventListener('DOMContentLoaded', initHomeSession);

/** ตรวจ session: ถ้าเพิ่งกลับจาก OAuth ให้ไปพื้นที่ทำงาน ถ้าล็อกอินอยู่แล้วให้เปลี่ยนปุ่มเข้าสู่ระบบ */
async function initHomeSession() {
  if (!window.supabase || !isSupabaseConfigured()) return;
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw error;
    const user = data.session && data.session.user;
    if (!user) return;

    // ตรวจสอบสถานะ Admin
    const isSuperAdmin = user.email && user.email.toLowerCase() === 'admin@bcs.ac.th';
    let isAdmin = isSuperAdmin;

    if (!isAdmin) {
      try {
        const { data: profile } = await getSupabase()
          .from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile && profile.role === 'admin') isAdmin = true;
      } catch (e) { /* ignore */ }
    }

    const destination = isAdmin ? ADMIN_URL : WORKSPACE_URL;

    // เพิ่งกลับมาจาก Google (มี code/token ใน URL) -> ไปหน้าที่เหมาะสมเลย
    const returning = /[?&#](code|access_token)=/.test(window.location.search + window.location.hash);
    if (returning) { window.location.replace(destination); return; }

    // ล็อกอินอยู่แล้ว: ปรับลิงก์ปุ่ม "เข้าสู่ระบบ"
    document.querySelectorAll('[data-login-link]').forEach((el) => {
      el.setAttribute('href', destination);
      if (el.dataset.loginLink === 'button') {
        el.textContent = isAdmin ? '⚙️ ระบบหลังบ้าน' : 'พื้นที่ทำงาน';
      }
    });

    const chip = document.getElementById('nav-user-email');
    if (chip) {
      chip.textContent = (isAdmin ? '👑 ' : '👤 ') + user.email;
      chip.classList.add('xl:inline-flex');
    }
  } catch (err) {
    console.warn('ตรวจ session หน้าแรกไม่สำเร็จ', err.message || err);
  }
}
