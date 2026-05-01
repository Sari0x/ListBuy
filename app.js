'use strict';

/* ═══════════════════════════════════════════════════════════════
   FIREBASE — lista en tiempo real
═══════════════════════════════════════════════════════════════ */
const FB_REF         = 'https://listbuy-45c65-default-rtdb.firebaseio.com/shoppingList';
const FB_HISTORY_REF = 'https://listbuy-45c65-default-rtdb.firebaseio.com/history';

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
  } catch (_) { setTimeout(connectSSE, 5000); }
}

async function fbPost(body) {
  const r = await fetch(FB_REF + '.json', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}
async function fbPatch(id, body) {
  await fetch(`${FB_REF}/${id}.json`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
async function fbDelete(id) {
  await fetch(`${FB_REF}/${id}.json`, { method: 'DELETE' });
}

/* ── Firebase: historial ── */
async function fbHistoryPost(entry) {
  const r = await fetch(FB_HISTORY_REF + '.json', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
  });
  return r.json(); // { name: "-NxABC..." }
}
async function fbHistoryDelete(fbId) {
  await fetch(`${FB_HISTORY_REF}/${fbId}.json`, { method: 'DELETE' });
}
async function fetchHistory() {
  try {
    const r    = await fetch(FB_HISTORY_REF + '.json');
    const data = await r.json();
    extra.history = (data && typeof data === 'object')
      ? Object.entries(data)
          .map(([fbId, entry]) => ({ ...entry, fbId }))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      : [];
    saveExtra();
  } catch (_) {
    /* si falla Firebase, usamos caché de localStorage */
  }
}

/* ═══════════════════════════════════════════════════════════════
   ESTADO LOCAL  (historial cacheado, presupuesto)
═══════════════════════════════════════════════════════════════ */
const LB_KEY     = 'lb_extra';
const LB_VERSION = 3;

function loadExtra() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      /* migración: si la versión no coincide, resetear historial */
      if (p._v === LB_VERSION) return p;
      return { history: [], budget: p.budget || 120000, _v: LB_VERSION };
    }
  } catch (_) {}
  return { history: [], budget: 120000, _v: LB_VERSION };
}
function saveExtra() {
  try { localStorage.setItem(LB_KEY, JSON.stringify({ ...extra, _v: LB_VERSION })); } catch (_) {}
}

let extra = loadExtra();

