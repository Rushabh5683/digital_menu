/** Shared bill helpers + ESC/POS thermal receipt (default 80mm) + HTML browser fallback. */

export function formatMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Plain amount for thermal receipt columns (no ₹ symbol). */
export function formatBillAmount(value) {
  const n = Number(value || 0);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatOrderDisplayNumber(orderNumber) {
  const raw = String(orderNumber || '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  const seq = parts[parts.length - 1];
  if (/^\d+$/.test(seq)) return seq.replace(/^0+(?=\d)/, '') || seq;
  return raw;
}

export function formatClock(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatBillDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEFAULT_THANKS = 'Thanks for visiting us. Drive safe. Stay healthy.';

/** 58mm ≈ 32 cols; 80mm ≈ 48 cols (common Indian POS / Epson). */
export const THERMAL_COLS = {
  '58': 32,
  '80': 48,
};

/** Dine-in label like sample: "02" / "B3" — not "Table 02". */
function formatDineInLabel(order) {
  if (order?.tableNumber != null && order.tableNumber !== '') {
    return String(order.tableNumber).padStart(2, '0');
  }
  const raw = String(order?.tableLabel || '').trim();
  if (!raw) return '-';
  const stripped = raw.replace(/^table\s*/i, '').trim();
  if (/^\d+$/.test(stripped)) return stripped.padStart(2, '0');
  return stripped.slice(0, 8) || '-';
}

function resolveBillRestaurant(restaurant) {
  const thanks = String(restaurant?.billThanksMessage || '').trim();
  return {
    name: String(restaurant?.name || 'Restaurant').toUpperCase(),
    address: String(restaurant?.address || '').trim(),
    phone: String(restaurant?.phone || '').trim(),
    gstin: String(restaurant?.gstin || '').trim().toUpperCase(),
    fssaiLicense: String(restaurant?.fssaiLicense || '').trim(),
    billThanksMessage: thanks || DEFAULT_THANKS,
  };
}

function asciiSafe(value) {
  return String(value ?? '')
    .replace(/₹/g, 'Rs ')
    .replace(/[—–]/g, '-')
    .replace(/[”“]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

function repeat(char, count) {
  return String(char || '-').repeat(Math.max(0, count));
}

function wrapText(text, width) {
  const raw = asciiSafe(text).trim();
  if (!raw) return [];
  const words = raw.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
        current = '';
      }
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          const chunk = word.slice(i, i + width);
          if (i + width < word.length) lines.push(chunk);
          else current = chunk;
        }
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function leftRight(left, right, width) {
  const l = asciiSafe(left);
  const r = asciiSafe(right);
  const space = width - l.length - r.length;
  if (space >= 1) return `${l}${' '.repeat(space)}${r}`;
  const maxLeft = Math.max(4, width - r.length - 1);
  return `${l.slice(0, maxLeft)} ${r}`.slice(0, width);
}

/** Center text in a fixed-width column (for Qty values under "Qty."). */
function centerPad(text, width) {
  const t = String(text ?? '');
  if (t.length >= width) return t.slice(0, width);
  const left = Math.floor((width - t.length) / 2);
  const right = width - t.length - left;
  return `${' '.repeat(left)}${t}${' '.repeat(right)}`;
}

function encodeUtf8ToBytes(str) {
  return new TextEncoder().encode(str);
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Build ESC/POS command bytes for a thermal bill.
 * Layout matches Farmers Kitchen / PetPooja-style 80mm sample.
 * @param {{ restaurant: object, order: object, paperWidthMm?: 58 | 80, cashierName?: string }} args
 * @returns {{ base64: string, cols: number, paperWidthMm: number } | null}
 */
export function buildThermalBillEscPos({
  restaurant,
  order,
  paperWidthMm = 80,
  cashierName = 'Staff',
} = {}) {
  if (!order) return null;

  const cols = paperWidthMm >= 80 ? THERMAL_COLS['80'] : THERMAL_COLS['58'];
  const billRestaurant = resolveBillRestaurant(restaurant);
  const { name, address, phone, gstin, fssaiLicense: fssai, billThanksMessage: thanks } =
    billRestaurant;
  const cashier = String(cashierName || 'Staff').trim() || 'Staff';
  const dineIn = formatDineInLabel(order);
  const billNo = formatOrderDisplayNumber(order.orderNumber);
  const createdAt = order.createdAt || order.placedAt || order.paidAt || new Date().toISOString();
  const items = Array.isArray(order.items) ? order.items : [];

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = Number(order.subtotal) || 0;
  const cgstRate = Number(order.cgstRate) || 0;
  const sgstRate = Number(order.sgstRate) || 0;
  const cgstAmount = Number(order.cgstAmount) || 0;
  const sgstAmount = Number(order.sgstAmount) || 0;
  const taxAmount = Number(order.taxAmount) || cgstAmount + sgstAmount;
  const taxableBase =
    Number(order.taxableAmount) ||
    Number(order.taxableSubtotal) ||
    Math.max(0, subtotal - (Number(order.discountAmount) || 0));
  const roundOff = Number(order.roundOffAmount) || 0;
  const grand = Number(order.total) || 0;
  const showTax = taxAmount > 0.001;
  const roundLabel =
    roundOff === 0
      ? '+0.00'
      : `${roundOff > 0 ? '+' : '-'}${formatBillAmount(Math.abs(roundOff)).replace(/,/g, '')}`;
  const money = (v) => formatBillAmount(v).replace(/,/g, '');

  const chunks = [];
  const pushCmd = (...nums) => chunks.push(Uint8Array.from(nums));
  const pushBytes = (bytes) => chunks.push(bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes));
  const pushText = (text) => chunks.push(encodeUtf8ToBytes(`${asciiSafe(text)}\n`));
  const pushRaw = (text) => chunks.push(encodeUtf8ToBytes(asciiSafe(text)));
  const boldOn = () => pushCmd(0x1b, 0x45, 0x01);
  const boldOff = () => pushCmd(0x1b, 0x45, 0x00);
  const alignLeft = () => pushCmd(0x1b, 0x61, 0x00);
  const alignCenter = () => pushCmd(0x1b, 0x61, 0x01);

  /**
   * Solid graphic rule — thin single-dot stroke (not a heavy black bar).
   * ESC * 8-dot single-density across full printable width.
   * @param {'thin' | 'medium'} weight
   */
  const pushSolidRule = (weight = 'thin') => {
    const dotsPerCol = 12;
    const nDots = cols * dotsPerCol;
    const nL = nDots & 0xff;
    const nH = (nDots >> 8) & 0xff;
    // One or two vertical dots only — keeps the line fine like PetPooja sample
    const fill = weight === 'medium' ? 0x18 : 0x08;
    pushCmd(0x1b, 0x2a, 0x00, nL, nH);
    pushBytes(new Uint8Array(nDots).fill(fill));
    pushCmd(0x0a);
  };

  const pushLeftRightBoldRight = (left, right) => {
    const l = asciiSafe(left);
    const r = asciiSafe(right);
    const space = Math.max(1, cols - l.length - r.length);
    boldOff();
    pushRaw(`${l}${' '.repeat(space)}`);
    boldOn();
    pushText(r);
    boldOff();
  };

  // Init: Font A (matches common Indian POS sample), full 80mm width
  pushCmd(0x1b, 0x40);
  pushCmd(0x1b, 0x4d, 0x00); // Font A
  pushCmd(0x1d, 0x21, 0x00);
  pushCmd(0x1d, 0x4c, 0x00, 0x00);
  pushCmd(0x1d, 0x57, 0x40, 0x02);

  // Header — bold + centered (name larger)
  alignCenter();
  boldOn();
  if (name.length <= Math.floor(cols / 2)) {
    pushCmd(0x1d, 0x21, 0x11);
    pushText(name);
    pushCmd(0x1d, 0x21, 0x00);
  } else {
    for (const line of wrapText(name, cols)) pushText(line);
  }
  if (address) {
    for (const line of wrapText(address.toUpperCase(), cols)) pushText(line);
  }
  if (phone) {
    for (const line of wrapText(phone, cols)) pushText(line);
  }
  boldOff();

  // Fine solid line → Name: → fine solid line
  alignLeft();
  pushSolidRule('medium');
  pushText('Name:');
  pushSolidRule('medium');

  // Date (normal) ··· Dine In (bold)
  // time
  // Cashier ··· Bill No.
  pushLeftRightBoldRight(`Date: ${formatBillDate(createdAt)}`, `Dine In: ${dineIn}`);
  pushText(formatClock(createdAt));
  pushText(leftRight(`Cashier: ${cashier}`, `Bill No.: ${billNo}`, cols));
  pushSolidRule('thin');

  const amtW = 8;
  const priceW = 7;
  const qtyW = 5;
  const itemW = Math.max(10, cols - amtW - priceW - qtyW - 3);

  pushText(
    `${'No.Item'.padEnd(itemW)} ${centerPad('Qty.', qtyW)} ${'Price'.padStart(priceW)} ${'Amount'.padStart(amtW)}`,
  );
  pushSolidRule('thin');

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.priceSnapshot) || 0;
    const amount = Number(item.subtotal) || qty * price;
    const prefix = `${index + 1} `;
    const dishName = String(item.dishNameSnapshot || item.dishName || 'Item');
    // Wrap name only — continuation lines indent under the name, not under the number
    const nameLines = wrapText(dishName, Math.max(4, itemW - prefix.length));
    const firstName = nameLines[0] || '';
    const first = `${prefix}${firstName}`.padEnd(itemW).slice(0, itemW);
    const qtyCol = centerPad(String(qty), qtyW);
    pushText(
      `${first} ${qtyCol} ${money(price).padStart(priceW)} ${money(amount).padStart(amtW)}`,
    );
    const indent = ' '.repeat(prefix.length);
    for (let i = 1; i < nameLines.length; i += 1) {
      pushText(`${indent}${nameLines[i]}`.slice(0, cols));
    }
  });

  if (!items.length) pushText('No items');

  pushSolidRule('thin');
  pushText(leftRight(`Total Qty: ${totalQty}`, `Sub Total ${money(subtotal)}`, cols));

  if (showTax) {
    const taxBase = money(taxableBase || subtotal);
    pushText(leftRight(`${taxBase}@ CGST ${cgstRate}%`, money(cgstAmount), cols));
    pushText(leftRight(`${taxBase}@ SGST ${sgstRate}%`, money(sgstAmount), cols));
  }

  pushSolidRule('thin');
  pushText(leftRight('Round off', roundLabel, cols));
  boldOn();
  pushText(leftRight('Grand Total Rs', money(grand), cols));
  boldOff();
  pushSolidRule('thin');

  // Footer — FSSAI / GST double-height so they read larger; thanks normal bold
  alignCenter();
  boldOn();
  if (fssai || gstin) {
    pushCmd(0x1d, 0x21, 0x01); // GS ! — double height
    if (fssai) {
      for (const line of wrapText(`FSSAI Lic No. ${fssai}`, cols)) pushText(line);
    }
    if (gstin) {
      for (const line of wrapText(`GST NO: ${gstin}`, cols)) pushText(line);
    }
    pushCmd(0x1d, 0x21, 0x00);
  }
  const thanksLines =
    /drive safe\.?\s*stay healthy\.?/i.test(thanks)
      ? ['Thanks for visiting us. Drive safe.', 'Stay healthy.']
      : wrapText(thanks, cols);
  for (const line of thanksLines) pushText(line);
  boldOff();

  pushCmd(0x1b, 0x64, 0x04);
  pushCmd(0x1d, 0x56, 0x41, 0x10);

  let totalLen = 0;
  for (const part of chunks) totalLen += part.length;
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of chunks) {
    out.set(part, offset);
    offset += part.length;
  }

  return { base64: bytesToBase64(out), cols, paperWidthMm };
}

