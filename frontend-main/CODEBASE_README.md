## Overview
This repository is a Next.js (App Router) dashboard composed of multiple “sections” (Overview/Trends/Segments/Funnel/Explorer/Client).

Each section has its own React component under `components/sections/` and its data lives in `json/<sectionKey>.json`. The frontend fetches that data through the API route `app/api/section-data/[section]/route.ts`.

Navigation between sections is handled inside `components/App.tsx` by switching which section component is rendered (not by continuous page scrolling).

## Directory / File Tree (simplified)
Skips generated/large folders like `node_modules` and `.next`.

```text
.
├─ app/
│  ├─ api/section-data/[section]/route.ts   # serves json/<section>.json
│  ├─ ClientWrapper.tsx                     # client-only wrapper for components/App
│  ├─ layout.tsx                            # global layout + fonts
│  ├─ page.tsx                              # root entry (initialSection="executive")
│  ├─ overview/page.tsx                    # optional deep link entry
│  ├─ trends/page.tsx                      # optional deep link entry
│  ├─ segments/page.tsx                    # optional deep link entry
│  ├─ funnel/page.tsx                      # optional deep link entry
│  ├─ explorer/page.tsx                    # optional deep link entry
│  └─ client/page.tsx                      # optional deep link entry
├─ components/
│  ├─ App.tsx                               # main dashboard shell (sidebar + section switching)
│  ├─ charts/                              # chart primitives (ChartJS/D3/etc)
│  ├─ sections/                            # section implementations
│  │  ├─ section-executive-command-center.tsx
│  │  ├─ section-trends-usage.tsx
│  │  ├─ section-multi-dim-explorer.tsx
│  │  ├─ section-funnel-flow.tsx
│  │  ├─ section-deep-explorer.tsx
│  │  └─ section-client.tsx
│  └─ ui/                                   # reusable UI components (sidebar, palette, panels, modals)
├─ hooks/
│  ├─ useJsonData.ts                         # fetches /api/section-data/:section
│  ├─ useScrollSpy.tsx                       # scroll spy for “scroll flow” mode (disabled in section-switching mode)
│  └─ useHighlightEscListener.tsx
├─ json/
│  ├─ app-shell.json                       # sidebar + topbar config
│  ├─ executive.json
│  ├─ trends.json
│  ├─ multidim.json
│  ├─ funnel.json
│  ├─ explorer.json
│  └─ client.json
├─ lib/
│  ├─ contexts.tsx                          # shared React contexts
│  └─ constants.ts                          # metrics + titles used across the dashboard
├─ public/                                  # static assets
├─ types/                                   # type defs (if present)
└─ utils/                                   # helpers (if present)
```

## Key Code Paths (how it works)
1. `components/App.tsx` loads the dashboard config + shell data by calling `useJsonData("app-shell")`.
2. The sidebar is built from `json/app-shell.json` (`sidebar.sections`).
3. When a sidebar item is clicked, `components/App.tsx` updates `activeSection`.
4. The currently active section component renders and loads its own JSON payload using `useJsonData("<sectionKey>")`.
5. `hooks/useJsonData.ts` fetches from `/api/section-data/<sectionKey>`.
6. `app/api/section-data/[section]/route.ts` reads `json/<sectionKey>.json` and returns the JSON.

## What to edit (common tasks)
- Change sidebar items / titles: edit `json/app-shell.json`.
- Change section data: edit the corresponding file in `json/` (example: `json/trends.json`).
- Implement a new section:
  1. Create `components/sections/section-<name>.tsx`.
  2. Create `json/<sectionKey>.json`.
  3. Add an entry under `sidebar.sections` in `json/app-shell.json`.
  4. Wire the section into the `components/App.tsx` section-switching render logic.
- Add a deep-link route (optional):
  - Create `app/<route>/page.tsx` that renders `ClientWrapper` with `initialSection="<sectionKey>"`.

## Run
`npm run dev`

