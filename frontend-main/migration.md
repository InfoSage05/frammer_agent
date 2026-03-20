CONVERSION FROM V11 to V19

You are not redesigning a dashboard from scratch.
You are performing a strict, non-hallucinated, code-grounded forensic comparison between
two real single-file HTML dashboard versions:
- OLD SOURCE: frammer-dashboard-v11.html
- NEW SOURCE: frammer-dashboard-v19.html
Your job is to deeply analyze both files and then write a README-quality migration
document that explains, in exact and minute detail, what changed from v11 to v19 and how
to convert v11 into v19 step by step.
CRITICAL RULES
1. Do not hallucinate.
2. Do not guess missing features, data, intent, or rationale.
3. Every statement must come from actual comparison of the two files.
4. If something seems implied but is not explicitly present in code, label it as “not directly
evidenced in code”.
5. Preserve the distinction between:
- renamed features
- removed features
- replaced features
- new features
- modified behavior
- cosmetic restyling
- structural architecture changes
6. Treat the actual uploaded files as the only source of truth.
7. Do not write vague summaries like “UI improved”, “layout polished”, “state management
enhanced”.
Replace them with exact technical descriptions.
8. If the filename version and internal HTML title/version text disagree, explicitly report that
mismatch in the README.
9. Do not skip small changes. Include minute-level changes too.
10. Do not output actual rewritten code unless explicitly needed for a tiny illustrative snippet.
The main deliverable is the README/migration specification.
PRIMARY GOAL
Produce a file named:
README_V11_TO_V19_DIFF.md
This README must be a forensic migration report that allows an engineer to:
- understand exactly what changed between v11 and v19
- understand which old systems were retained, replaced, or removed
- manually convert v11 into v19 in a disciplined way

- audit that no feature was falsely claimed
ANALYSIS METHOD YOU MUST FOLLOW
Before writing the README, compare both files across all of the following layers:
A. FILE IDENTITY / METADATA
- filename
- internal &lt;title&gt;
- font imports
- script imports
- head-level metadata
- intro/version labels shown in comments or headings
B. DESIGN TOKEN SYSTEM
Compare exact changes to:
- CSS variables
- dark/light themes
- brand colors
- typography stacks
- spacing/radius/elevation tokens
- alias variables
- semantic colors
- chart colors
- form/select styling tokens
- motion/easing tokens
C. GLOBAL SHELL / LAYOUT
Compare exact changes to:
- shell layout
- sidebar structure
- sidebar collapse behavior
- sidebar resize handle
- topbar structure
- breadcrumb presence/absence
- search trigger presence/absence
- context rail presence/absence
- story bar presence/absence
- investigation banner presence/absence
- insight bar presence/absence
- right panel / drawer / utility panel systems
- client section gating behavior
- content scroll behavior
- section wrappers and section padding
D. COMPONENT INVENTORY
Build an explicit old-vs-new component map.
Identify:
- components present in v11 only

- components present in v19 only
- components present in both but behaviorally changed
- components that were conceptually replaced by another system
Examples of what to compare:
- ChatWidget
- DraggableFAB
- CommandPalette
- ContextBar
- InsightChips
- RightPanel
- TrustBadge
- ToastZone
- Drawer
- all section components
- chart wrappers
- utility hooks and helpers
E. APP-LEVEL STATE MODEL
Compare all app-level state variables and grouped logic:
- old state variables
- new state variables
- removed state variables
- newly centralized state
- context providers/hooks
- derived state
- memoized filtered data
- global mode systems
- pinned/saved/explain/evidence state
- panel state
- compare state
- story state
- investigation state
- command palette state
- highlight state
- intro persistence state
F. DATA / CONSTANTS / CONFIG
Compare constants and configuration objects:
- anomalies
- saved views
- story presets
- commands
- annotations
- quick prompts
- AI context builders
- totals / derived KPI constants
- scroll section definitions

- tabs and presets
G. SECTION-BY-SECTION BEHAVIOR
For each major section:
- Executive
- Trends
- MultiDim / Segments
- Funnel
- Explorer
- Client
Explain exactly:
- what UI changed
- what controls changed
- what derived context or filters were injected
- what interactions were added
- what visual headers / context strips / actions were added
- what old logic remained
- what local state was replaced by global state
- what charts changed only cosmetically versus behaviorally
H. INTERACTION MODEL
Compare exact behavior changes in:
- AI/copilot interaction
- section highlighting
- click-to-filter behavior
- selected context behavior
- compare workflow
- investigation workflow
- story mode workflow
- saved views workflow
- evidence/pinned findings workflow
- keyboard shortcuts
- tab accessibility
- intro persistence
- theme switching
- client tab access rules
- scroll constraints
I. ACCESSIBILITY / UX / POLISH
Explicitly identify:
- new keyboard handling
- ARIA attributes
- focus/keyboard tab support
- hover-only interactions that gained click support
- text overflow fixes
- overlap prevention systems
- clearer labels/breadcrumbs/context chips

