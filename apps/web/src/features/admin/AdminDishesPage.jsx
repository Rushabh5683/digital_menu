import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, ImagePlus, Plus, Search, Utensils } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input, Select, Textarea } from '../../shared/ui/FormControls.jsx';
import { FormSection } from '../../shared/ui/FormSection.jsx';
import { ConfirmDialog, Modal } from '../../shared/ui/Modal.jsx';
import { DIETARY_TAG_GROUPS, DIETARY_TAG_PRESETS, SERVES_TAG_PRESETS, SIGNATURE_DISH_TAG, isServesTag } from '../../shared/constants/dietaryTags.js';
import { resolveMediaUrl } from '../../shared/lib/mediaUrl.js';

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminDishesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dishSearch, setDishSearch] = useState('');

  const menusQuery = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: async () => (await api.listAdminMenus()).menus,
  });

  const menus = menusQuery.data || [];
  const menuIdParam = searchParams.get('menuId');
  const categoryIdParam = searchParams.get('categoryId') || '';

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
  const selectedCategoryId = useMemo(() => {
    if (categoryIdParam && categories.some((category) => category.id === categoryIdParam)) {
      return categoryIdParam;
    }
    return categories[0]?.id || '';
  }, [categoryIdParam, categories]);

  const dishesQuery = useQuery({
    queryKey: ['admin', 'dishes', selectedCategoryId],
    queryFn: async () =>
      (await api.listAdminDishes({ categoryId: selectedCategoryId })).dishes,
    enabled: Boolean(selectedCategoryId),
  });

  const allMenuDishesQuery = useQuery({
    queryKey: ['admin', 'dishes', 'menu', selectedMenuId],
    queryFn: async () =>
      (await api.listAdminDishes({ menuId: selectedMenuId })).dishes,
    enabled: Boolean(selectedMenuId),
  });

  const searchQuery = dishSearch.trim().toLowerCase();
  const isGlobalSearch = searchQuery.length > 0;

  const dishes = useMemo(() => {
    if (isGlobalSearch) {
      return (allMenuDishesQuery.data || [])
        .filter((dish) => String(dish.name || '').toLowerCase().includes(searchQuery))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    return dishesQuery.data || [];
  }, [isGlobalSearch, searchQuery, allMenuDishesQuery.data, dishesQuery.data]);

  const dishesLoading = isGlobalSearch
    ? allMenuDishesQuery.isLoading
    : dishesQuery.isLoading;
  const dishesError = isGlobalSearch ? allMenuDishesQuery.error : dishesQuery.error;

  useEffect(() => {
    if (!selectedMenuId) return;
    const next = { menuId: selectedMenuId };
    if (selectedCategoryId) next.categoryId = selectedCategoryId;
    const current =
      searchParams.get('menuId') === next.menuId &&
      (searchParams.get('categoryId') || '') === (next.categoryId || '');
    if (!current) setSearchParams(next, { replace: true });
  }, [selectedMenuId, selectedCategoryId, searchParams, setSearchParams]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, categoryId, payload }) => {
      if (id) return api.updateAdminDish(id, payload);
      return api.createAdminDish(categoryId, payload);
    },
    onSuccess: async () => {
      setEditor(null);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'dishes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] }),
      ]);
    },
    onError: (error) => setFormError(error.message),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }) => api.updateAdminDish(id, { isAvailable }),
    onMutate: async ({ id, isAvailable }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['admin', 'dishes', selectedCategoryId] }),
        queryClient.cancelQueries({ queryKey: ['admin', 'dishes', 'menu', selectedMenuId] }),
      ]);
      const previousCategory = queryClient.getQueryData(['admin', 'dishes', selectedCategoryId]);
      const previousMenu = queryClient.getQueryData(['admin', 'dishes', 'menu', selectedMenuId]);
      const patch = (list = []) =>
        list.map((dish) => (dish.id === id ? { ...dish, isAvailable } : dish));
      queryClient.setQueryData(['admin', 'dishes', selectedCategoryId], patch);
      queryClient.setQueryData(['admin', 'dishes', 'menu', selectedMenuId], patch);
      return { previousCategory, previousMenu };
    },
    onError: (error, _vars, context) => {
      if (context?.previousCategory) {
        queryClient.setQueryData(['admin', 'dishes', selectedCategoryId], context.previousCategory);
      }
      if (context?.previousMenu) {
        queryClient.setQueryData(['admin', 'dishes', 'menu', selectedMenuId], context.previousMenu);
      }
      setActionError(error.message);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'dishes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] }),
      ]);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ categoryId, orderedIds }) =>
      api.reorderAdminDishes(categoryId, orderedIds),
    onMutate: async ({ orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'dishes', selectedCategoryId] });
      const previous = queryClient.getQueryData(['admin', 'dishes', selectedCategoryId]);
      const byId = new Map((previous || []).map((dish) => [dish.id, dish]));
      queryClient.setQueryData(
        ['admin', 'dishes', selectedCategoryId],
        orderedIds
          .map((id, index) => {
            const dish = byId.get(id);
            return dish ? { ...dish, displayOrder: index + 1 } : null;
          })
          .filter(Boolean),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'dishes', selectedCategoryId], context.previous);
      }
      setActionError(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dishes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAdminDish(id),
    onSuccess: async () => {
      setConfirm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'dishes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] }),
      ]);
    },
    onError: (error) => setActionError(error.message),
  });

  function onDrop(targetId) {
    if (isGlobalSearch || !dragId || dragId === targetId || !selectedCategoryId) return;
    const categoryDishes = dishesQuery.data || [];
    const ids = categoryDishes.map((dish) => dish.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setDragId(null);
    reorderMutation.mutate({ categoryId: selectedCategoryId, orderedIds: next });
  }

  function openCreate() {
    if (!selectedCategoryId) return;
    setFormError(null);
    setEditor({
      id: null,
      categoryId: selectedCategoryId,
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      ingredients: '',
      dietaryTags: [],
      isAvailable: true,
    });
  }

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">Dishes</p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Dish library
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Manage plates, pricing, availability, dietary tags, and imagery for your published menu.
          </p>
        </div>
        <Button disabled={!selectedCategoryId} onClick={openCreate}>
          <Plus size={16} />
          Add dish
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <Field label="Search dishes" htmlFor="dish-search">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <Input
              id="dish-search"
              value={dishSearch}
              onChange={(event) => setDishSearch(event.target.value)}
              placeholder="Search by name across all categories…"
              className="!pl-9"
              disabled={!selectedMenuId}
            />
          </div>
        </Field>
        <Field label="Menu" htmlFor="dish-menu">
          <Select
            id="dish-menu"
            value={selectedMenuId}
            onChange={(event) => {
              setDishSearch('');
              setSearchParams({ menuId: event.target.value }, { replace: true });
            }}
            disabled={menus.length === 0}
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
        <Field label="Category" htmlFor="dish-category">
          <Select
            id="dish-category"
            value={selectedCategoryId}
            onChange={(event) =>
              setSearchParams(
                { menuId: selectedMenuId, categoryId: event.target.value },
                { replace: true },
              )
            }
            disabled={categories.length === 0}
          >
            {categories.length === 0 ? <option value="">No categories</option> : null}
            {categories.map((category) => {
              const count = Array.isArray(category.dishes) ? category.dishes.length : 0;
              return (
                <option key={category.id} value={category.id}>
                  {category.name} ({count})
                  {!category.isEnabled ? ' — disabled' : ''}
                </option>
              );
            })}
          </Select>
        </Field>
        <Link
          to={`/admin/categories?menuId=${selectedMenuId || ''}`}
          className="text-sm font-semibold text-[var(--teal)] hover:underline lg:mb-3"
        >
          Manage categories
        </Link>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-6">
        {menusQuery.isLoading || menuQuery.isLoading || dishesLoading ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">Loading dishes…</p>
        ) : null}

        {dishesError ? <Alert tone="error">{dishesError.message}</Alert> : null}

        {!menusQuery.isLoading && menus.length === 0 ? (
          <EmptyDishes
            title="Create a menu first"
            text="Dishes live inside categories on a menu."
            to="/admin/menu"
            label="Go to menus"
          />
        ) : null}

        {menus.length > 0 && categories.length === 0 && !menuQuery.isLoading ? (
          <EmptyDishes
            title="Add a category first"
            text="Create a category, then add dishes to it."
            to={`/admin/categories?menuId=${selectedMenuId}`}
            label="Go to categories"
          />
        ) : null}

        {selectedCategoryId &&
        !dishesLoading &&
        !dishesError &&
        dishes.length === 0 &&
        !isGlobalSearch ? (
          <EmptyDishes title="No dishes yet" text="Add your first plate to this category." action={openCreate} label="Add dish" />
        ) : null}

        {isGlobalSearch && !dishesLoading && !dishesError && dishes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-14 text-center">
            <p className="font-semibold text-[var(--ink)]">No dishes match “{dishSearch.trim()}”</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Try another name, or clear the search to browse by category.
            </p>
          </div>
        ) : null}

        {isGlobalSearch && dishes.length > 0 ? (
          <p className="mb-3 text-xs text-[var(--muted)]">
            Showing {dishes.length} match{dishes.length === 1 ? '' : 'es'} across all categories
          </p>
        ) : null}

        {dishes.length > 0 ? (
          <ul className="space-y-3">
            {dishes.map((dish) => (
              <li
                key={dish.id}
                draggable={!isGlobalSearch}
                onDragStart={() => {
                  if (!isGlobalSearch) setDragId(dish.id);
                }}
                onDragOver={(event) => {
                  if (!isGlobalSearch) event.preventDefault();
                }}
                onDrop={() => onDrop(dish.id)}
                onDragEnd={() => setDragId(null)}
                className={[
                  'flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)]/60 p-4 sm:flex-row sm:items-center',
                  dragId === dish.id ? 'opacity-60 ring-2 ring-[var(--teal)]/30' : '',
                  !dish.isAvailable ? 'opacity-75' : '',
                ].join(' ')}
              >
                {!isGlobalSearch ? (
                  <button
                    type="button"
                    className="hidden cursor-grab touch-none rounded-lg p-1 text-[var(--muted)] hover:bg-black/[0.04] sm:block"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical size={18} />
                  </button>
                ) : null}
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-black/[0.03]">
                  {dish.imageUrl ? (
                    <img
                      src={resolveMediaUrl(dish.imageUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--muted)]">
                      <ImagePlus size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[var(--ink)]">{dish.name}</h3>
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {formatMoney(dish.price)}
                    </span>
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]',
                        dish.isAvailable
                          ? 'bg-[var(--teal)]/10 text-[var(--teal)]'
                          : 'bg-black/5 text-[var(--muted)]',
                      ].join(' ')}
                    >
                      {dish.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                    {isGlobalSearch && dish.categoryName ? (
                      <span className="rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {dish.categoryName}
                      </span>
                    ) : null}
                  </div>
                  {dish.description && dish.description !== '—' ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{dish.description}</p>
                  ) : null}
                  {(dish.dietaryTags || []).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dish.dietaryTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      availabilityMutation.mutate({
                        id: dish.id,
                        isAvailable: !dish.isAvailable,
                      })
                    }
                  >
                    {dish.isAvailable ? 'Mark unavailable' : 'Mark available'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFormError(null);
                      setEditor({
                        id: dish.id,
                        categoryId: dish.categoryId || selectedCategoryId,
                        name: dish.name,
                        description: dish.description === '—' ? '' : dish.description || '',
                        price: String(dish.price ?? ''),
                        imageUrl: dish.imageUrl || '',
                        ingredients: (dish.ingredients || []).join(', '),
                        dietaryTags: dish.dietaryTags || [],
                        isAvailable: dish.isAvailable !== false,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(dish)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Modal
        open={Boolean(editor)}
        title={editor?.id ? 'Edit dish' : 'New dish'}
        subtitle="Guests only see available dishes in enabled categories on a published menu."
        wide
        onClose={() => !saveMutation.isPending && setEditor(null)}
      >
        {editor ? (
          <DishForm
            initial={editor}
            categories={categories}
            error={formError}
            loading={saveMutation.isPending}
            onCancel={() => setEditor(null)}
            onSubmit={(payload) =>
              saveMutation.mutate({
                id: editor.id,
                categoryId: payload.categoryId || editor.categoryId,
                payload,
              })
            }
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete dish?"
        message={`Delete “${confirm?.name}”? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMutation.mutate(confirm.id)}
      />
    </div>
  );
}

function DishForm({ initial, categories, error, loading, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [price, setPrice] = useState(initial.price || '');
  const [imageUrl, setImageUrl] = useState(initial.imageUrl || '');
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(() =>
    initial.imageUrl ? resolveMediaUrl(initial.imageUrl) : '',
  );
  const [ingredients, setIngredients] = useState(initial.ingredients || '');
  const [dietaryTags, setDietaryTags] = useState(initial.dietaryTags || []);
  const [customByGroup, setCustomByGroup] = useState(() => {
    const extras = (initial.dietaryTags || []).filter((tag) => !DIETARY_TAG_PRESETS.includes(tag));
    return extras.length ? { Other: extras } : {};
  });
  const [addingGroup, setAddingGroup] = useState(null);
  const [customDraft, setCustomDraft] = useState('');
  const [isAvailable, setIsAvailable] = useState(initial.isAvailable !== false);
  const [categoryId, setCategoryId] = useState(initial.categoryId || '');
  const [localError, setLocalError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearPendingPreview() {
    setPreviewUrl((current) => {
      if (current && current.startsWith('blob:')) URL.revokeObjectURL(current);
      return '';
    });
    setPendingFile(null);
  }

  function onImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Image must be 5 MB or smaller');
      return;
    }
    setLocalError(null);
    setPendingFile(file);
    setPreviewUrl((current) => {
      if (current && current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function removeImage() {
    clearPendingPreview();
    setImageUrl('');
  }

  function toggleTag(tag) {
    setDietaryTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      // Portion size is single-select — picking Serves 3 clears Serves 2, etc.
      if (isServesTag(tag) || SERVES_TAG_PRESETS.includes(tag)) {
        return [...current.filter((item) => !isServesTag(item)), tag];
      }
      return [...current, tag];
    });
  }

  function removeCustomTag(groupLabel, tag) {
    setDietaryTags((current) => current.filter((item) => item !== tag));
    setCustomByGroup((current) => {
      const nextTags = (current[groupLabel] || []).filter((item) => item !== tag);
      const next = { ...current };
      if (nextTags.length === 0) delete next[groupLabel];
      else next[groupLabel] = nextTags;
      return next;
    });
  }

  function commitCustomTag(groupLabel) {
    const tag = customDraft.trim().replace(/\s+/g, ' ');
    if (!tag) {
      setLocalError('Enter a custom tag name');
      return;
    }
    if (tag.length > 40) {
      setLocalError('Custom tag must be 40 characters or fewer');
      return;
    }

    const presetMatch = DIETARY_TAG_PRESETS.find(
      (preset) => preset.toLowerCase() === tag.toLowerCase(),
    );
    if (presetMatch) {
      setDietaryTags((current) => {
        if (current.includes(presetMatch)) return current;
        if (isServesTag(presetMatch) || groupLabel === 'Serves') {
          return [...current.filter((item) => !isServesTag(item)), presetMatch];
        }
        return [...current, presetMatch];
      });
      setCustomDraft('');
      setAddingGroup(null);
      setLocalError(null);
      return;
    }

    const existingCustom = Object.values(customByGroup)
      .flat()
      .find((item) => item.toLowerCase() === tag.toLowerCase());
    if (existingCustom) {
      setDietaryTags((current) => {
        if (current.includes(existingCustom)) return current;
        if (isServesTag(existingCustom) || groupLabel === 'Serves') {
          return [...current.filter((item) => !isServesTag(item)), existingCustom];
        }
        return [...current, existingCustom];
      });
      setCustomDraft('');
      setAddingGroup(null);
      setLocalError(null);
      return;
    }

    setDietaryTags((current) => {
      if (groupLabel === 'Serves' || isServesTag(tag)) {
        return [...current.filter((item) => !isServesTag(item)), tag];
      }
      return [...current, tag];
    });
    setCustomByGroup((current) => ({
      ...current,
      [groupLabel]: [...(current[groupLabel] || []), tag],
    }));
    setCustomDraft('');
    setAddingGroup(null);
    setLocalError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError(null);
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setLocalError('Enter a valid price ≥ 0');
      return;
    }

    let nextImageUrl = imageUrl || null;
    if (pendingFile) {
      setUploading(true);
      try {
        const result = await api.uploadAdminDishImage(pendingFile);
        // Prefer absolute URL so split-host frontends can load the image.
        nextImageUrl =
          resolveMediaUrl(result.imageUrl || '') || result.imageUrl || null;
        setImageUrl(nextImageUrl || '');
      } catch (err) {
        setLocalError(err.message || 'Image upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (nextImageUrl) {
      nextImageUrl = resolveMediaUrl(nextImageUrl) || nextImageUrl;
    }

    onSubmit({
      categoryId,
      name: trimmedName,
      description: trimmedDescription,
      price: priceNumber,
      imageUrl: nextImageUrl,
      ingredients: parseList(ingredients),
      dietaryTags,
      isAvailable,
    });
  }

  const busy = loading || uploading;
  const showPreview = Boolean(previewUrl);

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {(localError || error) && <Alert tone="error">{localError || error}</Alert>}

      <FormSection title="Basics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="dish-name" required className="sm:col-span-2">
            <Input
              id="dish-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Butter chicken"
              maxLength={120}
              disabled={busy}
              autoFocus
              required
            />
          </Field>
          <Field label="Category" htmlFor="dish-form-category" required>
            <Select
              id="dish-form-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={busy}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price (INR)" htmlFor="dish-price" required>
            <Input
              id="dish-price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={busy}
              required
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="dish-description" required>
          <Textarea
            id="dish-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={busy}
            placeholder="Short guest-facing description"
            required
          />
        </Field>
        <Field
          label="Ingredients"
          htmlFor="dish-ingredients"
          hint="Comma-separated list"
        >
          <Input
            id="dish-ingredients"
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder="Chicken, butter, tomato, cream"
            disabled={busy}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--line)]"
            checked={isAvailable}
            onChange={(event) => setIsAvailable(event.target.checked)}
            disabled={busy}
          />
          Available to order / show on menu
        </label>
      </FormSection>

      <FormSection
        title="Signature Dishes"
        description="Mark dishes to feature them in the Signature Dishes section on the guest menu."
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--line)]"
            checked={dietaryTags.includes(SIGNATURE_DISH_TAG)}
            onChange={() => toggleTag(SIGNATURE_DISH_TAG)}
            disabled={loading}
          />
          <span>
            <span className="block font-semibold">Mark as Signature</span>
            <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
              Shows under “Signature Dishes” on the guest menu
            </span>
          </span>
        </label>
      </FormSection>

      <FormSection
        title="Dietary tags"
        description="Tap presets that apply. Serves is single-select (pick one portion size). You can also add a custom tag in any section."
      >
        <div className="space-y-4">
          {[
            ...DIETARY_TAG_GROUPS,
            ...((customByGroup.Other || []).length > 0
              ? [{ label: 'Other', tags: [] }]
              : []),
          ].map((group) => {
            const groupCustoms = customByGroup[group.label] || [];
            const isAdding = addingGroup === group.label;
            return (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {group.label}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {group.tags.map((tag) => {
                    const active = dietaryTags.includes(tag);
                    const label = tag === SIGNATURE_DISH_TAG ? 'Signature Dish' : tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        disabled={loading}
                        onClick={() => toggleTag(tag)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          active
                            ? 'border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)]'
                            : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--teal)]/40',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {groupCustoms.map((tag) => (
                    <button
                      key={`custom-${group.label}-${tag}`}
                      type="button"
                      disabled={loading}
                      onClick={() => removeCustomTag(group.label, tag)}
                      className="rounded-full border border-[var(--teal)] bg-[var(--teal)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--teal)]"
                      title="Remove custom tag"
                    >
                      {tag} ×
                    </button>
                  ))}
                  {!isAdding ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setAddingGroup(group.label);
                        setCustomDraft('');
                        setLocalError(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--teal)]/50 hover:text-[var(--teal)]"
                    >
                      <Plus size={12} />
                      Custom tag
                    </button>
                  ) : null}
                </div>
                {isAdding ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      value={customDraft}
                      onChange={(event) => setCustomDraft(event.target.value)}
                      placeholder={`Custom ${group.label.toLowerCase()} tag`}
                      maxLength={40}
                      disabled={loading}
                      autoFocus
                      className="max-w-xs !rounded-xl !px-3 !py-2"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitCustomTag(group.label);
                        }
                        if (event.key === 'Escape') {
                          setAddingGroup(null);
                          setCustomDraft('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading || !customDraft.trim()}
                      onClick={() => commitCustomTag(group.label)}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => {
                        setAddingGroup(null);
                        setCustomDraft('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Image">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-28 w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-black/[0.03]">
            {showPreview ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-[var(--muted)]">
                <ImagePlus size={20} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                  No image
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={onImageChange}
              className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
            <p className="text-xs text-[var(--muted)]">
              JPG, PNG, WEBP, or GIF · large phone photos are compressed before upload
              {pendingFile
                ? ' · Selected — uploads when you click Save changes'
                : ''}
            </p>
            {showPreview || imageUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={removeImage}
              >
                Remove image
              </Button>
            ) : null}
            {uploading ? <p className="text-xs text-[var(--teal)]">Uploading…</p> : null}
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {uploading
            ? 'Uploading…'
            : loading
              ? 'Saving…'
              : initial.id
                ? 'Save changes'
                : 'Create dish'}
        </Button>
      </div>
    </form>
  );
}

function EmptyDishes({ title, text, to, action, label }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--teal)]">
        <Utensils size={20} />
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