/* ── Helpers de estado ── */
function calcCurrentTotal() {
  return Object.values(items).reduce((s, it) => s + (it.price || 0) * (it.quantity || it.qty || 1), 0);
}
function spentThisMonth() {
  const now = new Date();
  return extra.history
    .filter(h => {
      const d = new Date(h.date + 'T12:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, h) => s + (h.total || 0), 0);
}
function priceHistory(name) {
  const out = [];
  for (const h of extra.history) {
    for (const it of (h.items || [])) {
      if (it.name.toLowerCase() === name.toLowerCase())
        out.push({ date: h.date, price: it.price, store: h.store });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* ═══════════════════════════════════════════════════════════════
   FORMATO
═══════════════════════════════════════════════════════════════ */
function fmtAR(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(Math.round(n));
}
function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
function fmtReceiptDate() {
  const now = new Date();
  const d   = String(now.getDate()).padStart(2, '0');
  const m   = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][now.getMonth()];
  const y   = String(now.getFullYear()).slice(2);
  return `${d}·${m}·${y}`;
}
function currentMonthLabel() {
  const now = new Date();
  return now.toLocaleDateString('es-AR', { month: 'long' }) + ' · ' + now.getFullYear();
}
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  if (el) { el.classList.add('fade-out'); setTimeout(() => fbDelete(id), 210); }
  else    { fbDelete(id); }
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
   RENDERIZADO DE LISTA
═══════════════════════════════════════════════════════════════ */
function renderList() {
  const list     = document.getElementById('itemList');
  const empty    = document.getElementById('emptyList');
  const countLbl = document.getElementById('itemCountLbl');
  const totBlock = document.getElementById('totalsBlock');
  const shrBlock = document.getElementById('shareBlock');

  const ids = Object.keys(items).sort((a, b) => (items[a].ts || 0) - (items[b].ts || 0));

  list.querySelectorAll('.list-item').forEach(el => {
    if (!items[el.dataset.id]) el.remove();
  });

  countLbl.textContent = `${ids.length} ${ids.length === 1 ? 'ITEM' : 'ITEMS'} · ABIERTA`;

  if (ids.length === 0) {
    empty.hidden    = false;
    totBlock.hidden = true;
    shrBlock.hidden = true;
    return;
  }
  empty.hidden    = true;
  totBlock.hidden = false;
  shrBlock.hidden = false;

  let total = 0;

  ids.forEach(id => {
    const it  = items[id];
    const qty = it.quantity ?? it.qty ?? 1;
    const sub = (it.price || 0) * qty;
    total += sub;

    const hist      = priceHistory(it.name);
    const lastPrice = hist.length ? hist[0].price : null;
    const diffPct   = (lastPrice && it.price && lastPrice !== it.price)
      ? Math.round(((it.price - lastPrice) / lastPrice) * 100) : null;

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

    li.className = 'list-item'
      + (it.checked ? ' is-checked' : '')
      + (li.classList.contains('new-in') ? ' new-in' : '');

    const deltaHtml = diffPct !== null
      ? `<span class="item-delta">${diffPct > 0 ? '↑' : '↓'}${Math.abs(diffPct)}%</span>` : '';

    const priceInfo = it.price > 0
      ? `${qty > 1 ? `${qty} × ` : ''}$${fmtAR(it.price)}${deltaHtml}`
      : `${qty > 1 ? `${qty} unid.` : 'sin precio'}`;

    li.innerHTML = `
      <div class="item-row-main">
        <button class="item-checkbox" onclick="toggleItem('${id}')" aria-label="Marcar">
          ${it.checked ? '×' : ''}
        </button>
        <span class="item-name">${esc(it.name)}</span>
        ${it.price > 0 ? `<span class="item-subtotal mono-num">$${fmtAR(sub)}</span>` : ''}
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

function renderTotals(total, count) {
  document.getElementById('subtotalCount').textContent = count;
  document.getElementById('subtotalAmt').textContent   = '$' + fmtAR(total);
  document.getElementById('totalAmt').textContent      = '$' + fmtAR(total);

  const spent    = spentThisMonth();
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
   MENÚ DRAWER
═══════════════════════════════════════════════════════════════ */
function openMenu() {
  document.getElementById('drawerMonth').textContent = currentMonthLabel();
  const ids = Object.keys(items);
  const nav = document.getElementById('drawerNav');
  const navItems = [
    { id: 'list',    label: 'Lista actual',   meta: `${ids.length} items` },
    { id: 'history', label: 'Historial',       meta: `${extra.history.length} compras` },
    { id: 'budget',  label: 'Presupuesto',      meta: `$${fmtAR(extra.budget)}/mes` },
    { id: 'compare', label: 'Comparar precios', meta: 'evolución' },
  ];
  nav.innerHTML = navItems.map(it => `
    <button class="drawer-item"
      onclick="${it.id === 'list' ? 'closeMenu()' : `openView('view${capitalize(it.id)}')`}">
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
   GESTIÓN DE VISTAS
═══════════════════════════════════════════════════════════════ */
function openView(id) {
  closeMenu();
  if (id === 'viewHistory') renderHistoryView();
  if (id === 'viewBudget')  renderBudgetView();
  if (id === 'viewCompare') renderCompareView();
  document.getElementById(id).classList.add('open');
}
function closeView(id) {
  document.getElementById(id).classList.remove('open');
}

/* ═══════════════════════════════════════════════════════════════
   VISTA HISTORIAL
═══════════════════════════════════════════════════════════════ */
function renderHistoryView() {
  const body = document.getElementById('historyBody');
  if (!extra.history.length) {
    body.innerHTML = `<p class="lbl" style="padding:40px 0;text-align:center;opacity:.4">— SIN COMPRAS PREVIAS —</p>`;
    return;
  }

  body.innerHTML = extra.history.map(h => {
    const fbId = h.fbId || '';
    return `
      <div class="history-entry" id="he_${fbId}">
        <div class="history-entry-hdr">
          <div>
            <div class="history-store">${esc(h.store || 'Sin nombre')}</div>
            <div class="history-date lbl">${fmtDate(h.date)} · ${(h.items || []).length} items</div>
          </div>
          <div class="history-total">$${fmtAR(h.total)}</div>
        </div>

        <div>
          ${(h.items || []).map((it, i) => `
            <div class="history-item-row">
              <span>${it.qty > 1 ? `${it.qty}× ` : ''}${esc(it.name)}</span>
              <span>$${fmtAR((it.price || 0) * (it.qty || 1))}</span>
            </div>`).join('')}
        </div>

        <div class="history-entry-footer">
          ${fbId
            ? `<button class="history-del-btn" onclick="confirmDeleteHistory('${fbId}')">del</button>`
            : ''}
        </div>

        <div class="history-confirm" id="hc_${fbId}" hidden>
          <div class="history-confirm-label">¿Eliminar esta compra?</div>
          <div class="history-confirm-actions">
            <button class="btn-outline flex-1" onclick="doDeleteHistory('${fbId}')">SÍ, ELIMINAR</button>
            <button class="btn-outline flex-1" onclick="cancelDeleteHistory('${fbId}')">CANCELAR</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function confirmDeleteHistory(fbId) {
  const confirm = document.getElementById(`hc_${fbId}`);
  const btn     = document.querySelector(`#he_${fbId} .history-del-btn`);
  if (confirm) confirm.hidden = false;
  if (btn)     btn.hidden     = true;
}
function cancelDeleteHistory(fbId) {
  const confirm = document.getElementById(`hc_${fbId}`);
  const btn     = document.querySelector(`#he_${fbId} .history-del-btn`);
  if (confirm) confirm.hidden = true;
  if (btn)     btn.hidden     = false;
}
async function doDeleteHistory(fbId) {
  try {
    await fbHistoryDelete(fbId);
  } catch (_) {}
  extra.history = extra.history.filter(h => h.fbId !== fbId);
  saveExtra();
  renderHistoryView();
  toast('Compra eliminada del historial');
}

/* ═══════════════════════════════════════════════════════════════
   VISTA PRESUPUESTO
═══════════════════════════════════════════════════════════════ */
function renderBudgetView() {
  const body     = document.getElementById('budgetBody');
  const total    = calcCurrentTotal();
  const spent    = spentThisMonth();
  const combined = spent + total;
  const budget   = extra.budget;
  const pct      = budget > 0 ? Math.min(100, Math.round((combined / budget) * 100)) : 0;
  const remain   = budget - combined;

  document.getElementById('budgetViewTitle').textContent =
    'Presupuesto · ' + new Date().toLocaleDateString('es-AR', { month: 'long' });

  const segments = Array.from({ length: 20 }, (_, i) =>
    `<div class="seg-bar-cell${(i + 1) / 20 * 100 <= pct ? ' filled' : ''}"></div>`
  ).join('');

  const pastMonths = [
    { m: 'Abr 26', spent: 102400, budget: 120000 },
    { m: 'Mar 26', spent: 118200, budget: 120000 },
    { m: 'Feb 26', spent: 89000,  budget: 100000 },
  ];

  body.innerHTML = `
    <div class="budget-view-available lbl">Disponible</div>
    <div class="budget-view-amount" id="budgetViewAmount">$${fmtAR(remain)}</div>
    <div class="budget-view-sub"    id="budgetViewSub">de $${fmtAR(budget)} · gastaste $${fmtAR(combined)}</div>

    <div class="seg-bar" id="segBar">${segments}</div>
    <div class="budget-scale lbl">
      <span>0%</span>
      <span id="budgetViewPct">${pct}%</span>
      <span>100%</span>
    </div>

    <div class="budget-edit-label lbl">Editar presupuesto</div>
    <input type="range" id="budgetSlider"
           min="20000" max="300000" step="5000" value="${budget}"
           oninput="onBudgetSlider(this.value)">
    <div class="budget-slider-scale">
      <span>$20.000</span>
      <span id="budgetSliderVal" style="font-weight:600">$${fmtAR(budget)}/mes</span>
      <span>$300.000</span>
    </div>

    <div class="lbl" style="opacity:.55;margin-bottom:12px">Últimos 3 meses</div>
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

/* Actualiza solo los valores visibles — NO re-renderiza la vista completa */
function onBudgetSlider(val) {
  const n      = Number(val);
  extra.budget = n;
  saveExtra();

  /* Label del slider */
  const lblEl = document.getElementById('budgetSliderVal');
  if (lblEl) lblEl.textContent = `$${fmtAR(n)}/mes`;

  /* Recalcular */
  const total    = calcCurrentTotal();
  const spent    = spentThisMonth();
  const combined = spent + total;
  const pct      = n > 0 ? Math.min(100, Math.round((combined / n) * 100)) : 0;
  const remain   = n - combined;

  /* Actualizar displays de la vista */
  const amtEl = document.getElementById('budgetViewAmount');
  const subEl = document.getElementById('budgetViewSub');
  const pctEl = document.getElementById('budgetViewPct');
  if (amtEl) amtEl.textContent = `$${fmtAR(remain)}`;
  if (subEl) subEl.textContent = `de $${fmtAR(n)} · gastaste $${fmtAR(combined)}`;
  if (pctEl) pctEl.textContent = `${pct}%`;

  /* Actualizar celdas de la barra segmentada */
  document.querySelectorAll('#segBar .seg-bar-cell').forEach((cell, i) => {
    cell.classList.toggle('filled', (i + 1) / 20 * 100 <= pct);
  });

  /* Actualizar barra del main screen */
  renderTotals(total, Object.keys(items).length);
}

/* ═══════════════════════════════════════════════════════════════
   VISTA COMPARAR PRECIOS
═══════════════════════════════════════════════════════════════ */
function renderCompareView() {
  const body   = document.getElementById('compareBody');
  const series = Object.values(items)
    .map(it => ({ name: it.name, current: it.price || 0, history: priceHistory(it.name) }))
    .filter(s => s.history.length > 0);

  if (!series.length) {
    body.innerHTML = `<p class="lbl" style="padding:40px 0;text-align:center;opacity:.4">SIN DATOS PARA COMPARAR</p>`;
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
    const bars   = points.map((pt, i) => {
      const h = maxP > minP ? Math.round(((pt.price - minP) / (maxP - minP)) * 30) + 4 : 20;
      return `<div class="spark-bar${i === points.length - 1 ? ' current' : ''}" style="height:${h}px"></div>`;
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
   MODAL "TERMINAR COMPRA"
═══════════════════════════════════════════════════════════════ */
function buildWAMessage() {
  const ids   = Object.keys(items).sort((a, b) => (items[a].ts || 0) - (items[b].ts || 0));
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
  document.getElementById('archiveStore').value     = '';
  resetArchiveBtn();

  document.getElementById('btnOpenWA').onclick = () =>
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');

  openModal('shareBackdrop', 'shareModal');
}
function closeShare() {
  closeModal('shareBackdrop', 'shareModal');
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(document.getElementById('msgPreview').textContent);
    const btn = document.getElementById('btnCopy');
    btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1600);
  } catch (_) { toast('No se pudo copiar'); }
}

async function archivePurchase() {
  const store = document.getElementById('archiveStore').value.trim() || 'Sin nombre';
  const ids   = Object.keys(items);
  if (!ids.length) { toast('La lista está vacía'); return; }

  const archiveItems = ids.map(id => {
    const it = items[id];
    return { name: it.name, price: it.price || 0, qty: it.quantity || it.qty || 1 };
  });
  const total = archiveItems.reduce((s, it) => s + it.price * it.qty, 0);
  const now   = new Date();
  const iso   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const entry = { date: iso, store, items: archiveItems, total, receiptNum: RECEIPT_NUM };

  /* Deshabilitar botón inmediatamente para evitar doble-clic */
  const btn = document.getElementById('btnArchive');
  btn.disabled     = true;
  btn.textContent  = 'Guardando…';

  try {
    const result = await fbHistoryPost(entry);
    const fbId   = result.name;
    extra.history.unshift({ ...entry, fbId });
    saveExtra();
    btn.textContent = '✓ GUARDADO EN HISTORIAL';
    toast('¡Compra guardada!');
  } catch (_) {
    btn.disabled    = false;
    btn.textContent = 'GUARDAR EN HISTORIAL';
    toast('Error al guardar. Intentá de nuevo.');
  }
}

function resetArchiveBtn() {
  const btn = document.getElementById('btnArchive');
  btn.disabled    = false;
  btn.textContent = 'GUARDAR EN HISTORIAL';
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS DE MODAL  (backdrop + panel)
═══════════════════════════════════════════════════════════════ */
function openModal(backdropId, panelId) {
  document.getElementById(backdropId).classList.add('open');
  const panel = document.getElementById(panelId);
  panel.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
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
  if (e.key === 'Escape') { closeMenu(); closeEdit(); closeShare(); }
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
document.getElementById('menuBackdrop').addEventListener('click', closeMenu);
document.getElementById('shareBackdrop').addEventListener('click', closeShare);
document.getElementById('editBackdrop').addEventListener('click', closeEdit);

/* ═══════════════════════════════════════════════════════════════
   INICIALIZACIÓN
═══════════════════════════════════════════════════════════════ */
applyTheme(localStorage.getItem('lb_theme') || 'light');
document.getElementById('ticketRef').textContent   = `N° ${RECEIPT_NUM} · ${fmtReceiptDate()}`;
document.getElementById('drawerMonth').textContent = currentMonthLabel();

fetchHistory();   /* carga historial desde Firebase */
connectSSE();     /* conecta lista en tiempo real   */
