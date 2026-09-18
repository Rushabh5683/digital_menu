import { compressImageForUpload } from '../lib/compressImage.js';

// Empty = same-origin (/api via Vite proxy in local, or reverse proxy in prod).
// Staging split hosts: set VITE_API_BASE_URL=https://your-api.example.com
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AUTH_SKIP_REFRESH = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
]);

let refreshInFlight = null;

async function tryRefreshSession() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = new Error('Session expired. Please sign in again.');
      error.status = response.status;
      throw error;
    }

    return response.json().catch(() => ({ ok: true }));
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function request(path, options = {}, { retry = true } = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    ...(options.headers || {}),
  };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    !isFormData &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  // Let the browser set multipart boundary for FormData.
  if (isFormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (
    response.status === 401 &&
    retry &&
    !AUTH_SKIP_REFRESH.has(path) &&
    method !== 'HEAD'
  ) {
    try {
      await tryRefreshSession();
      return request(path, options, { retry: false });
    } catch {
      // Fall through to original 401 error below.
    }
  }

  if (!response.ok) {
    const message =
      (isJson && body && (body.message || body.error)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export const api = {
  getHealth() {
    return request('/api/health');
  },

  login(payload) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  refreshSession() {
    return request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  logout() {
    return request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getMe() {
    return request('/api/auth/me');
  },

  getAdminRestaurant() {
    return request('/api/admin/restaurant');
  },

  updateAdminRestaurant(payload) {
    return request('/api/admin/restaurant', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getAdminSetupStatus() {
    return request('/api/admin/setup');
  },

  async uploadAdminLogo(file) {
    const compressed = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append('logo', compressed);

    return request('/api/admin/uploads/logo', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  getAdminDashboard() {
    return request('/api/admin/dashboard');
  },

  getAdminStaffAppreciation() {
    return request('/api/admin/staff-appreciation');
  },

  getAdminSalesReport(params = {}) {
    return request(`/api/admin/reports/sales${toQuery(params)}`);
  },

  getAdminDayEnd(params = {}) {
    return request(`/api/admin/day-end${toQuery(params)}`);
  },

  closeAdminDayEnd(payload = {}) {
    return request('/api/admin/day-end/close', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  unlockAdminDayEnd(payload = {}) {
    return request('/api/admin/day-end/unlock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminOrderPayment(orderId, payload = {}) {
    return request(`/api/admin/orders/${encodeURIComponent(orderId)}/payment`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  listAdminOrders(params = {}) {
    return request(`/api/admin/orders${toQuery(params)}`);
  },

  listAdminCaptains() {
    return request('/api/admin/captains');
  },

  createAdminCaptain(payload) {
    return request('/api/admin/captains', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminCaptain(captainId, payload) {
    return request(`/api/admin/captains/${encodeURIComponent(captainId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteAdminCaptain(captainId) {
    return request(`/api/admin/captains/${encodeURIComponent(captainId)}`, {
      method: 'DELETE',
    });
  },

  deactivateAdminCaptain(captainId) {
    return request(`/api/admin/captains/${encodeURIComponent(captainId)}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  startAdminTableOrder({ tableId, tableNumber } = {}) {
    return request('/api/admin/orders', {
      method: 'POST',
      body: JSON.stringify({ tableId, tableNumber }),
    });
  },

  getAdminOrder(orderId) {
    return request(`/api/admin/orders/${encodeURIComponent(orderId)}`);
  },

  updateAdminOrderStatus(orderId, status, extras = {}) {
    return request(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...extras }),
    });
  },

  markAdminOrderBillPrinted(orderId) {
    return request(`/api/admin/orders/${encodeURIComponent(orderId)}/print`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getQzCertificate() {
    return request('/api/admin/qz/certificate');
  },

  signQzRequest(toSign) {
    return request('/api/admin/qz/sign', {
      method: 'POST',
      body: JSON.stringify({ request: String(toSign || '') }),
    });
  },

  addAdminOrderItems(orderId, items) {
    return request(`/api/admin/orders/${encodeURIComponent(orderId)}/items`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  updateAdminOrderItem(orderId, itemId, quantity) {
    return request(
      `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      },
    );
  },

  deleteAdminOrderItem(orderId, itemId) {
    return request(
      `/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'DELETE',
      },
    );
  },

  discardAdminEmptyOrder(orderId) {
    return request(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
  },

  listAdminMenus() {
    return request('/api/admin/menus');
  },

  getAdminMenu(menuId) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}`);
  },

  createAdminMenu(payload) {
    return request('/api/admin/menus', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminMenu(menuId, payload) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  publishAdminMenu(menuId) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}/publish`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  unpublishAdminMenu(menuId) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}/unpublish`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  deleteAdminMenu(menuId) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}`, {
      method: 'DELETE',
    });
  },

  createAdminCategory(menuId, payload) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}/categories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  bulkCreateAdminCategories(menuId, payload) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}/categories/bulk`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminCategory(categoryId, payload) {
    return request(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteAdminCategory(categoryId) {
    return request(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
    });
  },

  reorderAdminCategories(menuId, orderedIds) {
    return request(`/api/admin/menus/${encodeURIComponent(menuId)}/categories/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  listAdminDishes(params = {}) {
    return request(`/api/admin/dishes${toQuery(params)}`);
  },

  createAdminDish(categoryId, payload) {
    return request(`/api/admin/categories/${encodeURIComponent(categoryId)}/dishes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminDish(dishId, payload) {
    return request(`/api/admin/dishes/${encodeURIComponent(dishId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteAdminDish(dishId) {
    return request(`/api/admin/dishes/${encodeURIComponent(dishId)}`, {
      method: 'DELETE',
    });
  },

  reorderAdminDishes(categoryId, orderedIds) {
    return request(`/api/admin/categories/${encodeURIComponent(categoryId)}/dishes/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  async uploadAdminDishImage(file) {
    const compressed = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append('image', compressed);
    return request('/api/admin/uploads/dish', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  listAdminTables() {
    return request('/api/admin/tables');
  },

  createAdminTable(payload) {
    return request('/api/admin/tables', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  bulkCreateAdminTables(payload) {
    return request('/api/admin/tables/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAdminTable(tableId, payload) {
    return request(`/api/admin/tables/${encodeURIComponent(tableId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  activateAdminTable(tableId) {
    return request(`/api/admin/tables/${encodeURIComponent(tableId)}/activate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  deactivateAdminTable(tableId) {
    return request(`/api/admin/tables/${encodeURIComponent(tableId)}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  deleteAdminTable(tableId) {
    return request(`/api/admin/tables/${encodeURIComponent(tableId)}`, {
      method: 'DELETE',
    });
  },

  getAdminTableQr(tableId) {
    return request(`/api/admin/tables/${encodeURIComponent(tableId)}/qr`);
  },

  listAdminQrCodes() {
    return request('/api/admin/qr-codes');
  },

  generateAdminTableQr(tableId) {
    return request(`/api/admin/qr-codes/${encodeURIComponent(tableId)}/generate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  generateAllAdminQrCodes() {
    return request('/api/admin/qr-codes/generate-all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  listRestaurantTables(slug) {
    return request(`/api/restaurants/${encodeURIComponent(slug)}/tables`);
  },

  getRestaurant(slug) {
    return request(`/api/restaurants/${encodeURIComponent(slug)}`);
  },

  getRestaurantMenu(slug) {
    return request(`/api/restaurants/${encodeURIComponent(slug)}/menu`);
  },

  getSuperDashboard() {
    return request('/api/superadmin/dashboard');
  },

  listSuperRestaurants(params = {}) {
    return request(`/api/superadmin/restaurants${toQuery(params)}`);
  },

  /** @deprecated use listSuperRestaurants */
  listRestaurants(params = {}) {
    return this.listSuperRestaurants(params);
  },

  getSuperRestaurant(id) {
    return request(`/api/superadmin/restaurants/${encodeURIComponent(id)}`);
  },

  getSuperRestaurantSalesReport(id, params = {}) {
    return request(
      `/api/superadmin/restaurants/${encodeURIComponent(id)}/reports/sales${toQuery(params)}`,
    );
  },

  getSuperRestaurantOrder(restaurantId, orderId) {
    return request(
      `/api/superadmin/restaurants/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}`,
    );
  },

  createSuperRestaurant(payload) {
    return request('/api/superadmin/restaurants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadSuperLogo(file) {
    const compressed = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append('logo', compressed);

    return request('/api/superadmin/uploads/logo', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  updateSuperRestaurant(id, payload) {
    return request(`/api/superadmin/restaurants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateSuperRestaurantAdmin(id, payload) {
    return request(`/api/superadmin/restaurants/${encodeURIComponent(id)}/admin`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateSuperRestaurantStatus(id, status) {
    return request(`/api/superadmin/restaurants/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteSuperRestaurant(id) {
    return request(`/api/superadmin/restaurants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  startSession(payload) {
    return request('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  placeOrder(payload) {
    return request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addOrderItems(orderId, payload) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getOpenOrder(params = {}) {
    return request(`/api/orders/open${toQuery(params)}`);
  },

  getMyOrder(params = {}) {
    return request(`/api/orders/mine${toQuery(params)}`);
  },

  trackOrder(orderId, params = {}) {
    return request(
      `/api/orders/${encodeURIComponent(orderId)}/track${toQuery(params)}`,
    );
  },

  getOrder(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}`);
  },

  listRestaurantOrders(restaurantId, params = {}) {
    return request(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/orders${toQuery(params)}`,
    );
  },

  updateOrderStatus(orderId, status) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  endSession(payload) {
    return request('/api/sessions/end', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  postAnalyticsEvents(payload, { keepalive = false } = {}) {
    return request('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive,
    });
  },

  getAnalyticsOverview(restaurantId, params = {}) {
    return request(`/api/analytics/overview/${encodeURIComponent(restaurantId)}${toQuery(params)}`);
  },

  getAnalyticsCategories(restaurantId, params = {}) {
    return request(`/api/analytics/categories/${encodeURIComponent(restaurantId)}${toQuery(params)}`);
  },

  getAnalyticsDishes(restaurantId, params = {}) {
    return request(`/api/analytics/dishes/${encodeURIComponent(restaurantId)}${toQuery(params)}`);
  },

  getAnalyticsFunnel(restaurantId, params = {}) {
    return request(`/api/analytics/funnel/${encodeURIComponent(restaurantId)}${toQuery(params)}`);
  },

  getAnalyticsTrends(restaurantId, params = {}) {
    return request(`/api/analytics/trends/${encodeURIComponent(restaurantId)}${toQuery(params)}`);
  },

  getInsights(restaurantId, params = {}) {
    return request(`/api/insights/${encodeURIComponent(restaurantId)}${toQuery(params)}`);
  },
};

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
