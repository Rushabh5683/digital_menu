import { useAuth } from '../auth/AuthContext.jsx';
import { DashboardPage } from '../dashboard/DashboardPage.jsx';
import { Navigate } from 'react-router-dom';

/**
 * Analytics view reuses the attention dashboard, bound to the authenticated restaurant.
 * Restaurant identity comes from auth — never from a free-typed slug.
 */
export function AdminAnalyticsPage() {
  const { user } = useAuth();
  const slug = user?.restaurant?.slug;

  if (!slug) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardPage restaurantSlugOverride={slug} embedded />;
}
