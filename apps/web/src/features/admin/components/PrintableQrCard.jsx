/**
 * Premium printable table QR standee.
 * Themes: forest | ivory | midnight | terracotta (restaurant-selectable).
 * QR dataUrl / destination are never altered. No logo overlay on the QR.
 */

import {
  BookOpen,
  Heart,
  MapPin,
  QrCode,
  ShoppingBag,
} from 'lucide-react';
import { resolveQrCardTheme } from './qrCardThemes.js';

const CARD_RADIUS = 36;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.45 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function PrintableQrCard({
  restaurantName,
  logoUrl,
  tableLabel,
  tagline,
  accentColor,
  theme: themeId,
  dataUrl,
  className = '',
}) {
  const theme = resolveQrCardTheme(themeId);
  const accent = accentColor || theme.defaultAccent;
  const name = restaurantName || 'Restaurant';
  const table = splitTableLabel(tableLabel);
  const subtitle = tagline?.trim() || 'Digital menu · Table ordering';
  const grainOpacity = theme.lightHeader ? 0.12 : 0.22;

  return (
    <article
      className={[
        'qr-print-card relative mx-auto flex w-full max-w-[300px] flex-col overflow-hidden sm:max-w-[340px]',
        className,
      ].join(' ')}
      style={{
        '--qr-accent': accent,
        borderRadius: CARD_RADIUS,
        background: theme.body,
        boxShadow:
          '0 36px 70px -28px rgba(15, 31, 28, 0.5), 0 0 0 1px rgba(15, 31, 28, 0.08)',
      }}
    >
      <div
        className="relative px-6 pb-16 pt-8 text-center sm:px-7 sm:pb-20 sm:pt-9"
        style={{
          color: theme.headerText,
          background: `linear-gradient(165deg, ${theme.headerFrom} 0%, ${theme.headerVia} 55%, ${theme.headerTo} 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: GRAIN,
            backgroundSize: '160px 160px',
            opacity: grainOpacity,
          }}
          aria-hidden
        />
        <LeafMotif
          className="absolute left-3 top-4 opacity-[0.16]"
          color={theme.lightHeader ? theme.ink : '#ffffff'}
        />
        <LeafMotif
          className="absolute right-3 top-10 scale-x-[-1] opacity-[0.12]"
          color={theme.lightHeader ? theme.ink : '#ffffff'}
        />

        <div className="relative z-[1] flex flex-col items-center">
          <div
            className="flex h-14 w-14 items-center justify-center overflow-hidden sm:h-16 sm:w-16"
            style={{
              borderRadius: 18,
              background: theme.logoPlateBg,
              boxShadow: '0 10px 24px -12px rgba(0,0,0,0.4)',
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: theme.ink }}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <p
            className="mt-4 text-[11px] font-semibold uppercase tracking-[0.38em]"
            style={{ color: theme.headerMuted }}
          >
            {name}
          </p>

          <h2
            className="mt-3 max-w-[14ch] text-[1.55rem] font-bold leading-[1.15] tracking-tight sm:text-[1.7rem]"
            style={{ fontFamily: 'var(--font-display)', color: theme.headerText }}
          >
            Scan the menu
            <br />
            <span style={{ color: accent }}>& order at your table</span>
          </h2>

          <p
            className="mt-2.5 max-w-[22ch] text-[11px] leading-relaxed"
            style={{ color: theme.headerSoft }}
          >
            {subtitle}
          </p>

          <div
            className="mt-5 inline-flex flex-col items-center rounded-full px-5 py-2"
            style={{
              background: theme.tablePillBg,
              border: `1px solid ${theme.tablePillBorder}`,
            }}
          >
            <span
              className="text-[8px] font-semibold uppercase tracking-[0.32em]"
              style={{ color: theme.headerMuted }}
            >
              {table.word}
            </span>
            <span
              className="text-[1.55rem] font-bold leading-none tracking-[0.06em]"
              style={{ fontFamily: 'var(--font-display)', color: theme.headerText }}
            >
              {table.number}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
          <LandscapeWave theme={theme} />
        </div>
      </div>

      <div className="relative z-[2] -mt-14 flex flex-col items-center px-6 pb-5 sm:-mt-16 sm:px-7">
        <div
          className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          <MapPin size={13} strokeWidth={2.4} />
          Your table
        </div>

        <div className="relative">
          <svg
            className="pointer-events-none absolute -right-10 top-6 hidden w-12 sm:block"
            viewBox="0 0 48 64"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 8c18 6 28 22 24 42"
              stroke={accent}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M24 42l8 8M32 44l0 8"
              stroke={accent}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          <div
            className="relative bg-white p-4 shadow-[0_18px_40px_-20px_rgba(15,31,28,0.4)]"
            style={{
              borderRadius: 22,
              border: `2px solid ${theme.frame}`,
            }}
          >
            <ScannerCorners color={theme.frame} />
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR for ${table.word} ${table.number}`}
                className="block h-auto w-[188px] sm:w-[204px]"
              />
            ) : (
              <div className="h-[188px] w-[188px] animate-pulse rounded-lg bg-black/5 sm:h-[204px] sm:w-[204px]" />
            )}
          </div>
        </div>

        <p
          className="mt-4 text-center text-[13px] font-semibold leading-snug"
          style={{ color: theme.ink, fontFamily: 'var(--font-display)' }}
        >
          Scan to view our menu
          <br />
          <span className="font-medium text-[12px]" style={{ color: theme.inkSoft }}>
            & place your order
          </span>
        </p>
      </div>

      <div className="mt-auto px-3 pb-5 pt-1 sm:px-4 sm:pb-6">
        <div
          className="rounded-[22px] px-2 py-3.5 sm:px-3 sm:py-4"
          style={{ background: theme.footerBg }}
        >
          <div className="grid grid-cols-4 gap-1">
            <StepIcon icon={QrCode} label="Scan" />
            <StepIcon icon={BookOpen} label="Browse" />
            <StepIcon icon={ShoppingBag} label="Order" />
            <StepIcon icon={Heart} label="Enjoy" highlight accent={accent} />
          </div>
        </div>
      </div>
    </article>
  );
}

