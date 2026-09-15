import { useQuery } from '@tanstack/react-query';
import { Table2 } from 'lucide-react';
import { api } from '../../../shared/api/client.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { Alert } from '../../../shared/ui/Alert.jsx';

export function TablePicker({ restaurant, restaurantSlug, onSelect }) {
  const tablesQuery = useQuery({
    queryKey: ['public', 'tables', restaurantSlug],
    queryFn: async () => (await api.listRestaurantTables(restaurantSlug)).tables,
    enabled: Boolean(restaurantSlug),
  });

  return (
    <div className="min-h-screen min-w-0 bg-[var(--surface)] px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full min-w-0 max-w-lg">
        <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--ink)] p-5 text-white shadow-[0_30px_60px_-40px_rgba(15,31,28,0.7)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Welcome
          </p>
          <h1
            className="mt-2 break-words text-3xl tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {restaurant?.name || 'Restaurant'}
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Choose your table to open the menu. Scanning a table QR skips this step next time.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgba(15,31,28,0.35)]">
          <div className="mb-4 flex items-center gap-2 text-[var(--teal)]">
            <Table2 size={18} />
            <p className="text-sm font-semibold text-[var(--ink)]">Select your table</p>
          </div>

          {tablesQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading tables…</p>
          ) : null}

          {tablesQuery.error ? (
            <Alert tone="error">{tablesQuery.error.message}</Alert>
          ) : null}

          {!tablesQuery.isLoading && tablesQuery.data?.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No active tables are available yet. Please ask staff for help.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {(tablesQuery.data || []).map((table) => (
              <button
                key={table.id}
                type="button"
                onClick={() => onSelect(table)}
                className="min-h-16 rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] px-2 py-4 text-center transition hover:border-[var(--teal)] hover:bg-white"
              >
                <span
                  className="block text-xl text-[var(--ink)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {String(table.tableNumber).padStart(2, '0')}
                </span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Table
                </span>
              </button>
            ))}
          </div>

          {tablesQuery.isError ? (
            <div className="mt-4 flex justify-center">
              <Button size="sm" onClick={() => tablesQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
