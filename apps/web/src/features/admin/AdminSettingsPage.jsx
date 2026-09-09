import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Circle, Download, ExternalLink } from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input, Textarea } from '../../shared/ui/FormControls.jsx';
import { FormSection } from '../../shared/ui/FormSection.jsx';
import { LogoUploadField } from '../super/components/LogoUploadField.jsx';
import { QR_CARD_THEME_DEFAULT, QR_CARD_THEME_LIST } from './components/qrCardThemes.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  logoUrl: '',
  brandTagline: '',
  brandAccent: '',
  qrCardTheme: QR_CARD_THEME_DEFAULT,
  gstEnabled: false,
  gstin: '',
  fssaiLicense: '',
  billThanksMessage: 'Thanks for visiting us. Drive safe. Stay healthy.',
  cgstRate: '2.5',
  sgstRate: '2.5',
};

function toForm(restaurant) {
  if (!restaurant) return { ...EMPTY_FORM };
  return {
    name: restaurant.name || '',
    description: restaurant.description || '',
    phone: restaurant.phone || '',
    email: restaurant.email || '',
    address: restaurant.address || '',
    logoUrl: restaurant.logoUrl || '',
    brandTagline: restaurant.brandTagline || '',
    brandAccent: restaurant.brandAccent || '',
    qrCardTheme: restaurant.qrCardTheme || QR_CARD_THEME_DEFAULT,
    gstEnabled: Boolean(restaurant.gstEnabled),
    gstin: restaurant.gstin || '',
    fssaiLicense: restaurant.fssaiLicense || '',
    billThanksMessage:
      restaurant.billThanksMessage ||
      'Thanks for visiting us. Drive safe. Stay healthy.',
    cgstRate:
      restaurant.cgstRate != null && restaurant.cgstRate !== ''
        ? String(restaurant.cgstRate)
        : '2.5',
    sgstRate:
      restaurant.sgstRate != null && restaurant.sgstRate !== ''
        ? String(restaurant.sgstRate)
        : '2.5',
  };
}

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const restaurantQuery = useQuery({
    queryKey: ['admin', 'restaurant'],
    queryFn: async () => (await api.getAdminRestaurant()).restaurant,
  });

  const setupQuery = useQuery({
    queryKey: ['admin', 'setup'],
    queryFn: async () => (await api.getAdminSetupStatus()).setup,
  });

  useEffect(() => {
    if (restaurantQuery.data) {
      setForm(toForm(restaurantQuery.data));
    }
  }, [restaurantQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.updateAdminRestaurant(payload),
    onSuccess: async (payload) => {
      setFormError(null);
      setFieldErrors({});
      setForm(toForm(payload.restaurant));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2200);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'setup'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] }),
      ]);
    },
    onError: (error) => {
      setFormError(error.message);
      setFieldErrors(error.body?.details?.fields || error.body?.fields || {});
    },
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function onSubmit(event) {
    event.preventDefault();
    setFormError(null);
    saveMutation.mutate({
      name: form.name,
      description: form.description,
      phone: form.phone,
      email: form.email,
      address: form.address,
      logoUrl: form.logoUrl,
      brandTagline: form.brandTagline,
      brandAccent: form.brandAccent,
      qrCardTheme: form.qrCardTheme,
      gstEnabled: form.gstEnabled,
      gstin: form.gstin,
      fssaiLicense: form.fssaiLicense,
      billThanksMessage: form.billThanksMessage,
      cgstRate: Number(form.cgstRate),
      sgstRate: Number(form.sgstRate),
    });
  }

  const setup = setupQuery.data;
  const ready = Boolean(setup?.ready);
  const isDirty =
    restaurantQuery.data &&
    JSON.stringify(toForm(restaurantQuery.data)) !== JSON.stringify(form);

  return (
    <div className="space-y-8 menu-fade-up">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
          Settings
        </p>
        <h2
          className="mt-2 text-3xl tracking-tight text-[var(--ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Restaurant setup
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Finish your profile, menu, tables, and QR codes. When everything is checked, guests can
          scan and order.
        </p>
      </div>

      <SetupStatusPanel setup={setup} loading={setupQuery.isLoading} error={setupQuery.error} />

      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection
          title="Restaurant profile"
          description="Shown on the guest menu and printable table cards."
        >
          {restaurantQuery.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading profile…</p>
          ) : null}
          {restaurantQuery.error ? (
            <Alert tone="error">{restaurantQuery.error.message}</Alert>
          ) : null}
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-4">
              <Field label="Restaurant name" htmlFor="settings-name" required error={fieldErrors.name}>
                <Input
                  id="settings-name"
                  value={form.name}
                  onChange={(event) => setField('name', event.target.value)}
                  required
                  maxLength={120}
                />
              </Field>

              <LogoUploadField
                value={form.logoUrl}
                onChange={(logoUrl) => setField('logoUrl', logoUrl)}
                error={fieldErrors.logoUrl}
                disabled={saveMutation.isPending}
                onUploadingChange={setLogoUploading}
                uploadFn={(file) => api.uploadAdminLogo(file)}
              />

              <Field
                label="Short description"
                htmlFor="settings-description"
                error={fieldErrors.description}
                hint="A sentence guests see near your brand."
              >
                <Textarea
                  id="settings-description"
                  rows={4}
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                  maxLength={2000}
                />
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Phone" htmlFor="settings-phone" error={fieldErrors.phone}>
                <Input
                  id="settings-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  placeholder="10-digit contact number"
                />
              </Field>

              <Field label="Email" htmlFor="settings-email" error={fieldErrors.email}>
                <Input
                  id="settings-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setField('email', event.target.value)}
                />
              </Field>

              <Field label="Address" htmlFor="settings-address" error={fieldErrors.address}>
                <Textarea
                  id="settings-address"
                  rows={3}
                  value={form.address}
                  onChange={(event) => setField('address', event.target.value)}
                  maxLength={300}
                />
              </Field>

              <Field
                label="Brand tagline"
                htmlFor="settings-tagline"
                error={fieldErrors.brandTagline}
                hint="Optional line under your name on QR cards."
              >
                <Input
                  id="settings-tagline"
                  value={form.brandTagline}
                  onChange={(event) => setField('brandTagline', event.target.value)}
                  maxLength={120}
                  placeholder="Scan · Order · Enjoy"
                />
              </Field>

              <Field
                label="Brand accent"
                htmlFor="settings-accent"
                error={fieldErrors.brandAccent}
                hint="Hex color used on printable QR cards."
              >
                <div className="flex items-center gap-3">
                  <input
                    id="settings-accent"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(form.brandAccent) ? form.brandAccent : '#C9A227'}
                    onChange={(event) => setField('brandAccent', event.target.value.toUpperCase())}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-[var(--line)] bg-white p-1"
                  />
                  <Input
                    value={form.brandAccent}
                    onChange={(event) => setField('brandAccent', event.target.value)}
                    placeholder="#C9A227"
                    maxLength={7}
                  />
                </div>
              </Field>

              <Field
                label="QR card theme"
                error={fieldErrors.qrCardTheme}
                hint="Applies to all printable table QR cards. Preview in QR studio."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {QR_CARD_THEME_LIST.map((theme) => {
                    const selected = form.qrCardTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setField('qrCardTheme', theme.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          selected
                            ? 'border-[var(--teal)] bg-[var(--teal)]/8 shadow-[0_0_0_1px_var(--teal)]'
                            : 'border-[var(--line)] bg-white hover:bg-black/[0.02]'
                        }`}
                      >
                        <div className="flex gap-1.5">
                          {theme.swatch.map((color) => (
                            <span
                              key={color}
                              className="h-5 flex-1 rounded-md border border-black/5"
                              style={{ background: color }}
                            />
                          ))}
                        </div>
                        <p
                          className="mt-2.5 text-sm font-semibold text-[var(--ink)]"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {theme.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                          {theme.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">GST (CGST + SGST)</p>
                <p className="mt-1 max-w-xl text-xs text-[var(--muted)]">
                  Restaurant-wide tax, like PetPooja’s default dine-in slab. Prices are tax-exclusive:
                  bill shows food subtotal, then CGST and SGST, then grand total. Typical standalone
                  restaurant food rate is 2.5% + 2.5% (5% GST).
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.gstEnabled}
                  onChange={(event) => setField('gstEnabled', event.target.checked)}
                  className="h-4 w-4 accent-[var(--teal)]"
                />
                Enable GST
              </label>
            </div>

            <div
              className={[
                'mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
                form.gstEnabled ? '' : '',
              ].join(' ')}
            >
              <Field label="GSTIN" htmlFor="settings-gstin" error={fieldErrors.gstin}>
                <Input
                  id="settings-gstin"
                  value={form.gstin}
                  onChange={(event) => setField('gstin', event.target.value.toUpperCase())}
                  maxLength={15}
                  placeholder="15-character GSTIN"
                  disabled={!form.gstEnabled}
                />
              </Field>
              <Field
                label="FSSAI licence no."
                htmlFor="settings-fssai"
                error={fieldErrors.fssaiLicense}
              >
                <Input
                  id="settings-fssai"
                  value={form.fssaiLicense}
                  onChange={(event) => setField('fssaiLicense', event.target.value)}
                  maxLength={40}
                  placeholder="Printed on every bill"
                />
              </Field>
              <Field
                label="CGST %"
                htmlFor="settings-cgst"
                error={fieldErrors.cgstRate}
                hint="Central GST"
              >
                <Input
                  id="settings-cgst"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.cgstRate}
                  onChange={(event) => setField('cgstRate', event.target.value)}
                  disabled={!form.gstEnabled}
                />
              </Field>
              <Field
                label="SGST %"
                htmlFor="settings-sgst"
                error={fieldErrors.sgstRate}
                hint="State GST"
              >
                <Input
                  id="settings-sgst"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.sgstRate}
                  onChange={(event) => setField('sgstRate', event.target.value)}
                  disabled={!form.gstEnabled}
                />
              </Field>
            </div>
            <Field
              className="mt-4"
              label="Bill thank-you message"
              htmlFor="settings-thanks"
              error={fieldErrors.billThanksMessage}
              hint="Same footer on every printed bill"
            >
              <Input
                id="settings-thanks"
                value={form.billThanksMessage}
                onChange={(event) => setField('billThanksMessage', event.target.value)}
                maxLength={200}
              />
            </Field>
            {form.gstEnabled ? (
              <p className="mt-3 text-xs font-medium text-[var(--teal)]">
                Combined GST:{' '}
                {(Number(form.cgstRate) || 0) + (Number(form.sgstRate) || 0)}% on food subtotal
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" disabled={saveMutation.isPending || logoUploading || !isDirty}>
              {saveMutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
            {savedFlash ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <Check size={16} />
                Saved
              </span>
            ) : null}
            {restaurantQuery.data?.slug ? (
              <a
                href={`/r/${restaurantQuery.data.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--teal)] hover:underline"
              >
                Preview guest menu
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </FormSection>
      </form>

      <FormSection
        title="Continue setup"
        description="Jump to the remaining workspace areas."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/admin/menu" label="Publish menu" hint="Go live for guests" />
          <QuickLink to="/admin/tables" label="Manage tables" hint="Add dining tables" />
          <QuickLink to="/admin/qr-codes" label="QR codes" hint="Generate & print" />
          <QuickLink to="/admin/categories" label="Categories" hint="Organize the menu" />
        </div>
        {ready ? (
          <div className="mt-4">
            <Link to="/admin/qr-codes">
              <Button>
                <Download size={16} />
                Download Table QR Codes
              </Button>
            </Link>
          </div>
        ) : null}
      </FormSection>
    </div>
  );
}

