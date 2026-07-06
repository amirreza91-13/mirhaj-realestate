// ========================================
// املاک میرحاج - Service Worker
// ========================================

const CACHE_NAME = 'mirhaj-v3';
const STATIC_CACHE = 'mirhaj-static-v3';
const API_CACHE = 'mirhaj-api-v3';

// فایل‌های استاتیک که باید کش بشن
const STATIC_FILES = [
  '/pages/index.html',
  '/pages/properties.html',
  '/pages/login.html',
  '/pages/register.html',
  '/pages/ai-assistant.html',
  '/pages/messages.html',
  '/pages/compare.html',
  '/pages/bookmarks.html',
  '/pages/map-view.html',
  '/pages/404.html',
  '/css/style.css',
  '/css/animations.css',
  '/js/main.js',
  '/js/search.js',
  '/js/charts.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap',
];

// ---- Install ----
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static files');
      return cache.addAll(STATIC_FILES.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.log('[SW] Cache error (non-fatal):', err));
    }).then(() => self.skipWaiting())
  );
});

// ---- Activate ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== API_CACHE)
            .map(key => { console.log('[SW] Deleting old cache:', key); return caches.delete(key); })
      );
    }).then(() => self.clients.claim())
  );
});

// ---- Fetch Strategy ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Uploads - Cache First
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // CSS/JS - Network First (so future style/script fixes reach everyone right away,
  // instead of possibly showing an old cached version for a while)
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static HTML pages - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// ---- Strategies ----

// Network First: API calls
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ success: false, message: 'اتصال به سرور برقرار نیست', offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Cache First: images/uploads
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}

// Stale While Revalidate: HTML/CSS/JS
// اصلاح شده: دیگه با اولین خطای موقتی شبکه، صفحه ۴۰۴ نشون داده نمیشه
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // اگه نسخه‌ی کش‌شده داریم، همون رو فوری برگردون و در پس‌زمینه به‌روزرسانی کن
  if (cached) {
    fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }

  // اگه کش نداریم، منتظر شبکه بمون (نه یه catch سریع که بره سراغ ۴۰۴)
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    // فقط اگه واقعاً درخواست ناوبری صفحه بود (نه فایل CSS/JS)، صفحه ۴۰۴/آفلاین رو نشون بده
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/pages/404.html');
      if (fallback) return fallback;
    }
    return new Response('', { status: 503, statusText: 'Network error, please retry' });
  }
}

// ---- Background Sync (پیام‌های ارسال نشده) ----
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  console.log('[SW] Syncing pending messages...');
}

// ---- Push Notifications ----
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'املاک میرحاج', {
      body: data.body || 'پیام جدید دارید',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      dir: 'rtl',
      lang: 'fa',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/pages/messages.html' },
      actions: [
        { action: 'open', title: 'مشاهده' },
        { action: 'close', title: 'بستن' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/pages/index.html';
    event.waitUntil(clients.openWindow(url));
  }
});
