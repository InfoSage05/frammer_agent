# Frammer AI — v20 UI Redesign Master Prompt & Specification

> **How to use this document**
> This file is a self-contained implementation brief. Hand it to an AI code agent (Claude, Cursor, Copilot) or a developer and it will produce a complete, correct v20 redesign of `frammer-dashboard-v19.html`. Every change is grounded in a named psychological law or mathematical principle so the reasoning is never lost. Changes are ordered from lowest-to-highest implementation complexity.

---

## Preamble — Design Philosophy for v20

The v19 dashboard is technically capable but psychologically exhausting. Users feel "something is off" without being able to name it. The root causes are three invisible problems:

1. **Mathematical discord** — spacing and typography violate the 8pt grid and modular scale, causing sub-pixel blurring and hierarchy collapse
2. **Cognitive overload** — five simultaneous navigation surfaces trigger Hick's Law, slowing every decision logarithmically
3. **Pre-attentive failure** — all KPI values appear visually equal, so the brain has no anchor and scans everything at the same cost

v20 fixes all three layers. The goal is a dashboard that feels *inevitable* — where every pixel placement seems like the only possible choice.

**Governing mathematical constants:**
- Base spacing unit: `8px`
- Type scale ratio: `1.25–1.618` (Fibonacci-adjacent)
- Layout proportion target: Golden Ratio `φ = 1.618`
- Minimum tap/click target: `44px` (Apple HIG / WCAG 2.5.5)
- Maximum font sizes in system: **7** (down from 18)
- Minimum legible font size: **10px** (no exceptions)

---

## Phase 1 — Mathematical Foundation
### CSS-only changes · Estimated effort: 1 sprint · Impact: immediately felt

---

### CHANGE 01 — Replace All Spacing with Strict 8pt Grid Tokens

**Law:** Sub-pixel rendering physics. Values not divisible by 8 anti-alias differently at 1×, 1.5×, 2×, 3× DPI — creating microscopic blurring that erodes perceived quality without a traceable cause.

**Problem in v19:**
```css
/* THESE MUST ALL BE REPLACED — non-grid values */
padding: 7px 16px;       /* topbar-right */
padding: 9px 14px;       /* toast */
padding: 10px 12px;      /* filter-group */
padding: 11px 13px;      /* ev-item */
padding: 14px 16px;      /* sidebar-logo */
padding: 3.5px 0;        /* sb-row */
gap: 7px;                /* topbar-right */
gap: 5px;                /* explain-row */
margin: 10px 12px 4px;   /* sb-search-btn */
padding: 7px 10px;       /* sb-search-btn */
padding: 9px 4px 8px;    /* rp-tab */
```

**Solution — add these CSS custom properties at the top of `:root`:**
```css
:root {
  /* ── 8PT SPACING TOKENS ── */
  --space-1:  4px;    /* xs  — icon-to-text, badge inner padding */
  --space-2:  8px;    /* sm  — tight component gaps, icon margins */
  --space-3:  12px;   /* md  — card inner padding, list item padding */
  --space-4:  16px;   /* lg  — section padding, topbar horizontal */
  --space-5:  24px;   /* xl  — between card groups, panel body */
  --space-6:  32px;   /* 2xl — section-to-section separation */
  --space-7:  48px;   /* 3xl — major layout zone heights */
  --space-8:  64px;   /* 4xl — hero section padding */
}
```

**Replacement map — apply these exact swaps everywhere in the CSS:**

| Current value | Replace with | Token | Reason |
|---|---|---|---|
| `3.5px` | `4px` | `--space-1` | Nearest 4px multiple |
| `5px` (gap) | `4px` or `8px` | `--space-1` or `--space-2` | Context-dependent |
| `7px` (padding) | `8px` | `--space-2` | Round up to grid |
| `9px` | `8px` | `--space-2` | Round down to grid |
| `10px` (padding) | `8px` or `12px` | `--space-2/3` | Context-dependent |
| `11px` (padding) | `12px` | `--space-3` | Round up to grid |
| `13px` (padding) | `12px` | `--space-3` | Round down to grid |
| `14px` | `16px` | `--space-4` | Round up to grid |
| `18px` | `16px` | `--space-4` | Round down to grid |
| `20px` | `16px` or `24px` | `--space-4/5` | Context-dependent |
| `22px` | `24px` | `--space-5` | Round up to grid |
| `42px` (padding-right in logo) | `40px` | — | Use 40 = 5×8 |

**Specific element fixes:**
```css
/* TOPBAR */
.topbar {
  height: 48px;           /* was: var(--header-h: 54px) → 48 = 6×8 */
  padding: 0 16px 0 24px; /* was: 0 20px 0 24px → 20 not on 8pt grid */
  gap: 8px;               /* was: 12px → not on strict 8pt */
}

/* CONTEXT BAR */
.gf-spine {
  height: 40px;           /* was: var(--ctx-h: 38px) → 40 = 5×8 */
  padding: 0 16px 0 24px; /* match topbar horizontal */
}

/* SIDEBAR LOGO */
.logo-lockup {
  padding: 16px;          /* was: 14px 42px 14px 16px → non-grid */
  min-height: 64px;       /* was: 62px → 64 = 8×8 */
}

/* SEARCH BUTTON */
.sb-search-btn {
  margin: 8px 8px 4px;    /* was: 10px 12px 4px */
  padding: 8px 12px;      /* was: 7px 10px */
}

/* NAV ITEMS */
.nav-item {
  padding: 8px 16px;      /* was: 7px 16px */
  margin: 2px 8px;        /* was: 1px 8px */
  gap: 8px;               /* was: 10px → round to 8 */
}

/* NAV GROUP LABELS */
.nav-grp {
  padding: 16px 16px 8px; /* was: 14px 16px 5px */
}

/* SIDEBAR STATS */
.sb-stats {
  padding: 8px 16px;      /* was: 10px 14px */
}

/* SIDEBAR FOOTER */
.sb-foot {
  padding: 8px 16px;      /* was: 10px 14px */
}

/* RIGHT PANEL TABS */
.rp-tab {
  padding: 8px 4px;       /* was: 9px 4px 8px */
  margin-top: 8px;        /* was: 6px */
}

/* RIGHT PANEL BODY */
.rp-body { padding: 16px; } /* was: 16px — keep */

/* EVIDENCE ITEM */
.ev-item {
  padding: 8px 12px;      /* was: 11px 13px */
  margin-bottom: 8px;     /* was: 7px */
}

/* TOAST */
.toast {
  padding: 8px 16px;      /* was: 9px 14px */
}

/* CALLOUT */
.callout {
  padding: 8px 12px;      /* was: 10px 12px 9px */
  margin-bottom: 8px;     /* was: 8px — keep */
}

/* EXPLAIN CARD */
.explain-card {
  padding: 16px;          /* was: 14px 16px */
  margin-bottom: 8px;     /* was: 10px */
}

/* FILTER PANEL */
.filter-group {
  padding: 8px 16px;      /* was: 10px 14px */
}

/* DRAWER */
.drawer-head {
  padding: 16px;          /* was: 14px 16px */
}
.drawer-body { padding: 16px; }   /* was: 16px — keep */
.drawer-sect { margin-bottom: 16px; } /* was: 18px */

/* DATA TABLE CELLS */
.data-table th { padding: 8px 12px; }  /* was: 7px 10px */
.data-table td { padding: 8px 12px; }  /* was: 7px 10px */

/* SUBTABS */
.sub-tab { padding: 8px 16px; }        /* was: 8px 16px — keep */

/* SECTION BLOCKS */
.section-block { padding: 24px; }      /* standardize — was mixed */
```

