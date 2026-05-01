// app-state.jsx — shared hook for ListBuy state + sample data
// Single source of truth for products, history, budget. Persists to localStorage.

const LS_KEY = 'listbuy_v2';

const SEED = {
  products: [
    { id: 1, name: 'Pollo', price: 14000, qty: 1, checked: false },
    { id: 2, name: 'Masa de tarta', price: 1800, qty: 2, checked: false },
    { id: 3, name: 'Tomates', price: 2400, qty: 1, checked: true },
    { id: 4, name: 'Aceite de oliva', price: 8900, qty: 1, checked: false },
  ],
  history: [
    {
      id: 'h1', date: '2026-04-24', store: 'Coto · Av. Rivadavia',
      items: [
        { name: 'Pollo', price: 13500, qty: 1 },
        { name: 'Masa de tarta', price: 1700, qty: 2 },
        { name: 'Tomates', price: 2200, qty: 1 },
        { name: 'Aceite de oliva', price: 8600, qty: 1 },
        { name: 'Yerba 500g', price: 4200, qty: 1 },
      ],
      total: 31900,
    },
    {
      id: 'h2', date: '2026-04-17', store: 'Disco · Caballito',
      items: [
        { name: 'Pollo', price: 12800, qty: 1 },
        { name: 'Tomates', price: 2100, qty: 2 },
        { name: 'Pan', price: 1500, qty: 1 },
        { name: 'Leche', price: 1400, qty: 3 },
      ],
      total: 21700,
    },
    {
      id: 'h3', date: '2026-04-10', store: 'Carrefour Express',
      items: [
        { name: 'Pollo', price: 13200, qty: 1 },
        { name: 'Aceite de oliva', price: 8400, qty: 1 },
        { name: 'Masa de tarta', price: 1650, qty: 2 },
      ],
      total: 24900,
    },
  ],
  budget: 120000,
  spentThisMonth: 78500,
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...SEED, ...JSON.parse(raw) };
  } catch (e) {}
  return SEED;
}

function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
}

function useListBuy() {
  const [state, setState] = React.useState(loadState);
  React.useEffect(() => { saveState(state); }, [state]);

  const addProduct = (name, price, qty) => {
    if (!name?.trim()) return;
    setState((s) => ({
      ...s,
      products: [
        ...s.products,
        { id: Date.now(), name: name.trim(), price: Number(price) || 0, qty: Number(qty) || 1, checked: false },
      ],
    }));
  };

  const updateProduct = (id, patch) =>
    setState((s) => ({ ...s, products: s.products.map((p) => p.id === id ? { ...p, ...patch } : p) }));

  const removeProduct = (id) =>
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));

  const toggleCheck = (id) =>
    setState((s) => ({ ...s, products: s.products.map((p) => p.id === id ? { ...p, checked: !p.checked } : p) }));

  const clearList = () => setState((s) => ({ ...s, products: [] }));

  const total = state.products.reduce((sum, p) => sum + (p.price || 0) * (p.qty || 1), 0);
  const itemCount = state.products.reduce((sum, p) => sum + (p.qty || 1), 0);

  // find historic price for a product name (for comparison)
  const priceHistory = (name) => {
    const matches = [];
    for (const h of state.history) {
      for (const it of h.items) {
        if (it.name.toLowerCase() === name.toLowerCase()) {
          matches.push({ date: h.date, price: it.price, store: h.store });
        }
      }
    }
    return matches;
  };

  return {
    state, setState,
    addProduct, updateProduct, removeProduct, toggleCheck, clearList,
    total, itemCount, priceHistory,
  };
}

// AR currency formatter
function fmtAR(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

Object.assign(window, { useListBuy, fmtAR, fmtDate, SEED });
