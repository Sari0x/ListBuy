// secondary-screens.jsx — Share-via-WhatsApp modal, History view, Budget view.
// Shared across all variations; respects light/dark via the `dark` prop.

function buildWhatsAppMessage(state, total, fmtAR) {
  const lines = [];
  lines.push('*LISTBUY · Lista de compras*');
  lines.push('');
  state.products.forEach((p) => {
    const sub = (p.price || 0) * (p.qty || 1);
    const qStr = p.qty > 1 ? `${p.qty}× ` : '';
    lines.push(`• ${qStr}${p.name} — $${fmtAR(sub)}`);
  });
  lines.push('');
  lines.push(`*Total: $${fmtAR(total)}*`);
  lines.push('');
  lines.push('— Enviado desde ListBuy');
  return lines.join('\n');
}

function ShareModal({ store, dark, onClose }) {
  const lb = store;
  const msg = buildWhatsAppMessage(lb.state, lb.total, fmtAR);
  const [copied, setCopied] = React.useState(false);

  const bg = dark ? '#0a0a0a' : '#fafaf7';
  const fg = dark ? '#f5f5f0' : '#0a0a0a';
  const muted = dark ? 'rgba(245,245,240,0.5)' : 'rgba(10,10,10,0.5)';
  const border = dark ? 'rgba(245,245,240,0.2)' : 'rgba(10,10,10,0.15)';

  const copy = () => {
    try {
      navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, background: bg, color: fg,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        border: `1px solid ${border}`, padding: '20px 22px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>
            Compartir lista
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: fg, fontSize: 18, opacity: 0.6, padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {/* preview */}
        <div style={{
          background: dark ? 'rgba(245,245,240,0.04)' : 'rgba(10,10,10,0.04)',
          border: `1px dashed ${border}`,
          padding: '14px 16px', fontSize: 12, lineHeight: 1.7, marginBottom: 16,
          maxHeight: 240, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg}
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 10 }}>
          Enviar a
        </div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {[
            { name: 'Familia · Casa', sub: '4 personas', initial: 'F' },
            { name: 'Vale 💚', sub: 'última: hace 2 días', initial: 'V' },
            { name: 'Mamá', sub: 'última: hace 1 sem', initial: 'M' },
          ].map((c, i) => (
            <button key={i} onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
            }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              background: 'transparent', border: `1px solid ${border}`, color: fg,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}>
              <div style={{
                width: 30, height: 30, border: `1px solid ${fg}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
              }}>{c.initial}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>{c.sub}</div>
              </div>
              <div style={{ fontSize: 14, opacity: 0.5 }}>→</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copy} style={{
            flex: 1, padding: '12px 0', background: 'transparent', color: fg,
            border: `1px solid ${border}`, fontFamily: 'inherit', fontSize: 10,
            letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>{copied ? '✓ Copiado' : 'Copiar texto'}</button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')} style={{
            flex: 2, padding: '12px 0', background: fg, color: bg,
            border: 'none', fontFamily: 'inherit', fontSize: 10,
            letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>Abrir WhatsApp →</button>
        </div>
      </div>
    </div>
  );
}

function MenuDrawer({ store, dark, onClose, onView }) {
  const lb = store;
  const bg = dark ? '#0a0a0a' : '#fafaf7';
  const fg = dark ? '#f5f5f0' : '#0a0a0a';
  const border = dark ? 'rgba(245,245,240,0.2)' : 'rgba(10,10,10,0.15)';
  const items = [
    { id: 'list', label: 'Lista actual', meta: `${lb.itemCount} items` },
    { id: 'history', label: 'Historial', meta: `${lb.state.history.length} compras` },
    { id: 'budget', label: 'Presupuesto', meta: `$${fmtAR(lb.state.budget)}/mes` },
    { id: 'compare', label: 'Comparar precios', meta: 'evolución' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 15 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '78%',
        background: bg, color: fg, padding: '24px 22px',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        borderRight: `1px solid ${border}`,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.32em', fontWeight: 700, marginBottom: 4 }}>LISTBUY</div>
        <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 28 }}>
          mayo · 2026
        </div>
        <div style={{ display: 'grid', gap: 1 }}>
          {items.map((it) => (
            <button key={it.id} onClick={() => onView(it.id)} style={{
              background: 'transparent', border: 'none', borderBottom: `1px dashed ${border}`,
              padding: '14px 0', textAlign: 'left', cursor: 'pointer', color: fg, fontFamily: 'inherit',
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{it.label}</span>
              <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5 }}>{it.meta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ store, dark, onBack }) {
  const lb = store;
  const bg = dark ? '#0a0a0a' : '#fafaf7';
  const fg = dark ? '#f5f5f0' : '#0a0a0a';
  const border = dark ? 'rgba(245,245,240,0.2)' : 'rgba(10,10,10,0.15)';
  return (
    <div style={{
      position: 'absolute', inset: 0, background: bg, color: fg,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace', zIndex: 15,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: fg, fontSize: 12, fontFamily: 'inherit', padding: 0, letterSpacing: '0.18em', textTransform: 'uppercase' }}>← Volver</button>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>Historial</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
        {lb.state.history.map((h) => (
          <div key={h.id} style={{ paddingTop: 18, paddingBottom: 18, borderBottom: `1px dashed ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{h.store}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginTop: 4 }}>
                  {fmtDate(h.date)} · {h.items.length} items
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${fmtAR(h.total)}</div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.7, fontVariantNumeric: 'tabular-nums' }}>
              {h.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < h.items.length - 1 ? `1px dotted ${border}` : 'none', padding: '4px 0' }}>
                  <span>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</span>
                  <span>${fmtAR((it.price || 0) * (it.qty || 1))}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetView({ store, dark, onBack, onUpdateBudget }) {
  const lb = store;
  const [val, setVal] = React.useState(lb.state.budget);
  const bg = dark ? '#0a0a0a' : '#fafaf7';
  const fg = dark ? '#f5f5f0' : '#0a0a0a';
  const border = dark ? 'rgba(245,245,240,0.2)' : 'rgba(10,10,10,0.15)';
  const pct = Math.min(100, Math.round(((lb.state.spentThisMonth + lb.total) / val) * 100));
  const remaining = val - lb.state.spentThisMonth - lb.total;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: bg, color: fg,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace', zIndex: 15,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: fg, fontSize: 12, fontFamily: 'inherit', padding: 0, letterSpacing: '0.18em', textTransform: 'uppercase' }}>← Volver</button>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>Presupuesto · Mayo</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 8 }}>Disponible</div>
        <div style={{ fontSize: 44, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginBottom: 4 }}>
          ${fmtAR(remaining)}
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
          de ${fmtAR(val)} · gastaste ${fmtAR(lb.state.spentThisMonth + lb.total)}
        </div>

        <div style={{ marginTop: 28, height: 24, border: `1px solid ${fg}`, position: 'relative', display: 'flex' }}>
          {[...Array(20)].map((_, i) => {
            const fill = (i + 1) / 20 * 100 <= pct;
            return <div key={i} style={{ flex: 1, borderRight: i < 19 ? `1px solid ${border}` : 'none', background: fill ? fg : 'transparent' }}></div>;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55 }}>
          <span>0%</span><span>{pct}%</span><span>100%</span>
        </div>

        <div style={{ marginTop: 32, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 10 }}>
          Editar presupuesto
        </div>
        <input type="range" min="20000" max="300000" step="5000" value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          onMouseUp={() => onUpdateBudget(val)} onTouchEnd={() => onUpdateBudget(val)}
          style={{ width: '100%', accentColor: fg }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          <span>$20.000</span>
          <span style={{ fontWeight: 600 }}>${fmtAR(val)}/mes</span>
          <span>$300.000</span>
        </div>

        <div style={{ marginTop: 32, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 12 }}>
          Últimos 3 meses
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { m: 'Abr 26', spent: 102400, budget: 120000 },
            { m: 'Mar 26', spent: 118200, budget: 120000 },
            { m: 'Feb 26', spent: 89000, budget: 100000 },
          ].map((row) => {
            const p = Math.round((row.spent / row.budget) * 100);
            return (
              <div key={row.m} style={{ borderBottom: `1px dashed ${border}`, paddingBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.7 }}>{row.m}</span>
                  <span>${fmtAR(row.spent)} / ${fmtAR(row.budget)} · {p}%</span>
                </div>
                <div style={{ height: 4, background: dark ? 'rgba(245,245,240,0.12)' : 'rgba(10,10,10,0.08)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, p)}%`, background: fg }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompareView({ store, dark, onBack }) {
  const lb = store;
  const bg = dark ? '#0a0a0a' : '#fafaf7';
  const fg = dark ? '#f5f5f0' : '#0a0a0a';
  const border = dark ? 'rgba(245,245,240,0.2)' : 'rgba(10,10,10,0.15)';
  // for each currently-listed product, show its price evolution
  const series = lb.state.products
    .map((p) => ({ name: p.name, current: p.price, history: lb.priceHistory(p.name) }))
    .filter((s) => s.history.length > 0 || s.current);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: bg, color: fg,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace', zIndex: 15,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: fg, fontSize: 12, fontFamily: 'inherit', padding: 0, letterSpacing: '0.18em', textTransform: 'uppercase' }}>← Volver</button>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>Comparar precios</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {series.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 11, opacity: 0.5, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sin datos para comparar</div>}
        {series.map((s, idx) => {
          const prices = [...s.history.map((h) => h.price), s.current].filter((x) => x);
          const max = Math.max(...prices);
          const min = Math.min(...prices);
          const last = s.history[0]?.price;
          const delta = last && s.current ? Math.round(((s.current - last) / last) * 100) : null;
          return (
            <div key={idx} style={{ paddingTop: 16, paddingBottom: 16, borderBottom: `1px dashed ${border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                {delta !== null && (
                  <div style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '='} {Math.abs(delta)}%
                  </div>
                )}
              </div>
              {/* tiny sparkline: bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36, marginBottom: 8 }}>
                {[...s.history].reverse().concat([{ price: s.current, store: 'hoy' }]).map((pt, i) => {
                  const h = ((pt.price - min) / Math.max(1, max - min)) * 30 + 4;
                  return (
                    <div key={i} style={{ flex: 1, height: h, background: i === s.history.length ? fg : (dark ? 'rgba(245,245,240,0.4)' : 'rgba(10,10,10,0.4)') }}></div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                <span>min ${fmtAR(min)}</span>
                <span>actual ${fmtAR(s.current || 0)}</span>
                <span>max ${fmtAR(max)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ShareModal, MenuDrawer, HistoryView, BudgetView, CompareView });
