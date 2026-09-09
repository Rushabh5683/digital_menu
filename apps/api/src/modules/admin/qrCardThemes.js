/**
 * Curated printable QR card themes for restaurant admins.
 * Keep in sync with apps/web PrintableQrCard themes.
 */

export const QR_CARD_THEME_IDS = ['forest', 'ivory', 'midnight', 'terracotta'];

export const QR_CARD_THEME_DEFAULT = 'forest';

export function normalizeQrCardTheme(value) {
  const id = String(value || '')
    .trim()
    .toLowerCase();
  if (QR_CARD_THEME_IDS.includes(id)) return id;
  return QR_CARD_THEME_DEFAULT;
}
