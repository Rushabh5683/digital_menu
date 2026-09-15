import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { HealthPage } from '../pages/HealthPage.jsx';
import { MenuPage } from '../features/menu/MenuPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import {
  RequireRestaurantAdmin,
  RequireRestaurantOwner,
  RequireSuperAdmin,
} from '../features/auth/ProtectedRoute.jsx';
import { RestaurantAdminLayout } from '../features/admin/RestaurantAdminLayout.jsx';
import { AdminOverviewPage } from '../features/admin/AdminOverviewPage.jsx';
import { AdminAnalyticsPage } from '../features/admin/AdminAnalyticsPage.jsx';
import { AdminCaptainsPage } from '../features/admin/AdminCaptainsPage.jsx';
import {
  AdminCategoriesPage,
  AdminDayEndPage,
  AdminDishesPage,
  AdminMenuPage,
  AdminOrdersPage,
  AdminQrCodesPage,
  AdminReportsPage,
  AdminSettingsPage,
  AdminStaffAppreciationPage,
  AdminTablesPage,
} from '../features/admin/AdminSectionPages.jsx';
import { AdminOrderEditorPage } from '../features/admin/AdminOrderEditorPage.jsx';
import { SuperAdminLayout } from '../features/super/SuperAdminLayout.jsx';
import { SuperAdminHomePage } from '../features/super/SuperAdminHomePage.jsx';
import { SuperAdminRestaurantsPage } from '../features/super/SuperAdminRestaurantsPage.jsx';
import { SuperAdminRestaurantDetailPage } from '../features/super/SuperAdminRestaurantDetailPage.jsx';
import {
  SuperAdminAnalyticsPage,
  SuperAdminOrdersPage,
  SuperAdminSettingsPage,
} from '../features/super/SuperAdminPlaceholderPages.jsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/menu/:restaurantSlug" element={<MenuPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/superadmin" element={<RequireSuperAdmin />}>
          <Route element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminHomePage />} />
            <Route path="restaurants" element={<SuperAdminRestaurantsPage />} />
            <Route path="restaurants/:restaurantId" element={<SuperAdminRestaurantDetailPage />} />
            <Route path="orders" element={<SuperAdminOrdersPage />} />
            <Route path="analytics" element={<SuperAdminAnalyticsPage />} />
            <Route path="settings" element={<SuperAdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="/admin" element={<RequireRestaurantAdmin />}>
          <Route element={<RestaurantAdminLayout />}>
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:orderId" element={<AdminOrderEditorPage />} />
            <Route path="staff-appreciation" element={<AdminStaffAppreciationPage />} />

            <Route element={<RequireRestaurantOwner />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="captains" element={<AdminCaptainsPage />} />
              <Route path="day-end" element={<AdminDayEndPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="dishes" element={<AdminDishesPage />} />
              <Route path="tables" element={<AdminTablesPage />} />
              <Route path="qr-codes" element={<AdminQrCodesPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Legacy slug URL → auth-bound /admin */}
        <Route path="/admin/:restaurantSlug/*" element={<Navigate to="/admin" replace />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
