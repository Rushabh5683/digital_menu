export function FormSection({ title, description, children, className = '' }) {
  return (
    <section
      className={[
        'space-y-4 rounded-2xl border border-[var(--line)] bg-white/70 p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || description) && (
        <div>
          {title ? <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}
