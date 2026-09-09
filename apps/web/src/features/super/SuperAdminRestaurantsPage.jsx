import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Building2,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { ConfirmDialog, Modal } from '../../shared/ui/Modal.jsx';
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx';
import { RestaurantForm } from './components/RestaurantForm.jsx';
import { formatDate } from './lib/format.js';

const PAGE_SIZE = 10;

export function SuperAdminRestaurantsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [menuStatus, setMenuStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRestaurant, setEditRestaurant] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      menuStatus: menuStatus || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, menuStatus, page],
  );

  const restaurantsQuery = useQuery({
    queryKey: ['superadmin', 'restaurants', params],
    queryFn: () => api.listSuperRestaurants(params),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createSuperRestaurant(payload),
    onSuccess: async () => {
      setCreateOpen(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['superadmin'] });
    },
    onError: (error) => setFormError(error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateSuperRestaurant(id, payload),
    onSuccess: async () => {
      setEditRestaurant(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['superadmin'] });
    },
    onError: (error) => setFormError(error),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => api.updateSuperRestaurantStatus(id, nextStatus),
    onSuccess: async () => {
      setConfirm(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['superadmin'] });
    },
    onError: (error) => setActionError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteSuperRestaurant(id),
    onSuccess: async () => {
      setConfirm(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['superadmin'] });
    },
    onError: (error) => setActionError(error.message),
  });

  const restaurants = restaurantsQuery.data?.restaurants ?? [];
  const pagination = restaurantsQuery.data?.pagination;

  function resetFilters() {
    setSearch('');
    setStatus('');
    setMenuStatus('');
    setPage(1);
  }

  return (
    <div className="space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Restaurants
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Network directory
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Create restaurants, assign admins, and control activation across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus size={16} />
          Add restaurant
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white/85 p-4 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search restaurant, slug, or admin…"
              className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/15"
            />
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--teal)]"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            value={menuStatus}
            onChange={(e) => {
              setMenuStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--teal)]"
          >
            <option value="">All menus</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="NONE">No menu</option>
          </select>
          {(search || status || menuStatus) && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Clear
            </button>
          )}
        </div>

        {actionError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          {restaurantsQuery.isLoading ? (
            <TableSkeleton />
          ) : restaurantsQuery.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-[var(--danger)]">
              {restaurantsQuery.error.message}
            </div>
          ) : restaurants.length === 0 ? (
            <EmptyRestaurants
              filtered={Boolean(search || status || menuStatus)}
              onAdd={() => setCreateOpen(true)}
              onClear={resetFilters}
            />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-3 py-3 font-semibold">Restaurant</th>
                  <th className="px-3 py-3 font-semibold">Admin</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Menu</th>
                  <th className="px-3 py-3 font-semibold">Orders</th>
                  <th className="px-3 py-3 font-semibold">Created</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((restaurant) => (
                  <tr
                    key={restaurant.id}
                    className="border-b border-[var(--line)]/70 transition hover:bg-[var(--surface-elevated)]/80 last:border-0"
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)]">
                          {restaurant.logoUrl ? (
                            <img
                              src={restaurant.logoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 size={16} className="text-[var(--muted)]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--ink)]">{restaurant.name}</p>
                          <p className="text-xs text-[var(--muted)]">/{restaurant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {restaurant.admin ? (
                        <div>
                          <p className="font-medium text-[var(--ink)]">{restaurant.admin.name}</p>
                          <p className="text-xs text-[var(--muted)]">{restaurant.admin.email}</p>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={restaurant.status} />
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={restaurant.menuStatus} />
                    </td>
                    <td className="px-3 py-3.5 text-[var(--ink)]">
                      {restaurant.counts?.orders ?? 0}
                    </td>
                    <td className="px-3 py-3.5 text-[var(--muted)]">
                      {formatDate(restaurant.createdAt)}
                    </td>
                    <td className="relative px-3 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((id) => (id === restaurant.id ? null : restaurant.id))
                        }
                        className="inline-flex rounded-lg border border-[var(--line)] bg-white p-2 text-[var(--muted)] hover:text-[var(--ink)]"
                        aria-label="Actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === restaurant.id ? (
                        <ActionMenu
                          restaurant={restaurant}
                          onClose={() => setOpenMenuId(null)}
                          onView={() => {
                            navigate(`/superadmin/restaurants/${restaurant.id}`);
                            setOpenMenuId(null);
                          }}
                          onEdit={() => {
                            setFormError(null);
                            setEditRestaurant(restaurant);
                            setOpenMenuId(null);
                          }}
                          onActivate={() => {
                            setConfirm({
                              type: 'status',
                              restaurant,
                              nextStatus: 'ACTIVE',
                              title: 'Activate restaurant',
                              message: `Make “${restaurant.name}” active and available on the customer menu?`,
                              confirmLabel: 'Activate',
                            });
                            setOpenMenuId(null);
                          }}
                          onDeactivate={() => {
                            setConfirm({
                              type: 'status',
                              restaurant,
                              nextStatus: 'INACTIVE',
                              title: 'Deactivate restaurant',
                              message: `Deactivate “${restaurant.name}”? The public menu will become unavailable.`,
                              confirmLabel: 'Deactivate',
                            });
                            setOpenMenuId(null);
                          }}
                          onDelete={() => {
                            setConfirm({
                              type: 'delete',
                              restaurant,
                              title: 'Delete restaurant',
                              message: `Permanently delete “${restaurant.name}” and all related menus, sessions, and analytics? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              danger: true,
                            });
                            setOpenMenuId(null);
                          }}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <p className="text-sm text-[var(--muted)]">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} restaurants
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={createOpen}
        title="Add restaurant"
        subtitle="Creates the restaurant, an initial draft menu, and a restaurant admin account."
        onClose={() => !createMutation.isPending && setCreateOpen(false)}
        wide
      >
        <RestaurantForm
          mode="create"
          submitting={createMutation.isPending}
          error={formError}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </Modal>

      <Modal
        open={Boolean(editRestaurant)}
        title="Edit restaurant"
        subtitle={editRestaurant?.name}
        onClose={() => !updateMutation.isPending && setEditRestaurant(null)}
        wide
      >
        <RestaurantForm
          mode="edit"
          initialValues={editRestaurant}
          submitting={updateMutation.isPending}
          error={formError}
          onCancel={() => setEditRestaurant(null)}
          onSubmit={(values) =>
            updateMutation.mutate({
              id: editRestaurant.id,
              payload: {
                name: values.name,
                slug: values.slug,
                description: values.description,
                email: values.email,
                phone: values.phone,
                address: values.address,
                logoUrl: values.logoUrl,
                status: values.status,
              },
            })
          }
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        loading={statusMutation.isPending || deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'delete') {
            deleteMutation.mutate(confirm.restaurant.id);
          } else {
            statusMutation.mutate({
              id: confirm.restaurant.id,
              nextStatus: confirm.nextStatus,
            });
          }
        }}
      />
    </div>
  );
}

function ActionMenu({
  restaurant,
  onClose,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={onClose} />
      <div className="absolute right-3 top-12 z-20 w-44 overflow-hidden rounded-xl border border-[var(--line)] bg-white py-1 text-left shadow-lg">
        <MenuItem onClick={onView}>View</MenuItem>
        <MenuItem onClick={onEdit}>Edit</MenuItem>
        {restaurant.status !== 'ACTIVE' ? (
          <MenuItem onClick={onActivate}>Activate</MenuItem>
        ) : null}
        {restaurant.status !== 'INACTIVE' ? (
          <MenuItem onClick={onDeactivate}>Deactivate</MenuItem>
        ) : null}
        <MenuItem onClick={onDelete} danger>
          Delete
        </MenuItem>
      </div>
    </>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--surface)] ${
        danger ? 'text-[var(--danger)]' : 'text-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyRestaurants({ filtered, onAdd, onClear }) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--teal)]">
        <Building2 size={20} />
      </div>
      <p className="mt-4 text-base font-semibold text-[var(--ink)]">
        {filtered ? 'No restaurants match these filters' : 'No restaurants yet'}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
        {filtered
          ? 'Try adjusting search or status filters.'
          : 'Onboard the first restaurant to start building your digital menu network.'}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtered ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold"
          >
            Clear filters
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
          >
            Add restaurant
          </button>
        )}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-black/5" />
      ))}
    </div>
  );
}
