import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, formatPercent, formatSeconds } from '../lib/format.js';

function AttentionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm shadow-lg">
      <p className="font-semibold text-[var(--ink)]">{row.name}</p>
      <p className="mt-1 text-[var(--muted)]">
        Avg. attention: {formatSeconds(row.averageAttentionSeconds)}
      </p>
      <p className="text-[var(--muted)]">Views: {formatNumber(row.totalViews)}</p>
      <p className="text-[var(--muted)]">
        % of guests: {formatPercent(row.percentSessionsReaching, 0)}
      </p>
      <p className="text-[var(--muted)]">
        Attention %: {formatPercent(row.attentionSharePercent, 0)}
      </p>
    </div>
  );
}

export function AttentionChart({ categories }) {
  const data = [...categories]
    .filter((category) => Number(category.averageAttentionSeconds) > 0)
    .sort((a, b) => b.averageAttentionSeconds - a.averageAttentionSeconds)
    .map((category) => ({
      name: category.name,
      averageAttentionSeconds: Number(category.averageAttentionSeconds) || 0,
      totalViews: Number(category.totalViews) || 0,
      percentSessionsReaching: Number(category.percentSessionsReaching) || 0,
      attentionSharePercent: Number(category.attentionSharePercent) || 0,
    }));

  return (
    <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
            Customer attention
          </p>
          <h2 className="mt-1 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            Average attention by section
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hover a bar for views, % of guests, and attention share.
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl bg-[var(--surface)] text-sm text-[var(--muted)]">
          No section attention recorded in this range.
        </div>
      ) : (
        <div className="h-72 w-full min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(15,31,28,0.08)" />
              <XAxis
                type="number"
                tickFormatter={(value) => `${Math.round(value)}s`}
                stroke="rgba(15,31,28,0.35)"
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                stroke="rgba(15,31,28,0.35)"
                fontSize={11}
                tick={{ width: 80 }}
              />
              <Tooltip content={<AttentionTooltip />} cursor={{ fill: 'rgba(31,74,69,0.06)' }} />
              <Bar dataKey="averageAttentionSeconds" fill="#1f4a45" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
