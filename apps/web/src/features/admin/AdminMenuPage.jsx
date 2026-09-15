import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, UtensilsCrossed } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input, Textarea } from '../../shared/ui/FormControls.jsx';
import { FormSection } from '../../shared/ui/FormSection.jsx';
import { ConfirmDialog, Modal } from '../../shared/ui/Modal.jsx';
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx';
import { staffMenuPreviewPath } from '../menu/lib/staffPreview.js';

function formatUpdated(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function AdminMenuPage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const restaurantQuery = useQuery({
    queryKey: ['admin', 'restaurant'],
    queryFn: async () => (await api.getAdminRestaurant()).restaurant,
  });

  const menusQuery = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: async () => (await api.listAdminMenus()).menus,
  });

  const slug = restaurantQuery.data?.slug;

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id) return api.updateAdminMenu(id, payload);
      return api.createAdminMenu(payload);
    },
    onSuccess: async () => {
      setEditor(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, publish }) => {
      if (publish) return api.publishAdminMenu(id);
      return api.unpublishAdminMenu(id);
    },
    onMutate: async ({ id, publish }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'menus'] });
      const previous = queryClient.getQueryData(['admin', 'menus']);
      queryClient.setQueryData(['admin', 'menus'], (menus = []) =>
        menus.map((menu) => ({
          ...menu,
          isPublished: menu.id === id ? publish : publish ? false : menu.isPublished,
        })),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['admin', 'menus'], context.previous);
      setActionError(error.message);
    },
    onSettled: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAdminMenu(id),
    onSuccess: async () => {
      setConfirm(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
    onError: (error) => setActionError(error.message),
  });

  const menus = menusQuery.data || [];
  const published = useMemo(() => menus.find((menu) => menu.isPublished), [menus]);

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">Menu</p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Menu publishing
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Create menus, publish one live version for guests, and preview the customer experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {slug && published ? (
            <a
              href={staffMenuPreviewPath(slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-black/[0.02]"
            >
              Preview live menu
              <ExternalLink size={14} />
            </a>
          ) : null}
          <Button
            onClick={() => {
              setFormError(null);
              setEditor({ id: null, name: '', description: '' });
            }}
          >
            <Plus size={16} />
            New menu
          </Button>
        </div>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
        {menusQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">Loading menus…</p>
        ) : null}

        {menusQuery.error ? (
          <Alert tone="error">
            {menusQuery.error.message}
            <div className="mt-3">
              <Button size="sm" onClick={() => menusQuery.refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {!menusQuery.isLoading && !menusQuery.error && menus.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--teal)]">
              <UtensilsCrossed size={20} />
            </div>
            <p className="mt-4 font-semibold text-[var(--ink)]">No menus yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Create your first menu, add categories and dishes, then publish it for guests.
            </p>
            <Button
              className="mt-5"
              onClick={() => {
                setFormError(null);
                setEditor({ id: null, name: '', description: '' });
              }}
            >
              <Plus size={16} />
              Create menu
            </Button>
          </div>
        ) : null}

        {menus.length > 0 ? (
          <ul className="space-y-3">
            {menus.map((menu) => (
              <li
                key={menu.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)]/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="text-lg text-[var(--ink)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {menu.name}
                    </h3>
                    <StatusBadge status={menu.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                  </div>
                  {menu.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{menu.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {menu.categoryCount} categories · {menu.dishCount} dishes · Updated{' '}
                    {formatUpdated(menu.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {slug && menu.isPublished ? (
                    <a
                      href={staffMenuPreviewPath(slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                    >
                      Preview
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFormError(null);
                      setEditor({
                        id: menu.id,
                        name: menu.name,
                        description: menu.description || '',
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={menu.isPublished ? 'secondary' : 'accent'}
                    onClick={() =>
                      setConfirm({
                        type: menu.isPublished ? 'unpublish' : 'publish',
                        menu,
                      })
                    }
                  >
                    {menu.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Link
                    to={`/admin/categories?menuId=${menu.id}`}
                    className="inline-flex items-center rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Categories
                  </Link>
                  {!menu.isPublished ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirm({ type: 'delete', menu })}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Modal
        open={Boolean(editor)}
        title={editor?.id ? 'Edit menu' : 'Create menu'}
        subtitle="Only published menus appear on the guest digital menu."
        onClose={() => !saveMutation.isPending && setEditor(null)}
      >
        {editor ? (
          <MenuForm
            initial={editor}
            error={formError}
            loading={saveMutation.isPending}
            onCancel={() => setEditor(null)}
            onSubmit={(payload) =>
              saveMutation.mutate({ id: editor.id, payload })
            }
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === 'delete'
            ? 'Delete menu?'
            : confirm?.type === 'unpublish'
              ? 'Unpublish menu?'
              : 'Publish this menu?'
        }
        message={
          confirm?.type === 'delete'
            ? `Delete “${confirm.menu.name}”? Categories and dishes in this menu will be removed.`
            : confirm?.type === 'unpublish'
              ? `Guests will no longer see “${confirm.menu.name}” until you publish again.`
              : `Publishing “${confirm?.menu?.name}” will unpublish any other live menu for this restaurant.`
        }
        confirmLabel={
          confirm?.type === 'delete'
            ? 'Delete'
            : confirm?.type === 'unpublish'
              ? 'Unpublish'
              : 'Publish'
        }
        danger={confirm?.type === 'delete'}
        loading={publishMutation.isPending || deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'delete') {
            deleteMutation.mutate(confirm.menu.id);
            return;
          }
          publishMutation.mutate({
            id: confirm.menu.id,
            publish: confirm.type === 'publish',
          });
        }}
      />
    </div>
  );
}

function MenuForm({ initial, error, loading, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [localError, setLocalError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError('Menu name is required');
      return;
    }
    if (trimmed.length > 120) {
      setLocalError('Menu name must be at most 120 characters');
      return;
    }
    setLocalError(null);
    onSubmit({ name: trimmed, description: description.trim() || null });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {(localError || error) && <Alert tone="error">{localError || error}</Alert>}
      <FormSection title="Details">
        <Field label="Name" htmlFor="menu-name" required error={!name.trim() && localError ? localError : null}>
          <Input
            id="menu-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Dinner menu"
            maxLength={120}
            disabled={loading}
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="menu-description" hint="Optional note for your team">
          <Textarea
            id="menu-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Evening service, seasonal specials…"
            rows={3}
            disabled={loading}
          />
        </Field>
      </FormSection>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : initial.id ? 'Save changes' : 'Create menu'}
        </Button>
      </div>
    </form>
  );
}
