/* ============================================
   admin-cms.js - ควบคุมหน้าระบบจัดการหลังบ้าน (Admin CMS)
   ตรวจสอบสิทธิ์ Admin / IT, สลับแท็บ, และอัปโหลดไฟล์ผ่าน GAS สู่ Google Drive
   ============================================ */

const GAS_UPLOAD_URL = 'https://script.google.com/macros/s/AKfycbzWauxGLUEvpjQseK1bd509Il27vN33jxgqxVhj65fsm5me-fSI61By2SNIUlE5aQvr/exec';

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  initAdminTabs();
  initActivityUpload();
});

/** ตรวจสอบสิทธิ์ผู้ดูแลระบบ */
async function initAdminAuth() {
  const emailBadge = document.getElementById('admin-user-email');
  const logoutBtn = document.getElementById('admin-logout-btn');

  try {
    if (!window.supabase || !isSupabaseConfigured()) return;
    const { data } = await getSupabase().auth.getSession();
    const user = data.session && data.session.user;

    if (!user) {
      window.location.replace('../login.html');
      return;
    }

    if (emailBadge) emailBadge.textContent = '👤 ' + user.email;

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await getSupabase().auth.signOut();
        window.location.replace('../index.html');
      });
    }
  } catch (err) {
    console.warn('ตรวจสอบสิทธิ์แอดมินล้มเหลว', err);
  }
}

/** ควบคุมการสลับแท็บเมนู */
function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('bg-blue-900', 'text-white', 'shadow');
        b.classList.add('text-slate-600', 'hover:bg-slate-100');
      });
      btn.classList.add('bg-blue-900', 'text-white', 'shadow');
      btn.classList.remove('text-slate-600', 'hover:bg-slate-100');

      const target = btn.dataset.tabTarget;
      tabContents.forEach(c => {
        if (c.id === target) {
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
        }
      });
    });
  });
}

/** ฟอร์มอัปโหลดภาพกิจกรรม ส่งตรงเข้า Google Drive ผ่าน GAS */
function initActivityUpload() {
  const form = document.getElementById('activity-form');
  if (!form) return;

  const fileInput = document.getElementById('act-file');
  const submitBtn = document.getElementById('act-submit-btn');
  const btnText = document.getElementById('act-btn-text');
  const spinner = document.getElementById('act-spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
      alert('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    const title = document.getElementById('act-title').value.trim();
    const category = document.getElementById('act-category').value;
    const desc = document.getElementById('act-desc').value.trim();

    try {
      submitBtn.disabled = true;
      spinner.classList.remove('hidden');
      btnText.textContent = 'กำลังส่งไฟล์เข้า Google Drive...';

      // 1. แปลงไฟล์เป็น Base64
      const base64 = await fileToBase64(file);

      // 2. ส่งไปยัง Google Apps Script (บันทึกลงโฟลเดอร์ Google Drive)
      const res = await fetch(GAS_UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          base64: base64,
          fileName: file.name,
          mimeType: file.type,
          category: 'activities'
        })
      });

      const result = await res.json();
      const driveUrl = result.url || result.fileUrl;

      // 3. บันทึกข้อมูลลงตาราง Supabase (tasks หรือ activities)
      if (isSupabaseConfigured() && window.supabase) {
        await getSupabase().from('tasks').insert([{
          title: title,
          category: 'ภาพกิจกรรม_' + category,
          description: desc,
          file_url: driveUrl,
          file_name: file.name,
          mime_type: file.type,
          status: 'approved'
        }]);
      }

      alert('✅ เพิ่มภาพกิจกรรมและเก็บไฟล์ลง Google Drive สำเร็จเรียบร้อยแล้ว!');
      form.reset();
    } catch (err) {
      console.error(err);
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      spinner.classList.add('hidden');
      btnText.textContent = 'อัปโหลดและบันทึกข้อมูล';
    }
  });
}

/** แปลงไฟล์เป็น Base64 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}
