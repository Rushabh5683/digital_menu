import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config.js';
import { AppError } from '../../middleware/errorHandler.js';
import { serializeAuthUser } from './auth.serializer.js';
import { parseExpiryMs, signAuthToken } from './token.js';

function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

async function loadActiveUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      restaurant: {
        select: { id: true, name: true, slug: true, logoUrl: true, status: true },
      },
    },
  });
}

/**
 * Create a new refresh token row + return the raw token for the cookie.
 */
export async function issueRefreshToken(userId, meta = {}) {
  const raw = generateRefreshToken();
  const tokenHash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + parseExpiryMs(env.refreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: typeof meta.userAgent === 'string' ? meta.userAgent.slice(0, 300) : null,
      ip: typeof meta.ip === 'string' ? meta.ip.slice(0, 64) : null,
    },
  });

  return { raw, expiresAt };
}

export async function revokeRefreshToken(raw) {
  if (!raw || typeof raw !== 'string') return;
  const tokenHash = hashRefreshToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Validate refresh cookie, rotate token, return new access JWT + user.
 */
export async function rotateRefreshSession(rawRefresh, meta = {}) {
  if (!rawRefresh || typeof rawRefresh !== 'string') {
    throw new AppError('Session expired. Please sign in again.', 401);
  }

  const tokenHash = hashRefreshToken(rawRefresh);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing) {
    throw new AppError('Session expired. Please sign in again.', 401);
  }

  // Reuse of a revoked/rotated token → revoke all for that user (theft detection).
  if (existing.revokedAt) {
    await revokeAllRefreshTokensForUser(existing.userId);
    throw new AppError('Session expired. Please sign in again.', 401);
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError('Session expired. Please sign in again.', 401);
  }

  const user = await loadActiveUser(existing.userId);
  if (!user || !user.isActive) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError('Session is no longer valid', 401);
  }

  const nextRaw = generateRefreshToken();
  const nextHash = hashRefreshToken(nextRaw);
  const expiresAt = new Date(Date.now() + parseExpiryMs(env.refreshExpiresIn));

  const next = await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: nextHash,
        expiresAt,
        userAgent: typeof meta.userAgent === 'string' ? meta.userAgent.slice(0, 300) : null,
        ip: typeof meta.ip === 'string' ? meta.ip.slice(0, 64) : null,
      },
    });

    await tx.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedById: created.id,
      },
    });

    return created;
  });

  const accessToken = signAuthToken(user);

  return {
    accessToken,
    refreshToken: nextRaw,
    refreshExpiresAt: next.expiresAt,
    user: serializeAuthUser(user),
  };
}
