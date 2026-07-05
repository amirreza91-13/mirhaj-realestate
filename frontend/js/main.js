// ========================================
// املاک میرحاج - توابع مشترک
// ========================================

const API = window.location.origin + '/api';

// ---- Auth Helpers ----
function getToken() { return localStorage.getItem('mirhaj_token'); }
function getUser()  { 
  const u = localStorage.getItem('mirhaj_user');
  return u ? JSON.parse(u) : null;
}
function setAuth(token, user) {
  localStorage.setItem('mirhaj_token', token);
  localStorage.setItem('mirhaj_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('mirhaj_token');
  localStorage.removeItem('mirhaj_user');
}
function isLoggedIn() { return !!getToken(); }

// ---- API Fetch Helper ----
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({ success: false, message: 'خطای شبکه' }));
  return { ok: res.ok, status: res.status, data };
}

// ---- Toast ----
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-100%)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ---- Modal ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}
// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ---- Format Price ----
function formatPrice(price) {
  if (!price) return '---';
  const n = parseInt(price);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' میلیارد تومان';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + ' میلیون تومان';
  return n.toLocaleString('fa-IR') + ' تومان';
}

// ---- Format Date ----
function formatDate(dateStr) {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

// ---- Property Type Label ----
const PROPERTY_TYPES = {
  apartment: 'آپارتمان', villa: 'ویلا', land: 'زمین',
  commercial: 'تجاری', workshop: 'کارگاه', storage: 'انباری',
  garden: 'باغ', other: 'سایر'
};

const DEED_TYPES = {
  single_page: 'تک برگ',
  mangooledar: 'منگوله‌دار',
  gholanome: 'قولنامه',
  mobayeeh: 'مبایعه‌نامه',
  sabz: 'سند سبز',
  zard: 'سند زرد',
  other: 'سایر'
};

const ROLE_LABELS = { manager: 'مدیر کل', agent: 'مشاور', user: 'کاربر عادی' };

function propertyTypeLabel(t) { return PROPERTY_TYPES[t] || t; }
function deedTypeLabel(t)     { return DEED_TYPES[t] || t; }
function roleLabel(r)         { return ROLE_LABELS[r] || r; }

// ---- Avatar Emoji ----
const AVATARS = ['🏠', '🏡', '🏢', '🏗️', '🔑'];
function avatarEmoji(n) { return AVATARS[(parseInt(n) || 1) - 1] || AVATARS[0]; }

// ---- Build Property Card HTML ----
function buildPropertyCard(p) {
  const img = p.primary_image
    ? `<img src="/${p.primary_image}" alt="${p.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=no-image>🏠</div>'">`
    : `<div class="no-image">🏠</div>`;

  return `
    <div class="property-card" onclick="location.href='/pages/property-detail.html?id=${p.id}'">
      <div class="property-card-img">
        ${img}
        <span class="property-badge ${p.active ? '' : 'inactive'}">${propertyTypeLabel(p.property_type)}</span>
      </div>
      <div class="property-card-body">
        <div class="property-card-title">${p.title}</div>
        <div class="property-card-location">📍 ${p.location_name || '---'}</div>
        <div class="property-card-meta">
          ${p.rooms ? `<span class="property-meta-item">🛏️ ${p.rooms} اتاق</span>` : ''}
          ${p.area ? `<span class="property-meta-item">📐 ${p.area} م²</span>` : ''}
          ${p.building_age ? `<span class="property-meta-item">🏗️ ${p.building_age} سال</span>` : ''}
        </div>
        <div class="property-card-price">${formatPrice(p.total_price)}</div>
      </div>
    </div>`;
}

// ---- Build Pagination ----
function buildPagination(container, pagination, onPageChange) {
  if (!pagination || pagination.pages <= 1) { container.innerHTML = ''; return; }
  const { page, pages } = pagination;
  let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="(${onPageChange})(${page - 1})">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="(${onPageChange})(${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 2) {
      html += `<button disabled>…</button>`;
    }
  }
  html += `<button ${page >= pages ? 'disabled' : ''} onclick="(${onPageChange})(${page + 1})">›</button>`;
  container.innerHTML = html;
}

