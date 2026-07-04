// ========================================
// املاک میرحاج - Service Worker
// ========================================

const CACHE_NAME = 'mirhaj-v1';
const STATIC_CACHE = 'mirhaj-static-v1';
const API_CACHE = 'mirhaj-api-v1';

// فایل‌های استاتیک که باید کش بشن
const STATIC_FILES = [
  '/pages/index.html',
  '/pages/properties.html',
  '/pages/login.html',
  '/pages/register.html',
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

  // Static files - Stale While Revalidate
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
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || caches.match('/pages/404.html');
}

// ---- Background Sync (پیام‌های ارسال نشده) ----
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // ارسال مجدد پیام‌های ذخیره شده آفلاین
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
