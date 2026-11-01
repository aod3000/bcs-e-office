/* ============================================
   main.js - Hero Carousel, Theme Switcher, Mobile Menu
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initThemeSwitcher();
  initCarousel();
  initMobileMenu();
  initDropdown();
  initAnnounceWidget();
  initSlideOver();
});

/* ---------- Slide-over Panel: รายละเอียดประกาศและข่าวสาร ---------- */
/* ข้อมูลตัวอย่าง (ยังไม่มีข้อมูลจริง) รูปปกใช้ gradient ชั่วคราว */
const NEWS_DATA = {
  1: {
    title: 'เปิดรับสมัครนักเรียนใหม่ ประจำปีการศึกษา',
    date: '30 ต.ค. 2569', emoji: '🏫', cover: 'from-green-500 to-green-800',
    content: ['ผู้ปกครองสามารถตรวจสอบคุณสมบัติและขั้นตอนการสมัครได้ที่หน้าเว็บไซต์ของโรงเรียน',
      'เอกสารที่ต้องเตรียม ได้แก่ สำเนาทะเบียนบ้าน สำเนาสูติบัตร และรูปถ่ายของนักเรียน',
      'หากมีข้อสงสัย สามารถติดต่อสอบถามได้ที่ห้องธุรการในวันและเวลาราชการ']
  },
  2: {
    title: 'ขอแสดงความยินดีกับนักเรียนที่ได้รับรางวัล',
    date: '28 ต.ค. 2569', emoji: '🏆', cover: 'from-yellow-400 to-amber-500',
    content: ['ขอแสดงความยินดีกับนักเรียนที่ได้รับรางวัลจากการแข่งขันทักษะวิชาการ ระดับเขตพื้นที่การศึกษา',
      'ความสำเร็จนี้เกิดจากความตั้งใจของนักเรียนและการสนับสนุนจากคุณครูและผู้ปกครอง']
  },
  3: {
    title: 'ประกาศตารางสอบปลายภาคเรียน',
    date: '25 ต.ค. 2569', emoji: '📚', cover: 'from-emerald-500 to-teal-700',
    content: ['นักเรียนสามารถเข้าสู่ระบบด้วยบัญชี @bcs.ac.th เพื่อดูตารางสอบและผลคะแนนของตนเองได้',
      'กรุณามาถึงห้องสอบก่อนเวลาอย่างน้อย 15 นาที และเตรียมอุปกรณ์การเขียนให้พร้อม']
  },
  4: {
    title: 'แจ้งครูส่งรายงานวิชาการผ่านพื้นที่ทำงานครู',
    date: '30 ต.ค. 2569', emoji: '📢', cover: 'from-green-600 to-green-900',
    content: ['ขอให้คุณครูส่งรายงานวิชาการผ่านพื้นที่ทำงานครูของโรงเรียน โดยแนบไฟล์รูปภาพหรือ PDF',
      'ระบบจะจัดเก็บไฟล์ใน Google Drive ของโรงเรียน ช่วยลดการใช้กระดาษและติดตามสถานะการส่งได้สะดวก']
  }
};

/** เปิด Slide-over แสดงรายละเอียดข่าวตามรหัส (เลื่อนเข้าจากขอบขวา + แสดง Backdrop) */
function openSlideOver(id) {
  const news = NEWS_DATA[id];
  const panel = document.getElementById('slideover-panel');
  const backdrop = document.getElementById('slideover-backdrop');
  if (!news || !panel || !backdrop) return;

  document.getElementById('slideover-title').textContent = news.title;
  document.getElementById('slideover-date').textContent = '📅 ' + news.date;
  const img = document.getElementById('slideover-image');
  const photo = document.getElementById('slideover-photo');
  img.className = `relative h-64 sm:h-96 w-full overflow-hidden rounded-3xl grid place-items-center text-8xl bg-gradient-to-br ${news.cover}`;
  img.firstChild && img.firstChild.nodeType === 3 && img.removeChild(img.firstChild);
  img.prepend(document.createTextNode(news.emoji));
  // ถ้าข่าวมีรูปจริง (news.image) ให้แสดงเต็มกรอบแบบ object-cover
  if (news.image) { photo.src = news.image; photo.alt = news.title; photo.classList.remove('hidden'); }
  else { photo.removeAttribute('src'); photo.classList.add('hidden'); }
  const content = document.getElementById('slideover-content');
  content.replaceChildren(...news.content.map((t) => { const p = document.createElement('p'); p.textContent = t; return p; }));

  clearTimeout(panel._hideTimer);
  panel.classList.remove('invisible');
  panel.setAttribute('aria-hidden', 'false');
  panel.querySelector('.overflow-y-auto').scrollTop = 0;
  // รอ 1 เฟรมเพื่อให้ transition ทำงานหลังเอา invisible ออก
  requestAnimationFrame(() => {
    panel.classList.replace('translate-x-full', 'translate-x-0');
    backdrop.classList.replace('opacity-0', 'opacity-100');
    backdrop.classList.remove('pointer-events-none');
  });
  document.body.classList.add('no-scroll');
  document.getElementById('slideover-close').focus();
}

