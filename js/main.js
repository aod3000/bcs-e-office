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
  initGalleryFilter();
  initNavDropdowns();
  initImageLightbox();
  loadDynamicActivities();
});

/* ---------- ทำเนียบบุคลากร Popup Modal ---------- */
function initStaffModal() {
  const modal = document.getElementById('staff-modal');
  const closeBtn = document.getElementById('staff-modal-close');
  if (!modal || !closeBtn) return;

  // ผูกคลิกกับการ์ดบุคลากร
  document.querySelectorAll('[data-staff-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.staffId, 10);
      openStaffModal(id);
    });
  });

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.classList.remove('no-scroll');
  };

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}

/** เปิด Modal แสดงรายละเอียดบุคลากรและโซเชียลมีเดีย */
function openStaffModal(id) {
  if (typeof STAFF_DATA === 'undefined') return;
  const staff = STAFF_DATA.find(s => s.id === id);
  const modal = document.getElementById('staff-modal');
  if (!staff || !modal) return;

  document.getElementById('staff-modal-header-name').textContent = staff.name;
  document.getElementById('staff-modal-name').textContent = staff.name;
  document.getElementById('staff-modal-pos').textContent = staff.position;
  document.getElementById('staff-modal-dept').textContent = staff.department;

  const avatarContainer = document.getElementById('staff-modal-avatar');
  if (staff.image) {
    avatarContainer.innerHTML = `<img src="${staff.image}" alt="${staff.name}" class="h-28 w-28 rounded-full object-cover shadow-inner ring-4 ring-slate-100">`;
  } else {
    avatarContainer.innerHTML = `
      <div class="grid place-items-center h-28 w-28 rounded-full bg-slate-100 text-slate-400 ring-4 ring-slate-50 shadow-inner">
        <svg class="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>`;
  }

  // แสดงช่องทางโซเชียลมีเดียหลากหลายช่องทาง
  const socialsContainer = document.getElementById('staff-modal-socials');
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
      
      a.innerHTML = `<span>${icon}</span> <span class="truncate">${item.label}</span>`;
      socialsContainer.appendChild(a);
    });
  } else {
    socialsContainer.innerHTML = '<p class="text-sm text-slate-400 text-center py-2">ไม่มีข้อมูลช่องทางติดต่อเพิ่มเติม</p>';
  }

  modal.classList.add('open');
  document.body.classList.add('no-scroll');
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
