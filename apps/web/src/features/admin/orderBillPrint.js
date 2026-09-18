/** Shared bill helpers + ESC/POS thermal receipt (default 58mm) + HTML browser fallback. */

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

/** 58mm ≈ 32 cols; 80mm ≈ 42 cols (Epson/Star common widths). */
export const THERMAL_COLS = {
  '58': 32,
  '80': 42,
};

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
 * Build ESC/POS command bytes for a compact thermal bill.
 * @param {{ restaurant: object, order: object, paperWidthMm?: 58 | 80 }} args
 * @returns {{ base64: string, cols: number } | null}
 */
export function buildThermalBillEscPos({ restaurant, order, paperWidthMm = 58 } = {}) {
  if (!order) return null;

  const cols = paperWidthMm >= 80 ? THERMAL_COLS['80'] : THERMAL_COLS['58'];
  const rule = repeat('-', cols);

  const name = String(restaurant?.name || 'Restaurant').toUpperCase();
  const address = restaurant?.address || '';
  const phone = restaurant?.phone || '';
  const gstin = restaurant?.gstin || '';
  const fssai = restaurant?.fssaiLicense || '';
  const thanks = restaurant?.billThanksMessage || DEFAULT_THANKS;

  const tableNo =
    order.tableNumber != null
      ? String(order.tableNumber).padStart(2, '0')
      : order.tableLabel?.replace(/\D/g, '') || '-';
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
  const roundOff = Number(order.roundOffAmount) || 0;
  const grand = Number(order.total) || 0;
  const showTax = taxAmount > 0.001;
  const roundLabel =
    roundOff === 0 ? '0.00' : `${roundOff > 0 ? '+' : '-'}${formatBillAmount(Math.abs(roundOff))}`;

  const chunks = [];
  const pushCmd = (...nums) => chunks.push(Uint8Array.from(nums));
  const pushText = (text) => chunks.push(encodeUtf8ToBytes(`${asciiSafe(text)}\n`));

  pushCmd(0x1b, 0x40); // ESC @ init
  pushCmd(0x1b, 0x61, 0x01); // center
  pushCmd(0x1b, 0x45, 0x01); // bold on
  // Double-size only when the name fits (~half of columns).
  if (name.length <= Math.floor(cols / 2)) {
    pushCmd(0x1d, 0x21, 0x11);
    pushText(name);
    pushCmd(0x1d, 0x21, 0x00);
  } else {
    for (const line of wrapText(name, cols)) pushText(line);
  }
  pushCmd(0x1b, 0x45, 0x00); // bold off

  for (const line of wrapText(address, cols)) pushText(line);
  if (phone) pushText(`Ph: ${phone}`);

  pushCmd(0x1b, 0x61, 0x00); // left
  pushText(rule);
  pushText('Name: ____________________'.slice(0, cols));
  pushText(leftRight(`Date: ${formatBillDate(createdAt)}`, `Dine: ${tableNo}`, cols));
  pushText(leftRight(`Time: ${formatClock(createdAt)}`, `Bill: ${billNo}`, cols));
  pushText(rule);

  const amtW = 7;
  const priceW = 6;
  const qtyW = 3;
  const itemW = Math.max(8, cols - amtW - priceW - qtyW - 3);

  pushText(
    `${'Item'.padEnd(itemW)} ${'Qty'.padStart(qtyW)} ${'Price'.padStart(priceW)} ${'Amt'.padStart(amtW)}`,
  );
  pushText(rule);

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.priceSnapshot) || 0;
    const amount = Number(item.subtotal) || qty * price;
    const title = `${index + 1}. ${item.dishNameSnapshot || item.dishName || 'Item'}`;
    const wrapped = wrapText(title, itemW);
    const first = wrapped[0] || `${index + 1}.`;
    const qtyStr = String(qty).padStart(qtyW);
    const priceStr = formatBillAmount(price).replace(/,/g, '').padStart(priceW);
    const amtStr = formatBillAmount(amount).replace(/,/g, '').padStart(amtW);
    pushText(`${first.padEnd(itemW)} ${qtyStr} ${priceStr} ${amtStr}`);
    for (let i = 1; i < wrapped.length; i += 1) {
      pushText(wrapped[i].padEnd(itemW).slice(0, cols));
    }
  });

  if (!items.length) pushText('No items');

  pushText(rule);
  pushText(leftRight(`Total Qty: ${totalQty}`, `Sub ${formatBillAmount(subtotal).replace(/,/g, '')}`, cols));

  if (showTax) {
    pushText(
      leftRight(
        `${formatBillAmount(subtotal).replace(/,/g, '')}@CGST ${cgstRate}%`,
        formatBillAmount(cgstAmount).replace(/,/g, ''),
        cols,
      ),
    );
    pushText(
      leftRight(
        `${formatBillAmount(subtotal).replace(/,/g, '')}@SGST ${sgstRate}%`,
        formatBillAmount(sgstAmount).replace(/,/g, ''),
        cols,
      ),
    );
  }

  pushText(leftRight('Round off', roundLabel.replace(/,/g, ''), cols));
  pushCmd(0x1b, 0x45, 0x01);
  pushText(leftRight('TOTAL Rs', formatBillAmount(grand).replace(/,/g, ''), cols));
  pushCmd(0x1b, 0x45, 0x00);
  pushText(rule);

  pushCmd(0x1b, 0x61, 0x01); // center footer
  if (fssai) for (const line of wrapText(`FSSAI: ${fssai}`, cols)) pushText(line);
  if (gstin) for (const line of wrapText(`GSTIN: ${gstin}`, cols)) pushText(line);
  for (const line of wrapText(thanks, cols)) pushText(line);
  pushText('');
  pushText('');

  // Partial cut (ignored if unsupported)
  pushCmd(0x1d, 0x56, 0x01);

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
 * Compact pixel width aimed at 58mm thermal preview.
 */
