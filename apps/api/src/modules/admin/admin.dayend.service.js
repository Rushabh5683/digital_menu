import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getAdminSalesReport } from './admin.reports.service.js';

const OPEN_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];

function toYmd(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function assertBusinessDate(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError('businessDate must be YYYY-MM-DD', 400);
  }
  const today = toYmd();
  if (raw > today) {
    throw new AppError('Cannot close a future business day', 400);
  }
  return raw;
}

function serializeClose(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessDate: row.businessDate,
    closedAt: row.closedAt,
    note: row.note ?? null,
    summary: row.summaryJson ?? null,
    closedBy: row.closedBy
      ? { id: row.closedBy.id, name: row.closedBy.name, email: row.closedBy.email }
      : null,
  };
}

export async function getDayEndStatus(restaurantId, query = {}) {
  const businessDate = assertBusinessDate(query.businessDate || toYmd());

  const [close, openCount, report] = await Promise.all([
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
  ]);

  const isToday = businessDate === toYmd();
  const canClose = !close && (isToday || businessDate < toYmd());

  return {
    businessDate,
    isToday,
    isClosed: Boolean(close),
    canClose,
    openTicketCount: openCount,
    close: serializeClose(close),
    report,
  };
}

/**
 * Close business-day operations (PetPooja-style Day End).
 * Blocks when open kitchen tickets remain unless force=true.
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
  if (existing) {
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

  const summaryJson = {
    range: report.range,
    summary: report.summary,
    payments: report.payments,
    itemCount: report.items?.length || 0,
    billCount: report.bills?.length || 0,
    openTicketsForced: force ? openOrders.length : 0,
    closedWithOpenTickets: force && openOrders.length > 0,
  };

  const created = await prisma.dayEndClose.create({
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
    close: serializeClose(created),
    report,
    openTicketCount: openOrders.length,
  };
}