// ---- Navbar Setup ----
function setupNavbar() {
  const user = getUser();
  const navAuth = document.getElementById('nav-auth');
  const navUser = document.getElementById('nav-user');
  const navUsername = document.getElementById('nav-username');
  const navDashboard = document.getElementById('nav-dashboard');

  if (user && isLoggedIn()) {
    if (navAuth) navAuth.classList.add('hidden');
    if (navUser) navUser.classList.remove('hidden');
    if (navUsername) navUsername.textContent = user.full_name;
    if (navDashboard) {
      if (user.role === 'manager') navDashboard.href = '/pages/dashboard-manager.html';
      else if (user.role === 'agent') navDashboard.href = '/pages/dashboard-agent.html';
      else navDashboard.href = '/pages/dashboard-user.html';
    }
  } else {
    if (navAuth) navAuth.classList.remove('hidden');
    if (navUser) navUser.classList.add('hidden');
  }

  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navbar-nav');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => navMenu.classList.toggle('open'));
  }

  // Active link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav a').forEach(a => {
    const href = a.getAttribute('href')?.split('/').pop();
    if (href === currentPage) a.classList.add('active');
  });
}

// ---- Logout ----
function logout() {
  clearAuth();
  showToast('با موفقیت خارج شدید', 'info');
  setTimeout(() => location.href = '/pages/index.html', 800);
}

// ---- Redirect if not logged in ----
function requireAuth() {
  if (!isLoggedIn()) {
    location.href = '/pages/login.html?redirect=' + encodeURIComponent(location.pathname + location.search);
    return false;
  }
  return true;
}

// ---- Redirect if not role ----
function requireRole(role) {
  const user = getUser();
  if (!user || user.role !== role) {
    showToast('دسترسی غیرمجاز', 'error');
    setTimeout(() => location.href = '/pages/index.html', 1000);
    return false;
  }
  return true;
}

// ---- Load Locations ----
async function loadLocations(selectEl, selectedId = null) {
  const { data } = await apiFetch('/locations');
  if (!data.success) return;
  selectEl.innerHTML = '<option value="">همه مناطق</option>';
  data.locations.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = loc.name;
    if (selectedId && loc.id == selectedId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// ---- Confirm Dialog ----
function confirmAction(message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header"><h3>تأیید عملیات</h3></div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="confirm-cancel">انصراف</button>
        <button class="btn btn-danger" id="confirm-ok">تأیید</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); document.body.style.overflow = ''; };
  overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); document.body.style.overflow = ''; onConfirm(); };
}

// ---- Unread Messages Badge ----
// ---- Notification Bell ----
async function loadNotifBadge() {
  if (!isLoggedIn()) return;
  try {
    const { data } = await apiFetch('/notifications/unread-count');
    if (!data?.success || data.count <= 0) return;
    const navActions = document.querySelector('.navbar-actions');
    if (!navActions || document.getElementById('notif-bell')) return;
    const bell = document.createElement('a');
    bell.id = 'notif-bell';
    bell.href = '/pages/notifications.html';
    bell.style.cssText = 'position:relative;display:flex;align-items:center;color:var(--text-secondary);font-size:1.2rem;padding:0.3rem';
    bell.innerHTML = `🔔<span style="position:absolute;top:-2px;left:-2px;background:var(--danger);color:white;border-radius:50%;width:16px;height:16px;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center">${data.count > 9 ? '9+' : data.count}</span>`;
    navActions.prepend(bell);
  } catch {}
}

async function loadUnreadBadge() {
  if (!isLoggedIn()) return;
  const { data } = await apiFetch('/messages/unread-count').catch(() => ({ data: { success: false } }));
  if (!data?.success) return;
  const count = data.count;
  if (count <= 0) return;

  // Add badge to messages link in navbar
  document.querySelectorAll('.navbar-nav a').forEach(a => {
    if (a.href.includes('messages')) {
      if (!a.querySelector('.nav-unread')) {
        a.style.position = 'relative';
        const badge = document.createElement('span');
        badge.className = 'nav-unread';
        badge.style.cssText = 'position:absolute;top:-4px;left:-4px;background:var(--danger);color:white;border-radius:50%;width:16px;height:16px;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center';
        badge.textContent = count > 9 ? '9+' : count;
        a.appendChild(badge);
      }
    }
  });
}

// Init navbar on every page
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setTimeout(loadUnreadBadge, 1000);
  setTimeout(loadNotifBadge, 1200);
});
