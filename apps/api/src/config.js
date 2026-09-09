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

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean),

  publicAppUrl: (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, ''),

  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me-digital-menu-jwt',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'dm_session',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};