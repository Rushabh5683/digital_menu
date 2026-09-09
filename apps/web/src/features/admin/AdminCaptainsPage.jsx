import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, UserRound, UserX } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { normalizeEmail, validateEmailField } from '../../shared/lib/validation.js';

export function AdminCaptainsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const captainsQuery = useQuery({
    queryKey: ['admin', 'captains'],
    queryFn: async () => {
      const payload = await api.listAdminCaptains();
      return payload.captains || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createAdminCaptain(payload),
    onSuccess: async () => {
      setForm({ name: '', email: '', password: '' });
      setTouched({});
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'captains'] });
    },
    onError: (err) => setFormError(err),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.updateAdminCaptain(id, { isActive }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'captains'] });
    },
    onError: (err) => setActionError(err.message || 'Could not update captain'),
  });

  const clientErrors = useMemo(() => {
    const next = {};
    if (touched.name && form.name.trim().length < 2) {
      next.name = 'Name must be at least 2 characters';
    }
    if (touched.email) {
      const emailError = validateEmailField(form.email, { required: true, label: 'Email' });
      if (emailError) next.email = emailError;
    }
    if (touched.password) {
      if (!form.password) next.password = 'Password is required';
      else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    }
    return next;
  }, [form, touched]);

  function fieldError(field) {
    return (
      clientErrors[field] ||
      formError?.body?.details?.fields?.[field] ||
      null
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setFormError(null);

    const emailError = validateEmailField(form.email, { required: true, label: 'Email' });
    if (form.name.trim().length < 2 || emailError || form.password.length < 8) {
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      email: normalizeEmail(form.email),
      password: form.password,
    });
  }

  const captains = captainsQuery.data || [];
  const bannerMessage =
    formError && !fieldError('name') && !fieldError('email') && !fieldError('password')
      ? formError.message
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
          Staff access
        </p>
        <h1
          className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Captains
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Captains sign in on their phone to view tables and add or edit open orders. Only you can
          print bills and settle payments.
        </p>
      </header>

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(15,31,28,0.4)] sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-[var(--teal)]/10 p-2 text-[var(--teal)]">
            <Plus size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Add captain</h2>
            <p className="text-sm text-[var(--muted)]">Name, email, and password for mobile login.</p>
          </div>
        </div>

        {bannerMessage ? <Alert tone="error">{bannerMessage}</Alert> : null}

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Name
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              placeholder="Rahul Sharma"
              autoComplete="name"
            />
            {fieldError('name') ? (
              <p className="mt-1 text-xs font-medium text-red-600">{fieldError('name')}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              placeholder="captain@restaurant.com"
              autoComplete="off"
            />
            {fieldError('email') ? (
              <p className="mt-1 text-xs font-medium text-red-600">{fieldError('email')}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Password
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            {fieldError('password') ? (
              <p className="mt-1 text-xs font-medium text-red-600">{fieldError('password')}</p>
            ) : null}
          </label>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              <KeyRound size={16} />
              {createMutation.isPending ? 'Creating…' : 'Create captain'}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(15,31,28,0.4)] sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Your captains</h2>
        {actionError ? (
          <div className="mt-3">
            <Alert tone="error">{actionError}</Alert>
          </div>
        ) : null}

        {captainsQuery.isLoading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Loading captains…</p>
        ) : captains.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            No captains yet. Add one so floor staff can take orders from their phones.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {captains.map((captain) => (
              <li
                key={captain.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--teal)]/10 text-[var(--teal)]">
                    <UserRound size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">{captain.name}</p>
                    <p className="truncate text-sm text-[var(--muted)]">{captain.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                      captain.isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-black/[0.05] text-[var(--muted)]',
                    ].join(' ')}
                  >
                    {captain.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={toggleMutation.isPending}
                    onClick={() =>
                      toggleMutation.mutate({
                        id: captain.id,
                        isActive: !captain.isActive,
                      })
                    }
                    className="gap-1.5"
                  >
                    <UserX size={14} />
                    {captain.isActive ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
