import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Layers3, Plus, Trash2 } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input, Select, Textarea } from '../../shared/ui/FormControls.jsx';
import { FormSection } from '../../shared/ui/FormSection.jsx';
import { ConfirmDialog, Modal } from '../../shared/ui/Modal.jsx';

let rowKey = 0;
function newCategoryRow() {
  rowKey += 1;
  return { key: `row-${rowKey}`, name: '', description: '', isEnabled: true };
}

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editor, setEditor] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [dragId, setDragId] = useState(null);

  const menusQuery = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: async () => (await api.listAdminMenus()).menus,
  });

  const menus = menusQuery.data || [];
  const menuIdParam = searchParams.get('menuId');
  const selectedMenuId = useMemo(() => {
    if (menuIdParam && menus.some((menu) => menu.id === menuIdParam)) return menuIdParam;
    const published = menus.find((menu) => menu.isPublished);
    return published?.id || menus[0]?.id || '';
  }, [menuIdParam, menus]);

  const menuQuery = useQuery({
    queryKey: ['admin', 'menus', selectedMenuId],
    queryFn: async () => (await api.getAdminMenu(selectedMenuId)).menu,
    enabled: Boolean(selectedMenuId),
  });

  const categories = menuQuery.data?.categories || [];

  useEffect(() => {
    if (selectedMenuId && menuIdParam !== selectedMenuId) {
      setSearchParams({ menuId: selectedMenuId }, { replace: true });
    }
  }, [selectedMenuId, menuIdParam, setSearchParams]);

  function openBulkCreate() {
    setFormError(null);
    setBulkOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.updateAdminCategory(id, payload),
    onSuccess: async () => {
      setEditor(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: ({ menuId, categories: rows }) =>
      api.bulkCreateAdminCategories(menuId, { categories: rows }),
    onSuccess: async () => {
      setBulkOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }) => api.updateAdminCategory(id, { isEnabled }),
    onMutate: async ({ id, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'menus', selectedMenuId] });
      const previous = queryClient.getQueryData(['admin', 'menus', selectedMenuId]);
      queryClient.setQueryData(['admin', 'menus', selectedMenuId], (menu) => {
        if (!menu) return menu;
        return {
          ...menu,
          categories: menu.categories.map((category) =>
            category.id === id ? { ...category, isEnabled } : category,
          ),
        };
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'menus', selectedMenuId], context.previous);
      }
      setActionError(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ menuId, orderedIds }) => api.reorderAdminCategories(menuId, orderedIds),
    onMutate: async ({ orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'menus', selectedMenuId] });
      const previous = queryClient.getQueryData(['admin', 'menus', selectedMenuId]);
      const byId = new Map((previous?.categories || []).map((category) => [category.id, category]));
      queryClient.setQueryData(['admin', 'menus', selectedMenuId], (menu) => {
        if (!menu) return menu;
        return {
          ...menu,
          categories: orderedIds
            .map((id, index) => {
              const category = byId.get(id);
              return category ? { ...category, displayOrder: index + 1 } : null;
            })
            .filter(Boolean),
        };
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'menus', selectedMenuId], context.previous);
      }
      setActionError(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAdminCategory(id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    },
    onError: (error) => setActionError(error.message),
  });

  function onDrop(targetId) {
    if (!dragId || dragId === targetId || !selectedMenuId) return;
    const ids = categories.map((category) => category.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setDragId(null);
    reorderMutation.mutate({ menuId: selectedMenuId, orderedIds: next });
  }

  return (
    <div className="space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Categories
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Menu sections
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Organize dishes into sections. Drag to reorder; disable a section to hide it from guests.
          </p>
        </div>
        <Button disabled={!selectedMenuId} onClick={openBulkCreate}>
          <Plus size={16} />
          Add categories
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Menu" htmlFor="category-menu" className="w-full min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
          <Select
            id="category-menu"
            value={selectedMenuId}
            onChange={(event) => setSearchParams({ menuId: event.target.value })}
            disabled={menusQuery.isLoading || menus.length === 0}
          >
            {menus.length === 0 ? <option value="">No menus</option> : null}
            {menus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                {menu.name}
                {menu.isPublished ? ' (live)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Link
          to="/admin/menu"
          className="mb-1 text-sm font-semibold text-[var(--teal)] hover:underline"
        >
          Manage menus
        </Link>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
        {menusQuery.isLoading || (selectedMenuId && menuQuery.isLoading) ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">Loading categories…</p>
        ) : null}

        {menuQuery.error ? (
          <Alert tone="error">{menuQuery.error.message}</Alert>
        ) : null}

        {!menusQuery.isLoading && menus.length === 0 ? (
          <EmptyCategories
            title="Create a menu first"
            text="Categories belong to a menu. Start by creating and selecting a menu."
            to="/admin/menu"
            label="Go to menus"
          />
        ) : null}

        {selectedMenuId && !menuQuery.isLoading && !menuQuery.error && categories.length === 0 ? (
          <EmptyCategories
            title="No categories yet"
            text="Add sections like Starters, Mains, or Desserts, then attach dishes."
            action={openBulkCreate}
            label="Add categories"
          />
        ) : null}

        {categories.length > 0 ? (
          <ul className="space-y-2">
            {categories.map((category) => (
              <li
                key={category.id}
                draggable
                onDragStart={() => setDragId(category.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(category.id)}
                onDragEnd={() => setDragId(null)}
                className={[
                  'flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)]/60 p-4 sm:flex-row sm:items-center sm:justify-between',
                  dragId === category.id ? 'opacity-60 ring-2 ring-[var(--teal)]/30' : '',
                  !category.isEnabled ? 'opacity-80' : '',
                ].join(' ')}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    className="mt-0.5 cursor-grab touch-none rounded-lg p-1 text-[var(--muted)] hover:bg-black/[0.04] active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                  >
                    <GripVertical size={18} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--ink)]">{category.name}</h3>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]',
                          category.isEnabled
                            ? 'bg-[var(--teal)]/10 text-[var(--teal)]'
                            : 'bg-black/5 text-[var(--muted)]',
                        ].join(' ')}
                      >
                        {category.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {category.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                        {category.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {(category.dishes || []).length} dishes
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9 sm:pl-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: category.id,
                        isEnabled: !category.isEnabled,
                      })
                    }
                  >
                    {category.isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFormError(null);
                      setEditor({
                        id: category.id,
                        menuId: selectedMenuId,
                        name: category.name,
                        description: category.description || '',
                        isEnabled: category.isEnabled !== false,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Link
                    to={`/admin/dishes?menuId=${selectedMenuId}&categoryId=${category.id}`}
                    className="inline-flex items-center rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Dishes
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(category)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Modal
        open={bulkOpen}
        title="Add categories"
        subtitle="Add one or more sections, then create them all at once."
        onClose={() => !bulkCreateMutation.isPending && setBulkOpen(false)}
      >
        {bulkOpen && selectedMenuId ? (
          <BulkCategoryForm
            error={formError}
            loading={bulkCreateMutation.isPending}
            onCancel={() => setBulkOpen(false)}
            onSubmit={(rows) =>
              bulkCreateMutation.mutate({
                menuId: selectedMenuId,
                categories: rows,
              })
            }
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editor)}
        title="Edit category"
        subtitle="Categories structure the guest menu."
        onClose={() => !saveMutation.isPending && setEditor(null)}
      >
        {editor ? (
          <CategoryForm
            initial={editor}
            error={formError}
            loading={saveMutation.isPending}
            onCancel={() => setEditor(null)}
            onSubmit={(payload) =>
              saveMutation.mutate({
                id: editor.id,
                payload,
              })
            }
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete category?"
        message={`Delete “${confirm?.name}”? All dishes in this category will be removed.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMutation.mutate(confirm.id)}
      />
    </div>
  );
}

function BulkCategoryForm({ error, loading, onSubmit, onCancel }) {
  const [rows, setRows] = useState(() => [newCategoryRow()]);
  const [localError, setLocalError] = useState(null);

  function updateRow(key, patch) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const prepared = rows
      .map((row) => ({
        name: row.name.trim(),
        description: row.description.trim() || null,
        isEnabled: row.isEnabled !== false,
      }))
      .filter((row) => row.name);

    if (prepared.length === 0) {
      setLocalError('Enter at least one category name');
      return;
    }

    const blankNamed = rows.some((row) => !row.name.trim() && row.description.trim());
    if (blankNamed) {
      setLocalError('Every row with a description needs a name');
      return;
    }

    setLocalError(null);
    onSubmit(prepared);
  }

  const namedCount = rows.filter((r) => r.name.trim()).length;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {(localError || error) && <Alert tone="error">{localError || error}</Alert>}

      <div className="max-h-[min(52vh,28rem)] space-y-3 overflow-y-auto pr-0.5">
        {rows.map((row, index) => (
          <section
            key={row.key}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--teal)]/15 text-xs font-bold text-[var(--teal)]">
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold text-[var(--ink)]">Category {index + 1}</h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading || rows.length <= 1}
                onClick={() => removeRow(row.key)}
                className="gap-1.5"
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>

            <div className="space-y-3">
              <Field label="Name" htmlFor={`bulk-cat-name-${row.key}`} required>
                <Input
                  id={`bulk-cat-name-${row.key}`}
                  value={row.name}
                  onChange={(event) => updateRow(row.key, { name: event.target.value })}
                  placeholder="Starters"
                  maxLength={120}
                  disabled={loading}
                  autoFocus={index === 0}
                />
              </Field>
              <Field label="Description" htmlFor={`bulk-cat-desc-${row.key}`}>
                <Textarea
                  id={`bulk-cat-desc-${row.key}`}
                  value={row.description}
                  onChange={(event) => updateRow(row.key, { description: event.target.value })}
                  placeholder="Optional"
                  rows={2}
                  maxLength={1000}
                  disabled={loading}
                  className="resize-none"
                />
              </Field>
              <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--line)]"
                  checked={row.isEnabled !== false}
                  onChange={(event) => updateRow(row.key, { isEnabled: event.target.checked })}
                  disabled={loading}
                />
                Enabled on guest menu
              </label>
            </div>
          </section>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={loading || rows.length >= 50}
        onClick={() => setRows((prev) => [...prev, newCategoryRow()])}
        className="gap-2"
      >
        <Plus size={16} />
        Add another category
      </Button>

      <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
        <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Creating…'
            : `Create ${namedCount || rows.length} ${
                (namedCount || rows.length) === 1 ? 'category' : 'categories'
              }`}
        </Button>
      </div>
    </form>
  );
}

function CategoryForm({ initial, error, loading, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [isEnabled, setIsEnabled] = useState(initial.isEnabled !== false);
  const [localError, setLocalError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError('Category name is required');
      return;
    }
    setLocalError(null);
    onSubmit({
      name: trimmed,
      description: description.trim() || null,
      isEnabled,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {(localError || error) && <Alert tone="error">{localError || error}</Alert>}
      <FormSection title="Category">
        <Field label="Name" htmlFor="cat-name" required>
          <Input
            id="cat-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Starters"
            maxLength={120}
            disabled={loading}
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="cat-description">
          <Textarea
            id="cat-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={loading}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--line)]"
            checked={isEnabled}
            onChange={(event) => setIsEnabled(event.target.checked)}
            disabled={loading}
          />
          Enabled on guest menu
        </label>
      </FormSection>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function EmptyCategories({ title, text, to, action, label }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--teal)]">
        <Layers3 size={20} />
      </div>
      <p className="mt-4 font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{text}</p>
      {to ? (
        <Link to={to} className="mt-5 inline-flex text-sm font-semibold text-[var(--teal)] hover:underline">
          {label}
        </Link>
      ) : (
        <Button className="mt-5" onClick={action}>
          <Plus size={16} />
          {label}
        </Button>
      )}
    </div>
  );
}
