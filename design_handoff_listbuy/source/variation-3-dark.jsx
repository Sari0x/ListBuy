// variation-3-dark.jsx — Dark mode-first thermal-receipt remix.
// Black background, paper-white ink. Same dotted/mono vocabulary as v1
// but inverted, with subtle phosphor glow on the totals.

const v3Styles = {
  paper: {
    width: '100%', height: '100%',
    background: '#0a0a0a', color: '#f5f5f0',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 13,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  dotted: {
    height: 1,
    backgroundImage: 'linear-gradient(to right, #f5f5f0 50%, transparent 50%)',
    backgroundSize: '6px 1px',
    backgroundRepeat: 'repeat-x',
    opacity: 0.4,
  },
  solid: { height: 1, background: '#f5f5f0' },
  label: {
    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    fontWeight: 500, opacity: 0.55,
  },
  num: { fontVariantNumeric: 'tabular-nums' },
};

function V3PaperEdge({ flip }) {
  return (
    <svg viewBox="0 0 100 6" preserveAspectRatio="none" style={{ width: '100%', height: 8, display: 'block', transform: flip ? 'scaleY(-1)' : 'none' }}>
      <path d="M0,0 L0,3 L4,6 L8,3 L12,6 L16,3 L20,6 L24,3 L28,6 L32,3 L36,6 L40,3 L44,6 L48,3 L52,6 L56,3 L60,6 L64,3 L68,6 L72,3 L76,6 L80,3 L84,6 L88,3 L92,6 L96,3 L100,6 L100,0 Z" fill="#0a0a0a" />
    </svg>
  );
}

function VariationDark({ store, onShare, onMenu }) {
  const lb = store;
  const [editing, setEditing] = React.useState(null);
  const pct = Math.min(100, Math.round(((lb.state.spentThisMonth + lb.total) / lb.state.budget) * 100));

  const inp = {
    background: 'transparent', border: 'none',
    borderBottom: '1px dashed rgba(245,245,240,0.4)',
    fontFamily: 'inherit', fontSize: 13, padding: '8px 0',
    color: '#f5f5f0', outline: 'none', width: '100%',
  };

  const [name, setName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [qty, setQty] = React.useState('');
  const submit = () => { if (!name.trim()) return; lb.addProduct(name, price, qty || 1); setName(''); setPrice(''); setQty(''); };

  return (
    <div style={v3Styles.paper}>
      <V3PaperEdge />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* header */}
        <div style={{ padding: '20px 24px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={onMenu} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 16, color: 'inherit', fontFamily: 'inherit' }}>≡</button>
            <div style={{ ...v3Styles.label, fontSize: 9 }}>N° 0042 · 01·MAY·26</div>
            <div style={{ width: 16 }}></div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.32em', marginBottom: 4 }}>LISTBUY</div>
          <div style={{ ...v3Styles.label, fontSize: 9 }}>—— LISTA DE COMPRAS ——</div>
        </div>

        <div style={{ padding: '0 24px' }}><div style={v3Styles.dotted}></div></div>

        {/* add */}
        <div style={{ padding: '14px 24px 16px' }}>
          <div style={{ ...v3Styles.label, fontSize: 9, marginBottom: 8 }}>+ NUEVO ITEM</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="producto…"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ ...inp, marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="precio" inputMode="numeric" style={inp} />
            <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="cant." inputMode="numeric" style={inp} />
          </div>
          <button onClick={submit} style={{
            width: '100%', padding: '12px 0', background: '#f5f5f0', color: '#0a0a0a',
            border: 'none', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.24em',
            textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>AGREGAR ›</button>
        </div>

        <div style={{ padding: '0 24px' }}><div style={v3Styles.dotted}></div></div>

        {/* items */}
        <div style={{ padding: '8px 0' }}>
          {lb.state.products.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', ...v3Styles.label }}>— LISTA VACÍA —</div>
          )}
          {lb.state.products.map((p) => {
            const subtotal = (p.price || 0) * (p.qty || 1);
            const hist = lb.priceHistory(p.name);
            const lastPrice = hist.length ? hist[0].price : null;
            const diffPct = lastPrice && p.price ? Math.round(((p.price - lastPrice) / lastPrice) * 100) : null;
            return (
              <div key={p.id} style={{ padding: '10px 24px', opacity: p.checked ? 0.4 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <button onClick={() => lb.toggleCheck(p.id)} style={{
                    background: 'none', border: '1px solid #f5f5f0', width: 14, height: 14,
                    padding: 0, cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, lineHeight: 1, color: '#f5f5f0', fontFamily: 'inherit',
                  }}>{p.checked ? '×' : ''}</button>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: p.checked ? 'line-through' : 'none' }}>{p.name}</div>
                  <div style={{ ...v3Styles.num, fontSize: 14, fontWeight: 600 }}>${fmtAR(subtotal)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingLeft: 22, fontSize: 11, opacity: 0.55, ...v3Styles.num }}>
                  <span>
                    {p.qty > 1 ? `${p.qty} × ` : ''}${p.price ? fmtAR(p.price) : '—'}
                    {diffPct !== null && diffPct !== 0 && (
                      <span style={{ marginLeft: 8, fontWeight: 600, opacity: 0.8 }}>
                        {diffPct > 0 ? '↑' : '↓'}{Math.abs(diffPct)}%
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setEditing(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, color: '#f5f5f0', opacity: 0.6, padding: 0 }}>edit</button>
                    <button onClick={() => lb.removeProduct(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, color: '#f5f5f0', opacity: 0.6, padding: 0 }}>del</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* totals */}
        <div style={{ padding: '0 24px' }}>
          <div style={v3Styles.dotted}></div>
          <div style={{ padding: '14px 0 8px', display: 'flex', justifyContent: 'space-between', ...v3Styles.label }}>
            <span>SUBTOTAL · {lb.itemCount} ITEMS</span>
            <span style={v3Styles.num}>${fmtAR(lb.total)}</span>
          </div>
          <div style={v3Styles.dotted}></div>
          <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ ...v3Styles.label, fontSize: 11, opacity: 1, fontWeight: 700 }}>TOTAL</span>
            <span style={{
              ...v3Styles.num, fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em',
              textShadow: '0 0 12px rgba(245,245,240,0.35)',
            }}>${fmtAR(lb.total)}</span>
          </div>
          <div style={v3Styles.solid}></div>

          {/* budget */}
          <div style={{ padding: '14px 0 4px', ...v3Styles.label, display: 'flex', justifyContent: 'space-between' }}>
            <span>PRESUPUESTO MENSUAL</span>
            <span style={v3Styles.num}>{pct}%</span>
          </div>
          <div style={{ height: 6, border: '1px solid #f5f5f0', position: 'relative', marginBottom: 6 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: '#f5f5f0' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.55, ...v3Styles.num }}>
            <span>${fmtAR(lb.state.spentThisMonth + lb.total)} / ${fmtAR(lb.state.budget)}</span>
            <span>restan ${fmtAR(lb.state.budget - lb.state.spentThisMonth - lb.total)}</span>
          </div>
        </div>

        {/* share */}
        <div style={{ padding: '20px 24px 24px' }}>
          <button onClick={onShare} style={{
            width: '100%', padding: '14px 0', background: 'transparent',
            color: '#f5f5f0', border: '1px solid #f5f5f0',
            fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.24em',
            textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>ENVIAR POR WHATSAPP →</button>
          <div style={{ textAlign: 'center', marginTop: 14, ...v3Styles.label, fontSize: 9, opacity: 0.4 }}>
            ★ ★ ★ GRACIAS POR USAR LISTBUY ★ ★ ★
          </div>
        </div>
      </div>
      <V3PaperEdge flip />
      {editing && <V3EditModal product={editing} onSave={(patch) => { lb.updateProduct(editing.id, patch); setEditing(null); }} onClose={() => setEditing(null)} />}
    </div>
  );
}

function V3EditModal({ product, onSave, onClose }) {
  const [name, setName] = React.useState(product.name);
  const [price, setPrice] = React.useState(product.price || '');
  const [qty, setQty] = React.useState(product.qty || 1);
  const inp = {
    background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(245,245,240,0.4)',
    fontFamily: 'inherit', fontSize: 14, padding: '8px 0',
    color: '#f5f5f0', outline: 'none', width: '100%', marginBottom: 14,
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: '#0a0a0a', padding: '24px 24px 32px', borderTop: '1px solid #f5f5f0' }}>
        <div style={{ ...v3Styles.label, fontSize: 9, marginBottom: 16 }}>EDITAR ITEM</div>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="precio" inputMode="numeric" style={inp} />
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="cant." inputMode="numeric" style={inp} />
        </div>
        <button onClick={() => onSave({ name, price: Number(price) || 0, qty: Number(qty) || 1 })} style={{
          width: '100%', padding: '12px 0', background: '#f5f5f0', color: '#0a0a0a',
          border: 'none', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.24em',
          textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
        }}>GUARDAR</button>
      </div>
    </div>
  );
}

Object.assign(window, { VariationDark, v3Styles });
