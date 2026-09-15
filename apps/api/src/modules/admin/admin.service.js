import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getAnalyticsOverview } from '../analytics/analytics.reports.js';
import { getRestaurantInsights } from '../insights/insight.service.js';
import {
  adminAddItemsToOrder,
  adminDiscardEmptyOrder,
  adminRemoveOrderItem,
  adminStartOrderForTable,
  adminUpdateOrderItemQuantity,
  updateOrderPayment,
  updateOrderStatus,
} from '../order/order.service.js';
import { computeExclusiveGst } from '../order/orderTax.js';
import { normalizeQrCardTheme, QR_CARD_THEME_IDS } from './qrCardThemes.js';

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function serializeOrder(order, { includeItems = false } = {}) {
  const base = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: Number(order.subtotal),
    cgstRate: Number(order.cgstRate ?? 0),
    sgstRate: Number(order.sgstRate ?? 0),
    cgstAmount: Number(order.cgstAmount ?? 0),
    sgstAmount: Number(order.sgstAmount ?? 0),
    taxAmount: Number(order.taxAmount ?? 0),
    roundOffAmount: Number(order.roundOffAmount ?? 0),
    total: Number(order.total),
    customerNote: order.customerNote,
    billPrintedAt: order.billPrintedAt ?? null,
    paymentMethod: order.paymentMethod ?? null,
    paymentNote: order.paymentNote ?? null,
    paymentSplits: Array.isArray(order.paymentSplits) ? order.paymentSplits : null,
    staffAppreciationAmount: Number(order.staffAppreciationAmount ?? 0),
    paidAt: order.paidAt ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    placedAt: order.createdAt,
    tableId: order.tableId ?? null,
    tableNumber: order.table?.tableNumber ?? null,
    tableLabel:
      order.table?.tableNumber != null
        ? `Table ${String(order.table.tableNumber).padStart(2, '0')}`
        : null,
    itemCount: order._count?.items ?? order.items?.length ?? 0,
  };

  if (includeItems || order.items) {
    base.items = (order.items || []).map((item) => ({
      id: item.id,
      dishId: item.dishId,
      dishNameSnapshot: item.dishNameSnapshot,
      priceSnapshot: Number(item.priceSnapshot),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      imageUrl: item.imageUrl ?? null,
    }));
  }

  return base;
}

export async function getAdminRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      menus: {
        select: { id: true, name: true, isPublished: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          sessions: true,
          menus: true,
          orders: true,
        },
      },
    },
  });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const menu = restaurant.menus[0] || null;

  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    email: restaurant.email,
    phone: restaurant.phone,
    address: restaurant.address,
    logoUrl: restaurant.logoUrl,
    brandTagline: restaurant.brandTagline ?? null,
    brandAccent: restaurant.brandAccent ?? null,
    qrCardTheme: normalizeQrCardTheme(restaurant.qrCardTheme),
    gstEnabled: Boolean(restaurant.gstEnabled),
    gstin: restaurant.gstin ?? null,
    fssaiLicense: restaurant.fssaiLicense ?? null,
    billThanksMessage:
      restaurant.billThanksMessage ??
      'Thanks for visiting us. Drive safe. Stay healthy.',
    cgstRate: Number(restaurant.cgstRate ?? 0),
    sgstRate: Number(restaurant.sgstRate ?? 0),
    status: restaurant.status,
    menu: menu
      ? { id: menu.id, name: menu.name, isPublished: menu.isPublished }
      : null,
    counts: restaurant._count,
  };
}

function optionalTrimmed(value, max) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function optionalPhone(value) {
  if (value == null || value === '') return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 10) {
    throw new AppError('Phone number must be exactly 10 digits', 400, {
      fields: { phone: 'Phone number must be exactly 10 digits' },
    });
  }
  return digits;
}

function optionalEmail(value) {
  if (value == null || value === '') return null;
  const email = String(value).trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Enter a valid email', 400, {
      fields: { email: 'Enter a valid email' },
    });
  }
  return email;
}

