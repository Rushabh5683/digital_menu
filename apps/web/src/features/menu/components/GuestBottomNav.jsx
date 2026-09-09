import {
  ClipboardList,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { motion } from 'framer-motion';

/** Five equal slots — Cart is the true center column. */
function buildTabs(hasActiveOrder) {
  return [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'menu', label: 'Menu', icon: LayoutGrid },
    { id: 'cart', label: 'Cart', icon: ShoppingBag, elevated: true },
    { id: 'more', label: 'More', icon: MoreHorizontal },
    hasActiveOrder
      ? { id: 'order', label: 'Order', icon: ClipboardList }
      : { id: 'search', label: 'Search', icon: Search },
  ];
}

function NavTab({ id, label, icon: Icon, active, badge, onNavigate }) {
  const isActive = active === id;

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(id)}
      className={[
        'guest-nav-item flex w-full flex-col items-center justify-center gap-1 py-1 transition-colors',
        isActive
          ? 'font-medium text-[var(--g-accent-deep)]'
          : 'text-[var(--g-muted)] hover:text-[var(--g-ink)]',
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
      aria-label={badge ? `${label}, ${badge} items` : label}
    >
      <span className="relative inline-flex">
        <Icon size={18} strokeWidth={isActive ? 2.3 : 1.85} />
        {badge ? (
          <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--g-accent-deep)] px-0.5 text-[8px] font-bold text-[#fffdf9]">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  );
}

function CartFab({ active, cartCount, onNavigate }) {
  const isActive = active === 'cart';

  return (
    <div className="relative -mt-6 flex w-full flex-col items-center justify-center">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => onNavigate?.('cart')}
        className="guest-float-fab flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#faf7f2] bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#1c1915] shadow-[0_0_24px_rgba(212,175,55,0.35)]"
        aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="relative inline-flex">
          <ShoppingBag size={22} strokeWidth={2.2} />
          {cartCount > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1c1915] px-0.5 text-[9px] font-bold text-[#F3E5AB]">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          ) : null}
        </span>
      </motion.button>
      <span
        className={[
          'mt-1 text-[10px] font-medium',
          isActive ? 'text-[var(--g-accent-deep)]' : 'text-[var(--g-muted)]',
        ].join(' ')}
      >
        Cart
      </span>
    </div>
  );
}

/**
 * Floating bottom nav — cream glass capsule with elevated Cart.
 * When a live table order exists, Search is replaced by Order.
 */
export function GuestBottomNav({
  active = 'home',
  cartCount = 0,
  hasActiveOrder = false,
  orderItemCount = 0,
  onNavigate,
}) {
  const tabs = buildTabs(hasActiveOrder);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 mx-auto w-[calc(100%-2rem)] max-w-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Guest navigation"
    >
      <div className="pointer-events-auto grid grid-cols-5 items-center justify-items-center rounded-full border border-[var(--g-line)] bg-[#fffdf9]/92 px-2 py-2 shadow-[0_18px_40px_rgba(60,40,15,0.14)] backdrop-blur-2xl">
        {tabs.map((tab) =>
          tab.elevated ? (
            <CartFab
              key={tab.id}
              active={active}
              cartCount={cartCount}
              onNavigate={onNavigate}
            />
          ) : (
            <NavTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={active}
              badge={tab.id === 'order' && orderItemCount > 0 ? orderItemCount : 0}
              onNavigate={onNavigate}
            />
          ),
        )}
      </div>
    </nav>
  );
}
