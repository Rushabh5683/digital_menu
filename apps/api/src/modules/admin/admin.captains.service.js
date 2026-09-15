import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { hashPassword } from '../auth/auth.service.js';
import { UserRoles } from '../auth/roles.js';
import { validateCuid } from '../../utils/validate.js';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateCaptainPayload(body = {}, { requirePassword = true } = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const errors = {};

  if (!name || name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer';
  }

  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (requirePassword) {
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
  } else if (password && password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new AppError('Please fix the highlighted fields', 400, { fields: errors });
  }

  return { name, email, password: password || null };
}

function serializeCaptain(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listRestaurantCaptains(restaurantId) {
  const captains = await prisma.user.findMany({
    where: {
      restaurantId,
      role: UserRoles.RESTAURANT_CAPTAIN,
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { captains: captains.map(serializeCaptain) };
}

export async function createRestaurantCaptain(restaurantId, body = {}) {
  const { name, email, password } = validateCaptainPayload(body, { requirePassword: true });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, {
      fields: { email: 'Email is already in use' },
    });
  }

  const passwordHash = await hashPassword(password);
  const captain = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRoles.RESTAURANT_CAPTAIN,
      restaurantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { captain: serializeCaptain(captain) };
}

export async function updateRestaurantCaptain(restaurantId, captainId, body = {}) {
  const id = validateCuid(captainId, 'captainId');
  const existing = await prisma.user.findFirst({
    where: {
      id,
      restaurantId,
      role: UserRoles.RESTAURANT_CAPTAIN,
    },
  });
  if (!existing) {
    throw new AppError('Captain not found', 404);
  }

  const data = {};

  if (body.name != null || body.email != null || body.password) {
    const payload = validateCaptainPayload(
      {
        name: body.name != null ? body.name : existing.name,
        email: body.email != null ? body.email : existing.email,
        password: body.password || '',
      },
      { requirePassword: false },
    );

    if (body.name != null) data.name = payload.name;
    if (body.email != null && payload.email !== existing.email) {
      const clash = await prisma.user.findUnique({ where: { email: payload.email } });
      if (clash && clash.id !== existing.id) {
        throw new AppError('An account with this email already exists', 409, {
          fields: { email: 'Email is already in use' },
        });
      }
      data.email = payload.email;
    }
    if (payload.password) {
      data.passwordHash = await hashPassword(payload.password);
    }
  }

  if (body.isActive != null) {
    data.isActive = Boolean(body.isActive);
  }

  if (Object.keys(data).length === 0) {
    return { captain: serializeCaptain(existing) };
  }

  const captain = await prisma.user.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { captain: serializeCaptain(captain) };
}

export async function deactivateRestaurantCaptain(restaurantId, captainId) {
  return updateRestaurantCaptain(restaurantId, captainId, { isActive: false });
}

export async function deleteRestaurantCaptain(restaurantId, captainId) {
  const id = validateCuid(captainId, 'captainId');
  const existing = await prisma.user.findFirst({
    where: {
      id,
      restaurantId,
      role: UserRoles.RESTAURANT_CAPTAIN,
    },
    select: { id: true, name: true, email: true },
  });
  if (!existing) {
    throw new AppError('Captain not found', 404);
  }

  await prisma.user.delete({ where: { id: existing.id } });
  return { deleted: true, captainId: existing.id };
}
