import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/api/client.js';

const AuthContext = createContext(null);

export const UserRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  RESTAURANT_ADMIN: 'RESTAURANT_ADMIN',
  RESTAURANT_CAPTAIN: 'RESTAURANT_CAPTAIN',
};

export function isRestaurantStaffRole(role) {
  return role === UserRoles.RESTAURANT_ADMIN || role === UserRoles.RESTAURANT_CAPTAIN;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const payload = await api.getMe();
      setUser(payload.user);
      setStatus('authenticated');
      return payload.user;
    } catch (err) {
      setUser(null);
      setStatus('anonymous');
      if (err.status && err.status !== 401) {
        setError(err.message);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await api.getMe();
        if (cancelled) return;
        setUser(payload.user);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setError(null);
    const payload = await api.login({ email, password });
    setUser(payload.user);
    setStatus('authenticated');
    return payload.user;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      isLoading: status === 'loading',
      login,
      logout,
      refresh,
    }),
    [user, status, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function getPostLoginPath(user) {
  if (!user) return '/login';
  if (user.role === UserRoles.SUPER_ADMIN) return '/superadmin';
  if (user.role === UserRoles.RESTAURANT_ADMIN && user.restaurantId) {
    return '/admin';
  }
  if (user.role === UserRoles.RESTAURANT_CAPTAIN && user.restaurantId) {
    return '/admin/orders';
  }
  return '/login';
}
