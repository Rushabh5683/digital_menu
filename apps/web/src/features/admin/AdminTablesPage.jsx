import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Plus,
  QrCode,
  Table2,
  Users,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input } from '../../shared/ui/FormControls.jsx';
import { FormSection } from '../../shared/ui/FormSection.jsx';
import { ConfirmDialog, Modal } from '../../shared/ui/Modal.jsx';
import { withStaffMenuPreview } from '../menu/lib/staffPreview.js';

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename || 'table-qr.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function AdminTablesPage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [formError, setFormError] = useState(null);
  const [bulkError, setBulkError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [filter, setFilter] = useState('all');

  const tablesQuery = useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: async () => (await api.listAdminTables()).tables,
  });

  const tables = tablesQuery.data || [];
  const filtered = useMemo(() => {
    if (filter === 'active') return tables.filter((table) => table.isActive);
    if (filter === 'inactive') return tables.filter((table) => !table.isActive);
    return tables;
  }, [tables, filter]);

  const stats = useMemo(
    () => ({
      total: tables.length,
      active: tables.filter((table) => table.isActive).length,
      seats: tables.reduce((sum, table) => sum + (table.capacity || 0), 0),
    }),
    [tables],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id) return api.updateAdminTable(id, payload);
      return api.createAdminTable(payload);
    },
    onSuccess: async () => {
      setEditor(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const bulkMutation = useMutation({
    mutationFn: (payload) => api.bulkCreateAdminTables(payload),
    onSuccess: async () => {
      setBulkOpen(false);
      setBulkError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    },
    onError: (error) => setBulkError(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activate }) =>
      activate ? api.activateAdminTable(id) : api.deactivateAdminTable(id),
    onMutate: async ({ id, activate }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'tables'] });
      const previous = queryClient.getQueryData(['admin', 'tables']);
      queryClient.setQueryData(['admin', 'tables'], (list = []) =>
        list.map((table) => (table.id === id ? { ...table, isActive: activate } : table)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['admin', 'tables'], context.previous);
      setActionError(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAdminTable(id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
    },
    onError: (error) => setActionError(error.message),
  });

  const qrMutation = useMutation({
    mutationFn: (id) => api.generateAdminTableQr(id),
    onSuccess: async (payload) => {
      setActionError(null);
      setQrPreview(payload);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] });
    },
    onError: (error) => setActionError(error.message),
  });

  function openCreate() {
    setFormError(null);
    setEditor({
      id: null,
      tableNumber: '',
      name: '',
      capacity: '4',
      isActive: true,
    });
  }

  return (
    <div className="min-w-0 space-y-6 menu-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Tables
          </p>
          <h2
            className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Dining floor
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Define service tables, control availability, and generate guest menu QR codes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setBulkError(null); setBulkOpen(true); }}>
            Bulk create
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add table
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Tables" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Seat capacity" value={stats.seats || '—'} />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'inactive', label: 'Inactive' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={[
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
              filter === item.id
                ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]/30',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <section>
        {tablesQuery.isLoading ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">Loading tables…</p>
        ) : null}

        {tablesQuery.error ? (
          <Alert tone="error">
            {tablesQuery.error.message}
            <div className="mt-3">
              <Button size="sm" onClick={() => tablesQuery.refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {!tablesQuery.isLoading && !tablesQuery.error && tables.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_45%),linear-gradient(180deg,#fff,#f7f4ef)] px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--teal)] shadow-sm">
              <Table2 size={22} />
            </div>
            <p
              className="mt-5 text-2xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No tables yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Add a single table or create a numbered range for your floor plan.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={openCreate}>
                <Plus size={16} />
                Add table
              </Button>
              <Button variant="secondary" onClick={() => { setBulkError(null); setBulkOpen(true); }}>
                Create 1–20
              </Button>
            </div>
          </div>
        ) : null}

        {filtered.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((table, index) => (
              <article
                key={table.id}
                className={[
                  'group relative overflow-hidden rounded-3xl border border-[var(--line)] bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(15,31,28,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(15,31,28,0.5)]',
                  table.isActive ? '' : 'opacity-80',
                ].join(' ')}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90"
                  style={{
                    background: table.isActive
                      ? 'radial-gradient(circle at 20% 0%, rgba(15,118,110,0.14), transparent 55%)'
                      : 'radial-gradient(circle at 20% 0%, rgba(15,31,28,0.06), transparent 55%)',
                  }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Dining table
                    </p>
                    <h3
                      className="mt-1 text-3xl tracking-tight text-[var(--ink)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {table.label}
                    </h3>
                    {table.name ? (
                      <p className="mt-1 text-sm font-medium text-[var(--muted)]">{table.name}</p>
                    ) : null}
                  </div>
                  <span
                    className={[
                      'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                      table.isActive
                        ? 'border-[var(--teal)]/25 bg-[var(--teal)]/10 text-[var(--teal)]'
                        : 'border-[var(--line)] bg-black/[0.03] text-[var(--muted)]',
                    ].join(' ')}
                  >
                    {table.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="relative mt-5 flex items-center gap-2 text-sm text-[var(--ink)]">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--teal)]">
                    <Users size={14} />
                  </span>
                  <span className="font-semibold">
                    Capacity: {table.capacity != null ? table.capacity : '—'}
                  </span>
                </div>

                <div className="relative mt-5 flex flex-wrap gap-2 border-t border-[var(--line)]/80 pt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFormError(null);
                      setEditor({
                        id: table.id,
                        tableNumber: String(table.tableNumber),
                        name: table.name || '',
                        capacity: table.capacity != null ? String(table.capacity) : '',
                        isActive: table.isActive,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: table.id,
                        activate: !table.isActive,
                      })
                    }
                  >
                    {table.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={qrMutation.isPending || !table.isActive}
                    onClick={() => qrMutation.mutate(table.id)}
                  >
                    <QrCode size={14} />
                    Generate QR
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={qrMutation.isPending || !table.isActive}
                    onClick={async () => {
                      try {
                        const payload = await api.generateAdminTableQr(table.id);
                        downloadDataUrl(payload.dataUrl, payload.filename);
                        setActionError(null);
                        await queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] });
                        await queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
                      } catch (error) {
                        setActionError(error.message);
                      }
                    }}
                  >
                    <Download size={14} />
                    Download QR
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirm(table)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!tablesQuery.isLoading && tables.length > 0 && filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            No tables match this filter.
          </p>
        ) : null}
      </section>

      <Modal
        open={Boolean(editor)}
        title={editor?.id ? 'Edit table' : 'Add table'}
        subtitle="Table numbers must be unique within your restaurant."
        onClose={() => !saveMutation.isPending && setEditor(null)}
      >
        {editor ? (
          <TableForm
            initial={editor}
            error={formError}
            loading={saveMutation.isPending}
            onCancel={() => setEditor(null)}
            onSubmit={(payload) => saveMutation.mutate({ id: editor.id, payload })}
          />
        ) : null}
      </Modal>

      <Modal
        open={bulkOpen}
        title="Create tables"
        subtitle="Generate a consecutive range. Existing numbers are skipped."
        onClose={() => !bulkMutation.isPending && setBulkOpen(false)}
      >
        <BulkCreateForm
          error={bulkError}
          loading={bulkMutation.isPending}
          onCancel={() => setBulkOpen(false)}
          onSubmit={(payload) => bulkMutation.mutate(payload)}
        />
      </Modal>

      <Modal
        open={Boolean(qrPreview)}
        title={qrPreview ? `${qrPreview.table.label} QR` : 'Table QR'}
        subtitle="Guests scan this code to open your published menu for this table."
        onClose={() => setQrPreview(null)}
      >
        {qrPreview ? (
          <div className="space-y-5">
            <div className="mx-auto max-w-[280px] rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm">
              <img
                src={qrPreview.dataUrl}
                alt={`QR for ${qrPreview.table.label}`}
                className="h-auto w-full"
              />
            </div>
            <p className="break-all text-center text-xs text-[var(--muted)]">{qrPreview.menuUrl}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => downloadDataUrl(qrPreview.dataUrl, qrPreview.filename)}
              >
                <Download size={16} />
                Download QR
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  window.open(
                    withStaffMenuPreview(qrPreview.menuUrl),
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              >
                Open menu link
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete table?"
        message={`Delete ${confirm?.label}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMutation.mutate(confirm.id)}
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-4 shadow-[0_14px_30px_-28px_rgba(15,31,28,0.4)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
    </div>
  );
}

function TableForm({ initial, error, loading, onSubmit, onCancel }) {
  const [tableNumber, setTableNumber] = useState(initial.tableNumber || '');
  const [name, setName] = useState(initial.name || '');
  const [capacity, setCapacity] = useState(initial.capacity || '');
  const [isActive, setIsActive] = useState(initial.isActive !== false);
  const [localError, setLocalError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const number = Number(tableNumber);
    if (!Number.isInteger(number) || number < 1) {
      setLocalError('Enter a valid table number (1 or higher)');
      return;
    }
    let capacityValue = null;
    if (String(capacity).trim() !== '') {
      capacityValue = Number(capacity);
      if (!Number.isInteger(capacityValue) || capacityValue < 1) {
        setLocalError('Capacity must be a whole number of 1 or more');
        return;
      }
    }
    setLocalError(null);
    onSubmit({
      tableNumber: number,
      name: name.trim() || null,
      capacity: capacityValue,
      isActive,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {(localError || error) && <Alert tone="error">{localError || error}</Alert>}
      <FormSection title="Table details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Table number" htmlFor="table-number" required>
            <Input
              id="table-number"
              type="number"
              min="1"
              max="9999"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              disabled={loading}
              autoFocus
            />
          </Field>
          <Field label="Capacity" htmlFor="table-capacity" hint="Optional seats">
            <Input
              id="table-capacity"
              type="number"
              min="1"
              max="200"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              disabled={loading}
            />
          </Field>
        </div>
        <Field label="Display name" htmlFor="table-name" hint="Optional, e.g. Patio 3">
          <Input
            id="table-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            disabled={loading}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--line)]"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={loading}
          />
          Active on the floor
        </label>
      </FormSection>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : initial.id ? 'Save changes' : 'Create table'}
        </Button>
      </div>
    </form>
  );
}

function BulkCreateForm({ error, loading, onSubmit, onCancel }) {
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('20');
  const [capacity, setCapacity] = useState('4');
  const [localError, setLocalError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const fromNum = Number(from);
    const toNum = Number(to);
    if (!Number.isInteger(fromNum) || !Number.isInteger(toNum) || fromNum < 1 || toNum < fromNum) {
      setLocalError('Enter a valid range (From ≤ To, starting at 1)');
      return;
    }
    if (toNum - fromNum + 1 > 100) {
      setLocalError('Limit bulk create to 100 tables at a time');
      return;
    }
    let capacityValue = null;
    if (String(capacity).trim() !== '') {
      capacityValue = Number(capacity);
      if (!Number.isInteger(capacityValue) || capacityValue < 1) {
        setLocalError('Capacity must be a whole number of 1 or more');
        return;
      }
    }
    setLocalError(null);
    onSubmit({ from: fromNum, to: toNum, capacity: capacityValue, isActive: true });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {(localError || error) && <Alert tone="error">{localError || error}</Alert>}
      <FormSection title="Number range">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="From" htmlFor="bulk-from" required>
            <Input
              id="bulk-from"
              type="number"
              min="1"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              disabled={loading}
              autoFocus
            />
          </Field>
          <Field label="To" htmlFor="bulk-to" required>
            <Input
              id="bulk-to"
              type="number"
              min="1"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Capacity" htmlFor="bulk-capacity">
            <Input
              id="bulk-capacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              disabled={loading}
            />
          </Field>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Creates Table {String(from).padStart(2, '0')} through Table {String(to).padStart(2, '0')}.
          Duplicate numbers are skipped.
        </p>
      </FormSection>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create tables'}
        </Button>
      </div>
    </form>
  );
}
