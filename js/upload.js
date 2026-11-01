/* ============================================
   upload.js - ฟอร์มอัปโหลดไฟล์: ไฟล์ -> Base64 -> GAS (Drive) -> Supabase
   ============================================ */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzWauxGLUEvpjQseK1bd509Il27vN33jxgqxVhj65fsm5me-fSI61By2SNIUlE5aQvr/exec';
const MAX_FILE_MB = 10; // จำกัดขนาดไฟล์ เพราะ Base64 ใหญ่ขึ้นราว 33%
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('upload-form');
  if (!form) return;

  const fileInput = document.getElementById('file');
  const fileLabel = document.getElementById('file-label');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('submit-text');
  const spinner = document.getElementById('submit-spinner');

  // แสดงชื่อไฟล์ที่เลือก
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    fileLabel.textContent = f ? `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)` : 'คลิกเพื่อเลือกไฟล์ (รูปภาพหรือ PDF)';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];

    try {
      validateFile(file);
      setLoading(true);

      // 1) แปลงไฟล์เป็น Base64 แล้วส่งไป GAS เพื่อบันทึกลง Drive
      const base64 = await fileToBase64(file);
      const fileUrl = await uploadToGAS({ base64, fileName: file.name, mimeType: file.type });

      // 2) นำ URL ที่ได้พร้อมข้อมูลฟอร์ม ไปบันทึกลง Supabase
      await insertTask({
        title: form.title.value.trim(),
        category: form.category.value,
        description: form.description.value.trim(),
        file_url: fileUrl,
        file_name: file.name,
        mime_type: file.type
      });

      alert('✅ อัปโหลดและบันทึกข้อมูลสำเร็จ');
      form.reset();
      fileLabel.textContent = 'คลิกเพื่อเลือกไฟล์ (รูปภาพหรือ PDF)';
    } catch (err) {
      console.error(err);
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  });

  /** สลับสถานะปุ่ม Submit เป็น Loading (Spinner) */
  function setLoading(on) {
    submitBtn.disabled = on;
    spinner.classList.toggle('hidden', !on);
    btnText.textContent = on ? 'กำลังอัปโหลด...' : 'ส่งข้อมูล';
  }
});

/** ตรวจชนิดและขนาดไฟล์ก่อนอัปโหลด */
function validateFile(file) {
  if (!file) throw new Error('กรุณาเลือกไฟล์ก่อนส่ง');
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF) และ PDF');
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`ไฟล์ต้องมีขนาดไม่เกิน ${MAX_FILE_MB} MB`);
}

/** แปลงไฟล์เป็น Base64 string (ตัดส่วนหัว data:...;base64, ออก) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

/** ส่งไฟล์ไป Google Apps Script (POST) และรับ URL ของไฟล์ใน Drive กลับมา
    ใช้ text/plain เพื่อเลี่ยง CORS preflight ซึ่ง GAS ไม่รองรับ
    คาดหวัง response: { success: true, url: "..." } */
async function uploadToGAS({ base64, fileName, mimeType }) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ base64, fileName, mimeType })
  });
  if (!res.ok) throw new Error(`เชื่อมต่อ GAS ไม่สำเร็จ (HTTP ${res.status})`);

  const result = await res.json();
  const url = result.url || result.fileUrl;
  if (result.success === false || !url) {
    throw new Error(result.error || result.message || 'GAS ไม่ส่ง URL ของไฟล์กลับมา');
  }
  return url;
}
