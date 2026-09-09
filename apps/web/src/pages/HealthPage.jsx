import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { api } from '../shared/api/client.js';

export function HealthPage() {
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
  });

  return (
    <section className="max-w-xl">
      <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        API health
      </h2>
      <p className="mt-2 text-[var(--color-muted)]">
        Calls <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">GET /api/health</code> through
        the shared API client.
      </p>

      <div className="mt-6 rounded-lg border border-black/10 bg-white/60 p-5 backdrop-blur">
        {isLoading || isFetching ? (
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <LoaderCircle className="animate-spin" size={18} />
            Checking…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-red-700">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">API unreachable</p>
              <p className="mt-1 text-sm">{error.message}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Healthy</p>
              <pre className="mt-3 overflow-x-auto rounded bg-black/5 p-3 text-xs text-[var(--color-ink)]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
        >
          Refresh
        </button>
      </div>
    </section>
  );
}
