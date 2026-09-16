/**
 * Shrink phone-camera photos before upload.
 * Large files often fail on mobile hotspot (slow uplink / proxy limits).
 */
const DEFAULTS = {
  maxEdge: 1600,
  maxBytes: 900 * 1024,
  mime: 'image/webp',
  quality: 0.82,
};

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * @param {File} file
 * @param {Partial<typeof DEFAULTS>} [options]
 * @returns {Promise<File>}
 */
export async function compressImageForUpload(file, options = {}) {
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return file;
  }
  // GIFs may be animated — leave alone.
  if (file.type === 'image/gif') return file;

  const { maxEdge, maxBytes, mime, quality } = { ...DEFAULTS, ...options };

  // Already small enough — skip work.
  if (file.size <= maxBytes && file.size <= 1.2 * 1024 * 1024) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let q = quality;
    let blob = await canvasToBlob(canvas, mime, q);
    if (!blob) return file;

    // Step quality down until under target size.
    while (blob.size > maxBytes && q > 0.45) {
      q -= 0.1;
      blob = await canvasToBlob(canvas, mime, q);
      if (!blob) break;
    }

    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'dish';
    const ext = mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${base}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
