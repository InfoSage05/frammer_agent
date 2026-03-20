# Frammer Dashboard — Migration Prompt: v11 → v19

> **Context for Codex:** You are migrating a single-file React+D3+Chart.js dashboard (served via Babel standalone in an HTML file) from version 11 to version 19. The file is self-contained with no build step — all React, Babel, D3, Chart.js, and CSS live inside one HTML file. You will not be given either version of the file; every change is described below in full detail. Apply every change exactly as specified.

---

## 1. Document Title & Fonts

### Title
Change the `<title>` tag from:
```
Frammer AI — Operations Intelligence v6
```
to:
```
Frammer AI — Operations Intelligence v19
```

### Google Fonts
Replace the existing Google Fonts `<link>` (which loads `DM+Serif+Display`, `IBM+Plex+Mono`, and `Instrument+Sans`) with a new link that additionally loads **Plus Jakarta Sans** (weights 400, 500, 600, 700, 800):

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## 2. CSS — Complete Replacement

Replace the entire `<style>` block with two `<style>` blocks. Both blocks together form the complete CSS. The reason for two blocks is that the first is the primary design system and the second is a legacy compatibility block that re-declares some variables to ensure they override correctly in both themes.

### 2a. Primary Design System (`<style>` block 1)

The comment at the top reads:
```css
/* ═══════════════════════════════════════════
   FRAMMER v19 — PREMIUM DESIGN SYSTEM
   Apple calm · Google clarity · AI workspace precision
═══════════════════════════════════════════ */
```

#### Theme Tokens — Dark

The dark theme `[data-theme="dark"]` root variables change completely from gold-based to a **Frammer brand red/rose** system. All surface variables shift to near-black blue-blacks:

```css
:root[data-theme="dark"] {
  --bg:    #07090D;
  --bg2:   #0D1018;
  --bg3:   #121620;
  --bg4:   #181D2A;
  --bg5:   #1E2435;
  --ink:   #F0F2F7;
  --ink2:  #C4CCDC;
  --ink3:  #6E7D96;
  --ink4:  #344054;
  --pri:   #E8265A;
  --pri-lt:#F05580;
  --pri-dim:rgba(232,38,90,0.10);
  --pri-glow:rgba(232,38,90,0.20);
  --suc:   #18A768;
  --suc-lt:#3EC98A;
  --warn:  #D4820A;
  --warn-lt:#F0A030;
  --dan:   #E03030;
  --dan-lt:#F06060;
  --line:  rgba(255,255,255,0.07);
  --line-lt:rgba(255,255,255,0.04);
  --line-xs:rgba(255,255,255,0.025);
  --chart-grid:rgba(255,255,255,0.045);
  --chart-tick:rgba(140,155,175,0.75);
  --sankey-bg:rgba(255,255,255,0.025);
  --tree-line:rgba(255,255,255,0.14);
  --select-bg:#121620;
  --select-border:rgba(255,255,255,0.10);
  --shadow: 0 2px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.6);
  --shadow-xl: 0 20px 60px rgba(0,0,0,0.75);
  --glow: rgba(232,38,90,0.06);
  --glow-md: rgba(232,38,90,0.12);
  --glow-lg: rgba(232,38,90,0.20);
  --glow-ring: 0 0 0 1px var(--pri), 0 0 14px rgba(232,38,90,0.22);
  --gold: #D4820A; --gold-lt: #F0A030; --gold-xs:#FFBA50; --gold-dim:#6A3E05;
  --amber: #D4820A; --amber-lt: #F0A030; --warm:#A86010;
  --red: #E03030; --red-lt: #F06060; --red-dim: #3C1010;
  --green: #18A768; --green-lt: #3EC98A; --green-dim: #0A3020;
  --blue: #2060A8; --blue-lt: #4080D0;
}
```

#### Theme Tokens — Light

```css
:root[data-theme="light"] {
  --bg:    #F5F5F7;
  --bg2:   #FFFFFF;
  --bg3:   #F0F0F4;
  --bg4:   #E8E8EE;
  --bg5:   #DDDDE6;
  --ink:   #0A0A0F;
  --ink2:  #1A1A28;
  --ink3:  #5A5A72;
  --ink4:  #9898AA;
  --pri:   #D42050;
  --pri-lt:#E8265A;
  --pri-dim:rgba(212,32,80,0.07);
  --pri-glow:rgba(212,32,80,0.14);
  --suc:   #128050;
  --suc-lt:#18A868;
  --warn:  #A06010;
  --warn-lt:#C07818;
  --dan:   #B82020;
  --dan-lt:#D03838;
  --line:  rgba(0,0,0,0.08);
  --line-lt:rgba(0,0,0,0.04);
  --line-xs:rgba(0,0,0,0.025);
  --chart-grid:rgba(0,0,0,0.06);
  --chart-tick:rgba(50,60,80,0.65);
  --sankey-bg:rgba(0,0,0,0.025);
  --tree-line:rgba(0,0,0,0.13);
  --select-bg:#F0F0F4;
  --select-border:rgba(0,0,0,0.10);
  --shadow: 0 1px 4px rgba(0,0,0,0.07), 0 2px 10px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  --shadow-xl: 0 12px 48px rgba(0,0,0,0.16);
  --glow: rgba(212,32,80,0.05);
  --glow-md: rgba(212,32,80,0.09);
  --glow-lg: rgba(212,32,80,0.14);
  --glow-ring: 0 0 0 1px var(--pri), 0 0 10px rgba(212,32,80,0.16);
  --gold: #A06010; --gold-lt: #C07818; --gold-xs:#D99030; --gold-dim:#E8CC90;
  --amber: #A06010; --amber-lt: #C07818; --warm:#784810;
  --red: #B82020; --red-lt: #D03838; --red-dim: #FFE8E8;
  --green: #128050; --green-lt: #18A868; --green-dim: #D8F5EC;
  --blue: #2060A8; --blue-lt: #4080D0;
}
```

#### Root Variables

The `:root` block is expanded with new variables:

```css
:root {
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --header-h: 54px;
  --ctx-h: 38px;
  --sb-w: 216px;
  --panel-w: 380px;
  --font-sans: 'Plus Jakarta Sans', 'Instrument Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Cascadia Code', monospace;
  --font-serif: 'DM Serif Display', Georgia, serif;
  --ease-out: cubic-bezier(.2,0,.3,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
}
```

#### New CSS Classes — Primary Block

