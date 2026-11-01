/* =====================================================================
   admin-cms.js - ระบบบริหารจัดการหลังบ้าน (BCS SuperAdmin Control Center)
   โรงเรียนบางชัน (ปลื้มวิทยานุสรณ์)
   - จัดการสิทธิ์และบทบาทผู้ใช้ (User & Role Management)
   - ตรวจและอนุมัติภาระงาน / รายงานครู (Task Approval Workflow)
   - ตรวจและอนุมัติใบลาออนไลน์ (Leave Approval Workflow)
   - ระบบเพิ่ม/ลบ ภาพกิจกรรมและข่าวสาร ผ่าน GAS ลง Google Drive (CMS)
   - จัดการทำเนียบบุคลากรและช่องทางติดต่อโซเชียลมีเดีย
   ===================================================================== */

const GAS_UPLOAD_URL = 'https://script.google.com/macros/s/AKfycbzWauxGLUEvpjQseK1bd509Il27vN33jxgqxVhj65fsm5me-fSI61By2SNIUlE5aQvr/exec';

// หน่วยความจำชั่วคราวสำหรับข้อมูลหน้าหลังบ้าน
let currentUser = null;
let currentProfile = null;
let allUsers = [];
let allDepartments = [];
let allTasks = [];
let currentFilterRole = 'all';
let currentSearchTerm = '';
let pendingRevisionTaskId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initAdminTabs();
  await initAdminAuth();
  await loadDepartments();
  await loadUsers();
  await loadTasks();
  await loadLeaveRequests();
  await loadActivities();
  loadStaffDirectory();
  initActivityUpload();
  initRevisionModal();
  initAttendanceModule();
  initOnePageReportModule();
  initCsvAndIndividualCrud();
  initBannersModule();
  initUploadLimitModule();
});

/* =====================================================================
   1. AUTH & PERMISSIONS
   ===================================================================== */
async function initAdminAuth() {
  const emailBadge = document.getElementById('admin-user-email');
  const roleBadge = document.getElementById('admin-user-role-tag');
  const logoutBtn = document.getElementById('admin-logout-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (window.supabase && isSupabaseConfigured()) {
        await getSupabase().auth.signOut();
      }
      window.location.replace('../index.html');
    });
  }

  try {
    if (!window.supabase || !isSupabaseConfigured()) {
      showToast('⚠️ กรุณาตั้งค่า Supabase URL และ Key', 'warning');
      return;
    }

    const { data } = await getSupabase().auth.getSession();
    currentUser = data.session && data.session.user;

    if (!currentUser) {
      window.location.replace('../login.html');
      return;
    }

    const isSuperAdminEmail = currentUser.email.toLowerCase() === 'admin@bcs.ac.th';

    // ดึงข้อมูลโปรไฟล์จาก Supabase
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    currentProfile = profile;

    // ตรวจสอบสิทธิ์การเข้าใช้งาน
    const isAuthorized = isSuperAdminEmail || (profile && ['admin', 'executive'].includes(profile.role));

    if (!isAuthorized) {
      alert('ขออภัย คุณไม่มีสิทธิ์เข้าถึงระบบจัดการหลังบ้าน (เฉพาะผู้ดูแลระบบและผู้บริหารเท่านั้น)');
      window.location.replace('teacher-workspace.html');
      return;
    }

    if (emailBadge) emailBadge.textContent = currentUser.email;
    if (roleBadge) {
      roleBadge.textContent = isSuperAdminEmail ? '👑 SuperAdmin' : (profile ? profile.role.toUpperCase() : 'ADMIN');
    }
  } catch (err) {
    console.warn('ตรวจสอบสิทธิ์แอดมินล้มเหลว', err);
  }
}

/* =====================================================================
   2. TAB SWITCHING
   ===================================================================== */
function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active', 'bg-emerald-800', 'text-white', 'shadow');
        b.classList.add('text-slate-600', 'hover:bg-slate-100');
      });

      btn.classList.add('active', 'bg-emerald-800', 'text-white', 'shadow');
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

/* =====================================================================
   3. DEPARTMENTS & USERS MANAGEMENT (สิทธิ์ & บทบาท)
   ===================================================================== */
