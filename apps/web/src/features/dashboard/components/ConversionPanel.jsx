import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AttentionOrderComparison } from './AttentionOrderComparison.jsx';
import { ConsiderationFunnel } from './ConsiderationFunnel.jsx';

/**
 * Secondary conversion metrics — orders and funnel, de-emphasized on intelligence dashboard.
 */
export function ConversionPanel({ funnel, orderSummary, dishes = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Conversion & orders</p>
          <p className="text-xs text-[var(--muted)]">
            Optional — selection-to-order path for operational follow-up
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[var(--muted)] transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="space-y-6 border-t border-[var(--line)] px-5 pb-5 pt-4">
          <ConsiderationFunnel funnel={funnel} orderSummary={orderSummary} />
          <AttentionOrderComparison dishes={dishes} />
        </div>
      ) : null}
    </section>
  );
}