/**
 * HTML fallback for browser print dialog (when QZ is unavailable).
 * Sized for 80mm — mirrors ESC/POS sample layout.
 */
export function buildThermalBillHtml({ restaurant, order, cashierName = 'Staff' }) {
  if (!order) return '';

  const billRestaurant = resolveBillRestaurant(restaurant);
  const { name, address, phone, gstin, fssaiLicense: fssai, billThanksMessage: thanks } =
    billRestaurant;
  const cashier = String(cashierName || 'Staff').trim() || 'Staff';
  const dineIn = formatDineInLabel(order);
  const billNo = formatOrderDisplayNumber(order.orderNumber);
  const createdAt = order.createdAt || order.placedAt || new Date().toISOString();
  const items = order.items || [];

  const rows = items
    .map((item, index) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.priceSnapshot) || 0;
      const amount = Number(item.subtotal) || qty * price;
      const title = String(item.dishNameSnapshot || item.dishName || 'Item');
      return `
      <tr>
        <td class="c-no">${index + 1}</td>
        <td class="c-item">${escapeHtml(title)}</td>
        <td class="c-qty">${qty}</td>
        <td class="c-price">${escapeHtml(formatBillAmount(price))}</td>
        <td class="c-amt">${escapeHtml(formatBillAmount(amount))}</td>
      </tr>`;
    })
    .join('');

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = Number(order.subtotal) || 0;
  const cgstRate = Number(order.cgstRate) || 0;
  const sgstRate = Number(order.sgstRate) || 0;
  const cgstAmount = Number(order.cgstAmount) || 0;
  const sgstAmount = Number(order.sgstAmount) || 0;
  const taxAmount = Number(order.taxAmount) || 0;
  const taxableBase =
    Number(order.taxableAmount) ||
    Number(order.taxableSubtotal) ||
    Math.max(0, subtotal - (Number(order.discountAmount) || 0));
  const roundOff = Number(order.roundOffAmount) || 0;
  const grand = Number(order.total) || 0;
  const showTax = taxAmount > 0;
  const roundLabel =
    roundOff === 0
      ? '+0.00'
      : `${roundOff > 0 ? '+' : '-'}${formatBillAmount(Math.abs(roundOff))}`;
  const thanksHtml = /drive safe\.?\s*stay healthy\.?/i.test(thanks)
    ? 'Thanks for visiting us. Drive safe.<br/>Stay healthy.'
    : escapeHtml(thanks);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill #${escapeHtml(billNo)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 576px;
      max-width: 576px;
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      line-height: 1.15;
      color: #000;
      background: #fff;
    }
    .receipt { width: 540px; margin: 0 auto; padding: 4px 8px 8px; }
    .center { text-align: center; }
    .title { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
    .head-line { font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .rule { border: none; border-top: 1.5px solid #000; margin: 3px 0; }
    .rule-thin { border: none; border-top: 1px solid #000; margin: 3px 0; }
    .meta { width: 100%; border-collapse: collapse; font-size: 12px; }
    .meta td { vertical-align: top; padding: 0; }
    .meta .r { text-align: right; }
    .dine { font-weight: 700; }
    table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.items th, table.items td { padding: 1px 0; vertical-align: top; font-size: 12px; }
    table.items th { font-size: 11px; text-align: left; }
    .c-no { width: 22px; }
    .c-item { width: auto; word-wrap: break-word; }
    .c-qty { width: 36px; text-align: center; }
    .c-price { width: 64px; text-align: right; }
    .c-amt { width: 72px; text-align: right; }
    .totals { width: 100%; border-collapse: collapse; font-size: 12px; }
    .totals td { padding: 1px 0; }
    .totals .l { text-align: left; }
    .totals .r { text-align: right; }
    .grand { font-size: 14px; font-weight: 700; }
    .foot { margin-top: 4px; font-size: 12px; font-weight: 700; line-height: 1.25; }
    .foot-lic { font-size: 14px; font-weight: 700; line-height: 1.35; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center title">${escapeHtml(name)}</div>
    ${address ? `<div class="center head-line">${escapeHtml(address.toUpperCase())}</div>` : ''}
    ${phone ? `<div class="center head-line">${escapeHtml(phone)}</div>` : ''}

    <hr class="rule" />
    <div>Name:</div>
    <hr class="rule" />

    <table class="meta">
      <tr>
        <td>Date: ${escapeHtml(formatBillDate(createdAt))}</td>
        <td class="r dine">Dine In: ${escapeHtml(dineIn)}</td>
      </tr>
      <tr>
        <td>${escapeHtml(formatClock(createdAt))}</td>
        <td></td>
      </tr>
      <tr>
        <td>Cashier: ${escapeHtml(cashier)}</td>
        <td class="r">Bill No.: ${escapeHtml(billNo)}</td>
      </tr>
    </table>

    <hr class="rule-thin" />

    <table class="items">
      <thead>
        <tr>
          <th class="c-no">No.</th>
          <th class="c-item">Item</th>
          <th class="c-qty">Qty.</th>
          <th class="c-price">Price</th>
          <th class="c-amt">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No items</td></tr>'}
      </tbody>
    </table>

    <hr class="rule-thin" />

    <table class="totals">
      <tr>
        <td class="l">Total Qty: ${totalQty}</td>
        <td class="r">Sub Total ${escapeHtml(formatBillAmount(subtotal))}</td>
      </tr>
      ${
        showTax
          ? `
      <tr>
        <td class="l">${escapeHtml(formatBillAmount(taxableBase || subtotal))}@ CGST ${escapeHtml(String(cgstRate))}%</td>
        <td class="r">${escapeHtml(formatBillAmount(cgstAmount))}</td>
      </tr>
      <tr>
        <td class="l">${escapeHtml(formatBillAmount(taxableBase || subtotal))}@ SGST ${escapeHtml(String(sgstRate))}%</td>
        <td class="r">${escapeHtml(formatBillAmount(sgstAmount))}</td>
      </tr>`
          : ''
      }
    </table>

    <hr class="rule-thin" />

    <table class="totals">
      <tr>
        <td class="l">Round off</td>
        <td class="r">${escapeHtml(roundLabel)}</td>
      </tr>
      <tr>
        <td class="l grand">Grand Total Rs</td>
        <td class="r grand">${escapeHtml(formatBillAmount(grand))}</td>
      </tr>
    </table>

    <hr class="rule-thin" />

    <div class="foot center">
      ${fssai ? `<div class="foot-lic">FSSAI Lic No. ${escapeHtml(fssai)}</div>` : ''}
      ${gstin ? `<div class="foot-lic">GST NO: ${escapeHtml(gstin)}</div>` : ''}
      <div>${thanksHtml}</div>
    </div>
  </div>
</body>
</html>`;
}

/** @deprecated use printBillWithQz / buildThermalBillEscPos */
export function printOrderBill({ restaurant, order }) {
  const html = buildThermalBillHtml({ restaurant, order });
  if (!html) return;
  printHtmlViaIframe(html);
}

export function printHtmlViaIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print bill');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    document.body.removeChild(iframe);
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  window.setTimeout(triggerPrint, 80);
  return true;
}
