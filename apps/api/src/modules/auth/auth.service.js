import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { UserRoles } from './roles.js';
import { serializeAuthUser } from './auth.serializer.js';
import { signAuthToken } from './token.js';
import { issueRefreshToken } from './refreshToken.service.js';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function validateLoginPayload(body = {}) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const errors = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new AppError('Please fix the highlighted fields', 400, { fields: errors });
  }

  return { email, password };
}

export async function loginWithPassword({ email, password }, meta = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      restaurant: {
        select: { id: true, name: true, slug: true, logoUrl: true, status: true },
      },
    },
  });

  // Constant-ish failure message to avoid account enumeration.
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  if (
    (user.role === UserRoles.RESTAURANT_ADMIN ||
      user.role === UserRoles.RESTAURANT_CAPTAIN) &&
    !user.restaurantId
  ) {
    throw new AppError('Account is not linked to a restaurant', 403);
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signAuthToken(user);
  const refresh = await issueRefreshToken(user.id, meta);

  return {
    token,
    refreshToken: refresh.raw,
    user: serializeAuthUser(user),
  };
}

export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      restaurant: {
        select: { id: true, name: true, slug: true, logoUrl: true, status: true },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('Session is no longer valid', 401);
  }

  return serializeAuthUser(user);
}

export async function findUserRecordById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      restaurant: {
        select: { id: true, name: true, slug: true, logoUrl: true, status: true },
      },
    },
  });
}
