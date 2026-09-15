import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getAdminSalesReport } from './admin.reports.service.js';

const OPEN_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];

/** Temporary edit window after password unlock (must unlock again next visit / after expiry). */
const UNLOCK_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export function toYmd(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function assertBusinessDate(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError('businessDate must be YYYY-MM-DD', 400);
  }
  const today = toYmd();
  if (raw > today) {
    throw new AppError('Cannot use a future business day', 400);
  }
  return raw;
}

/** Local noon for a YYYY-MM-DD business date (for backdated stamps). */
export function businessDateToLocalNoon(businessDate) {
  const ymd = assertBusinessDate(businessDate);
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function isUnlockActive(close, now = new Date()) {
  if (!close?.unlockedUntil) return false;
  return new Date(close.unlockedUntil).getTime() > now.getTime();
}

function unlockExpiresAt(now = new Date()) {
  return new Date(now.getTime() + UNLOCK_WINDOW_MS);
}

function serializeClose(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessDate: row.businessDate,
    closedAt: row.closedAt,
    note: row.note ?? null,
    summary: row.summaryJson ?? null,
    unlockedUntil: row.unlockedUntil ?? null,
    closedBy: row.closedBy
      ? { id: row.closedBy.id, name: row.closedBy.name, email: row.closedBy.email }
      : null,
  };
}

function buildSummaryJson(report, force, openOrders) {
  return {
    range: report.range,
    summary: report.summary,
    payments: report.payments,
    itemCount: report.items?.length || 0,
    billCount: report.bills?.length || 0,
    openTicketsForced: force ? openOrders.length : 0,
    closedWithOpenTickets: force && openOrders.length > 0,
  };
}

/**
 * Throws if this business date is locked by Day End close (no active unlock window).
 */
export async function assertBusinessDayEditable(restaurantId, businessDate) {
  const ymd = assertBusinessDate(businessDate);
  const close = await prisma.dayEndClose.findUnique({
    where: {
      restaurantId_businessDate: { restaurantId, businessDate: ymd },
    },
    select: { id: true, unlockedUntil: true },
  });
  if (close && !isUnlockActive(close)) {
    throw new AppError(
      'This business day is locked. Unlock Day End with your admin password to edit bills.',
      409,
      { code: 'DAY_LOCKED', businessDate: ymd },
    );
  }
  return ymd;
}

export async function assertOrderDayEditable(restaurantId, order) {
  const stamp = order.paidAt || order.createdAt || new Date();
  return assertBusinessDayEditable(restaurantId, toYmd(stamp));
}

export async function getDayEndStatus(restaurantId, query = {}) {
  const businessDate = assertBusinessDate(query.businessDate || toYmd());

  const [close, openCount, report, reopenCount] = await Promise.all([
    prisma.dayEndClose.findUnique({
      where: {
        restaurantId_businessDate: { restaurantId, businessDate },
      },
      include: {
        closedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: OPEN_STATUSES },
      },
    }),
    getAdminSalesReport(restaurantId, {
      preset: 'custom',
      from: businessDate,
      to: businessDate,
    }),
    prisma.dayEndReopenLog.count({
      where: { restaurantId, businessDate },
    }),
  ]);

  const isToday = businessDate === toYmd();
  const isClosed = Boolean(close);
  const isUnlocked = isClosed && isUnlockActive(close);
  const isLocked = isClosed && !isUnlocked;
  const canClose =
    (!isClosed && (isToday || businessDate < toYmd())) || isUnlocked;

  return {
    businessDate,
    isToday,
    isClosed,
    isLocked,
    isUnlocked,
    canClose,
    canUnlock: isLocked || (isClosed && !isUnlocked),
    reopenCount,
    openTicketCount: openCount,
    close: serializeClose(close),
    unlockedUntil: isUnlocked ? close.unlockedUntil : null,
    report,
  };
}

/**
 * Close business-day operations (PetPooja-style Day End).
 * Also re-locks an unlocked day and refreshes the sales snapshot.
 */
export async function closeDayEnd(restaurantId, userId, body = {}) {
  const businessDate = assertBusinessDate(body.businessDate || toYmd());
  const force = body.force === true;
  const note =
    typeof body.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, 500)
      : null;

  const existing = await prisma.dayEndClose.findUnique({
    where: {
      restaurantId_businessDate: { restaurantId, businessDate },
    },
  });
  if (existing && !isUnlockActive(existing)) {
    throw new AppError('This business day is already closed', 409, {
      code: 'DAY_ALREADY_CLOSED',
      closeId: existing.id,
    });
  }

  const openOrders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: { in: OPEN_STATUSES },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      table: { select: { tableNumber: true } },
    },
    take: 30,
  });

  if (openOrders.length > 0 && !force) {
    throw new AppError(
      `Cannot end day: ${openOrders.length} open ticket(s) still active. Settle or cancel them first.`,
      409,
      {
        code: 'OPEN_TICKETS',
        openTicketCount: openOrders.length,
        openTickets: openOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          tableNumber: order.table?.tableNumber ?? null,
        })),
      },
    );
  }

  const report = await getAdminSalesReport(restaurantId, {
    preset: 'custom',
    from: businessDate,
    to: businessDate,
  });

  const summaryJson = buildSummaryJson(report, force, openOrders);

  const saved = existing
    ? await prisma.dayEndClose.update({
        where: { id: existing.id },
        data: {
          closedAt: new Date(),
          closedByUserId: userId || null,
          note: note ?? existing.note,
          summaryJson,
          unlockedUntil: null,
          unlockedByUserId: null,
        },
        include: {
          closedBy: { select: { id: true, name: true, email: true } },
        },
      })
    : await prisma.dayEndClose.create({
        data: {
          restaurantId,
          businessDate,
          closedByUserId: userId || null,
          note,
          summaryJson,
        },
        include: {
          closedBy: { select: { id: true, name: true, email: true } },
        },
      });

  return {
    close: serializeClose(saved),
    report,
    openTicketCount: openOrders.length,
  };
}

/**
 * Unlock a closed business day after verifying the restaurant admin password.
 * Keeps the Day End record locked in the DB; opens a short edit window only.
 * Password is required again after the window expires or after End Day.
 */
export async function unlockDayEnd(restaurantId, userId, body = {}) {
  const businessDate = assertBusinessDate(body.businessDate || toYmd());
  const password = typeof body.password === 'string' ? body.password : '';
  const reason =
    typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim().slice(0, 300)
      : null;

  if (!password) {
    throw new AppError('Admin password is required to unlock this day', 400);
  }

  const close = await prisma.dayEndClose.findUnique({
    where: {
      restaurantId_businessDate: { restaurantId, businessDate },
    },
  });
  if (!close) {
    throw new AppError('This business day is not locked', 400, {
      code: 'DAY_NOT_CLOSED',
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      restaurantId,
      role: 'RESTAURANT_ADMIN',
      isActive: true,
    },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    throw new AppError('Only the restaurant admin can unlock Day End', 403);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Incorrect password', 401, { code: 'INVALID_PASSWORD' });
  }

  const unlockedUntil = unlockExpiresAt();

  await prisma.$transaction(async (tx) => {
    await tx.dayEndClose.update({
      where: { id: close.id },
      data: {
        unlockedUntil,
        unlockedByUserId: userId,
      },
    });
    await tx.dayEndReopenLog.create({
      data: {
        restaurantId,
        businessDate,
        reopenedByUserId: userId,
        reason,
      },
    });
  });

  return getDayEndStatus(restaurantId, { businessDate });
}
