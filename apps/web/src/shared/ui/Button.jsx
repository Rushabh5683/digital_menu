function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  const variants = {
    primary: 'bg-[var(--ink)] text-white hover:bg-black',
    accent: 'bg-[var(--accent)] text-[var(--ink)] hover:brightness-105',
    secondary:
      'border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-black/[0.02]',
    danger: 'bg-[var(--danger)] text-white hover:bg-[#7f2424]',
    ghost: 'text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]',
  };

  const sizes = {
    sm: 'min-h-9 rounded-xl px-3 py-2 text-xs font-semibold',
    md: 'min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold',
    lg: 'min-h-12 rounded-2xl px-5 py-3.5 text-sm font-bold',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
