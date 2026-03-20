// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';

const ALL_COMMANDS = [
  // Navigate
  { group: 'Navigate', icon: '◈', label: 'Overview', desc: 'Executive dashboard', action: { type: 'nav', target: 'executive' }, kbd: '1' },
  { group: 'Navigate', icon: '⊳', label: 'Trends', desc: 'Usage & trend analysis', action: { type: 'nav', target: 'trends' }, kbd: '2' },
  { group: 'Navigate', icon: '⊞', label: 'Segments', desc: 'Channel & user intelligence', action: { type: 'nav', target: 'multidim' }, kbd: '3' },
  { group: 'Navigate', icon: '⊳', label: 'Funnel', desc: 'Content mix & publishing funnel', action: { type: 'nav', target: 'funnel' }, kbd: '4' },
  { group: 'Navigate', icon: '⊹', label: 'Explorer', desc: 'Data explorer & quality', action: { type: 'nav', target: 'explorer' }, kbd: '5' },
  { group: 'Navigate', icon: '◎', label: 'Client', desc: 'Client profile (gated)', action: { type: 'nav', target: 'client' }, kbd: '6' },
  // Workspace
  { group: 'Workspace', icon: '◈', label: 'Explain', desc: 'Open explain panel', action: { type: 'panel', tab: 'explain' } },
  { group: 'Workspace', icon: '⚑', label: 'Evidence', desc: 'Open evidence panel', action: { type: 'panel', tab: 'evidence' } },
  { group: 'Workspace', icon: '⇔', label: 'Compare', desc: 'Open compare panel', action: { type: 'panel', tab: 'compare' } },
  { group: 'Workspace', icon: '◎', label: 'Views', desc: 'Saved views', action: { type: 'panel', tab: 'views' } },
  { group: 'Workspace', icon: '⊹', label: 'Copilot', desc: 'AI assistant', action: { type: 'panel', tab: 'copilot' } },
  // Anomalies
  { group: 'Anomalies', icon: '⚑', label: '3 Zero-Publish Months', desc: 'Investigate operational bottleneck', action: { type: 'investigate', id: 'zero_pub_months' } },
  { group: 'Anomalies', icon: '⚑', label: '97.5% Utilization Gap', desc: 'Investigate publish gap', action: { type: 'investigate', id: 'pub_gap' } },
  { group: 'Anomalies', icon: '⚑', label: '12/18 Zero-Pub Channels', desc: 'Investigate channel distribution', action: { type: 'investigate', id: 'zero_pub_channels' } },
  { group: 'Anomalies', icon: '⚑', label: '68% Platform NULL', desc: 'Investigate data quality', action: { type: 'investigate', id: 'platform_null' } },
  // Compare
  { group: 'Compare', icon: '⇔', label: 'Ch-A vs Ch-D', desc: 'Channel comparison', action: { type: 'compare', typeA: 'channel', a: 'A', typeB: 'channel', b: 'D' } },
  { group: 'Compare', icon: '⇔', label: 'English vs Hindi', desc: 'Language comparison', action: { type: 'compare', typeA: 'language', a: 'English', typeB: 'language', b: 'Hindi' } },
  { group: 'Compare', icon: '⇔', label: 'H1 vs H2', desc: 'Half-year comparison', action: { type: 'compare', typeA: 'period', a: 'H1', typeB: 'period', b: 'H2' } },
  // Actions
  { group: 'Actions', icon: '↺', label: 'Clear Filters', desc: 'Reset all filters and context', action: { type: 'clear' } },
  { group: 'Actions', icon: '◐', label: 'Toggle Theme', desc: 'Switch dark/light mode', action: { type: 'theme' } },
  { group: 'Actions', icon: '◈', label: 'Toggle Insights', desc: 'Show/hide insight chips', action: { type: 'insights' } },
];

export default function CommandPalette({ open, onClose, onAction }: { open: boolean; onClose: () => void; onAction: (action: any) => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS;
    const q = query.toLowerCase();
    return ALL_COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
    );
  }, [query]);

  const groups = useMemo(() => {
    const map: Record<string, typeof ALL_COMMANDS> = {};
    filtered.forEach(c => {
      if (!map[c.group]) map[c.group] = [];
      map[c.group].push(c);
    });
    return map;
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter' && filtered[selected]) { e.preventDefault(); onAction(filtered[selected].action); onClose(); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selected, onAction, onClose]);

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-search-row">
          <span className="cmd-search-icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-search-input"
            placeholder="Search commands, views, anomalies..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
          />
          <span className="cmd-esc">ESC</span>
        </div>
        <div className="cmd-results">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="cmd-group-label">{group}</div>
              {items.map((cmd) => {
                flatIdx++;
                const idx = flatIdx;
                return (
                  <div
                    key={cmd.label}
                    className={`cmd-item${idx === selected ? ' selected' : ''}`}
                    onClick={() => { onAction(cmd.action); onClose(); }}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    <div className="cmd-item-icon">{cmd.icon}</div>
                    <div className="cmd-item-info">
                      <div className="cmd-item-label">{cmd.label}</div>
                      <div className="cmd-item-desc">{cmd.desc}</div>
                    </div>
                    {cmd.kbd && <span className="cmd-item-kbd">{cmd.kbd}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 20px' }}>
              <div className="empty-state-icon">⌕</div>
              <div className="empty-state-text">No commands match "{query}"</div>
            </div>
          )}
        </div>
        <div className="cmd-footer">
          <div className="cmd-footer-hint">
            <kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close
          </div>
        </div>
      </div>
    </div>
  );
}
