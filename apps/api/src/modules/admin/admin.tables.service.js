import { env } from '../../config.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';

function optionalString(value, max = 120) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > max) throw new AppError(`Value must be at most ${max} characters`, 400);
  return text;
}

function parseTableNumber(value, label = 'Table number') {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 9999) {
    throw new AppError(`${label} must be a whole number from 1 to 9999`, 400);
  }
  return num;
}

function parseCapacity(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 200) {
    throw new AppError('Capacity must be a whole number from 1 to 200', 400);
  }
  return num;
}

function parseBoolean(value, fallback = true) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return Boolean(value);
}

export function formatTableLabel(tableNumber) {
  const num = Number(tableNumber);
  if (!Number.isFinite(num)) return `Table ${tableNumber}`;
  return `Table ${String(num).padStart(2, '0')}`;
}

export function serializeDiningTable(table, { restaurantSlug } = {}) {
  const menuUrl =
    restaurantSlug != null
      ? buildTableMenuUrl(restaurantSlug, table.tableNumber)
      : null;

  return {
    id: table.id,
    restaurantId: table.restaurantId,
    tableNumber: table.tableNumber,
    label: formatTableLabel(table.tableNumber),
    name: table.name,
    capacity: table.capacity,
    isActive: Boolean(table.isActive),
    qrGeneratedAt: table.qrGeneratedAt ?? null,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    menuUrl,
  };
}

/**
 * Public guest URL encoded in QR codes.
 * Stable by design: regenerating QR images does not change this destination.
 */
export function buildTableMenuUrl(restaurantSlug, tableNumber) {
  const base = env.publicAppUrl;
  const params = new URLSearchParams({
    table: String(tableNumber),
  });
  return `${base}/menu/${encodeURIComponent(restaurantSlug)}?${params.toString()}`;
}

async function getRestaurantSlug(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { slug: true },
  });
  if (!restaurant) throw new AppError('Restaurant not found', 404);
  return restaurant.slug;
}

async function getTableOwned(tableId, restaurantId) {
  const id = validateCuid(tableId, 'tableId');
  const table = await prisma.diningTable.findFirst({
    where: { id, restaurantId },
  });
  if (!table) throw new AppError('Table not found', 404);
  return table;
}

export async function listAdminTables(restaurantId) {
  const slug = await getRestaurantSlug(restaurantId);
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: 'asc' },
  });
  return {
    tables: tables.map((table) => serializeDiningTable(table, { restaurantSlug: slug })),
  };
}

export async function createAdminTable(restaurantId, body = {}) {
  const tableNumber = parseTableNumber(body.tableNumber);
  const name = optionalString(body.name, 80);
  const capacity = parseCapacity(body.capacity);
  const isActive = body.isActive === undefined ? true : parseBoolean(body.isActive, true);
  const slug = await getRestaurantSlug(restaurantId);

  try {
    const table = await prisma.diningTable.create({
      data: {
        restaurantId,
        tableNumber,
        name,
        capacity,
        isActive,
      },
    });
    return { table: serializeDiningTable(table, { restaurantSlug: slug }) };
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new AppError(`Table number ${tableNumber} already exists`, 409);
    }
    throw error;
  }
}

export async function bulkCreateAdminTables(restaurantId, body = {}) {
  const from = parseTableNumber(body.from, 'From');
  const to = parseTableNumber(body.to, 'To');
  if (to < from) throw new AppError('To must be greater than or equal to From', 400);
  if (to - from + 1 > 100) {
    throw new AppError('Bulk create is limited to 100 tables at a time', 400);
  }

  const capacity = parseCapacity(body.capacity);
  const isActive = body.isActive === undefined ? true : parseBoolean(body.isActive, true);
  const slug = await getRestaurantSlug(restaurantId);

  const numbers = [];
  for (let n = from; n <= to; n += 1) numbers.push(n);

  const existing = await prisma.diningTable.findMany({
    where: {
      restaurantId,
      tableNumber: { in: numbers },
    },
    select: { tableNumber: true },
  });
  const existingSet = new Set(existing.map((row) => row.tableNumber));
  const toCreate = numbers.filter((n) => !existingSet.has(n));
  const skipped = numbers.filter((n) => existingSet.has(n));

  if (toCreate.length === 0) {
    throw new AppError(
      `All table numbers from ${from} to ${to} already exist`,
      409,
    );
  }

  await prisma.diningTable.createMany({
    data: toCreate.map((tableNumber) => ({
      restaurantId,
      tableNumber,
      capacity,
      isActive,
    })),
  });

  const tables = await prisma.diningTable.findMany({
    where: { restaurantId, tableNumber: { in: toCreate } },
    orderBy: { tableNumber: 'asc' },
  });

  return {
    created: tables.map((table) => serializeDiningTable(table, { restaurantSlug: slug })),
    skipped,
    createdCount: tables.length,
    skippedCount: skipped.length,
  };
}

export async function updateAdminTable(restaurantId, tableId, body = {}) {
  await getTableOwned(tableId, restaurantId);
  const slug = await getRestaurantSlug(restaurantId);
  const data = {};

  if (body.tableNumber !== undefined) data.tableNumber = parseTableNumber(body.tableNumber);
  if (body.name !== undefined) data.name = optionalString(body.name, 80);
  if (body.capacity !== undefined) data.capacity = parseCapacity(body.capacity);
  if (body.isActive !== undefined) data.isActive = parseBoolean(body.isActive, true);

  if (Object.keys(data).length === 0) throw new AppError('No changes provided', 400);

  try {
    const table = await prisma.diningTable.update({
      where: { id: tableId },
      data,
    });
    return { table: serializeDiningTable(table, { restaurantSlug: slug }) };
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new AppError(`Table number ${data.tableNumber} already exists`, 409);
    }
    throw error;
  }
}

export async function setAdminTableActive(restaurantId, tableId, isActive) {
  await getTableOwned(tableId, restaurantId);
  const slug = await getRestaurantSlug(restaurantId);
  const table = await prisma.diningTable.update({
    where: { id: tableId },
    data: { isActive: Boolean(isActive) },
  });
  return { table: serializeDiningTable(table, { restaurantSlug: slug }) };
}

export async function deleteAdminTable(restaurantId, tableId) {
  await getTableOwned(tableId, restaurantId);
  await prisma.diningTable.delete({ where: { id: tableId } });
  return { ok: true, id: tableId };
}

export async function getAdminTableQr(restaurantId, tableId) {
  const { generateAdminTableQr } = await import('./admin.qr.service.js');
  return generateAdminTableQr(restaurantId, tableId);
}
