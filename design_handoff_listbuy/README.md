# Handoff: ListBuy — Lista de compras (rediseño)

## Overview
ListBuy es una PWA mobile-first para armar listas de compras del supermercado en Argentina. Permite agregar productos con precio y cantidad, ver el total acumulado, marcar items como comprados, y compartir la lista por WhatsApp. Incluye historial de compras, comparación de precios entre compras anteriores, y un presupuesto mensual con seguimiento.

Este rediseño reemplaza una UI anterior multicolor (azul/violeta/verde/rojo) por una estética monocromo inspirada en la metáfora de **ticket/recibo de papel térmico**, con dos modos: claro (papel) y oscuro (recibo invertido).

## About the Design Files
Los archivos en este bundle son **referencias de diseño en HTML** — prototipos que muestran el look intendido y el comportamiento, NO código de producción para copiar literalmente.

La tarea es **recrear estos diseños en el entorno del proyecto destino** (React Native, SwiftUI, Flutter, Next.js, etc.) usando los patrones y librerías que ya tenga el codebase. Si no hay un entorno aún, elegir el framework más apropiado (recomendación: React + Tailwind o React Native) e implementar ahí.

El HTML es un mockup interactivo — usalo para entender estados, transiciones y jerarquía visual, pero portá los componentes a la stack de destino.

## Fidelity
**Alta fidelidad (hi-fi)**. Los prototipos definen:
- Colores exactos (hex codes abajo)
- Tipografía exacta (familia, tamaños, pesos, tracking)
- Spacing y padding precisos
- Comportamiento de estados (hover, active, checked, vacío)
- Flujos de navegación entre pantallas

Replicar pixel-perfect, usando librerías equivalentes del codebase.

---

## Sistema de diseño

### Colores (estricto monocromo)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--bg` | `#fafaf7` | `#0a0a0a` | Fondo principal (papel / tinta) |
| `--fg` | `#0a0a0a` | `#f5f5f0` | Texto, bordes, fills |
| `--fg-muted-55` | `rgba(10,10,10,0.55)` | `rgba(245,245,240,0.55)` | Labels secundarios |
| `--fg-muted-40` | `rgba(10,10,10,0.4)` | `rgba(245,245,240,0.4)` | Items completados (tachados) |
| `--fg-muted-15` | `rgba(10,10,10,0.15)` | `rgba(245,245,240,0.2)` | Bordes sutiles |
| `--overlay` | `rgba(10,10,10,0.4)` | `rgba(0,0,0,0.6)` | Modales/drawers backdrop |

**Sin colores de acento.** Estados (eliminar, completado, error) se resuelven con peso, posición, tachado, opacidad — nunca con color.

### Tipografía

- **JetBrains Mono** (Google Fonts), pesos 400/500/600/700. Una sola familia para toda la app.
- **Numerales tabulares** siempre: `font-variant-numeric: tabular-nums`.

Escala:
| Token | Tamaño | Uso |
|---|---|---|
| `display` | 28–30px / 700 / `-0.01em` | Total grande |
| `h1` | 22px / 700 / `0.32em` (LISTBUY) | Wordmark |
| `body-lg` | 14–15px / 500 | Nombres de productos, items |
| `body` | 13px / 400 | UI general |
| `mono-num` | 14px / 600 / tabular | Precios |
| `label` | 9–10px / 500 / `0.18–0.24em` UPPERCASE | Etiquetas, secciones, metadata |
| `tiny` | 10–11px / 400 | Subtítulos, ayuda |

### Spacing
- Padding horizontal de pantalla: **24px**
- Padding vertical entre bloques: **14–20px**
- Gap en grids de inputs (precio + cant): **12px**
- Border-radius: **0** (sin redondeos — estética de papel/recibo)

### Vocabulario visual (clave)
1. **Líneas punteadas horizontales** como separadores principales:
   `background-image: linear-gradient(to right, var(--fg) 50%, transparent 50%); background-size: 6px 1px; height: 1px;`
2. **Líneas sólidas** para separadores fuertes (encima del Total): `1px solid var(--fg)`.
3. **Bordes dentados de papel** en top y bottom del contenedor — SVG zig-zag (ver `variation-1-thermal.jsx` → `PaperEdge`).
4. **Inputs sin caja**: solo borde inferior con `1px dashed var(--fg)`.
5. **Botones primarios**: rectángulo lleno (`bg: var(--fg)`, `color: var(--bg)`), sin radius, label uppercase tracking-wide.
6. **Botones secundarios**: rectángulo outline (`border: 1px solid var(--fg)`, fondo transparente).
7. **Checkboxes**: cuadrado de 14×14 con borde 1px, glifo "×" cuando está marcado (no "✓").

---

## Pantallas

### 1. Lista actual (pantalla principal)

**Layout vertical scrollable, top-to-bottom:**

