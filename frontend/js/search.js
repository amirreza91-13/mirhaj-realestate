// ========================================
// املاک میرحاج - جستجوی زنده و فیلتر پیشرفته
// ========================================

let searchDebounceTimer = null;

// ---- Live Search with Debounce ----
function initLiveSearch(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);
  if (!input || !suggestions) return;

  input.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const val = input.value.trim();
    if (val.length < 2) { suggestions.innerHTML = ''; suggestions.style.display = 'none'; return; }

    searchDebounceTimer = setTimeout(async () => {
      const { data } = await apiFetch(`/properties?search=${encodeURIComponent(val)}&limit=5`);
      if (!data.success || data.properties.length === 0) {
        suggestions.style.display = 'none';
        return;
      }
      suggestions.innerHTML = data.properties.map(p => `
        <div class="search-suggestion-item" onclick="location.href='/pages/property-detail.html?id=${p.id}'">
          <span style="font-size:1.2rem">${p.property_type === 'apartment' ? '🏢' : p.property_type === 'villa' ? '🏡' : p.property_type === 'land' ? '🌿' : '🏠'}</span>
          <div>
            <div style="font-weight:600;font-size:0.88rem">${p.title}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">📍 ${p.location_name || '---'}</div>
          </div>
          <span class="sug-price">${formatPrice(p.total_price)}</span>
        </div>`).join('');
      suggestions.style.display = 'block';
    }, 320);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.style.display = 'none';
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { suggestions.style.display = 'none'; }
    if (e.key === 'Enter') {
      suggestions.style.display = 'none';
      if (typeof applyFilters === 'function') applyFilters();
    }
  });
}

// ---- Price Range Slider ----
function initPriceSlider(minId, maxId, displayId, min = 0, max = 20000000000) {
  const minEl = document.getElementById(minId);
  const maxEl = document.getElementById(maxId);
  const displayEl = document.getElementById(displayId);
  if (!minEl || !maxEl) return;

  function updateDisplay() {
    const minVal = parseInt(minEl.value);
    const maxVal = parseInt(maxEl.value);
    if (displayEl) {
      displayEl.textContent = `${formatPrice(minVal)} — ${formatPrice(maxVal)}`;
    }
    // Prevent overlap
    if (minVal > maxVal - 100000000) {
      minEl.value = maxVal - 100000000;
    }
  }

  minEl.addEventListener('input', updateDisplay);
  maxEl.addEventListener('input', updateDisplay);
  updateDisplay();
}

// ---- Area Range Slider ----
function initAreaSlider(minId, maxId, displayId) {
  const minEl = document.getElementById(minId);
  const maxEl = document.getElementById(maxId);
  const displayEl = document.getElementById(displayId);
  if (!minEl || !maxEl) return;

  function updateDisplay() {
    const minVal = parseInt(minEl.value);
    const maxVal = parseInt(maxEl.value);
    if (displayEl) {
      displayEl.textContent = `${minVal.toLocaleString('fa-IR')} — ${maxVal.toLocaleString('fa-IR')} م²`;
    }
    if (minVal > maxVal - 10) minEl.value = maxVal - 10;
  }

  minEl.addEventListener('input', updateDisplay);
  maxEl.addEventListener('input', updateDisplay);
  updateDisplay();
}

// ---- Tag Filter (property type buttons) ----
function initTagFilters(containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener('click', e => {
    const tag = e.target.closest('.tag-filter');
    if (!tag) return;

    const isAll = tag.dataset.value === '';
    if (isAll) {
      container.querySelectorAll('.tag-filter').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
    } else {
      container.querySelector('[data-value=""]')?.classList.remove('active');
      tag.classList.toggle('active');
    }

    const selected = [...container.querySelectorAll('.tag-filter.active')]
      .map(t => t.dataset.value)
      .filter(Boolean);

    if (typeof onSelect === 'function') onSelect(selected);
  });
}

// ---- Active Filters Display ----
function renderActiveFilters(containerId, filters, onRemove) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filterLabels = {
    property_type: { label: 'نوع', formatter: v => v.split(',').map(propertyTypeLabel).join('، ') },
    sort: { label: 'مرتب‌سازی', formatter: v => ({oldest:'قدیمی‌ترین', price_asc:'ارزان‌ترین', price_desc:'گران‌ترین'}[v] || v) },
    location_id: { label: 'منطقه', formatter: v => v },
    rooms: { label: 'اتاق', formatter: v => `${v}+ اتاق` },
    min_price: { label: 'حداقل قیمت', formatter: formatPrice },
    max_price: { label: 'حداکثر قیمت', formatter: formatPrice },
    min_area: { label: 'حداقل متراژ', formatter: v => `${v} م²` },
    max_area: { label: 'حداکثر متراژ', formatter: v => `${v} م²` },
    search: { label: 'جستجو', formatter: v => v },
  };

  const tags = Object.entries(filters)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined)
    .map(([key, val]) => {
      const info = filterLabels[key] || { label: key, formatter: v => v };
      return `<span class="active-filter-tag">
        ${info.label}: ${info.formatter(val)}
        <button onclick="(${onRemove.toString()})('${key}')" title="حذف فیلتر">✕</button>
      </span>`;
    });

  container.innerHTML = tags.join('');
  container.style.display = tags.length > 0 ? 'flex' : 'none';
}

// ---- Scroll to Top Button ----
function initScrollTop() {
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.innerHTML = '↑';
  btn.title = 'بازگشت به بالا';
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
}

// ---- Navbar Scroll Effect ----
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ---- Image Zoom ----
function initImageZoom() {
  document.addEventListener('click', e => {
    const img = e.target.closest('.gallery-main img');
    if (!img) return;
    const overlay = document.createElement('div');
    overlay.className = 'img-zoom-overlay';
    overlay.innerHTML = `
      <button class="img-zoom-close" onclick="this.closest('.img-zoom-overlay').remove()">✕</button>
      <img src="${img.src}" alt="${img.alt}">`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  });
}

// ---- Dark Mode ----
function initDarkMode() {
  const saved = localStorage.getItem('mirhaj_dark');
  if (saved === '1') document.body.classList.add('dark-mode');

  // Add toggle button to navbar actions
  const navActions = document.querySelector('.navbar-actions');
  if (navActions) {
    const btn = document.createElement('button');
    btn.className = 'dark-toggle';
    btn.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    btn.title = 'تغییر تم';
    btn.onclick = () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('mirhaj_dark', isDark ? '1' : '0');
      btn.innerHTML = isDark ? '☀️' : '🌙';
    };
    navActions.prepend(btn);
  }
}

// ---- Skeleton Cards ----
function buildSkeletonCards(count = 6) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div style="padding:1rem">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line price"></div>
      </div>
    </div>`).join('');
}

// ---- Counter Animation ----
function animateCounter(el, target, duration = 1200) {
  const start = 0;
  const step = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.round(current).toLocaleString('fa-IR');
    if (current >= target) clearInterval(timer);
  }, 16);
}

// ---- Init All on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  initScrollTop();
  initNavbarScroll();
  initDarkMode();
  initImageZoom();
});