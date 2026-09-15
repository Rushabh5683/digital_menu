import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),

  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, ''),

  corsOrigins: (
    process.env.CORS_ORIGIN ||
    'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
  )
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean),

  publicAppUrl: (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, ''),

  /**
   * Public base URL of THIS API (e.g. https://your-api.up.railway.app).
   * Used to turn /uploads/... into absolute URLs so split-host frontends can load images.
   * Temp disk uploads: also mount a Railway volume on UPLOADS_DIR / default uploads folder.
   */
  publicApiUrl: (
    process.env.PUBLIC_API_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    ''
  )
    .toString()
    .trim()
    .replace(/\/$/, '')
    .replace(/^(?!https?:\/\/)(.+)/, 'https://$1'),

  /** Override local uploads root (Railway volume mount path). */
  uploadsDir: process.env.UPLOADS_DIR
    ? process.env.UPLOADS_DIR.trim()
    : '',

  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me-digital-menu-jwt',
  /** Short-lived access JWT (cookie dm_session). */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  /** Long-lived refresh cookie lifetime. */
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'dm_session',
  refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME || 'dm_refresh',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};