1. **Borde dentado superior** (decorativo, papel rasgado)
2. **Header** centrado:
   - Botón `≡` (menú) a la izquierda
   - Label `N° 0042 · 01·MAY·26` centrado en `label` (9px uppercase tracking 0.22em)
   - Wordmark **LISTBUY** en 22px / 700 / tracking `0.32em`
   - Subtítulo `—— LISTA DE COMPRAS ——` en `label` con opacidad 0.6
   - Contador: `{N} ITEMS · ABIERTA` en `label`
3. **Línea punteada**
4. **Bloque "Agregar nuevo item"**:
   - Label `+ NUEVO ITEM`
   - Input nombre del producto (borde inferior dashed)
   - Grid 2fr 1fr: input precio | input cantidad
   - Botón `AGREGAR ›` (primario, full-width)
5. **Línea punteada**
6. **Lista de items** — cada item:
   - Checkbox 14×14
   - Nombre (14px / 500). Si checked: `text-decoration: line-through` + opacidad del row 0.4
   - Precio total a la derecha (14px / 600 mono tabular)
   - Línea inferior con: `{qty}× $precio` y, si hay historial, `↑/↓N%` vs. último precio conocido
   - Acciones `edit` `del` a la derecha (texto plano, opacidad 0.6)
7. **Bloque de totales**:
   - Línea punteada arriba y abajo del SUBTOTAL
   - `SUBTOTAL · {N} ITEMS` ↔ `${monto}` en label
   - **Línea punteada**
   - `TOTAL` (label fuerte) ↔ `${monto}` en display 28–30px
   - **Línea sólida 1px**
8. **Barra de presupuesto**:
   - Label `PRESUPUESTO MENSUAL` ↔ `{N}%`
   - Barra: `height: 6px`, `border: 1px solid var(--fg)`, fill interno `width: {pct}%`
   - Footer: `${gastado} / ${budget}` ↔ `restan ${X}` o `excede ${X}`
9. **Botón "ENVIAR POR WHATSAPP →"** (secundario outline)
10. **Footer decorativo**: `★ ★ ★ GRACIAS POR USAR LISTBUY ★ ★ ★` (label, opacidad 0.4)
11. **Borde dentado inferior**

**Toggle dark/light** flotante: botón 28×28 outline en top-right (z-index 8), glifo `☾` en light / `☀` en dark.

### 2. Drawer del menú (desde `≡`)
- Overlay backdrop `rgba(0,0,0,0.5)`
- Panel 78% del ancho, alineado a la izquierda, full-height
- Wordmark LISTBUY arriba + subtítulo "mayo · 2026"
- Lista de items con borde inferior `dashed`:
  - **Lista actual** · `{N} items`
  - **Historial** · `{N} compras`
  - **Presupuesto** · `${budget}/mes`
  - **Comparar precios** · `evolución`
- Cada item: nombre (14px / 500) ↔ meta (label 10px tracking-wide, opacidad 0.5)

### 3. Historial
- Header: `← Volver` (label) ↔ "Historial" (label)
- Línea sólida bajo header
- Lista de compras pasadas. Cada compra:
  - Tienda + fecha (label) + total grande (18px / 700)
  - Desglose de items, cada uno con borde dotted: `{qty}× nombre` ↔ `${subtotal}`

### 4. Presupuesto
- Header: `← Volver` ↔ "Presupuesto · Mayo"
- "Disponible" (label) → ${remaining} en display 44px
- Subtítulo: `de ${budget} · gastaste ${spent}`
- **Barra segmentada** (20 segmentos): `height: 24px`, `border: 1px solid var(--fg)`, cada segmento separado por `border-right: 1px solid var(--border)`. Los primeros `pct/5` segmentos están filled.
- Escala 0%/{pct}%/100%
- **Slider de presupuesto**: range input nativo con accent-color = fg, mostrando `$20.000 / ${val}/mes / $300.000`
- "Últimos 3 meses" (label) — para cada mes: label + `${spent}/${budget} · {pct}%` y mini-barra 4px tall

### 5. Comparar precios
- Header: `← Volver` ↔ "Comparar precios"
- Para cada producto en la lista actual con historial:
  - Nombre del producto + `↑/↓ {N}%` vs. último
  - **Sparkline de barras** (height 36px, gap 4px): cada barra es un punto de precio histórico, la última barra (precio actual) es full-opacity, las anteriores son opacidad 0.4
  - Footer: `min ${X} · actual ${X} · max ${X}`

### 6. Modal Compartir WhatsApp
- Overlay backdrop `rgba(0,0,0,0.55)`, content centrado
- Container 420px max, padding 20–22px
- Header: "Compartir lista" (label) + botón `×` cerrar
- **Preview del mensaje** en bloque dashed: monoespaciado, `whiteSpace: pre-wrap`, max-height 240px scroll. Formato:
  ```
  *LISTBUY · Lista de compras*

  • {qty}× Nombre — $monto
  • ...

  *Total: $XXXX*

  — Enviado desde ListBuy
  ```
