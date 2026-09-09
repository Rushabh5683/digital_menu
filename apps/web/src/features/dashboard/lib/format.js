export function formatSeconds(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const seconds = Math.round(Number(value));
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) return `${minutes}m`;
  return `${minutes}m ${remainder}s`;
}

export function formatPercent(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}%`;
}

export function formatRate(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(0)}%`;
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN').format(Number(value));
}

export function startOfDayISO(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

export function endOfDayISO(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

export function getDateRangePreset(preset) {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfDayISO(now), to: endOfDayISO(now), label: 'Today' };
    case '7d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDayISO(from), to: endOfDayISO(now), label: 'Last 7 days' };
    }
    case '30d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: startOfDayISO(from), to: endOfDayISO(now), label: 'Last 30 days' };
    }
    case 'all':
    default:
      return { from: null, to: null, label: 'All time' };
  }
}

export function withAttentionShare(categories = []) {
  const total = categories.reduce(
    (sum, category) => sum + (Number(category.totalAttentionSeconds) || 0),
    0,
  );

  return categories.map((category) => ({
    ...category,
    attentionSharePercent:
      total > 0 ? ((Number(category.totalAttentionSeconds) || 0) / total) * 100 : 0,
  }));
}