function optionalAccent(value) {
  if (value == null || value === '') return null;
  const hex = String(value).trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
    throw new AppError('Accent color must be a hex value like #C9A227', 400, {
      fields: { brandAccent: 'Use a hex color like #C9A227' },
    });
  }
  return hex.toUpperCase();
}

export function validateAdminRestaurantProfile(body = {}) {
  const data = {};
  const fields = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2) fields.name = 'Restaurant name is required';
    else if (name.length > 120) fields.name = 'Name must be at most 120 characters';
    else data.name = name;
  }

  if (body.description !== undefined) {
    data.description = optionalTrimmed(body.description, 2000);
  }

  if (body.phone !== undefined) {
    try {
      data.phone = optionalPhone(body.phone);
    } catch (error) {
      fields.phone = error.details?.fields?.phone || error.message;
    }
  }

  if (body.email !== undefined) {
    try {
      data.email = optionalEmail(body.email);
    } catch (error) {
      fields.email = error.details?.fields?.email || error.message;
    }
  }

  if (body.address !== undefined) {
    data.address = optionalTrimmed(body.address, 300);
  }

  if (body.logoUrl !== undefined) {
    data.logoUrl = optionalTrimmed(body.logoUrl, 1000);
  }

  if (body.brandTagline !== undefined) {
    data.brandTagline = optionalTrimmed(body.brandTagline, 120);
  }

  if (body.brandAccent !== undefined) {
    try {
      data.brandAccent = optionalAccent(body.brandAccent);
    } catch (error) {
      fields.brandAccent = error.details?.fields?.brandAccent || error.message;
    }
  }

  if (body.qrCardTheme !== undefined) {
    const theme = String(body.qrCardTheme || '')
      .trim()
      .toLowerCase();
    if (!QR_CARD_THEME_IDS.includes(theme)) {
      fields.qrCardTheme = `Choose one of: ${QR_CARD_THEME_IDS.join(', ')}`;
    } else {
      data.qrCardTheme = theme;
    }
  }

  if (body.gstEnabled !== undefined) {
    data.gstEnabled = Boolean(body.gstEnabled);
  }

  if (body.gstin !== undefined) {
    const raw = typeof body.gstin === 'string' ? body.gstin.trim().toUpperCase() : '';
    const gstin = raw ? raw.slice(0, 15) : null;
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (gstin && !gstinPattern.test(gstin)) {
      fields.gstin = 'Enter a valid GSTIN (e.g. 27AABCU9603R1ZM)';
    } else {
      data.gstin = gstin;
    }
  }

  if (body.fssaiLicense !== undefined) {
    const raw = typeof body.fssaiLicense === 'string' ? body.fssaiLicense.trim() : '';
    if (!raw) {
      data.fssaiLicense = null;
    } else {
      const digits = raw.replace(/\D/g, '');
      if (digits.length !== 14) {
        fields.fssaiLicense = 'FSSAI licence must be exactly 14 digits';
      } else {
        data.fssaiLicense = digits;
      }
    }
  }

  const gstEnabled =
    data.gstEnabled !== undefined ? data.gstEnabled : Boolean(body.gstEnabled);
  if (gstEnabled) {
    const gstinValue =
      data.gstin !== undefined
        ? data.gstin
        : typeof body.gstin === 'string'
          ? body.gstin.trim().toUpperCase()
          : '';
    const fssaiValue =
      data.fssaiLicense !== undefined
        ? data.fssaiLicense
        : typeof body.fssaiLicense === 'string'
          ? body.fssaiLicense.replace(/\D/g, '')
          : '';
    if (!gstinValue) {
      fields.gstin = 'GSTIN is required when GST is enabled';
    }
    if (!fssaiValue) {
      fields.fssaiLicense = 'FSSAI licence no. is required when GST is enabled';
    }
  }

  if (body.billThanksMessage !== undefined) {
    data.billThanksMessage =
      optionalTrimmed(body.billThanksMessage, 200) ||
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
    throw new AppError('No profile changes provided', 400);
  }

  return data;
}

