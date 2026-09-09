import { GUEST_FILTER_PRESETS } from '../lib/menuUtils.js';

export function MenuFiltersSheet({ open, selected, onChange, onClose, availableTags = [] }) {
  if (!open) return null;

  const extras = availableTags
    .filter((tag) => {
      const lower = String(tag).toLowerCase();
      return !GUEST_FILTER_PRESETS.some((preset) =>
        preset.match.some((needle) => lower.includes(needle)),
      );
    })
    .slice(0, 6);

  const chips = [
    ...GUEST_FILTER_PRESETS.map((preset) => ({ id: preset.id, label: preset.label })),
    ...extras.map((tag) => ({ id: tag, label: tag })),
  ];

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center px-4 pb-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="drawer-backdrop absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div className="guest-sheet relative z-10 w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#12151B]/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:rounded-3xl">
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-4 h-1 w-10 rounded-full bg-white/20 mx-auto" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="mb-4 block text-[11px] font-semibold uppercase tracking-widest text-[#D4AF37]">
                Filters
              </span>
              <h2 className="text-xl font-medium tracking-tight text-white">Refine the menu</h2>
            </div>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="shrink-0 pt-6 text-sm font-medium text-[#E6C687] transition-colors hover:text-[#F3E5AB]"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {chips.map((chip) => {
              const active = selected.includes(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    onChange(
                      active
                        ? selected.filter((item) => item !== chip.id)
                        : [...selected, chip.id],
                    );
                  }}
                  className={[
                    'min-h-10 rounded-full px-4 py-2 text-xs transition-all active:scale-[0.97]',
                    active
                      ? 'border border-[#D4AF37]/50 bg-[#D4AF37]/15 font-semibold text-[#F3E5AB] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                      : 'border border-white/10 bg-[#181B22] font-medium text-gray-300 hover:border-white/20',
                  ].join(' ')}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E6C687] text-sm font-semibold text-black shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all hover:opacity-95 active:scale-[0.99]"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}
