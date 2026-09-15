import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, Trash2, UserRound, UserX } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { normalizeEmail, validateEmailField } from '../../shared/lib/validation.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { ConfirmDialog, Modal } from '../../shared/ui/Modal.jsx';

const EMPTY_FORM = { name: '', email: '', password: '' };

export function AdminCaptainsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editTouched, setEditTouched] = useState({});
  const [editError, setEditError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      setForm(EMPTY_FORM);
      setTouched({});
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'captains'] });
    },
    onError: (err) => setFormError(err),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateAdminCaptain(id, payload),
    onSuccess: async () => {
      setEditing(null);
      setEditForm(EMPTY_FORM);
      setEditTouched({});
      setEditError(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'captains'] });
    },
    onError: (err) => setEditError(err),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.updateAdminCaptain(id, { isActive }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'captains'] });
    },
    onError: (err) => setActionError(err.message || 'Could not update captain'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAdminCaptain(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'captains'] });
    },
    onError: (err) => {
      setDeleteTarget(null);
      setActionError(err.message || 'Could not delete captain');
    },
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

  const editClientErrors = useMemo(() => {
    const next = {};
    if (editTouched.name && editForm.name.trim().length < 2) {
      next.name = 'Name must be at least 2 characters';
    }
    if (editTouched.email) {
      const emailError = validateEmailField(editForm.email, { required: true, label: 'Email' });
      if (emailError) next.email = emailError;
    }
    if (editTouched.password && editForm.password && editForm.password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    }
    return next;
  }, [editForm, editTouched]);

  function fieldError(field) {
    return clientErrors[field] || formError?.body?.details?.fields?.[field] || null;
  }

  function editFieldError(field) {
    return editClientErrors[field] || editError?.body?.details?.fields?.[field] || null;
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

  function openEdit(captain) {
    setEditing(captain);
    setEditForm({ name: captain.name || '', email: captain.email || '', password: '' });
    setEditTouched({});
    setEditError(null);
  }

  function handleEditSubmit(event) {
    event.preventDefault();
    if (!editing) return;
    setEditTouched({ name: true, email: true, password: Boolean(editForm.password) });
    setEditError(null);

    const emailError = validateEmailField(editForm.email, { required: true, label: 'Email' });
    if (editForm.name.trim().length < 2 || emailError) return;
    if (editForm.password && editForm.password.length < 8) return;

    const payload = {
      name: editForm.name.trim(),
      email: normalizeEmail(editForm.email),
    };
    if (editForm.password) payload.password = editForm.password;

    updateMutation.mutate({ id: editing.id, payload });
  }

  const captains = captainsQuery.data || [];
  const bannerMessage =
    formError && !fieldError('name') && !fieldError('email') && !fieldError('password')
      ? formError.message
      : null;
  const editBanner =
    editError && !editFieldError('name') && !editFieldError('email') && !editFieldError('password')
      ? editError.message
      : null;
  const busy =
    toggleMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="min-w-0 space-y-6">
      <header className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
          Staff access
        </p>
        <h1
          className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Captains
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Captains sign in on their phone to view tables and add or edit open orders. Only you can
          print bills and settle payments.
        </p>
      </header>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(15,31,28,0.4)] sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="shrink-0 rounded-xl bg-[var(--teal)]/10 p-2 text-[var(--teal)]">
              <Plus size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--ink)]">Add captain</h2>
              <p className="text-sm text-[var(--muted)]">Name, email, and password for mobile login.</p>
            </div>
          </div>

          {bannerMessage ? <Alert tone="error">{bannerMessage}</Alert> : null}

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <label className="block">
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

            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              <KeyRound size={16} />
              {createMutation.isPending ? 'Creating…' : 'Create captain'}
            </Button>
          </form>
        </section>

        <section className="flex max-h-[min(70vh,40rem)] min-h-0 min-w-0 flex-col rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(15,31,28,0.4)] sm:p-6 xl:max-h-[calc(100vh-12rem)]">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--ink)]">Your captains</h2>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {captains.length} captain{captains.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {actionError ? (
            <div className="mt-3 shrink-0">
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
            <ul className="mt-4 min-h-0 flex-1 divide-y divide-[var(--line)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-[var(--surface)]/40">
              {captains.map((captain) => (
                <li
                  key={captain.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
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
                  <div className="flex flex-wrap items-center gap-2">
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
                      disabled={busy}
                      onClick={() => openEdit(captain)}
                      className="gap-1.5"
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
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
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => setDeleteTarget(captain)}
                      className="gap-1.5"
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(editing)}
        title="Edit captain"
        subtitle={editing ? editing.email : undefined}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditing(null);
            setEditError(null);
          }
        }}
      >
        {editBanner ? <Alert tone="error">{editBanner}</Alert> : null}
        <form onSubmit={handleEditSubmit} className="mt-1 grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Name
            </span>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setEditTouched((t) => ({ ...t, name: true }))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              autoComplete="name"
            />
            {editFieldError('name') ? (
              <p className="mt-1 text-xs font-medium text-red-600">{editFieldError('name')}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Email
            </span>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => setEditTouched((t) => ({ ...t, email: true }))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              autoComplete="off"
            />
            {editFieldError('email') ? (
              <p className="mt-1 text-xs font-medium text-red-600">{editFieldError('email')}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              New password (optional)
            </span>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              onBlur={() => setEditTouched((t) => ({ ...t, password: true }))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2"
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
            />
            {editFieldError('password') ? (
              <p className="mt-1 text-xs font-medium text-red-600">{editFieldError('password')}</p>
            ) : null}
          </label>

          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={updateMutation.isPending}
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
              <Pencil size={14} />
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete captain?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} (${deleteTarget.email}) permanently? They will no longer be able to sign in.`
            : ''
        }
        confirmLabel="Delete captain"
        danger
        loading={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