async function recalculateOpenOrderTaxes(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { gstEnabled: true, cgstRate: true, sgstRate: true },
  });
  if (!restaurant) return;

  const openOrders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'] },
    },
    select: { id: true, items: { select: { subtotal: true } } },
  });

  for (const order of openOrders) {
    const subtotal =
      Math.round(
        order.items.reduce((sum, item) => sum + Number(item.subtotal), 0) * 100,
      ) / 100;
    const tax = computeExclusiveGst(subtotal, restaurant);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        cgstRate: tax.cgstRate,
        sgstRate: tax.sgstRate,
        cgstAmount: tax.cgstAmount,
        sgstAmount: tax.sgstAmount,
        taxAmount: tax.taxAmount,
        roundOffAmount: tax.roundOffAmount,
        total: tax.total,
      },
    });
  }
}

export async function updateAdminRestaurant(restaurantId, body = {}) {
  const data = validateAdminRestaurantProfile(body);
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data,
  });

  const gstTouched =
    data.gstEnabled !== undefined ||
    data.cgstRate !== undefined ||
    data.sgstRate !== undefined;
  if (gstTouched) {
    await recalculateOpenOrderTaxes(restaurantId);
  }

  return getAdminRestaurant(restaurantId);
}

/**
 * Restaurant setup checklist for the settings / launch panel.
 */
export async function getAdminSetupStatus(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      phone: true,
      address: true,
      logoUrl: true,
      brandTagline: true,
      brandAccent: true,
      email: true,
    },
  });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const [menuCount, publishedMenus, categoryCount, dishCount, tableCount, qrReadyCount] =
    await Promise.all([
      prisma.menu.count({ where: { restaurantId } }),
      prisma.menu.count({ where: { restaurantId, isPublished: true } }),
      prisma.category.count({
        where: { menu: { restaurantId } },
      }),
      prisma.dish.count({
        where: { category: { menu: { restaurantId } } },
      }),
      prisma.diningTable.count({
        where: { restaurantId, isActive: true },
      }),
      prisma.diningTable.count({
        where: { restaurantId, isActive: true, qrGeneratedAt: { not: null } },
      }),
    ]);

  const profileComplete = Boolean(
    restaurant.name?.trim() &&
      restaurant.logoUrl &&
      restaurant.description?.trim() &&
      restaurant.phone?.trim() &&
      restaurant.address?.trim(),
  );

  const steps = [
    {
      key: 'profile',
      label: 'Restaurant Profile',
      complete: profileComplete,
      href: '/admin/settings',
      hint: profileComplete
        ? 'Name, logo, description, phone, and address are set'
        : 'Add name, logo, description, phone, and address',
    },
    {
      key: 'menu',
      label: 'Menu',
      complete: menuCount > 0,
      href: '/admin/menu',
      hint: menuCount > 0 ? `${menuCount} menu created` : 'Create your first menu',
    },
    {
      key: 'categories',
      label: 'Categories',
      complete: categoryCount > 0,
      href: '/admin/categories',
      hint: categoryCount > 0 ? `${categoryCount} categories` : 'Add menu sections',
    },
    {
      key: 'dishes',
      label: 'Dishes',
      complete: dishCount > 0,
      href: '/admin/dishes',
      hint: dishCount > 0 ? `${dishCount} dishes` : 'Add dishes to categories',
    },
    {
      key: 'tables',
      label: 'Tables',
      complete: tableCount > 0,
      href: '/admin/tables',
      hint: tableCount > 0 ? `${tableCount} active tables` : 'Create dining tables',
    },
    {
      key: 'qr',
      label: 'QR Codes',
      complete: tableCount > 0 && qrReadyCount >= tableCount,
      href: '/admin/qr-codes',
      hint:
        tableCount === 0
          ? 'Add tables first'
          : qrReadyCount >= tableCount
            ? 'All table QR codes ready'
            : `${qrReadyCount}/${tableCount} QR codes generated`,
    },
    {
      key: 'published',
      label: 'Menu Published',
      complete: publishedMenus > 0,
      href: '/admin/menu',
      hint: publishedMenus > 0 ? 'Guests can open your live menu' : 'Publish a menu for guests',
    },
  ];

  const completedCount = steps.filter((step) => step.complete).length;
  const ready = steps.every((step) => step.complete);

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logoUrl: restaurant.logoUrl,
    },
    steps,
    completedCount,
    totalCount: steps.length,
    ready,
    message: ready
      ? 'Your restaurant is ready.'
      : `Complete ${steps.length - completedCount} more step${
          steps.length - completedCount === 1 ? '' : 's'
        } to go live.`,
  };
}