- unified control surfaces
J. REMOVED / REPLACED SYSTEMS
You must explicitly identify systems that v11 had but v19 removed or absorbed, such as:
- floating AI FAB patterns
- standalone chat widget workflow
- old AI_CTX / heuristic-only copilot plumbing
- any topbar controls or buttons that were replaced by command palette / right panel / global
context
README OUTPUT FORMAT
Write the README in the following structure exactly:
# README_V11_TO_V19_DIFF
## 1. Scope of comparison
State clearly that this is a direct comparison of the two supplied files only.
## 2. Important version identity note
Explicitly report any mismatch between:
- filename
- internal HTML &lt;title&gt;
- visible internal version labels/comments
## 3. Executive summary of the migration
Write a precise paragraph explaining the real nature of the migration:
- Was it mostly visual?
- Was it architectural?
- Was it behavioral?
- Was it a control-surface upgrade?
- Was it a context/state management upgrade?
Use code evidence, not marketing language.
## 4. Exact inventory of changes
Create grouped subsections:
- Added
- Removed
- Replaced
- Modified
- Unchanged but restyled
Under each, list exact component names, state names, helper names, CSS systems, and
section behaviors.
## 5. Head / imports / metadata diff
List exact changes in:
- title
- fonts

- scripts
- theme setup
- persistence API use
- comments/version headers
## 6. Design system diff
Create a detailed comparison of:
- token names added/removed/renamed
- color philosophy changes
- typography changes
- spacing/radius changes
- card styling changes
- light/dark mode differences
- brand language differences
## 7. Layout shell diff
Describe exact changes in:
- sidebar
- topbar
- main shell
- content area
- new bars/rails/banners/panels
- client-area access model
## 8. App state and architecture diff
Create a table-like markdown section with columns:
- State / helper / context name
- Present in v11?
- Present in v19?
- Role in v11
- Role in v19
- Migration note
Include all important items such as:
- chatOpen
- cmdOpen
- globalFilters
- selectedCtx
- investigationMode
- compareState
- storyMode
- insightMode
- pinnedFindings
- panelOpen
- panelTab
- DashContext
- useDash
- detectTarget

- buildAICtx
- getContextPrompts
- computeInsights
## 9. Component-by-component diff
For every major component or utility, write:
- Old component/function name
- New equivalent (if any)
- What changed
- Whether it was removed, preserved, or replaced
- Exact migration instruction
This section must be exhaustive.
## 10. Section-by-section dashboard diff
For each major section, write a deep subsection:
- What the section looked/behaved like in v11
- What it looks/behaves like in v19
- Exact added controls
- Exact removed controls
- Exact smart actions / context strips / compare hooks / investigation hooks
- Any global-filter integration
- Any accessibility upgrades
## 11. Minute-level UI/UX changes
This section must be extremely granular.
Include tiny changes such as:
- badge wording changes
- title style changes
- font-family substitutions
- button style changes
- hover state differences
- border treatment changes
- padding/margin/radius changes
- active nav indicator changes
- iconography changes
- live dot / breadcrumbs / labels / pills / chips
- new overflow handling
- new ellipsis/text truncation handling
- search trigger insertion
- tab behavior changes
- story/investigation bar insertion
- insight toggle behavior
## 12. Behavior changes that affect engineering
List exact behavior changes that matter technically:
- state persistence changes
- keyboard shortcut additions

- filtering/data derivation changes
- contextual drilldown changes
- panel orchestration changes
- context synchronization changes
- section auto-navigation/highlighting changes
- intro logic differences
- changes from local section logic to shared/global context
## 13. Removed or superseded legacy systems
Explicitly call out legacy v11 systems that are no longer primary in v19.
## 14. Sequential migration plan: how to convert v11 into v19
This is the most important section.
Write a top-to-bottom ordered migration recipe, in the exact order an engineer should apply
changes to v11.
For every step include:
- Step number
- Area of file to edit
- Exact old system
- Exact new system
- What to add/remove/rename/move
- Dependencies
- Risk of breakage
- Validation check after the step
The sequence must be implementation-safe. Start with foundational systems first:
1. head/import/title/version cleanup
2. theme tokens and design tokens
3. shell layout changes
4. new context architecture
5. state model upgrades
6. panel/command systems
7. section-level rewiring
8. interaction and accessibility upgrades
9. cleanup/removal of deprecated systems
10. final QA verification
## 15. Verification checklist
Write a strict checklist that verifies the conversion really matches v19:
- visual verification
- behavior verification
- state verification
- navigation verification
- compare/investigation/story verification
- right-panel verification
- command palette verification

- theme verification
- client gating verification
- old chat/FAB removal or replacement verification
## 16. Appendix: exact old→new mapping
Provide compact mapping lists like:
- old component → new component
- old state → new state
- old UX pattern → new UX pattern
- old CSS token group → new CSS token group
STYLE RULES FOR THE README
- Be forensic, not promotional.
- Be specific, not vague.
- Use exact identifier names from code whenever possible.
- Quote short code identifiers, selectors, token names, state names, component names, and
helper names directly.
- Prefer “v11 uses X, v19 replaces it with Y” over fluffy wording.
- If the same subsystem appears in multiple places, say so explicitly.
- Separate “visual changes” from “behavioral changes” from “architectural changes”.
- Mention unchanged systems too where useful, so the reader knows what remained stable.
VERY IMPORTANT
You must not stop at high-level observations.
You must enumerate minute changes with discipline.
Think like a release auditor writing the definitive migration README for engineers who will
manually convert v11 into v19 without missing anything.
