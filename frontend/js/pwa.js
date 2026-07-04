// ========================================
// املاک میرحاج - PWA Manager
// ========================================

let deferredPrompt = null;
let swRegistration = null;

// ---- Register Service Worker ----
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker پشتیبانی نمیشه');
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('✅ Service Worker ثبت شد');

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });

  } catch (err) {
    console.log('❌ Service Worker خطا:', err);
  }
}

// ---- Install Prompt ----
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  hideInstallButton();
  showToast('اپ با موفقیت نصب شد! 🎉', 'success');
});

function showInstallButton() {
  // Add install button to navbar
  const navActions = document.querySelector('.navbar-actions');
  if (!navActions || document.getElementById('pwa-install-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.className = 'btn btn-accent btn-sm';
  btn.innerHTML = '📱 نصب اپ';
  btn.style.cssText = 'animation: pulse 2s infinite;';
  btn.onclick = installApp;
  navActions.prepend(btn);

  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(230,126,34,0.4); }
      50% { box-shadow: 0 0 0 8px rgba(230,126,34,0); }
    }`;
  document.head.appendChild(style);
}

function hideInstallButton() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.remove();
}

async function installApp() {
  if (!deferredPrompt) {
    showToast('اپ قبلاً نصب شده یا مرورگر پشتیبانی نمیکند', 'info');
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('در حال نصب...', 'info');
  }
  deferredPrompt = null;
}

// ---- Update Banner ----
function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed; top: 68px; left: 0; right: 0;
    background: var(--primary); color: white;
    padding: 0.75rem 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
    z-index: 2000; font-size: 0.88rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    animation: slideDown 0.3s ease;
  `;
  banner.innerHTML = `
    <span>🔄 نسخه جدید موجود است</span>
    <div style="display:flex;gap:0.5rem">
      <button onclick="document.getElementById('update-banner').remove()"
        style="background:rgba(255,255,255,0.2);border:none;color:white;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer">
        بعداً
      </button>
      <button onclick="location.reload()"
        style="background:white;color:var(--primary);border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;font-weight:700">
        بروزرسانی
      </button>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `@keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }`;
  document.head.appendChild(style);
  document.body.appendChild(banner);
}

// ---- Offline Detection ----
function initOfflineDetection() {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    let bar = document.getElementById('offline-bar');

    if (!isOnline) {
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'offline-bar';
        bar.style.cssText = `
          position: fixed; bottom: 0; left: 0; right: 0;
          background: var(--danger); color: white;
          text-align: center; padding: 0.5rem;
          font-size: 0.85rem; font-weight: 600;
          z-index: 9999;`;
        bar.innerHTML = '📵 اتصال اینترنت قطع است - حالت آفلاین';
        document.body.appendChild(bar);
      }
      showToast('اتصال اینترنت قطع شد', 'warning');
    } else {
      if (bar) {
        bar.style.background = 'var(--success)';
        bar.innerHTML = '✅ اتصال برقرار شد';
        setTimeout(() => bar.remove(), 2000);
      }
    }
  };

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  if (!navigator.onLine) updateOnlineStatus();
}

// ---- Check if installed (standalone) ----
function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// ---- Add to Homescreen hint for iOS ----
function showIOSHint() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.navigator.standalone;
  const dismissed = localStorage.getItem('ios_hint_dismissed');

  if (!isIOS || isInStandalone || dismissed) return;

  const hint = document.createElement('div');
  hint.style.cssText = `
    position: fixed; bottom: 1rem; left: 1rem; right: 1rem;
    background: white; border: 1.5px solid var(--border);
    border-radius: var(--radius-lg); padding: 1rem 1.25rem;
    box-shadow: var(--shadow-lg); z-index: 3000;
    font-size: 0.85rem; direction: rtl;
    animation: fadeInUp 0.4s ease;
  `;
  hint.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:0.75rem">
      <span style="font-size:2rem">📱</span>
      <div>
        <div style="font-weight:700;margin-bottom:0.4rem">نصب اپ روی iPhone</div>
        <div style="color:var(--text-secondary);line-height:1.7">
          برای نصب روی صفحه اصلی:<br>
          ۱. روی دکمه <strong>Share</strong> (□↑) کلیک کنید<br>
          ۲. گزینه <strong>"Add to Home Screen"</strong> را انتخاب کنید
        </div>
      </div>
      <button onclick="this.closest('div').parentElement.remove();localStorage.setItem('ios_hint_dismissed','1')"
        style="background:none;border:none;font-size:1.3rem;color:var(--text-muted);cursor:pointer;flex-shrink:0">✕</button>
    </div>`;
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 8000);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  initOfflineDetection();

  // Show iOS hint after 3 seconds
  setTimeout(showIOSHint, 3000);

  // If already installed, show different UI
  if (isInstalled()) {
    document.body.classList.add('pwa-installed');
    console.log('✅ اپ به صورت PWA اجرا میشه');
  }
});
