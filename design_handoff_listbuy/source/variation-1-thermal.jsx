// variation-1-thermal.jsx — Classic thermal-receipt vibe.
// Wide tracking, mono everything, dotted separators, paper edge.

const v1Styles = {
  paper: {
    width: '100%', height: '100%',
    background: '#fafaf7',
    color: '#0a0a0a',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 13,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  dotted: {
    height: 1,
    backgroundImage: 'linear-gradient(to right, #0a0a0a 50%, transparent 50%)',
    backgroundSize: '6px 1px',
    backgroundRepeat: 'repeat-x',
  },
  solid: { height: 1, background: '#0a0a0a' },
  label: {
    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    fontWeight: 500,
  },
  num: { fontVariantNumeric: 'tabular-nums' },
};

function PaperEdge({ flip = false }) {
  // zig-zag torn edge using SVG
  return (
    <svg viewBox="0 0 100 6" preserveAspectRatio="none" style={{ width: '100%', height: 8, display: 'block', transform: flip ? 'scaleY(-1)' : 'none' }}>
      <path d="M0,0 L0,3 L4,6 L8,3 L12,6 L16,3 L20,6 L24,3 L28,6 L32,3 L36,6 L40,3 L44,6 L48,3 L52,6 L56,3 L60,6 L64,3 L68,6 L72,3 L76,6 L80,3 L84,6 L88,3 L92,6 L96,3 L100,6 L100,0 Z" fill="#fafaf7" />
    </svg>
  );
}

function V1Header({ itemCount, onMenu }) {
  return (
    <div style={{ padding: '20px 24px 16px', textAlign: 'center', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onMenu} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>≡</button>
        <div style={{ ...v1Styles.label, fontSize: 9 }}>N° 0042 · 01·MAY·26</div>
        <div style={{ width: 16 }}></div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.32em', marginBottom: 4 }}>LISTBUY</div>
      <div style={{ ...v1Styles.label, fontSize: 9, opacity: 0.6 }}>—— LISTA DE COMPRAS ——</div>
      <div style={{ marginTop: 14, ...v1Styles.label, fontSize: 9, opacity: 0.55 }}>
        {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} · ABIERTA
      </div>
    </div>
  );
}

function V1AddRow({ onAdd }) {
  const [name, setName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [qty, setQty] = React.useState('');
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name, price, qty || 1);
    setName(''); setPrice(''); setQty('');
  };
  const inp = {
    background: 'transparent', border: 'none', borderBottom: '1px dashed #0a0a0a',
    fontFamily: 'inherit', fontSize: 13, padding: '8px 0',
    color: '#0a0a0a', outline: 'none', width: '100%',
  };
  return (
    <div style={{ padding: '4px 24px 16px' }}>
      <div style={{ ...v1Styles.label, fontSize: 9, opacity: 0.55, marginBottom: 8 }}>+ NUEVO ITEM</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="producto…"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ ...inp, marginBottom: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="precio"
          inputMode="numeric" style={inp} />
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="cant."
          inputMode="numeric" style={inp} />
      </div>
      <button onClick={submit} style={{
        width: '100%', padding: '12px 0', background: '#0a0a0a', color: '#fafaf7',
        border: 'none', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.24em',
        textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
      }}>AGREGAR ›</button>
    </div>
  );
}

function V1Item({ p, onToggle, onEdit, onRemove, history }) {
  const subtotal = (p.price || 0) * (p.qty || 1);
  const lastPrice = history.length ? history[0].price : null;
  const diff = lastPrice && p.price ? p.price - lastPrice : null;
  const diffPct = lastPrice ? Math.round(((p.price - lastPrice) / lastPrice) * 100) : null;

  return (
    <div style={{ padding: '10px 24px', opacity: p.checked ? 0.4 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <button onClick={() => onToggle(p.id)} style={{
          background: 'none', border: '1px solid #0a0a0a', width: 14, height: 14,
          padding: 0, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, lineHeight: 1, fontFamily: 'inherit',
        }}>{p.checked ? '×' : ''}</button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: p.checked ? 'line-through' : 'none' }}>
          {p.name}
        </div>
        <div style={{ ...v1Styles.num, fontSize: 14, fontWeight: 600 }}>
          ${fmtAR(subtotal)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingLeft: 22, fontSize: 11, opacity: 0.55, ...v1Styles.num }}>
        <span>
          {p.qty > 1 ? `${p.qty} × ` : ''}${p.price ? fmtAR(p.price) : '—'}
          {diff !== null && diff !== 0 && (
            <span style={{ marginLeft: 8, fontWeight: 600, color: diff > 0 ? '#0a0a0a' : '#0a0a0a', opacity: 0.7 }}>
              {diff > 0 ? '↑' : '↓'}{Math.abs(diffPct)}%
            </span>
          )}
        </span>
        <span style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => onEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, opacity: 0.6, padding: 0 }}>edit</button>
          <button onClick={() => onRemove(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, opacity: 0.6, padding: 0 }}>del</button>
        </span>
      </div>
    </div>
  );
}

