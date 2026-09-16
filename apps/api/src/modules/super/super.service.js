import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { toPublicUploadUrl, toStoredUploadPath } from '../../middleware/upload.js';
import { validateCuid, validateSlug } from '../../utils/validate.js';
import { hashPassword } from '../auth/auth.service.js';
import { UserRoles } from '../auth/roles.js';

export const RestaurantStatuses = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
};

const STATUS_SET = new Set(Object.values(RestaurantStatuses));

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function validateEmail(value, fieldName = 'email') {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email) throw new AppError(`${fieldName} is required`, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(`Enter a valid ${fieldName}`, 400);
  }
  return email;
}

function validatePhone(value, fieldName = 'phone number') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) throw new AppError(`${fieldName} is required`, 400);
  if (digits.length !== 10) {
    throw new AppError(`${fieldName} must be exactly 10 digits`, 400);
  }
  return digits;
}

function optionalPhone(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  return validatePhone(text);
}

function optionalString(value, max = 500) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > max) {
    throw new AppError(`Value must be at most ${max} characters`, 400);
  }
  return text;
}

function includeRestaurantDetail() {
  return {
    admins: {
      where: { role: UserRoles.RESTAURANT_ADMIN },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    },
    menus: {
      select: {
        id: true,
        name: true,
        isPublished: true,
        updatedAt: true,
        _count: { select: { categories: true } },
      },
      orderBy: { updatedAt: 'desc' },
    },
    _count: {
      select: {
        sessions: true,
        analyticsEvents: true,
        menus: true,
        admins: true,
        orders: true,
        tables: true,
      },
    },
  };
}

export function serializeSuperRestaurant(restaurant) {
  const publishedMenu = (restaurant.menus || []).find((menu) => menu.isPublished);
  const primaryAdmin = (restaurant.admins || [])[0] || null;
  const menuStatus = publishedMenu
    ? 'PUBLISHED'
    : restaurant.menus?.length
      ? 'DRAFT'
      : 'NONE';

  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    email: restaurant.email,
    phone: restaurant.phone,
    address: restaurant.address,
    logoUrl: toPublicUploadUrl(restaurant.logoUrl),
    status: restaurant.status,
    gstEnabled: Boolean(restaurant.gstEnabled),
    gstin: restaurant.gstin ?? null,
    fssaiLicense: restaurant.fssaiLicense ?? null,
    billThanksMessage:
      restaurant.billThanksMessage ??
      'Thanks for visiting us. Drive safe. Stay healthy.',
    cgstRate: Number(restaurant.cgstRate ?? 0),
    sgstRate: Number(restaurant.sgstRate ?? 0),
    createdAt: restaurant.createdAt,
    updatedAt: restaurant.updatedAt,
    admin: primaryAdmin
      ? {
          id: primaryAdmin.id,
          name: primaryAdmin.name,
          email: primaryAdmin.email,
          isActive: primaryAdmin.isActive,
        }
      : null,
    admins: restaurant.admins || [],
    menuStatus,
    menus: (restaurant.menus || []).map((menu) => ({
      id: menu.id,
      name: menu.name,
      isPublished: menu.isPublished,
      categoryCount: menu._count?.categories ?? 0,
      updatedAt: menu.updatedAt,
    })),
    counts: {
      menus: restaurant._count?.menus ?? restaurant.menus?.length ?? 0,
      sessions: restaurant._count?.sessions ?? 0,
      analyticsEvents: restaurant._count?.analyticsEvents ?? 0,
      admins: restaurant._count?.admins ?? restaurant.admins?.length ?? 0,
      orders: restaurant._count?.orders ?? 0,
      tables: restaurant._count?.tables ?? 0,
      ordersToday: restaurant.ordersToday ?? 0,
    },
  };
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

