import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCuid } from '../../utils/validate.js';

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Staff appreciation collected for a captain (or all captains for admin overview).
 */
export async function getStaffAppreciation(restaurantId, { captainUserId = null } = {}) {
  const rid = validateCuid(restaurantId, 'restaurantId');
  const todayStart = startOfLocalDay();

  const where = {
    order: {
      restaurantId: rid,
      status: 'COMPLETED',
    },
    ...(captainUserId
      ? { captainUserId: validateCuid(captainUserId, 'captainUserId') }
      : {}),
  };

  const [todayShares, recentShares] = await Promise.all([
    prisma.orderAppreciationShare.findMany({
      where: {
        ...where,
        createdAt: { gte: todayStart },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            paidAt: true,
            paymentMethod: true,
            table: { select: { tableNumber: true } },
          },
        },
        captain: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orderAppreciationShare.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            paidAt: true,
            paymentMethod: true,
            table: { select: { tableNumber: true } },
          },
        },
        captain: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  const todayTotal = money(todayShares.reduce((sum, row) => sum + Number(row.amount), 0));
  const allTimeTotal = money(
    (
      await prisma.orderAppreciationShare.aggregate({
        where,
        _sum: { amount: true },
      })
    )._sum.amount || 0,
  );

  const PAYMENT_LABELS = {
    CASH: 'Cash',
    CARD: 'Card',
    UPI_GPAY: 'GPay',
    UPI_PHONEPE: 'PhonePe',
    UPI_OTHER: 'Other UPI',
    OTHER: 'Others',
    PART: 'Part payment',
  };

  const serialize = (row) => {
    const paymentMethod = row.order?.paymentMethod || null;
    return {
      id: row.id,
      amount: money(row.amount),
      createdAt: row.createdAt,
      paymentMethod,
      paymentLabel: PAYMENT_LABELS[paymentMethod] || paymentMethod || '—',
      captain: row.captain
        ? { id: row.captain.id, name: row.captain.name }
        : null,
      order: {
        id: row.order.id,
        orderNumber: row.order.orderNumber,
        paidAt: row.order.paidAt,
        tableLabel:
          row.order.table?.tableNumber != null
            ? `Table ${String(row.order.table.tableNumber).padStart(2, '0')}`
            : null,
      },
    };
  };

  return {
    summary: {
      todayTotal,
      allTimeTotal,
      todayCount: todayShares.length,
    },
    today: todayShares.map(serialize),
    recent: recentShares.map(serialize),
  };
}

export async function getCaptainStaffAppreciation(restaurantId, captainUserId) {
  if (!captainUserId) {
    throw new AppError('Captain context required', 400);
  }
  return getStaffAppreciation(restaurantId, { captainUserId });
}