/** ปิด Slide-over (เลื่อนออกขวา + ซ่อน Backdrop) */
function closeSlideOver() {
  const panel = document.getElementById('slideover-panel');
  const backdrop = document.getElementById('slideover-backdrop');
  if (!panel || !backdrop || panel.classList.contains('translate-x-full')) return;

  panel.classList.replace('translate-x-0', 'translate-x-full');
  backdrop.classList.replace('opacity-100', 'opacity-0');
  backdrop.classList.add('pointer-events-none');
  panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  // ซ่อนจริงหลัง transition จบ (500ms) เพื่อไม่ให้ปุ่มในแผงถูกโฟกัสด้วยคีย์บอร์ด
  panel._hideTimer = setTimeout(() => panel.classList.add('invisible'), 500);
}

/** ผูกการคลิก/Enter ของการ์ดข่าว, ปุ่ม X, Backdrop และปุ่ม Esc */
function initSlideOver() {
  document.querySelectorAll('[data-news-id]').forEach((card) => {
    const open = () => openSlideOver(card.dataset.newsId);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
  const closeBtn = document.getElementById('slideover-close');
  const backdrop = document.getElementById('slideover-backdrop');
  if (closeBtn) closeBtn.addEventListener('click', closeSlideOver);
  if (backdrop) backdrop.addEventListener('click', closeSlideOver);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSlideOver(); });
}

/* ---------- Floating Widget ประกาศด่วน ---------- */
const ANNOUNCE_KEY = 'bcs-announce-closed';

/** แสดงกล่องประกาศด่วน ยกเว้นผู้ใช้เคยกดปิดไว้ (จำสถานะใน LocalStorage) และผูกปุ่ม X */
function initAnnounceWidget() {
  const widget = document.getElementById('announce-widget');
  const closeBtn = document.getElementById('announce-close');
  if (!widget || !closeBtn) return;

  let closed = false;
  try { closed = localStorage.getItem(ANNOUNCE_KEY) === '1'; } catch (e) { /* ใช้งานต่อได้แม้ LocalStorage ถูกบล็อก */ }
  if (closed) return; // เคยปิดแล้ว ไม่แสดงซ้ำ

  widget.classList.remove('hidden');
  widget.classList.add('is-entering');

  closeBtn.addEventListener('click', () => {
    widget.classList.add('is-closing'); // Fade out + เลื่อนลง
    try { localStorage.setItem(ANNOUNCE_KEY, '1'); } catch (e) { /* ข้ามหากบันทึกไม่ได้ */ }
    setTimeout(() => widget.classList.add('hidden'), 400); // รอ transition จบก่อนซ่อนจริง
  });
}

/* ---------- Dropdown เมนู "เพิ่มเติม" ---------- */
/** เปิด/ปิดเมนูย่อย และปิดเมื่อคลิกนอกกรอบหรือกด Esc */
function initDropdown() {
  const btn = document.getElementById('more-toggle');
  const panel = document.getElementById('more-panel');
  if (!btn || !panel) return;
  const setOpen = (open) => {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  };
  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!panel.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!panel.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ---------- Dynamic Theme Switcher ---------- */
const THEMES = ['school', 'ocean', 'blossom'];
const THEME_KEY = 'bcs-theme';

/** ตั้งค่าธีมให้หน้าเว็บทันที และจำค่าไว้ใน LocalStorage */
function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'school';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    const active = btn.dataset.themeBtn === theme;
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-offset-2', active);
    btn.setAttribute('aria-pressed', active);
  });
}

/** ผูกปุ่มเลือกธีมทุกปุ่ม และโหลดธีมที่เคยเลือกไว้ */
function initThemeSwitcher() {
  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeBtn));
  });
  applyTheme(localStorage.getItem(THEME_KEY) || 'school');
}

/* ---------- Hero Carousel (เลื่อนอัตโนมัติ) ---------- */
function initCarousel() {
  const root = document.getElementById('hero-carousel');
  if (!root) return;

  const track = root.querySelector('.carousel-track');
  const slides = root.querySelectorAll('.carousel-slide');
  const dots = root.querySelectorAll('.carousel-dot');
  const INTERVAL = 5000; // เลื่อนทุก 5 วินาที
  let index = 0;
  let timer = null;
  let startX = 0;

  /** แสดงสไลด์ตามลำดับที่ระบุ (วนลูป) */
  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, n) => d.classList.toggle('active', n === index));
  }

  function start() { stop(); timer = setInterval(() => goTo(index + 1), INTERVAL); }
  function stop() { if (timer) clearInterval(timer); }

  root.querySelector('[data-carousel-prev]').addEventListener('click', () => { goTo(index - 1); start(); });
  root.querySelector('[data-carousel-next]').addEventListener('click', () => { goTo(index + 1); start(); });
  dots.forEach((d, n) => d.addEventListener('click', () => { goTo(n); start(); }));

  // หยุดชั่วคราวเมื่อเมาส์อยู่เหนือแบนเนอร์
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  // รองรับการปัดนิ้วบนมือถือ
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
  root.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) goTo(diff < 0 ? index + 1 : index - 1);
    start();
  });

  goTo(0);
  start();
}

/* ---------- เมนูมือถือ (Hamburger) ---------- */
function initMobileMenu() {
  const btn = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
}