function V1Total({ total, itemCount, budget, spent }) {
  const remaining = budget - spent - total;
  const pct = Math.min(100, Math.round(((spent + total) / budget) * 100));
  return (
    <div style={{ padding: '0 24px' }}>
      <div style={v1Styles.dotted}></div>
      <div style={{ padding: '14px 0 8px', display: 'flex', justifyContent: 'space-between', fontSize: 11, ...v1Styles.label, opacity: 0.6 }}>
        <span>SUBTOTAL · {itemCount} ITEMS</span>
        <span style={v1Styles.num}>${fmtAR(total)}</span>
      </div>
      <div style={v1Styles.dotted}></div>
      <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ ...v1Styles.label, fontSize: 11, fontWeight: 700 }}>TOTAL</span>
        <span style={{ ...v1Styles.num, fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>${fmtAR(total)}</span>
      </div>
      <div style={v1Styles.solid}></div>
      {/* budget bar */}
      <div style={{ padding: '14px 0 4px', fontSize: 10, ...v1Styles.label, opacity: 0.55, display: 'flex', justifyContent: 'space-between' }}>
        <span>PRESUPUESTO MENSUAL</span>
        <span style={v1Styles.num}>{pct}%</span>
      </div>
      <div style={{ height: 6, border: '1px solid #0a0a0a', position: 'relative', marginBottom: 6 }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: '#0a0a0a' }}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.55, ...v1Styles.num }}>
        <span>${fmtAR(spent + total)} / ${fmtAR(budget)}</span>
        <span>{remaining >= 0 ? `restan $${fmtAR(remaining)}` : `excede $${fmtAR(-remaining)}`}</span>
      </div>
    </div>
  );
}

function V1ShareButton({ onClick }) {
  return (
    <div style={{ padding: '20px 24px 24px' }}>
      <button onClick={onClick} style={{
        width: '100%', padding: '14px 0', background: 'transparent',
        color: '#0a0a0a', border: '1px solid #0a0a0a',
        fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.24em',
        textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
      }}>ENVIAR POR WHATSAPP →</button>
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 9, ...v1Styles.label, opacity: 0.4 }}>
        ★ ★ ★ GRACIAS POR USAR LISTBUY ★ ★ ★
      </div>
    </div>
  );
}

function VariationThermal({ store, onShare, onMenu }) {
  const lb = store;
  const [editing, setEditing] = React.useState(null);

  return (
    <div style={v1Styles.paper}>
      <PaperEdge />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <V1Header itemCount={lb.itemCount} onMenu={onMenu} />
        <div style={{ padding: '0 24px' }}><div style={v1Styles.dotted}></div></div>
        <V1AddRow onAdd={lb.addProduct} />
        <div style={{ padding: '0 24px' }}><div style={v1Styles.dotted}></div></div>
        <div style={{ padding: '8px 0' }}>
          {lb.state.products.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 11, opacity: 0.4, ...v1Styles.label }}>
              — LISTA VACÍA —
            </div>
          ) : lb.state.products.map((p) => (
            <V1Item key={p.id} p={p} onToggle={lb.toggleCheck}
              onEdit={(prod) => setEditing(prod)}
              onRemove={lb.removeProduct}
              history={lb.priceHistory(p.name)} />
          ))}
        </div>
        <V1Total total={lb.total} itemCount={lb.itemCount}
          budget={lb.state.budget} spent={lb.state.spentThisMonth} />
        <V1ShareButton onClick={onShare} />
      </div>
      <PaperEdge flip />
      {editing && <V1EditModal product={editing} onSave={(patch) => { lb.updateProduct(editing.id, patch); setEditing(null); }} onClose={() => setEditing(null)} />}
    </div>
  );
}

function V1EditModal({ product, onSave, onClose }) {
  const [name, setName] = React.useState(product.name);
  const [price, setPrice] = React.useState(product.price || '');
  const [qty, setQty] = React.useState(product.qty || 1);
  const inp = {
    background: 'transparent', border: 'none', borderBottom: '1px dashed #0a0a0a',
    fontFamily: 'inherit', fontSize: 14, padding: '8px 0',
    color: '#0a0a0a', outline: 'none', width: '100%', marginBottom: 14,
  };
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.4)',
      display: 'flex', alignItems: 'flex-end', zIndex: 10,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: '#fafaf7', padding: '24px 24px 32px',
        borderTop: '1px solid #0a0a0a',
      }}>
        <div style={{ ...v1Styles.label, fontSize: 9, opacity: 0.55, marginBottom: 16 }}>EDITAR ITEM</div>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="precio" inputMode="numeric" style={inp} />
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="cant." inputMode="numeric" style={inp} />
        </div>
        <button onClick={() => onSave({ name, price: Number(price) || 0, qty: Number(qty) || 1 })} style={{
          width: '100%', padding: '12px 0', background: '#0a0a0a', color: '#fafaf7',
          border: 'none', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.24em',
          textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
        }}>GUARDAR</button>
      </div>
    </div>
  );
}

Object.assign(window, { VariationThermal, PaperEdge, v1Styles });