export function buildThermalBillHtml({ restaurant, order }) {
  if (!order) return '';

  const name = restaurant?.name || 'Restaurant';
  const address = restaurant?.address || '';
  const phone = restaurant?.phone || '';
  const gstin = restaurant?.gstin || '';
  const fssai = restaurant?.fssaiLicense || '';
  const thanks = restaurant?.billThanksMessage || DEFAULT_THANKS;

  const tableNo =
    order.tableNumber != null
      ? String(order.tableNumber).padStart(2, '0')
      : order.tableLabel?.replace(/\D/g, '') || '—';
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
  const roundOff = Number(order.roundOffAmount) || 0;
  const grand = Number(order.total) || 0;
  const showTax = taxAmount > 0;
  const roundLabel =
    roundOff === 0 ? '0.00' : `${roundOff > 0 ? '+' : ''}${formatBillAmount(roundOff)}`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill #${escapeHtml(billNo)}</title>
  <style>
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 384px;
      max-width: 384px;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      line-height: 1.25;
      color: #000;
      background: #fff;
    }
    .receipt { width: 360px; margin: 0 auto; padding: 8px 6px 16px; }
    .center { text-align: center; }
    .title { font-size: 15px; font-weight: 700; text-transform: uppercase; }
    .muted { font-size: 11px; }
    .rule { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .meta { width: 100%; border-collapse: collapse; font-size: 11px; }
    .meta td { vertical-align: top; padding: 1px 0; }
    .meta .r { text-align: right; }
    table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.items th, table.items td { padding: 2px 0; vertical-align: top; font-size: 11px; }
    table.items th { font-size: 10px; border-bottom: 1px solid #000; text-align: left; }
    .c-no { width: 18px; }
    .c-item { width: auto; word-wrap: break-word; }
    .c-qty { width: 28px; text-align: center; }
    .c-price { width: 54px; text-align: right; }
    .c-amt { width: 58px; text-align: right; }
    .totals { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
    .totals td { padding: 1px 0; }
    .totals .l { text-align: left; }
    .totals .r { text-align: right; }
    .grand { font-size: 13px; font-weight: 700; padding-top: 4px !important; }
    .foot { margin-top: 8px; font-size: 11px; line-height: 1.35; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center title">${escapeHtml(name)}</div>
    ${address ? `<div class="center muted" style="margin-top:3px">${escapeHtml(address)}</div>` : ''}
    ${phone ? `<div class="center muted">Ph: ${escapeHtml(phone)}</div>` : ''}

    <hr class="rule" />
    <div class="muted">Name: ____________________</div>
    <table class="meta">
      <tr>
        <td>Date: ${escapeHtml(formatBillDate(createdAt))}</td>
        <td class="r">Dine In: ${escapeHtml(tableNo)}</td>
      </tr>
      <tr>
        <td>Time: ${escapeHtml(formatClock(createdAt))}</td>
        <td class="r">Bill No.: ${escapeHtml(billNo)}</td>
      </tr>
    </table>
    <hr class="rule" />

    <table class="items">
      <thead>
        <tr>
          <th class="c-no">No.</th>
          <th class="c-item">Item</th>
          <th class="c-qty">Qty</th>
          <th class="c-price">Price</th>
          <th class="c-amt">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No items</td></tr>'}
      </tbody>
    </table>

    <hr class="rule" />
    <div class="muted">Total Qty: ${totalQty}</div>

    <table class="totals">
      <tr>
        <td class="l">Sub Total</td>
        <td class="r">${escapeHtml(formatBillAmount(subtotal))}</td>
      </tr>
      ${
        showTax
          ? `
      <tr>
        <td class="l">${escapeHtml(formatBillAmount(subtotal))} @ CGST ${escapeHtml(String(cgstRate))}%</td>
        <td class="r">${escapeHtml(formatBillAmount(cgstAmount))}</td>
      </tr>
      <tr>
        <td class="l">${escapeHtml(formatBillAmount(subtotal))} @ SGST ${escapeHtml(String(sgstRate))}%</td>
        <td class="r">${escapeHtml(formatBillAmount(sgstAmount))}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="l">Round off</td>
        <td class="r">${escapeHtml(roundLabel)}</td>
      </tr>
      <tr>
        <td class="l grand">Grand Total Rs</td>
        <td class="r grand">${escapeHtml(formatBillAmount(grand))}</td>
      </tr>
    </table>

    <div class="foot center">
      ${fssai ? `<div>FSSAI Lic No.: ${escapeHtml(fssai)}</div>` : ''}
      ${gstin ? `<div>GST NO: ${escapeHtml(gstin)}</div>` : ''}
      <div style="margin-top:6px">${escapeHtml(thanks)}</div>
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
