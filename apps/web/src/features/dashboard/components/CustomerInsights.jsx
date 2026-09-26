import { useState } from 'react';
import { ChevronDown, Lightbulb, Sparkles } from 'lucide-react';

const severityStyles = {
  positive: 'border-emerald-400/35 bg-emerald-500/15',
  warning: 'border-[var(--accent)]/45 bg-[var(--accent)]/18',
  critical: 'border-red-400/40 bg-red-500/15',
  info: 'border-white/20 bg-white/10',
};

const severityBadge = {
  positive: 'bg-emerald-400/20 text-emerald-200',
  warning: 'bg-[var(--accent)]/25 text-[var(--accent)]',
  critical: 'bg-red-400/20 text-red-200',
  info: 'bg-white/15 text-white/80',
};

function relatedLabel(insight) {
  return [insight.relatedCategory?.name, insight.relatedDish?.name].filter(Boolean).join(' · ');
}

function InsightCard({ insight }) {
  const [open, setOpen] = useState(false);
  const severity = insight.severity || 'info';
  const label = relatedLabel(insight);
  const insightKey = insight.id || insight.type;
  const hasAction = Boolean(insight.suggestedAction);

  function expand() {
    setOpen(true);
  }

  function toggle() {
    setOpen((prev) => !prev);
  }

  return (
    <article
      className={`rounded-xl border px-4 py-4 transition ${severityStyles[severity] || severityStyles.info}`}
    >
      {/* Default (collapsed): Insight badge + severity + title — second image */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
        aria-controls={`insight-body-${insightKey}`}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[var(--accent)]">
              <Lightbulb size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">Insight</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                severityBadge[severity] || severityBadge.info
              }`}
            >
              {severity}
            </span>
          </div>
          <h3
            className="text-lg leading-snug text-white"
            style={{ fontFamily: 'var(--font-subheading)' }}
          >
            {insight.title}
          </h3>
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded: description + suggested action — full card */}
      {open ? (
        <div id={`insight-body-${insightKey}`} className="mt-3">
          <p className="text-sm leading-relaxed text-white/80">{insight.description}</p>
          {hasAction ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-[var(--ink)]">
              <span className="font-semibold">Suggested action: </span>
              {insight.suggestedAction}
            </p>
          ) : null}
        </div>
      ) : hasAction ? (
        <button
          type="button"
          onClick={expand}
          className="mt-3 inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
        >
          View Suggested Action
        </button>
      ) : null}

      {/* Category / dish name — always visible (default + expanded) */}
      {label ? (
        <p className="mt-3 text-xs font-medium text-white/65">{label}</p>
      ) : null}
    </article>
  );
}

export function CustomerInsights({ insights = [] }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--ink)] p-5 text-white shadow-[0_18px_40px_-28px_rgba(15,31,28,0.55)] sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-xl bg-white/10 p-2 text-[var(--accent)]">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Customer insights
          </p>
          <h2 className="mt-1 text-2xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
            What customers are paying attention to
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Deterministic rules on live analytics — no external AI. Expand a card for details and
            suggested actions.
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-8 text-center text-sm text-white/75">
          Not enough supporting data for insights in this range yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <InsightCard key={insight.id || insight.type} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}
