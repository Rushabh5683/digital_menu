import { useMemo, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChartColumn,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  QrCode,
  Settings,
  Table2,
  UserRound,
  UtensilsCrossed,
  X,
  HeartHandshake,
  ExternalLink,
  Layers3,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { useAuth, UserRoles } from '../auth/AuthContext.jsx';
import { staffMenuPreviewPath } from '../menu/lib/staffPreview.js';

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  {
    id: 'orders',
    label: 'Orders',
    icon: ClipboardList,
    children: [
      { to: '/admin/orders', label: 'Live Orders', icon: ClipboardList, end: true },
      { to: '/admin/day-end', label: 'Day End', icon: MoonStar },
      { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  { to: '/admin/staff-appreciation', label: 'Staff appreciation', icon: HeartHandshake },
  { to: '/admin/captains', label: 'Captains', icon: UserRound },
  {
    id: 'menu',
    label: 'Menu',
    icon: UtensilsCrossed,
    children: [
      { to: '/admin/menu', label: 'Menus', icon: UtensilsCrossed, end: true },
      { to: '/admin/categories', label: 'Categories', icon: Layers3 },
      { to: '/admin/dishes', label: 'Dishes', icon: Grid2x2 },
    ],
  },
  { to: '/admin/tables', label: 'Tables', icon: Table2 },
  { to: '/admin/qr-codes', label: 'QR Codes', icon: QrCode },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const captainNav = [
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, end: true },
  { to: '/admin/staff-appreciation', label: 'Staff appreciation', icon: HeartHandshake },
];

const linkClass = ({ isActive }) =>
  [
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
    isActive
      ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
      : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
  ].join(' ');

const childLinkClass = ({ isActive }) =>
  [
    'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition',
    isActive
      ? 'bg-white/12 text-white'
      : 'text-white/55 hover:bg-white/[0.06] hover:text-white',
  ].join(' ');

function NavItem({ item, onNavigate }) {
  const location = useLocation();
  const Icon = item.icon;
  const childActive = useMemo(() => {
    if (!item.children) return false;
    return item.children.some((child) => {
      if (child.end) {
        return location.pathname === child.to;
      }
      return (
        location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
      );
    });
  }, [item.children, location.pathname]);

  const ordersGroupActive =
    item.id === 'orders' && location.pathname.startsWith('/admin/orders/');

  const groupActive = childActive || ordersGroupActive;
  const [open, setOpen] = useState(() => Boolean(groupActive));

  if (item.children) {
    const expanded = open || groupActive;
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={[
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
            groupActive
              ? 'bg-white/10 text-white'
              : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
          ].join(' ')}
        >
          <Icon size={16} className="opacity-80" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            size={14}
            className={`opacity-70 transition ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {expanded ? (
          <div className="ml-2 space-y-0.5 border-l border-white/10 pl-2">
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end={child.end}
                  className={childLinkClass}
                  onClick={onNavigate}
                >
                  <ChildIcon size={14} className="opacity-75" />
                  {child.label}
                </NavLink>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
      <Icon size={16} className="opacity-80" />
      {item.label}
    </NavLink>
  );
}

export function RestaurantAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCaptain = user?.role === UserRoles.RESTAURANT_CAPTAIN;
  const nav = isCaptain ? captainNav : adminNav;

  const restaurantQuery = useQuery({
    queryKey: ['admin', 'restaurant'],
    queryFn: async () => {
      const payload = await api.getAdminRestaurant();
      return payload.restaurant;
    },
  });

  const restaurant = restaurantQuery.data || user?.restaurant;
  const slug = restaurant?.slug;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[var(--surface)] lg:grid lg:grid-cols-[var(--admin-sidebar-width)_1fr]"
    >
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--ink)]/20 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[var(--admin-sidebar-width)] max-w-[85vw] flex-col overflow-hidden bg-[var(--ink)] text-white transition-transform lg:static lg:h-full lg:max-w-none lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 0%, rgba(201,162,39,0.2), transparent 42%), radial-gradient(circle at 100% 100%, rgba(31,74,69,0.4), transparent 48%)',
        }}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                {isCaptain ? 'Captain console' : 'Restaurant console'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {restaurant?.logoUrl ? (
                    <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UtensilsCrossed size={18} className="text-white/70" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1
                    className="truncate text-lg tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {restaurant?.name || 'Your restaurant'}
                  </h1>
                  <div className="mt-1">
                    <SidebarStatusBadge status={restaurant?.status || 'PENDING'} />
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavItem
              key={item.id || item.to}
              item={item}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
            {isCaptain ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Captain
              </p>
            ) : null}
            <Button variant="accent" size="sm" className="mt-3 w-full" onClick={handleLogout}>
              <LogOut size={13} />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 shrink-0 border-b border-[var(--line)] bg-[var(--surface-elevated)]/90 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-[var(--line)] bg-white p-2.5 text-[var(--ink)] lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={16} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {restaurant?.name || 'Restaurant'}
                </p>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {isCaptain ? 'Floor orders' : 'Operations & Intelligence'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {slug && !isCaptain ? (
                <Link
                  to={staffMenuPreviewPath(slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-black/[0.02]"
                >
                  Customer menu
                  <ExternalLink size={12} />
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-8 [-webkit-overflow-scrolling:touch]">
          <Outlet context={{ restaurant }} />
        </main>
      </div>
    </div>
  );
}

const SIDEBAR_STATUS_STYLES = {
  ACTIVE: '!border-emerald-400/45 !bg-emerald-400/20 !text-emerald-200',
  INACTIVE: '!border-white/25 !bg-white/10 !text-white/75',
  PENDING: '!border-[var(--accent)]/45 !bg-[var(--accent)]/20 !text-[var(--accent)]',
};

function SidebarStatusBadge({ status }) {
  const key = String(status || 'PENDING').toUpperCase();
  return (
    <StatusBadge
      status={status}
      className={SIDEBAR_STATUS_STYLES[key] || SIDEBAR_STATUS_STYLES.PENDING}
    />
  );
}