async function loadDepartments() {
  try {
    if (!window.supabase || !isSupabaseConfigured()) return;
    const { data, error } = await getSupabase().from('departments').select('*').order('id');
    if (!error && data) {
      allDepartments = data;
    }
  } catch (err) {
    console.warn('โหลดรายชื่อกลุ่มงานไม่สำเร็จ:', err);
  }
}

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  try {
    if (!window.supabase || !isSupabaseConfigured()) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">ยังไม่ได้เชื่อมต่อ Supabase</td></tr>';
      return;
    }

    const { data: users, error } = await getSupabase()
      .from('profiles')
      .select('*, departments(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allUsers = users || [];
    updateUserStats(allUsers);
    renderUsersTable(allUsers);

    // Bind Filter & Search
    const searchInput = document.getElementById('user-search-input');
    const roleFilter = document.getElementById('user-role-filter');
    const refreshBtn = document.getElementById('refresh-users-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase().trim();
        applyUserFilters();
      });
    }

    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        currentFilterRole = e.target.value;
        applyUserFilters();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ กำลังโหลด...';
        await loadUsers();
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 รีเฟรช';
      });
    }
  } catch (err) {
    console.error('โหลดรายชื่อผู้ใช้ล้มเหลว', err);
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดผู้ใช้: ${err.message}</td></tr>`;
  }
}

function updateUserStats(users) {
  const totalEl = document.getElementById('stat-users-total');
  const adminEl = document.getElementById('stat-users-admin');
  const execEl = document.getElementById('stat-users-exec');
  const headEl = document.getElementById('stat-users-head');
  const teacherEl = document.getElementById('stat-users-teacher');
  const studentEl = document.getElementById('stat-users-student');

  if (totalEl) totalEl.textContent = users.length;
  if (adminEl) adminEl.textContent = users.filter(u => u.role === 'admin' || u.email === 'admin@bcs.ac.th').length;
  if (execEl) execEl.textContent = users.filter(u => u.role === 'executive').length;
  if (headEl) headEl.textContent = users.filter(u => u.role === 'head').length;
  if (teacherEl) teacherEl.textContent = users.filter(u => u.role === 'teacher').length;
  if (studentEl) studentEl.textContent = users.filter(u => u.role === 'student').length;
}

function applyUserFilters() {
  let filtered = allUsers;

  if (currentFilterRole !== 'all') {
    filtered = filtered.filter(u => u.role === currentFilterRole);
  }

  if (currentSearchTerm) {
    filtered = filtered.filter(u => {
      const email = (u.email || '').toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      return email.includes(currentSearchTerm) || name.includes(currentSearchTerm);
    });
  }

  renderUsersTable(filtered);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-slate-400">ไม่พบรายชื่อผู้ใช้งานตามเงื่อนไข</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const isSuperAdmin = user.email.toLowerCase() === 'admin@bcs.ac.th';
    const deptId = user.department_id || (user.departments && user.departments.id) || '';

    // สร้างตัวเลือกกลุ่มงาน
    const deptOptions = allDepartments.map(d => `
      <option value="${d.id}" ${deptId == d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>
    `).join('');

    return `
      <tr class="hover:bg-slate-50 transition" data-user-id="${user.id}">
        <!-- ข้อมูลผู้ใช้ -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold grid place-items-center text-xs shrink-0">
              ${(user.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-slate-900">${escapeHtml(user.full_name || 'ไม่ระบุชื่อ')}</div>
              <div class="text-[11px] text-slate-400">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>

        <!-- กำหนดสิทธิ์ Role -->
        <td class="py-3 px-4">
          ${isSuperAdmin ? `
            <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl shadow-sm">
              <span>👑</span> SuperAdmin (ถาวร)
            </span>
          ` : `
            <select class="user-role-select w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-600 focus:outline-none bg-white font-medium">
              <option value="student" ${user.role === 'student' ? 'selected' : ''}>🎒 นักเรียน (Student)</option>
              <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>👩‍🏫 ครูผู้สอน (Teacher)</option>
              <option value="head" ${user.role === 'head' ? 'selected' : ''}>👔 หัวหน้ากลุ่ม/ฝ่าย (Head)</option>
              <option value="executive" ${user.role === 'executive' ? 'selected' : ''}>🏛️ ผู้บริหาร (Executive)</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 ผู้ดูแลระบบ (Admin)</option>
            </select>
          `}
        </td>

        <!-- สังกัดกลุ่มงาน Department -->
        <td class="py-3 px-4">
          <select class="user-dept-select w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-600 focus:outline-none bg-white">
            <option value="">-- ไม่ระบุกลุ่มงาน --</option>
            ${deptOptions}
          </select>
        </td>

        <!-- สถานะ Active -->
        <td class="py-3 px-4 text-center">
          ${isSuperAdmin ? `
            <span class="text-[11px] font-bold text-emerald-600">● ปกติ</span>
          ` : `
            <select class="user-status-select rounded-xl border border-slate-200 px-2 py-1 text-xs bg-white ${user.is_active ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}">
              <option value="true" ${user.is_active ? 'selected' : ''}>● เปิดใช้งาน</option>
              <option value="false" ${!user.is_active ? 'selected' : ''}>✕ ระงับใช้งาน</option>
            </select>
          `}
        </td>

        <!-- ปุ่มบันทึก -->
        <td class="py-3 px-4 text-right">
          ${isSuperAdmin ? `
            <span class="text-xs text-slate-400">ระบบคุ้มครอง</span>
          ` : `
            <button onclick="saveUserProfile('${user.id}')" class="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
              💾 บันทึก
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

/** บันทึกการเปลี่ยนแปลงสิทธิ์ของผู้ใช้งาน */
window.saveUserProfile = async function(userId) {
  const row = document.querySelector(`tr[data-user-id="${userId}"]`);
  if (!row) return;

  const roleSelect = row.querySelector('.user-role-select');
  const deptSelect = row.querySelector('.user-dept-select');
  const statusSelect = row.querySelector('.user-status-select');

  const newRole = roleSelect ? roleSelect.value : null;
  const newDept = deptSelect && deptSelect.value ? parseInt(deptSelect.value, 10) : null;
  const newStatus = statusSelect ? statusSelect.value === 'true' : true;

  try {
    const updates = {
      is_active: newStatus,
      updated_at: new Date().toISOString()
    };
    if (newRole) updates.role = newRole;
    updates.department_id = newDept;

    const { error } = await getSupabase()
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    showToast('✅ อัปเดตสิทธิ์ผู้ใช้งานเรียบร้อยแล้ว');
    
    // อัปเดตข้อมูลใน local array
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      if (newRole) target.role = newRole;
      target.department_id = newDept;
      target.is_active = newStatus;
      updateUserStats(allUsers);
    }
  } catch (err) {
    console.error('บันทึกสิทธิ์ล้มเหลว', err);
    showToast('❌ บันทึกสิทธิ์ล้มเหลว: ' + err.message, 'error');
  }
};

/* =====================================================================
   4. TASK & REPORT APPROVALS (ตรวจและอนุมัติงาน)
   ===================================================================== */
async function loadTasks() {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;

  try {
    if (!window.supabase || !isSupabaseConfigured()) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-400">ยังไม่ได้เชื่อมต่อ Supabase</td></tr>';
      return;
    }

    const { data: tasks, error } = await getSupabase()
      .from('tasks')
      .select('*, profiles:owner_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allTasks = tasks || [];
    renderTasksTable(allTasks);

    // Bind Filter Buttons
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.task-filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-emerald-800', 'text-white', 'shadow-sm');
          b.classList.add('bg-slate-100', 'text-slate-600');
        });
        btn.classList.add('active', 'bg-emerald-800', 'text-white', 'shadow-sm');
        btn.classList.remove('bg-slate-100', 'text-slate-600');

        const filter = btn.dataset.taskFilter;
        if (filter === 'all') {
          renderTasksTable(allTasks);
        } else {
          renderTasksTable(allTasks.filter(t => t.status === filter));
        }
      });
    });
  } catch (err) {
    console.warn('โหลดรายงานภาระงานไม่สำเร็จ:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
  }
}

function renderTasksTable(tasks) {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;

  if (tasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">ไม่พบรายการงานหรือรายงานในหมวดนี้</td></tr>';
    return;
  }

  tbody.innerHTML = tasks.map(task => {
    const ownerName = task.profiles ? (task.profiles.full_name || task.profiles.email) : 'ไม่ระบุผู้ส่ง';
    const dateStr = new Date(task.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

    let statusBadge = '';
    if (task.status === 'pending') {
      statusBadge = '<span class="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold text-[10px]">รอตรวจ</span>';
    } else if (task.status === 'reviewed') {
      statusBadge = '<span class="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">ผ่านการตรวจเบื้องต้น</span>';
    } else if (task.status === 'approved') {
      statusBadge = '<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">อนุมัติแล้ว</span>';
    } else if (task.status === 'revision_requested') {
      statusBadge = '<span class="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-bold text-[10px]">ตีกลับแก้ไข</span>';
    }

    const driveLink = task.file_url ? `
      <a href="${task.file_url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold underline">
        <span>📂</span> ดูไฟล์ Drive
      </a>
    ` : '<span class="text-slate-400">-</span>';

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900">${escapeHtml(task.title)}</div>
          <div class="text-[11px] text-slate-400">วันที่ส่ง: ${dateStr}</div>
          ${task.reviewer_comment ? `<div class="text-[11px] text-red-600 mt-1">💬 ความเห็น: ${escapeHtml(task.reviewer_comment)}</div>` : ''}
        </td>
        <td class="py-3 px-4 font-medium text-slate-800">${escapeHtml(ownerName)}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[11px]">${escapeHtml(task.category)}</span></td>
        <td class="py-3 px-4">${driveLink}</td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-1.5">
            ${task.status !== 'approved' ? `
              <button onclick="approveTask(${task.id})" class="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition" title="อนุมัติงาน">
                ✓ อนุมัติ
              </button>
            ` : ''}
            ${task.status === 'pending' ? `
              <button onclick="reviewTask(${task.id})" class="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-[11px] font-semibold transition" title="ผ่านการตรวจของหัวหน้า">
                ตรวจแล้ว
              </button>
            ` : ''}
            ${task.status !== 'revision_requested' ? `
              <button onclick="openRevisionDialog(${task.id})" class="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-semibold transition" title="ตีกลับให้แก้ไข">
                ตีกลับ
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.approveTask = async function(taskId) {
  try {
    const { error } = await getSupabase()
      .from('tasks')
      .update({
        status: 'approved',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw error;
    showToast('✅ อนุมัติงานสำเร็จเรียบร้อย');
    await loadTasks();
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
};

window.reviewTask = async function(taskId) {
  try {
    const { error } = await getSupabase()
      .from('tasks')
      .update({
        status: 'reviewed',
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw error;
    showToast('✅ บันทึกสถานะผ่านการตรวจเรียบร้อย');
    await loadTasks();
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
};

function initRevisionModal() {
  const modal = document.getElementById('revision-modal');
  const cancelBtn = document.getElementById('cancel-revision-btn');
  const confirmBtn = document.getElementById('confirm-revision-btn');
  const commentInput = document.getElementById('revision-comment-input');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      pendingRevisionTaskId = null;
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const comment = commentInput.value.trim();
      if (!comment) {
        alert('กรุณาระบุความคิดเห็นหรือจุดที่ต้องแก้ไข');
        return;
      }

      if (!pendingRevisionTaskId) return;

      try {
        confirmBtn.disabled = true;
        const { error } = await getSupabase()
          .from('tasks')
          .update({
            status: 'revision_requested',
            reviewer_comment: comment,
            reviewed_by: currentUser.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', pendingRevisionTaskId);

        if (error) throw error;

        modal.classList.add('hidden');
        commentInput.value = '';
        pendingRevisionTaskId = null;
        showToast('🔄 ตีกลับงานให้แก้ไขเรียบร้อยแล้ว');
        await loadTasks();
      } catch (err) {
        showToast('❌ เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        confirmBtn.disabled = false;
      }
    });
  }
}

window.openRevisionDialog = function(taskId) {
  pendingRevisionTaskId = taskId;
  const modal = document.getElementById('revision-modal');
  const commentInput = document.getElementById('revision-comment-input');
  if (commentInput) commentInput.value = '';
  if (modal) modal.classList.remove('hidden');
};

/* =====================================================================
   5. LEAVE REQUESTS APPROVAL (ตรวจและอนุมัติใบลา)
   ===================================================================== */
async function loadLeaveRequests() {
  const tbody = document.getElementById('leaves-table-body');
  if (!tbody) return;

  try {
    if (!window.supabase || !isSupabaseConfigured()) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-400">ยังไม่ได้เชื่อมต่อ Supabase</td></tr>';
      return;
    }

    const { data: leaves, error } = await getSupabase()
      .from('leave_requests')
      .select('*, requester:requester_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!leaves || leaves.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">ยังไม่มีรายการยื่นใบลาในระบบ</td></tr>';
      return;
    }

    tbody.innerHTML = leaves.map(leave => {
      const requesterName = leave.requester ? (leave.requester.full_name || leave.requester.email) : 'ไม่ระบุ';
      const startDate = new Date(leave.start_at).toLocaleDateString('th-TH');
      const endDate = new Date(leave.end_at).toLocaleDateString('th-TH');
      
      const typeThai = {
        sick: '🤒 ลาป่วย',
        personal: '📋 ลากิจ',
        out_of_school: '🚗 ขอออกนอกสถานศึกษา'
      }[leave.leave_type] || leave.leave_type;

      let statusBadge = '';
      if (leave.status === 'submitted') {
        statusBadge = '<span class="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold text-[10px]">รอการอนุมัติ</span>';
      } else if (leave.status === 'approved') {
        statusBadge = '<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">อนุมัติแล้ว</span>';
      } else if (leave.status === 'rejected') {
        statusBadge = '<span class="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-bold text-[10px]">ไม่อนุมัติ</span>';
      }

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(requesterName)}</td>
          <td class="py-3 px-4 font-medium">${typeThai}</td>
          <td class="py-3 px-4 text-slate-600">${startDate} - ${endDate}</td>
          <td class="py-3 px-4 text-slate-600">${escapeHtml(leave.reason)}</td>
          <td class="py-3 px-4 text-center">${statusBadge}</td>
          <td class="py-3 px-4 text-right">
            ${leave.status === 'submitted' ? `
              <button onclick="approveLeave(${leave.id})" class="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold mr-1">อนุมัติ</button>
              <button onclick="rejectLeave(${leave.id})" class="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold">ปฏิเสธ</button>
            ` : '<span class="text-xs text-slate-400">เสร็จสิ้น</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.warn('โหลดใบลาไม่สำเร็จ:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
  }
}

window.approveLeave = async function(leaveId) {
  try {
    const { error } = await getSupabase()
      .from('leave_requests')
      .update({
        status: 'approved',
        exec_id: currentUser.id,
        exec_at: new Date().toISOString()
      })
      .eq('id', leaveId);

    if (error) throw error;
    showToast('✅ อนุมัติใบลาสำเร็จ');
    await loadLeaveRequests();
  } catch (err) {
    showToast('❌ ไม่สามารถอนุมัติได้: ' + err.message, 'error');
  }
};

window.rejectLeave = async function(leaveId) {
  try {
    const { error } = await getSupabase()
      .from('leave_requests')
      .update({
        status: 'rejected',
        exec_id: currentUser.id,
        exec_at: new Date().toISOString()
      })
      .eq('id', leaveId);

    if (error) throw error;
    showToast('❌ บันทึกการปฏิเสธใบลาแล้ว');
    await loadLeaveRequests();
  } catch (err) {
    showToast('❌ ไม่สามารถดำเนินการได้: ' + err.message, 'error');
  }
};

/* =====================================================================
   6. NEWS & ACTIVITIES CMS (อัปโหลด GAS สู่ Google Drive & บันทึกงาน)
   ==================================================================== */
function initActivityUpload() {
  const form = document.getElementById('activity-form');
  if (!form) return;

  const fileInput = document.getElementById('act-file');
  const submitBtn = document.getElementById('act-submit-btn');
  const btnText = document.getElementById('act-btn-text');
  const spinner = document.getElementById('act-spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = Array.from(fileInput.files);
    if (!files || files.length === 0) {
      alert('กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 รูป');
      return;
    }

    const title = document.getElementById('act-title').value.trim();
    const category = document.getElementById('act-category').value;
    const desc = document.getElementById('act-desc').value.trim();

    try {
      submitBtn.disabled = true;
      spinner.classList.remove('hidden');

      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        btnText.textContent = `กำลังส่งไฟล์เข้า Google Drive (${i + 1}/${files.length})...`;

        // 1. แปลงไฟล์เป็น Base64
        const base64 = await fileToBase64(file);

        // 2. ส่งไปยัง Google Apps Script (บันทึก Google Drive)
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
        const driveUrl = result.url || result.fileUrl || '';

        // 3. บันทึกข้อมูลลงตาราง Supabase tasks (category = 'ภาพกิจกรรม_' + category)
        if (isSupabaseConfigured() && window.supabase && currentUser) {
          await getSupabase().from('tasks').insert([{
            owner_id: currentUser.id,
            title: files.length > 1 ? `${title} (ภาพที่ ${i + 1})` : title,
            category: 'ภาพกิจกรรม_' + category,
            description: desc,
            file_url: driveUrl,
            file_name: file.name,
            mime_type: file.type,
            status: 'approved'
          }]);
        }

        // 4. บันทึกลง local storage เผื่อใช้งานแบบออฟไลน์
        saveLocalActivity({
          title: files.length > 1 ? `${title} (ภาพที่ ${i + 1})` : title,
          category,
          description: desc,
          file_url: driveUrl,
          date: new Date().toISOString()
        });

        uploadedCount++;
      }

      showToast(`✅ เพิ่มภาพกิจกรรม ${uploadedCount} ภาพลง Google Drive สำเร็จเรียบร้อยแล้ว!`);
      form.reset();
      await loadActivities();
    } catch (err) {
      console.error(err);
      showToast('❌ เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      spinner.classList.add('hidden');
      btnText.textContent = 'อัปโหลดและบันทึกข้อมูล';
    }
  });
}

function saveLocalActivity(act) {
  try {
    const list = JSON.parse(localStorage.getItem('bcs_dynamic_activities') || '[]');
    list.unshift(act);
    localStorage.setItem('bcs_dynamic_activities', JSON.stringify(list.slice(0, 20)));
  } catch (e) { /* ignore */ }
}

async function loadActivities() {
  const container = document.getElementById('admin-activities-list');
  if (!container) return;

  try {
    let activities = [];

    if (window.supabase && isSupabaseConfigured()) {
      const { data } = await getSupabase()
        .from('tasks')
        .select('*')
        .like('category', 'ภาพกิจกรรม_%')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) activities = data;
    }

    if (activities.length === 0) {
      activities = JSON.parse(localStorage.getItem('bcs_dynamic_activities') || '[]');
    }

    if (activities.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs">ยังไม่มีรายการภาพกิจกรรมที่อัปโหลด</div>';
      return;
    }

    container.innerHTML = activities.map((act, idx) => `
      <div class="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
        <div class="w-16 h-12 bg-emerald-100 text-emerald-800 rounded-lg grid place-items-center text-lg shrink-0">📷</div>
        <div class="flex-1 min-w-0">
          <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">${escapeHtml(act.category.replace('ภาพกิจกรรม_', ''))}</span>
          <h4 class="text-xs font-bold text-slate-800 truncate mt-0.5">${escapeHtml(act.title)}</h4>
          <p class="text-[10px] text-slate-400">${act.created_at ? new Date(act.created_at).toLocaleDateString('th-TH') : 'เพิ่งเพิ่ม'}</p>
        </div>
        ${act.file_url ? `
          <a href="${act.file_url}" target="_blank" rel="noopener noreferrer" class="text-xs text-emerald-700 hover:underline px-2 py-1">เปิดดู</a>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">กำลังเตรียมแสดงผลภาพกิจกรรม</div>';
  }
}

/* =====================================================================
   7. STAFF DIRECTORY CMS (จัดการทำเนียบบุคลากร)
   ===================================================================== */
function loadStaffDirectory() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;

  const staffList = (window.STAFF_MEMBERS && window.STAFF_MEMBERS.length) ? window.STAFF_MEMBERS : [
    {
      name: 'นางชลตวรรณ ขุมเพ็ชร',
      position: 'ผู้อำนวยการสถานศึกษา',
      group: 'ผู้บริหารสถานศึกษา',
      socials: { facebook: 'https://facebook.com', line: 'https://line.me', email: 'director@bcs.ac.th' }
    },
    {
      name: 'นางสาวกัญญาภัทร นวลเพ็ญ',
      position: 'รองผู้อำนวยการสถานศึกษา',
      group: 'กลุ่มบริหารวิชาการ',
      socials: { facebook: 'https://facebook.com', email: 'academic@bcs.ac.th' }
    }
  ];

  tbody.innerHTML = staffList.map((member, i) => {
    const socials = member.socials || {};
    const socialBadges = [];
    if (socials.facebook) socialBadges.push('<span class="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">Facebook</span>');
    if (socials.line) socialBadges.push('<span class="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px]">LINE</span>');
    if (socials.email) socialBadges.push('<span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">Email</span>');
    if (socials.phone) socialBadges.push('<span class="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">โทร</span>');

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(member.name)}</td>
        <td class="py-3 px-4">${escapeHtml(member.position)}</td>
        <td class="py-3 px-4">${escapeHtml(member.group || '-')}</td>
        <td class="py-3 px-4 flex flex-wrap gap-1">${socialBadges.join(' ')}</td>
        <td class="py-3 px-4 text-right">
          <button onclick="alert('ข้อมูลบุคลากรเชื่อมโยงกับ js/staff-data.js')" class="text-emerald-700 hover:underline text-xs font-semibold">ดูข้อมูล</button>
        </td>
      </tr>
    `;
  }).join('');
}

/* =====================================================================
   9. GRADE LEVEL & ATTENDANCE MODULE (ระบบสายชั้น & เช็คชื่อนักเรียน)
   ===================================================================== */
const MOCK_CLASS_STUDENTS = {
  'ป.1/1': [
    { no: 1, code: 'BCS-6901', name: 'ด.ช. ภูมิพัฒน์ สุขใจ', status: 'present', remark: '' },
    { no: 2, code: 'BCS-6902', name: 'ด.ช. ณภัทร ภักดี', status: 'present', remark: '' },
    { no: 3, code: 'BCS-6903', name: 'ด.ญ. กัญญาณี รัตนกุล', status: 'leave', remark: 'ลาป่วยมีใบรับรองแพทย์' },
    { no: 4, code: 'BCS-6904', name: 'ด.ช. ธีรภัทร ชาญวิทย์', status: 'present', remark: '' },
    { no: 5, code: 'BCS-6905', name: 'ด.ญ. พิชญา เจริญสุข', status: 'present', remark: '' },
    { no: 6, code: 'BCS-6906', name: 'ด.ช. อัครพงศ์ มงคล', status: 'absent', remark: 'ผู้ปกครองยังไม่ติดต่อ' },
    { no: 7, code: 'BCS-6907', name: 'ด.ญ. วรัญญา เลิศปัญญา', status: 'present', remark: '' },
    { no: 8, code: 'BCS-6908', name: 'ด.ช. ชนน ชัยชนะ', status: 'present', remark: '' }
  ],
  'ป.1/2': [
    { no: 1, code: 'BCS-6911', name: 'ด.ช. ธนกร มงคลชัย', status: 'present', remark: '' },
    { no: 2, code: 'BCS-6912', name: 'ด.ญ. ภัทรพร ศรีสุข', status: 'present', remark: '' },
    { no: 3, code: 'BCS-6913', name: 'ด.ช. ศุภกฤต วงศ์ษา', status: 'present', remark: '' }
  ],
  'ป.1/3': [
    { no: 1, code: 'BCS-6921', name: 'ด.ช. เคนจิ ทาคูมิ (EP)', status: 'present', remark: '' },
    { no: 2, code: 'BCS-6922', name: 'ด.ญ. เอมิลี่ เจนสัน (EP)', status: 'present', remark: '' }
  ]
};

function initAttendanceModule() {
  const roleSelect = document.getElementById('att-role-select');
  const gradeSelect = document.getElementById('att-grade-select');
  const roomSelect = document.getElementById('att-room-select');
  const tbody = document.getElementById('att-students-table-body');
  const manageBtn = document.getElementById('att-manage-students-btn');
  const broadcastBtn = document.getElementById('att-grade-broadcast-btn');
  const saveBtn = document.getElementById('save-attendance-btn');

  if (!roleSelect || !gradeSelect || !roomSelect || !tbody) return;

  /** ปรับเปลี่ยนห้องเรียนตามสายชั้นจริง: ประถม 9 ห้อง / มัธยม 7 ห้อง / อนุบาล 3 ห้อง / การศึกษาพิเศษ */
  function populateRoomsForGrade(grade) {
    let count = 9;
    let customRooms = null;

    if (grade.startsWith('อ.')) {
      count = 3;
    } else if (grade.startsWith('ม.')) {
      count = 7;
    } else if (grade === 'การศึกษาพิเศษ') {
      customRooms = [
        { val: '1', label: 'ห้อง 1 (การศึกษาพิเศษ 1)' },
        { val: '2', label: 'ห้อง 2 (การศึกษาพิเศษ 2)' },
        { val: '3', label: 'ห้อง 3 (การศึกษาพิเศษ 3)' }
      ];
    }

    const currentVal = roomSelect.value;
    roomSelect.innerHTML = '';

    if (customRooms) {
      customRooms.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.val;
        opt.textContent = r.label;
        roomSelect.appendChild(opt);
      });
    } else {
      for (let i = 1; i <= count; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        const epTag = (grade === 'ป.1' && i === 9) ? ' (EP)' : '';
        opt.textContent = `ห้อง ${i} (${grade}/${i}${epTag})`;
        roomSelect.appendChild(opt);
      }
    }

    // หากห้องเดิมยังอยู่ในช่วง ให้เลือกห้องเดิม
    if (parseInt(currentVal, 10) <= count) {
      roomSelect.value = currentVal;
    }
  }

  function getCurrentClassKey() {
    return `${gradeSelect.value}/${roomSelect.value}`;
  }

  function renderAttendanceTable() {
    const classKey = getCurrentClassKey();
    if (!MOCK_CLASS_STUDENTS[classKey]) {
      // สร้างข้อมูลตัวอย่างอัตโนมัติประจำห้องเพื่อให้ทดสอบได้ทันที
      const gradeStr = gradeSelect.value;
      const roomStr = roomSelect.value;
      MOCK_CLASS_STUDENTS[classKey] = [
        { no: 1, code: `BCS-69${roomStr}1`, name: `ด.ช. ภูมิพัฒน์ มั่นคง (${gradeStr}/${roomStr})`, status: 'present', remark: '' },
        { no: 2, code: `BCS-69${roomStr}2`, name: `ด.ญ. สุภัสสรา รัตนกุล (${gradeStr}/${roomStr})`, status: 'present', remark: '' },
        { no: 3, code: `BCS-69${roomStr}3`, name: `ด.ช. ชัยวัฒน์ เจริญสุข (${gradeStr}/${roomStr})`, status: 'present', remark: '' },
        { no: 4, code: `BCS-69${roomStr}4`, name: `ด.ญ. ปรียาภรณ์ สมบูรณ์ (${gradeStr}/${roomStr})`, status: 'leave', remark: 'ลากิจส่วนตัว' },
        { no: 5, code: `BCS-69${roomStr}5`, name: `ด.ช. ปัณณธร ศรีสวัสดิ์ (${gradeStr}/${roomStr})`, status: 'present', remark: '' }
      ];
    }
    const students = MOCK_CLASS_STUDENTS[classKey];

    tbody.innerHTML = students.map((s, idx) => `
      <tr class="hover:bg-slate-50 transition" data-student-index="${idx}">
        <td class="py-3 px-4 text-center font-bold text-slate-700">${s.no}</td>
        <td class="py-3 px-4 font-mono text-[11px] font-bold text-slate-500">${s.code}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(s.name)}</td>
        <td class="py-3 px-4 text-center">
          <div class="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button type="button" onclick="setStudentStatus(${idx}, 'present')" class="att-btn px-2.5 py-1 rounded-lg text-xs font-bold transition ${s.status === 'present' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">มา</button>
            <button type="button" onclick="setStudentStatus(${idx}, 'absent')" class="att-btn px-2.5 py-1 rounded-lg text-xs font-bold transition ${s.status === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">ขาด</button>
            <button type="button" onclick="setStudentStatus(${idx}, 'leave')" class="att-btn px-2.5 py-1 rounded-lg text-xs font-bold transition ${s.status === 'leave' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">ลา</button>
            <button type="button" onclick="setStudentStatus(${idx}, 'late')" class="att-btn px-2.5 py-1 rounded-lg text-xs font-bold transition ${s.status === 'late' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}">สาย</button>
          </div>
        </td>
        <td class="py-3 px-4">
          <input type="text" value="${escapeHtml(s.remark || '')}" placeholder="ระบุเหตุผล (ถ้ามี)..." onchange="setStudentRemark(${idx}, this.value)" class="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-emerald-600 focus:outline-none">
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button type="button" onclick="editStudentIndividual(${idx})" class="p-1 text-blue-700 hover:text-blue-900 transition mr-1" title="แก้ไขข้อมูลนักเรียน">✏️</button>
          <button type="button" onclick="deleteStudentIndividual(${idx})" class="p-1 text-red-600 hover:text-red-800 transition" title="ลบนักเรียนรายบุคคล">🗑️</button>
        </td>
      </tr>
    `).join('');

    updateAttendanceStats(students);
  }

  window.setStudentStatus = function(idx, status) {
    const classKey = getCurrentClassKey();
    const students = MOCK_CLASS_STUDENTS[classKey];
    if (students && students[idx]) {
      students[idx].status = status;
      renderAttendanceTable();
    }
  };

  window.setStudentRemark = function(idx, val) {
    const classKey = getCurrentClassKey();
    const students = MOCK_CLASS_STUDENTS[classKey];
    if (students && students[idx]) {
      students[idx].remark = val;
    }
  };

  function updateAttendanceStats(students) {
    const p = students.filter(s => s.status === 'present').length;
    const a = students.filter(s => s.status === 'absent').length;
    const l = students.filter(s => s.status === 'leave').length;
    const lt = students.filter(s => s.status === 'late').length;

    const elP = document.getElementById('stat-att-present');
    const elA = document.getElementById('stat-att-absent');
    const elL = document.getElementById('stat-att-leave');
    const elLt = document.getElementById('stat-att-late');

    if (elP) elP.textContent = `${p} คน`;
    if (elA) elA.textContent = `${a} คน`;
    if (elL) elL.textContent = `${l} คน`;
    if (elLt) elLt.textContent = `${lt} คน`;
  }

  // ปรับเปลี่ยนการเข้าถึงตามบทบาท (Homeroom vs Chairperson vs IT Admin)
  function handleRoleAccess() {
    const role = roleSelect.value;
    if (role === 'homeroom') {
      // ครูประจำชั้น: ล็อกให้เลือกได้เฉพาะห้องของตน
      roomSelect.disabled = false;
      if (manageBtn) manageBtn.classList.add('opacity-50', 'pointer-events-none');
      if (broadcastBtn) broadcastBtn.classList.add('opacity-50', 'pointer-events-none');
    } else if (role === 'chairperson') {
      // ประธานสายชั้น: สลับห้องในสายชั้นได้ทั้งหมด และเปิดปุ่มจัดการนักเรียน
      roomSelect.disabled = false;
      if (manageBtn) manageBtn.classList.remove('opacity-50', 'pointer-events-none');
      if (broadcastBtn) broadcastBtn.classList.add('opacity-50', 'pointer-events-none');
    } else if (role === 'it_admin') {
      // IT สายชั้น: ดำเนินการแทนได้ทุกห้อง และมีปุ่มประกาศข่าวด่วน
      roomSelect.disabled = false;
      if (manageBtn) manageBtn.classList.remove('opacity-50', 'pointer-events-none');
      if (broadcastBtn) broadcastBtn.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      // Executive / Admin: อิสระทุกฟังชันก์
      roomSelect.disabled = false;
      if (manageBtn) manageBtn.classList.remove('opacity-50', 'pointer-events-none');
      if (broadcastBtn) broadcastBtn.classList.remove('opacity-50', 'pointer-events-none');
    }
    renderAttendanceTable();
  }

  roleSelect.addEventListener('change', handleRoleAccess);
  gradeSelect.addEventListener('change', () => {
    populateRoomsForGrade(gradeSelect.value);
    renderAttendanceTable();
  });
  roomSelect.addEventListener('change', renderAttendanceTable);

  // เตรียมห้องเรียนเริ่มต้นให้ตรงกับสายชั้นที่เลือก
  populateRoomsForGrade(gradeSelect.value);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      showToast('✅ บันทึกข้อมูลการเช็คชื่อนักเรียนประจำวันสำเร็จเรียบร้อย');
    });
  }

  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      const name = prompt('กรุณาระบุชื่อ-นามสกุลนักเรียนใหม่ เพื่อเพิ่มเข้าในสายชั้น ' + gradeSelect.value + ':');
      if (name && name.trim()) {
        const classKey = getCurrentClassKey();
        if (!MOCK_CLASS_STUDENTS[classKey]) MOCK_CLASS_STUDENTS[classKey] = [];
        const nextNo = MOCK_CLASS_STUDENTS[classKey].length + 1;
        MOCK_CLASS_STUDENTS[classKey].push({
          no: nextNo,
          code: `BCS-69${nextNo < 10 ? '0' + nextNo : nextNo}`,
          name: name.trim(),
          status: 'present',
          remark: 'เพิ่มใหม่โดยประธาน/IT สายชั้น'
        });
        renderAttendanceTable();
        showToast('✅ เพิ่มนักเรียนในสายชั้นสำเร็จ');
      }
    });
  }

  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', () => {
      const msg = prompt('กรอกข้อความประกาศด่วนประจำสายชั้น ' + gradeSelect.value + ':\n(ระบบจะส่งแจ้งเตือนด่วนไปยังนักเรียนและผู้ปกครองในสายชั้น)');
      if (msg && msg.trim()) {
        showToast('📢 ส่งประกาศข่าวด่วนประจำสายชั้นสำเร็จเรียบร้อย');
      }
    });
  }

  handleRoleAccess();
}

/* =====================================================================
   10. ONE-PAGE REPORT GENERATOR MODULE (ระบบรายงานหน้าเดียว)
   ===================================================================== */
function initOnePageReportModule() {
  const form = document.getElementById('onepage-form');
  const previewBtn = document.getElementById('preview-onepage-btn');
  if (!form) return;

  function updateOnePagePreview() {
    const title = document.getElementById('op-title').value.trim();
    const dept = document.getElementById('op-dept').value;
    const date = document.getElementById('op-date').value;
    const summary = document.getElementById('op-summary').value.trim();
    const m1 = document.getElementById('op-m1').value.trim();
    const m2 = document.getElementById('op-m2').value.trim();
    const m3 = document.getElementById('op-m3').value.trim();
    const img1 = document.getElementById('op-img1').value.trim();
    const img2 = document.getElementById('op-img2').value.trim();

    const prevTitle = document.getElementById('prev-title');
    const prevDept = document.getElementById('prev-dept');
    const prevDate = document.getElementById('prev-date');
    const prevSummary = document.getElementById('prev-summary');
    const prevM1 = document.getElementById('prev-m1');
    const prevM2 = document.getElementById('prev-m2');
    const prevM3 = document.getElementById('prev-m3');
    const prevImg1 = document.getElementById('prev-img1');
    const prevImg2 = document.getElementById('prev-img2');

    if (prevTitle) prevTitle.textContent = title || 'รายงานผลการดำเนินงาน';
    if (prevDept) prevDept.textContent = dept;
    if (prevDate) prevDate.textContent = date ? `วันที่จัดกิจกรรม: ${new Date(date).toLocaleDateString('th-TH')}` : 'วันที่จัดกิจกรรม: 1 พฤศจิกายน 2569';
    if (prevSummary) prevSummary.textContent = summary;
    if (prevM1) prevM1.textContent = m1;
    if (prevM2) prevM2.textContent = m2;
    if (prevM3) prevM3.textContent = m3;
    if (prevImg1 && img1) prevImg1.src = img1;
    if (prevImg2 && img2) prevImg2.src = img2;
  }

  if (previewBtn) previewBtn.addEventListener('click', () => {
    updateOnePagePreview();
    showToast('🔄 อัปเดตตัวอย่างรายงานหน้าเดียวแล้ว');
  });

  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', updateOnePagePreview);
  });
}

/* =====================================================================
   11. CSV IMPORT/EXPORT & INDIVIDUAL CRUD MODULE
   ===================================================================== */
function initCsvAndIndividualCrud() {
  const exportStudentsBtn = document.getElementById('export-students-csv-btn');
  const importStudentsInput = document.getElementById('import-students-csv');
  const exportUsersBtn = document.getElementById('export-users-csv-btn');
  const importUsersInput = document.getElementById('import-users-csv');

  const addSingleStudentBtn = document.getElementById('att-add-single-btn');
  const studentModal = document.getElementById('student-modal');
  const closeStudentModal = document.getElementById('close-student-modal');
  const cancelStudentModal = document.getElementById('cancel-student-modal');
  const studentCrudForm = document.getElementById('student-crud-form');

  const addSingleUserBtn = document.getElementById('add-single-user-btn');
  const userModal = document.getElementById('user-modal');
  const closeUserModal = document.getElementById('close-user-modal');
  const cancelUserModal = document.getElementById('cancel-user-modal');
  const userCrudForm = document.getElementById('user-crud-form');

  const gradeSelect = document.getElementById('att-grade-select');
  const roomSelect = document.getElementById('att-room-select');

  function getCurrentClassKey() {
    return `${gradeSelect.value}/${roomSelect.value}`;
  }

  // 1) ส่งออก CSV นักเรียน (พร้อม UTF-8 BOM ภาษาไทย)
  if (exportStudentsBtn) {
    exportStudentsBtn.addEventListener('click', () => {
      const classKey = getCurrentClassKey();
      const students = MOCK_CLASS_STUDENTS[classKey] || [];
      if (!students.length) {
        alert('ไม่พบข้อมูลนักเรียนในห้องนี้');
        return;
      }

      let csv = '\uFEFFเลขที่,รหัสประจำตัว,ชื่อ-นามสกุล,สถานะมาเรียน,หมายเหตุ,สายชั้น,ห้อง\n';
      students.forEach(s => {
        csv += `"${s.no}","${s.code}","${s.name}","${s.status}","${s.remark || ''}","${gradeSelect.value}","${roomSelect.value}"\n`;
      });

      downloadCsvFile(csv, `รายชื่อนักเรียน_${classKey.replace('/', '_')}.csv`);
      showToast('📤 ส่งออกไฟล์ CSV นักเรียนสำเร็จ');
    });
  }

  // 2) นำเข้า CSV นักเรียน
  if (importStudentsInput) {
    importStudentsInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length <= 1) throw new Error('ไฟล์ CSV ว่างเปล่า');

        const classKey = getCurrentClassKey();
        if (!MOCK_CLASS_STUDENTS[classKey]) MOCK_CLASS_STUDENTS[classKey] = [];

        let added = 0;
        // ข้าม header บรรทัดแรก
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 3 && cols[2]) {
            const no = parseInt(cols[0], 10) || (MOCK_CLASS_STUDENTS[classKey].length + 1);
            const code = cols[1] || `BCS-69${no < 10 ? '0' + no : no}`;
            const name = cols[2];
            const remark = cols[4] || 'นำเข้าจาก CSV';

            MOCK_CLASS_STUDENTS[classKey].push({
              no,
              code,
              name,
              status: 'present',
              remark
            });
            added++;
          }
        }

        e.target.value = '';
        const attRoleSelect = document.getElementById('att-role-select');
        if (attRoleSelect) attRoleSelect.dispatchEvent(new Event('change'));
        showToast(`📥 นำเข้านักเรียน ${added} คนจาก CSV สำเร็จ`);
      } catch (err) {
        alert('❌ นำเข้า CSV ไม่สำเร็จ: ' + err.message);
      }
    });
  }

  // 3) ส่งออก CSV ผู้ใช้งาน
  if (exportUsersBtn) {
    exportUsersBtn.addEventListener('click', () => {
      if (!allUsers.length) {
        alert('ไม่มีข้อมูลผู้ใช้');
        return;
      }
      let csv = '\uFEFFชื่อ-นามสกุล,อีเมล,บทบาท,กลุ่มงาน,สถานะ\n';
      allUsers.forEach(u => {
        const deptName = u.departments ? u.departments.name : '-';
        csv += `"${u.full_name || ''}","${u.email}","${u.role}","${deptName}","${u.is_active ? 'เปิดใช้งาน' : 'ระงับ'}"\n`;
      });
      downloadCsvFile(csv, 'รายชื่อผู้ใช้ระบบ_BCS.csv');
      showToast('📤 ส่งออกไฟล์ CSV ผู้ใช้สำเร็จ');
    });
  }

  // 3.1) ดาวน์โหลดแม่แบบ CSV นักเรียน
  const downloadStudentTemplateBtn = document.getElementById('download-student-template-btn');
  if (downloadStudentTemplateBtn) {
    downloadStudentTemplateBtn.addEventListener('click', () => {
      let csv = '\uFEFFเลขที่,รหัสประจำตัว,ชื่อ-นามสกุล,สถานะมาเรียน,หมายเหตุ,สายชั้น,ห้อง\n';
      csv += '"1","BCS-6901","ด.ช. เก่งกาจ สามารถ","present","","ป.1","1"\n';
      csv += '"2","BCS-6902","ด.ญ. สดใส ร่าเริง","present","","ป.1","1"\n';
      csv += '"3","BCS-6903","ด.ช. ปัญญา เลิศล้ำ","leave","ลาป่วย","ป.1","1"\n';
      downloadCsvFile(csv, 'แม่แบบ_รายชื่อนักเรียน_BCS.csv');
      showToast('📄 ดาวน์โหลดแม่แบบ CSV นักเรียนเรียบร้อย (เปิดใน Excel ภาษาไทยไม่เพี้ยน)');
    });
  }

  // 3.2) ดาวน์โหลดแม่แบบ CSV บุคลากร
  const downloadUserTemplateBtn = document.getElementById('download-user-template-btn');
  if (downloadUserTemplateBtn) {
    downloadUserTemplateBtn.addEventListener('click', () => {
      let csv = '\uFEFFชื่อ-นามสกุล,อีเมล,บทบาท,กลุ่มงาน,สถานะ\n';
      csv += '"นายสมชาย สอนดี","somchai@bcs.ac.th","teacher","กลุ่มสาระการเรียนรู้คณิตศาสตร์","เปิดใช้งาน"\n';
      csv += '"นางสมศรี มีสุข","somsri@bcs.ac.th","head","ฝ่ายบริหารวิชาการ","เปิดใช้งาน"\n';
      csv += '"นายอำนวย บริหาร","director@bcs.ac.th","executive","ฝ่ายบริหารทั่วไป","เปิดใช้งาน"\n';
      downloadCsvFile(csv, 'แม่แบบ_รายชื่อบุคลากร_BCS.csv');
      showToast('📄 ดาวน์โหลดแม่แบบ CSV บุคลากรเรียบร้อย');
    });
  }

  // 3.3) ส่งออกรายชื่อนักเรียนทั้งสายชั้น (ครบทุกห้อง)
  const exportGradeBtn = document.getElementById('export-grade-csv-btn');
  if (exportGradeBtn) {
    exportGradeBtn.addEventListener('click', () => {
      const grade = gradeSelect.value;
      let csv = '\uFEFFสายชั้น,ห้อง,เลขที่,รหัสประจำตัว,ชื่อ-นามสกุล,สถานะเช็คชื่อ,หมายเหตุ\n';
      let totalCount = 0;

      Object.keys(MOCK_CLASS_STUDENTS).forEach(key => {
        if (key.startsWith(grade + '/')) {
          const room = key.split('/')[1];
          const list = MOCK_CLASS_STUDENTS[key] || [];
          list.forEach(s => {
            csv += `"${grade}","${room}","${s.no}","${s.code}","${s.name}","${s.status}","${s.remark || ''}"\n`;
            totalCount++;
          });
        }
      });

      if (totalCount === 0) {
        alert('ไม่พบข้อมูลนักเรียนในสายชั้น ' + grade);
        return;
      }

      downloadCsvFile(csv, `รายชื่อนักเรียนทั้งสายชั้น_${grade}.csv`);
      showToast(`📋 ส่งออกรายชื่อทั้งสายชั้น ${grade} (${totalCount} คน) สำเร็จ`);
    });
  }

  // 3.4) ส่งออกบันทึกการเช็คชื่อวันนี้
  const exportAttendanceBtn = document.getElementById('export-attendance-csv-btn');
  if (exportAttendanceBtn) {
    exportAttendanceBtn.addEventListener('click', () => {
      const classKey = getCurrentClassKey();
      const students = MOCK_CLASS_STUDENTS[classKey] || [];
      const todayStr = new Date().toLocaleDateString('th-TH');
      let csv = '\uFEFFวันที่,สายชั้น,ห้อง,เลขที่,รหัสประจำตัว,ชื่อ-นามสกุล,ผลการเช็คชื่อ,หมายเหตุ\n';
      
      const statusMap = { present: 'มาเรียน', absent: 'ขาดเรียน', leave: 'ลา', late: 'มาสาย' };
      students.forEach(s => {
        csv += `"${todayStr}","${gradeSelect.value}","${roomSelect.value}","${s.no}","${s.code}","${s.name}","${statusMap[s.status] || s.status}","${s.remark || ''}"\n`;
      });

      downloadCsvFile(csv, `บันทึกเช็คชื่อ_${classKey.replace('/', '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      showToast('📊 ส่งออกบันทึกเช็คชื่อเป็น CSV เรียบร้อย');
    });
  }

  // 3.5) ส่งออกรายชื่อผู้สมัครเรียนออนไลน์
  const exportAdmissionsBtn = document.getElementById('export-admissions-csv-btn');
  if (exportAdmissionsBtn) {
    exportAdmissionsBtn.addEventListener('click', () => {
      let csv = '\uFEFFเลขที่ใบสมัคร,วันที่สมัคร,ชื่อ-นามสกุลนักเรียน,ระดับชั้นที่สมัคร,ผู้ปกครอง,เบอร์โทรศัพท์,สถานะ\n';
      csv += '"BCS-69-0012","1 พ.ย. 2569 14:20 น.","ด.ช. พงศกร มั่นคง","ป.1 (ห้องเรียนปกติ)","นายสมศักดิ์","081-234-5678","รอตรวจเอกสาร"\n';
      csv += '"BCS-69-0013","1 พ.ย. 2569 15:05 น.","ด.ญ. ชัญญา รุ่งเรือง","ป.1 (English Program)","นางรัชนี","089-987-6543","อนุมัติแล้ว"\n';
      downloadCsvFile(csv, 'รายชื่อผู้สมัครเรียนออนไลน์_2569.csv');
      showToast('📤 ส่งออกรายชื่อผู้สมัครเรียนเป็น CSV สำเร็จ');
    });
  }

  // 4) นักเรียนรายบุคคล: เพิ่ม & แก้ไข & ลบ
  if (addSingleStudentBtn && studentModal) {
    addSingleStudentBtn.addEventListener('click', () => {
      document.getElementById('crud-student-index').value = '-1';
      document.getElementById('student-modal-title').textContent = '➕ เพิ่มข้อมูลนักเรียนรายบุคคล';
      document.getElementById('crud-student-no').value = (MOCK_CLASS_STUDENTS[getCurrentClassKey()] || []).length + 1;
      document.getElementById('crud-student-code').value = '';
      document.getElementById('crud-student-name').value = '';
      document.getElementById('crud-student-remark').value = '';
      studentModal.classList.remove('hidden');
    });
  }

  window.editStudentIndividual = function(idx) {
    const classKey = getCurrentClassKey();
    const s = (MOCK_CLASS_STUDENTS[classKey] || [])[idx];
    if (!s) return;

    document.getElementById('crud-student-index').value = idx;
    document.getElementById('student-modal-title').textContent = '✏️ แก้ไขข้อมูลนักเรียนรายบุคคล';
    document.getElementById('crud-student-no').value = s.no;
    document.getElementById('crud-student-code').value = s.code;
    document.getElementById('crud-student-name').value = s.name;
    document.getElementById('crud-student-remark').value = s.remark || '';
    if (studentModal) studentModal.classList.remove('hidden');
  };

  window.deleteStudentIndividual = function(idx) {
    const classKey = getCurrentClassKey();
    const students = MOCK_CLASS_STUDENTS[classKey];
    if (!students || !students[idx]) return;

    if (confirm(`คุณต้องการลบนักเรียน "${students[idx].name}" ออกจากสายชั้นใช่หรือไม่?`)) {
      students.splice(idx, 1);
      // เรียงเลขที่ใหม่
      students.forEach((s, i) => s.no = i + 1);
      const attRoleSelect = document.getElementById('att-role-select');
      if (attRoleSelect) attRoleSelect.dispatchEvent(new Event('change'));
      showToast('🗑️ ลบนักเรียนเรียบร้อยแล้ว');
    }
  };

  if (closeStudentModal) closeStudentModal.addEventListener('click', () => studentModal.classList.add('hidden'));
  if (cancelStudentModal) cancelStudentModal.addEventListener('click', () => studentModal.classList.add('hidden'));

  if (studentCrudForm) {
    studentCrudForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(document.getElementById('crud-student-index').value, 10);
      const no = parseInt(document.getElementById('crud-student-no').value, 10);
      const code = document.getElementById('crud-student-code').value.trim();
      const name = document.getElementById('crud-student-name').value.trim();
      const remark = document.getElementById('crud-student-remark').value.trim();

      const classKey = getCurrentClassKey();
      if (!MOCK_CLASS_STUDENTS[classKey]) MOCK_CLASS_STUDENTS[classKey] = [];

      if (idx >= 0 && MOCK_CLASS_STUDENTS[classKey][idx]) {
        // แก้ไข
        MOCK_CLASS_STUDENTS[classKey][idx].no = no;
        MOCK_CLASS_STUDENTS[classKey][idx].code = code;
        MOCK_CLASS_STUDENTS[classKey][idx].name = name;
        MOCK_CLASS_STUDENTS[classKey][idx].remark = remark;
        showToast('✅ แก้ไขข้อมูลนักเรียนเรียบร้อย');
      } else {
        // เพิ่มใหม่
        MOCK_CLASS_STUDENTS[classKey].push({
          no,
          code,
          name,
          status: 'present',
          remark
        });
        showToast('✅ เพิ่มนักเรียนใหม่เรียบร้อย');
      }

      studentModal.classList.add('hidden');
      const attRoleSelect = document.getElementById('att-role-select');
      if (attRoleSelect) attRoleSelect.dispatchEvent(new Event('change'));
    });
  }

  // 5) ผู้ใช้รายบุคคล: เพิ่ม
  if (addSingleUserBtn && userModal) {
    addSingleUserBtn.addEventListener('click', () => {
      userModal.classList.remove('hidden');
    });
  }
  if (closeUserModal) closeUserModal.addEventListener('click', () => userModal.classList.add('hidden'));
  if (cancelUserModal) cancelUserModal.addEventListener('click', () => userModal.classList.add('hidden'));

  if (userCrudForm) {
    userCrudForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('crud-user-email').value.trim().toLowerCase();
      const name = document.getElementById('crud-user-name').value.trim();
      const role = document.getElementById('crud-user-role').value;

      allUsers.unshift({
        id: 'usr_' + Date.now(),
        email,
        full_name: name,
        role,
        is_active: true,
        created_at: new Date().toISOString()
      });

      renderUsersTable(allUsers);
      updateUserStats(allUsers);
      userModal.classList.add('hidden');
      userCrudForm.reset();
      showToast('✅ เพิ่มผู้ใช้งานในระบบเรียบร้อยแล้ว');
    });
  }
}

function downloadCsvFile(content, fileName) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =====================================================================
   12. HERO BANNERS & CAROUSEL MANAGEMENT (จัดการภาพสไลด์หน้าแรก)
   ===================================================================== */
function initBannersModule() {
  const form = document.getElementById('hero-banner-form');
  const container = document.getElementById('banners-list-container');
  if (!form || !container) return;

  const defaultBanners = [
    {
      id: 1,
      title: 'อัตลักษณ์และความเป็นเลิศทางวิชาการ',
      tagline: 'โรงเรียนบางชัน (ปลื้มวิทยานุสรณ์) มุ่งมั่นพัฒนาผู้เรียนสู่ศตวรรษที่ 21',
      img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&auto=format&fit=crop&q=80',
      active: true
    },
    {
      id: 2,
      title: 'English Program (EP) และทักษะสากล',
      tagline: 'เรียนรู้ภาษาอังกฤษกับครูเจ้าของภาษา เสริมสร้างศักยภาพสู่พลเมืองโลก',
      img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop&q=80',
      active: true
    }
  ];

  function getBanners() {
    try {
      const stored = localStorage.getItem('bcs_hero_banners');
      return stored ? JSON.parse(stored) : defaultBanners;
    } catch (e) {
      return defaultBanners;
    }
  }

  function saveBanners(list) {
    try {
      localStorage.setItem('bcs_hero_banners', JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  function renderBanners() {
    const list = getBanners();
    container.innerHTML = list.map((b, idx) => `
      <div class="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${b.img}" alt="${escapeHtml(b.title)}" class="w-16 h-10 object-cover rounded-xl shrink-0 border border-slate-200">
          <div class="min-w-0">
            <h4 class="font-bold text-slate-900 truncate">${escapeHtml(b.title)}</h4>
            <p class="text-[10px] text-slate-500 truncate">${escapeHtml(b.tagline || '')}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">● แสดงอยู่</span>
          <button type="button" onclick="deleteHeroBanner(${idx})" class="text-xs text-red-600 hover:text-red-800 hover:underline">ลบ</button>
        </div>
      </div>
    `).join('');
  }

  window.deleteHeroBanner = function(idx) {
    const list = getBanners();
    if (confirm('ต้องการลบภาพสไลด์แบนเนอร์นี้ใช่หรือไม่?')) {
      list.splice(idx, 1);
      saveBanners(list);
      renderBanners();
      showToast('🗑️ ลบแบนเนอร์เรียบร้อยแล้ว');
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('banner-title').value.trim();
    const tagline = document.getElementById('banner-tagline').value.trim();
    const urlInput = document.getElementById('banner-img-url').value.trim();
    const fileInput = document.getElementById('banner-file');

    let imgUrl = urlInput || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&auto=format&fit=crop&q=80';

    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      try {
        const base64 = await fileToBase64(file);
        const res = await fetch(GAS_UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ base64, fileName: file.name, mimeType: file.type, category: 'banners' })
        });
        const result = await res.json();
        if (result.url || result.fileUrl) imgUrl = result.url || result.fileUrl;
      } catch (err) {
        console.warn('อัปโหลดแบนเนอร์ GAS ล้มเหลว:', err);
      }
    }

    const list = getBanners();
    list.unshift({
      id: Date.now(),
      title,
      tagline,
      img: imgUrl,
      active: true
    });
    saveBanners(list);
    renderBanners();
    form.reset();
    showToast('✅ เพิ่มภาพสไลด์แบนเนอร์ใหม่สำเร็จ');
  });

  renderBanners();
}

/* =====================================================================
   13. UPLOAD LIMIT SETTINGS MODULE (ตั้งค่าขนาดไฟล์อัปโหลด)
   ===================================================================== */
function initUploadLimitModule() {
  const saveBtn = document.getElementById('save-upload-limit-btn');
  const radios = document.querySelectorAll('input[name="max-size-radio"]');
  if (!saveBtn || !radios.length) return;

  const currentLimit = localStorage.getItem('bcs_max_upload_mb') || '50';
  radios.forEach(r => {
    if (r.value === currentLimit) {
      r.checked = true;
      r.closest('label').classList.add('border-emerald-600', 'bg-emerald-50/50');
    } else {
      r.closest('label').classList.remove('border-emerald-600', 'bg-emerald-50/50');
    }

    r.addEventListener('change', () => {
      radios.forEach(other => other.closest('label').classList.remove('border-emerald-600', 'bg-emerald-50/50'));
      r.closest('label').classList.add('border-emerald-600', 'bg-emerald-50/50');
    });
  });

  saveBtn.addEventListener('click', () => {
    const selected = document.querySelector('input[name="max-size-radio"]:checked');
    if (selected) {
      localStorage.setItem('bcs_max_upload_mb', selected.value);
      showToast(`⚙️ บันทึกขนาดไฟล์อัปโหลดสูงสุด ${selected.value} MB เรียบร้อยแล้ว`);
    }
  });
}


function showToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast');
  const msgEl = document.getElementById('toast-msg');
  const iconEl = document.getElementById('toast-icon');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  iconEl.textContent = type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✅');

  toast.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}