import { formatNumber, formatPercent, formatSeconds } from '../lib/format.js';

export function SectionAttentionTable({ categories }) {
  const rows = [...categories].sort((a, b) => b.averageAttentionSeconds - a.averageAttentionSeconds);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)] sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">Sections</p>
        <h2 className="mt-1 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          Section attention
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="py-3 pr-4 font-semibold">Section</th>
              <th className="py-3 pr-4 font-semibold">Views</th>
              <th className="py-3 pr-4 font-semibold">Unique Customers</th>
              <th className="py-3 pr-4 font-semibold">Avg Attention</th>
              <th className="py-3 font-semibold">Attention %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  No section data yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.categoryId} className="border-b border-[var(--line)]/70 last:border-0">
                  <td className="py-3 pr-4 font-semibold text-[var(--ink)]">{row.name}</td>
                  <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatNumber(row.totalViews)}</td>
                  <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatNumber(row.uniqueSessions)}</td>
                  <td className="py-3 pr-4 text-[var(--ink-soft)]">
                    {formatSeconds(row.averageAttentionSeconds)}
                  </td>
                  <td className="py-3 text-[var(--ink-soft)]">
                    {formatPercent(row.attentionSharePercent, 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
