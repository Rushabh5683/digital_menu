import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Minus, Plus, X } from 'lucide-react';
import {
  formatDietaryTag,
  formatPrice,
  getDishDietType,
  getSpiceLevel,
} from '../lib/menuUtils.js';
import { trackDishInfoViewed } from '../../analytics/analytics.js';
import { DishImage } from './DishImage.jsx';

function DietBadge({ type }) {
  if (!type) return null;
  const isVeg = type === 'veg' || type === 'vegan';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--g-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--g-ink-soft)]">
      <span
        className={[
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border',
          isVeg ? 'border-[var(--g-veg)]' : 'border-[var(--g-nonveg)]',
        ].join(' ')}
      >
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            isVeg ? 'bg-[var(--g-veg)]' : 'bg-[var(--g-nonveg)]',
          ].join(' ')}
        />
      </span>
      {type === 'vegan' ? 'Vegan' : isVeg ? 'Veg' : 'Non-veg'}
    </span>
  );
}

function SpiceMeter({ level }) {
  if (!level) return null;
  return (
    <div>
      <h3 className="guest-menu-label text-xs font-semibold uppercase tracking-[0.14em]">
        Spice level
      </h3>
      <div className="mt-2 flex items-center gap-1.5">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={[
              'h-2 w-8 rounded-full',
              step <= level ? 'bg-red-400' : 'bg-white/10',
            ].join(' ')}
          />
        ))}
        <span className="ml-1 text-xs font-semibold text-gray-500">
          {level === 1 ? 'Mild' : level === 2 ? 'Medium' : 'Hot'}
        </span>
      </div>
    </div>
  );
}

