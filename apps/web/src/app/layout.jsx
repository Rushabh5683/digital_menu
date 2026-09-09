import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Activity } from 'lucide-react';

const linkClass = ({ isActive }) =>
  [
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-black/90 text-[var(--color-paper)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
  ].join(' ');

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Digital Menu</p>
          <h1
            className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Attention Intelligence
          </h1>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            <LayoutGrid size={16} />
            Home
          </NavLink>
          <NavLink to="/health" className={linkClass}>
            <Activity size={16} />
            API Health
          </NavLink>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-black/10 pt-4 text-sm text-[var(--color-muted)]">
        Demo foundation — menu, tracking, and dashboard come next.
      </footer>
    </div>
  );
}
