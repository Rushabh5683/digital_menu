import { Lightbulb, Sparkles } from 'lucide-react';

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
            Deterministic rules on live analytics — no external AI.
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-8 text-center text-sm text-white/75">
          Not enough supporting data for insights in this range yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => {
            const severity = insight.severity || 'info';
            return (
              <article
                key={insight.id || insight.type}
                className={`rounded-xl border px-4 py-4 ${severityStyles[severity] || severityStyles.info}`}
              >
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
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {insight.description}
                </p>
                {insight.suggestedAction ? (
                  <p className="mt-3 rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-[var(--ink)]">
                    <span className="font-semibold">Suggested action: </span>
                    {insight.suggestedAction}
                  </p>
                ) : null}
                {(insight.relatedCategory?.name || insight.relatedDish?.name) && (
                  <p className="mt-2 text-xs font-medium text-white/65">
                    {[insight.relatedCategory?.name, insight.relatedDish?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
