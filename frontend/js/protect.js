// ========================================
// املاک میرحاج - محافظت از کد
// ========================================

(function() {
  'use strict';

  // ---- جلوگیری از F12 و DevTools ----
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl+Shift+C (Inspector)
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl+S (Save)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    // Ctrl+A (Select All)
    if (e.ctrlKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault(); return false;
    }
  });

  // ---- جلوگیری از کلیک راست ----
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault(); return false;
  });

  // ---- جلوگیری از انتخاب متن ----
  document.addEventListener('selectstart', function(e) {
    // فقط در input و textarea اجازه بده
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return true;
    e.preventDefault(); return false;
  });

  // ---- تشخیص باز بودن DevTools ----
  let devtoolsOpen = false;
  const threshold = 160;

  function detectDevTools() {
    const widthDiff  = window.outerWidth  - window.innerWidth  > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if ((widthDiff || heightDiff) && !devtoolsOpen) {
      devtoolsOpen = true;
      showProtectMsg();
    } else if (!widthDiff && !heightDiff && devtoolsOpen) {
      devtoolsOpen = false;
      hideProtectMsg();
    }
  }

  setInterval(detectDevTools, 1000);

  // ---- debugger trap ----
  setInterval(function() {
    (function() { return false; }
    ['constructor']('debugger')
    ['constructor']('debugger')());
  }, 3000);

  function showProtectMsg() {
    let el = document.getElementById('protect-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'protect-overlay';
      el.style.cssText = `
        position:fixed;inset:0;background:rgba(13,27,42,0.97);
        z-index:99999;display:flex;align-items:center;justify-content:center;
        flex-direction:column;gap:1rem;color:white;text-align:center;
        font-family:'Vazirmatn','Tahoma',sans-serif;direction:rtl;
      `;
      el.innerHTML = `
        <div style="font-size:4rem">🔒</div>
        <h2 style="font-size:1.5rem;font-weight:900;margin:0">دسترسی غیرمجاز</h2>
        <p style="opacity:0.75;font-size:0.95rem;max-width:380px;line-height:1.7">
          این سایت توسط <strong>املاک میرحاج</strong> طراحی شده و محتوای آن محفوظ است.
          لطفاً DevTools را ببندید.
        </p>
        <div style="font-size:0.82rem;opacity:0.5">📞 09132089979 | محمدآباد جرقویه</div>`;
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  }

  function hideProtectMsg() {
    const el = document.getElementById('protect-overlay');
    if (el) el.style.display = 'none';
  }

  // ---- جلوگیری از drag تصاویر ----
  document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault(); return false;
    }
  });

  // ---- watermark نامرئی روی تصاویر ----
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      document.querySelectorAll('img').forEach(function(img) {
        img.setAttribute('draggable', 'false');
        img.style.userSelect = 'none';
        img.style.webkitUserSelect = 'none';
        img.style.pointerEvents = 'none';
      });
    }, 500);
  });

})();
