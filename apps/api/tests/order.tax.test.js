import assert from 'node:assert/strict';
import test from 'node:test';
import { computeExclusiveGst } from '../src/modules/order/orderTax.js';

test('GST is calculated only from tax-applicable order lines', () => {
  const tax = computeExclusiveGst(
    300,
    { gstEnabled: true, cgstRate: 2.5, sgstRate: 2.5 },
    200,
  );

  assert.equal(tax.cgstAmount, 5);
  assert.equal(tax.sgstAmount, 5);
  assert.equal(tax.taxAmount, 10);
  assert.equal(tax.total, 310);
});

test('a fully tax-exempt order has no GST but retains its full subtotal', () => {
  const tax = computeExclusiveGst(
    300,
    { gstEnabled: true, cgstRate: 2.5, sgstRate: 2.5 },
    0,
  );

  assert.equal(tax.taxAmount, 0);
  assert.equal(tax.total, 300);
  assert.equal(tax.gstEnabled, false);
});