---

### CHANGE 02 — Collapse 18 Font Sizes to 7-Stop Fibonacci Scale

**Law:** Gestalt similarity — sizes within 2px of each other are perceptually identical. The brain cannot form a hierarchy from 7px, 7.5px, 8px, 8.5px, 9px, 9.5px. It perceives them all as "small text" and stops differentiating. The result is cognitive flatness where everything demands equal attention.

**Mathematical basis:** Fibonacci sequence (8, 13, 21, 34) maps to type sizes (10, 13, 16, 21, 26, 34px). Each step is a ×1.25–1.618 ratio — within the range the human visual system perceives as a clear "jump."

**Problem in v19 — all sizes currently used:**
```
7px, 7.5px, 8px, 8.5px, 9px, 9.5px, 10px, 11px, 11.5px,
12px, 12.5px, 13px, 15px, 16px, 18px, 28px  ← 16 distinct sizes
```
Between 7–13px alone there are 9 sizes crammed into a 6px range. The brain cannot distinguish them.

**Solution — add to `:root`:**
```css
:root {
  /* ── TYPOGRAPHIC SCALE (Fibonacci-based) ── */
  --text-xs:   10px;   /* minimum — mono labels, badges, meta only */
  --text-sm:   13px;   /* nav items, captions, small UI */
  --text-base: 16px;   /* primary body text */
  --text-lg:   21px;   /* section subheadings, card titles */
  --text-xl:   26px;   /* primary KPI values */
  --text-2xl:  34px;   /* hero KPI value — the anchor */

  /* Weight system — two weights only */
  --weight-normal: 400;
  --weight-medium: 600;  /* use 600, not 500 or 700 — sharp at small sizes */
}
```

**Replacement map — apply throughout all CSS:**

| Current size | New size | Token | Usage |
|---|---|---|---|
| `7px` | `10px` | `--text-xs` | nav-grp labels, sb-stats-title |
| `7.5px` | `10px` | `--text-xs` | toast-lbl, ev-item-label, drawer-sect-t |
| `8px` | `10px` | `--text-xs` | badges, period-badge, rp-section-lbl, gf-label |
| `8.5px` | `10px` | `--text-xs` | rp-tab-label |
| `9px` | `10px` | `--text-xs` | ctrl-btn, gf-reset, cmd-trigger |
| `9.5px` | `13px` | `--text-sm` | sub-tab, chat-qp, bar-lbl |
| `10px` | `13px` | `--text-sm` | explain-lbl, explain-action, filter-group-label |
| `11px` | `13px` | `--text-sm` | chat-bbl, nav-item (keep at 13) |
| `11.5px` | `13px` | `--text-sm` | c-text, callout body, chat-inp |
| `12px` | `13px` | `--text-sm` | nav-item (already close) |
| `12.5px` | `13px` | `--text-sm` | sv-name, explain-val, data-table body |
| `13px` | `13px` | `--text-sm` | base body — keep |
| `15px` | `16px` | `--text-base` | page-title |
| `16px` | `16px` | `--text-base` | ev-item-val, explain-entity — keep |
| `18px` | `21px` | `--text-lg` | c-num (callout numbers) |
| `28px` | `26px` | `--text-xl` | empty-state-icon size adjustment |

**Specific element type assignments:**
```css
/* Labels, badges, meta text — xs only */
.nav-grp          { font-size: var(--text-xs); }
.sb-stats-title   { font-size: var(--text-xs); }
.sb-lbl           { font-size: var(--text-xs); }
.toast-lbl        { font-size: var(--text-xs); }
.badge            { font-size: var(--text-xs); }
.gf-label         { font-size: var(--text-xs); }
.gf-chip          { font-size: var(--text-xs); }
.rp-section-lbl   { font-size: var(--text-xs); }
.rp-tab-label     { font-size: var(--text-xs); }
.period-badge     { font-size: var(--text-xs); }
.data-table th    { font-size: var(--text-xs); }
.ev-item-label    { font-size: var(--text-xs); }
.drawer-sect-t    { font-size: var(--text-xs); }
.c-tag            { font-size: var(--text-xs); }
.leg-item         { font-size: var(--text-xs); }

/* Navigation, captions, UI controls — sm */
.nav-item         { font-size: var(--text-sm); }
.sub-tab          { font-size: var(--text-sm); }
.ctrl-btn         { font-size: var(--text-sm); }
.chat-bbl         { font-size: var(--text-sm); }
.chat-qp          { font-size: var(--text-sm); }
.chat-inp         { font-size: var(--text-sm); }
.explain-action   { font-size: var(--text-sm); }
.c-text           { font-size: var(--text-sm); }
.sv-name          { font-size: var(--text-sm); }
.explain-val      { font-size: var(--text-sm); }
.data-table td    { font-size: var(--text-sm); }
.sb-val           { font-size: var(--text-sm); }

/* Primary body — base */
html, body        { font-size: var(--text-base); }  /* up from 13px */
.page-title       { font-size: var(--text-base); font-weight: var(--weight-medium); }
.explain-entity   { font-size: var(--text-base); }

/* Section titles, card titles — lg */
.section-title    { font-size: var(--text-lg); font-weight: var(--weight-medium); }
.ev-item-val      { font-size: var(--text-lg); }

/* KPI primary values — xl */
.kpi-primary-val  { font-size: var(--text-xl); font-weight: var(--weight-medium); }

/* Hero KPI — 2xl anchor */
.kpi-hero-val     { font-size: var(--text-2xl); font-weight: var(--weight-medium); }
```

**Critical rule:** `font-family: var(--font-mono)` must ONLY be used for:
- Numeric data values (KPIs, percentages, counts)
- Code, timestamps, version numbers
- Keyboard shortcut badges

Everything else uses `var(--font-sans)`. Currently mono is overused on nav group labels, tab labels, filter chips — this is incorrect and adds cognitive noise.

---

### CHANGE 03 — Unify 4 Button Variants into 1 Base + 3 Semantic Modifiers

