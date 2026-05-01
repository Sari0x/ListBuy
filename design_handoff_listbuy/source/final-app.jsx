// final-app.jsx — Final ListBuy: thermal-receipt, light + dark with header toggle.
// Tweaks panel exposes density, accent (off by default — pure mono), font choice.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "showStamp": true,
  "compact": false
}/*EDITMODE-END*/;

function FinalApp() {
  const lb = useListBuy();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState('list');
  const [shareOpen, setShareOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const dark = tweaks.dark;
  const Variation = dark ? VariationDark : VariationThermal;

  // Wire a dark-mode toggle into the variation by intercepting onMenu? No —
  // we add a small floating toggle inside the device that the variations don't own.
  return (
    <div className="phone-host">
      <div className="device" style={{ position: 'relative', background: dark ? '#0a0a0a' : '#fafaf7' }}>
        <Variation store={lb} onShare={() => setShareOpen(true)} onMenu={() => setMenuOpen(true)} />

        {/* dark mode toggle — top-right inside the page */}
        <button onClick={() => setTweak('dark', !dark)} style={{
          position: 'absolute', top: 18, right: 18, zIndex: 8,
          background: 'transparent',
          border: `1px solid ${dark ? 'rgba(245,245,240,0.4)' : 'rgba(10,10,10,0.4)'}`,
          color: dark ? '#f5f5f0' : '#0a0a0a',
          width: 28, height: 28, padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 11, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title={dark ? 'Modo claro' : 'Modo oscuro'}>
          {dark ? '☀' : '☾'}
        </button>

        {menuOpen && (
          <MenuDrawer store={lb} dark={dark} onClose={() => setMenuOpen(false)}
            onView={(id) => { setMenuOpen(false); setScreen(id); }} />
        )}
        {screen === 'history' && <HistoryView store={lb} dark={dark} onBack={() => setScreen('list')} />}
        {screen === 'budget' && <BudgetView store={lb} dark={dark} onBack={() => setScreen('list')}
          onUpdateBudget={(v) => lb.setState((s) => ({ ...s, budget: v }))} />}
        {screen === 'compare' && <CompareView store={lb} dark={dark} onBack={() => setScreen('list')} />}
        {shareOpen && <ShareModal store={lb} dark={dark} onClose={() => setShareOpen(false)} />}

        <TweaksPanel title="Tweaks">
          <TweakSection label="Apariencia">
            <TweakToggle label="Modo oscuro" value={tweaks.dark} onChange={(v) => setTweak('dark', v)} />
          </TweakSection>
          <TweakSection label="Datos">
            <TweakButton label="Resetear a datos demo" onClick={() => {
              localStorage.removeItem('listbuy_v2');
              location.reload();
            }} />
            <TweakButton label="Vaciar lista" onClick={() => lb.clearList()} />
          </TweakSection>
        </TweaksPanel>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<FinalApp />);
