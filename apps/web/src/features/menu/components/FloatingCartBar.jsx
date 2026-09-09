import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '../lib/menuUtils.js';

/** Show as many names as fit the preview; remainder becomes an ellipsis. */
function buildItemsPreview(items = [], maxNames = 2) {
  const names = items
    .map((item) => String(item?.name || '').trim())
    .filter(Boolean);

  if (names.length === 0) return '';
  if (names.length <= maxNames) return names.join(' · ');
  return `${names.slice(0, maxNames).join(' · ')}…`;
}

/**
 * Cart pill — render inside the shared bottom dock (no own fixed position).
 */
export function FloatingCartBar({
  itemCount,
  total,
  items = [],
  hasOpenOrder = false,
  onOpen,
}) {
  if (itemCount <= 0) return null;

  const preview = buildItemsPreview(items, 2);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="flex w-full items-center justify-between gap-3 rounded-full border border-[#E8DFD3] bg-[#fffdf9]/95 px-4 py-2.5 text-left text-stone-900 shadow-[0_16px_40px_-12px_rgba(28,25,23,0.22)] backdrop-blur-md transition-all active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-900">
          {preview || `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
        </span>
        <span className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <span className="text-base font-bold tabular-nums text-[#9A7B4F]">
            {formatPrice(total)}
          </span>
          <span className="truncate text-[11px] font-medium text-stone-500">
            {hasOpenOrder
              ? 'Ready to add to your order'
              : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          </span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#9A7B4F] px-3.5 py-2 text-xs font-bold text-white">
        {hasOpenOrder ? 'Add to order' : 'View cart'}
        <ChevronRight size={14} />
      </span>
    </motion.button>
  );
}