export async function getAdminDashboard(restaurantId) {
  const today = startOfToday();

  const [
    restaurant,
    overview,
    insightsResult,
    ordersToday,
    pendingOrders,
    revenueAgg,
    recentOrders,
    sessionsToday,
  ] = await Promise.all([
    getAdminRestaurant(restaurantId),
    getAnalyticsOverview(restaurantId, {}),
    getRestaurantInsights(restaurantId, {}),
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: { restaurantId, status: 'PLACED' },
    }),
    prisma.order.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: today },
        status: { in: ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'] },
      },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        // Same business day as Day End (local midnight → now), before closeout.
        createdAt: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        table: { select: { tableNumber: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.session.count({
      where: { restaurantId, startedAt: { gte: today } },
    }),
  ]);

  return {
    restaurant,
    kpis: {
      ordersToday,
      pendingOrders,
      revenueToday: Number(revenueAgg._sum.total || 0),
      menuSessions: overview.totalMenuSessions || 0,
      sessionsToday,
      averageAttentionSeconds:
        overview.highestAttentionCategory?.averageAttentionSeconds ?? null,
      topAttentionSection: overview.highestAttentionCategory || null,
      topDish: overview.highestAttentionDish || null,
    },
    recentOrders: recentOrders.map(serializeOrder),
    attention: {
      highestAttentionCategory: overview.highestAttentionCategory || null,
      highestAttentionDish: overview.highestAttentionDish || null,
      mostSelectedDish: overview.mostSelectedDish || null,
      averageSessionDurationSeconds: overview.averageSessionDurationSeconds ?? null,
      totalMenuSessions: overview.totalMenuSessions || 0,
    },
    insights: insightsResult.insights || [],
  };
}