async function buildRestaurantInsight(restaurantId) {
  const today = startOfDay();
  const month = startOfMonth();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    ordersToday,
    ordersMonth,
    sessionsToday,
    tablesTotal,
    tablesActive,
    qrReady,
    categoryCount,
    dishCount,
    attentionToday,
    recentOrders,
    topOrdered,
    recentSessions,
  ] = await Promise.all([
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: month } },
    }),
    prisma.session.count({
      where: { restaurantId, startedAt: { gte: today } },
    }),
    prisma.diningTable.count({ where: { restaurantId } }),
    prisma.diningTable.count({ where: { restaurantId, isActive: true } }),
    prisma.diningTable.count({
      where: { restaurantId, isActive: true, qrGeneratedAt: { not: null } },
    }),
    prisma.category.count({ where: { menu: { restaurantId } } }),
    prisma.dish.count({ where: { category: { menu: { restaurantId } } } }),
    prisma.analyticsEvent.count({
      where: {
        restaurantId,
        timestamp: { gte: today },
        eventType: { in: ['DISH_VIEWED', 'DISH_ATTENTION', 'CATEGORY_VIEWED', 'CATEGORY_ATTENTION'] },
      },
    }),
    prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        table: { select: { tableNumber: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ['dishId', 'dishNameSnapshot'],
      where: {
        order: { restaurantId, createdAt: { gte: thirtyDaysAgo } },
        dishId: { not: null },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.session.findMany({
      where: { restaurantId },
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        tableId: true,
      },
    }),
  ]);

  const dishIds = topOrdered.map((row) => row.dishId).filter(Boolean);
  const dishes = dishIds.length
    ? await prisma.dish.findMany({
        where: { id: { in: dishIds } },
        select: { id: true, name: true, imageUrl: true, price: true },
      })
    : [];
  const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));

  return {
    tables: {
      total: tablesTotal,
      active: tablesActive,
      qrReady,
      qrPending: Math.max(0, tablesActive - qrReady),
    },
    catalog: {
      categories: categoryCount,
      dishes: dishCount,
    },
    performance: {
      ordersToday,
      ordersMonth,
      sessionsToday,
      attentionEventsToday: attentionToday,
    },
    topDishes: topOrdered.map((row) => {
      const dish = dishMap.get(row.dishId);
      return {
        dishId: row.dishId,
        name: dish?.name || row.dishNameSnapshot,
        imageUrl: dish?.imageUrl || null,
        price: dish?.price != null ? Number(dish.price) : null,
        orderedQuantity: row._sum?.quantity || 0,
      };
    }),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      itemCount: order._count?.items || 0,
      tableNumber: order.table?.tableNumber ?? null,
      createdAt: order.createdAt,
    })),
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      tableId: session.tableId,
    })),
  };
}

export async function getSuperDashboard() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    inactiveRestaurants,
    totalMenuSessions,
    sessionsToday,
    eventsToday,
    ordersToday,
    recentRestaurants,
    recentSessions,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { status: RestaurantStatuses.ACTIVE } }),
    prisma.restaurant.count({ where: { status: RestaurantStatuses.PENDING } }),
    prisma.restaurant.count({ where: { status: RestaurantStatuses.INACTIVE } }),
    prisma.session.count(),
    prisma.session.count({ where: { startedAt: { gte: startOfDay } } }),
    prisma.analyticsEvent.count({ where: { timestamp: { gte: startOfDay } } }),
    prisma.order.count({
      where: { status: 'COMPLETED', createdAt: { gte: startOfDay } },
    }),
    prisma.restaurant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: includeRestaurantDetail(),
    }),
    prisma.session.findMany({
      take: 8,
      orderBy: { startedAt: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return {
    totals: {
      restaurants: totalRestaurants,
      activeRestaurants,
      pendingRestaurants,
      inactiveRestaurants,
      ordersToday,
      totalMenuSessions,
      sessionsToday,
      eventsToday,
    },
    activity: {
      recentRestaurants: recentRestaurants.map(serializeSuperRestaurant),
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        restaurantId: session.restaurantId,
        restaurantName: session.restaurant?.name || null,
        restaurantSlug: session.restaurant?.slug || null,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      })),
    },
  };
}

