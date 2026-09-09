/** Shared helpers + PetPooja-style 80mm thermal bill HTML (same layout for every restaurant). */

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

/**
 * Fixed thermal receipt template (≈80mm). Only restaurant + order data changes.
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
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 80mm;
      max-width: 80mm;
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt { width: 72mm; margin: 0 auto; padding: 3mm 2mm 6mm; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .title { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
    .muted { font-size: 10px; line-height: 1.35; }
    .rule { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .rule-solid { border: none; border-top: 1px solid #000; margin: 6px 0; }
    .meta { width: 100%; border-collapse: collapse; font-size: 10px; }
    .meta td { vertical-align: top; padding: 1px 0; }
    .meta .r { text-align: right; }
    table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.items th, table.items td { padding: 2px 0; vertical-align: top; font-size: 10px; }
    table.items th { font-size: 9px; border-bottom: 1px solid #000; text-align: left; }
    .c-no { width: 5mm; }
    .c-item { width: auto; word-wrap: break-word; }
    .c-qty { width: 8mm; text-align: center; }
    .c-price { width: 14mm; text-align: right; }
    .c-amt { width: 16mm; text-align: right; }
    .totals { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    .totals td { padding: 1px 0; }
    .totals .l { text-align: left; }
    .totals .r { text-align: right; }
    .grand {
      font-size: 13px;
      font-weight: 700;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 5px 0 !important;
      margin-top: 4px;
    }
    .foot { margin-top: 8px; font-size: 10px; line-height: 1.4; }
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
        <td class="l grand">Grand Total ₹</td>
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

/** @deprecated use printBillWithQz / buildThermalBillHtml */
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
