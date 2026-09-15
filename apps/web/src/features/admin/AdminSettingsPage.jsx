import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Circle,
  Download,
  ExternalLink,
  Receipt,
  Store,
  Palette,
} from 'lucide-react';
import { api } from '../../shared/api/client.js';
import { Alert } from '../../shared/ui/Alert.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Field } from '../../shared/ui/Field.jsx';
import { Input, Textarea } from '../../shared/ui/FormControls.jsx';
import { LogoUploadField } from '../super/components/LogoUploadField.jsx';
import { QR_CARD_THEME_DEFAULT, QR_CARD_THEME_LIST } from './components/qrCardThemes.js';
import {
  GSTIN_PLACEHOLDER,
  normalizeEmail,
  normalizePhone,
  sanitizeFssaiInput,
  sanitizeGstinInput,
  sanitizePhoneInput,
  validateEmailField,
  validateFssaiField,
  validateGstinField,
  validatePhoneField,
} from '../../shared/lib/validation.js';

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
    phone: sanitizePhoneInput(restaurant.phone || ''),
    email: restaurant.email || '',
    address: restaurant.address || '',
    logoUrl: restaurant.logoUrl || '',
    brandTagline: restaurant.brandTagline || '',
    brandAccent: restaurant.brandAccent || '',
    qrCardTheme: restaurant.qrCardTheme || QR_CARD_THEME_DEFAULT,
    gstEnabled: Boolean(restaurant.gstEnabled),
    gstin: sanitizeGstinInput(restaurant.gstin || ''),
    fssaiLicense: sanitizeFssaiInput(restaurant.fssaiLicense || ''),
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

function SettingsCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
      <header className="mb-4 flex items-start gap-3 border-b border-[var(--line)]/80 pb-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--teal)]/10 text-[var(--teal)]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
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

    const nextErrors = {};
    const phoneError = validatePhoneField(form.phone, { required: false });
    if (phoneError) nextErrors.phone = phoneError;
    const emailError = validateEmailField(form.email, { required: false });
    if (emailError) nextErrors.email = emailError;

    if (form.gstEnabled) {
      const gstinError = validateGstinField(form.gstin, { required: true });
      if (gstinError) nextErrors.gstin = gstinError;
      const fssaiError = validateFssaiField(form.fssaiLicense, { required: true });
      if (fssaiError) nextErrors.fssaiLicense = fssaiError;
    } else {
      if (form.gstin.trim()) {
        const gstinError = validateGstinField(form.gstin, { required: false });
        if (gstinError) nextErrors.gstin = gstinError;
      }
      if (form.fssaiLicense.trim()) {
        const fssaiError = validateFssaiField(form.fssaiLicense, { required: false });
        if (fssaiError) nextErrors.fssaiLicense = fssaiError;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    saveMutation.mutate({
      name: form.name,
      description: form.description,
      phone: form.phone ? normalizePhone(form.phone) : '',
      email: form.email ? normalizeEmail(form.email) : '',
      address: form.address,
      logoUrl: form.logoUrl,
      brandTagline: form.brandTagline,
      brandAccent: form.brandAccent,
      qrCardTheme: form.qrCardTheme,
      gstEnabled: form.gstEnabled,
      gstin: form.gstin ? sanitizeGstinInput(form.gstin) : '',
      fssaiLicense: form.fssaiLicense ? sanitizeFssaiInput(form.fssaiLicense) : '',
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

  const saveDisabled = saveMutation.isPending || logoUploading || !isDirty;
  const saveLabel = saveMutation.isPending ? 'Saving…' : 'Save profile';

  function SaveActions({ className = '' }) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
        {savedFlash ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Check size={16} />
            Saved
          </span>
        ) : isDirty ? (
          <span className="text-sm text-[var(--muted)]">Unsaved changes</span>
        ) : null}
        <Button type="submit" form="admin-settings-form" disabled={saveDisabled}>
          {saveLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 menu-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            Settings
          </p>
          <h2
            className="mt-1 text-2xl tracking-tight text-[var(--ink)] sm:text-3xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Restaurant profile
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Update contact details, branding, QR look, and tax — then save.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ready ? (
            <Link to="/admin/qr-codes">
              <Button size="sm" variant="secondary">
                <Download size={14} />
                QR codes
              </Button>
            </Link>
          ) : null}
          <SaveActions />
        </div>
      </header>

      <SetupStatusPanel setup={setup} loading={setupQuery.isLoading} error={setupQuery.error} />

      <form id="admin-settings-form" onSubmit={onSubmit} className="space-y-4">
        {restaurantQuery.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading profile…</p>
        ) : null}
        {restaurantQuery.error ? (
          <Alert tone="error">{restaurantQuery.error.message}</Alert>
        ) : null}
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <SettingsCard
          icon={Store}
          title="Basic details"
          description="Name, logo, and how guests reach you."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Restaurant name"
              htmlFor="settings-name"
              required
              error={fieldErrors.name}
              className="sm:col-span-2 xl:col-span-2"
            >
              <Input
                id="settings-name"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                required
                maxLength={120}
              />
            </Field>

            <div className="sm:col-span-2 xl:col-span-3">
              <LogoUploadField
                value={form.logoUrl}
                onChange={(logoUrl) => setField('logoUrl', logoUrl)}
                error={fieldErrors.logoUrl}
                disabled={saveMutation.isPending}
                onUploadingChange={setLogoUploading}
                uploadFn={(file) => api.uploadAdminLogo(file)}
              />
            </div>

            <Field
              label="Short description"
              htmlFor="settings-description"
              error={fieldErrors.description}
              hint="Shown near your brand on the guest menu."
              className="sm:col-span-2 xl:col-span-3"
            >
              <Textarea
                id="settings-description"
                rows={3}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                maxLength={2000}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor="settings-phone"
              required
              error={fieldErrors.phone}
              hint="10 digits only"
            >
              <Input
                id="settings-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                required
                value={form.phone}
                onChange={(event) => setField('phone', sanitizePhoneInput(event.target.value))}
                placeholder="9876543210"
              />
            </Field>

            <Field label="Email" required htmlFor="settings-email" error={fieldErrors.email}>
              <Input
                id="settings-email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                placeholder="hello@restaurant.com"
              />
            </Field>

            <Field
              label="Address"
              htmlFor="settings-address"
              error={fieldErrors.address}
              className="sm:col-span-2 xl:col-span-3"
            >
              <Textarea
                id="settings-address"
                rows={2}
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                maxLength={300}
              />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Palette}
          title="Branding & QR cards"
          description="Tagline, accent color, and printable table card theme."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              hint="Hex color on printable QR cards."
            >
              <div className="flex items-center gap-2">
                <input
                  id="settings-accent"
                  type="color"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(form.brandAccent) ? form.brandAccent : '#C9A227'
                  }
                  onChange={(event) => setField('brandAccent', event.target.value.toUpperCase())}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-[var(--line)] bg-white p-1"
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
              hint="Preview themes in QR studio."
              className="sm:col-span-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {QR_CARD_THEME_LIST.map((theme) => {
                  const selected = form.qrCardTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setField('qrCardTheme', theme.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? 'border-[var(--teal)] bg-[var(--teal)]/8 shadow-[0_0_0_1px_var(--teal)]'
                          : 'border-[var(--line)] bg-[var(--surface)]/40 hover:bg-white'
                      }`}
                    >
                      <div className="flex gap-1">
                        {theme.swatch.map((color) => (
                          <span
                            key={color}
                            className="h-4 flex-1 rounded-md border border-black/5"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{theme.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                        {theme.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Receipt}
          title="Tax & printed bills"
          description="GST rates, licences, and bill footer — same on every receipt."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ink)]">Enable GST (CGST + SGST)</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Prices are tax-exclusive. Typical food slab: 2.5% + 2.5%.
              </p>
            </div>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
              <input
                type="checkbox"
                checked={form.gstEnabled}
                onChange={(event) => setField('gstEnabled', event.target.checked)}
                className="h-4 w-4 accent-[var(--teal)]"
              />
              {form.gstEnabled ? 'On' : 'Off'}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="GSTIN"
              htmlFor="settings-gstin"
              required={form.gstEnabled}
              error={fieldErrors.gstin}
              hint={form.gstEnabled ? `Format: ${GSTIN_PLACEHOLDER}` : 'Required when GST is on'}
            >
              <Input
                id="settings-gstin"
                value={form.gstin}
                onChange={(event) => setField('gstin', sanitizeGstinInput(event.target.value))}
                maxLength={15}
                placeholder={GSTIN_PLACEHOLDER}
                disabled={!form.gstEnabled}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>

            <Field
              label="FSSAI licence no."
              htmlFor="settings-fssai"
              required={form.gstEnabled}
              error={fieldErrors.fssaiLicense}
              hint={
                form.gstEnabled
                  ? '14 digits · required with GST · printed on every bill'
                  : '14 digits · printed on every bill'
              }
            >
              <Input
                id="settings-fssai"
                value={form.fssaiLicense}
                onChange={(event) => setField('fssaiLicense', sanitizeFssaiInput(event.target.value))}
                maxLength={14}
                inputMode="numeric"
                placeholder="10012021000123"
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

            <Field
              label="Bill thank-you message"
              htmlFor="settings-thanks"
              error={fieldErrors.billThanksMessage}
              hint="Footer on every printed bill"
              className="sm:col-span-2"
            >
              <Input
                id="settings-thanks"
                value={form.billThanksMessage}
                onChange={(event) => setField('billThanksMessage', event.target.value)}
                maxLength={200}
              />
            </Field>
          </div>

          {form.gstEnabled ? (
            <p className="mt-3 text-xs font-medium text-[var(--teal)]">
              Combined GST: {(Number(form.cgstRate) || 0) + (Number(form.sgstRate) || 0)}% on food
              subtotal
            </p>
          ) : null}
        </SettingsCard>
      </form>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Quick links</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Jump to menu, tables, and QR setup without leaving settings unfinished.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/admin/menu" label="Publish menu" hint="Go live for guests" />
          <QuickLink to="/admin/tables" label="Manage tables" hint="Add dining tables" />
          <QuickLink to="/admin/qr-codes" label="QR codes" hint="Generate & print" />
          <QuickLink to="/admin/categories" label="Categories" hint="Organize the menu" />
        </div>
        {ready ? (
          <div className="mt-3">
            <Link to="/admin/qr-codes">
              <Button size="sm" variant="secondary">
                <Download size={14} />
                Download table QR codes
              </Button>
            </Link>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 sm:px-5">
        <p className="text-sm text-[var(--muted)]">
          {isDirty
            ? 'You have unsaved changes.'
            : savedFlash
              ? 'Profile saved.'
              : 'Review the sections above, then save.'}
        </p>
        <SaveActions />
      </div>
    </div>
  );
}

function SetupStatusPanel({ setup, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
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
        'rounded-2xl border px-4 py-3.5 sm:px-5',
        ready ? 'border-emerald-200 bg-emerald-50/50' : 'border-[var(--line)] bg-white',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {ready ? 'Setup complete — restaurant is ready' : setup.message}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {setup.completedCount}/{setup.totalCount} steps done
          </p>
        </div>
        {ready ? (
          <Link
            to="/admin/qr-codes"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--teal)] hover:underline"
          >
            Open QR studio
            <ExternalLink size={12} />
          </Link>
        ) : null}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {setup.steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.href}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-black/[0.03]"
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  step.complete
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-[var(--line)] bg-white text-[var(--muted)]',
                ].join(' ')}
              >
                {step.complete ? <Check size={12} strokeWidth={2.5} /> : <Circle size={10} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--ink)]">{step.label}</span>
                <span className="block truncate text-[11px] text-[var(--muted)]">{step.hint}</span>
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
      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 px-3 py-2.5 transition hover:border-[var(--teal)]/35 hover:bg-white"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--ink)]">{label}</span>
        <span className="block text-[11px] text-[var(--muted)]">{hint}</span>
      </span>
      <ExternalLink size={14} className="shrink-0 text-[var(--muted)]" />
    </Link>
  );
}
