/* ============================================
   auth.js - รับค่าฟอร์ม Login (Email/Password + Google SSO @bcs.ac.th)
   ต้องโหลดหลัง supabase-js (CDN) และ supabase-client.js
   ============================================ */

const ALLOWED_DOMAIN = 'bcs.ac.th';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const submitBtn = document.getElementById('login-btn');
  const submitText = document.getElementById('login-text');
  const spinner = document.getElementById('login-spinner');
  const googleBtn = document.getElementById('google-btn');
  const errorBox = document.getElementById('login-error');
  const toggleBtn = document.getElementById('toggle-password');

  /** แสดง/ซ่อนข้อความแจ้งเตือนในกล่องของหน้า */
  function showError(msg) {
    errorBox.textContent = msg || '';
    errorBox.classList.toggle('hidden', !msg);
  }

  /** สลับสถานะ Loading ของปุ่มทั้งหมดระหว่างรอ Supabase */
  function setLoading(on) {
    submitBtn.disabled = on;
    googleBtn.disabled = on;
    spinner.classList.toggle('hidden', !on);
    submitText.textContent = on ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ';
  }

  // ปุ่มดูรหัสผ่าน
  toggleBtn.addEventListener('click', () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    toggleBtn.textContent = show ? 'ซ่อน' : 'แสดง';
  });

  // ส่งฟอร์ม Email/Password
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const email = emailInput.value.trim().toLowerCase();
    const password = passInput.value;

    try {
      if (!isAllowedEmail(email)) throw new Error(`กรุณาใช้อีเมลโรงเรียน @${ALLOWED_DOMAIN}`);
      if (!password) throw new Error('กรุณากรอกรหัสผ่าน');
      setLoading(true);

      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      await redirectByRole(data.user);
    } catch (err) {
      console.error(err);
      showError(err.message);
      setLoading(false);
    }
  });

  // ปุ่ม Google SSO (จำกัดโดเมนด้วย hd และตรวจซ้ำหลัง redirect กลับมา)
  googleBtn.addEventListener('click', async () => {
    showError('');
    try {
      setLoading(true);
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: { hd: ALLOWED_DOMAIN, prompt: 'select_account' }
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      showError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ' + err.message);
      setLoading(false);
    }
  });

  showOAuthErrorFromUrl();
  checkExistingSession();

  // ตัวดักสำรอง: เมื่อ Supabase แลก code เป็น session เสร็จ (กลับจาก Google) ให้ตรวจและพาไปต่อ
  if (isSupabaseConfigured() && window.supabase) {
    getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) handleSignedIn(session.user);
    });
  }

  /** แสดง error ที่ Supabase/Google ส่งกลับมาทาง URL (เช่น อีเมลนอกโดเมนถูกปฏิเสธ) */
  function showOAuthErrorFromUrl() {
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
    const desc = params.get('error_description') || params.get('error');
    if (desc) showError('เข้าสู่ระบบไม่สำเร็จ: ' + desc.replace(/\+/g, ' '));
  }

  /** ตรวจโดเมนของผู้ใช้ที่ล็อกอินแล้ว จากนั้นพาไปพื้นที่ทำงาน (แสดง error ถ้าล้มเหลว) */
  async function handleSignedIn(user) {
    try {
      if (!isAllowedEmail(user.email)) {
        await getSupabase().auth.signOut();
        showError(`อนุญาตเฉพาะบัญชี @${ALLOWED_DOMAIN} เท่านั้น`);
        setLoading(false);
        return;
      }
      await redirectByRole(user);
    } catch (err) {
      console.error(err);
      showError(err.message);
      setLoading(false);
    }
  }

  /** ถ้ามี session อยู่แล้ว (เช่น กลับมาจาก Google) ให้ตรวจและพาไปต่อ */
  async function checkExistingSession() {
    if (!isSupabaseConfigured()) {
      showError('ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_ANON_KEY ใน js/supabase-client.js');
      return;
    }
    try {
      const { data } = await getSupabase().auth.getSession();
      const user = data.session && data.session.user;
      if (user) await handleSignedIn(user);
    } catch (err) {
      console.error(err);
      showError(err.message);
    }
  }
});

/** ตรวจว่าอีเมลอยู่ในโดเมนโรงเรียน */
function isAllowedEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}

/** ตรวจสถานะบัญชี (ถ้าอ่านโปรไฟล์ได้) แล้วพาไปพื้นที่ทำงาน
    หมายเหตุ: ทุก role เข้าพื้นที่ทำงานก่อน เพราะหน้า Student Portal ยังไม่พร้อมใช้งาน
    ถ้าอ่านโปรไฟล์ไม่ได้ก็ยังไปต่อได้ เพราะยืนยันตัวตนสำเร็จแล้ว (RLS คุมข้อมูลที่หน้าปลายทาง) */
let redirecting = false;
async function redirectByRole(user) {
  if (redirecting) return;
  redirecting = true;
  try {
    const { data: profile, error } = await getSupabase()
      .from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (error) console.warn('อ่านโปรไฟล์ไม่สำเร็จ (ข้ามการตรวจ):', error.message);
    if (profile && profile.is_active === false) {
      await getSupabase().auth.signOut();
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
    }

    // หากเป็น SuperAdmin (admin@bcs.ac.th) หรือได้รับสิทธิ์ admin ให้เปิดหน้า Admin Control Center
    const isSuperAdmin = user.email && user.email.toLowerCase() === 'admin@bcs.ac.th';
    const isAdmin = isSuperAdmin || (profile && profile.role === 'admin');

    if (isAdmin) {
      window.location.href = 'pages/admin-panel.html';
      return;
    }
  } catch (err) {
    redirecting = false;
    throw err;
  }
  window.location.href = 'pages/teacher-workspace.html';
}
