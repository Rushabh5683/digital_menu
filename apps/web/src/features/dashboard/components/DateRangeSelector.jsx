import { CalendarRange } from 'lucide-react';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
];

export function DateRangeSelector({ value, onChange }) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--line)] bg-white/80 p-1 shadow-sm sm:gap-2">
      <span className="hidden items-center gap-1 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] sm:inline-flex">
        <CalendarRange size={14} />
        Range
      </span>
      {PRESETS.map((preset) => {
        const active = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={[
              'rounded-xl px-2.5 py-1.5 text-sm font-semibold transition sm:px-3',
              active
                ? 'bg-[var(--ink)] text-[var(--surface-elevated)]'
                : 'text-[var(--ink-soft)] hover:bg-[var(--ink)]/5',
            ].join(' ')}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