function StepIcon({ icon: Icon, label, highlight = false, accent = '#E07A3D' }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9"
        style={{
          background: highlight ? accent : 'rgba(255,255,255,0.12)',
          color: '#fff',
        }}
      >
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-white/80 sm:text-[9px]">
        {label}
      </span>
    </div>
  );
}

function ScannerCorners({ color }) {
  const arm = 14;
  const thick = 2.5;
  return (
    <div className="pointer-events-none absolute inset-2" aria-hidden>
      {[
        { className: 'left-0 top-0', style: { borderTop: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}`, borderRadius: '4px 0 0 0' } },
        { className: 'right-0 top-0', style: { borderTop: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}`, borderRadius: '0 4px 0 0' } },
        { className: 'bottom-0 left-0', style: { borderBottom: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}`, borderRadius: '0 0 0 4px' } },
        { className: 'bottom-0 right-0', style: { borderBottom: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}`, borderRadius: '0 0 4px 0' } },
      ].map((corner) => (
        <span
          key={corner.className}
          className={`absolute ${corner.className}`}
          style={{ width: arm, height: arm, ...corner.style }}
        />
      ))}
    </div>
  );
}

function LandscapeWave({ theme }) {
  return (
    <svg viewBox="0 0 340 90" className="h-auto w-full" preserveAspectRatio="none">
      <path
        d="M0 48C40 28 70 62 110 48C155 32 180 58 220 44C265 28 300 52 340 38V90H0V48Z"
        fill={theme.hillLight}
        opacity="0.55"
      />
      <path
        d="M0 58C45 40 80 70 125 54C170 38 200 68 245 52C290 36 315 58 340 48V90H0V58Z"
        fill={theme.hillMid}
        opacity="0.85"
      />
      <path
        d="M0 70C50 55 90 78 140 64C190 50 230 76 280 62C310 54 325 68 340 64V90H0V70Z"
        fill={theme.body}
      />
    </svg>
  );
}

