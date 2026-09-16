import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../../shared/api/client.js';
import { resolveMediaUrl } from '../../../shared/lib/mediaUrl.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function LogoUploadField({
  value,
  onChange,
  error,
  disabled,
  onUploadingChange,
  uploadFn,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const preview = localPreview || resolveMediaUrl(value) || null;

  async function handleFile(file) {
    setUploadError(null);

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > MAX_BYTES) {
      setUploadError('Logo must be 5 MB or smaller.');
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);

    try {
      const upload = uploadFn || ((fileToUpload) => api.uploadSuperLogo(fileToUpload));
      const result = await upload(file);
      const nextUrl = result.logoUrl || result.publicUrl || '';
      onChange(nextUrl);
      // Drop blob preview so we show the saved /uploads URL via resolveMediaUrl.
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadError(null);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      // Keep previous logo value on failure — don't wipe branding.
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Restaurant logo
      </span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-1.5">
          {preview ? (
            <img
              src={preview}
              alt="Restaurant logo preview"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImagePlus size={22} className="text-[var(--muted)]" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              handleFile(file);
              event.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className={[
                'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-black/[0.02]',
                disabled || uploading ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {uploading ? 'Uploading…' : value ? 'Replace logo' : 'Upload logo'}
            </label>
            {value || localPreview ? (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => {
                  if (localPreview) URL.revokeObjectURL(localPreview);
                  setLocalPreview(null);
                  setUploadError(null);
                  onChange('');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--danger)] hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={14} />
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--muted)]">
            JPG, PNG, WEBP, or GIF · large photos are compressed · click Save profile after upload
          </p>
        </div>
      </div>

      {(uploadError || error) && (
        <p className="text-xs text-[var(--danger)]">{uploadError || error}</p>
      )}
    </div>
  );
}
