import QRCode from 'qrcode';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';
import {
  buildTableMenuUrl,
  formatTableLabel,
  serializeDiningTable,
} from './admin.tables.service.js';
import { normalizeQrCardTheme } from './qrCardThemes.js';

/**
 * QR regeneration policy (stable URLs):
 * Public QR payloads are deterministic: `/menu/{slug}?table={number}`.
 * Regenerating refreshes the PNG + `qrGeneratedAt` only — printed codes stay valid.
 * No secrets or cross-restaurant identifiers are embedded.
 */

async function getRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      brandTagline: true,
      brandAccent: true,
      qrCardTheme: true,
    },
  });
  if (!restaurant) throw new AppError('Restaurant not found', 404);
  return restaurant;
}

function restaurantPublic(restaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    logoUrl: restaurant.logoUrl,
    brandTagline: restaurant.brandTagline ?? null,
    brandAccent: restaurant.brandAccent ?? null,
    qrCardTheme: normalizeQrCardTheme(restaurant.qrCardTheme),
  };
}

function buildPrintable(restaurant, table) {
  return {
    headline: 'Scan to View Menu & Place Your Order',
    tableLabel: formatTableLabel(table.tableNumber),
    restaurantName: restaurant.name,
    logoUrl: restaurant.logoUrl,
    tagline: restaurant.brandTagline || null,
    accentColor: restaurant.brandAccent || null,
    theme: normalizeQrCardTheme(restaurant.qrCardTheme),
  };
}

async function getTableOwned(tableId, restaurantId) {
  const id = validateCuid(tableId, 'tableId');
  const table = await prisma.diningTable.findFirst({
    where: { id, restaurantId },
  });
  if (!table) throw new AppError('Table not found', 404);
  return table;
}

export async function generateQrDataUrl(menuUrl) {
  return QRCode.toDataURL(menuUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 640,
    color: {
      dark: '#0f1f1c',
      light: '#ffffff',
    },
  });
}

function serializeQrRow(table, restaurant) {
  const menuUrl = buildTableMenuUrl(restaurant.slug, table.tableNumber);
  const generated = Boolean(table.qrGeneratedAt);
  return {
    ...serializeDiningTable(table, { restaurantSlug: restaurant.slug }),
    menuUrl,
    qrStatus: !table.isActive ? 'inactive' : generated ? 'ready' : 'pending',
    qrGeneratedAt: table.qrGeneratedAt,
    filename: `${restaurant.slug}-table-${String(table.tableNumber).padStart(2, '0')}.png`,
  };
}

export async function listAdminQrCodes(restaurantId) {
  const restaurant = await getRestaurant(restaurantId);
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: 'asc' },
  });

  return {
    restaurant: restaurantPublic(restaurant),
    regenerationPolicy:
      'QR links use /menu/{slug}?table={number}. Regenerating updates the image timestamp only; existing printed codes remain valid.',
    tables: tables.map((table) => serializeQrRow(table, restaurant)),
    stats: {
      total: tables.length,
      ready: tables.filter((table) => table.qrGeneratedAt && table.isActive).length,
      pending: tables.filter((table) => !table.qrGeneratedAt && table.isActive).length,
      inactive: tables.filter((table) => !table.isActive).length,
    },
  };
}

export async function generateAdminTableQr(restaurantId, tableId) {
  const restaurant = await getRestaurant(restaurantId);
  const existing = await getTableOwned(tableId, restaurantId);
  const menuUrl = buildTableMenuUrl(restaurant.slug, existing.tableNumber);

  // Ownership guard: menu URL slug must match this restaurant only.
  if (!menuUrl.includes(`/menu/${encodeURIComponent(restaurant.slug)}?`)) {
    throw new AppError('QR destination mismatch', 500);
  }

  const dataUrl = await generateQrDataUrl(menuUrl);
  const table = await prisma.diningTable.update({
    where: { id: existing.id },
    data: { qrGeneratedAt: new Date() },
  });

  return {
    restaurant: restaurantPublic(restaurant),
    table: serializeQrRow(table, restaurant),
    menuUrl,
    dataUrl,
    filename: serializeQrRow(table, restaurant).filename,
    printable: buildPrintable(restaurant, table),
  };
}

export async function generateAllAdminTableQrs(restaurantId) {
  const restaurant = await getRestaurant(restaurantId);
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { tableNumber: 'asc' },
  });

  if (tables.length === 0) {
    throw new AppError('No active tables to generate QR codes for', 400);
  }

  const now = new Date();
  const items = [];

  for (const table of tables) {
    const menuUrl = buildTableMenuUrl(restaurant.slug, table.tableNumber);
    const dataUrl = await generateQrDataUrl(menuUrl);
    const updated = await prisma.diningTable.update({
      where: { id: table.id },
      data: { qrGeneratedAt: now },
    });
    items.push({
      table: serializeQrRow(updated, restaurant),
      menuUrl,
      dataUrl,
      filename: serializeQrRow(updated, restaurant).filename,
      printable: buildPrintable(restaurant, updated),
    });
  }

  return {
    restaurant: restaurantPublic(restaurant),
    generatedCount: items.length,
    items,
  };
}

/**
 * Resolve a table for a restaurant by public table number.
 * Never accepts another restaurant's table id alone.
 */
export async function resolveRestaurantTable(restaurantId, { tableNumber, tableId } = {}) {
  if (tableId) {
    const id = validateCuid(tableId, 'tableId');
    const byId = await prisma.diningTable.findFirst({
      where: { id, restaurantId, isActive: true },
    });
    // Never bind another restaurant's table; unknown ids are ignored.
    if (byId) return byId;
  }

  if (tableNumber != null && tableNumber !== '') {
    const num = Number(tableNumber);
    if (!Number.isInteger(num) || num < 1) {
      return null;
    }
    return prisma.diningTable.findFirst({
      where: { restaurantId, tableNumber: num, isActive: true },
    });
  }

  return null;
}

export async function listPublicRestaurantTables(slug) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!restaurant || restaurant.status !== 'ACTIVE') {
    throw new AppError('Restaurant not found', 404);
  }

  const tables = await prisma.diningTable.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: { tableNumber: 'asc' },
    select: {
      id: true,
      tableNumber: true,
      name: true,
      capacity: true,
    },
  });

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    tables: tables.map((table) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      label: formatTableLabel(table.tableNumber),
      name: table.name,
      capacity: table.capacity,
    })),
  };
}
