import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const nav = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/restaurants', label: 'Restaurants', icon: Building2 },
  { to: '/superadmin/orders', label: 'Orders Overview', icon: ClipboardList },
  { to: '/superadmin/analytics', label: 'Platform Analytics', icon: BarChart3 },
  { to: '/superadmin/settings', label: 'Settings', icon: Settings },
];

const linkClass = ({ isActive }) =>
  [
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
    isActive
      ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
      : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
  ].join(' ');

export function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="h-dvh overflow-hidden bg-[var(--surface)] lg:grid lg:grid-cols-[260px_1fr]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--ink)]/40 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[260px] flex-col overflow-hidden bg-[var(--ink)] text-white transition-transform lg:static lg:h-full lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 0%, rgba(201,162,39,0.18), transparent 42%), radial-gradient(circle at 100% 100%, rgba(31,74,69,0.35), transparent 45%)',
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Digital Menu
            </p>
            <h1
              className="mt-1 text-xl tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Super Admin
            </h1>
            <p className="mt-1 text-xs text-white/50">Platform console</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} className="opacity-80" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--ink)] transition hover:brightness-105"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="z-30 shrink-0 border-b border-[var(--line)] bg-[var(--surface-elevated)]/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-[var(--line)] bg-white p-2 text-[var(--ink)] lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={16} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Platform owner
                </p>
                <p className="text-sm font-semibold text-[var(--ink)]">Restaurant network control</p>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--ink)]">{user?.name}</p>
              <p className="text-xs text-[var(--muted)]">SUPER_ADMIN</p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
