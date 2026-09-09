/** Customer-facing service path (simplified for now). */
const TIMELINE_STEPS = [
  {
    key: 'RECEIVED',
    label: 'Received',
    statuses: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'],
  },
  { key: 'COMPLETED', label: 'Completed', statuses: ['COMPLETED'] },
];

const STATUS_COPY = {
  PLACED: {
    label: 'Received',
    estimate: 'Order received',
    detail: 'The kitchen has your order.',
  },
  ACCEPTED: {
    label: 'Received',
    estimate: 'Order received',
    detail: 'The kitchen has your order.',
  },
  PREPARING: {
    label: 'Received',
    estimate: 'Order received',
    detail: 'The kitchen has your order.',
  },
  READY: {
    label: 'Received',
    estimate: 'Order received',
    detail: 'The kitchen has your order.',
  },
  COMPLETED: {
    label: 'Completed',
    estimate: 'Completed',
    detail: 'Thanks for dining with us.',
  },
  REJECTED: {
    label: 'Rejected',
    estimate: 'Order declined',
    detail: 'Please speak with staff if you need help.',
  },
  CANCELLED: {
    label: 'Cancelled',
    estimate: 'Order cancelled',
    detail: 'This order is no longer active.',
  },
};

export function getStatusCopy(status) {
  return STATUS_COPY[String(status || '').toUpperCase()] || STATUS_COPY.PLACED;
}

export function isTerminalOrderStatus(status) {
  const key = String(status || '').toUpperCase();
  return key === 'COMPLETED' || key === 'REJECTED' || key === 'CANCELLED';
}

export function isActiveOrderStatus(status) {
  const key = String(status || '').toUpperCase();
  return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(key);
}

/** Friendly display like #1024 from ORD-20260829-1024 or ORD-...-0010 */
export function formatOrderDisplayNumber(orderNumber) {
  const raw = String(orderNumber || '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  const seq = parts[parts.length - 1];
  if (/^\d+$/.test(seq)) {
    const trimmed = seq.replace(/^0+(?=\d)/, '');
    return trimmed || seq;
  }
  return raw;
}

function timelineIndexForStatus(status) {
  const key = String(status || '').toUpperCase();
  const index = TIMELINE_STEPS.findIndex((step) => step.statuses.includes(key));
  return index >= 0 ? index : 0;
}

export function buildOrderTimeline(status) {
  const key = String(status || '').toUpperCase();

  if (key === 'REJECTED' || key === 'CANCELLED') {
    return {
      aborted: true,
      abortLabel: STATUS_COPY[key].label,
      steps: TIMELINE_STEPS.map((step, index) => ({
        key: step.key,
        label: step.label,
        state: index === 0 ? 'done' : 'idle',
      })),
    };
  }

  const activeIndex = timelineIndexForStatus(key);

  return {
    aborted: false,
    abortLabel: null,
    steps: TIMELINE_STEPS.map((step, index) => {
      let state = 'idle';
      if (index < activeIndex) state = 'done';
      else if (index === activeIndex) state = 'current';
      return {
        key: step.key,
        label: step.label,
        state,
      };
    }),
  };
}

export { TIMELINE_STEPS, STATUS_COPY };
