// @ts-nocheck
import useJsonData from '@/hooks/useJsonData';
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionClient({ onClose }) {
  const dash = useDash();
  const { data } = useJsonData("client");
  const CHANNELS = data?.channels || [];

  if (!data) return null;

  return (
    <div className="stack fade-up">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7.5,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--pri)",
              }}
            >
              {data.meta.tag}
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7,
                color: "var(--warn)",
                background: "rgba(224,112,56,0.12)",
                border: "1px solid rgba(224,112,56,0.22)",
                padding: "2px 7px",
                borderRadius: 3,
                letterSpacing: "0.1em",
              }}
            >
              {data.meta.badge}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                color: "var(--ink)",
                lineHeight: 1.2,
              }}
            >
              {data.meta.title}
            </div>
            <SectionInfoHint text={data.meta.sub} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-muted">Anonymized</span>
          {onClose && (
            <button
              className="ctrl-btn"
              onClick={onClose}
              style={{ marginLeft: 4 }}
            >
              ← Back to Explorer
            </button>
          )}
        </div>
      </div>

      <div className="g4 stagger">
        {data.summaryCards.map((m) => (
          <div
            key={m.l}
            className="card card-gold fade-up"
            style={{ padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                color: "var(--ink3)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: "var(--pri)", fontSize: 11 }}>
                {m.icon}
              </span>
              {m.l}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 26,
                color: m.c,
                lineHeight: 1,
              }}
            >
              {m.v}
            </div>
          </div>
        ))}
      </div>

      <div className="g2">
        <div className="card" style={{ padding: "16px 18px" }}>
          <div
            style={{
              fontSize: 8,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink3)",
              marginBottom: 14,
            }}
          >
            PIPELINE SUMMARY
          </div>
          {data.pipelineSummary.map((r) => (
            <div
              key={r.l}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 0",
                borderBottom: "1px solid var(--line-lt)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink3)",
                  minWidth: 140,
                }}
              >
                {r.l}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: "var(--sankey-bg)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(r.pct, 100)}%`,
                    height: "100%",
                    background: r.color,
                    borderRadius: 3,
                    transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: r.color,
                  minWidth: 56,
                  textAlign: "right",
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "16px 18px" }}>
          <div
            style={{
              fontSize: 8,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink3)",
              marginBottom: 14,
            }}
          >
            KEY SIGNALS
          </div>
          {data.keySignals.map((signal) => (
            <div
              key={signal.tag}
              className={`callout callout-${signal.type}`}
              style={{ marginBottom: 10 }}
            >
              <div className="c-tag">{signal.tag}</div>
              <div className="c-text">{signal.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: "16px 18px" }}>
        <div
          style={{
            fontSize: 8,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 14,
          }}
        >
          CHANNEL BREAKDOWN
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))",
            gap: 10,
          }}
        >
          {CHANNELS.map((ch) => {
            const rate = (ch.published / ch.uploaded) * 100;
            const col =
              rate >= 10
                ? "var(--green)"
                : rate >= 5
                  ? "var(--pri)"
                  : rate >= 1
                    ? "var(--warn)"
                    : "var(--red-lt)";
            return (
              <div
                key={ch.ch}
                style={{
                  background: "var(--sankey-bg)",
                  border: "1px solid var(--line-lt)",
                  borderRadius: "var(--radius)",
                  padding: "12px 10px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    color: "var(--ink)",
                    marginBottom: 5,
                  }}
                >
                  Ch-{ch.ch}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: col,
                    marginBottom: 3,
                    fontWeight: 600,
                  }}
                >
                  {rate.toFixed(1)}%
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    color: "var(--ink4)",
                  }}
                >
                  {ch.uploaded} up
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    color: ch.published > 0 ? "var(--pri)" : "var(--red-lt)",
                  }}
                >
                  {ch.published} pub
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SectionClient;
