/* ============================================
   workspace.js - พื้นที่ทำงานครู: ตรวจ Auth, แสดง Email, Logout, สรุป Dashboard
   ต้องโหลดหลัง supabase-js (CDN) และ supabase-client.js
   ============================================ */

const LOGIN_REDIRECT = '../index.html'; // ยังไม่ล็อกอิน/ออกจากระบบ -> กลับหน้าแรก

document.addEventListener('DOMContentLoaded', initWorkspace);

/** ตรวจ session: ไม่มี -> redirect, มี -> เปิดหน้าและโหลดข้อมูลผู้ใช้กับตัวเลขสรุป */
async function initWorkspace() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    const user = data.session && data.session.user;
    if (!user) { window.location.replace(LOGIN_REDIRECT); return; }

    // ป้องกันซ้ำ: อนุญาตเฉพาะอีเมลโดเมนโรงเรียน
    if (!/@bcs\.ac\.th$/i.test(user.email || '')) {
      await sb.auth.signOut();
      alert('อนุญาตเฉพาะบัญชี @bcs.ac.th เท่านั้น');
      window.location.replace(LOGIN_REDIRECT);
      return;
    }

    // ออกจากระบบจากแท็บอื่น/โทเคนหมดอายุ -> กลับหน้าแรกทันที
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.replace(LOGIN_REDIRECT);
    });

    document.getElementById('user-email').textContent = user.email;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.body.classList.remove('invisible'); // แสดงหน้าหลังยืนยันตัวตนแล้ว

    loadRole(user.id);
    loadTaskSummary();
    loadLeaveSummary();
    initLeaveForm(user);
  } catch (err) {
    console.error(err);
    window.location.replace(LOGIN_REDIRECT);
  }
}

/** ออกจากระบบผ่าน Supabase Auth แล้วกลับหน้าแรก */
async function handleLogout() {
  const btn = document.getElementById('logout-btn');
  btn.disabled = true;
  try {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
    window.location.replace(LOGIN_REDIRECT);
  } catch (err) {
    console.error(err);
    alert('❌ ออกจากระบบไม่สำเร็จ: ' + err.message);
    btn.disabled = false;
  }
}

const ROLE_LABELS = { student: 'นักเรียน', teacher: 'ครู', head: 'หัวหน้า', executive: 'ผู้บริหาร', admin: 'ผู้ดูแลระบบ' };

/** แสดง Role ของผู้ใช้จากตาราง profiles (ถ้าอ่านไม่ได้ก็ไม่แสดง badge) */
async function loadRole(userId) {
  try {
    const { data, error } = await getSupabase().from('profiles').select('role').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return; // ยังไม่มีโปรไฟล์ ไม่แสดง badge
    const badge = document.getElementById('user-role');
    badge.textContent = ROLE_LABELS[data.role] || data.role;
    badge.classList.remove('hidden');
  } catch (err) {
    console.warn('โหลด role ไม่สำเร็จ', err.message || err);
  }
}

/** นับจำนวนตามสถานะ แล้วใส่ลง element ตาม id (ผลลัพธ์เป็นไปตาม RLS ของผู้ใช้) */
async function fillCounts(table, statusMap) {
  try {
    const { data, error } = await getSupabase().from(table).select('status');
    if (error) throw error;
    const counts = {};
    data.forEach((row) => { counts[row.status] = (counts[row.status] || 0) + 1; });
    Object.entries(statusMap).forEach(([status, elId]) => {
      document.getElementById(elId).textContent = counts[status] || 0;
    });
    return data.length;
  } catch (err) {
    console.warn(`โหลดสรุปตาราง ${table} ไม่สำเร็จ`, err.message || err);
    Object.values(statusMap).forEach((elId) => { document.getElementById(elId).textContent = '0'; });
    return 0;
  }
}

/** สรุปภาระงาน (ตาราง tasks) */
async function loadTaskSummary() {
  const total = await fillCounts('tasks', {
    pending: 'task-pending', revision_requested: 'task-revision', approved: 'task-approved'
  });
  document.getElementById('task-total').textContent = total === null ? '0' : total;
}

/** สรุปการลา (ตาราง leave_requests) */
async function loadLeaveSummary() {
  const total = await fillCounts('leave_requests', {
    submitted: 'leave-submitted', head_approved: 'leave-head', approved: 'leave-approved'
  });
  document.getElementById('leave-total').textContent = total === null ? '0' : total;
}

/** ฟอร์มยื่นใบลาออนไลน์สำหรับครูและบุคลากร */
function initLeaveForm(user) {
  const form = document.getElementById('leave-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('leave-submit-btn');
    const leaveType = document.getElementById('leave-type').value;
    const startDate = document.getElementById('leave-start').value;
    const endDate = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value.trim();

    if (btn) btn.disabled = true;
    try {
      const payload = {
        user_id: user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: 'submitted'
      };

      try {
        const { error } = await getSupabase().from('leave_requests').insert([payload]);
        if (error) throw error;
      } catch (dbErr) {
        console.warn('บันทึกลง leave_requests fallback localStorage:', dbErr);
        const localLeaves = JSON.parse(localStorage.getItem('bcs_leave_requests') || '[]');
        localLeaves.unshift({ ...payload, created_at: new Date().toISOString() });
        localStorage.setItem('bcs_leave_requests', JSON.stringify(localLeaves));
      }

      alert(`✅ ส่งใบลา (${leaveType}) ตั้งแต่วันที่ ${startDate} ถึง ${endDate} เรียบร้อยแล้ว!`);
      form.reset();
      loadLeaveSummary();
    } catch (err) {
      alert('❌ ส่งใบลาไม่สำเร็จ: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
