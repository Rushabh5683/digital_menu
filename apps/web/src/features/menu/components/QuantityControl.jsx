import { Minus, Plus } from 'lucide-react';

export function QuantityControl({
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  disabled = false,
  size = 'md',
}) {
  const compact = size === 'sm';
  const mini = size === 'xs';

  if (quantity > 0) {
    return (
      <div
        className={[
          'guest-stepper inline-flex items-center border border-[var(--g-accent-deep)]/30 bg-white/95 shadow-[0_4px_16px_rgba(60,40,15,0.1)] backdrop-blur-md',
          mini ? 'h-6 rounded-full px-0.5' : compact ? 'h-8 rounded-lg' : 'h-10 rounded-lg',
        ].join(' ')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onDecrement?.();
          }}
          className={[
            'inline-flex items-center justify-center text-[var(--g-accent-deep)] transition active:scale-90',
            mini ? 'h-5 w-5' : compact ? 'h-8 w-7' : 'h-10 w-9',
          ].join(' ')}
          aria-label="Decrease quantity"
        >
          <Minus size={mini ? 11 : compact ? 13 : 15} strokeWidth={2.4} />
        </button>
        <span
          className={[
            'text-center font-semibold tabular-nums text-[var(--g-ink)]',
            mini ? 'min-w-4 text-[10px] leading-none' : compact ? 'min-w-5 text-xs' : 'min-w-5 text-sm',
          ].join(' ')}
        >
          {quantity}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onIncrement?.();
          }}
          className={[
            'inline-flex items-center justify-center text-[var(--g-accent-deep)] transition active:scale-90',
            mini ? 'h-5 w-5' : compact ? 'h-8 w-7' : 'h-10 w-9',
          ].join(' ')}
          aria-label="Increase quantity"
        >
          <Plus size={mini ? 11 : compact ? 13 : 15} strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onAdd?.();
      }}
      className={[
        'guest-add-btn inline-flex items-center justify-center border border-[var(--g-accent-deep)]/40 bg-white/95 font-semibold text-[var(--g-accent-deep)] shadow-sm backdrop-blur-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
        mini
          ? 'guest-add-btn--xs'
          : compact
            ? 'h-8 rounded-lg px-2.5 text-[13px]'
            : 'h-10 rounded-lg px-4 text-xs',
      ].join(' ')}
    >
      <span className="guest-add-btn__label">
        {mini ? '+ Add' : '+ ADD'}
      </span>
    </button>
  );
}
