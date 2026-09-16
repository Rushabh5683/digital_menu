import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';

export function RestaurantHeader({ restaurant, tableLabel, menuName }) {
  const logoSrc = resolveMediaUrl(restaurant.logo || restaurant.logoUrl || '');

  return (
    <header className="guest-hero relative overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 20%, rgba(201,162,39,0.28), transparent 50%),
            radial-gradient(ellipse 70% 50% at 90% 0%, rgba(255,255,255,0.08), transparent 45%),
            linear-gradient(165deg, #0a1412 0%, #122421 42%, #1a322d 100%)
          `,
        }}
      />

      {logoSrc ? (
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
          <img
            src={logoSrc}
            alt=""
            className="h-full w-full scale-110 object-cover blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-[#0a1412]" />
        </div>
      ) : null}

      <div className="relative mx-auto max-w-lg px-5 pb-14 pt-7 menu-fade-up">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-[var(--accent)]">
                {(restaurant.name || 'R').slice(0, 1)}
              </span>
            )}
          </div>
          {tableLabel ? (
            <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
              {tableLabel}
            </p>
          ) : null}
        </div>

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
          {menuName || 'Premium dining'}
        </p>
        <h1
          className="mt-2 max-w-[14ch] text-[2.55rem] leading-[1.02] tracking-tight text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {restaurant.name}
        </h1>
        {restaurant.description ? (
          <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-white/70">
            {restaurant.description}
          </p>
        ) : (
          <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-white/70">
            Browse the menu, add dishes, and order from your table.
          </p>
        )}
      </div>
    </header>
  );
}