**Law:** Gestalt similarity — identical affordances must be visually identical. Users learn one click target pattern. Having four differently-styled buttons that all trigger actions creates unpredictable mental models.

**Buttons currently in v19 (all doing the same job):**
```
.ctrl-btn        — monospace, 9px, border, bg3
.investigate-btn — monospace, 8px, danger border, danger bg
.dim-opt         — monospace, 10px, border, transparent
.panel-btn       — sans, 10.5px, border, bg3
.explain-action  — sans, 10px, border, transparent
.chat-qp         — sans, 9.5px, border, transparent, 20px radius
.empty-state-action — mono, 9px, border, transparent
.tbl-sort-btn    — mono, 8px, border, transparent
.tbl-export-btn  — mono, 8px, border, transparent
```

**Solution — delete all 9 above and replace with:**
```css
/* ── UNIFIED BUTTON SYSTEM ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 32px;
  padding: 0 16px;
  border-radius: var(--radius);             /* 8px */
  border: 1px solid var(--line);
  background: var(--bg3);
  color: var(--ink3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);               /* 13px */
  font-weight: var(--weight-medium);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s var(--ease-out);
  user-select: none;
  letter-spacing: 0.01em;
}
.btn:hover {
  border-color: var(--pri);
  color: var(--pri-lt);
  background: var(--pri-dim);
}
.btn:active { transform: scale(0.98); }
.btn:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}

/* Compact variant — for toolbars and table headers */
.btn-sm {
  height: 24px;
  padding: 0 8px;
  font-size: var(--text-xs);
}

/* Primary action */
.btn-primary {
  background: var(--pri);
  border-color: var(--pri);
  color: #fff;
  font-weight: var(--weight-medium);
}
.btn-primary:hover {
  background: var(--pri-lt);
  border-color: var(--pri-lt);
  color: #fff;
}

/* Danger/investigate */
.btn-danger {
  border-color: rgba(212,85,85,0.3);
  background: rgba(212,85,85,0.07);
  color: var(--dan-lt);
}
.btn-danger:hover {
  border-color: var(--dan-lt);
  background: rgba(212,85,85,0.14);
  color: var(--dan-lt);
}

/* Ghost — minimal, for inline actions */
.btn-ghost {
  background: transparent;
  border-color: transparent;
}
.btn-ghost:hover {
  background: var(--bg3);
  border-color: var(--line);
}

/* Large CTA — minimum 44px tall (Fitts's Law compliant) */
.btn-lg {
  height: 44px;
  padding: 0 24px;
  font-size: var(--text-base);
}

/* Pill shape — for filter chips and mode badges */
.btn-pill {
  border-radius: 20px;
  height: 24px;
  padding: 0 12px;
}
```

**Replacement guide:**
```
.ctrl-btn          → .btn or .btn.btn-sm
.investigate-btn   → .btn.btn-danger
.dim-opt           → .btn.btn-pill (active state handled by .active class)
.panel-btn         → .btn (remove, topbar button is just .btn)
.explain-action    → .btn.btn-sm.btn-ghost
.chat-qp           → .btn.btn-pill.btn-sm
.empty-state-action → .btn.btn-sm.btn-ghost
.tbl-sort-btn      → .btn.btn-sm
.tbl-export-btn    → .btn.btn-sm (add .btn-ghost)
```

---

### CHANGE 04 — Sidebar Width to 240px (Golden Ratio Complement)

**Law:** Proportional harmony. At 1440px viewport, sidebar at 216px gives a 1:5.67 ratio — mathematically arbitrary. The closest harmonious ratio is 1:φ² = 1:2.618, giving sidebar = 1440/3.618 ≈ 398px. For a utility sidebar, the practical application is the **minor golden rectangle**: width = 240px (≈ 1440 × 1/6 = Fibonacci proportion 1, 1, 2, 3, 5, 8 — 240/1440 = 1/6).

```css
:root {
  --sb-w:        240px;   /* was: 216px */
  --sb-w-collapsed: 48px; /* was: 50px — 48 = 6×8, cleaner */
  --header-h:     48px;   /* was: 54px — 48 = 6×8 */
  --ctx-h:        40px;   /* was: 38px — 40 = 5×8 */
  --panel-w:      360px;  /* was: 380px — 360 = 45×8 */
}

.sidebar.collapsed { width: var(--sb-w-collapsed) !important; }
```

**Collapsed icon size:** When sidebar collapses to 48px, nav icons must be centered at exactly 48/2 = 24px from left. Currently icons are 18px wide — add:
```css
.sidebar.collapsed .nav-item {
  padding: 8px 0;
  justify-content: center;
}
.sidebar.collapsed .nav-icon {
  width: 48px;
  text-align: center;
}
```

---

### CHANGE 05 — Remove All Sub-10px Text (Accessibility + Legibility)

**Law:** WCAG 2.1 Success Criterion 1.4.4 (Resize Text) and 1.4.12 (Text Spacing). Beyond legal compliance, text below 10px is physically unresolvable on non-Retina displays at normal viewing distance (50–70cm), making it decorative noise rather than information.

**Find and eliminate every instance:**
```css
/* DELETE OR RAISE EVERY INSTANCE OF: */
font-size: 7px;    /* → 10px */
font-size: 7.5px;  /* → 10px */
font-size: 8px;    /* → 10px */
font-size: 8.5px;  /* → 10px */
font-size: 9px;    /* → 10px */
font-size: 9.5px;  /* → 13px (it's already near-sm, round up) */
```

**For SVG chart labels** (which currently use `fontSize="3.2"`, `fontSize="3.4"` etc. in SVG coordinate space):
```
SVG fontSize="3.2" in a viewBox="0 0 100 170" rendered at 340px wide
= 3.2 * (340/100) = 10.88px actual — borderline acceptable

SVG fontSize="3.4" at same scale = 11.56px — acceptable

But viewBox="0 0 100 170" at 200px wide:
fontSize="3.2" = 6.4px — INACCESSIBLE
```
All SVG charts must be refactored to use `viewBox="0 0 600 [height]"` with absolute pixel font sizes ≥10 specified directly, not scaled through tiny viewBoxes. Alternatively, render chart text as HTML overlays positioned absolutely over the SVG canvas.

---

## Phase 2 — Cognitive Architecture
### Component-level changes · Estimated effort: 2 sprints · Impact: transformational UX

---

### CHANGE 06 — Merge Context Bar + Insight Chips into Single Smart Bar

**Law:** Hick's Law — the more options visible simultaneously, the longer decision time. Miller's Law — working memory holds 3–5 items. Two stacked filter bars present 10–15 filter options + 4–6 AI insight chips = 15–21 simultaneous items above the fold, overwhelming both laws simultaneously.

**Current structure (two bars = 76px of chrome):**
```
[Topbar 54px]
[Context Bar 38px] ← global filters
[Insight Chips ~40px] ← AI findings
[Content begins ~132px down]
```

