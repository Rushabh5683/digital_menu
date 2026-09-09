const styles = {
  ACTIVE: 'bg-[var(--teal)]/10 text-[var(--teal)] border-[var(--teal)]/20',
  INACTIVE: 'bg-black/5 text-[var(--muted)] border-[var(--line)]',
  PENDING: 'bg-[var(--accent)]/15 text-[var(--accent-deep)] border-[var(--accent)]/25',
  PUBLISHED: 'bg-[var(--teal)]/10 text-[var(--teal)] border-[var(--teal)]/20',
  DRAFT: 'bg-[var(--accent)]/12 text-[var(--accent-deep)] border-[var(--accent)]/20',
  NONE: 'bg-black/5 text-[var(--muted)] border-[var(--line)]',
  PLACED: 'bg-[var(--accent)]/15 text-[var(--accent-deep)] border-[var(--accent)]/25',
  ACCEPTED: 'bg-[var(--teal)]/10 text-[var(--teal)] border-[var(--teal)]/20',
  PREPARING: 'bg-sky-50 text-sky-800 border-sky-200',
  READY: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-black/5 text-[var(--muted)] border-[var(--line)]',
  REJECTED: 'bg-red-50 text-[var(--danger)] border-red-200',
  CANCELLED: 'bg-black/5 text-[var(--muted)] border-[var(--line)]',
};

const labels = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  NONE: 'No menu',
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status, className = '' }) {
  const key = String(status || '').toUpperCase();

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
        styles[key] || styles.INACTIVE,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {labels[key] || status || 'Unknown'}
    </span>
  );
}
