// ========================================
// املاک میرحاج - چارت‌ها و نمودارها
// ========================================

// ---- Draw Pie Chart (SVG) ----
function drawPieChart(containerId, data, title = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const colors = ['#1B4F72','#2E86C1','#E67E22','#27AE60','#8E44AD','#E74C3C','#F39C12','#16A085'];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>داده‌ای موجود نیست</h3></div>`; return; }

  let startAngle = -Math.PI / 2;
  const cx = 130, cy = 130, r = 100;
  let slices = '';
  let legend = '';

  data.forEach((item, i) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = colors[i % colors.length];
    const pct = Math.round((item.value / total) * 100);

    slices += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z"
      fill="${color}" stroke="white" stroke-width="2" opacity="0.9"
      style="transition:opacity 0.2s;cursor:pointer"
      onmouseenter="this.style.opacity='1';this.style.filter='brightness(1.1)'"
      onmouseleave="this.style.opacity='0.9';this.style.filter=''"
      title="${item.label}: ${item.value} (${pct}%)"/>`;

    legend += `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem">
      <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0"></div>
      <span style="flex:1">${item.label}</span>
      <strong>${item.value}</strong>
      <span style="color:var(--text-muted)">${pct}%</span>
    </div>`;

    startAngle = endAngle;
  });

  container.innerHTML = `
    <div style="text-align:center;font-weight:700;margin-bottom:1rem;font-size:1rem">${title}</div>
    <div style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap;justify-content:center">
      <svg width="260" height="260" viewBox="0 0 260 260">
        ${slices}
        <circle cx="${cx}" cy="${cy}" r="45" fill="white"/>
        <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="13" font-weight="700" fill="#1A2332">${total.toLocaleString('fa-IR')}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#95A5A6">کل آگهی</text>
      </svg>
      <div style="display:flex;flex-direction:column;gap:0.6rem;min-width:160px">${legend}</div>
    </div>`;
}