**Target structure (one bar = 40px, content at 88px):**
```
[Topbar 48px]
[Smart Bar 40px] ← filters left, AI badge right
[Content begins 88px down] ← 44px reclaimed
```

**Smart Bar HTML structure:**
```jsx
function SmartBar() {
  const [insightExpanded, setInsightExpanded] = useState(false);
  const { filters, insights, clearFilter } = useDash();

  return (
    <div className="smart-bar">
      {/* Left: Active filter pills */}
      <div className="smart-bar-filters">
        <span className="smart-bar-label">Filters</span>
        {filters.length === 0 && (
          <span className="smart-bar-empty">All data · Mar 2025 – Feb 2026</span>
        )}
        {filters.map(f => (
          <button key={f.id} className="filter-pill btn btn-pill">
            {f.label}
            <span onClick={() => clearFilter(f.id)}>×</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="smart-bar-divider" />

      {/* Right: AI insight badge — collapsed by default */}
      <button
        className={`insight-badge btn btn-pill ${insightExpanded ? 'active' : ''}`}
        onClick={() => setInsightExpanded(v => !v)}
      >
        ✦ {insights.length} AI insights
      </button>
    </div>
  );
}
```

**Smart Bar CSS:**
```css
.smart-bar {
  height: var(--ctx-h);       /* 40px */
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line);
  background: var(--bg2);
  z-index: 25;
  flex-shrink: 0;
  overflow: hidden;           /* no horizontal scroll — pills truncate gracefully */
}
.smart-bar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}
.smart-bar-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--ink4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
  flex-shrink: 0;
}
.smart-bar-empty {
  font-size: var(--text-xs);
  color: var(--ink4);
  font-family: var(--font-mono);
}
.smart-bar-divider {
  width: 1px;
  height: 16px;
  background: var(--line);
  flex-shrink: 0;
}
.filter-pill {
  /* extends .btn.btn-pill */
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 160px;
  overflow: hidden;
}
.filter-pill span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.insight-badge {
  flex-shrink: 0;
  color: var(--pri-lt);
  background: var(--pri-dim);
  border-color: rgba(232,38,90,0.22);
}
.insight-badge.active {
  background: var(--pri-glow);
  border-color: var(--pri);
}
```

**Insight expansion behavior:**
When `insightExpanded` is true, render a floating dropdown below the insight badge (not a full bar), positioned absolutely below the Smart Bar right edge:
```css
.insight-dropdown {
  position: absolute;
  top: calc(var(--header-h) + var(--ctx-h));
  right: 24px;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  z-index: 50;
  padding: 8px;
}
```

**Delete:** The entire `<InsightChips/>` component and its CSS block (`.insight-bar`, `.insight-chip`, all related styles).

---

### CHANGE 07 — Implement Tiered KPI Cards with Golden Ratio Size Hierarchy

**Law:** Pre-attentive processing — the brain processes size differences greater than 2× automatically, before conscious thought. The Golden Ratio (φ = 1.618) produces the most visually "resolved" relative size relationship — neither too similar (invisible hierarchy) nor too different (jarring contrast).

**Mathematical design:**
- Hero card width = φ × secondary card width
- Hero value font = 34px (`--text-2xl`)
- Secondary value font = 26px (`--text-xl`) — ratio: 34/26 = 1.31 ≈ φ/1.25
- Tertiary value font = 21px (`--text-lg`) — ratio: 26/21 = 1.24 ≈ φ/1.3
- Hero card is 1.618× wider than peer cards in the same grid

**Grid structure:**
```css
/* KPI layout — hero takes φ share of width */
.kpi-grid-tier1 {
  display: grid;
  grid-template-columns: minmax(0, 1.618fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.kpi-grid-tier2 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 24px;
}
```

**KPI Card component (replace existing metric cards):**
```jsx
function KpiCard({ label, value, delta, deltaPositive, tier = 'secondary', sparkData, onClick }) {
  const isHero = tier === 'hero';
  const isPrimary = tier === 'primary';

  return (
    <div
      className={`kpi-card kpi-card-${tier}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value kpi-value-${tier}`}>{value}</div>
      {delta && (
        <div className={`kpi-delta ${deltaPositive ? 'positive' : 'negative'}`}>
          {deltaPositive ? '↑' : '↓'} {delta}
        </div>
      )}
      {isHero && sparkData && (
        <div className="kpi-sparkline">
          <Sparkline data={sparkData} color="var(--pri)" height={32} />
        </div>
      )}
      {isPrimary && (
        <div className="kpi-bar">
          <div className="kpi-bar-fill" style={{ width: `${value}%` }} />
        </div>
      )}
    </div>
  );
}
```

**KPI Card CSS:**
```css
.kpi-card {
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);  /* 12px */
  padding: 16px;
  cursor: pointer;
  transition: all 0.12s var(--ease-out);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi-card:hover {
  border-color: rgba(232,38,90,0.22);
  background: var(--pri-dim);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.kpi-card:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}

/* Hero tier — the anchor */
.kpi-card-hero {
  background: var(--bg2);
  border-color: var(--line);
  padding: 20px 24px;
  gap: 8px;
}
.kpi-value-hero {
  font-size: var(--text-2xl);   /* 34px */
  font-weight: var(--weight-medium);
  color: var(--ink);
  font-family: var(--font-sans);
  letter-spacing: -0.02em;
  line-height: 1;
}

/* Primary tier */
.kpi-card-primary {
  padding: 16px;
}
.kpi-value-primary {
  font-size: var(--text-xl);    /* 26px */
  font-weight: var(--weight-medium);
  color: var(--ink);
  font-family: var(--font-sans);
  letter-spacing: -0.01em;
  line-height: 1;
}

/* Secondary tier */
.kpi-card-secondary {
  padding: 12px 16px;
}
.kpi-value-secondary {
  font-size: var(--text-lg);    /* 21px */
  font-weight: var(--weight-medium);
  color: var(--ink);
  font-family: var(--font-sans);
  line-height: 1;
}

/* Shared sub-elements */
.kpi-label {
  font-size: var(--text-xs);     /* 10px */
  font-weight: var(--weight-medium);
  color: var(--ink4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--font-mono);
  margin-bottom: 2px;
}
.kpi-delta {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  margin-top: 4px;
}
.kpi-delta.positive { color: var(--suc-lt); }
.kpi-delta.negative { color: var(--dan-lt); }
.kpi-bar {
  height: 3px;
  background: var(--line);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}
.kpi-bar-fill {
  height: 100%;
  background: var(--pri);
  border-radius: 2px;
  transition: width 0.6s var(--ease-out);
}
.kpi-sparkline {
  margin-top: 8px;
}
```