export async function listAdminOrders(restaurantId, query = {}) {
  const statusRaw = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const statuses =
    statusRaw && statusRaw !== 'ALL'
      ? statusRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

  const search = typeof query.q === 'string' ? query.q.trim() : '';
  const tableNumber =
    query.tableNumber != null && query.tableNumber !== ''
      ? Number(query.tableNumber)
      : null;

  const datePreset = typeof query.date === 'string' ? query.date.trim().toLowerCase() : '';
  let createdAtFilter = undefined;

  if (datePreset === 'today') {
    createdAtFilter = { gte: startOfToday() };
  } else if (datePreset === 'yesterday') {
    const start = startOfToday();
    const yesterday = new Date(start);
    yesterday.setDate(yesterday.getDate() - 1);
    createdAtFilter = { gte: yesterday, lt: start };
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(datePreset)) {
    const start = new Date(`${datePreset}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    createdAtFilter = { gte: start, lt: end };
  }

  const where = {
    restaurantId,
    ...(statuses?.length === 1
      ? { status: statuses[0] }
      : statuses?.length
        ? { status: { in: statuses } }
        : {}),
    ...(Number.isInteger(tableNumber) && tableNumber >= 1
      ? { table: { tableNumber } }
      : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            {
              items: {
                some: {
                  dishNameSnapshot: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {}),
  };

  const take = Math.min(Math.max(Number(query.limit) || 100, 1), 200);

  const [orders, restaurant, placed, accepted, preparing, ready, completed] =
    await Promise.all([
      prisma.order.findMany({
        where,
        // Newest first so a 200-cap prefers current tickets over ancient open ones.
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          table: { select: { tableNumber: true, name: true } },
          items: { orderBy: { dishNameSnapshot: 'asc' } },
          _count: { select: { items: true } },
        },
      }),
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true, slug: true, logoUrl: true },
      }),
      prisma.order.count({ where: { restaurantId, status: 'PLACED' } }),
      prisma.order.count({ where: { restaurantId, status: 'ACCEPTED' } }),
      prisma.order.count({ where: { restaurantId, status: 'PREPARING' } }),
      prisma.order.count({ where: { restaurantId, status: 'READY' } }),
      prisma.order.count({
        where: {
          restaurantId,
          status: 'COMPLETED',
          createdAt: { gte: startOfToday() },
        },
      }),
    ]);

  // Kitchen board: New first (oldest first within column), completed newest last.
  const statusRank = {
    PLACED: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY: 3,
    COMPLETED: 4,
    REJECTED: 5,
    CANCELLED: 6,
  };

  const sorted = [...orders].sort((a, b) => {
    const ra = statusRank[a.status] ?? 9;
    const rb = statusRank[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.status === 'COMPLETED') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return {
    restaurant,
    orders: sorted.map((order) => serializeOrder(order, { includeItems: true })),
    counts: {
      PLACED: placed,
      ACCEPTED: accepted,
      PREPARING: preparing,
      READY: ready,
      COMPLETED: completed,
      new: placed,
    },
  };
}

export async function updateAdminOrderStatus(restaurantId, orderId, status, extras = {}) {
  return updateOrderStatus(orderId, status, {
    restaurantId,
    paymentMethod: extras.paymentMethod,
    paymentNote: extras.paymentNote,
    paymentSplits: extras.paymentSplits,
    staffAppreciationAmount: extras.staffAppreciationAmount,
    appreciationCaptainIds: extras.appreciationCaptainIds,
    businessDate: extras.businessDate,
  });
}

export async function updateAdminOrderPayment(restaurantId, orderId, extras = {}) {
  return updateOrderPayment(orderId, {
    restaurantId,
    paymentMethod: extras.paymentMethod,
    paymentNote: extras.paymentNote,
    paymentSplits: extras.paymentSplits,
  });
}

export async function getAdminOrder(restaurantId, orderId) {
  const id = String(orderId || '').trim();
  const order = await prisma.order.findFirst({
    where: { id, restaurantId },
    include: {
      table: { select: { tableNumber: true, name: true } },
      items: { orderBy: { dishNameSnapshot: 'asc' } },
      _count: { select: { items: true } },
    },
  });
  if (!order) throw new AppError('Order not found', 404);
  return { order: serializeOrder(order, { includeItems: true }) };
}

export async function markAdminOrderBillPrinted(restaurantId, orderId) {
  const id = String(orderId || '').trim();
  const existing = await prisma.order.findFirst({
    where: { id, restaurantId },
  });
  if (!existing) throw new AppError('Order not found', 404);

  const open = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];
  if (!open.includes(existing.status)) {
    throw new AppError('Only open orders can be marked as billed', 400);
  }

  const order = await prisma.order.update({
    where: { id: existing.id },
    data: { billPrintedAt: existing.billPrintedAt || new Date() },
    include: {
      table: { select: { tableNumber: true, name: true } },
      items: { orderBy: { dishNameSnapshot: 'asc' } },
      _count: { select: { items: true } },
    },
  });

  return { order: serializeOrder(order, { includeItems: true }) };
}

export async function startAdminTableOrder(restaurantId, body = {}) {
  return adminStartOrderForTable(restaurantId, {
    tableId: body.tableId,
    tableNumber: body.tableNumber,
    businessDate: body.businessDate,
  });
}

export async function addAdminOrderItems(restaurantId, orderId, items) {
  return adminAddItemsToOrder(restaurantId, orderId, items);
}

export async function updateAdminOrderItem(restaurantId, orderId, itemId, quantity) {
  return adminUpdateOrderItemQuantity(restaurantId, orderId, itemId, quantity);
}

export async function deleteAdminOrderItem(restaurantId, orderId, itemId) {
  return adminRemoveOrderItem(restaurantId, orderId, itemId);
}

export async function discardAdminEmptyOrder(restaurantId, orderId) {
  return adminDiscardEmptyOrder(restaurantId, orderId);
}
