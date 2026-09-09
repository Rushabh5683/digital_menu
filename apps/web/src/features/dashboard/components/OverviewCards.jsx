import { Clock3, Eye, Layers3, LogOut, Utensils } from 'lucide-react';
import { formatNumber, formatRate, formatSeconds } from '../lib/format.js';

function Card({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
          <p
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {value}
          </p>
          {hint ? <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-[var(--teal)]/10 p-2.5 text-[var(--teal)]">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

export function OverviewCards({ overview }) {
  const exitRate = overview?.menuExitMetrics?.menuExitRate;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        icon={Eye}
        label="Total Menu Sessions"
        value={formatNumber(overview?.totalMenuSessions ?? 0)}
        hint="Anonymous browsing sessions"
      />
      <Card
        icon={Clock3}
        label="Average Session Time"
        value={formatSeconds(overview?.averageSessionDurationSeconds)}
        hint="Completed sessions only"
      />
      <Card
        icon={Layers3}
        label="Most Attended Section"
        value={overview?.highestAttentionCategory?.name || '—'}
        hint={
          overview?.highestAttentionCategory
            ? `${formatSeconds(overview.highestAttentionCategory.averageAttentionSeconds)} avg`
            : 'No section attention yet'
        }
      />
      <Card
        icon={Utensils}
        label="Most Attended Dish"
        value={overview?.highestAttentionDish?.name || '—'}
        hint={
          overview?.highestAttentionDish
            ? `${formatSeconds(overview.highestAttentionDish.averageAttentionSeconds)} avg`
            : 'No dish attention yet'
        }
      />
      <Card
        icon={LogOut}
        label="Menu exits"
        value={formatNumber(overview?.menuExitMetrics?.menuExitCount ?? 0)}
        hint={
          exitRate != null
            ? `${formatRate(exitRate)} of sessions · browse signal`
            : 'Leave events when guests exit the menu'
        }
      />
    </section>
  );
}