**Usage in SectionExecutive:**
```jsx
<div className="kpi-grid-tier1">
  <KpiCard
    tier="hero"
    label="AI-Created Frames"
    value={M.created.toLocaleString()}
    delta="23.4% vs prior period"
    deltaPositive={true}
    sparkData={monthlyTrend}
    onClick={() => scrollToSection('trends')}
  />
  <KpiCard
    tier="primary"
    label="Total Uploaded"
    value={M.uploaded.toLocaleString()}
    delta="flat"
  />
  <KpiCard
    tier="primary"
    label="Published"
    value={M.published}
    delta={`${M.publishRate}% rate`}
    deltaPositive={false}
  />
</div>
<div className="kpi-grid-tier2">
  <KpiCard tier="secondary" label="Active Channels" value={M.activeChannels} />
  <KpiCard tier="secondary" label="Avg Quality" value="7.4" />
  <KpiCard tier="secondary" label="Zero-output Days" value="4" />
  <KpiCard tier="secondary" label="Top Channel" value="YouTube" />
</div>
```

---

### CHANGE 08 — Add Section-Level Progressive Disclosure

**Law:** Miller's Law — working memory capacity is ~4±1 items. Rendering all 5 sections simultaneously (Executive, Trends, Multi-Dim, Funnel, Explorer) forces the brain to process content it hasn't requested. Initial DOM render with ~5,000 nodes also delays time-to-interactive significantly.

**Target behavior:** Sections render as collapsed cards with a summary headline + mini visualization. User explicitly expands what they need. The active section (from sidebar nav click) auto-expands.

**SectionShell wrapper component:**
```jsx
function SectionShell({ id, title, icon, summary, badge, defaultExpanded = false, children }) {
  const { activeSection } = useDash();
  const isActive = activeSection === id;
  const [expanded, setExpanded] = useState(defaultExpanded || isActive);

  // Auto-expand when navigated to
  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div
      className={`section-shell ${expanded ? 'expanded' : 'collapsed'} ${isActive ? 'active' : ''}`}
      data-section={id}
    >
      <button
        className="section-shell-header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span className="section-shell-icon">{icon}</span>
        <div className="section-shell-meta">
          <span className="section-shell-title">{title}</span>
          {!expanded && <span className="section-shell-summary">{summary}</span>}
        </div>
        {badge && <span className="section-shell-badge">{badge}</span>}
        <span className="section-shell-chevron">{expanded ? '⌃' : '⌄'}</span>
      </button>

      {expanded && (
        <div className="section-shell-body fade-up">
          {children}
        </div>
      )}
    </div>
  );
}
```

**SectionShell CSS:**
```css
.section-shell {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--bg2);
  margin-bottom: 16px;
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.section-shell.active {
  border-color: rgba(232,38,90,0.2);
  box-shadow: 0 0 0 1px rgba(232,38,90,0.08);
}
.section-shell-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.section-shell-header:hover { background: var(--bg3); }
.section-shell-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.7;
}
.section-shell-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.section-shell-title {
  font-size: var(--text-base);    /* 16px */
  font-weight: var(--weight-medium);
  color: var(--ink);
  letter-spacing: -0.01em;
}
.section-shell-summary {
  font-size: var(--text-xs);      /* 10px */
  color: var(--ink4);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.section-shell-badge {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--pri-dim);
  border: 1px solid rgba(232,38,90,0.2);
  color: var(--pri-lt);
  flex-shrink: 0;
}
.section-shell-chevron {
  font-size: 12px;
  color: var(--ink4);
  flex-shrink: 0;
  transition: transform 0.15s;
}
.section-shell.expanded .section-shell-chevron { transform: none; }
.section-shell-body {
  padding: 0 20px 20px;
  border-top: 1px solid var(--line-lt);
}
```

**Usage:**
```jsx
/* In the main content area, replace current section blocks with: */
<SectionShell
  id="executive"
  title="Executive Overview"
  icon="◈"
  summary={`${M.created.toLocaleString()} AI frames · ${M.publishRate}% pub rate · ${M.activeChannels} channels`}
  defaultExpanded={true}
>
  <SectionExecutive addToast={addToast} theme={theme} />
</SectionShell>

<SectionShell
  id="trends"
  title="Performance Trends"
  icon="⌇"
  summary="12-month upload vs publish trajectory"
  badge="YoY +23%"
>
  <SectionTrends theme={theme} />
</SectionShell>

<SectionShell
  id="multidim"
  title="Multi-Dimensional Analysis"
  icon="⬡"
  summary="Channel × content type breakdown"
>
  <SectionMultiDim theme={theme} />
</SectionShell>

<SectionShell
  id="funnel"
  title="Content Funnel"
  icon="▽"
  summary="Upload → Create → Publish conversion"
>
  <SectionFunnel theme={theme} />
</SectionShell>

<SectionShell
  id="explorer"
  title="Explorer"
  icon="⊞"
  summary="Filterable channel × content data table"
>
  <SectionExplorer theme={theme} />
</SectionShell>
```

---

### CHANGE 09 — Remove Workspace Items from Sidebar; Promote Command Palette

**Law:** Hick's Law — each additional navigation item logarithmically increases decision time. The 5 Workspace items in the sidebar (Saved Views, Explain, Evidence, Compare, Copilot) are exact duplicates of the 5 right panel tabs. Duplication creates choice conflict, not convenience.

**Delete from sidebar JSX:**
```jsx
/* DELETE THIS ENTIRE BLOCK from sidebar rendering: */
<div style={{marginTop:8}}>
  <div className="nav-grp">Workspace</div>
  {[
    {icon:'⊞', label:'Saved Views', tab:'views'},
    {icon:'◎', label:'Explain', tab:'explain'},
    {icon:'⚑', label:'Evidence', tab:'evidence'},
    {icon:'⇔', label:'Compare', tab:'compare'},
    {icon:'✦', label:'Copilot', tab:'copilot'},
  ].map(t=>( ... ))}
</div>
```

**Add to command palette results:** Expand the `CMD_ACTIONS` array to include workspace tools as a dedicated category:
```jsx
const CMD_ACTIONS = [
  // ... existing navigation items ...

  // Add new category:
  { type: 'workspace', icon: '⊞', label: 'Saved Views', desc: 'Load a saved filter configuration', action: () => openPanel('views') },
  { type: 'workspace', icon: '◎', label: 'Explain this section', desc: 'AI explanation of current view', action: () => openPanel('explain') },
  { type: 'workspace', icon: '⚑', label: 'Evidence board', desc: 'Pinned findings and anomalies', action: () => openPanel('evidence') },
  { type: 'workspace', icon: '⇔', label: 'Compare mode', desc: 'Compare two channels or periods', action: () => openPanel('compare') },
  { type: 'workspace', icon: '✦', label: 'Open Copilot', desc: 'AI assistant for data questions', action: () => openPanel('copilot') },
];
```

