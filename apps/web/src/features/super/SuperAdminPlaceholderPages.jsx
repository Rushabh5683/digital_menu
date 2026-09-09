import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

export function SuperAdminOrdersPage() {
  return (
    <PlaceholderPage
      eyebrow="Orders overview"
      title="Kitchen network pulse"
      description="Cross-restaurant order volume will appear here once ordering ships. Counts stay at zero until then — no fabricated metrics."
      icon={ClipboardList}
    />
  );
}

export function SuperAdminAnalyticsPage() {
  return (
    <PlaceholderPage
      eyebrow="Platform analytics"
      title="Network attention intelligence"
      description="Platform-wide attention rollups will land here. Per-restaurant analytics remain available inside each restaurant workspace."
      action={{ to: '/superadmin/restaurants', label: 'Browse restaurants' }}
    />
  );
}

export function SuperAdminSettingsPage() {
  return (
    <PlaceholderPage
      eyebrow="Settings"
      title="Platform preferences"
      description="Security, branding, and onboarding defaults for the Super Admin console will live here in a later phase."
    />
  );
}

function PlaceholderPage({ eyebrow, title, description, icon: Icon, action }) {
  return (
    <div className="menu-fade-up mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white/85 px-6 py-14 text-center shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:px-10">
      {Icon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--teal)]">
          <Icon size={20} />
        </div>
      ) : null}
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
        {eyebrow}
      </p>
      <h2
        className="mt-3 text-3xl tracking-tight text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      {action ? (
        <Link
          to={action.to}
          className="mt-6 inline-flex rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