The following CSS classes are **new** in v19 and must be added (they don't exist in v11):

**Sidebar brand strip:** The sidebar gets a brand accent strip on its left edge:
```css
.sidebar::after {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, #E8265A 0%, rgba(232,38,90,0.3) 60%, transparent 100%);
  pointer-events: none; z-index: 2;
}
```

**Live dot in logo:**
```css
.logo-live-dot {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  width: 6px; height: 6px; border-radius: 50%; background: #3EC98A;
  box-shadow: 0 0 0 3px rgba(62,201,138,0.2); animation: livePulse 2.4s ease-in-out infinite;
}
@keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 0 3px rgba(62,201,138,0.2)} 50%{opacity:0.7;box-shadow:0 0 0 5px rgba(62,201,138,0.08)} }
```

Also add to sidebar collapsed state: `.sidebar.collapsed .logo-live-dot { display: none; }`

**Sidebar search button:**
```css
.sb-search-btn {
  margin: 10px 12px 4px; padding: 7px 10px;
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--line); border-radius: var(--radius);
  background: var(--bg3); cursor: pointer; transition: all 0.12s var(--ease-out); overflow: hidden;
}
.sb-search-btn:hover { border-color: var(--pri); background: var(--pri-dim); }
.sb-search-icon { font-size: 11px; color: var(--ink4); flex-shrink: 0; }
.sb-search-label { font-size: 11px; color: var(--ink4); flex: 1; white-space: nowrap; overflow: hidden; }
.sb-search-kbd { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); background: var(--bg4); border: 1px solid var(--line); border-radius: 3px; padding: 1px 4px; flex-shrink: 0; }
```

**Nav label flex:**
```css
.nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
```

**Nav item active — pill style instead of border-left:**
```css
.nav-item.active {
  color: var(--ink); background: var(--pri-dim); font-weight: 600;
}
.nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 2.5px; background: var(--pri); border-radius: 0 2px 2px 0;
  transform: scaleY(1); transition: transform 0.15s var(--ease-spring);
}
```
The `border-left` approach from v11 is replaced. The nav item itself needs `position: relative`.

**Topbar brand accent bottom line:**
```css
.topbar::after {
  content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 1px;
  background: linear-gradient(90deg, rgba(232,38,90,0.4) 0%, transparent 50%);
  pointer-events: none;
}
```

**Topbar layout groups:**
```css
.topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.topbar-right { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
```

**Breadcrumb:**
```css
.breadcrumb {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 9px; color: var(--ink4);
  letter-spacing: 0.02em; flex-wrap: nowrap; overflow: hidden;
}
.breadcrumb-sep { opacity: 0.3; font-size: 10px; }
.breadcrumb-item { color: var(--ink3); white-space: nowrap; }
.breadcrumb-item.active { color: var(--pri-lt); }
```

**Context Rail (`.ctx-bar`) — replaces old filter bar:**
```css
.ctx-bar {
  display: flex; align-items: center; gap: 5px;
  padding: 0 20px 0 24px; height: var(--ctx-h); min-height: var(--ctx-h);
  border-bottom: 1px solid var(--line); background: var(--bg2);
  flex-shrink: 0; overflow-x: auto; overflow-y: hidden; z-index: 25;
}
.ctx-bar::-webkit-scrollbar { height: 2px; }
.ctx-bar::-webkit-scrollbar-thumb { background: var(--line); }
.ctx-label { font-family: var(--font-mono); font-size: 7.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink4); white-space: nowrap; flex-shrink: 0; }
.ctx-divider { width: 1px; height: 14px; background: var(--line); flex-shrink: 0; margin: 0 2px; }
.ctx-spacer { flex: 1; }
.ctx-hint { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); opacity: 0.4; white-space: nowrap; }
.ctx-reset {
  font-family: var(--font-mono); font-size: 8px; padding: 2px 8px;
  border: 1px solid var(--line); border-radius: var(--radius-sm); background: transparent;
  color: var(--ink4); cursor: pointer; transition: all 0.1s; white-space: nowrap; flex-shrink: 0;
}
.ctx-reset:hover { border-color: var(--dan-lt); color: var(--dan-lt); }
```

**Mode Pills:**
```css
.mode-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 20px;
  font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.05em;
  white-space: nowrap; flex-shrink: 0; cursor: pointer; transition: all 0.12s;
  border: 1px solid transparent;
}
.mode-pill.story  { background: rgba(24,167,104,0.09); border-color: rgba(24,167,104,0.25); color: var(--suc-lt); }
.mode-pill.invest { background: rgba(224,48,48,0.09);  border-color: rgba(224,48,48,0.25); color: var(--dan-lt); }
.mode-pill.compare{ background: rgba(232,38,90,0.09); border-color: rgba(232,38,90,0.25); color: var(--pri-lt); }
.mode-pill:hover { filter: brightness(1.15); }
.mode-pill-x { opacity: 0.5; margin-left: 3px; font-size: 9px; }
.mode-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: pulse 1.8s ease-in-out infinite; }
```

**Filter Chips (`.f-chip`):**
```css
.f-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px 2px 7px; border-radius: var(--radius-sm);
  background: var(--pri-dim); border: 1px solid rgba(232,38,90,0.22);
  color: var(--pri-lt); font-family: var(--font-mono);
  font-size: 8px; cursor: pointer; transition: all 0.1s; white-space: nowrap; flex-shrink: 0;
}
.f-chip:hover { background: var(--pri-glow); }
.f-chip-x { opacity: 0.5; font-size: 9px; margin-left: 2px; }
```

**Insight Toggle:**
```css
.insight-toggle {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px;
  border: 1px solid var(--line); border-radius: var(--radius-sm); background: transparent;
  cursor: pointer; font-family: var(--font-mono); font-size: 7.5px;
  color: var(--ink4); letter-spacing: 0.08em; text-transform: uppercase;
  transition: all 0.1s; white-space: nowrap; flex-shrink: 0;
}
.insight-toggle:hover { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.insight-toggle.active { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.insight-toggle-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--pri); animation: pulse 2s ease-in-out infinite; }
```

**Insight Bar:**
```css
.insight-bar {
  display: none; background: rgba(232,38,90,0.04); border-bottom: 1px solid rgba(232,38,90,0.12);
  padding: 5px 20px; align-items: center; gap: 7px; flex-wrap: wrap; flex-shrink: 0;
}
.insight-bar.visible { display: flex; }
.insight-item {
  display: flex; align-items: center; gap: 5px; padding: 3px 9px;
  border-radius: var(--radius-sm); background: rgba(232,38,90,0.07);
  border: 1px solid rgba(232,38,90,0.16); cursor: pointer; transition: all 0.10s;
}
.insight-item:hover { background: rgba(232,38,90,0.12); border-color: rgba(232,38,90,0.3); }
.insight-item-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.insight-item-dot.crit { background: var(--dan); }
.insight-item-dot.warn { background: var(--warn); }
.insight-item-dot.ok   { background: var(--suc); }
.insight-item-dot.info { background: var(--pri); }
.insight-item-text { font-family: var(--font-mono); font-size: 8px; color: var(--ink2); white-space: nowrap; }
```

**Story Bar:**
```css
.story-bar { display: none; background: rgba(42,168,110,0.05); border-bottom: 1px solid rgba(42,168,110,0.16); flex-shrink: 0; overflow: hidden; }
.story-bar.active { display: flex; }
.story-bar-inner { display: flex; align-items: center; gap: 10px; padding: 6px 24px; width: 100%; flex-wrap: nowrap; }
.story-title { font-family: var(--font-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.06em; color: var(--suc-lt); white-space: nowrap; flex-shrink: 0; }
.story-narrative { font-family: var(--font-sans); font-size: 10px; color: var(--ink3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.story-nav { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }
.story-nav-btn { padding: 2px 9px; border: 1px solid rgba(42,168,110,0.28); border-radius: var(--radius-sm); background: transparent; color: var(--suc-lt); cursor: pointer; font-family: var(--font-mono); font-size: 8px; transition: background 0.1s; white-space: nowrap; }
.story-nav-btn:hover:not(:disabled) { background: rgba(42,168,110,0.10); }
.story-nav-btn:disabled { opacity: 0.28; cursor: default; }
.story-exit-btn { padding: 2px 9px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: transparent; color: var(--ink4); cursor: pointer; font-family: var(--font-mono); font-size: 8px; transition: all 0.1s; }
.story-exit-btn:hover { border-color: var(--ink3); color: var(--ink2); }
.story-dots { display: flex; align-items: center; gap: 4px; }
.story-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.28; transition: opacity 0.12s; }
.story-dot.active-dot { opacity: 1; }
```

**Investigation Banner:**
```css
.invest-banner { display: flex; align-items: stretch; background: rgba(212,85,85,0.04); border-bottom: 1px solid rgba(212,85,85,0.14); flex-shrink: 0; flex-wrap: wrap; }
.invest-banner-left { display: flex; align-items: center; gap: 9px; padding: 7px 16px; border-right: 1px solid rgba(212,85,85,0.12); flex-shrink: 0; }
.invest-banner-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dan); animation: pulse 1.2s ease-in-out infinite; flex-shrink: 0; }
.invest-banner-label { font-family: var(--font-mono); font-size: 7px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dan-lt); opacity: 0.7; white-space: nowrap; flex-shrink: 0; }
.invest-banner-title { font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.invest-banner-center { display: flex; align-items: center; flex: 1; min-width: 0; overflow-x: auto; padding: 0 4px; }
.invest-banner-center::-webkit-scrollbar { height: 2px; }
.invest-metric-chip { display: flex; flex-direction: column; padding: 5px 14px; border-right: 1px solid rgba(212,85,85,0.08); flex-shrink: 0; min-width: 70px; }
.invest-metric-lbl { font-family: var(--font-mono); font-size: 7px; letter-spacing: 0.10em; text-transform: uppercase; color: var(--ink4); margin-bottom: 2px; white-space: nowrap; }
.invest-metric-val { font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--ink2); white-space: nowrap; }
.invest-banner-right { display: flex; align-items: center; gap: 6px; padding: 7px 14px; flex-shrink: 0; }
.invest-exit { font-family: var(--font-mono); font-size: 8px; padding: 3px 10px; border: 1px solid rgba(212,85,85,0.28); border-radius: var(--radius-sm); background: transparent; color: var(--dan-lt); cursor: pointer; transition: all 0.1s; }
.invest-exit:hover { background: rgba(224,48,48,0.09); }
```

**Card system changes:** `.card-hero::before` gradient changes to use brand red:
```css
.card-hero::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, #E8265A 0%, #F05580 50%, #D4820A 100%);
  opacity: 0.7;
}
```
Card hover now uses `var(--pri)` glow: `.card:hover { border-color: rgba(232,38,90,0.20); box-shadow: var(--shadow); }`

Add new `.card-head` rule with border-radius at top:
```css
.card-head {
  padding: 11px 16px 10px; border-bottom: 1px solid var(--line-lt);
  display: flex; align-items: center; justify-content: space-between;
  overflow: hidden; background: var(--bg3); border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
```

**KPI Cards (new component):**
```css
.kpi-card {
  padding: 18px 20px; background: var(--bg2); border: 1px solid var(--line);
  border-radius: var(--radius-lg); position: relative; overflow: hidden; transition: all 0.15s;
}
.kpi-card:hover { border-color: rgba(232,38,90,0.20); box-shadow: var(--shadow); transform: translateY(-1px); }
.kpi-label { font-size: 11px; font-weight: 500; color: var(--ink3); margin-bottom: 10px; letter-spacing: 0.01em; }
.kpi-value { font-family: var(--font-serif); font-size: 32px; color: var(--ink); line-height: 1; margin-bottom: 6px; letter-spacing: -0.02em; }
.kpi-sub { font-family: var(--font-mono); font-size: 8.5px; color: var(--ink4); letter-spacing: 0.04em; }
.kpi-delta { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 20px; font-family: var(--font-mono); font-size: 8px; font-weight: 600; margin-top: 6px; }
.kpi-delta.up   { background: rgba(24,167,104,0.10); color: var(--suc-lt); }
.kpi-delta.down { background: rgba(232,38,90,0.09);  color: var(--pri-lt); }
.kpi-delta.flat { background: var(--sankey-bg);       color: var(--ink4); }
```

**Action Chips (smart recommendations — new):**
```css
.action-chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
  border: 1px solid var(--line); border-radius: 20px; cursor: pointer;
  font-size: 10.5px; color: var(--ink3); background: var(--bg2);
  transition: all 0.12s var(--ease-out); white-space: nowrap;
}
.action-chip:hover { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); transform: translateY(-1px); }
.action-chip.danger { border-color: rgba(224,48,48,0.25); color: var(--dan-lt); background: rgba(224,48,48,0.05); }
.action-chip.danger:hover { border-color: var(--dan); background: rgba(224,48,48,0.10); }
.action-chip.success { border-color: rgba(24,167,104,0.25); color: var(--suc-lt); background: rgba(24,167,104,0.05); }
.action-chip-icon { font-size: 11px; opacity: 0.75; }
.smart-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line-lt); }
```

**Callout redesign:** Remove left-side `::before` pseudo approach. Use plain borders:
```css
.callout { border-radius: var(--radius); padding: 12px 14px; margin-bottom: 10px; }
.callout-crit { background: rgba(212,85,85,0.05); border: 1px solid rgba(212,85,85,0.18); }
.callout-warn { background: rgba(200,136,40,0.05); border: 1px solid rgba(200,136,40,0.18); }
.callout-ok   { background: rgba(42,168,110,0.05); border: 1px solid rgba(42,168,110,0.18); }
.callout-info { background: var(--pri-dim); border: 1px solid rgba(232,38,90,0.2); }
```
(The `::before` accent left strip is removed from callouts in the primary block.)

**Investigate Button (new):**
```css
.investigate-btn {
  font-family: var(--font-mono); font-size: 8px; padding: 3px 10px;
  border: 1px solid rgba(224,48,48,0.25); border-radius: var(--radius-sm);
  background: rgba(212,85,85,0.05); color: var(--dan-lt); cursor: pointer;
  transition: all 0.10s; margin-top: 8px; display: inline-block;
}
.investigate-btn:hover { background: rgba(212,85,85,0.12); border-color: var(--dan-lt); }
```

**Trust Badges (new):**
```css
.trust-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 3px; cursor: help;
  font-family: var(--font-mono); font-size: 7.5px; letter-spacing: 0.04em;
}
.trust-badge.fresh   { background: rgba(42,168,110,0.09); color: var(--suc-lt);  border: 1px solid rgba(42,168,110,0.20); }
.trust-badge.warn    { background: rgba(200,136,40,0.09); color: var(--warn-lt); border: 1px solid rgba(200,136,40,0.20); }
.trust-badge.crit    { background: rgba(212,85,85,0.08);  color: var(--dan-lt);  border: 1px solid rgba(212,85,85,0.20); }
.trust-badge.derived { background: var(--pri-dim);         color: var(--pri-lt);  border: 1px solid rgba(232,38,90,0.22); }
```

**Delta Pills (new):**
```css
.delta-pill { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 20px; font-family: var(--font-mono); font-size: 8px; font-weight: 600; }
.delta-pill.up   { background: rgba(42,168,110,0.10); color: var(--suc-lt); }
.delta-pill.down { background: rgba(224,48,48,0.09);  color: var(--dan-lt); }
.delta-pill.flat { background: var(--sankey-bg);       color: var(--ink4); }
```

**Bar row change:** `.bf-gold` gradient now uses brand red:
```css
.bf-gold  { background: linear-gradient(90deg, rgba(232,38,90,0.7), #E8265A); }
```

**Sub tab active:** Uses `var(--pri)` instead of `var(--gold)`:
```css
.sub-tab.active { color: var(--pri-lt); border-bottom-color: var(--pri); background: var(--pri-dim); }
.sub-tab:hover  { color: var(--ink2); background: var(--pri-dim); }
```

**Filter panel left accent:**
```css
.filter-panel::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: var(--pri); opacity: 0.35;
}
```

**Toasts move to bottom-center** (not top-right):
```css
.toast-zone { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 9000; pointer-events: none; }
```

**Table enhancements:**
```css
.data-table tr.anomaly td { border-left: 2px solid var(--warn); }
.data-table tr.selected-row td { background: var(--pri-dim); border-left: 2px solid var(--pri); }
.data-table tr:hover td { background: var(--pri-dim); }
.ch-row.anomaly { border-left: 2px solid var(--warn); }
.ch-row.selected-row { background: var(--pri-dim); }
.table-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--line-lt); background: var(--bg3); flex-wrap: wrap; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
.table-search { flex: 1; min-width: 120px; max-width: 200px; border: 1px solid var(--line); background: var(--bg); border-radius: var(--radius-sm); padding: 5px 9px; font-size: 11px; font-family: var(--font-sans); color: var(--ink); outline: none; transition: border-color 0.1s; }
.table-search:focus { border-color: var(--pri); }
.table-search::placeholder { color: var(--ink4); }
.tbl-sort-btn { padding: 3px 8px; border: 1px solid var(--line-lt); background: transparent; border-radius: var(--radius-xs); cursor: pointer; font-size: 8px; font-family: var(--font-mono); color: var(--ink3); text-transform: uppercase; transition: all 0.08s; white-space: nowrap; }
.tbl-sort-btn:hover, .tbl-sort-btn.active { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.table-density-btn, .tbl-export-btn { padding: 3px 8px; border: 1px solid var(--line-lt); background: transparent; border-radius: var(--radius-xs); cursor: pointer; font-size: 8px; font-family: var(--font-mono); color: var(--ink3); transition: all 0.08s; }
.tbl-export-btn:hover { border-color: var(--suc); color: var(--suc-lt); }
.table-sticky-wrap { overflow: auto; max-height: 480px; }
.table-sticky-wrap .data-table th { position: sticky; top: 0; z-index: 2; }
.row-expand-btn { cursor: pointer; color: var(--ink4); font-size: 10px; transition: color 0.08s; margin-right: 4px; display: inline-block; }
.row-expand-btn:hover { color: var(--pri-lt); }
```

**Channel Grid Card (new):**
```css
.ch-grid-card { padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--bg2); cursor: pointer; transition: all 0.12s; display: flex; flex-direction: column; gap: 5px; border-left: 3px solid transparent; }
.ch-grid-card:hover { border-color: rgba(232,38,90,0.22); background: var(--pri-dim); }
.ch-grid-card.ch-zero { border-left-color: var(--dan); }
.ch-grid-card.ch-low  { border-left-color: var(--warn); }
.ch-grid-card.ch-good { border-left-color: var(--suc); }
.ch-grid-card.ch-selected { border-color: var(--pri); background: var(--pri-dim); }
```

**Empty State (new):**
```css
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 44px 20px; gap: 10px; }
.empty-state-icon { font-size: 28px; opacity: 0.18; }
.empty-state-text { font-size: 12px; color: var(--ink4); text-align: center; line-height: 1.65; max-width: 220px; }
.empty-state-action { padding: 5px 14px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: transparent; cursor: pointer; font-family: var(--font-mono); font-size: 9px; color: var(--ink3); transition: all 0.08s; }
.empty-state-action:hover { border-color: var(--pri); color: var(--pri-lt); }
```

**Skeleton Loader (new):**
```css
@keyframes shimmer { 0%{background-position:-400px 0}100%{background-position:400px 0} }
.skeleton { background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%); background-size: 800px 100%; animation: shimmer 1.4s infinite; border-radius: 3px; display: block; }
```

**Right Utility Panel (new — completely new feature):**
```css
.rp-shell {
  position: fixed; right: 0; top: 0; bottom: 0; width: var(--panel-w);
  background: var(--bg2); border-left: 1px solid var(--line);
  z-index: 5000; transform: translateX(100%);
  transition: transform 0.24s var(--ease-out);
  display: flex; flex-direction: column; overflow: hidden;
}
.rp-shell.open { transform: translateX(0); }
[data-theme="light"] .rp-shell { box-shadow: -6px 0 30px rgba(0,0,0,0.08); }
[data-theme="dark"]  .rp-shell { box-shadow: -6px 0 40px rgba(0,0,0,0.45); }
.rp-tabs { display: flex; align-items: center; border-bottom: 1px solid var(--line); background: var(--bg3); flex-shrink: 0; padding: 0 6px; gap: 2px; }
.rp-tab { flex: 1; padding: 9px 4px 8px; text-align: center; cursor: pointer; font-size: 9.5px; font-weight: 500; color: var(--ink4); border-bottom: 2px solid transparent; transition: all 0.1s; display: flex; flex-direction: column; align-items: center; gap: 3px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; margin-top: 6px; }
.rp-tab:hover { color: var(--ink2); background: var(--bg4); }
.rp-tab.active { color: var(--pri-lt); border-bottom-color: var(--pri); background: var(--bg2); }
.rp-tab-icon { font-size: 13px; line-height: 1; }
.rp-tab-label { font-size: 8.5px; font-family: var(--font-sans); }
.rp-close { flex-shrink: 0; width: 26px; height: 26px; margin: auto 4px auto auto; border-radius: 50%; background: var(--bg4); border: 1px solid var(--line); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--ink4); transition: all 0.1s; align-self: center; }
.rp-close:hover { background: var(--pri-dim); color: var(--pri-lt); }
.rp-body { flex: 1; overflow-y: auto; padding: 16px; }
.rp-body::-webkit-scrollbar { width: 3px; }
.rp-body::-webkit-scrollbar-thumb { background: var(--line); border-radius: 2px; }
.rp-section-lbl { font-family: var(--font-mono); font-size: 7.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink4); margin-bottom: 8px; margin-top: 16px; }
.rp-section-lbl:first-child { margin-top: 0; }
.explain-card { background: var(--bg3); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 10px; }
.explain-entity { font-family: var(--font-sans); font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 4px; letter-spacing: -0.01em; }
.explain-delta { font-size: 11px; color: var(--ink3); margin-bottom: 14px; line-height: 1.45; }
.explain-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid var(--line-lt); }
.explain-row:last-child { border-bottom: none; }
.explain-lbl { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); text-transform: uppercase; letter-spacing: 0.08em; }
.explain-val { font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; color: var(--ink2); }
.explain-actions { display: flex; gap: 5px; margin-top: 14px; flex-wrap: wrap; }
.explain-action { padding: 4px 11px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: transparent; cursor: pointer; font-family: var(--font-sans); font-size: 10px; font-weight: 500; color: var(--ink3); transition: all 0.1s; white-space: nowrap; }
.explain-action:hover { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.explain-action.danger:hover { border-color: var(--dan); color: var(--dan-lt); background: rgba(212,85,85,0.07); }
.ev-item { padding: 11px 13px; border: 1px solid var(--line-lt); border-radius: var(--radius); margin-bottom: 7px; background: var(--sankey-bg); cursor: pointer; transition: border-color 0.10s; }
.ev-item:hover { border-color: var(--pri); }
.ev-item-label { font-family: var(--font-mono); font-size: 7.5px; letter-spacing: 0.10em; text-transform: uppercase; color: var(--ink4); margin-bottom: 4px; }
.ev-item-val { font-family: var(--font-sans); font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 3px; }
.ev-item-sub { font-size: 10px; color: var(--ink3); line-height: 1.5; }
.pin-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: var(--pri-dim); border: 1px solid rgba(232,38,90,0.13); border-radius: var(--radius-sm); margin-bottom: 4px; font-size: 10px; color: var(--ink2); }
.pin-item-x { margin-left: auto; cursor: pointer; color: var(--ink4); font-size: 11px; flex-shrink: 0; }
.pin-item-x:hover { color: var(--dan-lt); }
.sv-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius); cursor: pointer; margin-bottom: 6px; transition: all 0.12s; background: var(--bg2); }
.sv-item:hover { border-color: var(--pri); background: var(--pri-dim); transform: translateX(2px); }
.sv-item.active { border-color: var(--pri); background: var(--pri-dim); }
.sv-icon { width: 30px; height: 30px; border-radius: var(--radius); background: var(--bg4); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.sv-name { font-size: 12.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.sv-desc { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-arrow { color: var(--ink4); font-size: 11px; flex-shrink: 0; opacity: 0; transition: opacity 0.1s; }
.sv-item:hover .sv-arrow { opacity: 1; }
.rp-chat-body { display: flex; flex-direction: column; gap: 10px; padding: 14px; overflow-y: auto; flex: 1; }
.rp-chat-body::-webkit-scrollbar { width: 3px; }
.rp-chat-foot { padding: 10px 14px; border-top: 1px solid var(--line); background: var(--bg2); flex-shrink: 0; display: flex; gap: 8px; }
.cop-ctx-capsule { background: var(--bg3); border: 1px solid rgba(232,38,90,0.2); border-radius: var(--radius); padding: 8px 11px; margin: 0 14px 4px; font-family: var(--font-mono); font-size: 8px; color: var(--ink3); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cop-ctx-label { color: var(--pri-lt); font-size: 7.5px; letter-spacing: 0.10em; text-transform: uppercase; }
```

**Chat redesign** (chat messages now exist inside the right panel, not a floating widget):
```css
.chat-bbl { max-width: 86%; padding: 8px 11px; border-radius: 10px; font-size: 11.5px; line-height: 1.5; color: var(--ink2); background: var(--bg3); border: 1px solid var(--line-lt); }
.chat-msg { display: flex; gap: 8px; align-items: flex-start; }
.chat-msg.user { flex-direction: row-reverse; }
.chat-msg.user .chat-bbl { background: var(--pri-dim); color: var(--ink); border-color: rgba(232,38,90,0.18); }
.chat-mav { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; background: linear-gradient(135deg, var(--pri), var(--suc)); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; }
.chat-qp { font-size: 9.5px; padding: 4px 9px; border: 1px solid var(--line); background: transparent; cursor: pointer; color: var(--ink3); border-radius: 20px; transition: all 0.08s; font-family: var(--font-sans); font-weight: 500; }
.chat-qp:hover { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.chat-inp { flex: 1; border: 1px solid var(--line); background: var(--bg3); border-radius: 20px; padding: 7px 13px; font-size: 11.5px; font-family: var(--font-sans); color: var(--ink); outline: none; transition: border-color 0.1s; }
.chat-inp:focus { border-color: var(--pri); }
.chat-inp::placeholder { color: var(--ink4); }
.chat-send { width: 34px; height: 34px; border-radius: 50%; background: var(--pri); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; transition: background 0.1s; flex-shrink: 0; }
.chat-send:hover { background: var(--pri-lt); }
```

**Panel Open Button (new — replaces AI Copilot FAB):**
```css
.panel-btn {
  display: flex; align-items: center; gap: 5px; padding: 5px 11px;
  border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg3);
  cursor: pointer; font-size: 10.5px; font-weight: 500; color: var(--ink3);
  transition: all 0.1s; white-space: nowrap; font-family: var(--font-sans);
}
.panel-btn:hover { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.panel-btn.active { border-color: var(--pri); color: var(--pri-lt); background: var(--pri-dim); }
.panel-btn .pb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--suc); animation: pulse 2s ease-in-out infinite; }
```

**Command Palette (new — completely new feature):**
```css
.cmd-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.50); z-index: 99000;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 14vh; animation: fadeIn 0.1s ease both;
}
@keyframes fadeIn { from{opacity:0}to{opacity:1} }
.cmd-palette {
  width: 580px; max-width: calc(100vw - 32px);
  background: var(--bg2); border: 1px solid var(--line);
  border-radius: var(--radius-xl); overflow: hidden;
  box-shadow: var(--shadow-xl);
  animation: cmdSlideIn 0.14s var(--ease-spring) both;
  border-top: 2px solid rgba(232,38,90,0.6);
}
@keyframes cmdSlideIn { from{opacity:0;transform:scale(0.97) translateY(-8px)}to{opacity:1;transform:none} }
.cmd-search-row { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.cmd-search-icon { font-size: 16px; color: var(--ink4); flex-shrink: 0; }
.cmd-search-input { flex: 1; background: transparent; border: none; outline: none; font-family: var(--font-sans); font-size: 15px; font-weight: 400; color: var(--ink); caret-color: var(--pri); }
.cmd-search-input::placeholder { color: var(--ink4); }
.cmd-esc { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); background: var(--bg4); border: 1px solid var(--line); border-radius: 3px; padding: 2px 6px; flex-shrink: 0; }
.cmd-results { max-height: 340px; overflow-y: auto; padding: 6px; }
.cmd-results::-webkit-scrollbar { width: 3px; }
.cmd-results::-webkit-scrollbar-thumb { background: var(--line); }
.cmd-group-label { font-family: var(--font-mono); font-size: 7px; letter-spacing: 0.20em; text-transform: uppercase; color: var(--ink4); padding: 8px 10px 4px; }
.cmd-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: var(--radius); cursor: pointer; transition: all 0.08s; }
.cmd-item:hover, .cmd-item.selected { background: var(--pri-dim); }
.cmd-item-icon { width: 30px; height: 30px; border-radius: var(--radius-sm); background: var(--bg3); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.cmd-item.selected .cmd-item-icon { background: var(--pri-dim); }
.cmd-item-info { flex: 1; min-width: 0; }
.cmd-item-label { font-size: 12.5px; font-weight: 500; color: var(--ink); }
.cmd-item-desc { font-family: var(--font-mono); font-size: 8.5px; color: var(--ink4); margin-top: 1px; }
.cmd-item-kbd { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); background: var(--bg4); border: 1px solid var(--line); border-radius: 3px; padding: 1px 5px; flex-shrink: 0; }
.cmd-footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; border-top: 1px solid var(--line); background: var(--bg3); }
.cmd-footer-hint { font-family: var(--font-mono); font-size: 8px; color: var(--ink4); display: flex; align-items: center; gap: 5px; }
.cmd-footer-hint kbd { background: var(--bg4); border: 1px solid var(--line); border-radius: 3px; padding: 1px 5px; }
```

**Light mode overrides** — replace the existing `[data-theme="light"]` block with a comprehensive v19 version using `var(--pri)` throughout. Key changes:
- Cards: white background, subtle shadow
- Topbar: white, no bottom border (uses shadow instead)
- Content area: `#EBEBEE` background
- Section blocks: `#EBEBEE`, hover `#E5E5E9`
- Card heads: `#F2F2F5`
- Logo lockup stays dark (`#060709` to `#0D0A0E`)
- KPI card hover: `rgba(212,32,80,0.08)` shadow
- Right panel: white, stronger shadow

**Global Filter Spine (`.gf-spine`) — kept for legacy compatibility:**
```css
.gf-spine { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; padding:0 20px 0 24px; height:var(--ctx-h); border-bottom:1px solid var(--line); background:var(--bg2); min-height:var(--ctx-h); z-index:25; flex-shrink:0; overflow-x:auto; overflow-y:hidden; }
.gf-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 7px 2px 6px; border-radius:4px; background:var(--pri-dim); border:1px solid rgba(232,38,90,0.22); color:var(--pri-lt); font-family:var(--font-mono); font-size:8px; cursor:pointer; transition:all 0.1s; white-space:nowrap; flex-shrink:0; }
.gf-chip:hover { background:rgba(232,38,90,0.14); }
.gf-chip-x { opacity:0.55; font-size:9px; margin-left:2px; }
.gf-chip.red { background:rgba(212,85,85,0.10); border-color:rgba(212,85,85,0.28); color:var(--dan-lt); }
.gf-chip.green { background:rgba(42,168,110,0.09); border-color:rgba(42,168,110,0.25); color:var(--suc-lt); }
.gf-divider { width:1px; height:16px; background:var(--line); flex-shrink:0; margin:0 2px; }
.gf-label { font-family:var(--font-mono); font-size:7.5px; letter-spacing:0.16em; text-transform:uppercase; color:var(--ink4); white-space:nowrap; flex-shrink:0; }
.gf-reset { font-family:var(--font-mono); font-size:8px; padding:2px 8px; border:1px solid var(--line); border-radius:4px; background:transparent; color:var(--ink4); cursor:pointer; transition:all 0.1s; white-space:nowrap; flex-shrink:0; }
.gf-reset:hover { border-color:var(--dan-lt); color:var(--dan-lt); }
.gf-mode-badge { display:flex; align-items:center; gap:5px; padding:2px 8px; border-radius:20px; font-family:var(--font-mono); font-size:8px; white-space:nowrap; flex-shrink:0; }
.gf-mode-badge.invest { background:rgba(212,85,85,0.10); border:1px solid rgba(212,85,85,0.28); color:var(--dan-lt); }
.gf-mode-badge.compare { background:var(--pri-dim); border:1px solid rgba(232,38,90,0.22); color:var(--pri-lt); }
.gf-mode-badge.story { background:rgba(42,168,110,0.09); border:1px solid rgba(42,168,110,0.25); color:var(--suc-lt); }
```

**Premium micro-interactions (new):**
```css
*:focus-visible { outline: 2px solid var(--pri) !important; outline-offset: 2px; }
html { scroll-behavior: smooth; }
.content { scroll-behavior: smooth; }
.section-block[data-section] { scroll-margin-top: calc(var(--header-h) + var(--ctx-h)); }
.card { transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s var(--ease-out); }
.card:hover { transform: translateY(-1px); }
.kpi-card { transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s var(--ease-out); }
.nav-item { transition: color 0.12s, background 0.12s, transform 0.12s var(--ease-out); }
.nav-item:hover { transform: translateX(2px); }
.nav-item.active { transform: none; }
.action-chip:active { transform: scale(0.97) translateY(0) !important; }
.ctrl-btn:active, .dim-opt:active, .explain-action:active { transform: scale(0.97); }
* { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--line); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--ink4); }
.rp-shell { will-change: transform; }
.insight-bar.visible { animation: fadeUp 0.18s ease both; }
[data-theme="dark"] .section-block:hover { background: rgba(255,255,255,0.006); }
.ann-pin { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid rgba(232,38,90,0.25); border-radius: 20px; font-family: var(--font-mono); font-size: 8px; cursor: pointer; transition: all 0.1s; white-space: nowrap; color: var(--pri-lt); background: var(--pri-dim); }
.ann-pin:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
.selected-mark { outline: 2px solid var(--pri) !important; outline-offset: 1px; z-index: 2; position: relative; }
.dimmed-mark { opacity: 0.28; filter: grayscale(0.4); transition: opacity 0.15s, filter 0.15s; }
.bench-toggle { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; font-size: 9px; color: var(--ink3); }
.bench-toggle input { accent-color: var(--pri); width: 11px; height: 11px; flex-shrink: 0; }
.bench-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; background: var(--pri-dim); border: 1px solid rgba(232,38,90,0.22); border-radius: 20px; font-family: var(--font-mono); font-size: 8px; color: var(--pri-lt); }
.topbar-kpi-strip { font-size: 9px; font-family: var(--font-mono); display: flex; align-items: center; gap: 6px; padding: 3px 10px; background: var(--bg3); border: 1px solid var(--line); border-radius: var(--radius-sm); flex-shrink: 0; }
.topbar-kpi-strip .kv { font-weight: 700; }
.topbar-kpi-strip .sep { opacity: 0.3; }
```

**Command palette trigger (in topbar):**
```css
.cmd-trigger {
  display: flex; align-items: center; gap: 7px; padding: 5px 10px;
  border: 1px solid var(--line); border-radius: var(--radius);
  background: var(--bg3); cursor: pointer; font-size: 11px; color: var(--ink4);
  transition: all 0.12s; white-space: nowrap; flex-shrink: 0;
}
.cmd-trigger:hover { border-color: var(--pri); color: var(--ink2); background: var(--pri-dim); }
.cmd-trigger-icon { opacity: 0.6; }
.cmd-trigger-text { color: var(--ink4); }
.cmd-trigger-kbd { font-family: var(--font-mono); font-size: 8px; background: var(--bg4); border: 1px solid var(--line); border-radius: 3px; padding: 1px 5px; }
```

**Section header changes:** `.sec-title` now uses `var(--font-sans)` (not serif) with `font-weight: 700`, and `.sec-hd` drops the bottom border/padding in the primary block.

**Stagger animation delays** updated to have smaller gaps (0.04s, 0.08s, 0.12s, 0.16s, 0.20s).

---

## 3. JavaScript — React Components

### 3a. Intro Animation — same logic, NO changes needed

### 3b. New: Centralized Metrics Object `M`

Add this constant immediately after the `TOTAL_UPLOADED`, `TOTAL_CREATED`, `TOTAL_PUBLISHED` constants:

```javascript
const M = {
  uploaded:    4453,
  created:     15119,
  published:   111,
  unpublished: 15119 - 111,         // 15008
  publishRate: +(111/4453*100).toFixed(1),     // 2.5
  unpubRate:   +((1 - 111/15119)*100).toFixed(1), // 99.3
  multiplier:  +(15119/4453).toFixed(2),        // 3.40
  uploadHrs:   839.8,
  createdHrs:  1314.89,
  activeChannels: 18,
  activeUsers: 44,
  zeroPubMonths: 3,
  peakMonth:   "Feb '26",
  peakCreated: 2756,
  topCh:       'D',
  topChPub:    72,
  topChRate:   17.5,
};
console.assert(M.unpublished === M.created - M.published, 'Unpublished metric mismatch');
const PUBLISH_RATE = String(M.publishRate);
const MULTIPLIER   = String(M.multiplier);
const TOTAL_UPLOADED_M  = M.uploaded;
const TOTAL_CREATED_M   = M.created;
const TOTAL_PUBLISHED_M = M.published;
```

Throughout all sections, replace hardcoded values like `15,008`, `97.5%`, `3.4×`, `2.5%` with references to `M.unpublished`, `M.unpubRate`, `M.multiplier`, `M.publishRate`, etc.

### 3c. New: React Context (`DashContext`)

Add a global React context for cross-component state sharing:

```javascript
const DashContext = React.createContext(null);
function useDash() { return React.useContext(DashContext); }
```

All major section components (`SectionExecutive`, `SectionTrends`, `SectionMultiDim`, `SectionFunnel`, `SectionExplorer`, `SectionClient`) must call `useDash()` and destructure: `selectCtx`, `selectedCtx`, `startInvestigation`, `openCompare`, `filteredData`, `pinFinding`, `openPanel` as needed.

### 3d. New: Story Presets and Anomaly Registry

Add these constants:

```javascript
const STORY_PRESETS = [
  { id:'exec',    title:'Executive Summary',      section:'executive', narrative:'Platform processed 15,119 AI outputs from 4,453 uploads across 12 months. Publish rate of 2.5% reveals a strategic activation gap.' },
  { id:'bottleneck', title:'Publishing Bottleneck', section:'funnel',   narrative:'97.5% of all AI-created content — 15,008 videos — was never distributed. Three months recorded zero publishes.' },
  { id:'channel', title:'Channel Risk',           section:'multidim',  narrative:'12 of 18 channels have zero published output. Ch-D and Ch-A drive 96% of all distribution.' },
  { id:'quality', title:'Quality Risks',          section:'explorer',  narrative:'99.3% unknown team attribution. 68% NULL platform on published rows. QA contamination ~15.5% of created outputs.' },
  { id:'client',  title:'Client Overview',        section:'client',    narrative:'Board-level synthesis: volume, publish funnel, channel health, and data quality summary.' },
];

const ANOMALIES = [
  { id:'zero_pub_months',   title:'3 Zero-Publish Months',      type:'crit', detail:'Mar, Jul, Sep 2025 had zero published output despite hundreds of uploads. Operational bottleneck — not a volume issue.', affectedMonths:["Mar'25","Jul'25","Sep'25"], section:'trends',   filters:{ months:["Mar'25","Jul'25","Sep'25"] } },
  { id:'feb_spike',         title:'Feb 2026 — Anomalous Spike', type:'warn', detail:"Feb 2026 created 2,756 outputs — 194% above the 12-month average of 937. Upload volume also peaked at 676.", affectedMonths:["Feb'26"], section:'trends',   filters:{ months:["Feb'26"] } },
  { id:'pub_gap',           title:'97.5% Utilization Gap',      type:'crit', detail:'15,008 AI-created videos were never distributed. This is the single largest opportunity on the platform.', section:'funnel',   filters:{} },
  { id:'platform_null',     title:'68% Platform NULL Rate',     type:'crit', detail:'68% of published items have no platform attributed. The data cannot confirm where content was distributed.', section:'explorer', filters:{} },
  { id:'team_unknown',      title:'99.3% Unknown Team',         type:'crit', detail:"99.3% of all records have team name = 'Unknown'. Team-level attribution is currently not functional.", section:'explorer', filters:{} },
  { id:'zero_pub_channels', title:'12/18 Zero-Pub Channels',    type:'crit', detail:'67% of channels have never published a single video. Ch-D and Ch-A account for 96% of all published output.', section:'multidim', filters:{} },
  { id:'qa_contamination',  title:'~15.5% QA/Test Content',     type:'warn', detail:'An estimated 15.5% of created outputs appear to be QA/test artifacts. This inflates the creation count.', section:'explorer', filters:{} },
];
```

### 3e. New: KPI Tree Category Colors

Change KPI tree category colors from the gold-amber palette to use brand system variables:
```javascript
const catColors = ['#D4820A','#D46030','#b85010','#E8265A','#30b060'];
```
(previously `['#d4952a','#e07038','#b85010','#3080e0','#30b060']`)

### 3f. New: `CommandPalette` Component

Add a fully new `CommandPalette` React component before `IntroAnimation`. It renders a full-screen overlay with a search input and grouped command list.

**Props:** `{ open, onClose, onAction }`

**Commands list** (`ALL_COMMANDS`) has groups: Navigate, Workspace, Views, Anomalies, Compare, Actions. Navigate contains links to all 6 pages. Workspace opens right panel tabs. Views apply saved view presets. Anomalies start investigations. Compare triggers side-by-side mode. Actions include Clear Filters, Toggle Theme, Toggle Insights.

Keyboard behavior: `ArrowDown`/`ArrowUp` to move selection, `Enter` to execute, `Esc` to close. Filter commands by query (label, desc, group).

The component manages its own `query` and `selected` state. Opens to a clean state each time (`useEffect` on `open`).

Trigger: `⌘K` (or `Ctrl+K`). Wire up a `useEffect` in `App` that listens for `keydown` and toggles `cmdOpen` state.

### 3g. New: `TrustBadge` Component

```javascript
function TrustBadge({ type, label, title }) {
  return <span className={`trust-badge ${type}`} title={title||label}>
    {type==='fresh'?'✓':type==='warn'?'⚠':type==='crit'?'⚑':type==='derived'?'∂':''} {label}
  </span>;
}
```

### 3h. New: `ContextBar` Component

Replace all previous filter/mode display elements (StoryBar, InvestigationBanner, filter pill rows) with a single unified `ContextBar` component that renders inside a `.ctx-bar` div immediately below the topbar.

The `ContextBar`:
- Shows a hint "Click any chart, row, or data point to filter" when nothing is active
- Shows mode pills for Investigation mode, Story mode, Compare mode
- Shows `f-chip` elements for each active filter (channel, month, language, user, inputType)
- Shows "↺ Reset all" button when any filter is active  
- Shows "filtered" badge when `filteredData.isFiltered` is true
- Shows the Insights toggle button always in right corner
- Reads state from `useDash()` and `AppUICtx`

### 3i. New: `InsightChips` Component

A separate component that renders below the `ContextBar` inside an `.insight-bar.visible` div when `insightMode` is true. Calls `computeInsights(selectedCtx)` to generate 4 contextual insight chips. Clicking a chip scrolls to its `section`.

```javascript
function computeInsights(sel) {
  const findings = [];
  // Returns 1-5 findings based on sel.month, sel.channel, sel.language, sel.user, or defaults
  // Default findings: pub gap, peak month, zero-publish months, channel concentration, data quality
  // ...
  return findings.slice(0, 5);
}
```

### 3j. Modified: `StackedBarChart`

Add support for a `selectedMonth` prop. When a bar's `d.month === selectedMonth`, render a subtle highlight rect behind it and set full opacity. Wire up to `useDash()` to call `selectCtx({month: d.month})` when a bar is clicked.

### 3k. Modified: `HeatCalendar`

- Color palette changes from gold-amber to **brand red** scale:  
  `['#110808','#3A1020','#6A1830','#A82048','#E8265A','#F05580']`
- Add `onClick={()=>selectCtx({month:d.month})}` on each cell
- Highlight selected month with `outline: '2px solid var(--gold)'`
- Add red dot indicator (top-right corner of cell) for months with zero publishes

### 3l. Modified: `BarRow`

Add `selected` prop. When `selected=true`, show gold background tint, gold border, and gold-colored label text. Change `onClick` cursor logic accordingly.

### 3m. Modified: `Ring`

Change default `color` from `'var(--gold)'` to `'var(--pri)'`.

### 3n. Modified: `Sparkline`

Change default `color` from `'var(--gold)'` to `'var(--pri)'`. Change bar width from `4` to `3`.

### 3o. Modified: `ScatterChart`

Add `onPointClick` prop. Call it when a circle is clicked, passing the data point.

### 3p. Modified: `DonutChart`

Add `onClick` support on paths: `onClick={()=>p.onClick&&p.onClick(p)}`

### 3q. Modified: `ChannelTable`

Completely rewrite. New features:
1. **Table toolbar** with search input (filter by channel name), sort buttons (Uploaded, Created, Published, Rate), density toggle (normal/compact), and CSV export button
2. **Sortable columns** — `handleSort(key)` toggles asc/desc. Sort icon ↑/↓ shown next to active column
3. **Row selection** — clicking a row calls `selectCtx({channel: ch.ch})` and adds `selected-row` class
4. **Expand/collapse rows** — each row has a `▸`/`▾` expand button in the channel name cell. Expanded rows show a sub-row with: AI Multiplier, Pub Rate, Hours, Platforms metrics in a 4-column grid; platform distribution chips; action buttons ("⇔ vs Ch-D" and "◈ Anchor context")
5. **Empty state** — when search finds no matches, show `<div className="empty-state">` with clear button
6. **Row anomaly class** — rows with `rate<1 && uploaded>70` get `anomaly` class

### 3r. Modified: `ChannelPlatformHeatmap`

Call `useDash()` and add `onClick={()=>v>0&&selectCtx({channel:ch})}` on value cells. Highlight cells when `selectedCtx?.channel===ch` with a gold border.

### 3s. Modified: `Drawer`

Add new props: `drawerCompare`, `drawerInvestigate`. Call `useDash()` for `pinFinding`, `openCompare`, `startInvestigation`.

Add to drawer header: a `delta-pill` showing `vsAvg` (rate vs platform avg M.publishRate) as `+X.Xpp vs avg` or `-X.Xpp vs avg`.

Update signal section to reference `M.publishRate` in text.

Add action buttons section in drawer with:
- "⇔ Compare vs Ch-X" button
- "⚑ Investigate →" button  
- "📌 Pin finding" button

If the channel has published items but zero platform attribution, show a warning callout about the 68% platform NULL issue.

### 3t. Modified: `ToastZone`

Icons and colors now use the semantic system. Toasts render with an icon (`⚑`, `⚡`, `◎`, `✓`) and colored icon span. A `✕` close button appears on the right.

Remove floating `DraggableFAB` and `ChatWidget` components entirely.

### 3u. Modified: `SectionExecutive`

1. **`sec-hd`** now includes `TrustBadge` components inline in the `sec-tag`:
   - `TrustBadge type="fresh" label="12-month dataset"`
   - `TrustBadge type="derived" label="computed metrics"`
2. **`sec-title`** changes to "Executive Overview" (from "Command Centre")
3. **`sec-ctx-strip`** shows contextual metadata: uploads, AI outputs, publish rate, channels, users, and optionally "◈ {month} selected" or "◈ Ch-X selected" from `selectedCtx`
4. **Hero card `card-hero`** padding increases to `22px 24px 18px`. Font sizes increased slightly. Sub-metrics use a border-separated row with `var(--font-serif)` values.
5. **KPI cards** change labels and styling:
   - Remove sparklines from "Pub Rate" card (show warning badge instead)
   - Add `kpi-delta` style badge on pub rate card
6. **Smart actions row** appears between callouts and chart, with four `action-chip` buttons:
   - "⚑ Investigate publish gap" (danger)
   - "⇔ Compare Ch-A vs Ch-D"
   - "⇔ H1 vs H2 comparison"
   - "↑ Explain Feb 2026 spike"
   Each calls the corresponding `startInvestigation` or `openCompare` from `useDash()`
7. **Callouts** add `<button className="investigate-btn">⚑ Investigate →</button>` for each anomaly that has a corresponding ID
8. **Pipeline Health card** uses `M.*` values instead of hardcoded strings
9. **Bar chart section** shows `activeMonthly` from `filteredData` (context-filtered data), falls back to `MONTHLY_DATA`
10. **`ChannelTable`** now receives the enhanced version with expanded rows
11. **Content status donut** uses `M.unpublished` and `var(--suc)` for published color
12. Toast delays increase to 1800ms and 4200ms (from 900ms and 2600ms)

### 3v. Modified: `SectionTrends`

1. Reads `filteredData` from `useDash()` as `ctxFiltered`. Uses `ctxFiltered.monthly || MONTHLY_DATA` as base.
2. **Smart actions row** with three action chips:
   - "⚑ Investigate zero-publish months" (danger)
   - "⇔ H1 vs H2 comparison"
   - "↑ Explain Feb 2026 spike" (success)
3. **Chart.js trajectory chart** — dataset colors change to brand red `#E8265A` for Created and amber `#D46030` for Published. Line 1 (Uploaded) stays dark. Add an optional "Rolling avg" dataset when `showBench` is true (a dashed line at `rollingAvg`).
4. **Click handler on Chart.js** — `onClick` option calls `selectCtx({month: mo.month})` when a point is clicked.
5. **Duration chart colors** change to `#E8265A`, `#D46030`, `#18A768` for upload/created/published.
6. **Annotations row** — add a row of clickable `ann-pin` chips above the main chart showing months with zero publishes and the Feb 2026 peak. Clicking a chip calls `selectCtx({month})` and `startInvestigation(anomalyId)`.
7. **Benchmark toggle** — a `bench-toggle` checkbox labelled "Rolling avg" appears in the filter panel's Overlay group. When checked, adds rolling avg annotation chip and a dashed benchmark line on the trajectory chart.
8. **H1 filter labels** updated to "H1 Mar–Aug" and "H2 Sep–Feb" (clearer naming)
9. **Heat calendar** colors updated to brand red scale
10. **Monthly upload rank list** — replace the flat BarRow list with a sorted-by-upload version showing top 6 months
11. **`sec-ctx-strip`** shows: peak month, zero-publish month count, monthly average; shows "◈ {month} active" when `selectedCtx.month` exists

### 3w. Modified: `SectionMultiDim`

1. Reads `ctxFiltered` from `useDash()`. Uses `activeInputTypes` and `activeLanguages` from filtered data.
2. **Smart actions row** with three chips:
   - "⇔ English vs Hindi" (calls `openCompare`)
   - "⇔ Ch-A vs Ch-D" (calls `openCompare`)
   - "⚑ 12 zero-publish channels" (danger, calls `startInvestigation`)
3. **BarRow selections** — each BarRow in bar view has `selected={selectedCtx?.inputType===t.type}` and `onClick={()=>selectCtx({inputType:t.type})}` for input types; and `selected={selectedCtx?.language===l.lang}` / `onClick={()=>selectCtx({language:l.lang})}` for languages.
4. **Compare buttons** — below the bar view, add two dim-opt buttons: "⇔ EN vs HI Compare" and "⇔ Ch-A vs Ch-D Compare" that call `openCompare`
5. **Empty states** — if `activeInputTypes.length === 0` or `activeLanguages.length === 0`, show `<div className="empty-state">` component
6. **Heatmap click** — each heatmap cell gets `onClick={()=>v>0&&selectCtx({inputType:inp,language:lang==='en'?'English':'Hindi'})}` 
7. **Treemap colors** — change from the old warm palette to muted amber/earthy tones matching the new theme: `['#A06010','#C04820','#906040','#7a6858','#5a7868','#9b7058','#6a8870','#8a7060','#b8a070','#887060']`
8. **`sec-ctx-strip`** shows: top channel, zero-pub channels, EN/HI publish counts; conditionally shows selected channel/language

### 3x. Modified: `SectionFunnel`

1. Reads `filteredData` from `useDash()`. Uses filtered languages, input types, channels.
2. **Smart actions row** with three chips:
   - "⚑ Investigate 97.5% gap" (danger)
   - "⇔ English vs Hindi"
   - "◎ Zero-publish channels"
3. **Sub-tabs** gain `tabIndex={0}`, `role="tab"`, `aria-selected`, and `onKeyDown` handler for keyboard nav.
4. **Sankey legend** uses `M.*` values instead of hardcoded strings.
5. **Pipeline subview** — "Data Quality Alerts" section gains `<TrustBadge type="crit" label="3 critical issues"/>` in the header. Each quality alert item gains an `<button className="investigate-btn">` that calls `startInvestigation(anomalyId)`.
6. **Channel cards** — filtered by `activeChannels`. If `activeChannels.filter(ch=>ch.uploaded>0).length === 0`, show empty state at `gridColumn: '1/-1'`. Card rendering logic unchanged but applies filter.
7. **Funnel subview ratios** — use `M.*` values.
8. **Types subview** uses `activeInputTypes`. Shows empty state if empty.
9. **`sec-ctx-strip`** shows: utilization gap %, unpublished count, create→publish rate, top channel concentration

### 3y. Modified: `SectionExplorer`

1. Reads `ctxFiltered` from `useDash()`. Uses `activeUsers = ctxFiltered?.users || USERS`.
2. **Smart actions row** with three chips:
   - "⚑ Investigate data quality" (danger)
   - "⚠ QA contamination ~15.5%" (danger)
   - "◎ Open quality audit"
3. **Sub-tabs** gain keyboard nav attributes.
4. **User sort buttons** — inline in filter panel. When `ctxFiltered?.isFiltered`, shows badge "Filter active — N of 12 users".
5. **User table** — wrapped in `table-sticky-wrap` for sticky headers. Column headers for Uploaded/Created/Published are clickable for sort (call `setUserSort(k)` and show ↓ icon). Table has CSV export button in `card-head`. Empty state if `sortedUsers.length === 0`. Clicking a row calls `selectCtx({user: u.user})`.
6. **Selected row** — `selected-row` class when `selectedCtx?.user === u.user`. Shows "◈" badge next to the user name.
7. **Chart.js colors** for user bar chart change to `rgba(232,38,90,0.50)` / `#E8265A` and `rgba(24,167,104,0.60)` / `#18A768`. Same for pareto chart.
8. **Quality subview** — when `investigationMode` is 'team_unknown', 'platform_null', or 'qa_contamination', show an evidence-panel section above the quality rings with specific breakdown stats for that anomaly. Pin button in the evidence panel calls `pinFinding`.
9. **Quality section** gains `TrustBadge` components in header: `warn label="68% pub NULL"` and `crit label="99.3% team unknown"`.
10. **Auto-switch to quality tab** when `investigationMode` is a quality anomaly.
11. **KPI Tree** node `textColor` and `mutedColor` stay as-is. `catColors` update to match new brand palette.
12. **Scatter chart** `onPointClick={d=>selectCtx({user:d.user})}` prop added.
13. **`sec-ctx-strip`** shows: top user, unknown team %, QA contamination; conditionally shows selected user

### 3z. Modified: `SectionClient`

1. Calls `useDash()` for `startInvestigation`, `filteredData`, `openCompare`. Uses `filteredData?.channels || CHANNELS`.
2. **`sec-hd`** uses `.sec-hd` div with inline flex layout (title + close button).
3. **Info banner** added below sec-hd explaining the client page is private.
4. **Smart actions row** with three chips:
   - "⚑ Investigate publish gap" (danger)
   - "⇔ EN vs HI comparison"
   - "⚑ Data quality audit"
5. **KPI cards** use `M.*` values.
6. **Pipeline Summary** uses `M.*` in rows. Bar widths calculated from `M.created` as max.
7. **Key Signals callouts** add `<button className="investigate-btn">` to the critical and data quality callouts.
8. **Channel breakdown** uses `activeChannels`.

### 3aa. New: `computeInsights(sel)` Function

A pure function that takes `selectedCtx` and returns up to 5 insight objects. Each has `{id, type, text, section}`. Logic:
- If `sel.month`: 3 insights about that month (delta vs avg, zero-pub status, pub rate vs platform)
- If `sel.channel`: 3 insights about that channel (rate vs avg, multiplier, platform count)
- If `sel.language`: 2 insights (lang rate, vs English gap)
- If `sel.user`: 2 insights (rate, volume)
- Default (no selection): 5 global insights about pub gap, peak month, zero-pub months, channel concentration, data quality

### 3ab. New: `RightPanel` Component

A fixed right-side panel (`.rp-shell`) with 5 tabs: Explain, Evidence, Compare, Views, Copilot.

**Explain tab:** Shows structured explanation when `selectedCtx` has a channel/month/language/user. Shows entity name, primary metric (pub rate), delta vs platform avg, metric rows (Uploaded, Created, Published, AI Multiplier, Platforms). Action buttons: Investigate (if related anomaly), Compare, Pin. When nothing selected, shows empty state with 3 quick jump buttons (Feb 2026, Ch-D, English).

**Evidence tab:** Shows active context summary card at top (channel or month stats). Shows all `ANOMALIES` as `ev-item` cards, each clickable to `startInvestigation`. Shows pinned findings list with remove `✕` buttons.

**Compare tab:** Shows empty state with 3 quick compare options (Ch-A vs Ch-D, English vs Hindi, H1 vs H2) when no `compareState`. When active, shows: comparison type label, a delta summary card showing pub rate difference with color coding (green for positive, red for negative), side-by-side cards for A and B with Uploaded/Created/Published metrics and a pub rate bar visualization, action buttons.

**Views tab:** Shows `SAVED_VIEWS` as clickable `sv-item` cards with icon, name, desc, badge. Clicking navigates to the view's section, starts its investigation/compare if configured, and opens the specified panel tab. Below views, shows `STORY_PRESETS` in the same style.

**Copilot tab:** Shows a context capsule (if `selectedCtx` has items) displaying active channel/month/language/user. Chat messages with assistant/user bubbles. Quick prompt chips. Chat input + send button. Local AI responses (no API call needed — use simple `switch`-style response matching).

**Auto-switch:** When `explainData` (derived from `selectedCtx`) changes and panel is open, switch to Explain tab.

**State:** `open`, `activeTab` are passed as props from `App`. `pinFinding`, `unpinFinding`, `startInvestigation`, `openCompare` from `useDash()`.

### 3ac. New: `AppUICtx` Context

```javascript
const AppUICtx = React.createContext(null);
```

Provides: `panelOpen`, `setPanelOpen`, `panelTab`, `setPanelTab`, `openPanel`, `chatOpen`, `setChatOpen`.

### 3ad. Modified: `App` Component — Major Restructure

**Remove:** `DraggableFAB`, `ChatWidget`, floating AI copilot, `StoryBar`, `InvestigationBanner`, `GlobalFilterSpine`.

**Remove:** The `clientOpen` wheel-block hack (`onWheel` event listener that prevented scrolling into client).

**Add state:**
```javascript
const [cmdOpen, setCmdOpen] = useState(false);
const [globalFilters, setGlobalFilters] = useState({});
const [selectedCtx, setSelectedCtx] = useState({});
const [investigationMode, setInvestigationMode] = useState(null);
const [investFilters, setInvestFilters] = useState({});
const [compareState, setCompareState] = useState(null);
const [storyMode, setStoryMode] = useState(null);
const [showBenchmark, setShowBenchmark] = useState(false);
const [insightMode, setInsightMode] = useState(false);
const [evidenceOpen, setEvidenceOpen] = useState(false);
const [pinnedFindings, setPinnedFindings] = useState([]);
const [panelOpen, setPanelOpen] = useState(false);
const [panelTab, setPanelTab] = useState('explain');
```

**Change intro key** from `sessionStorage` to `localStorage`:
```javascript
const [showIntro, setShowIntro] = useState(()=> !localStorage.getItem(INTRO_KEY));
// onDone:
localStorage.setItem(INTRO_KEY,'1');
```

**Add `useEffect` for ⌘K:**
```javascript
useEffect(() => {
  const handler = (e) => {
    if((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdOpen(v => !v);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

**Rename section labels** in `SCROLL_SECTIONS`:
- `executive` → label `'Overview'`
- `trends` → label `'Trends'`
- `multidim` → label `'Segments'`
- `funnel` → label `'Funnel'`
- `explorer` → label `'Explorer'`

**Add callbacks:**
```javascript
const selectCtx = useCallback((ctx) => {
  setSelectedCtx(prev => ({ ...prev, ...ctx }));
}, []);

const startInvestigation = useCallback((anomalyId) => {
  const anomaly = ANOMALIES.find(a=>a.id===anomalyId);
  if(!anomaly) return;
  setInvestigationMode(anomalyId);
  setSelectedCtx(prev => ({ ...prev, anomaly: anomalyId }));
  setInvestFilters(anomaly.filters || {});
  const target = anomaly.section || 'executive';
  setActiveSection(target);
  requestAnimationFrame(() => {
    const el = contentRef.current?.querySelector(`[data-section="${target}"]`);
    if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  });
  addToast(`Investigating: ${anomaly.title}`, 'crit', 'Investigation');
}, []);

const exitInvestigation = useCallback(() => {
  setInvestigationMode(null);
  setInvestFilters({});
  setSelectedCtx(prev => { const n={...prev}; delete n.anomaly; return n; });
}, []);

const startStory = useCallback((storyId) => {
  const s = STORY_PRESETS.find(x=>x.id===storyId);
  if(!s) return;
  setStoryMode(storyId);
  // Navigate to story section
  if(s.section === 'client') { setClientOpen(true); setActiveSection('client'); }
  else { setActiveSection(s.section); /* scroll */ }
}, []);

const exitStory = useCallback(() => { setStoryMode(null); }, []);

const openCompare = useCallback((typeA, a, typeB, b) => {
  setCompareState({ typeA, a, typeB, b });
  setPanelTab('compare');
  setPanelOpen(true);
}, []);

const closeCompare = useCallback(() => { setCompareState(null); }, []);

const clearAllFilters = useCallback(() => {
  setGlobalFilters({});
  setSelectedCtx({});
  setInvestFilters({});
  setInvestigationMode(null);
  setStoryMode(null);
  setCompareState(null);
  setInsightMode(false);
}, []);

const removeChip = useCallback((key, source) => {
  if(source === 'filter' || source === 'both') setGlobalFilters(prev => { const n={...prev}; delete n[key]; return n; });
  if(source === 'ctx' || source === 'both') setSelectedCtx(prev => { const n={...prev}; delete n[key]; return n; });
}, []);

const pinFinding = useCallback((finding) => {
  setPinnedFindings(prev => { if(prev.find(p=>p.id===finding.id)) return prev; return [...prev, finding]; });
  addToast(`Pinned: ${finding.label}`, 'info', 'Evidence');
}, []);

const unpinFinding = useCallback((id) => { setPinnedFindings(prev => prev.filter(p=>p.id!==id)); }, []);

const openPanel = useCallback((tab) => {
  setPanelTab(tab || 'explain');
  setPanelOpen(true);
}, []);
```

**Add `activeChips` memo:**
```javascript
const activeChips = useMemo(() => {
  const chips = [];
  if(selectedCtx.channel) chips.push({ label:`Ch-${selectedCtx.channel}`, key:'channel', source:'ctx' });
  if(selectedCtx.month)    chips.push({ label:selectedCtx.month, key:'month', source:'ctx' });
  if(selectedCtx.language) chips.push({ label:selectedCtx.language, key:'language', source:'ctx' });
  if(selectedCtx.user)     chips.push({ label:selectedCtx.user, key:'user', source:'ctx' });
  if(globalFilters.inputType) chips.push({ label:globalFilters.inputType, key:'inputType', source:'filter' });
  return chips;
}, [selectedCtx, globalFilters]);
```

**Add `filteredData` memo** — computes filtered slices of all data arrays based on `selectedCtx`, `globalFilters`, `investFilters`. Returns `{ monthly, channels, inputTypes, languages, users, kpis, isFiltered, activeFilter }`.

**Add `dashCtx` memo** — wraps all context values for `DashContext.Provider`.

**Add `appUICtx` memo** — wraps panel state for `AppUICtx.Provider`.

**Add `breadcrumb` memo** — derives `[pageTitles[activeSection], ...contextualParts]` from `activeSection` and `selectedCtx`.

**Sidebar changes:**
- Add version text in `logo-sub`: `"Operations Intelligence · v19"`
- Add `<div className="logo-live-dot"/>` after `logo-sub`
- Add `<div className="sb-search-btn" onClick={()=>setCmdOpen(true)}>` block with icon `⌕`, label `"Search or jump…"`, and kbd `⌘K`
- Section labels change to the new normalized names (Overview, Trends, Segments, Funnel, Explorer, Client)
- Client nav item: add `data-client-nav="true"` attribute and "private" badge
- Add "Workspace" nav group below pages with 5 nav items: Saved Views, Explain, Evidence, Compare, Copilot — each calling `openPanel(tab)`
- `sb-stats` adds title row `<div className="sb-stats-title">Platform</div>`
- `sb-foot` uses `M.*` values and shows `v19 · Production · ● live`

**Topbar changes:**
- Layout: `topbar-left` and `topbar-right` divs
- `page-title` shows `clientOpen ? 'Client' : (pageTitles[activeSection]||'Overview')`
- Add breadcrumb (shown when `breadcrumb.length > 1`)
- Add `<span className="period-badge">MAR 2025 – FEB 2026</span>`
- Remove old period badge and inline KPI display
- Add `<div className="cmd-trigger" onClick={()=>setCmdOpen(true)}>` with icon `⌕`, text `Search`, kbd `⌘K`
- Add `<div className="topbar-kpi-strip">` with three colored values: uploaded (ink2), created (pri-lt), published (warn-lt) — replaces old inline display
- Replace theme toggle (unchanged)
- Replace `"✦ AI Copilot"` button with `<button className="panel-btn">⊹ Workspace</button>` or `Close ✕` when panel open

**Context rail:** Immediately below topbar, render `<ContextBar/>` component.

**Insight chips:** Immediately below `ContextBar`, render `<InsightChips/>`.

**Main content area:** Remove `style={{ display: clientOpen ? 'none' : undefined }}` from content div and instead use a React conditional that only renders the 5 scroll sections when `!clientOpen`.

**Client content:** If `clientOpen`, render `<div className="content" style={{flex:1,overflowY:'auto'}}><div className="section-block fade-up" style={{paddingBottom:80}}><SectionClient onClose={backFromClient}/></div></div>`.

**Add `<RightPanel>` component** at the end of shell, before `<ToastZone>`:
```jsx
<RightPanel
  open={panelOpen}
  activeTab={panelTab}
  setActiveTab={setPanelTab}
  onClose={()=>setPanelOpen(false)}
/>
```

**Main area:** Add `marginRight: panelOpen ? 'var(--panel-w)' : 0` and `transition: 'margin-right 0.24s var(--ease-out)'` to the `.main` div.

**Remove:** `DraggableFAB`, `ChatWidget`, `drawer-ov`, floating highlight overlay (keep the `HighlightEscListener` and highlight logic but simplify the overlay overlay from 0.65 to 0.4 opacity and change gold to red brand: `border: '1px solid rgba(232,38,90,0.28)'`, `color: 'var(--pri-lt)'`).

**Wrap in providers:**
```jsx
<DashContext.Provider value={dashCtx}>
  <AppUICtx.Provider value={appUICtx}>
    <div className="shell" ...>
      <CommandPalette ... />
      {/* rest of shell */}
    </div>
  </AppUICtx.Provider>
</DashContext.Provider>
```

**`goToClient` / `backFromClient`** — clean callbacks without the wheel hack. `goToClient` sets `clientOpen(true)` and `setActiveSection('client')`. `backFromClient` sets `clientOpen(false)` and scrolls to explorer.

**Highlight overlay:** Change gold to brand: `border: '1px solid rgba(232,38,90,0.28)'`, `color: 'var(--pri-lt)'`. Overlay opacity: `rgba(0,0,0,0.4)`. Click overlay calls `exitHighlight`.

**Breadcrumb label cleanup:** `pageTitles` object:
```javascript
const pageTitles = {
  executive:'Overview', trends:'Trends', multidim:'Segments',
  funnel:'Funnel', explorer:'Explorer', client:'Client'
};
```

**`CommandPalette` onAction handler** in App handles: `nav` (scroll/navigate), `panel` (openPanel), `view` (apply saved view), `investigate` (startInvestigation + openPanel evidence), `compare` (openCompare + openPanel compare), `clear` (clearAllFilters), `theme` (toggle theme), `insights` (toggle insightMode).

---

## 4. Saved Views Data

Add these after `ANOMALIES`:

```javascript
const SAVED_VIEWS = [
  { id:'executive', name:'Executive View', icon:'◈', desc:'KPIs · pipeline health · top signals', badge:'Overview', section:'executive', panelTab:'evidence', filters:{}, ctx:{}, highlight:'Top-level health check.' },
  { id:'bottlenecks', name:'Publishing Bottlenecks', icon:'⊳', desc:'97.5% gap · zero-pub channels · funnel', badge:'Critical', badgeColor:'red', section:'funnel', panelTab:'evidence', filters:{}, ctx:{}, anomaly:'pub_gap', highlight:'Surfaces why only 111 of 14,914 AI-created videos were distributed.' },
  { id:'language', name:'Language Comparison', icon:'⇔', desc:'English vs Hindi · 3× pub rate gap', badge:'Compare', section:'multidim', panelTab:'compare', filters:{}, ctx:{}, compare:{type:'language',a:'English',b:'Hindi'}, highlight:'English achieves 1.03% vs Hindi 0.33%.' },
  { id:'qa_audit', name:'QA Audit', icon:'⊹', desc:'99.3% unknown team · 68% NULL platform', badge:'Quality', badgeColor:'amber', section:'explorer', panelTab:'evidence', filters:{}, ctx:{}, anomaly:'team_unknown', highlight:'Three critical data quality issues.' },
  { id:'client_review', name:'Client Review', icon:'◎', desc:'Board-ready · account summary · signals', badge:'Private', section:'client', panelTab:'explain', filters:{}, ctx:{}, highlight:'Presentation-ready client overview.' },
];
```

---

## 5. Color Token Migration Summary

Throughout all JSX inline styles and component logic, apply these color remaps:

| v11 token | v19 token |
|---|---|
| `'var(--gold)'` | `'var(--warn)'` or `'var(--gold)'` (keep for legacy data viz, swap for UI) |
| `'var(--gold-lt)'` | `'var(--warn-lt)'` or `'var(--gold-lt)'` (same caveat) |
| `'var(--amber)'` | `'var(--warn)'` |
| `'var(--amber-lt)'` | `'var(--warn-lt)'` |
| `'var(--green)'` | `'var(--suc)'` |
| `'var(--green-lt)'` | `'var(--suc-lt)'` |
| `'var(--red)'` | `'var(--dan)'` |
| `'var(--red-lt)'` | `'var(--dan-lt)'` |
| `'var(--blue)'` | `'var(--pri)'` |
| `'var(--blue-lt)'` | `'var(--pri-lt)'` |
| Primary accent `var(--gold)` on UI (active states, borders) | `var(--pri)` |
| Glow `var(--glow)` | `var(--pri-dim)` for UI accents |

**Chart.js datasets color changes:**
- Uploaded series: `#6A6060` (dark muted)
- Created series: `#E8265A` (brand red)
- Published series: `#D46030` (amber-orange)
- Benchmark/rolling avg: `rgba(232,38,90,0.55)` dashed

**D3 Sankey COLORS16** first entry changes from `'#d4952a'` to `'#E8265A'`.
**D3 Tree COLORS16** first entry changes to `'#E8265A'`.
**Ternary chart COLORS_T** first three entries: `'#D4820A','#D46030','#E8265A'`.

---

## 6. Removed Features

- **`DraggableFAB`** — entire component removed
- **`ChatWidget`** — entire floating chat removed; copilot moved into right panel
- **`StoryBar`** — removed as standalone; state persists but bar is no longer rendered separately (mode pill in ContextBar replaces it)
- **Wheel-block scroll hack** in `App` (the `onWheel` event listener blocking scroll past Explorer)
- **Intro key `sessionStorage`** — changed to `localStorage` so intro is truly shown once per browser (not per session)
- **`drawer-ov`** class — the old drawer overlay. Drawer updated to use `.drawer-overlay` class.

---

## 7. Final Checklist

After making all changes, verify:

1. `<title>` updated to v19
2. Both `<style>` blocks present with the complete CSS
3. Google Fonts link includes Plus Jakarta Sans
4. `M` constant defined and used throughout all sections
5. `DashContext` and `AppUICtx` contexts defined and provided in `App`
6. `STORY_PRESETS`, `ANOMALIES`, `SAVED_VIEWS` constants defined
7. `CommandPalette` component present and triggered by `⌘K`
8. `RightPanel` component with 5 tabs (Explain, Evidence, Compare, Views, Copilot) rendered in the shell
9. `ContextBar` and `InsightChips` components rendered in the main column
10. `TrustBadge` component defined and used in Executive and Explorer sections
11. `startInvestigation`, `openCompare`, `selectCtx` wired throughout all sections
12. Toast zone positioned at bottom-center
13. AI Copilot FAB removed; `panel-btn` in topbar opens panel to `copilot` tab
14. Intro animation uses `localStorage` instead of `sessionStorage`
15. Channel table has sortable columns, search, expand rows, and CSV export
16. Heat calendar colors are brand red scale
17. KPI tree category colors updated
18. Sidebar has: search button, live dot in logo, Workspace tools nav group, `v19` in footer
19. Breadcrumb in topbar shown when context is active
20. `filteredData` memo computing filtered arrays in `App` and passed via `dashCtx`
