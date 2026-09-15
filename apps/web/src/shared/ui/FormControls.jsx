function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const baseControl =
  'w-full min-w-0 rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60';

function controlTone(error) {
  return error
    ? 'border-red-300 ring-2 ring-red-100'
    : 'border-[var(--line)] focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/15';
}

export function Input({ error, className = '', ...props }) {
  return (
    <input className={cx(baseControl, controlTone(error), className)} {...props} />
  );
}

export function Textarea({ error, className = '', rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cx(baseControl, controlTone(error), 'resize-y', className)}
      {...props}
    />
  );
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select className={cx(baseControl, controlTone(error), className)} {...props}>
      {children}
    </select>
  );
}
