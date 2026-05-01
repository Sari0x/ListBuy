'use strict';

/* ═══════════════════════════════════════════════════════════════
   FIREBASE — lista en tiempo real
═══════════════════════════════════════════════════════════════ */
const FB_REF = 'https://listbuy-45c65-default-rtdb.firebaseio.com/shoppingList';

let items    = {};
let knownIds = new Set();
let sse;

function connectSSE() {
  try {
    sse = new EventSource(FB_REF + '.json');

    sse.addEventListener('put', e => {
      try {
        const { path, data } = JSON.parse(e.data);
        if (path === '/') { items = data || {}; }
        else {
          const id = path.slice(1);
          if (data === null) { delete items[id]; knownIds.delete(id); }
          else               { items[id] = data; }
        }
        renderList();
      } catch (_) {}
    });

    sse.addEventListener('patch', e => {
      try {
        const { path, data } = JSON.parse(e.data);
        const id = path.slice(1);
        if (data === null) { delete items[id]; knownIds.delete(id); }
        else               { items[id] = Object.assign(items[id] || {}, data); }
        renderList();
      } catch (_) {}
    });

    sse.addEventListener('keep-alive', () => {});
    sse.onerror = () => { sse.close(); setTimeout(connectSSE, 5000); };
  } catch (_) {
    setTimeout(connectSSE, 5000);
  }
}

