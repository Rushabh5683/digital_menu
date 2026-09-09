/**
 * Curated QR table-card themes (restaurant-admin selectable).
 * Accent color from restaurant branding overlays highlights.
 */

export const QR_CARD_THEME_DEFAULT = 'forest';

export const QR_CARD_THEMES = {
  forest: {
    id: 'forest',
    label: 'Forest Standee',
    description: 'Deep green header, rolling hills, hospitality standee.',
    swatch: ['#0F3D36', '#1A5C4E', '#F7F4EE', '#E07A3D'],
    defaultAccent: '#E07A3D',
    headerFrom: '#0F3D36',
    headerVia: '#1A5C4E',
    headerTo: '#164A40',
    headerText: '#ffffff',
    headerMuted: 'rgba(255,255,255,0.72)',
    headerSoft: 'rgba(255,255,255,0.62)',
    hillLight: '#2A7A68',
    hillMid: '#1A5C4E',
    body: '#F7F4EE',
    ink: '#0F3D36',
    inkSoft: 'rgba(15,61,54,0.65)',
    frame: '#0F3D36',
    footerBg: '#0F3D36',
    logoPlateBg: 'rgba(255,255,255,0.95)',
    tablePillBg: 'rgba(255,255,255,0.1)',
    tablePillBorder: 'rgba(255,255,255,0.22)',
    lightHeader: false,
  },
  ivory: {
    id: 'ivory',
    label: 'Ivory Classic',
    description: 'Warm cream stock, charcoal type, champagne accents.',
    swatch: ['#F6F1E8', '#E8DFD0', '#1A2E28', '#C4A574'],
    defaultAccent: '#C4A574',
    headerFrom: '#F8F3EA',
    headerVia: '#F1E8DA',
    headerTo: '#E8DFD0',
    headerText: '#1A2E28',
    headerMuted: 'rgba(26,46,40,0.55)',
    headerSoft: 'rgba(26,46,40,0.5)',
    hillLight: '#D9CDB8',
    hillMid: '#C9BBA3',
    body: '#FBF8F2',
    ink: '#1A2E28',
    inkSoft: 'rgba(26,46,40,0.62)',
    frame: '#1A2E28',
    footerBg: '#1A2E28',
    logoPlateBg: '#ffffff',
    tablePillBg: 'rgba(26,46,40,0.06)',
    tablePillBorder: 'rgba(26,46,40,0.14)',
    lightHeader: true,
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    description: 'Charcoal header, crisp cream base — bar & steakhouse.',
    swatch: ['#121418', '#1C2128', '#F4F1EC', '#D4AF37'],
    defaultAccent: '#D4AF37',
    headerFrom: '#121418',
    headerVia: '#1C2128',
    headerTo: '#252B33',
    headerText: '#ffffff',
    headerMuted: 'rgba(255,255,255,0.7)',
    headerSoft: 'rgba(255,255,255,0.58)',
    hillLight: '#3A424E',
    hillMid: '#2A313A',
    body: '#F4F1EC',
    ink: '#121418',
    inkSoft: 'rgba(18,20,24,0.62)',
    frame: '#121418',
    footerBg: '#121418',
    logoPlateBg: 'rgba(255,255,255,0.96)',
    tablePillBg: 'rgba(255,255,255,0.1)',
    tablePillBorder: 'rgba(255,255,255,0.2)',
    lightHeader: false,
  },
  terracotta: {
    id: 'terracotta',
    label: 'Warm Terracotta',
    description: 'Clay & cream tones for casual and Mediterranean dining.',
    swatch: ['#8C3B2A', '#A85A3F', '#F8F1E7', '#E8A05C'],
    defaultAccent: '#E8A05C',
    headerFrom: '#7A3426',
    headerVia: '#8C3B2A',
    headerTo: '#A85A3F',
    headerText: '#ffffff',
    headerMuted: 'rgba(255,255,255,0.75)',
    headerSoft: 'rgba(255,255,255,0.65)',
    hillLight: '#C47A5C',
    hillMid: '#9E4F3A',
    body: '#F8F1E7',
    ink: '#3D241C',
    inkSoft: 'rgba(61,36,28,0.65)',
    frame: '#5C2E22',
    footerBg: '#5C2E22',
    logoPlateBg: 'rgba(255,255,255,0.95)',
    tablePillBg: 'rgba(255,255,255,0.12)',
    tablePillBorder: 'rgba(255,255,255,0.25)',
    lightHeader: false,
  },
};

export const QR_CARD_THEME_LIST = Object.values(QR_CARD_THEMES);

export function resolveQrCardTheme(themeId) {
  const id = String(themeId || '')
    .trim()
    .toLowerCase();
  return QR_CARD_THEMES[id] || QR_CARD_THEMES[QR_CARD_THEME_DEFAULT];
}
