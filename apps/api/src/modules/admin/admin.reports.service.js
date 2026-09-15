import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYmd(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolve report window from preset or from/to (YYYY-MM-DD, local).
 * @returns {{ from: Date, to: Date, preset: string, label: string }}
 * `to` is exclusive end.
 */
export function resolveReportRange(query = {}) {
  const presetRaw = typeof query.preset === 'string' ? query.preset.trim().toLowerCase() : '';
  const fromRaw = typeof query.from === 'string' ? query.from.trim() : '';
  const toRaw = typeof query.to === 'string' ? query.to.trim() : '';

  const todayStart = startOfLocalDay();
  const tomorrow = addDays(todayStart, 1);

  if (presetRaw === 'yesterday') {
    const from = addDays(todayStart, -1);
    return { from, to: todayStart, preset: 'yesterday', label: 'Yesterday' };
  }
  if (presetRaw === '7d') {
    const from = addDays(todayStart, -6);
    return { from, to: tomorrow, preset: '7d', label: 'Last 7 days' };
  }
  if (presetRaw === '30d') {
    const from = addDays(todayStart, -29);
    return { from, to: tomorrow, preset: '30d', label: 'Last 30 days' };
  }
  if (presetRaw === 'today' || (!presetRaw && !fromRaw && !toRaw)) {
    return { from: todayStart, to: tomorrow, preset: 'today', label: 'Today' };
  }

  // Custom range
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
    throw new AppError('Provide from and to as YYYY-MM-DD, or use preset', 400);
  }
  const from = new Date(`${fromRaw}T00:00:00`);
  const toInclusive = new Date(`${toRaw}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime())) {
    throw new AppError('Invalid from/to dates', 400);
  }
  if (toInclusive < from) {
    throw new AppError('to must be on or after from', 400);
  }
  const maxSpanMs = 366 * 24 * 60 * 60 * 1000;
  if (toInclusive.getTime() - from.getTime() > maxSpanMs) {
    throw new AppError('Date range cannot exceed 366 days', 400);
  }
  const to = addDays(toInclusive, 1);
  return {
    from,
    to,
    preset: 'custom',
    label: `${fromRaw} → ${toRaw}`,
  };
}

const PAYMENT_LABELS = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI_GPAY: 'GPay',
  UPI_PHONEPE: 'PhonePe',
  UPI_OTHER: 'Other UPI',
  OTHER: 'Others',
  PART: 'Part payment',
};

/**
 * PetPooja-style sales report for completed (settled) orders in range.
 */
export async function getAdminSalesReport(restaurantId, query = {}) {
  const range = resolveReportRange(query);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: 'COMPLETED',
      createdAt: { gte: range.from, lt: range.to },
    },
    include: {
      table: { select: { tableNumber: true } },
      items: {
        select: {
          dishId: true,
          dishNameSnapshot: true,
          quantity: true,
          subtotal: true,
          priceSnapshot: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  let grossSales = 0;
  let foodSubtotal = 0;
  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let roundOffAmount = 0;
  let unitsSold = 0;

  const paymentMap = new Map();
  const itemMap = new Map();
  const dayMap = new Map();

  for (const order of orders) {
    const total = money(order.total);
    const sub = money(order.subtotal);
    const tax = money(order.taxAmount);
    const cgst = money(order.cgstAmount);
    const sgst = money(order.sgstAmount);
    const round = money(order.roundOffAmount);

    grossSales += total;
    foodSubtotal += sub;
    taxAmount += tax;
    cgstAmount += cgst;
    sgstAmount += sgst;
    roundOffAmount += round;

    const method = order.paymentMethod || 'OTHER';
    if (method === 'PART' && Array.isArray(order.paymentSplits) && order.paymentSplits.length) {
      for (const split of order.paymentSplits) {
        const splitMethod = split?.method || 'OTHER';
        const splitAmount = money(split?.amount);
        const pay = paymentMap.get(splitMethod) || { method: splitMethod, count: 0, amount: 0 };
        pay.count += 1;
        pay.amount = money(pay.amount + splitAmount);
        paymentMap.set(splitMethod, pay);
      }
    } else {
      const pay = paymentMap.get(method) || { method, count: 0, amount: 0 };
      pay.count += 1;
      pay.amount = money(pay.amount + total);
      paymentMap.set(method, pay);
    }

    const dayKey = toYmd(order.createdAt);
    const day = dayMap.get(dayKey) || {
      date: dayKey,
      orders: 0,
      revenue: 0,
      units: 0,
      tax: 0,
    };
    day.orders += 1;
    day.revenue = money(day.revenue + total);
    day.tax = money(day.tax + tax);

    for (const item of order.items || []) {
      const qty = Number(item.quantity) || 0;
      const line = money(item.subtotal);
      unitsSold += qty;
      day.units += qty;

      const key = item.dishId || item.dishNameSnapshot;
      const row = itemMap.get(key) || {
        dishId: item.dishId,
        name: item.dishNameSnapshot,
        quantity: 0,
        amount: 0,
      };
      row.quantity += qty;
      row.amount = money(row.amount + line);
      itemMap.set(key, row);
    }

    dayMap.set(dayKey, day);
  }

  const orderCount = orders.length;
  const averageTicket = orderCount > 0 ? money(grossSales / orderCount) : 0;

  const payments = [...paymentMap.values()]
    .map((row) => ({
      ...row,
      label: PAYMENT_LABELS[row.method] || row.method,
      share: grossSales > 0 ? money((row.amount / grossSales) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const items = [...itemMap.values()]
    .sort((a, b) => b.amount - a.amount || b.quantity - a.quantity)
    .slice(0, 100);

  const days = [...dayMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  const bills = orders
    .slice()
    .reverse()
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: money(order.total),
      subtotal: money(order.subtotal),
      taxAmount: money(order.taxAmount),
      paymentMethod: order.paymentMethod,
      paymentLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || '—',
      paymentNote: order.paymentNote ?? null,
      paymentSplits: Array.isArray(order.paymentSplits) ? order.paymentSplits : null,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      tableNumber: order.table?.tableNumber ?? null,
      tableLabel:
        order.table?.tableNumber != null
          ? `Table ${String(order.table.tableNumber).padStart(2, '0')}`
          : null,
      itemCount: (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    }));

  const appreciationShares = await prisma.orderAppreciationShare.findMany({
    where: {
      createdAt: { gte: range.from, lt: range.to },
      order: {
        restaurantId,
        status: 'COMPLETED',
      },
    },
    include: {
      captain: { select: { id: true, name: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          paymentMethod: true,
          table: { select: { tableNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const captainMap = new Map();
  let staffAppreciationTotal = 0;
  const staffAppreciationEntries = [];
  for (const share of appreciationShares) {
    const amount = money(share.amount);
    staffAppreciationTotal = money(staffAppreciationTotal + amount);
    const captainId = share.captainUserId;
    const paymentMethod = share.order?.paymentMethod || null;
    const paymentLabel = PAYMENT_LABELS[paymentMethod] || paymentMethod || '—';
    const row = captainMap.get(captainId) || {
      captainId,
      captainName: share.captain?.name || 'Captain',
      amount: 0,
      count: 0,
    };
    row.amount = money(row.amount + amount);
    row.count += 1;
    captainMap.set(captainId, row);

    staffAppreciationEntries.push({
      id: share.id,
      amount,
      createdAt: share.createdAt,
      captainId,
      captainName: share.captain?.name || 'Captain',
      paymentMethod,
      paymentLabel,
      orderId: share.order?.id || null,
      orderNumber: share.order?.orderNumber || null,
      tableLabel:
        share.order?.table?.tableNumber != null
          ? `Table ${String(share.order.table.tableNumber).padStart(2, '0')}`
          : null,
    });
  }

  const staffAppreciationByCaptain = [...captainMap.values()].sort(
    (a, b) => b.amount - a.amount || a.captainName.localeCompare(b.captainName),
  );

  return {
    range: {
      preset: range.preset,
      label: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      fromDate: toYmd(range.from),
      toDate: toYmd(addDays(range.to, -1)),
    },
    summary: {
      orderCount,
      unitsSold,
      grossSales: money(grossSales),
      foodSubtotal: money(foodSubtotal),
      taxAmount: money(taxAmount),
      cgstAmount: money(cgstAmount),
      sgstAmount: money(sgstAmount),
      roundOffAmount: money(roundOffAmount),
      averageTicket,
      staffAppreciationTotal: money(staffAppreciationTotal),
      staffAppreciationCount: appreciationShares.length,
    },
    payments,
    items,
    days,
    recentOrders: bills.slice(0, 40),
    bills,
    staffAppreciation: {
      total: money(staffAppreciationTotal),
      count: appreciationShares.length,
      byCaptain: staffAppreciationByCaptain,
      entries: staffAppreciationEntries,
    },
  };
}