function SetupStatusPanel({ setup, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white/80 px-5 py-8 text-sm text-[var(--muted)]">
        Checking restaurant setup…
      </div>
    );
  }

  if (error) {
    return <Alert tone="error">{error.message}</Alert>;
  }

  if (!setup) return null;

  const ready = setup.ready;

  return (
    <section
      className={[
        'overflow-hidden rounded-3xl border px-5 py-6 sm:px-7',
        ready
          ? 'border-emerald-200 bg-[linear-gradient(165deg,#f3faf6_0%,#ffffff_55%,#f7f4ef_100%)]'
          : 'border-[var(--line)] bg-[linear-gradient(165deg,#ffffff_0%,#f7f9f8_100%)]',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Restaurant setup
          </p>
          <p
            className="mt-2 text-2xl tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {ready ? 'Your restaurant is ready.' : setup.message}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {setup.completedCount}/{setup.totalCount} complete
          </p>
        </div>
        {ready ? (
          <Link to="/admin/qr-codes">
            <Button>
              <Download size={16} />
              Download Table QR Codes
            </Button>
          </Link>
        ) : null}
      </div>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {setup.steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.href}
              className="flex items-start gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition hover:border-[var(--line)] hover:bg-white/80"
            >
              <span
                className={[
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  step.complete
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-[var(--line)] bg-white text-[var(--muted)]',
                ].join(' ')}
              >
                {step.complete ? <Check size={14} strokeWidth={2.5} /> : <Circle size={12} />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--ink)]">{step.label}</span>
                  <span className="text-sm text-[var(--muted)]">{step.complete ? '✓' : ''}</span>
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{step.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickLink({ to, label, hint }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-4 transition hover:border-[var(--teal)]/40 hover:bg-white"
    >
      <p className="font-semibold text-[var(--ink)]">{label}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </Link>
  );
}