**Add keyboard shortcut hints in command palette results:**
```jsx
/* For workspace items, show shortcut hint in the result row */
const WORKSPACE_SHORTCUTS = {
  'copilot': '⌘⌥C',
  'evidence': '⌘⌥E',
  'compare': '⌘⌥X',
  'views': '⌘⌥V',
};
```

**Update the sidebar nav "Pages" section** — add a visual hint that workspace tools live in command palette:
```jsx
/* After the Pages nav items, add: */
<div className="sb-cmd-hint">
  <span className="sb-cmd-hint-icon">⌕</span>
  <span className="sb-cmd-hint-text">Workspace tools in ⌘K</span>
</div>
```
```css
.sb-cmd-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: var(--text-xs);
  color: var(--ink4);
  font-family: var(--font-mono);
  cursor: pointer;
  transition: color 0.1s;
}
.sb-cmd-hint:hover { color: var(--ink3); }
.sidebar.collapsed .sb-cmd-hint { display: none; }
```

---

### CHANGE 10 — Data-Ink Ratio Pass on All Charts (Tufte Principles)

**Law:** Edward Tufte's Data-Ink Ratio — "above all else, show the data." Every non-data pixel should be eliminated unless it actively aids comprehension. Cognitive load theory: extraneous load from decorative chart elements directly competes with intrinsic load from data comprehension.

**Remove from every chart:**

```
✗ Chart outer container borders (the card border is enough)
✗ Heavy 1px axis lines (replace with 0.3px or remove entirely)
✗ Axis box borders (the tick marks are enough)
✗ Colored area fills under line charts (unless showing range/uncertainty)
✗ Chart background fills (always transparent)
✗ Redundant axis tick labels (label every nth tick, not every tick)
✗ Grid lines at every data point (use major grid lines only, 4–5 per axis)
✗ Duplicate legend + axis labels (pick one)
```

**Apply to SVG charts:**
```jsx
/* Replace ALL instances of: */
stroke="var(--chart-grid)" strokeWidth="0.5"

/* With */
stroke="var(--chart-grid)" strokeWidth="0.3"

/* Replace ALL instances of chart area fills with reduced opacity: */
// Was: fill={`url(#ag-${ki})`}
// Now: fill={colors[ki]} fillOpacity={0.06}  ← subtle hint, not dominant fill

/* Grid line frequency — only show 4 horizontal grid lines (0%, 25%, 50%, 75%): */
const yGridLines = [0, 0.25, 0.5, 0.75];  // not 0, 0.1, 0.2, ..., 1.0

/* Remove axis line (just the tick marks): */
// DELETE: <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H-PAD.b} stroke="var(--ink4)" />
```

**Sankey diagram specific:**
```css
/* Remove the background fill from Sankey nodes */
/* Current: fill="var(--sankey-bg)" on all node rects */
/* Change to: fill="var(--bg3)" with opacity 0.6 */

/* Reduce link opacity for cleaner flow reading */
/* Current: opacity varies 0.3–0.5 */
/* Target: 0.2 for inactive, 0.5 for hovered — more dramatic contrast */
```

**KPI tree specific:**
```css
/* Reduce connector stroke width from current ~1px to 0.5px */
/* Reduce node circle size by 20% (currently too dominant vs the label) */
/* Remove node circle fills for leaf nodes — outline only */
```

---

## Phase 3 — Power Features & Structural Upgrades
### Architecture-level changes · Estimated effort: 3+ sprints

---

### CHANGE 11 — Introduce 12-Column CSS Grid Layout System

**Law:** Mathematical divisibility — 12 columns divides into 1, 2, 3, 4, 6, and 12 equal parts, enabling every common layout ratio including φ-adjacent proportions (5/7 ≈ 0.714 ≈ 1/φ²). This gives designers infinite proportional flexibility from a single mathematical foundation.

**Add to `:root` and `.content`:**
```css
:root {
  --grid-cols:   12;
  --grid-gutter: 24px;   /* 3×8pt */
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
  gap: var(--grid-gutter);
  padding: 24px;
}

/* Column span utilities */
.col-1  { grid-column: span 1; }
.col-2  { grid-column: span 2; }
.col-3  { grid-column: span 3; }
.col-4  { grid-column: span 4; }
.col-5  { grid-column: span 5; }
.col-6  { grid-column: span 6; }
.col-7  { grid-column: span 7; }
.col-8  { grid-column: span 8; }
.col-9  { grid-column: span 9; }
.col-10 { grid-column: span 10; }
.col-11 { grid-column: span 11; }
.col-12 { grid-column: span 12; }
```

**Standard layout recipes:**

| Layout | Columns | Ratio |
|--------|---------|-------|
| Hero KPI + 2 supporting | 5 + 3.5 + 3.5 | φ-adjacent |
| Chart + sidebar stat | 8 + 4 | 2:1 |
| Chart + chart | 6 + 6 | 1:1 |
| Wide table | 12 | full width |
| 4 mini KPIs | 3 + 3 + 3 + 3 | equal |
| Trend + donut | 7 + 5 | φ-adjacent |

**Apply in SectionExecutive:**
```jsx
<div className="content-grid">
  {/* Tier 1 KPIs */}
  <div className="col-5"><KpiCard tier="hero" .../></div>
  <div className="col-4"><KpiCard tier="primary" .../></div>
  <div className="col-3"><KpiCard tier="primary" .../></div>

  {/* Main chart */}
  <div className="col-8"><LineChart .../></div>
  <div className="col-4">
    <div className="content-grid" style={{padding:0}}>
      <div className="col-6"><KpiCard tier="secondary" .../></div>
      <div className="col-6"><KpiCard tier="secondary" .../></div>
      <div className="col-6"><KpiCard tier="secondary" .../></div>
      <div className="col-6"><KpiCard tier="secondary" .../></div>
    </div>
  </div>

  {/* Callouts */}
  <div className="col-12"><CalloutRow .../></div>
</div>
```

---

### CHANGE 12 — Add Role-Based Dashboard View Presets

**Law:** Cognitive load theory — relevance filtering. Extraneous load is the mental effort spent processing information irrelevant to the user's goal. A channel manager doesn't need the KPI tree; an executive doesn't need the data explorer table. Showing everything to everyone is not power — it's noise.

**View preset definitions:**
```jsx
const ROLE_PRESETS = {
  operator: {
    label: 'Operator',
    icon: '◉',
    desc: 'Channel health, publish rate, anomalies',
    sections: ['executive'],       // only executive section, expanded
    kpiTier1: 'channels',          // hero = channel count / health
    hideSections: ['multidim', 'funnel', 'explorer'],
    defaultPanel: null,
  },
  executive: {
    label: 'Executive',
    icon: '◈',
    desc: 'High-level KPIs and trend overview',
    sections: ['executive', 'trends'],
    kpiTier1: 'created',           // hero = AI-created frames
    hideSections: ['multidim', 'funnel', 'explorer'],
    defaultPanel: null,
  },
  analyst: {
    label: 'Analyst',
    icon: '⬡',
    desc: 'Full multi-dimensional access',
    sections: ['executive', 'trends', 'multidim', 'funnel', 'explorer'],
    kpiTier1: 'created',
    hideSections: [],
    defaultPanel: null,
  },
};
```

**Role switcher UI** — add to topbar right area, before the theme toggle:
```jsx
function RoleSwitcher({ role, setRole }) {
  return (
    <div className="role-switcher">
      {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
        <button
          key={key}
          className={`role-btn ${role === key ? 'active' : ''}`}
          onClick={() => setRole(key)}
          title={preset.desc}
        >
          {preset.icon} {preset.label}
        </button>
      ))}
    </div>
  );
}
```

```css
.role-switcher {
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
}
.role-btn {
  padding: 0 12px;
  height: 32px;
  border: none;
  border-right: 1px solid var(--line);
  background: var(--bg3);
  color: var(--ink4);
  font-size: var(--text-xs);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.1s;
  white-space: nowrap;
}
.role-btn:last-child { border-right: none; }
.role-btn:hover { background: var(--bg4); color: var(--ink2); }
.role-btn.active { background: var(--pri-dim); color: var(--pri-lt); }
```

**Add to saved views system** — preset views should appear as the first 3 items in the Saved Views panel, clearly labeled as "System Presets" vs user-created views.

---

### CHANGE 13 — Fitts's Law Optimization for Primary CTAs

**Law:** Fitts's Law — T = a + b × log₂(2D/W), where T = time to acquire target, D = distance to target, W = target width. Doubling target size reduces acquisition time logarithmically. Current primary buttons are 28–32px tall — below the Apple HIG (44px) and WCAG 2.5.5 minimum for touch/click targets.

**Minimum sizes:**
```css
:root {
  --btn-height-sm:  24px;   /* table toolbar, tight contexts */
  --btn-height-md:  32px;   /* standard UI buttons */
  --btn-height-lg:  44px;   /* primary CTAs — Fitts's Law minimum */
}
```

**Specific upgrades:**

```css
/* Command palette trigger in sidebar — increase height */
.sb-search-btn {
  height: 40px;             /* was: ~30px with 7px padding */
  padding: 0 12px;
}

