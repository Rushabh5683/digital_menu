import { ChevronDown, Info, MapPin, Sparkles, UtensilsCrossed } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';
import { getMenuStats } from '../lib/menuUtils.js';

const DESC_LIMIT = 100;

function StatChip({ label, value }) {
  return (
    <div className="guest-stat-chip flex min-w-0 flex-col rounded-xl border border-[var(--g-line-strong)] bg-[var(--g-bg-elevated)] px-3 py-2">
      <span className="guest-menu-label text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
      <span className="guest-menu-label mt-0.5 text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Luxury restaurant brand header — editorial glass card, rich atmosphere.
 */
export function GuestHero({
  restaurant,
  tableLabel,
  categories = [],
  onOpenInfo,
  onSelectCategory,
}) {
  const { categoryCount, dishCount } = getMenuStats(categories);
  const logoSrc = resolveMediaUrl(restaurant.logo || restaurant.logoUrl || '');

  const rawDescription = restaurant.description?.trim() || '';
  const fallbackTagline =
    'Seasonal ingredients, crafted with care — browse the menu and order from your table.';
  const tagline = rawDescription || fallbackTagline;
  const isLong = tagline.length > DESC_LIMIT;
  const displayText = !isLong ? tagline : `${tagline.slice(0, DESC_LIMIT).trim()}…`;

  return (
    <section className="guest-hero guest-brand-hero relative mx-auto w-full max-w-lg overflow-hidden text-[var(--g-ink)]">
      {/* Rich atmospheric layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="guest-hero-mesh absolute inset-0" aria-hidden />
        {logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            aria-hidden
            className="guest-hero-watermark absolute left-1/2 top-[42%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.14] sm:h-72 sm:w-72"
          />
        ) : null}
        <div className="absolute -left-24 -top-20 h-80 w-80 rounded-full bg-[#D4AF37]/22 blur-[90px]" />
        <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-[#C9A227]/14 blur-[70px]" />
        <div className="absolute bottom-0 left-1/2 h-40 w-[120%] -translate-x-1/2 rounded-[100%] bg-[#efe6d8]/90 blur-2xl" />
        <div className="guest-hero-noise absolute inset-0 opacity-[0.05]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-[var(--g-bg-deep)]" />
      </div>

      <div className="relative px-4 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--g-line)] bg-[var(--g-bg-elevated)] px-3 py-1.5">
            <Sparkles size={12} className="text-[var(--g-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-accent)]">
              Welcome
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenInfo}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--g-line-strong)] bg-[var(--g-bg-elevated)] text-[var(--g-ink-soft)] backdrop-blur-md transition-all hover:border-[var(--g-accent)]/30 hover:text-[var(--g-ink)] active:scale-95"
            aria-label="Restaurant information"
          >
            <Info size={17} strokeWidth={2} />
          </button>
        </div>

        {/* Brand card — fills the hero */}
        <div className="guest-brand-card menu-fade-up mt-5 overflow-hidden rounded-[1.35rem] border border-[var(--g-line-strong)] bg-[var(--g-bg-card)] p-4 shadow-[var(--g-shadow-hero)] backdrop-blur-xl sm:p-5">
          <div className="flex gap-4">
            <div className="guest-logo-frame relative flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--g-accent)]/35 bg-white p-2.5 shadow-[0_0_30px_rgba(212,175,55,0.16)] sm:h-20 sm:w-20">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--g-accent)]/10 to-transparent" />
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="relative h-full w-full object-contain"
                />
              ) : (
                <span className="guest-hero-title text-3xl font-bold text-[var(--g-accent)]">
                  {(restaurant.name || 'R').slice(0, 1)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="guest-menu-label text-[11px] font-semibold uppercase tracking-[0.16em] opacity-90">
                Dine-in experience
              </p>
              <h1 className="guest-hero-title mt-1 text-[1.65rem] font-bold leading-[1.1] tracking-tight text-[var(--g-ink)] sm:text-[1.85rem]">
                {restaurant.name}
              </h1>
              {tableLabel ? (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--g-accent)]/25 bg-[var(--g-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--g-accent-bright)]">
                  <MapPin size={11} className="shrink-0" />
                  {tableLabel}
                </span>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--g-accent)]/25 bg-[var(--g-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--g-accent-bright)]">
                  <UtensilsCrossed size={11} />
                  Table service
                </span>
              )}
            </div>
          </div>

          {categoryCount > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatChip label="Sections" value={categoryCount} />
              <StatChip label="Dishes" value={dishCount} />
              <StatChip label="Service" value="Dine-in" />
            </div>
          ) : null}

          <div className="guest-gold-rule my-4" aria-hidden />

          <p className="text-[14px] leading-relaxed text-[var(--g-ink-soft)]">
            {displayText}
            {isLong ? (
              <button
                type="button"
                onClick={() => onOpenInfo?.()}
                className="ml-1 font-semibold text-[var(--g-accent-bright)] underline-offset-2 hover:underline"
              >
                Read more
              </button>
            ) : null}
          </p>

          {categories.length > 0 ? (
            <div className="mt-4 -mx-1">
              <p className="guest-menu-label mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                On the menu
              </p>
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelectCategory?.(category.id)}
                    className="guest-pill-sm shrink-0 snap-start border border-[var(--g-line)] bg-[var(--g-bg-elevated)] text-[var(--g-ink-soft)] transition-all hover:border-[var(--g-accent-deep)]/35 hover:text-[var(--g-ink)] active:scale-[0.97]"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center">
          <ChevronDown size={18} className="guest-scroll-cue text-[var(--g-muted)]" aria-hidden />
        </div>
      </div>
    </section>
  );
}

const LOVED_TAG = /best|must.?try|popular|loved|signature|chef|special|recommended/;

/**
 * Guest favourites rail — most selected dishes from live analytics.
 * Returns [] when there is not enough selection data yet.
 */
export function pickMostSelectedDishes(guestFavourites = [], limit = 3) {
  const cap = Math.min(Math.max(1, limit), 3);
  return (guestFavourites || [])
    .filter((dish) => dish?.id && dish.isAvailable !== false && (dish.selectionCount || 0) > 0)
    .slice(0, cap);
}

/** @deprecated Tag-based curation — kept for reference; menu now uses pickMostSelectedDishes. */
export function pickFeaturedDishes(categories, limit = 3) {
  const cap = Math.min(Math.max(1, limit), 3);
  const all = [];
  for (const category of categories || []) {
    for (const dish of category.dishes || []) {
      if (!dish?.isAvailable) continue;
      all.push(dish);
    }
  }

  if (all.length === 0) return [];

  const isLoved = (dish) =>
    (dish.dietaryTags || []).some((tag) => LOVED_TAG.test(String(tag).toLowerCase()));

  const loved = all.filter(isLoved);
  if (loved.length > 0) {
    return loved
      .sort((a, b) => {
        const ai = a.imageUrl ? 1 : 0;
        const bi = b.imageUrl ? 1 : 0;
        return bi - ai || String(a.name).localeCompare(String(b.name));
      })
      .slice(0, cap);
  }

  const withImage = all.filter((dish) => dish.imageUrl);
  const pool = withImage.length > 0 ? withImage : all;
  return pool.slice(0, cap);
}

export function buildDishCategoryMap(categories) {
  const map = {};
  for (const category of categories || []) {
    for (const dish of category.dishes || []) {
      map[dish.id] = category.id;
    }
  }
  return map;
}
