import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isRestaurantStaffRole, useAuth, UserRoles } from './AuthContext.jsx';

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-8 py-10 text-center shadow-[0_18px_40px_-28px_rgba(15,31,28,0.45)]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-[var(--muted)]">Checking your session…</p>
      </div>
    </div>
  );
}

export function RequireAuth({ roles, children }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    const fallback =
      user.role === UserRoles.SUPER_ADMIN
        ? '/superadmin'
        : isRestaurantStaffRole(user.role)
          ? user.role === UserRoles.RESTAURANT_CAPTAIN
            ? '/admin/orders'
            : '/admin'
          : '/login';
    return <Navigate to={fallback} replace />;
  }

  return children || <Outlet />;
}

/**
 * Restaurant admin or captain workspace. Ownership comes from the session.
 */
export function RequireRestaurantAdmin() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role === UserRoles.SUPER_ADMIN) {
    return <Navigate to="/superadmin" replace />;
  }

  if (!isRestaurantStaffRole(user.role) || !user.restaurantId) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/** Owner-only pages (captains redirected to orders floor). */
export function RequireRestaurantOwner() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === UserRoles.RESTAURANT_CAPTAIN) {
    return <Navigate to="/admin/orders" replace />;
  }

  if (user.role !== UserRoles.RESTAURANT_ADMIN || !user.restaurantId) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireSuperAdmin() {
  return <RequireAuth roles={[UserRoles.SUPER_ADMIN]} />;
}

export function RedirectIfAuthenticated({ children }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;

  if (isAuthenticated && user) {
    const path = getRedirectPath(user);
    return <Navigate to={path} replace />;
  }

  return children;
}

function getRedirectPath(user) {
  if (user.role === UserRoles.SUPER_ADMIN) return '/superadmin';
  if (user.role === UserRoles.RESTAURANT_ADMIN && user.restaurantId) return '/admin';
  if (user.role === UserRoles.RESTAURANT_CAPTAIN && user.restaurantId) return '/admin/orders';
  return '/';
}