/* Panel open/close button */
.panel-btn {
  height: 32px;             /* upgrade from ~28px */
  padding: 0 16px;
}

/* Investigate button — CRITICAL PATH ACTION */
.btn-danger {
  height: 40px;             /* was: ~28px — this triggers deep analysis */
  padding: 0 20px;
}

/* Copilot send button */
.chat-send {
  width: 44px;              /* was: 34px */
  height: 44px;             /* was: 34px */
}

/* Theme toggle — too small to click reliably */
.theme-toggle {
  width: 44px;              /* was: 28px */
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

### CHANGE 14 — Floating Copilot Action Button

**Law:** Proximity and click-depth economics. Currently, accessing Copilot requires: sidebar → Workspace nav group → Copilot → opens right panel → Copilot tab = 3 clicks + visual search. A floating action button (FAB) reduces this to 1 click from anywhere in the dashboard.

**Copilot FAB component:**
```jsx
function CopilotFAB({ onOpen, isOpen }) {
  return (
    <button
      className={`copilot-fab ${isOpen ? 'active' : ''}`}
      onClick={onOpen}
      title="Open Copilot (⌘⌥C)"
      aria-label="Open AI Copilot"
    >
      <span className="copilot-fab-icon">✦</span>
      {!isOpen && <span className="copilot-fab-label">Copilot</span>}
    </button>
  );
}
```

```css
.copilot-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  height: 48px;
  padding: 0 20px;
  border-radius: 24px;             /* pill */
  background: var(--pri);
  border: none;
  color: #fff;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  font-family: var(--font-sans);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 4000;
  box-shadow: 0 4px 16px rgba(232,38,90,0.35), 0 1px 4px rgba(0,0,0,0.2);
  transition: all 0.15s var(--ease-spring);
}
.copilot-fab:hover {
  background: var(--pri-lt);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(232,38,90,0.4), 0 2px 8px rgba(0,0,0,0.2);
}
.copilot-fab:active {
  transform: translateY(0);
}
.copilot-fab.active {
  background: var(--bg2);
  color: var(--pri-lt);
  border: 1px solid var(--pri);
  box-shadow: none;
  padding: 0 16px;
}
.copilot-fab-icon { font-size: 16px; }
.copilot-fab-label { white-space: nowrap; }

/* Move FAB left when panel is open */
.rp-shell.open ~ .copilot-fab {
  right: calc(var(--panel-w) + 24px);
  transition: right 0.24s var(--ease-out), all 0.15s var(--ease-spring);
}
```

**Note:** When the right panel is open, the FAB must shift left so it doesn't overlap the panel. The CSS sibling selector above handles this if the DOM structure places `.rp-shell` before `.copilot-fab` in the tree.

---

### CHANGE 15 — Full Keyboard Navigation System

**Law:** Accessibility is performance for power users. Keyboard-first users (analysts, operators, data professionals) are the highest-value segment. Complete keyboard navigation reduces task completion time by 40–60% vs mouse-only.

**Add to App state:**
```jsx
const [focusedSection, setFocusedSection] = useState(null);
const [focusedKpi, setFocusedKpi] = useState(null);
```

**Global keyboard handler additions to existing `useEffect`:**
```jsx
useEffect(() => {
  function onKey(e) {
    // Existing ⌘K handler — keep
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdOpen(v => !v);
    }

    // NEW: ⌘⌥C — open Copilot directly
    if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'c') {
      e.preventDefault();
      openPanel('copilot');
    }

    // NEW: ⌘⌥E — open Evidence
    if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'e') {
      e.preventDefault();
      openPanel('evidence');
    }

    // NEW: ⌘⌥V — open Saved Views
    if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'v') {
      e.preventDefault();
      openPanel('views');
    }

    // NEW: [ and ] — cycle sections
    if (e.key === '[' && !e.metaKey && !cmdOpen) {
      e.preventDefault();
      const idx = ALL_SECTIONS.findIndex(s => s.k === activeSection);
      const prev = ALL_SECTIONS[Math.max(0, idx - 1)];
      scrollToSection(prev.k);
    }
    if (e.key === ']' && !e.metaKey && !cmdOpen) {
      e.preventDefault();
      const idx = ALL_SECTIONS.findIndex(s => s.k === activeSection);
      const next = ALL_SECTIONS[Math.min(ALL_SECTIONS.length - 1, idx + 1)];
      scrollToSection(next.k);
    }

    // NEW: Escape — close any open overlay in priority order
    if (e.key === 'Escape') {
      if (cmdOpen) { setCmdOpen(false); return; }
      if (highlightSection) { exitHighlight(); return; }
      if (panelOpen) { setPanelOpen(false); return; }
    }
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [cmdOpen, activeSection, highlightSection, panelOpen]);
```

**Focus ring CSS — add globally:**
```css
/* Visible focus rings for all interactive elements */
*:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
  border-radius: 3px;
}

/* Suppress focus ring on mouse click (only show on keyboard) */
*:focus:not(:focus-visible) {
  outline: none;
}

/* Larger offset for card-level focus */
.kpi-card:focus-visible,
.section-shell:focus-visible,
.sv-item:focus-visible {
  outline-offset: 3px;
}
```

---

## Additional Micro-Changes (Apply Throughout)

These small changes collectively make a measurable perceptual difference:

### Typography cleanup
```css
/* Remove font-family: var(--font-mono) from these elements — use sans */
.nav-grp          { font-family: var(--font-sans); }  /* was mono */
.rp-tab-label     { font-family: var(--font-sans); }  /* was sans — keep */
.gf-label         { font-family: var(--font-sans); }  /* was mono */
.filter-group-label { font-family: var(--font-sans); }
.section-shell-summary { font-family: var(--font-mono); }  /* keep — it's meta data */

/* Monospace is ONLY for: numbers, code, timestamps, keyboard shortcuts */
```

### Line-height standardization
```css
/* All body text */
body { line-height: 1.6; }       /* was: 1.5 — slightly more breathing room */

/* Dense data */
.data-table td { line-height: 1.4; }

/* Display numbers */
.kpi-value-hero   { line-height: 1; }
.kpi-value-primary { line-height: 1; }
```

### Border radius rationalization
```css
:root {
  --radius-xs:  2px;   /* tags, chips internal */
  --radius-sm:  4px;   /* badges, small pills */
  --radius:     8px;   /* buttons, inputs, standard cards */
  --radius-lg: 12px;   /* content cards, panels */
  --radius-xl: 16px;   /* modal dialogs, command palette */
  /* DELETE: --radius-xs: 3px, --radius-sm: 5px — not on 4px grid */
}
```

### Transition standardization
```css
/* All transitions must be one of three values — no custom ms */
:root {
  --transition-fast:   0.1s var(--ease-out);   /* hover states */
  --transition-mid:    0.2s var(--ease-out);   /* panel open/close, theme */
  --transition-slow:   0.4s var(--ease-out);   /* page transitions, bar fills */
}

/* Replace all ad-hoc transition values */
/* Was: transition: all 0.12s var(--ease-out) → 0.1s */
/* Was: transition: all 0.22s var(--ease-out) → 0.2s */
/* Was: transition: all 0.24s var(--ease-out) → 0.2s */
/* Was: transition: width 0.55s cubic-bezier → 0.4s var(--ease-out) */
```

### Scrollbar aesthetic
```css
/* Thin, minimal scrollbars everywhere */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--line) transparent;
}
*::-webkit-scrollbar { width: 4px; height: 4px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: var(--line); border-radius: 2px; }
*::-webkit-scrollbar-thumb:hover { background: var(--line-lt); }
```

---

## Implementation Order (Critical Path)

```
Day 1–2   → CHANGE 01 (spacing grid) + CHANGE 05 (min font size)
Day 3     → CHANGE 02 (type scale) — highest immediate visual impact
Day 4     → CHANGE 03 (button unification)
Day 5     → CHANGE 04 (sidebar width) + CHANGE 15 micro-changes

Week 2    → CHANGE 06 (Smart Bar merge) — requires JSX + CSS
Week 2    → CHANGE 07 (KPI tier system) — new component
Week 3    → CHANGE 08 (progressive disclosure) — new SectionShell
Week 3    → CHANGE 09 (Workspace → ⌘K)

Week 4    → CHANGE 10 (data-ink pass on charts)
Week 5    → CHANGE 11 (12-column grid)
Week 5–6  → CHANGE 12 (role presets)
Week 6    → CHANGE 13 (Fitts's Law button sizes)
Week 6    → CHANGE 14 (Copilot FAB)
Week 7    → CHANGE 15 (keyboard navigation)
```

---

## What NOT to Change

These v19 elements are already excellent — preserve them exactly:

| Element | Why it works |
|---|---|
| Dark/light theme token system | Well-structured, semantically sound `--pri/suc/warn/dan` system |
| Command palette (⌘K) | Rare in enterprise dashboards; psychologically powerful for power users. Expand it, don't replace it. |
| Highlight mode | Unique differentiator. The section-focus + dim-overlay mechanic. Keep the mechanism, fix the escape animation to a 200ms fade. |
| Brand color system | `#E8265A` primary with `--pri-dim/glow/ring` variants is well-executed. |
| Sankey + D3 tree | Powerful and rare visualizations. Apply data-ink pass only — do not remove. |
| Live pulse dot | The green `●` in sidebar logo is good ambient data — keep it. |
| Breadcrumb system | Well-implemented context indicator. |
| ResizableSidebar | Good progressive disclosure for power users. |
| Toast notifications | Clean implementation with 4 semantic variants. |
| AppUICtx + DashContext | Good architectural separation. Build on it for role presets. |

---

## Psychological Laws Applied (Reference)

| Law | Application in v20 |
|---|---|
| **Hick's Law** | Nav surfaces 5→2, Workspace items moved to ⌘K, options hidden until needed |
| **Miller's Law** | Sections collapsed by default, Smart Bar limits visible filter count to 4 |
| **Fitts's Law** | Primary CTA minimum 44px, Copilot FAB at bottom-right, large click targets |
| **Gestalt Similarity** | Unified button system, consistent monospace usage, color encodes meaning only |
| **Gestalt Proximity** | 8pt grid creates clear element grouping through consistent spacing |
| **Gestalt Symmetry** | 12-column grid produces balanced layouts across the content area |
| **Pre-attentive Processing** | Hero KPI at 34px anchors the eye before conscious reading begins |
| **Cognitive Load Theory** | Progressive disclosure removes extraneous load, Smart Bar reduces visual noise |
| **Golden Ratio (φ)** | KPI card width ratio, type scale steps, sidebar proportions |
| **Fibonacci Sequence** | Type scale (10, 13, 21, 34), spacing tokens (8, 16, 24, 40) |
| **Tufte Data-Ink Ratio** | Chart decoration stripped, grid lines reduced, axis labels thinned |
| **8pt Grid System** | All spacing values are multiples of 4 or 8 — pixel-perfect at all DPI |

---

*Document version: 1.0 | Based on: frammer-dashboard-v19.html audit | Target: v20*
*Total changes: 15 primary + 5 micro | Phases: 3 | Estimated total: 7 weeks*
