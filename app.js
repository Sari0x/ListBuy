'use strict';

/* ═══════════════════════════════════════════════════════════════
   FIREBASE — REST API + Server-Sent Events
═══════════════════════════════════════════════════════════════ */
const REF = 'https://listbuy-45c65-default-rtdb.firebaseio.com/shoppingList';

let items    = {};
let knownIds = new Set();
let sse;

function connectSSE() {
  setSyncState('syncing');
  try {
    sse = new EventSource(REF + '.json');

    sse.addEventListener('put', e => {
      try {
        const { path, data } = JSON.parse(e.data);
        if (path === '/') {
          items = data || {};
        } else {
          const id = path.slice(1);
          if (data === null) { delete items[id]; knownIds.delete(id); }
          else               { items[id] = data; }
        }
        renderList();
        setSyncState('live');
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

    sse.addEventListener('keep-alive', () => setSyncState('live'));

    sse.onerror = () => {
      setSyncState('offline');
      sse.close();
      setTimeout(connectSSE, 5000);
    };
  } catch (_) {
    setSyncState('offline');
    setTimeout(connectSSE, 5000);
  }
}

async function fbPost(body) {
  const r = await fetch(REF + '.json', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return r.json();
}

async function fbPatch(id, body) {
  await fetch(`${REF}/${id}.json`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

async function fbDelete(id) {
  await fetch(`${REF}/${id}.json`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════════
   SYNC STATUS
═══════════════════════════════════════════════════════════════ */
function setSyncState(s) {
  const labels = { live: 'En línea', syncing: 'Sincronizando…', offline: 'Sin conexión' };
  document.getElementById('syncPill').className    = 'sync-pill ' + s;
  document.getElementById('syncLabel').textContent = labels[s] || s;
}

/* ═══════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════ */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = t === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('lb_theme', next);
}

/* ═══════════════════════════════════════════════════════════════
   ADD ITEM
═══════════════════════════════════════════════════════════════ */
async function addItem() {
  const nEl  = document.getElementById('iName');
  const pEl  = document.getElementById('iPrice');
  const qEl  = document.getElementById('iQty');
  const name = nEl.value.trim();

  if (!name) {
    nEl.classList.add('err');
    nEl.focus();
    setTimeout(() => nEl.classList.remove('err'), 900);
    toast('Ingresá el nombre del producto');
    return;
  }

  setSyncState('syncing');
  await fbPost({
    name,
    price:    Math.max(0, parseFloat(pEl.value) || 0),
    quantity: Math.max(1, parseInt(qEl.value)   || 1),
    checked:  false,
    ts:       Date.now(),
  });

  nEl.value = '';
  pEl.value = '';
  qEl.value = '';
  nEl.focus();
  toast('¡Producto agregado!');
}

/* ═══════════════════════════════════════════════════════════════
   TOGGLE / DELETE
═══════════════════════════════════════════════════════════════ */
async function toggleItem(id) {
  if (!items[id]) return;
  await fbPatch(id, { checked: !items[id].checked });
}

function removeItem(id) {
  const el = document.querySelector(`.list-item[data-id="${id}"]`);
  if (el) {
    el.classList.add('fade-out');
    setTimeout(() => fbDelete(id), 230);
  } else {
    fbDelete(id);
  }
}

/* ═══════════════════════════════════════════════════════════════
   EDIT ITEM
═══════════════════════════════════════════════════════════════ */
let editingId = null;

function openEditSheet(id) {
  if (!items[id]) return;
  editingId = id;
  const it = items[id];
  document.getElementById('eName').value  = it.name;
  document.getElementById('ePrice').value = it.price > 0 ? it.price : '';
  document.getElementById('eQty').value   = it.quantity;
  document.getElementById('editOverlay').classList.add('open');
  setTimeout(() => document.getElementById('eName').focus(), 400);
}

function closeEditSheet() {
  document.getElementById('editOverlay').classList.remove('open');
  editingId = null;
}

function editOverlayClick(e) {
  if (e.target === document.getElementById('editOverlay')) closeEditSheet();
}

async function saveEdit() {
  if (!editingId) return;
  const nEl  = document.getElementById('eName');
  const name = nEl.value.trim();

  if (!name) {
    nEl.classList.add('err');
    nEl.focus();
    setTimeout(() => nEl.classList.remove('err'), 900);
    toast('Ingresá el nombre del producto');
    return;
  }

  setSyncState('syncing');
  await fbPatch(editingId, {
    name,
    price:    Math.max(0, parseFloat(document.getElementById('ePrice').value) || 0),
    quantity: Math.max(1, parseInt(document.getElementById('eQty').value)     || 1),
  });

  closeEditSheet();
  toast('¡Producto actualizado!');
}

/* ═══════════════════════════════════════════════════════════════
   RENDER LIST
═══════════════════════════════════════════════════════════════ */
function renderList() {
  const list   = document.getElementById('shoppingList');
  const empty  = document.getElementById('emptyState');
  const tBar   = document.getElementById('totalBar');
  const finBtn = document.getElementById('btnFinalize');
  const badge  = document.getElementById('countBadge');
  const totAmt = document.getElementById('totalAmt');
  const totCnt = document.getElementById('totalCnt');

  const ids = Object.keys(items).sort((a, b) => (items[a].ts || 0) - (items[b].ts || 0));

  list.querySelectorAll('.list-item').forEach(el => {
    if (!items[el.dataset.id]) el.remove();
  });

  if (ids.length === 0) {
    empty.hidden  = false;
    tBar.hidden   = true;
    finBtn.hidden = true;
    badge.textContent = '0';
    return;
  }

  empty.hidden  = true;
  tBar.hidden   = false;
  finBtn.hidden = false;
  badge.textContent = String(ids.length);

  let total = 0;

  ids.forEach(id => {
    const it  = items[id];
    const sub = it.price * it.quantity;
    total += sub;

    let li = list.querySelector(`.list-item[data-id="${id}"]`);
    const isNew = !li;

    if (isNew) {
      li = document.createElement('li');
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

    li.innerHTML = `
      <div class="checkbox${it.checked ? ' on' : ''}" onclick="toggleItem('${id}')">
        ${it.checked ? '<i class="bi bi-check-lg"></i>' : ''}
      </div>
      <div class="item-body">
        <div class="item-name">${esc(it.name)}</div>
        <div class="item-meta">
          ${it.quantity > 1 ? `<span class="qty-tag">&times;${it.quantity}</span>` : ''}
          <span class="unit-price">${it.price > 0 ? '$' + fmt(it.price) + ' c/u' : 'Sin precio'}</span>
        </div>
      </div>
      ${it.price > 0 ? `<div class="item-sub">$${fmt(sub)}</div>` : ''}
      <div class="item-actions">
        <button class="btn-edit" onclick="openEditSheet('${id}')" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-del" onclick="removeItem('${id}')" title="Eliminar">
          <i class="bi bi-trash3"></i>
        </button>
      </div>`;
  });

  totAmt.textContent = '$' + fmt(total);
  totCnt.textContent = ids.length + (ids.length !== 1 ? ' productos' : ' producto');
}

/* ═══════════════════════════════════════════════════════════════
   TICKET + WHATSAPP
═══════════════════════════════════════════════════════════════ */
let ticketText = '';

function openSheet() {
  const ids = Object.keys(items).sort((a, b) => (items[a].ts || 0) - (items[b].ts || 0));
  if (!ids.length) return;

  let txt   = '🛒 Lista de Compras\n\n';
  let total = 0;

  ids.forEach(id => {
    const it  = items[id];
    const sub = it.price * it.quantity;
    total += sub;
    const mark = it.checked ? '✔️' : '⬜';
    const qty  = it.quantity > 1 ? ` x${it.quantity}` : '';
    const pr   = it.price    > 0 ? ` - $${fmt(sub)}`  : '';
    txt += `${mark} ${it.name}${qty}${pr}\n`;
  });

  txt += `\n💰 Total: $${fmt(total)}`;
  ticketText = txt;
  document.getElementById('ticketBox').textContent = txt;
  document.getElementById('overlay').classList.add('open');
}

function closeSheet()    { document.getElementById('overlay').classList.remove('open'); }
function overlayClick(e) { if (e.target === document.getElementById('overlay')) closeSheet(); }
function shareWA()       { window.open('https://wa.me/?text=' + encodeURIComponent(ticketText), '_blank'); }

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function fmt(n) {
  if (!n && n !== 0) return '0';
  return n % 1 === 0
    ? n.toLocaleString('es-AR')
    : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('in'), 2400);
}

/* ═══════════════════════════════════════════════════════════════
   KEYBOARD + BOOT
═══════════════════════════════════════════════════════════════ */
document.getElementById('iName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

document.getElementById('eName').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeEditSheet();
});

applyTheme(localStorage.getItem('lb_theme') || 'light');
connectSSE();
