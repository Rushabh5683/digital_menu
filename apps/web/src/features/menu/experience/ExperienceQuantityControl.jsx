import { Minus, Plus } from 'lucide-react';

/**
 * Experience-menu add control: "+ Add" → stepper (− | qty | +).
 */
export function ExperienceQuantityControl({
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  id,
}) {
  const qty = Number(quantity) || 0;

  if (qty > 0) {
    return (
      <div
        id={id}
        className="ml-auto inline-flex h-8 items-center overflow-hidden rounded-full border border-stone-900 bg-stone-950 text-white shadow-sm"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDecrement?.();
          }}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-white/90 transition hover:bg-white/10 active:scale-95"
          aria-label="Decrease quantity"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
        <span className="min-w-[1.25rem] px-0.5 text-center text-[11px] font-semibold tabular-nums tracking-wide">
          {qty}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIncrement?.();
          }}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-white/90 transition hover:bg-white/10 active:scale-95"
          aria-label="Increase quantity"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  return (
    <button
      id={id}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onAdd?.();
      }}
      className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full bg-stone-950 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white transition-colors hover:bg-stone-800 active:scale-[0.98]"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" />
      <span>Add</span>
    </button>
  );
}