function LeafMotif({ className = '', color = '#ffffff' }) {
  return (
    <svg className={`h-16 w-16 ${className}`} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 8c-2 14-14 24-22 28 10 2 20 0 28-8 6 10 8 20 6 28 12-10 18-26 14-40-8-2-18-4-26-8z"
        stroke={color}
        strokeWidth="1.2"
        fill={color}
        fillOpacity="0.15"
      />
      <path
        d="M18 36c8-4 16-12 20-22"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function splitTableLabel(label) {
  const raw = String(label || 'Table').trim();
  const match = raw.match(/(\d+)/);
  if (match) {
    return {
      word: 'TABLE',
      number: String(match[1]).padStart(2, '0'),
    };
  }
  const cleaned = raw.replace(/^table\s*/i, '').trim() || '—';
  return { word: 'TABLE', number: cleaned.toUpperCase() };
}

/**
 * Canvas PNG export — mirrors on-screen themed standee (no QR logo overlay).
 */
export async function downloadPrintableCardPng(payload) {
  const width = 720;
  const height = 1140;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const restaurantName = payload.printable?.restaurantName || 'Restaurant';
  const table = splitTableLabel(
    payload.printable?.tableLabel || payload.table?.label || 'Table',
  );
  const tagline = payload.printable?.tagline || 'Digital menu · Table ordering';
  const theme = resolveQrCardTheme(
    payload.printable?.theme || payload.restaurant?.qrCardTheme,
  );
  const accent = payload.printable?.accentColor || theme.defaultAccent;
  const logoUrl = payload.printable?.logoUrl;
  const dataUrl = payload.dataUrl;
  const filename = `${(payload.filename || 'table-qr').replace(/\.png$/i, '')}-card.png`;
  const radius = 64;
  const headerH = 520;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.clip();

  ctx.fillStyle = theme.body;
  ctx.fillRect(0, 0, width, height);

  const headerGrad = ctx.createLinearGradient(0, 0, width * 0.2, headerH);
  headerGrad.addColorStop(0, theme.headerFrom);
  headerGrad.addColorStop(0.55, theme.headerVia);
  headerGrad.addColorStop(1, theme.headerTo);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, headerH);

  drawGrain(ctx, width, headerH, theme.lightHeader ? 0.05 : 0.08);
  drawHills(ctx, width, headerH - 20, theme);

  ctx.textAlign = 'center';

  const logoSize = 100;
  const logoX = (width - logoSize) / 2;
  const logoY = 72;
  ctx.fillStyle = theme.logoPlateBg;
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 26);
  ctx.fill();

  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      ctx.save();
      roundRect(ctx, logoX + 4, logoY + 4, logoSize - 8, logoSize - 8, 22);
      ctx.clip();
      ctx.drawImage(logo, logoX + 4, logoY + 4, logoSize - 8, logoSize - 8);
      ctx.restore();
    } catch {
      drawInitial(ctx, restaurantName, width / 2, logoY + logoSize / 2, theme.ink);
    }
  } else {
    drawInitial(ctx, restaurantName, width / 2, logoY + logoSize / 2, theme.ink);
  }

  let y = logoY + logoSize + 40;
  ctx.fillStyle = theme.headerMuted;
  ctx.font = '600 16px "DM Sans", sans-serif';
  ctx.fillText(restaurantName.toUpperCase(), width / 2, y);

  y += 44;
  ctx.fillStyle = theme.headerText;
  ctx.font = '700 42px "TikTok Sans", "DM Sans", sans-serif';
  ctx.fillText('Scan the menu', width / 2, y);
  y += 48;
  ctx.fillStyle = accent;
  ctx.fillText('& order at your table', width / 2, y);

  y += 36;
  ctx.fillStyle = theme.headerSoft;
  ctx.font = '400 16px "DM Sans", sans-serif';
  wrapCentered(ctx, tagline, width / 2, y, width - 160, 22);

  y += 56;
  const pillW = 150;
  const pillH = 70;
  ctx.fillStyle = theme.tablePillBg;
  ctx.strokeStyle = theme.tablePillBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, (width - pillW) / 2, y, pillW, pillH, 35);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.headerMuted;
  ctx.font = '600 12px "DM Sans", sans-serif';
  ctx.fillText(table.word, width / 2, y + 24);
  ctx.fillStyle = theme.headerText;
  ctx.font = '700 36px "TikTok Sans", "DM Sans", sans-serif';
  ctx.fillText(table.number, width / 2, y + 56);

  const qrSize = 280;
  const qrPad = 28;
  const plate = qrSize + qrPad * 2;
  const plateX = (width - plate) / 2;
  const plateY = headerH - 40;
  const qrX = plateX + qrPad;
  const qrY = plateY + qrPad;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = theme.frame;
  ctx.lineWidth = 4;
  roundRect(ctx, plateX, plateY, plate, plate, 28);
  ctx.fill();
  ctx.stroke();
  drawScannerCorners(ctx, plateX + 14, plateY + 14, plate - 28, theme.frame);

  const qrImage = await loadImage(dataUrl);
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  let cy = plateY + plate + 42;
  ctx.fillStyle = theme.ink;
  ctx.font = '650 26px "TikTok Sans", "DM Sans", sans-serif';
  ctx.fillText('Scan to view our menu', width / 2, cy);
  cy += 30;
  ctx.fillStyle = theme.inkSoft;
  ctx.font = '500 20px "DM Sans", sans-serif';
  ctx.fillText('& place your order', width / 2, cy);

  const footY = height - 130;
  const footX = 36;
  const footW = width - 72;
  ctx.fillStyle = theme.footerBg;
  roundRect(ctx, footX, footY, footW, 100, 28);
  ctx.fill();

  const steps = [
    { label: 'Scan', highlight: false },
    { label: 'Browse', highlight: false },
    { label: 'Order', highlight: false },
    { label: 'Enjoy', highlight: true },
  ];
  const colW = footW / 4;
  steps.forEach((step, i) => {
    const cxStep = footX + colW * i + colW / 2;
    ctx.beginPath();
    ctx.fillStyle = step.highlight ? accent : 'rgba(255,255,255,0.14)';
    ctx.arc(cxStep, footY + 38, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 14px "DM Sans", sans-serif';
    ctx.fillText(String(i + 1), cxStep, footY + 43);
    ctx.font = '600 13px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(step.label.toUpperCase(), cxStep, footY + 78);
  });

  ctx.restore();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Failed to export card');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function drawGrain(ctx, width, height, alpha = 0.08) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 7000; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const s = 180 + ((Math.random() * 75) | 0);
    ctx.fillStyle = `rgb(${s},${s},${s})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
}

function drawHills(ctx, width, baseY, theme) {
  ctx.save();
  ctx.fillStyle = theme.hillLight;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(0, baseY - 30);
  ctx.bezierCurveTo(width * 0.2, baseY - 70, width * 0.4, baseY - 10, width * 0.55, baseY - 40);
  ctx.bezierCurveTo(width * 0.75, baseY - 70, width * 0.9, baseY - 20, width, baseY - 45);
  ctx.lineTo(width, baseY + 40);
  ctx.lineTo(0, baseY + 40);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = theme.hillMid;
  ctx.beginPath();
  ctx.moveTo(0, baseY - 10);
  ctx.bezierCurveTo(width * 0.25, baseY - 50, width * 0.45, baseY + 10, width * 0.65, baseY - 25);
  ctx.bezierCurveTo(width * 0.85, baseY - 55, width * 0.95, baseY - 5, width, baseY - 20);
  ctx.lineTo(width, baseY + 40);
  ctx.lineTo(0, baseY + 40);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.body;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 10);
  ctx.bezierCurveTo(width * 0.3, baseY - 15, width * 0.55, baseY + 25, width * 0.8, baseY);
  ctx.bezierCurveTo(width * 0.92, baseY - 10, width, baseY + 8, width, baseY + 5);
  ctx.lineTo(width, baseY + 80);
  ctx.lineTo(0, baseY + 80);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawScannerCorners(ctx, x, y, size, color) {
  const arm = 22;
  const t = 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = t;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x, y + arm);
  ctx.lineTo(x, y);
  ctx.lineTo(x + arm, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size - arm, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size, y + arm);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + size - arm);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x + arm, y + size);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size - arm, y + size);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x + size, y + size - arm);
  ctx.stroke();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawInitial(ctx, name, cx, cy, color) {
  ctx.fillStyle = color;
  ctx.font = '700 36px "TikTok Sans", "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((name || 'R').slice(0, 1).toUpperCase(), cx, cy + 1);
  ctx.textBaseline = 'alphabetic';
}

function wrapCentered(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = String(text).split(/\s+/);
  let line = '';
  let cursorY = y;
  for (let i = 0; i < words.length; i += 1) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