// ---- Draw Bar Chart (SVG) ----
function drawBarChart(containerId, data, title = '', yLabel = '') {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const W = 520, H = 260;
  const padL = 55, padR = 20, padT = 30, padB = 55;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min((chartW / data.length) * 0.6, 50);
  const gap = chartW / data.length;

  // Y axis ticks
  const ticks = 5;
  let yAxis = '';
  for (let i = 0; i <= ticks; i++) {
    const y = padT + chartH - (i / ticks) * chartH;
    const val = Math.round((i / ticks) * maxVal);
    yAxis += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E8ECF0" stroke-width="1"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#95A5A6">${val.toLocaleString('fa-IR')}</text>`;
  }

  // Bars
  let bars = '';
  data.forEach((item, i) => {
    const x = padL + i * gap + (gap - barW) / 2;
    const barH = (item.value / maxVal) * chartH;
    const y = padT + chartH - barH;
    const color = item.color || '#2E86C1';

    bars += `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}"
        fill="${color}" rx="4" opacity="0.85"
        style="transition:opacity 0.2s;cursor:pointer"
        onmouseenter="this.style.opacity='1';document.getElementById('bar-tooltip-${containerId}').textContent='${item.label}: ${item.value.toLocaleString('fa-IR')}'"
        onmouseleave="this.style.opacity='0.85';document.getElementById('bar-tooltip-${containerId}').textContent=''"/>
      ${item.value > 0 ? `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#1A2332" font-weight="600">${item.value}</text>` : ''}
      <text x="${x + barW / 2}" y="${padT + chartH + 18}" text-anchor="middle" font-size="10" fill="#5D6D7E">${item.label}</text>`;
  });

  container.innerHTML = `
    <div style="text-align:center;font-weight:700;margin-bottom:0.5rem;font-size:1rem">${title}</div>
    <div style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-bottom:0.5rem" id="bar-tooltip-${containerId}"></div>
    <div style="overflow-x:auto">
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="min-width:${W}px">
        ${yAxis}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#BDC3C7" stroke-width="1.5"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#BDC3C7" stroke-width="1.5"/>
        ${bars}
      </svg>
    </div>`;
}

// ---- Draw Line Chart (SVG) ----
function drawLineChart(containerId, data, title = '') {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const W = 520, H = 220;
  const padL = 50, padR = 20, padT = 25, padB = 45;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const points = data.map((d, i) => {
    const x = padL + (i / (data.length - 1 || 1)) * chartW;
    const y = padT + chartH - (d.value / maxVal) * chartH;
    return { x, y, ...d };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${padL},${padT + chartH} ` + points.map(p => `${p.x},${p.y}`).join(' ') + ` ${points[points.length - 1].x},${padT + chartH}`;

  // Y ticks
  let yAxis = '';
  for (let i = 0; i <= 4; i++) {
    const y = padT + chartH - (i / 4) * chartH;
    const val = Math.round((i / 4) * maxVal);
    yAxis += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E8ECF0" stroke-width="1"/>
      <text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#95A5A6">${val}</text>`;
  }

  let dots = '';
  let labels = '';
  points.forEach(p => {
    dots += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#2E86C1" stroke="white" stroke-width="2"
      style="cursor:pointer" title="${p.label}: ${p.value}"/>`;
    labels += `<text x="${p.x}" y="${padT + chartH + 18}" text-anchor="middle" font-size="9" fill="#5D6D7E">${p.label}</text>`;
  });

  container.innerHTML = `
    <div style="text-align:center;font-weight:700;margin-bottom:0.5rem;font-size:1rem">${title}</div>
    <div style="overflow-x:auto">
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="min-width:${W}px">
        <defs>
          <linearGradient id="area-grad-${containerId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2E86C1" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#2E86C1" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${yAxis}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#BDC3C7" stroke-width="1.5"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#BDC3C7" stroke-width="1.5"/>
        <polygon points="${area}" fill="url(#area-grad-${containerId})"/>
        <polyline points="${polyline}" fill="none" stroke="#2E86C1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${labels}
      </svg>
    </div>`;
}

// ---- Load Stats for Manager Dashboard ----
async function loadManagerCharts() {
  const { data } = await apiFetch('/admin/stats');
  if (!data.success) return;

  // Pie chart - property types
  const { data: propsData } = await apiFetch('/properties?limit=200');
  if (propsData.success) {
    const typeCounts = {};
    propsData.properties.forEach(p => {
      typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
    });
    const pieData = Object.entries(typeCounts).map(([type, count]) => ({
      label: propertyTypeLabel(type),
      value: count
    })).sort((a, b) => b.value - a.value);

    drawPieChart('chart-property-types', pieData, 'توزیع نوع آگهی‌ها');
  }

  // Bar chart - properties by location
  const { data: locsData } = await apiFetch('/locations');
  if (locsData.success && propsData.success) {
    const locCounts = {};
    propsData.properties.forEach(p => {
      const loc = p.location_name || 'نامشخص';
      locCounts[loc] = (locCounts[loc] || 0) + 1;
    });
    const barData = Object.entries(locCounts)
      .map(([label, value]) => ({ label, value, color: '#1B4F72' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    drawBarChart('chart-by-location', barData, 'آگهی‌ها به تفکیک منطقه');
  }

  // Line chart - registrations over time (last 7 days)
  const { data: logsData } = await apiFetch('/admin/registrations');
  if (logsData.success) {
    const dayCounts = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' });
      dayCounts[key] = 0;
    }
    logsData.logs.forEach(log => {
      const d = new Date(log.created_at);
      const key = d.toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' });
      if (key in dayCounts) dayCounts[key]++;
    });
    const lineData = Object.entries(dayCounts).map(([label, value]) => ({ label, value }));
    drawLineChart('chart-registrations', lineData, 'ثبت‌نام‌های ۷ روز اخیر');
  }
}
