export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className = '',
}) {
  return (
    <label className={['block space-y-2', className].filter(Boolean).join(' ')} htmlFor={htmlFor}>
      {label ? (
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
          {required ? ' *' : ''}
        </span>
      ) : null}
      {children}
      {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </label>
  );
}