- "Enviar a" (label) + lista de contactos. Cada contacto:
  - Avatar cuadrado 30×30 con inicial
  - Nombre + sub (última actividad)
  - `→` a la derecha
  - Click → `window.open('https://wa.me/?text=' + encodeURIComponent(msg))`
- Footer 2 botones: `Copiar texto` (outline, flex 1) + `Abrir WhatsApp →` (primario, flex 2)

### 7. Modal Editar item (sheet desde abajo)
- Slide-up sheet, padding 24px
- Label "EDITAR ITEM"
- Input nombre (full-width, dashed underline)
- Grid 2fr 1fr: precio | cantidad
- Botón "GUARDAR" full-width primario

---

## Estado / lógica

```ts
type Product = { id: number; name: string; price: number; qty: number; checked: boolean };
type HistoryEntry = { id: string; date: string; store: string; items: {name; price; qty}[]; total: number };
type State = {
  products: Product[];
  history: HistoryEntry[];
  budget: number;
  spentThisMonth: number;
};
```

Persistir en localStorage (key `listbuy_v2`) o equivalente nativo (AsyncStorage / Core Data / SharedPreferences).

Operaciones:
- `addProduct(name, price, qty)` — push con `id: Date.now()`
- `updateProduct(id, patch)`
- `removeProduct(id)`
- `toggleCheck(id)` — invierte `checked`
- `clearList()`
- `priceHistory(name)` — devuelve `[{date, price, store}]` para todos los matches case-insensitive en `history`
- Derivados: `total = sum(price × qty)`, `itemCount = sum(qty)`

## Format helpers
- Moneda AR: `Intl.NumberFormat('es-AR', {minimumFractionDigits:0, maximumFractionDigits:0}).format(round(n))` → "$14.000"
- Fecha corta: `toLocaleDateString('es-AR', {day:'2-digit', month:'short'})` → "24 abr."

---

## Interacciones / animaciones

- **Toggle dark/light**: instantáneo (sin animación). Persistir preferencia.
- **Marcar como comprado**: opacity del row de 1 → 0.4 con transición 200ms ease.
- **Modales/sheets**: slide-up desde bottom 250ms ease-out, backdrop fade 200ms.
- **Drawer del menú**: slide-in desde left 250ms ease-out.
- **Botones**: sin hover en mobile, pero en desktop opacidad 0.85 al hover, transition 100ms.
- **Sin gradientes, sin sombras, sin glassmorphism, sin animaciones decorativas.**

---

## Empty states
- Lista vacía: bloque centrado con label `— LISTA VACÍA —` (opacidad 0.4)
- Sin historial: `— SIN COMPRAS PREVIAS —`
- Comparar sin datos: `Sin datos para comparar`

---

## Responsive
- Mobile-first. Layout target: ancho 360–440px.
- Desktop: el viewport mantiene el ancho mobile (max-width 440px) centrado, con el resto de la pantalla en gris neutro `#ececec`.

---

## Files en este bundle

```
design_handoff_listbuy/
├── README.md                          ← este archivo
├── ListBuy.html                       ← prototipo final (abrir en browser)
└── source/
    ├── app-state.jsx                  ← hook useListBuy + datos seed + format helpers
    ├── final-app.jsx                  ← shell + dark toggle + tweaks
    ├── variation-1-thermal.jsx        ← variante light (térmico papel)
    ├── variation-3-dark.jsx           ← variante dark (recibo invertido)
    ├── secondary-screens.jsx          ← Menu, History, Budget, Compare, Share modals
    └── tweaks-panel.jsx               ← panel de tweaks (no portar — es solo del prototipo)
```

**Cómo ver el prototipo**: abrí `ListBuy.html` en cualquier browser moderno. Es un single-page con todo el comportamiento inline (React via CDN). Probá agregar productos, marcar, abrir el menú con `≡`, navegar entre pantallas, alternar dark mode con el botón ☾/☀.

**No portar `tweaks-panel.jsx`** — es solo para que el prototipo sea iterable.

---

## Recomendaciones de implementación

- **React Native / Expo**: usar `Pressable` para todos los botones, `FlatList` para la lista, `react-native-async-storage` para persistencia, `Modal` con `transparent` para sheets.
- **Web (Next.js / Vite)**: Tailwind sirve, pero las clases custom van a ser muchas — considerar CSS modules o styled-components con tokens. Cuidado: NO usar `rounded-*` (border-radius 0 en todo).
- **Tipografía**: importar JetBrains Mono via Google Fonts (`@import` o `next/font/google`).
- **iOS nativo**: SF Mono no es exactamente JetBrains Mono — bundlear el .ttf de JetBrains Mono como font asset.
- **WhatsApp share**: en mobile nativo usar el share sheet del sistema con texto pre-formateado; en web mantener `wa.me/?text=`.
- **Locale**: forzar `es-AR` para formateo de moneda y fechas.