async function fbPost(body) {
  const r = await fetch(FB_REF + '.json', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return r.json();
}
async function fbPatch(id, body) {
  await fetch(`${FB_REF}/${id}.json`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}
async function fbDelete(id) {
  await fetch(`${FB_REF}/${id}.json`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   ESTADO LOCAL  (historial, presupuesto)
═══════════════════════════════════════════════════════════════ */
const LB_KEY = 'lb_extra';

const SEED_EXTRA = {
  history: [
    {
      id: 'h1', date: '2026-04-24', store: 'Coto · Av. Rivadavia',
      items: [
        { name: 'Pollo',         price: 13500, qty: 1 },
        { name: 'Masa de tarta', price: 1700,  qty: 2 },
        { name: 'Tomates',       price: 2200,  qty: 1 },
        { name: 'Aceite de oliva', price: 8600, qty: 1 },
        { name: 'Yerba 500g',    price: 4200,  qty: 1 },
      ],
      total: 31900,
    },
    {
      id: 'h2', date: '2026-04-17', store: 'Disco · Caballito',
      items: [
        { name: 'Pollo',   price: 12800, qty: 1 },
        { name: 'Tomates', price: 2100,  qty: 2 },
        { name: 'Pan',     price: 1500,  qty: 1 },
        { name: 'Leche',   price: 1400,  qty: 3 },
      ],
      total: 21700,
    },
    {
      id: 'h3', date: '2026-04-10', store: 'Carrefour Express',
      items: [
        { name: 'Pollo',           price: 13200, qty: 1 },
        { name: 'Aceite de oliva', price: 8400,  qty: 1 },
        { name: 'Masa de tarta',   price: 1650,  qty: 2 },
      ],
      total: 24900,
    },
  ],
  budget: 120000,
};

function loadExtra() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (raw) return Object.assign({}, SEED_EXTRA, JSON.parse(raw));
  } catch (_) {}
  return Object.assign({}, SEED_EXTRA);
}
function saveExtra() {
  try { localStorage.setItem(LB_KEY, JSON.stringify(extra)); } catch (_) {}
}

let extra = loadExtra();

/* Gasto del mes actual derivado del historial */
function spentThisMonth() {
  const now  = new Date();
  const mon  = now.getMonth();
  const year = now.getFullYear();
  return extra.history
    .filter(h => { const d = new Date(h.date); return d.getMonth() === mon && d.getFullYear() === year; })
    .reduce((s, h) => s + h.total, 0);
}

/* Historial de precios de un producto */
function priceHistory(name) {
  const out = [];
  for (const h of extra.history) {
    for (const it of h.items) {
      if (it.name.toLowerCase() === name.toLowerCase()) {
        out.push({ date: h.date, price: it.price, store: h.store });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS DE FORMATO
═══════════════════════════════════════════════════════════════ */
function fmtAR(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function fmtReceiptDate() {
  const now = new Date();
  const d  = String(now.getDate()).padStart(2, '0');
  const m  = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][now.getMonth()];
  const y  = String(now.getFullYear()).slice(2);
  return `${d}·${m}·${y}`;
}

function currentMonthLabel() {
  const now = new Date();
  return now.toLocaleDateString('es-AR', { month: 'long' }) + ' · ' + now.getFullYear();
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('in'), 2200);
}

/* ═══════════════════════════════════════════════════════════════
   NÚMERO DE RECIBO
═══════════════════════════════════════════════════════════════ */
const RECEIPT_NUM = (() => {
  const n = (parseInt(localStorage.getItem('lb_receipt_num') || '41')) + 1;
  localStorage.setItem('lb_receipt_num', String(n));
  return String(n).padStart(4, '0');
})();

/* ═══════════════════════════════════════════════════════════════
   TEMA
═══════════════════════════════════════════════════════════════ */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('btnTheme').textContent = t === 'dark' ? '☀' : '☾';
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('lb_theme', next);
}

/* ═══════════════════════════════════════════════════════════════
   AGREGAR ITEM
═══════════════════════════════════════════════════════════════ */
async function addItem() {
  const nEl  = document.getElementById('iName');
  const pEl  = document.getElementById('iPrice');
  const qEl  = document.getElementById('iQty');
  const name = nEl.value.trim();

  if (!name) {
    nEl.classList.add('err');
    nEl.focus();
    setTimeout(() => nEl.classList.remove('err'), 800);
    toast('Ingresá el nombre del producto');
    return;
  }

  await fbPost({
    name,
    price:    Math.max(0, parseFloat(pEl.value) || 0),
    quantity: Math.max(1, parseInt(qEl.value)   || 1),
    checked:  false,
    ts:       Date.now(),
  });

  nEl.value = ''; pEl.value = ''; qEl.value = '';
  nEl.focus();
  toast('¡Producto agregado!');
}

/* ═══════════════════════════════════════════════════════════════
   TOGGLE / ELIMINAR
═══════════════════════════════════════════════════════════════ */
async function toggleItem(id) {
  if (!items[id]) return;
  await fbPatch(id, { checked: !items[id].checked });
}

function removeItem(id) {
  const el = document.querySelector(`.list-item[data-id="${id}"]`);
  if (el) {
    el.classList.add('fade-out');
    setTimeout(() => fbDelete(id), 210);
  } else {
    fbDelete(id);
  }
}

/* ═══════════════════════════════════════════════════════════════
   EDITAR ITEM
═══════════════════════════════════════════════════════════════ */
let editingId = null;

function openEdit(id) {
  if (!items[id]) return;
  editingId = id;
  const it = items[id];
  document.getElementById('eName').value  = it.name;
  document.getElementById('ePrice').value = it.price > 0 ? it.price : '';
  document.getElementById('eQty').value   = it.quantity || it.qty || 1;
  openModal('editBackdrop', 'editSheet');
  setTimeout(() => document.getElementById('eName').focus(), 300);
}

function closeEdit() {
  closeModal('editBackdrop', 'editSheet');
  editingId = null;
}

async function saveEdit() {
  if (!editingId) return;
  const nEl  = document.getElementById('eName');
  const name = nEl.value.trim();
  if (!name) {
    nEl.classList.add('err');
    nEl.focus();
    setTimeout(() => nEl.classList.remove('err'), 800);
    toast('Ingresá el nombre');
    return;
  }
  await fbPatch(editingId, {
    name,
    price:    Math.max(0, parseFloat(document.getElementById('ePrice').value) || 0),
    quantity: Math.max(1, parseInt(document.getElementById('eQty').value)     || 1),
  });
  closeEdit();
  toast('¡Producto actualizado!');
}

/* ═══════════════════════════════════════════════════════════════
   RENDERIZADO DE LA LISTA
═══════════════════════════════════════════════════════════════ */
function renderList() {
  const list     = document.getElementById('itemList');
  const empty    = document.getElementById('emptyList');
  const countLbl = document.getElementById('itemCountLbl');
  const totBlock = document.getElementById('totalsBlock');
  const shrBlock = document.getElementById('shareBlock');

  const ids = Object.keys(items).sort((a, b) => (items[a].ts || 0) - (items[b].ts || 0));

  /* Eliminar nodos que ya no están en Firebase */
  list.querySelectorAll('.list-item').forEach(el => {
    if (!items[el.dataset.id]) el.remove();
  });

  /* Item count en header */
  const totalQty = ids.reduce((s, id) => s + (items[id].quantity || items[id].qty || 1), 0);
  countLbl.textContent = `${ids.length} ${ids.length === 1 ? 'ITEM' : 'ITEMS'} · ABIERTA`;

  if (ids.length === 0) {
    empty.hidden  = false;
    totBlock.hidden = true;
    shrBlock.hidden = true;
    return;
  }

  empty.hidden    = false; /* se muestra solo si la lista está vacía */
  empty.hidden    = true;
  totBlock.hidden = false;
  shrBlock.hidden = false;

  let total = 0;

  ids.forEach(id => {
    const it  = items[id];
    const qty = it.quantity ?? it.qty ?? 1;
    const sub = (it.price || 0) * qty;
    total += sub;

    /* Historia de precios para delta */
    const hist     = priceHistory(it.name);
    const lastPrice = hist.length ? hist[0].price : null;
    const diffPct   = (lastPrice && it.price && lastPrice !== it.price)
      ? Math.round(((it.price - lastPrice) / lastPrice) * 100)
      : null;

    let li = list.querySelector(`.list-item[data-id="${id}"]`);
    const isNew = !li;

    if (isNew) {
      li = document.createElement('li');
      li.className  = 'list-item';
      li.dataset.id = id;
      list.appendChild(li);
      if (!knownIds.has(id)) {
        li.classList.add('new-in');
        knownIds.add(id);
        li.addEventListener('animationend', () => li.classList.remove('new-in'), { once: true });
      }
    }

    li.className = 'list-item' + (it.checked ? ' is-checked' : '')
      + (li.classList.contains('new-in') ? ' new-in' : '');

    const deltaHtml = diffPct !== null
      ? `<span class="item-delta">${diffPct > 0 ? '↑' : '↓'}${Math.abs(diffPct)}%</span>`
      : '';

    const priceInfo = it.price > 0
      ? `${qty > 1 ? `${qty} × ` : ''}$${fmtAR(it.price)}${deltaHtml}`
      : `${qty > 1 ? `${qty} unid.` : 'sin precio'}`;

    const subtotalHtml = it.price > 0
      ? `<span class="item-subtotal mono-num">$${fmtAR(sub)}</span>` : '';

    li.innerHTML = `
      <div class="item-row-main">
        <button class="item-checkbox" onclick="toggleItem('${id}')" aria-label="Marcar como comprado">
          ${it.checked ? '×' : ''}
        </button>
        <span class="item-name">${esc(it.name)}</span>
        ${subtotalHtml}
      </div>
      <div class="item-row-meta">
        <span class="item-price-info">${priceInfo}</span>
        <span class="item-actions">
          <button onclick="openEdit('${id}')">edit</button>
          <button onclick="removeItem('${id}')">del</button>
        </span>
      </div>`;
  });

  renderTotals(total, ids.length);
}

/* ── Totales + barra de presupuesto ── */
function renderTotals(total, count) {
  document.getElementById('subtotalCount').textContent = count;
  document.getElementById('subtotalAmt').textContent   = '$' + fmtAR(total);
  document.getElementById('totalAmt').textContent      = '$' + fmtAR(total);

  const spent = spentThisMonth();
  const combined = spent + total;
  const budget   = extra.budget;
  const pct      = budget > 0 ? Math.min(100, Math.round((combined / budget) * 100)) : 0;
  const remain   = budget - combined;

  document.getElementById('budgetPct').textContent    = `${pct}%`;
  document.getElementById('budgetFill').style.width   = `${pct}%`;
  document.getElementById('budgetSpent').textContent  = `$${fmtAR(combined)} / $${fmtAR(budget)}`;
  document.getElementById('budgetRemain').textContent = remain >= 0
    ? `restan $${fmtAR(remain)}` : `excede $${fmtAR(-remain)}`;
}

/* ═══════════════════════════════════════════════════════════════
   GESTIÓN DE VISTAS (History, Budget, Compare)
═══════════════════════════════════════════════════════════════ */
function openView(id) {
  closeMenu();
  const el = document.getElementById(id);
  if (!el) return;

  /* Renderizar contenido según la vista */
  if (id === 'viewHistory') renderHistoryView();
  if (id === 'viewBudget')  renderBudgetView();
  if (id === 'viewCompare') renderCompareView();

  el.classList.add('open');
}

function closeView(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ═══════════════════════════════════════════════════════════════
   MENÚ DRAWER
═══════════════════════════════════════════════════════════════ */
function openMenu() {
  const ids  = Object.keys(items);
  const nav  = document.getElementById('drawerNav');
  const month = document.getElementById('drawerMonth');

  month.textContent = currentMonthLabel();

  const navItems = [
    { id: 'list',    label: 'Lista actual',    meta: `${ids.length} items` },
    { id: 'history', label: 'Historial',        meta: `${extra.history.length} compras` },
    { id: 'budget',  label: 'Presupuesto',       meta: `$${fmtAR(extra.budget)}/mes` },
    { id: 'compare', label: 'Comparar precios',  meta: 'evolución' },
  ];

  nav.innerHTML = navItems.map(it => `
    <button class="drawer-item" onclick="${it.id === 'list' ? 'closeMenu()' : `openView('view${capitalize(it.id)}')`}">
      <span class="drawer-item-name">${it.label}</span>
      <span class="drawer-item-meta">${it.meta}</span>
    </button>`).join('');

  document.getElementById('menuBackdrop').classList.add('open');
  document.getElementById('menuDrawer').classList.add('open');
}

function closeMenu() {
  document.getElementById('menuBackdrop').classList.remove('open');
  document.getElementById('menuDrawer').classList.remove('open');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ═══════════════════════════════════════════════════════════════
   VISTA HISTORIAL
═══════════════════════════════════════════════════════════════ */
function renderHistoryView() {
  const body = document.getElementById('historyBody');
  if (!extra.history.length) {
    body.innerHTML = `<p class="lbl" style="padding:40px 0; text-align:center; opacity:.4">— SIN COMPRAS PREVIAS —</p>`;
    return;
  }
  body.innerHTML = extra.history.map(h => `
    <div class="history-entry">
      <div class="history-entry-hdr">
        <div>
          <div class="history-store">${esc(h.store)}</div>
          <div class="history-date lbl">${fmtDate(h.date)} · ${h.items.length} items</div>
        </div>
        <div class="history-total">$${fmtAR(h.total)}</div>
      </div>
      <div>
        ${h.items.map((it, i) => `
          <div class="history-item-row">
            <span>${it.qty > 1 ? `${it.qty}× ` : ''}${esc(it.name)}</span>
            <span>$${fmtAR((it.price || 0) * (it.qty || 1))}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   VISTA PRESUPUESTO
═══════════════════════════════════════════════════════════════ */
function renderBudgetView() {
  const body    = document.getElementById('budgetBody');
  const spent   = spentThisMonth();
  const total   = Object.values(items).reduce((s, it) => s + (it.price || 0) * (it.quantity || it.qty || 1), 0);
  const combined = spent + total;
  const budget  = extra.budget;
  const pct     = budget > 0 ? Math.min(100, Math.round((combined / budget) * 100)) : 0;
  const remain  = budget - combined;

  /* Actualiza el título de la vista con el mes */
  document.getElementById('budgetViewTitle').textContent =
    'Presupuesto · ' + new Date().toLocaleDateString('es-AR', { month: 'long' });

  /* 20 segmentos */
  const segments = Array.from({ length: 20 }, (_, i) => {
    const filled = (i + 1) / 20 * 100 <= pct;
    return `<div class="seg-bar-cell${filled ? ' filled' : ''}"></div>`;
  }).join('');

  /* Últimos 3 meses (hardcoded como en el prototipo, extendible) */
  const pastMonths = [
    { m: 'Abr 26', spent: 102400, budget: 120000 },
    { m: 'Mar 26', spent: 118200, budget: 120000 },
    { m: 'Feb 26', spent: 89000,  budget: 100000 },
  ];

  body.innerHTML = `
    <div class="budget-view-available lbl">Disponible</div>
    <div class="budget-view-amount">$${fmtAR(remain)}</div>
    <div class="budget-view-sub">de $${fmtAR(budget)} · gastaste $${fmtAR(combined)}</div>

    <div class="seg-bar">${segments}</div>
    <div class="budget-scale lbl">
      <span>0%</span><span>${pct}%</span><span>100%</span>
    </div>

    <div class="budget-edit-label lbl">Editar presupuesto</div>
    <input type="range" id="budgetSlider"
      min="20000" max="300000" step="5000" value="${budget}"
      oninput="updateBudget(this.value)" onchange="updateBudget(this.value)">
    <div class="budget-slider-scale">
      <span>$20.000</span>
      <span style="font-weight:600" id="budgetSliderVal">$${fmtAR(budget)}/mes</span>
      <span>$300.000</span>
    </div>

    <div class="lbl" style="opacity:.55; margin-bottom:12px">Últimos 3 meses</div>
    ${pastMonths.map(row => {
      const p = Math.min(100, Math.round((row.spent / row.budget) * 100));
      return `
        <div class="month-history-item">
          <div class="month-history-row lbl">
            <span style="opacity:.7">${row.m}</span>
            <span class="mono-num">$${fmtAR(row.spent)} / $${fmtAR(row.budget)} · ${p}%</span>
          </div>
          <div class="month-bar-track">
            <div class="month-bar-fill" style="width:${p}%"></div>
          </div>
        </div>`;
    }).join('')}`;
}

function updateBudget(val) {
  extra.budget = Number(val);
  saveExtra();
  const el = document.getElementById('budgetSliderVal');
  if (el) el.textContent = `$${fmtAR(Number(val))}/mes`;

  /* Actualizar barra de la pantalla principal */
  const total = Object.values(items).reduce((s, it) => s + (it.price || 0) * (it.quantity || it.qty || 1), 0);
  renderTotals(total, Object.keys(items).length);

  /* Re-renderizar segmentos */
  renderBudgetView();
}

/* ═══════════════════════════════════════════════════════════════
   VISTA COMPARAR PRECIOS
═══════════════════════════════════════════════════════════════ */
function renderCompareView() {
  const body = document.getElementById('compareBody');
  const ids  = Object.keys(items);

  const series = ids
    .map(id => {
      const it   = items[id];
      const hist = priceHistory(it.name);
      return { name: it.name, current: it.price || 0, history: hist };
    })
    .filter(s => s.history.length > 0 || s.current);

  if (!series.length) {
    body.innerHTML = `<p class="lbl" style="padding:40px 0; text-align:center; opacity:.4">SIN DATOS PARA COMPARAR</p>`;
    return;
  }

  body.innerHTML = series.map(s => {
    const prices    = [...s.history.map(h => h.price), s.current].filter(Boolean);
    const maxP      = Math.max(...prices);
    const minP      = Math.min(...prices);
    const lastPrice = s.history[0]?.price;
    const delta     = lastPrice && s.current
      ? Math.round(((s.current - lastPrice) / lastPrice) * 100) : null;

    const points = [...s.history].reverse().concat([{ price: s.current }]);
    const bars = points.map((pt, i) => {
      const h = maxP > minP
        ? Math.round(((pt.price - minP) / (maxP - minP)) * 30) + 4
        : 20;
      const isCurrent = i === points.length - 1;
      return `<div class="spark-bar${isCurrent ? ' current' : ''}" style="height:${h}px"></div>`;
    }).join('');

    const deltaHtml = delta !== null
      ? `<span class="compare-delta">${delta > 0 ? '↑' : delta < 0 ? '↓' : '='} ${Math.abs(delta)}%</span>` : '';

    return `
      <div class="compare-entry">
        <div class="compare-entry-hdr">
          <span class="compare-name">${esc(s.name)}</span>
          ${deltaHtml}
        </div>
        <div class="sparkline">${bars}</div>
        <div class="compare-scale lbl">
          <span>min $${fmtAR(minP)}</span>
          <span>actual $${fmtAR(s.current)}</span>
          <span>max $${fmtAR(maxP)}</span>
        </div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   MODAL COMPARTIR / WHATSAPP
═══════════════════════════════════════════════════════════════ */
const CONTACTS = [
  { name: 'Familia · Casa', sub: '4 personas',      initial: 'F' },
  { name: 'Vale 💚',        sub: 'última: hace 2 días', initial: 'V' },
  { name: 'Mamá',           sub: 'última: hace 1 sem', initial: 'M' },
];

function buildWAMessage() {
  const ids = Object.keys(items).sort((a, b) => (items[a].ts || 0) - (items[b].ts || 0));
  const total = ids.reduce((s, id) => {
    const it = items[id];
    return s + (it.price || 0) * (it.quantity || it.qty || 1);
  }, 0);

  const lines = ['*LISTBUY · Lista de compras*', ''];
  ids.forEach(id => {
    const it  = items[id];
    const qty = it.quantity || it.qty || 1;
    const sub = (it.price || 0) * qty;
    lines.push(`• ${qty > 1 ? `${qty}× ` : ''}${it.name}${it.price > 0 ? ` — $${fmtAR(sub)}` : ''}`);
  });
  lines.push('', `*Total: $${fmtAR(total)}*`, '', '— Enviado desde ListBuy');
  return lines.join('\n');
}

function openShare() {
  const msg = buildWAMessage();

  document.getElementById('msgPreview').textContent = msg;

  /* Contactos */
  document.getElementById('contactsList').innerHTML = CONTACTS.map(c => `
    <button class="contact-btn" onclick="shareToContact()">
      <div class="contact-avatar">${c.initial}</div>
      <div>
        <div class="contact-name">${c.name}</div>
        <div class="contact-sub">${c.sub}</div>
      </div>
      <span class="contact-arrow">→</span>
    </button>`).join('');

  document.getElementById('archiveStore').value = '';

  openModal('shareBackdrop', 'shareModal');

  /* Botones */
  document.getElementById('btnOpenWA').onclick = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };
}

function shareToContact() {
  const msg = document.getElementById('msgPreview').textContent;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function closeShare() {
  closeModal('shareBackdrop', 'shareModal');
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(document.getElementById('msgPreview').textContent);
    const btn = document.getElementById('btnCopy');
    btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = 'Copiar texto'; }, 1500);
  } catch (_) {
    toast('No se pudo copiar');
  }
}

function archivePurchase() {
  const store = document.getElementById('archiveStore').value.trim() || 'Sin nombre';
  const ids   = Object.keys(items);
  if (!ids.length) { toast('La lista está vacía'); return; }

  const archiveItems = ids.map(id => {
    const it  = items[id];
    const qty = it.quantity || it.qty || 1;
    return { name: it.name, price: it.price || 0, qty };
  });

  const total = archiveItems.reduce((s, it) => s + it.price * it.qty, 0);
  const now   = new Date();
  const iso   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  extra.history.unshift({
    id:    'h_' + Date.now(),
    date:  iso,
    store,
    items: archiveItems,
    total,
  });
  saveExtra();
  closeShare();
  toast('¡Compra guardada en historial!');
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS DE MODAL  (backdrop + panel)
═══════════════════════════════════════════════════════════════ */
function openModal(backdropId, panelId) {
  document.getElementById(backdropId).classList.add('open');
  const panel = document.getElementById(panelId);
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('open'));
}

function closeModal(backdropId, panelId) {
  document.getElementById(backdropId).classList.remove('open');
  const panel = document.getElementById(panelId);
  panel.classList.remove('open');
  panel.addEventListener('transitionend', () => { panel.hidden = true; }, { once: true });
}

/* ═══════════════════════════════════════════════════════════════
   TECLADO
═══════════════════════════════════════════════════════════════ */
document.getElementById('iName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});
document.getElementById('eName').addEventListener('keydown', e => {
  if (e.key === 'Enter')  saveEdit();
  if (e.key === 'Escape') closeEdit();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeMenu();
    closeEdit();
    closeShare();
  }
});

/* ═══════════════════════════════════════════════════════════════
   EVENTOS DE BOTONES
═══════════════════════════════════════════════════════════════ */
document.getElementById('btnAdd').addEventListener('click', addItem);
document.getElementById('btnTheme').addEventListener('click', toggleTheme);
document.getElementById('btnMenu').addEventListener('click', openMenu);
document.getElementById('btnShare').addEventListener('click', openShare);
document.getElementById('btnSaveEdit').addEventListener('click', saveEdit);
document.getElementById('btnCopy').addEventListener('click', copyMessage);
document.getElementById('btnCloseShare').addEventListener('click', closeShare);
document.getElementById('btnArchive').addEventListener('click', archivePurchase);

/* Cerrar menú al hacer click en backdrop */
document.getElementById('menuBackdrop').addEventListener('click', closeMenu);
document.getElementById('shareBackdrop').addEventListener('click', closeShare);
document.getElementById('editBackdrop').addEventListener('click', closeEdit);

/* ═══════════════════════════════════════════════════════════════
   INICIALIZACIÓN
═══════════════════════════════════════════════════════════════ */
/* Tema */
applyTheme(localStorage.getItem('lb_theme') || 'light');

/* Número y fecha en header */
document.getElementById('ticketRef').textContent = `N° ${RECEIPT_NUM} · ${fmtReceiptDate()}`;
document.getElementById('drawerMonth').textContent = currentMonthLabel();

/* Conectar Firebase */
connectSSE();
