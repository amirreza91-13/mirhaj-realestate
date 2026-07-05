// ========================================
// املاک میرحاج - سیستم بلادرنگ WebSocket
// ========================================

let socket = null;
let reconnectTimer = null;
let isConnected = false;

function initRealtime() {
  if (typeof io === 'undefined') return;

 socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10
  });

  // اتصال برقرار شد
  socket.on('connect', () => {
    isConnected = true;
    console.log('✅ WebSocket متصل شد');

    // اگه لاگین هست، userId رو بفرست
    const user = getUser();
    if (user) socket.emit('user:join', user.id);

    // نوار اتصال رو پنهان کن
    hideConnectionBar();
  });

  // قطع اتصال
  socket.on('disconnect', () => {
    isConnected = false;
    console.log('❌ WebSocket قطع شد');
    showConnectionBar('در حال اتصال مجدد...', 'warning');
  });

  // اتصال مجدد
  socket.on('reconnect', () => {
    isConnected = true;
    showConnectionBar('اتصال برقرار شد ✅', 'success');
    setTimeout(hideConnectionBar, 2000);
    const user = getUser();
    if (user) socket.emit('user:join', user.id);
  });

  // ---- Events ----

  // آگهی جدید
  socket.on('property:new', (data) => {
    showRealtimeToast(
      `🏠 آگهی جدید: ${data.title}`,
      `📍 ${data.location} | ${formatPrice(data.price)}`,
      `/pages/property-detail.html?id=${data.id}`,
      'primary'
    );
    // بروز رسانی badge اگه روی صفحه لیست هستیم
    if (window.location.pathname.includes('properties')) {
      showToast('آگهی جدید ثبت شد! 🏠 صفحه را بروزرسانی کنید', 'info', 5000);
    }
  });

  // پیام جدید
  socket.on('message:new', (data) => {
    // اگه روی صفحه messages نیستیم
    if (!window.location.pathname.includes('messages')) {
      showRealtimeToast(
        `💬 پیام از ${data.sender_name}`,
        data.body.substring(0, 60) + (data.body.length > 60 ? '...' : ''),
        `/pages/messages.html`,
        'success'
      );
    }

    // بروز رسانی badge ناوبار
    updateMessageBadge();
  });

  // پیام خوانده شد
  socket.on('message:seen', (data) => {
    // اگه روی صفحه messages هستیم، tick دوتایی نشون بده
    const ticks = document.querySelectorAll('.msg-meta .tick');
    ticks.forEach(t => { t.textContent = '✓✓'; t.style.color = '#2E86C1'; });
  });

  // تعداد آنلاین‌ها
  socket.on('online:count', (count) => {
    const el = document.getElementById('online-count');
    if (el) {
      el.textContent = count.toLocaleString('fa-IR');
      el.style.animation = 'pulse 0.5s ease';
    }
  });
}

// ---- Realtime Toast (بزرگتر از toast معمولی) ----
function showRealtimeToast(title, body, link, type = 'primary') {
  const colors = { primary: '#1B4F72', success: '#27AE60', warning: '#E67E22', danger: '#E74C3C' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 1.5rem; left: 1.5rem;
    background: white; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    border-right: 4px solid ${colors[type]||colors.primary};
    padding: 1rem 1.25rem;
    max-width: 320px; z-index: 9999;
    animation: slideIn 0.3s ease;
    cursor: pointer;
  `;
  toast.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem">
      <div>
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.25rem;color:var(--text-primary)">${title}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.5">${body}</div>
        ${link ? `<div style="font-size:0.78rem;color:${colors[type]};margin-top:0.4rem;font-weight:600">مشاهده ›</div>` : ''}
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer;flex-shrink:0">✕</button>
    </div>`;
  if (link) toast.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') location.href = link; });
  document.body.appendChild(toast);

  // صدای اعلان (اختیاری)
  playNotifSound();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

// ---- Connection Bar ----
function showConnectionBar(msg, type) {
  let bar = document.getElementById('connection-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'connection-bar';
    bar.style.cssText = `position:fixed;top:68px;left:0;right:0;z-index:2000;padding:0.5rem;text-align:center;font-size:0.82rem;font-weight:600;transition:all 0.3s`;
    document.body.appendChild(bar);
  }
  const colors = { warning: '#E67E22', success: '#27AE60', danger: '#E74C3C' };
  bar.style.background = colors[type] || '#666';
  bar.style.color = 'white';
  bar.textContent = msg;
  bar.style.display = 'block';
}

function hideConnectionBar() {
  const bar = document.getElementById('connection-bar');
  if (bar) bar.style.display = 'none';
}

// ---- Update Message Badge ----
async function updateMessageBadge() {
  if (!isLoggedIn()) return;
  try {
    const { data } = await apiFetch('/messages/unread-count');
    if (!data.success) return;
    let badge = document.getElementById('msg-badge-rt');
    if (data.count > 0) {
      if (!badge) {
        const msgLink = document.querySelector('.navbar-nav a[href*="messages"]');
        if (msgLink) {
          msgLink.style.position = 'relative';
          badge = document.createElement('span');
          badge.id = 'msg-badge-rt';
          badge.style.cssText = 'position:absolute;top:-4px;left:-4px;background:var(--danger);color:white;border-radius:50%;width:16px;height:16px;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center';
          msgLink.appendChild(badge);
        }
      }
      if (badge) badge.textContent = data.count > 9 ? '9+' : data.count;
    } else if (badge) {
      badge.remove();
    }
  } catch(e) {}
}

// ---- Notification Sound ----
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

// ---- Init on page load ----
document.addEventListener('DOMContentLoaded', () => {
  // Load Socket.IO client script
  if (!document.querySelector('script[src*="socket.io"]')) {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = initRealtime;
    document.head.appendChild(script);
  } else {
    initRealtime();
  }
});
