const tones = {
  error: 'border-red-200 bg-red-50 text-[var(--danger)]',
  success: 'border-[var(--teal)]/20 bg-[var(--teal)]/8 text-[var(--teal)]',
  warning: 'border-[var(--accent)]/30 bg-[var(--accent)]/12 text-[var(--accent-deep)]',
  info: 'border-[var(--line)] bg-white text-[var(--ink)]',
};

export function Alert({ tone = 'info', children, className = '', role }) {
  return (
    <div
      role={role || (tone === 'error' ? 'alert' : undefined)}
      className={[
        'rounded-xl border px-4 py-3 text-sm',
        tones[tone] || tones.info,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
