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
  initStaffModal();
  initDepartmentsSection();
  initGalleryFilter();
  initNavDropdowns();
  initImageLightbox();
  loadDynamicActivities();
  initOnlineAdmissions();
  checkAdmissionsStatusOnHomepage();
  checkUrgentAnnouncementCms();
});

/* ---------- ทำเนียบบุคลากร Popup Modal ---------- */
function initStaffModal() {
  const modal = document.getElementById('staff-modal');
  const closeBtn = document.getElementById('staff-modal-close');
  if (!modal) return;

  // ผูกคลิกกับการ์ดบุคลากรทั้งหมด
  document.querySelectorAll('[data-staff-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.staffId, 10);
      window.openStaffModal(id);
    });
  });

  const closeModal = () => {
    modal.classList.remove('open');
    modal.style.display = '';
    modal.style.pointerEvents = 'none';
    document.body.classList.remove('no-scroll');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}

/** เปิด Modal แสดงรายละเอียดบุคลากรและโซเชียลมีเดีย */
window.openStaffModal = function(id) {
  const data = (typeof window.STAFF_DATA !== 'undefined' && window.STAFF_DATA.length) 
    ? window.STAFF_DATA 
    : (typeof STAFF_DATA !== 'undefined' ? STAFF_DATA : []);
  
  const staff = data.find(s => s.id === id);
  const modal = document.getElementById('staff-modal');
  if (!staff || !modal) return;

  const headerName = document.getElementById('staff-modal-header-name');
  const nameEl = document.getElementById('staff-modal-name');
  const posEl = document.getElementById('staff-modal-pos');
  const deptEl = document.getElementById('staff-modal-dept');

  if (headerName) headerName.textContent = staff.name;
  if (nameEl) nameEl.textContent = staff.name;
  if (posEl) posEl.textContent = staff.position;
  if (deptEl) deptEl.textContent = staff.department;

  const avatarContainer = document.getElementById('staff-modal-avatar');
  if (avatarContainer) {
    if (staff.image) {
      avatarContainer.innerHTML = `<img src="${staff.image}" alt="${escapeHtml(staff.name)}" class="h-28 w-28 rounded-full object-cover shadow-inner ring-4 ring-slate-100">`;
    } else {
      avatarContainer.innerHTML = `
        <div class="grid place-items-center h-28 w-28 rounded-full bg-slate-100 text-slate-400 ring-4 ring-slate-50 shadow-inner">
          <svg class="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>`;
    }
  }

  // แสดงช่องทางโซเชียลมีเดียหลากหลายช่องทาง
  const socialsContainer = document.getElementById('staff-modal-socials');
  if (socialsContainer) {
    socialsContainer.innerHTML = '';
    if (staff.socials && staff.socials.length > 0) {
      staff.socials.forEach(item => {
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = `flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-300 shadow-sm ${item.color}`;
        
        let icon = '🔗';
        if (item.type === 'facebook') icon = '🔵 Facebook';
        else if (item.type === 'line') icon = '🟢 LINE';
        else if (item.type === 'email') icon = '✉️ อีเมล';
        else if (item.type === 'phone') icon = '📞 โทรศัพท์';
        
        a.innerHTML = `<span>${icon}</span> <span class="truncate">${escapeHtml(item.label)}</span>`;
        socialsContainer.appendChild(a);
      });
    } else {
      socialsContainer.innerHTML = '<p class="text-sm text-slate-400 text-center py-2">ไม่มีข้อมูลช่องทางติดต่อเพิ่มเติม</p>';
    }
  }

  modal.classList.add('open');
  modal.style.display = 'grid';
  modal.style.pointerEvents = 'auto';
  document.body.classList.add('no-scroll');
};

/* ---------- ตัวกรองและแท็บในหมวดกลุ่มงาน/กลุ่มสาระ ---------- */
function initDepartmentsSection() {
  const filterBtns = document.querySelectorAll('.dept-filter-btn');
  const cards = document.querySelectorAll('.dept-card-item');
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-emerald-800', 'text-white', 'shadow-sm');
        b.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-50');
      });
      btn.classList.add('bg-emerald-800', 'text-white', 'shadow-sm');
      btn.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-50');

      const filter = btn.dataset.deptFilter;
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.deptCategory === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

