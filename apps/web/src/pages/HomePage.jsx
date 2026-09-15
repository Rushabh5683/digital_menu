import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, UserRoles } from '../features/auth/AuthContext.jsx';

export function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  const staffPath =
    user?.role === UserRoles.SUPER_ADMIN
      ? '/superadmin'
      : user?.role === UserRoles.RESTAURANT_ADMIN
        ? '/admin'
        : '/login';

  return (
    <section className="w-full min-w-0 max-w-2xl">
      <p className="text-sm font-medium text-[var(--color-accent)]">Digital Menu platform</p>
      <h2
        className="mt-3 break-words text-3xl leading-tight tracking-tight sm:text-5xl"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Browse the menu. See the attention.
      </h2>
      <p className="mt-5 text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
        Customers stay anonymous. Staff sign in with role-based access — platform super admins and
        restaurant admins each see only what they should.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/menu/saffron-court"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] transition hover:bg-black"
        >
          Customer menu
          <ArrowRight size={16} />
        </Link>
        {!isLoading && isAuthenticated ? (
          <Link
            to={staffPath}
            className="inline-flex items-center gap-2 rounded-md border border-black/15 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-black/5"
          >
            Open staff console
          </Link>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md border border-black/15 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-black/5"
          >
            Staff sign in
          </Link>
        )}
        <Link
          to="/health"
          className="inline-flex items-center gap-2 rounded-md border border-black/15 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-black/5"
        >
          API health
        </Link>
      </div>
    </section>
  );
}
