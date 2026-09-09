import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Field,
  FormSection,
  Input,
  Select,
  Textarea,
} from '../../../shared/ui/index.js';
import {
  normalizeEmail,
  normalizePhone,
  validateEmailField,
  validatePhoneField,
} from '../../../shared/lib/validation.js';
import { slugify } from '../lib/format.js';
import { LogoUploadField } from './LogoUploadField.jsx';

const emptyCreate = {
  name: '',
  slug: '',
  description: '',
  email: '',
  phone: '',
  address: '',
  logoUrl: '',
  status: 'ACTIVE',
  adminName: '',
  adminEmail: '',
  temporaryPassword: '',
};

export function RestaurantForm({
  mode = 'create',
  initialValues,
  submitting,
  error,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(emptyCreate);
  const [slugTouched, setSlugTouched] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [clientFields, setClientFields] = useState({});
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setValues({
        name: initialValues.name || '',
        slug: initialValues.slug || '',
        description: initialValues.description || '',
        email: initialValues.email || '',
        phone: initialValues.phone || '',
        address: initialValues.address || '',
        logoUrl: initialValues.logoUrl || '',
        status: initialValues.status || 'ACTIVE',
        adminName: '',
        adminEmail: '',
        temporaryPassword: '',
      });
      setSlugTouched(true);
    } else {
      setValues(emptyCreate);
      setSlugTouched(false);
    }
    setLocalError(null);
    setClientFields({});
  }, [mode, initialValues]);

  const fieldErrors = useMemo(
    () => ({ ...(error?.body?.details?.fields || {}), ...clientFields }),
    [error, clientFields],
  );

  function update(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && mode === 'create' && !slugTouched) {
        next.slug = slugify(value);
      }
      return next;
    });
    setClientFields((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const fields = {};

    if (!values.name.trim() || values.name.trim().length < 2) {
      fields.name = 'Restaurant name is required';
    }
    if (!values.slug.trim()) {
      fields.slug = 'Slug is required';
    }

    const emailError = validateEmailField(values.email, {
      required: true,
      label: 'Restaurant email',
    });
    if (emailError) fields.email = emailError;

    const phoneError = validatePhoneField(values.phone, {
      required: false,
      label: 'Phone number',
    });
    if (phoneError) fields.phone = phoneError;

    if (mode === 'create') {
      if (!values.adminName.trim() || values.adminName.trim().length < 2) {
        fields.adminName = 'Admin name is required';
      }
      const adminEmailError = validateEmailField(values.adminEmail, {
        required: true,
        label: 'Admin email',
      });
      if (adminEmailError) fields.adminEmail = adminEmailError;
      if (!values.temporaryPassword || values.temporaryPassword.length < 8) {
        fields.temporaryPassword = 'Temporary password must be at least 8 characters';
      }
    }

    return fields;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setLocalError(null);

    const fields = validate();
    setClientFields(fields);
    if (Object.keys(fields).length > 0) {
      setLocalError('Please fix the highlighted fields');
      return;
    }

    const payload = {
      ...values,
      email: normalizeEmail(values.email),
      phone: values.phone ? normalizePhone(values.phone) : '',
      adminEmail: normalizeEmail(values.adminEmail),
      status: mode === 'create' ? 'ACTIVE' : values.status,
    };

    onSubmit(payload);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {(localError || (error && !Object.keys(error?.body?.details?.fields || {}).length)) && (
        <Alert tone="error">{localError || error.message}</Alert>
      )}

      <FormSection title="Restaurant">
        <Field label="Restaurant name" required error={fieldErrors.name}>
          <Input
            value={values.name}
            error={fieldErrors.name}
            placeholder="Saffron Court"
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>

        <Field
          label="Slug"
          required
          error={fieldErrors.slug}
          hint="Used in customer URLs: /menu/your-slug"
        >
          <Input
            value={values.slug}
            error={fieldErrors.slug}
            placeholder="saffron-court"
            onChange={(e) => {
              setSlugTouched(true);
              update('slug', slugify(e.target.value));
            }}
          />
        </Field>

        <Field label="Description" error={fieldErrors.description}>
          <Textarea
            value={values.description}
            error={fieldErrors.description}
            placeholder="Short positioning for the dining room"
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Restaurant email" required error={fieldErrors.email}>
            <Input
              type="email"
              autoComplete="email"
              value={values.email}
              error={fieldErrors.email}
              placeholder="hello@restaurant.com"
              onChange={(e) => update('email', e.target.value)}
            />
          </Field>
          <Field
            label="Phone"
            error={fieldErrors.phone}
            hint="Optional · exactly 10 digits"
          >
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={14}
              value={values.phone}
              error={fieldErrors.phone}
              placeholder="9876543210"
              onChange={(e) => update('phone', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Address" error={fieldErrors.address}>
          <Input
            value={values.address}
            error={fieldErrors.address}
            placeholder="Neighbourhood, city"
            onChange={(e) => update('address', e.target.value)}
          />
        </Field>

        <LogoUploadField
          value={values.logoUrl}
          error={fieldErrors.logoUrl}
          disabled={submitting}
          onUploadingChange={setLogoUploading}
          onChange={(logoUrl) => update('logoUrl', logoUrl)}
        />

        {mode === 'edit' ? (
          <Field label="Status" error={fieldErrors.status}>
            <Select
              value={values.status}
              error={fieldErrors.status}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        ) : null}
      </FormSection>

      {mode === 'create' ? (
        <FormSection
          title="Restaurant admin"
          description="Creates a RESTAURANT_ADMIN account linked to this restaurant, plus an unpublished starter menu. The restaurant starts as Active."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Admin name" required error={fieldErrors.adminName}>
              <Input
                value={values.adminName}
                error={fieldErrors.adminName}
                placeholder="Priya Sharma"
                onChange={(e) => update('adminName', e.target.value)}
              />
            </Field>
            <Field label="Admin email" required error={fieldErrors.adminEmail}>
              <Input
                type="email"
                autoComplete="off"
                value={values.adminEmail}
                error={fieldErrors.adminEmail}
                placeholder="admin@restaurant.com"
                onChange={(e) => update('adminEmail', e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Temporary password"
            required
            error={fieldErrors.temporaryPassword}
            hint="Share securely with the restaurant operator."
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={values.temporaryPassword}
              error={fieldErrors.temporaryPassword}
              placeholder="Min. 8 characters"
              onChange={(e) => update('temporaryPassword', e.target.value)}
            />
          </Field>
        </FormSection>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
        <Button
          variant="secondary"
          disabled={submitting || logoUploading}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || logoUploading}>
          {submitting
            ? 'Saving…'
            : logoUploading
              ? 'Uploading logo…'
              : mode === 'create'
                ? 'Create restaurant'
                : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
