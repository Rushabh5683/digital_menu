import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, formatRate, formatSeconds } from '../lib/format.js';

const COLORS = {
  views: '#c9a227',
  selections: '#2d7a6e',
  ordered: '#1f4a45',
};

const MAX_VISIBLE_DISHES = 20;
const DISH_COL_PX = 72;

function truncateLabel(name = '', max = 14) {
  const text = String(name);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function DishFunnelTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="max-w-[16rem] rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm shadow-lg">
      <p className="font-semibold text-[var(--ink)]">{row.fullName}</p>
      {row.categoryName ? (
        <p className="text-[11px] text-[var(--muted)]">{row.categoryName}</p>
      ) : null}
      <div className="mt-2 space-y-1 text-[12px] text-[var(--muted)]">
        <p>
          Views: <span className="font-semibold text-[var(--ink)]">{formatNumber(row.views)}</span>
        </p>
        <p>
          Avg Attention:{' '}
          <span className="font-semibold text-[var(--ink)]">
            {formatSeconds(row.averageAttentionSeconds)}
          </span>
        </p>
        <p>
          Selections:{' '}
          <span className="font-semibold text-[var(--ink)]">{formatNumber(row.selections)}</span>
        </p>
        <p>
          Sel. Rate:{' '}
          <span className="font-semibold text-[var(--ink)]">{formatRate(row.selectionRate)}</span>
        </p>
        <p>
          Ordered:{' '}
          <span className="font-semibold text-[var(--ink)]">{formatNumber(row.ordered)}</span>
        </p>
        <p>
          Order Rate:{' '}
          <span className="font-semibold text-[var(--ink)]">{formatRate(row.orderRate)}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Vertical grouped bars for dish funnel (different UI from section attention chart).
 * Hover shows Views, Avg Attention, Selections, Sel. Rate, Ordered, Order Rate.
 */
export function DishAttentionTable({ dishes }) {
  const ranked = [...dishes]
    .filter(
      (dish) =>
        dish.totalViews > 0 ||
        dish.totalAttentionSeconds > 0 ||
        dish.selectionCount > 0 ||
        (dish.orderedQuantity || 0) > 0,
    )
    .sort(
      (a, b) =>
        (b.orderedQuantity || 0) - (a.orderedQuantity || 0) ||
        b.averageAttentionSeconds - a.averageAttentionSeconds ||
        b.totalViews - a.totalViews,
    );

  const totalDishes = ranked.length;
  const visible = ranked.slice(0, MAX_VISIBLE_DISHES);
  const hiddenCount = Math.max(0, totalDishes - visible.length);

  const data = visible.map((dish) => ({
    name: truncateLabel(dish.name),
    fullName: dish.name,
    categoryName: dish.categoryName || '',
    views: Number(dish.totalViews) || 0,
    selections: Number(dish.selectionCount) || 0,
    ordered: Number(dish.orderedQuantity) || 0,
    averageAttentionSeconds: Number(dish.averageAttentionSeconds) || 0,
    selectionRate: Number(dish.selectionRate) || 0,
    orderRate: Number(dish.orderRate) || 0,
  }));

  const chartMinWidth = Math.max(480, data.length * DISH_COL_PX);

  return (
    <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
            Dishes
          </p>
          <h2 className="mt-1 text-2xl text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            Attention → Order
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Grouped by dish — hover a bar for views, attention, rates, and orders.
            {totalDishes > MAX_VISIBLE_DISHES
              ? ` Showing top ${MAX_VISIBLE_DISHES} of ${totalDishes} dishes.`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 text-[var(--ink-soft)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.views }} />
            Views
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--ink-soft)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.selections }} />
            Selections
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--ink-soft)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.ordered }} />
            Ordered
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl bg-[var(--surface)] text-sm text-[var(--muted)]">
          No dish attention or orders yet.
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto">
          <div className="h-[22rem] sm:h-[26rem]" style={{ minWidth: chartMinWidth }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 12, right: 8, left: 0, bottom: 48 }}
                barCategoryGap="18%"
                barGap={3}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,31,28,0.08)" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={60}
                  stroke="rgba(15,31,28,0.35)"
                  fontSize={11}
                  tickMargin={6}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="rgba(15,31,28,0.35)"
                  fontSize={12}
                  width={36}
                />
                <Tooltip
                  content={<DishFunnelTooltip />}
                  cursor={{ fill: 'rgba(201,162,39,0.08)' }}
                />
                <Bar
                  dataKey="views"
                  name="Views"
                  fill={COLORS.views}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="selections"
                  name="Selections"
                  fill={COLORS.selections}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="ordered"
                  name="Ordered"
                  fill={COLORS.ordered}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {hiddenCount > 0 ? (
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              +{hiddenCount} more dish{hiddenCount === 1 ? '' : 'es'} not shown
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
