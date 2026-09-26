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

/** Keep charts readable — more than this scrolls / is truncated with a note. */
const MAX_VISIBLE_SECTIONS = 20;
const ROW_PX = 36;
const CHART_MIN_H = 280;
const CHART_MAX_H = 720;

function truncateLabel(name = '', max = 16) {
  const text = String(name);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function AttentionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm shadow-lg">
      <p className="font-semibold text-[var(--ink)]">{row.fullName}</p>
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
  const ranked = [...categories]
    .filter((category) => Number(category.averageAttentionSeconds) > 0)
    .sort((a, b) => b.averageAttentionSeconds - a.averageAttentionSeconds);

  const totalSections = ranked.length;
  const visible = ranked.slice(0, MAX_VISIBLE_SECTIONS);
  const hiddenCount = Math.max(0, totalSections - visible.length);

  const data = visible.map((category) => ({
    name: truncateLabel(category.name),
    fullName: category.name,
    averageAttentionSeconds: Number(category.averageAttentionSeconds) || 0,
    totalViews: Number(category.totalViews) || 0,
    percentSessionsReaching: Number(category.percentSessionsReaching) || 0,
    attentionSharePercent: Number(category.attentionSharePercent) || 0,
  }));

  const chartHeight = Math.min(
    CHART_MAX_H,
    Math.max(CHART_MIN_H, data.length * ROW_PX + 48),
  );

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
            {totalSections > MAX_VISIBLE_SECTIONS
              ? ` Showing top ${MAX_VISIBLE_SECTIONS} of ${totalSections} sections.`
              : totalSections > 0
                ? ` ${totalSections} section${totalSections === 1 ? '' : 's'}.`
                : ''}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl bg-[var(--surface)] text-sm text-[var(--muted)]">
          No section attention recorded in this range.
        </div>
      ) : (
        <div
          className="w-full min-w-0 overflow-x-auto overflow-y-auto rounded-xl"
          style={{ maxHeight: CHART_MAX_H }}
        >
          <div style={{ height: chartHeight, minWidth: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(15,31,28,0.08)"
                />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `${Math.round(value)}s`}
                  stroke="rgba(15,31,28,0.35)"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={108}
                  stroke="rgba(15,31,28,0.35)"
                  fontSize={11}
                  tick={{ width: 100 }}
                  interval={0}
                />
                <Tooltip content={<AttentionTooltip />} cursor={{ fill: 'rgba(31,74,69,0.06)' }} />
                <Bar
                  dataKey="averageAttentionSeconds"
                  fill="#1f4a45"
                  radius={[0, 8, 8, 0]}
                  barSize={Math.min(22, Math.max(12, Math.floor(ROW_PX * 0.55)))}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {hiddenCount > 0 ? (
            <p className="border-t border-[var(--line)] px-2 py-2 text-center text-xs text-[var(--muted)]">
              +{hiddenCount} more section{hiddenCount === 1 ? '' : 's'} with lower attention not
              shown
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