export async function listSuperRestaurants(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const menuStatus =
    typeof query.menuStatus === 'string' ? query.menuStatus.trim().toUpperCase() : '';

  const where = {};

  if (status && STATUS_SET.has(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      {
        admins: {
          some: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  if (menuStatus === 'PUBLISHED') {
    where.menus = { some: { isPublished: true } };
  } else if (menuStatus === 'DRAFT') {
    where.AND = [
      ...(where.AND || []),
      { menus: { some: {} } },
      { menus: { none: { isPublished: true } } },
    ];
  } else if (menuStatus === 'NONE') {
    where.menus = { none: {} };
  }

  const [total, rows] = await Promise.all([
    prisma.restaurant.count({ where }),
    prisma.restaurant.findMany({
      where,
      include: includeRestaurantDetail(),
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    restaurants: rows.map(serializeSuperRestaurant),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getSuperRestaurantById(id) {
  const restaurantId = validateCuid(id, 'restaurantId');
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: includeRestaurantDetail(),
  });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const insight = await buildRestaurantInsight(restaurantId);
  const base = serializeSuperRestaurant(restaurant);
  const health = buildRestaurantHealth(restaurant, insight, base.admin);

  return {
    ...base,
    brandTagline: restaurant.brandTagline ?? null,
    brandAccent: restaurant.brandAccent ?? null,
    counts: {
      ...base.counts,
      orders: restaurant._count?.orders ?? 0,
      tables: restaurant._count?.tables ?? 0,
      ordersToday: insight.performance.ordersToday,
      ordersMonth: insight.performance.ordersMonth,
      sessionsToday: insight.performance.sessionsToday,
      categories: insight.catalog.categories,
      dishes: insight.catalog.dishes,
    },
    tables: insight.tables,
    catalog: insight.catalog,
    performance: insight.performance,
    topDishes: insight.topDishes,
    recentOrders: insight.recentOrders,
    recentSessions: insight.recentSessions,
    health,
  };
}

function buildRestaurantHealth(restaurant, insight, admin) {
  const profileComplete = Boolean(
    restaurant.name?.trim() &&
      restaurant.logoUrl &&
      restaurant.description?.trim() &&
      restaurant.phone?.trim() &&
      restaurant.address?.trim(),
  );
  const menuPublished = (restaurant.menus || []).some((menu) => menu.isPublished);
  const tablesOk = (insight.tables?.active || 0) > 0;
  const qrOk =
    tablesOk &&
    (insight.tables?.qrReady || 0) >= (insight.tables?.active || 0) &&
    (insight.tables?.active || 0) > 0;
  const gstOk = Boolean(restaurant.gstEnabled && restaurant.gstin);
  const adminOk = Boolean(admin?.isActive);
  const activeOk = restaurant.status === 'ACTIVE';

  const checks = [
    {
      key: 'status',
      label: 'Restaurant active',
      complete: activeOk,
      hint: activeOk ? 'Live on platform' : `Status: ${restaurant.status}`,
    },
    {
      key: 'profile',
      label: 'Profile complete',
      complete: profileComplete,
      hint: profileComplete
        ? 'Name, logo, description, phone, address'
        : 'Missing profile fields',
    },
    {
      key: 'menu',
      label: 'Menu published',
      complete: menuPublished,
      hint: menuPublished ? 'Guests can open the menu' : 'Publish at least one menu',
    },
    {
      key: 'tables',
      label: 'Tables set up',
      complete: tablesOk,
      hint: tablesOk
        ? `${insight.tables.active} active table${insight.tables.active === 1 ? '' : 's'}`
        : 'Add dining tables',
    },
    {
      key: 'qr',
      label: 'QR codes ready',
      complete: qrOk,
      hint: qrOk
        ? 'All active tables have QR'
        : `${insight.tables?.qrReady || 0}/${insight.tables?.active || 0} QR ready`,
    },
    {
      key: 'gst',
      label: 'GST configured',
      complete: gstOk,
      hint: gstOk
        ? `GSTIN ${restaurant.gstin}`
        : restaurant.gstEnabled
          ? 'Add GSTIN'
          : 'Optional — enable in settings',
      optional: true,
    },
    {
      key: 'admin',
      label: 'Admin login active',
      complete: adminOk,
      hint: adminOk ? admin.email : 'No active restaurant admin',
    },
  ];

  const required = checks.filter((c) => !c.optional);
  const completeRequired = required.filter((c) => c.complete).length;
  const ready = required.every((c) => c.complete);

  return {
    ready,
    score: completeRequired,
    total: required.length,
    checks,
  };
}

export function validateUpdateAdminPayload(body = {}) {
  const data = {};
  const fields = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2) fields.name = 'Admin name is required';
    else data.name = name;
  }

  if (body.email !== undefined) {
    try {
      data.email = validateEmail(body.email, 'admin email');
    } catch (error) {
      fields.email = error.message;
    }
  }

  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  if (body.temporaryPassword !== undefined && body.temporaryPassword !== '') {
    const password = String(body.temporaryPassword);
    if (password.length < 8) {
      fields.temporaryPassword = 'Password must be at least 8 characters';
    } else {
      data.temporaryPassword = password;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError('Please fix the highlighted fields', 400, { fields });
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('No admin changes provided', 400);
  }

  return data;
}

export async function updateSuperRestaurantAdmin(restaurantIdRaw, body = {}) {
  const restaurantId = validateCuid(restaurantIdRaw, 'restaurantId');
  const data = validateUpdateAdminPayload(body);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const admin = await prisma.user.findFirst({
    where: { restaurantId, role: UserRoles.RESTAURANT_ADMIN },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new AppError('No restaurant admin account found', 404);

  if (data.email && data.email !== admin.email) {
    const clash = await prisma.user.findUnique({ where: { email: data.email } });
    if (clash) {
      throw new AppError('Admin email is already in use', 409, {
        fields: { email: 'Email is already registered' },
      });
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.temporaryPassword) {
    updateData.passwordHash = await hashPassword(data.temporaryPassword);
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: updateData,
  });

  return getSuperRestaurantById(restaurantId);
}

export function validateCreateRestaurantPayload(body = {}) {
  const fields = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length < 2) fields.name = 'Restaurant name is required';
  if (name.length > 120) fields.name = 'Name must be at most 120 characters';

  let slug;
  try {
    const rawSlug = body.slug?.trim() ? body.slug : slugifyName(name);
    slug = validateSlug(rawSlug);
  } catch (error) {
    fields.slug = error.message || 'Invalid slug';
  }

  const description = optionalString(body.description, 2000);

  let email = null;
  try {
    email = validateEmail(body.email, 'restaurant email');
  } catch (error) {
    fields.email = error.message;
  }

  let phone = null;
  try {
    phone = optionalPhone(body.phone);
  } catch (error) {
    fields.phone = error.message;
  }

  const address = optionalString(body.address, 300);
  const logoRaw = optionalString(body.logoUrl, 1000);
  const logoUrl = logoRaw ? toStoredUploadPath(logoRaw) : null;

  const adminName = typeof body.adminName === 'string' ? body.adminName.trim() : '';
  if (!adminName || adminName.length < 2) fields.adminName = 'Admin name is required';

  let adminEmail;
  try {
    adminEmail = validateEmail(body.adminEmail, 'admin email');
  } catch (error) {
    fields.adminEmail = error.message;
  }

  const temporaryPassword =
    typeof body.temporaryPassword === 'string' ? body.temporaryPassword : '';
  if (!temporaryPassword || temporaryPassword.length < 8) {
    fields.temporaryPassword = 'Temporary password must be at least 8 characters';
  }

  // New restaurants are Active by default. Status is only changed later via edit/actions.
  let status = RestaurantStatuses.ACTIVE;
  if (body.status) {
    const next = String(body.status).trim().toUpperCase();
    if (!STATUS_SET.has(next)) fields.status = 'Invalid status';
    else status = next;
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError('Please fix the highlighted fields', 400, { fields });
  }

  return {
    name,
    slug,
    description,
    email,
    phone,
    address,
    logoUrl,
    status,
    adminName,
    adminEmail,
    temporaryPassword,
  };
}

export function validateUpdateRestaurantPayload(body = {}) {
  const data = {};
  const fields = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2) fields.name = 'Restaurant name is required';
    else if (name.length > 120) fields.name = 'Name must be at most 120 characters';
    else data.name = name;
  }

  if (body.slug !== undefined) {
    try {
      data.slug = validateSlug(body.slug);
    } catch (error) {
      fields.slug = error.message || 'Invalid slug';
    }
  }

  if (body.description !== undefined) {
    data.description = optionalString(body.description, 2000);
  }

  if (body.email !== undefined) {
    try {
      data.email = body.email ? validateEmail(body.email, 'restaurant email') : null;
    } catch (error) {
      fields.email = error.message;
    }
  }

  if (body.phone !== undefined) {
    try {
      data.phone = optionalPhone(body.phone);
    } catch (error) {
      fields.phone = error.message;
    }
  }

  if (body.address !== undefined) data.address = optionalString(body.address, 300);
  if (body.logoUrl !== undefined) {
    const next = optionalString(body.logoUrl, 1000);
    data.logoUrl = next ? toStoredUploadPath(next) : null;
  }

  if (body.status !== undefined) {
    const next = String(body.status).trim().toUpperCase();
    if (!STATUS_SET.has(next)) fields.status = 'Invalid status';
    else data.status = next;
  }

  if (body.gstEnabled !== undefined) {
    data.gstEnabled = Boolean(body.gstEnabled);
  }

  if (body.gstin !== undefined) {
    const gstin =
      body.gstin == null || body.gstin === ''
        ? null
        : String(body.gstin).trim().toUpperCase();
    if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
      fields.gstin = 'GSTIN must be 15 characters';
    } else {
      data.gstin = gstin;
    }
  }

  if (body.fssaiLicense !== undefined) {
    data.fssaiLicense = optionalString(body.fssaiLicense, 40);
  }

  if (body.billThanksMessage !== undefined) {
    data.billThanksMessage =
      optionalString(body.billThanksMessage, 200) ||
      'Thanks for visiting us. Drive safe. Stay healthy.';
  }

  if (body.cgstRate !== undefined) {
    const rate = Number(body.cgstRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      fields.cgstRate = 'CGST rate must be between 0 and 100';
    } else {
      data.cgstRate = Math.round(rate * 100) / 100;
    }
  }

  if (body.sgstRate !== undefined) {
    const rate = Number(body.sgstRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      fields.sgstRate = 'SGST rate must be between 0 and 100';
    } else {
      data.sgstRate = Math.round(rate * 100) / 100;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError('Please fix the highlighted fields', 400, { fields });
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('No changes provided', 400);
  }

  return data;
}

export async function createSuperRestaurant(payload) {
  const existingSlug = await prisma.restaurant.findUnique({ where: { slug: payload.slug } });
  if (existingSlug) {
    throw new AppError('A restaurant with this slug already exists', 409, {
      fields: { slug: 'Slug is already taken' },
    });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: payload.adminEmail } });
  if (existingAdmin) {
    throw new AppError('Admin email is already in use', 409, {
      fields: { adminEmail: 'Email is already registered' },
    });
  }

  const passwordHash = await hashPassword(payload.temporaryPassword);

  const restaurant = await prisma.$transaction(async (tx) => {
    const created = await tx.restaurant.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        logoUrl: payload.logoUrl,
        status: payload.status,
        menus: {
          create: {
            name: 'Main Menu',
            description: 'Initial menu — add categories and dishes next.',
            isPublished: false,
          },
        },
        admins: {
          create: {
            name: payload.adminName,
            email: payload.adminEmail,
            passwordHash,
            role: UserRoles.RESTAURANT_ADMIN,
            isActive: true,
          },
        },
      },
      include: includeRestaurantDetail(),
    });

    return created;
  });

  return serializeSuperRestaurant(restaurant);
}

export async function updateSuperRestaurant(id, data) {
  const restaurantId = validateCuid(id, 'restaurantId');

  if (data.slug) {
    const clash = await prisma.restaurant.findFirst({
      where: { slug: data.slug, NOT: { id: restaurantId } },
    });
    if (clash) {
      throw new AppError('A restaurant with this slug already exists', 409, {
        fields: { slug: 'Slug is already taken' },
      });
    }
  }

  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data,
      include: includeRestaurantDetail(),
    });
    return serializeSuperRestaurant(restaurant);
  } catch (error) {
    if (error.code === 'P2025') throw new AppError('Restaurant not found', 404);
    throw error;
  }
}

export async function updateSuperRestaurantStatus(id, statusRaw) {
  const status = String(statusRaw || '')
    .trim()
    .toUpperCase();
  if (!STATUS_SET.has(status)) {
    throw new AppError('Invalid restaurant status', 400);
  }
  return updateSuperRestaurant(id, { status });
}

export async function deleteSuperRestaurant(id) {
  const restaurantId = validateCuid(id, 'restaurantId');

  try {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
  } catch (error) {
    if (error.code === 'P2025') throw new AppError('Restaurant not found', 404);
    throw error;
  }

  return { ok: true, id: restaurantId };
}