/* ---------- ตัวกรองภาพกิจกรรม (Gallery Filter) ---------- */
function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('[data-gallery-filter]');
  const galleryItems = document.querySelectorAll('[data-gallery-category]');
  if (!filterBtns.length || !galleryItems.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-blue-900', 'text-white', 'shadow-sm');
        b.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-50');
      });
      btn.classList.add('bg-blue-900', 'text-white', 'shadow-sm');
      btn.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-50');

      const filter = btn.dataset.galleryFilter;
      galleryItems.forEach(item => {
        if (filter === 'all' || item.dataset.galleryCategory === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

/* ---------- ควบคุม Navbar Dropdowns ทั้งหมด ---------- */
function initNavDropdowns() {
  document.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
    const targetId = toggle.dataset.dropdownToggle;
    const menu = document.getElementById(targetId);
    if (!menu) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !menu.classList.contains('hidden');
      closeAllDropdowns();
      if (!isOpen) menu.classList.remove('hidden');
    });
  });

  document.addEventListener('click', closeAllDropdowns);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDropdowns();
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.add('hidden'));
}

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

/* ---------- Hero Carousel (ภาพสไลด์หน้าแรกแบบไดนามิกจากหลังบ้าน) ---------- */
function initCarousel() {
  const root = document.getElementById('hero-carousel');
  if (!root) return;

  const track = root.querySelector('.carousel-track');
  if (!track) return;

  // อ่านรายการแบนเนอร์จากระบบหลังบ้าน (localStorage หรือค่าเริ่มต้น)
  const storedBanners = localStorage.getItem('bcs_hero_banners');
  let bannerList = null;
  try {
    bannerList = storedBanners ? JSON.parse(storedBanners) : null;
  } catch (e) {}

  if (!bannerList || !bannerList.length) {
    bannerList = [
      {
        id: 1,
        title: 'โรงเรียนบางชัน (ปลื้มวิทยานุสรณ์)',
        tagline: 'มุ่งสู่ความเป็นเลิศทางวิชาการ ควบคู่คุณธรรม นำเทคโนโลยี น้อมนำหลักปรัชญาของเศรษฐกิจพอเพียง',
        badge: '⭐ อัตลักษณ์และความเป็นเลิศ',
        img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&auto=format&fit=crop&q=80',
        btnText: 'สารจากผู้อำนวยการ →',
        btnLink: '#director'
      },
      {
        id: 2,
        title: 'หลักสูตรสองภาษา (EP) & ห้องเรียนอัจฉริยะ',
        tagline: 'จัดการเรียนการสอนภาษาอังกฤษกับครูเจ้าของภาษา เสริมสร้างทักษะสากลและการคิดวิเคราะห์',
        badge: '🌍 English Program & Smart Learning',
        img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop&q=80',
        btnText: 'ดูหลักสูตรการศึกษา →',
        btnLink: '#vision'
      },
      {
        id: 3,
        title: 'ส่งเสริมทักษะชีวิต ศิลปะ ดนตรี และกีฬา',
        tagline: 'พัฒนาศักยภาพผู้เรียนรอบด้าน มีสุขภาพพลานามัยสมบูรณ์ พร้อมก้าวสู่สังคมยุคดิจิทัลอย่างมั่นใจ',
        badge: '🎨 คุณธรรม ดนตรี กีฬาเด่น',
        img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&auto=format&fit=crop&q=80',
        btnText: 'ชมกิจกรรมโรงเรียน →',
        btnLink: '#activities'
      }
    ];
  }

  // เรนเดอร์สไลด์พร้อมภาพพื้นหลังจริงและ Overlay กราเดียนต์เพื่อให้อ่านง่าย
  track.innerHTML = bannerList.map((b) => `
    <article class="carousel-slide relative min-w-full min-h-[480px] sm:min-h-[580px] lg:min-h-[640px] overflow-hidden flex flex-col justify-end p-8 sm:p-20 pb-24 sm:pb-32 text-white">
      <img src="${b.img}" alt="${escapeHtml(b.title)}" class="absolute inset-0 w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/40 to-transparent"></div>
      <div class="relative z-10 mx-auto max-w-[1536px] w-full">
        <span class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider mb-4 shadow">
          ${escapeHtml(b.badge || '📢 ข่าวสารและกิจกรรม')}
        </span>
        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
          ${escapeHtml(b.title)}
        </h1>
        <p class="mt-4 max-w-2xl text-sm sm:text-base text-emerald-100 font-light leading-relaxed drop-shadow">
          ${escapeHtml(b.tagline || '')}
        </p>
        <div class="mt-8 flex flex-wrap gap-4 relative z-30 pointer-events-auto">
          <a href="${b.btnLink || '#vision'}" class="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-7 py-3 text-sm shadow-lg hover:-translate-y-0.5 transition">
            ${escapeHtml(b.btnText || 'ดูข้อมูลเพิ่มเติม →')}
          </a>
          <a href="#admissions" class="carousel-admissions-btn rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur px-6 py-3 text-sm font-medium transition">
            📝 สมัครเรียนออนไลน์
          </a>
        </div>
      </div>
    </article>
  `).join('');

  // เรนเดอร์จุดบอกตำแหน่ง (Dots)
  const dotsContainer = root.querySelector('.absolute.bottom-6');
  if (dotsContainer) {
    dotsContainer.innerHTML = bannerList.map((_, idx) => `
      <button class="carousel-dot h-2.5 w-2.5 rounded-full bg-white/40 transition-all ${idx === 0 ? 'active' : ''}" aria-label="สไลด์ ${idx + 1}"></button>
    `).join('');
  }

  const slides = root.querySelectorAll('.carousel-slide');
  const dots = root.querySelectorAll('.carousel-dot');
  const INTERVAL = 5000;
  let index = 0;
  let timer = null;
  let startX = 0;

  function goTo(i) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, n) => d.classList.toggle('active', n === index));
  }

  function start() { stop(); timer = setInterval(() => goTo(index + 1), INTERVAL); }
  function stop() { if (timer) clearInterval(timer); }

  const prevBtn = root.querySelector('[data-carousel-prev]');
  const nextBtn = root.querySelector('[data-carousel-next]');
  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(index - 1); start(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(index + 1); start(); });
  dots.forEach((d, n) => d.addEventListener('click', () => { goTo(n); start(); }));

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
  root.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) goTo(diff < 0 ? index + 1 : index - 1);
    start();
  });

  goTo(0);
  start();
  checkAdmissionsStatusOnHomepage();
}