function SimilarDishRow({ dishes, categoryId, onOpen }) {
  if (!dishes.length) return null;
  return (
    <div>
      <h3 className="guest-menu-label text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
        More in this section
      </h3>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {dishes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item, categoryId)}
            className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#1E232B] text-left transition active:scale-[0.98]"
          >
            <div className="relative h-24 w-full">
              <DishImage src={item.imageUrl} alt={item.name} fallbackLabel={item.name} />
            </div>
            <div className="p-2.5">
              <p className="guest-dish-title line-clamp-1 text-xs font-semibold text-white">{item.name}</p>
              <p className="mt-0.5 text-xs font-medium text-[#E6C687]">{formatPrice(item.price)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function buildDishInfoSections(dish, { similarCount = 0, spiceLevel = 0 } = {}) {
  const sections = ['description'];
  if (spiceLevel > 0) sections.push('spice');
  if ((dish?.dietaryTags || []).length > 0) sections.push('dietary');
  if ((dish?.ingredients || []).length > 0) sections.push('ingredients');
  if (similarCount > 0) sections.push('similar');
  return sections;
}

export function DishDetailDrawer({
  dish,
  categoryId,
  open,
  onClose,
  cartQuantity = 0,
  onAddToCart,
  similarDishes = [],
  onOpenDish,
}) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [titlePinned, setTitlePinned] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open || !dish?.id) return undefined;

    setQty(Math.max(1, cartQuantity || 1));
    setJustAdded(false);
    setTitlePinned(false);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    trackDishInfoViewed(dish, categoryId, {
      source: 'detail_drawer',
      sections: buildDishInfoSections(dish, {
        similarCount: similarDishes.length,
        spiceLevel: getSpiceLevel(dish),
      }),
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  // cartQuantity synced in a separate effect — must not re-fire detail analytics
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, dish, categoryId]);

  useEffect(() => {
    if (!open) return;
    setQty(Math.max(1, cartQuantity || 1));
  }, [open, cartQuantity]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !open) return undefined;
    const onScroll = () => setTitlePinned(node.scrollTop > 120);
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [open, dish?.id]);

  const diet = dish ? getDishDietType(dish) : null;
  const spice = dish ? getSpiceLevel(dish) : 0;

  function handleAdd() {
    if (!dish?.isAvailable) return;
    onAddToCart?.(dish, qty);
    setJustAdded(true);
    window.setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 700);
  }

  return (
    <AnimatePresence>
      {open && dish ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dish-detail-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="drawer-backdrop absolute inset-0 bg-[#1c1915]/35 backdrop-blur-sm"
            aria-label="Close dish details"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="guest-sheet relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--g-line)] bg-[#fffdf9] shadow-[0_28px_60px_rgba(60,40,15,0.2)] sm:rounded-[1.75rem]"
            initial={{ y: 48, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 36, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {titlePinned ? (
              <div className="guest-detail-sticky-title flex shrink-0 items-center justify-between gap-3 border-b border-[var(--g-line)] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur-xl">
                <div className="min-w-0">
                  <p className="guest-dish-title truncate text-sm font-semibold text-[var(--g-ink)]">{dish.name}</p>
                  <p className="text-xs font-medium text-[var(--g-accent-deep)]">{formatPrice(dish.price)}</p>
                </div>
                {cartQuantity > 0 ? (
                  <span className="shrink-0 rounded-full border border-[var(--g-accent-deep)]/30 bg-[var(--g-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--g-accent-deep)]">
                    {cartQuantity} in cart
                  </span>
                ) : null}
              </div>
            ) : null}

            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="relative h-56 shrink-0 overflow-hidden bg-[#efe8dc] sm:h-64">
                {dish.imageUrl ? (
                  <motion.div
                    className="h-full w-full"
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <DishImage src={dish.imageUrl} alt={dish.name} className="h-full w-full" />
                  </motion.div>
                ) : (
                  <div className="guest-img-fallback flex h-full w-full items-end p-5">
                    <span className="guest-dish-title text-2xl font-bold text-[var(--g-ink)]">{dish.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#fffdf9] via-transparent to-black/10" />
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[var(--g-ink)] shadow-md backdrop-blur"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
                {!titlePinned ? (
                  <div className="absolute bottom-4 left-5 right-5">
                    <p className="text-sm font-semibold text-[var(--g-accent-deep)]">{formatPrice(dish.price)}</p>
                    <h2
                      id="dish-detail-title"
                      className="guest-hero-title mt-1 text-[1.75rem] font-semibold leading-tight text-[var(--g-ink)]"
                    >
                      {dish.name}
                    </h2>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5 px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  <DietBadge type={diet} />
                  {(dish.dietaryTags || []).slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--g-accent-deep)]/25 bg-[var(--g-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--g-accent-deep)]"
                    >
                      {formatDietaryTag(tag)}
                    </span>
                  ))}
                </div>

                <p className="text-[15px] leading-relaxed text-[var(--g-ink-soft)]">
                  {dish.description || 'Prepared fresh for your table.'}
                </p>

                <SpiceMeter level={spice} />

                {(dish.ingredients || []).length > 0 ? (
                  <div>
                    <h3 className="guest-menu-label text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g-muted)]">
                      Ingredients
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {dish.ingredients.map((ingredient) => (
                        <li
                          key={ingredient}
                          className="rounded-xl border border-[var(--g-line)] bg-white px-2.5 py-1.5 text-sm text-[var(--g-ink-soft)]"
                        >
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <SimilarDishRow
                  dishes={similarDishes}
                  categoryId={categoryId}
                  onOpen={(item, catId) => onOpenDish?.(item, catId)}
                />
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-[var(--g-line)] bg-[#fffdf9] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {dish.isAvailable ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex h-11 items-center rounded-xl border border-[var(--g-line)] bg-white p-1">
                    <button
                      type="button"
                      className="flex h-9 w-10 items-center justify-center rounded-lg text-[var(--g-accent-deep)]"
                      onClick={() => setQty((value) => Math.max(1, value - 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-8 text-center text-sm font-bold text-[var(--g-ink)]">{qty}</span>
                    <button
                      type="button"
                      className="flex h-9 w-10 items-center justify-center rounded-lg text-[var(--g-accent-deep)]"
                      onClick={() => setQty((value) => Math.min(20, value + 1))}
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-[var(--g-muted)]">
                    {cartQuantity > 0 ? `${cartQuantity} in cart` : 'Add to your order'}
                  </p>
                </div>
              ) : null}

              <motion.button
                type="button"
                disabled={!dish.isAvailable || justAdded}
                onClick={handleAdd}
                whileTap={{ scale: 0.98 }}
                className={[
                  'flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition',
                  dish.isAvailable
                    ? justAdded
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#1c1915]'
                    : 'cursor-not-allowed bg-[var(--g-line)] text-[var(--g-muted)]',
                ].join(' ')}
              >
                {justAdded ? (
                  <>
                    <Check size={18} />
                    Added to order
                  </>
                ) : dish.isAvailable ? (
                  `Add to order · ${formatPrice(Number(dish.price) * qty)}`
                ) : (
                  'Currently unavailable'
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