/* ---------- ตรวจสอบสถานะเปิด/ปิดรับสมัครเรียนบนหน้าแรก ---------- */
async function checkAdmissionsStatusOnHomepage() {
  const section = document.getElementById('admissions');

  function applyAdmissionsUI(status) {
    const isClosed = status === 'closed';

    // 1. ซิงก์ลิงก์/ปุ่มรับสมัครบนแถบเมนูด้านบน (Desktop & Mobile)
    const navLinks = document.querySelectorAll('a[href="#admissions"]');
    navLinks.forEach(link => {
      if (link.classList.contains('carousel-admissions-btn') || link.closest('.carousel-slide')) {
        // ปุ่มใน Hero Carousel
        if (isClosed) {
          link.innerHTML = '<span>🔒</span> <span>ปิดรับสมัครชั่วคราว</span>';
          link.className = 'carousel-admissions-btn rounded-xl bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-500/40 backdrop-blur px-6 py-3 text-sm font-semibold transition shadow';
        } else {
          link.innerHTML = '<span>📝</span> <span>สมัครเรียนออนไลน์</span>';
          link.className = 'carousel-admissions-btn rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur px-6 py-3 text-sm font-medium transition';
        }
      } else if (link.closest('nav') || link.closest('#mobile-menu') || link.id === 'nav-admissions-link' || link.id === 'mobile-nav-admissions-link') {
        // ลิงก์บน Header Navigation
        if (isClosed) {
          link.innerHTML = '<span>🔒</span> <span>ปิดรับสมัคร</span>';
          link.classList.remove('text-amber-300');
          link.classList.add('text-rose-300');
        } else {
          link.innerHTML = '<span>📝</span> <span>รับสมัครเรียน</span>';
          link.classList.remove('text-rose-300');
          link.classList.add('text-amber-300');
        }
      }
    });

    if (!section) return;

    // 2. ปรับปรุงการ์ดและแบบฟอร์มในส่วน #admissions
    const formContainer = section.querySelector('.lg\\:col-span-7');
    const badgeContainer = section.querySelector('.lg\\:col-span-5 .inline-flex');

    if (badgeContainer) {
      if (isClosed) {
        badgeContainer.className = 'inline-flex items-center gap-2 bg-red-600 text-white px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow';
        badgeContainer.innerHTML = '<span>🔒</span> ปิดระบบรับสมัครชั่วคราว';
      } else {
        badgeContainer.className = 'inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider';
        badgeContainer.innerHTML = '<span>📢</span> เปิดรับสมัครปีการศึกษา 2569';
      }
    }

    if (formContainer) {
      let closedCard = document.getElementById('adm-closed-card');
      const openWrapper = document.getElementById('adm-open-wrapper');
      const form = document.getElementById('online-admission-form');

      if (isClosed) {
        if (openWrapper) openWrapper.classList.add('hidden');
        else if (form) form.classList.add('hidden');
        if (!closedCard) {
          closedCard = document.createElement('div');
          closedCard.id = 'adm-closed-card';
          closedCard.className = 'bg-slate-950/95 border-2 border-amber-400 rounded-2xl p-8 sm:p-12 text-center text-white shadow-xl flex flex-col items-center justify-center';
          closedCard.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-red-600/20 text-red-400 grid place-items-center text-3xl mb-4 border border-red-500/30">
              🔒
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-amber-300 mb-2">ระบบรับสมัครเรียนออนไลน์ปิดชั่วคราว</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md font-light mb-6">
              ขณะนี้ปิดรับสมัครนักเรียนใหม่ประจำปีการศึกษา 2569 ชั่วคราว หรือสิ้นสุดระยะเวลาการยื่นใบสมัครออนไลน์แล้ว<br>
              หากผู้ปกครองมีข้อสงสัยหรือต้องการติดต่อขอยื่นเอกสารตัวจริง กรุณาติดต่อห้องธุรการโรงเรียน
            </p>
            <div class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-xs text-amber-300 font-bold border border-white/20 shadow">
              <span>📞</span> ติดต่อธุรการ: 02-517-1423 (วันและเวลาราชการ)
            </div>
          `;
          formContainer.appendChild(closedCard);
        } else {
          closedCard.classList.remove('hidden');
        }
      } else {
        if (closedCard) closedCard.classList.add('hidden');
        if (openWrapper) openWrapper.classList.remove('hidden');
        else if (form) form.classList.remove('hidden');
      }
    }
  }

  // 1) อ่านค่าเริ่มต้นจาก LocalStorage
  const localStatus = localStorage.getItem('bcs_admissions_status') || 'open';
  applyAdmissionsUI(localStatus);

  // 2) ดึงค่าสถานะล่าสุดจาก Supabase site_settings (ตารางกลาง)
  if (window.supabase && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
    try {
      const { data } = await getSupabase()
        .from('site_settings')
        .select('value')
        .eq('key', 'admissions')
        .maybeSingle();

      if (data && data.value) {
        const remoteStatus = data.value.is_open === false ? 'closed' : 'open';
        localStorage.setItem('bcs_admissions_status', remoteStatus);
        applyAdmissionsUI(remoteStatus);
      }
    } catch (e) {
      console.warn('โหลดสถานะรับสมัครจาก Supabase:', e);
    }
  }

  // 3) ตัวดักฟังการเปลี่ยนแปลงสถานะข้ามหน้าต่าง (Cross-Tab Sync)
  window.addEventListener('storage', (e) => {
    if (e.key === 'bcs_admissions_status') {
      applyAdmissionsUI(e.newValue || 'open');
    }
  });
}

/* ---------- ตรวจสอบประกาศด่วนจากระบบหลังบ้าน CMS ---------- */
function checkUrgentAnnouncementCms() {
  const widget = document.getElementById('announce-widget');
  if (!widget) return;
  try {
    const saved = JSON.parse(localStorage.getItem('bcs_urgent_announcement') || '{}');
    if (typeof saved.active === 'boolean' && !saved.active) {
      widget.classList.add('hidden');
      return;
    }
    if (saved.text) {
      const textEl = widget.querySelector('.truncate, p, span');
      if (textEl) textEl.textContent = saved.text;
    }
  } catch (e) {}
}

/* ---------- โหลดภาพกิจกรรมล่าสุดแบบไดนามิกจากระบบหลังบ้าน (Admin CMS) ---------- */
async function loadDynamicActivities() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  try {
    let items = [];

    // ลองดึงจาก Supabase
    if (window.supabase && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const { data } = await getSupabase()
          .from('tasks')
          .select('*')
          .like('category', 'ภาพกิจกรรม_%')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(4);
        if (data && data.length > 0) items = data;
      } catch (e) { /* ignore */ }
    }

    // หากไม่มีใน Supabase ให้ดึงจาก local storage
    if (items.length === 0) {
      try {
        items = JSON.parse(localStorage.getItem('bcs_dynamic_activities') || '[]');
      } catch (e) { /* ignore */ }
    }

    if (!items || items.length === 0) return;

    // สร้างการ์ดแสดงผลกิจกรรมใหม่
    items.forEach(act => {
      const cat = (act.category || '').replace('ภาพกิจกรรม_', '') || 'general';
      const catThai = cat === 'academic' ? 'วิชาการ' : (cat === 'sports' ? 'กีฬา' : 'ทั่วไป');
      const dateStr = act.created_at ? new Date(act.created_at).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : 'กิจกรรมใหม่';
      const imgHtml = act.file_url 
        ? `<img src="${act.file_url}" alt="${escapeHtml(act.title)}" class="h-44 w-full object-cover">`
        : `<div class="h-44 bg-gradient-to-br from-emerald-800 to-green-950 grid place-items-center text-5xl">📷</div>`;

      const card = document.createElement('article');
      card.setAttribute('data-gallery-category', cat);
      card.className = 'group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg transition';
      card.innerHTML = `
        ${imgHtml}
        <div class="p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-amber-600">${dateStr}</span>
            <span class="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">${catThai}</span>
          </div>
          <h3 class="font-bold text-slate-900 mt-1 leading-snug group-hover:text-emerald-700">${escapeHtml(act.title)}</h3>
          <p class="text-xs text-slate-500 mt-2 line-clamp-2">${escapeHtml(act.description || '')}</p>
        </div>
      `;

      grid.prepend(card);
    });
    bindGalleryCards();
  } catch (err) {
    console.warn('โหลดภาพกิจกรรมแบบไดนามิกไม่สำเร็จ:', err);
  }
}

/* ---------- Interactive Image Lightbox & Reaction Box ---------- */
function initImageLightbox() {
  const modal = document.getElementById('image-lightbox-modal');
  const closeBtn = document.getElementById('lightbox-close');
  const imgEl = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const categoryEl = document.getElementById('lightbox-category');
  const dateEl = document.getElementById('lightbox-date');
  const descEl = document.getElementById('lightbox-desc');
  const commentForm = document.getElementById('lightbox-comment-form');
  const commentInput = document.getElementById('lightbox-comment-input');
  const commentsList = document.getElementById('lightbox-comments-list');

  if (!modal || !closeBtn || !imgEl) return;

  let isZoomed = false;

  // ฟังก์ชันเปิด Lightbox
  window.openImageLightbox = function(options) {
    const { src, title, category, date, desc } = options;
    imgEl.src = src || '';
    imgEl.style.transform = 'scale(1)';
    isZoomed = false;
    imgEl.className = 'max-h-[60vh] max-w-full object-contain mx-auto cursor-zoom-in transition-transform duration-300 select-none';

    if (titleEl) titleEl.textContent = title || 'ภาพกิจกรรมโรงเรียนบางชัน';
    if (categoryEl) categoryEl.textContent = category || 'กิจกรรม';
    if (dateEl) dateEl.textContent = date ? `📅 ${date}` : '';
    if (descEl) descEl.textContent = desc || 'ภาพบรรยากาศกิจกรรมการเรียนรู้และการพัฒนาศักยภาพผู้เรียน โรงเรียนบางชัน (ปลื้มวิทยานุสรณ์)';

    modal.classList.remove('hidden');
    document.body.classList.add('no-scroll');
  };

  // คลิกที่รูปเพื่อซูมเข้า/ออก
  imgEl.addEventListener('click', () => {
    isZoomed = !isZoomed;
    if (isZoomed) {
      imgEl.style.transform = 'scale(1.8)';
      imgEl.className = 'max-h-[60vh] max-w-full object-contain mx-auto cursor-zoom-out transition-transform duration-300 select-none';
    } else {
      imgEl.style.transform = 'scale(1)';
      imgEl.className = 'max-h-[60vh] max-w-full object-contain mx-auto cursor-zoom-in transition-transform duration-300 select-none';
    }
  });

  // ปิด Lightbox
  const closeLightbox = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('no-scroll');
    imgEl.style.transform = 'scale(1)';
    isZoomed = false;
  };

  closeBtn.addEventListener('click', closeLightbox);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeLightbox();
  });

  // กล่องกด Reaction ตอบโต้ (❤️ 👏 💡 👍)
  document.querySelectorAll('.lightbox-react-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const countEl = btn.querySelector('.react-count');
      if (countEl) {
        let current = parseInt(countEl.textContent, 10) || 0;
        countEl.textContent = current + 1;
        btn.classList.add('scale-125');
        setTimeout(() => btn.classList.remove('scale-125'), 200);
      }
    });
  });

  // ฟอร์มส่งข้อความตอบโต้
  if (commentForm && commentInput && commentsList) {
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = commentInput.value.trim();
      if (!text) return;

      const item = document.createElement('div');
      item.className = 'bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 animate-fadeIn';
      item.innerHTML = `<span class="font-bold text-emerald-800">ผู้เยี่ยมชม:</span> ${escapeHtml(text)}`;
      commentsList.prepend(item);
      commentInput.value = '';
    });
  }

  // ผูกคลิกกับการ์ดภาพกิจกรรมทั้งหมดบนหน้าแรก
  bindGalleryCards();
}

function bindGalleryCards() {
  document.querySelectorAll('#gallery article, #gallery-grid article').forEach(card => {
    if (card.dataset.lightboxBound) return;
    card.dataset.lightboxBound = 'true';
    card.style.cursor = 'pointer';

    card.addEventListener('click', () => {
      const img = card.querySelector('img');
      const title = card.querySelector('h3') ? card.querySelector('h3').textContent : '';
      const date = card.querySelector('.text-amber-600') ? card.querySelector('.text-amber-600').textContent : '';
      const desc = card.querySelector('p') ? card.querySelector('p').textContent : '';
      const cat = card.dataset.galleryCategory || 'กิจกรรม';

      const imgSrc = img ? img.src : 'assets/logo.png';
      if (window.openImageLightbox) {
        window.openImageLightbox({
          src: imgSrc,
          title,
          category: cat,
          date,
          desc
        });
      }
    });
  });
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

/* ---------- ระบบรับสมัครนักเรียนใหม่ออนไลน์ + ตรวจสอบ/แก้ไข/ยืนยันสิทธิ์ ---------- */
function initOnlineAdmissions() {
  const form = document.getElementById('online-admission-form');
  if (!form) return;

  const STORAGE_KEY = 'bcs_admissions_records';
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzWauxGLUEvpjQseK1bd509Il27vN33jxgqxVhj65fsm5me-fSI61By2SNIUlE5aQvr/exec';

  // เตรียมข้อมูลตัวอย่างเริ่มต้นเพื่อให้ผู้ปกครอง/ผู้ดูแลระบบทดสอบค้นหาได้ทันที
  function getStoredAdmissions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      if (!list.some(r => r.citizen_id === '1100401234567')) {
        list.push({
          app_no: 'BCS-69-1001',
          citizen_id: '1100401234567',
          student_name: 'ด.ช. รักษ์เรียน เพียรศึกษา',
          grade: 'ป.1 (หลักสูตรปกติ)',
          parent_name: 'นายสมศักดิ์ เพียรศึกษา',
          phone: '081-234-5678',
          status: 'รอตรวจสอบเอกสาร',
          created_at: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  function saveStoredAdmission(record) {
    const list = getStoredAdmissions();
    const idx = list.findIndex(r => r.citizen_id === record.citizen_id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.unshift(record);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // สลับแท็บระหว่าง "1. กรอกใบสมัครเรียนใหม่" และ "2. ตรวจสอบ / แก้ไข / ยืนยันสิทธิ์"
  const tabNewBtn = document.getElementById('adm-tab-new-btn');
  const tabCheckBtn = document.getElementById('adm-tab-check-btn');
  const checkPanel = document.getElementById('adm-check-panel');

  function switchAdmissionTab(mode) {
    const isNew = mode === 'new';
    if (tabNewBtn && tabCheckBtn) {
      tabNewBtn.className = isNew
        ? 'flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-400 text-slate-950 shadow transition flex items-center justify-center gap-2'
        : 'flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-emerald-100 hover:bg-white/10 transition flex items-center justify-center gap-2';
      tabCheckBtn.className = !isNew
        ? 'flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-400 text-slate-950 shadow transition flex items-center justify-center gap-2'
        : 'flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-emerald-100 hover:bg-white/10 transition flex items-center justify-center gap-2';
    }
    form.classList.toggle('hidden', !isNew);
    if (checkPanel) checkPanel.classList.toggle('hidden', isNew);
  }

  if (tabNewBtn) tabNewBtn.addEventListener('click', () => switchAdmissionTab('new'));
  if (tabCheckBtn) tabCheckBtn.addEventListener('click', () => switchAdmissionTab('check'));

  const fileInput = document.getElementById('adm-file');
  const submitBtn = document.getElementById('adm-submit-btn');
  const btnText = document.getElementById('adm-btn-text');
  const spinner = document.getElementById('adm-spinner');
  const receiptBox = document.getElementById('adm-receipt-box');
  const receiptCodeEl = document.getElementById('adm-receipt-code');
  const gotoCheckBtn = document.getElementById('adm-goto-check-btn');

  let lastSubmittedCitizenId = '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const grade = document.getElementById('adm-grade').value;
    const studentName = document.getElementById('adm-student-name').value.trim();
    const citizenId = document.getElementById('adm-citizen-id').value.trim().replace(/\D/g, '');
    const parentName = document.getElementById('adm-parent-name').value.trim();
    const phone = document.getElementById('adm-phone').value.trim();
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (citizenId.length !== 13) {
      alert('⚠️ กรุณากรอกเลขประจำตัวประชาชนนักเรียนให้ครบ 13 หลัก (ตัวเลขเท่านั้น)');
      return;
    }

    try {
      submitBtn.disabled = true;
      spinner.classList.remove('hidden');
      btnText.textContent = 'กำลังบันทึกใบสมัครเรียน...';

      let driveUrl = '';
      if (file) {
        try {
          btnText.textContent = 'กำลังอัปโหลดเอกสารเข้า Google Drive...';
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = () => reject(new Error('อ่านไฟล์หลักฐานไม่สำเร็จ'));
            reader.readAsDataURL(file);
          });

          const res = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              base64: base64,
              fileName: `[สมัคร_${grade}]_${studentName}_${file.name}`,
              mimeType: file.type,
              category: 'admissions'
            })
          });
          const result = await res.json();
          driveUrl = result.url || result.fileUrl || '';
        } catch (uploadErr) {
          console.warn('อัปโหลดไฟล์ไป Google Drive ไม่สำเร็จ (บันทึกข้อมูลต่อ):', uploadErr);
        }
      }

      const receiptNo = `BCS-69-${Math.floor(1000 + Math.random() * 9000)}`;
      const newRecord = {
        app_no: receiptNo,
        citizen_id: citizenId,
        student_name: studentName,
        grade: grade,
        parent_name: parentName,
        phone: phone,
        document_url: driveUrl,
        status: 'รอตรวจสอบเอกสาร',
        created_at: new Date().toISOString()
      };

      // บันทึกลง LocalStorage ทันที
      saveStoredAdmission(newRecord);

      // บันทึกลง Supabase ตาราง admissions (ถ้าเชื่อมต่ออยู่)
      if (window.supabase && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        try {
          await getSupabase().from('admissions').upsert([newRecord], { onConflict: 'citizen_id' });
        } catch (dbErr) {
          console.warn('บันทึกใบสมัครลง Supabase admissions:', dbErr);
        }
      }

      lastSubmittedCitizenId = citizenId;
      if (receiptCodeEl) receiptCodeEl.textContent = `รหัสใบสมัคร: ${receiptNo} | เลข ปชช.: ${citizenId}`;
      if (receiptBox) receiptBox.classList.remove('hidden');

      form.reset();
    } catch (err) {
      console.error(err);
      alert('❌ เกิดข้อผิดพลาดในการส่งใบสมัคร: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      spinner.classList.add('hidden');
      btnText.textContent = 'ส่งใบสมัครเรียนออนไลน์';
    }
  });

  if (gotoCheckBtn) {
    gotoCheckBtn.addEventListener('click', () => {
      switchAdmissionTab('check');
      const lookupInput = document.getElementById('adm-lookup-nid');
      if (lookupInput && lastSubmittedCitizenId) {
        lookupInput.value = lastSubmittedCitizenId;
        lookupByCitizenId(lastSubmittedCitizenId);
      }
    });
  }

  // ส่วนค้นหา แก้ไข และยืนยันการสมัครเรียนด้วยเลขบัตรประชาชน 13 หลัก
  const lookupInput = document.getElementById('adm-lookup-nid');
  const lookupBtn = document.getElementById('adm-lookup-btn');
  const sampleNidBtn = document.getElementById('adm-sample-nid-btn');
  const resultCard = document.getElementById('adm-lookup-result');
  const emptyCard = document.getElementById('adm-lookup-empty');
  const resAppNo = document.getElementById('res-app-no');
  const resStatusBadge = document.getElementById('res-status-badge');
  const editGrade = document.getElementById('edit-adm-grade');
  const editName = document.getElementById('edit-adm-name');
  const editParent = document.getElementById('edit-adm-parent');
  const editPhone = document.getElementById('edit-adm-phone');
  const saveEditBtn = document.getElementById('save-edit-adm-btn');
  const confirmBtn = document.getElementById('confirm-adm-btn');
  const feedbackEl = document.getElementById('adm-action-feedback');

  let currentRecord = null;

  function renderStatusBadge(status) {
    if (!resStatusBadge) return;
    if (status === 'ยืนยันการสมัครเรียนแล้ว') {
      resStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-400 text-slate-950 shadow';
      resStatusBadge.textContent = '✅ ยืนยันการสมัครเรียนแล้ว';
    } else {
      resStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950';
      resStatusBadge.textContent = `⏳ ${status || 'รอตรวจสอบเอกสาร'}`;
    }
  }

  async function lookupByCitizenId(rawNid) {
    const nid = (rawNid || '').trim().replace(/\D/g, '');
    if (nid.length !== 13) {
      alert('⚠️ กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ครบถ้วน');
      return;
    }

    if (feedbackEl) feedbackEl.classList.add('hidden');
    let found = null;

    // 1. ค้นหาจาก Supabase ตาราง admissions ก่อน
    if (window.supabase && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
      try {
        const { data } = await getSupabase()
          .from('admissions')
          .select('*')
          .eq('citizen_id', nid)
          .maybeSingle();
        if (data) found = data;
      } catch (e) { /* ignore */ }
    }

    // 2. ค้นหาจาก LocalStorage
    if (!found) {
      const list = getStoredAdmissions();
      found = list.find(r => r.citizen_id === nid) || null;
    }

    if (!found) {
      currentRecord = null;
      if (resultCard) resultCard.classList.add('hidden');
      if (emptyCard) emptyCard.classList.remove('hidden');
      return;
    }

    currentRecord = found;
    if (emptyCard) emptyCard.classList.add('hidden');
    if (resultCard) resultCard.classList.remove('hidden');

    if (resAppNo) resAppNo.textContent = `${found.app_no || 'BCS-69-XXXX'} (เลข ปชช. ${found.citizen_id})`;
    renderStatusBadge(found.status);

    if (editGrade) editGrade.value = found.grade || 'ป.1 (หลักสูตรปกติ)';
    if (editName) editName.value = found.student_name || '';
    if (editParent) editParent.value = found.parent_name || '';
    if (editPhone) editPhone.value = found.phone || '';
  }

  if (lookupBtn && lookupInput) {
    lookupBtn.addEventListener('click', () => lookupByCitizenId(lookupInput.value));
    lookupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        lookupByCitizenId(lookupInput.value);
      }
    });
  }

  if (sampleNidBtn && lookupInput) {
    sampleNidBtn.addEventListener('click', () => {
      lookupInput.value = '1100401234567';
      lookupByCitizenId('1100401234567');
    });
  }

  // ปุ่มบันทึกการแก้ไขข้อมูลผู้สมัคร
  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
      if (!currentRecord) return;
      currentRecord.grade = editGrade ? editGrade.value : currentRecord.grade;
      currentRecord.student_name = editName ? editName.value.trim() : currentRecord.student_name;
      currentRecord.parent_name = editParent ? editParent.value.trim() : currentRecord.parent_name;
      currentRecord.phone = editPhone ? editPhone.value.trim() : currentRecord.phone;
      currentRecord.updated_at = new Date().toISOString();

      saveStoredAdmission(currentRecord);

      if (window.supabase && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        try {
          await getSupabase().from('admissions').upsert([currentRecord], { onConflict: 'citizen_id' });
        } catch (e) { /* ignore */ }
      }

      if (feedbackEl) {
        feedbackEl.textContent = '💾 บันทึกการแก้ไขข้อมูลผู้สมัครเรียบร้อยแล้ว!';
        feedbackEl.classList.remove('hidden');
      }
    });
  }

  // ปุ่มยืนยันการสมัครเรียน / รายงานตัว
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!currentRecord) return;
      currentRecord.grade = editGrade ? editGrade.value : currentRecord.grade;
      currentRecord.student_name = editName ? editName.value.trim() : currentRecord.student_name;
      currentRecord.parent_name = editParent ? editParent.value.trim() : currentRecord.parent_name;
      currentRecord.phone = editPhone ? editPhone.value.trim() : currentRecord.phone;
      currentRecord.status = 'ยืนยันการสมัครเรียนแล้ว';
      currentRecord.updated_at = new Date().toISOString();

      saveStoredAdmission(currentRecord);
      renderStatusBadge(currentRecord.status);

      if (window.supabase && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        try {
          await getSupabase().from('admissions').upsert([currentRecord], { onConflict: 'citizen_id' });
        } catch (e) { /* ignore */ }
      }

      if (feedbackEl) {
        feedbackEl.textContent = '🎉 ยืนยันสิทธิ์การสมัครเรียนเรียบร้อยแล้ว! กรุณานำเอกสารตัวจริงมายื่นตามวันเวลาที่กำหนดด้านบน';
        feedbackEl.classList.remove('hidden');
      }
    });
  }
}
