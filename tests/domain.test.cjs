'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/seed.js');
require('../js/domain.js');
require('../js/storage.js');
const { Seed, Domain: D, Storage } = globalThis.O2C;
let serial = 0;
const command = (type, data = {}) => ({ type, ...data, requestId: `test-${++serial}` });
function lab(mode = 'practice') {
  let state = Seed.createDataset(mode);
  return {
    get state() { return state; },
    run(type, data) {
      const original = JSON.stringify(state);
      const next = D.execute(state, command(type, data), '2026-10-28T08:00:00.000Z');
      assert.equal(JSON.stringify(state), original, 'successful transaction must not mutate its input');
      D.validate(next, mode);
      state = next;
      return next;
    },
    rejects(type, data, pattern) {
      const original = JSON.stringify(state);
      assert.throws(() => D.execute(state, command(type, data)), pattern || D.BusinessError);
      assert.equal(JSON.stringify(state), original, 'failure must preserve ALL input state');
    },
    order(quantity, customerId = 'KH01', productId = 'SP01') {
      this.run('createOrder', { customerId, productId, quantity });
      return { header: state.headers.at(-1), line: state.lines.at(-1) };
    },
    confirm(order) { this.run('confirmOrder', { orderId: order.header.id }); },
    qty(type, order, quantity, extra = {}) { this.run(type, { orderLineId: order.line.id, quantity, ...extra }); },
    invoice(order, quantity, slip = state.packingSlips.at(-1)) { this.qty('invoice', order, quantity, { packingSlipId: slip.id }); return state.invoices.at(-1); },
    delivered(quantity, ordered = quantity, customer = 'KH01') {
      const order = this.order(ordered, customer); this.confirm(order);
      for (const type of ['reserve', 'pick', 'postPackingSlip']) this.qty(type, order, quantity);
      return { ...order, invoice: this.invoice(order, quantity) };
    },
    payment(amount, customerId = 'KH01') { this.run('recordPayment', { customerId, amount }); return state.payments.at(-1); },
    settle(payment, invoice, amount, customerId = 'KH01') { this.run('settle', { customerId, paymentId: payment.id, invoiceId: invoice.id, amount }); }
  };
}
test('Case chính: 8 sự kiện, payment dùng hết, invoice mở 2 triệu, chờ giao 4', () => {
  const x = lab(); const o = x.delivered(6, 10);
  const payment = x.payment(4000000);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 6000000, U: 4000000, N: 2000000 });
  assert.equal(x.state.events.length, 7);
  const previousN = D.balances(x.state, 'KH01').N;
  x.settle(payment, o.invoice, 4000000);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 2000000, U: 0, N: 2000000 });
  assert.equal(D.balances(x.state, 'KH01').N, previousN);
  assert.equal(D.paymentBalance(x.state, payment.id), 0);
  assert.equal(D.invoiceBalance(x.state, o.invoice.id), 2000000);
  const m = D.lineMetrics(x.state, o.line.id);
  assert.equal(m.backorder, 4); assert.equal(m.complete, false);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 0, reserved: 0, available: 0, pickedOpen: 0 });
  assert.equal(x.state.events.length, 8); assert.equal(x.state.revision, 8);
  assert.equal('shipments' in x.state, false);
});
test('Bắt buộc: giữ 6, lấy 4, giao 3 → tồn 3, giữ 3, khả dụng 0, lấy chưa giao 1', () => {
  const x = lab(); const o = x.order(10); x.confirm(o);
  x.qty('reserve', o, 6); x.qty('pick', o, 4); x.qty('postPackingSlip', o, 3);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 3, reserved: 3, available: 0, pickedOpen: 1 });
  assert.equal(D.lineMetrics(x.state, o.line.id).pickRemaining, 2);
  // Pick remaining 2 after partial shipment; do not repick already consumed reservations.
  x.qty('pick', o, 2); x.qty('postPackingSlip', o, 3);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 0, reserved: 0, available: 0, pickedOpen: 0 });
});
test('TH02: hai đơn tranh cùng tồn', () => {
  const x = lab(); const a = x.order(4); const b = x.order(3); x.confirm(a); x.confirm(b);
  x.qty('reserve', a, 4);
  x.rejects('reserve', { orderLineId: b.line.id, quantity: 3 }, /khả dụng/);
  x.qty('reserve', b, 2);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 6, reserved: 6, available: 0, pickedOpen: 0 });
});
test('TH04: không lấy hoặc giao bằng nguồn của đơn khác, kể cả cùng khách', () => {
  const x = lab(); const a = x.order(3); const b = x.order(3); x.confirm(a); x.confirm(b);
  x.qty('reserve', a, 3); x.qty('pick', a, 3);
  x.rejects('pick', { orderLineId: b.line.id, quantity: 1 });
  x.rejects('postPackingSlip', { orderLineId: b.line.id, quantity: 1 });
  x.rejects('pick', { orderLineId: b.line.id, quantity: 1, reservationId: x.state.reservations[0].id }, /kỹ thuật/);
  x.rejects('postPackingSlip', { orderLineId: b.line.id, quantity: 1, pickingId: x.state.pickings[0].id }, /kỹ thuật/);
  x.qty('reserve', b, 1); x.qty('pick', b, 1); x.qty('postPackingSlip', b, 1);
  assert.equal(x.state.packingSlips[0].allocations[0].pickingId, x.state.pickings[1].id);
  assert.equal(x.state.packingSlips[0].allocations[0].reservationId, x.state.reservations[1].id);
});
test('TH05: giao từng phần và chặn vượt phần đã lấy', () => {
  const x = lab(); const o = x.order(6); x.confirm(o);
  x.qty('reserve', o, 6); x.qty('pick', o, 6); x.qty('postPackingSlip', o, 2);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 4, reserved: 4, available: 0, pickedOpen: 4 });
  x.rejects('postPackingSlip', { orderLineId: o.line.id, quantity: 5 });
  x.qty('postPackingSlip', o, 4);
  assert.equal(D.lineMetrics(x.state, o.line.id).backorder, 0);
});
test('TH06: nhiều phiếu giữ, FIFO từng cặp, không đếm Picking hai lần', () => {
  const x = lab(); const o = x.order(6); x.confirm(o); x.qty('reserve', o, 2); x.qty('reserve', o, 4); x.qty('pick', o, 3);
  assert.deepEqual(x.state.pickings[0].reservationAllocations.map(a => a.quantity), [2, 1]);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 6, reserved: 6, available: 0, pickedOpen: 3 });
  x.qty('postPackingSlip', o, 3);
  assert.deepEqual(x.state.packingSlips[0].allocations.map(a => a.quantity), [2, 1]);
  assert.deepEqual(D.inventory(x.state, 'SP01'), { actual: 3, reserved: 3, available: 0, pickedOpen: 0 });
});
test('TH07: invoice theo đúng phiếu, không mượn lượng phiếu khác', () => {
  const x = lab(); const o = x.order(6); x.confirm(o); x.qty('reserve', o, 6); x.qty('pick', o, 4); x.qty('postPackingSlip', o, 4);
  const slip = x.state.packingSlips[0];
  x.rejects('invoice', { orderLineId: o.line.id, packingSlipId: slip.id, quantity: 5 });
  x.invoice(o, 2, slip); x.invoice(o, 2, slip);
  x.qty('pick', o, 2); x.qty('postPackingSlip', o, 2);
  x.rejects('invoice', { orderLineId: o.line.id, packingSlipId: slip.id, quantity: 1 });
  const other = x.order(1); x.confirm(other);
  x.rejects('invoice', { orderLineId: other.line.id, packingSlipId: x.state.packingSlips[1].id, quantity: 1 }, /đơn khác/);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 4000000, U: 0, N: 4000000 });
});
test('TH08: payment trước invoice và N âm hợp lệ', () => {
  const x = lab(); const p = x.payment(3000000);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 0, U: 3000000, N: -3000000 });
  x.rejects('settle', { customerId: 'KH01', paymentId: p.id, invoiceId: '', amount: 1 });
  const o = x.delivered(2); x.settle(p, o.invoice, 2000000);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 0, U: 1000000, N: -1000000 });
  assert.equal(D.lineMetrics(x.state, o.line.id).complete, true);
});
test('TH09: chặn sai khách và cả khách đang chọn sai', () => {
  const x = lab(); const o = x.delivered(2); const p = x.payment(2000000, 'KH02');
  x.rejects('settle', { customerId: 'KH01', paymentId: p.id, invoiceId: o.invoice.id, amount: 2000000 }, /khách/);
  const p2 = x.payment(2000000);
  x.rejects('settle', { customerId: 'KH02', paymentId: p2.id, invoiceId: o.invoice.id, amount: 2000000 }, /khách/);
});
test('TH12: nhiều-nhiều, payment cùng khách dùng cho hai đơn được phép', () => {
  const x = lab(); const a = x.delivered(2); const b = x.delivered(3);
  const p = x.payment(4000000); x.settle(p, a.invoice, 2000000); x.settle(p, b.invoice, 2000000);
  x.settle(x.payment(1000000), b.invoice, 1000000);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 0, U: 0, N: 0 });
  assert.equal(D.lineMetrics(x.state, a.line.id).complete, true);
  assert.equal(D.lineMetrics(x.state, b.line.id).complete, true);
});
test('TH18: N=0 chưa chứng minh invoice đã đóng; đơn nhỏ hoàn tất sau settlement', () => {
  const x = lab(); const o = x.delivered(2); const p = x.payment(2000000);
  assert.deepEqual(D.balances(x.state, 'KH01'), { O: 2000000, U: 2000000, N: 0 });
  assert.equal(D.lineMetrics(x.state, o.line.id).complete, false);
  x.settle(p, o.invoice, 2000000);
  assert.equal(D.lineMetrics(x.state, o.line.id).complete, true);
});
test('Không settlement vượt số dư payment hoặc invoice; không giữ vượt lượng đơn', () => {
  const x = lab(); const o = x.delivered(2); const p = x.payment(1000000);
  x.rejects('settle', { customerId: 'KH01', paymentId: p.id, invoiceId: o.invoice.id, amount: 1500000 });
  const p2 = x.payment(3000000);
  x.rejects('settle', { customerId: 'KH01', paymentId: p2.id, invoiceId: o.invoice.id, amount: 2500000 });
  const b = x.order(1); x.confirm(b);
  x.rejects('reserve', { orderLineId: b.line.id, quantity: 2 }, /còn cần giữ/);
});
test('Sai thứ tự, đầu vào, phép nhân và tổng tiền vượt an toàn giữ nguyên dữ liệu', () => {
  const x = lab(); const o = x.order(3);
  x.rejects('reserve', { orderLineId: o.line.id, quantity: 1 }); x.confirm(o);
  x.rejects('confirmOrder', { orderId: o.header.id });
  for (const quantity of [0, -1, 1.1, '', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    x.rejects('reserve', { orderLineId: o.line.id, quantity });
  }
  x.rejects('createOrder', { customerId: 'KH01', productId: 'SP01', quantity: Number.MAX_SAFE_INTEGER });
  x.payment(Number.MAX_SAFE_INTEGER);
  x.rejects('recordPayment', { customerId: 'KH01', amount: 1 });
});
test('Idempotency: một xác nhận lặp không sinh chứng từ, nội dung khác cùng mã bị chặn', () => {
  const state = Seed.createDataset('practice');
  const cmd = command('createOrder', { customerId: 'KH01', productId: 'SP01', quantity: 1 });
  const after = D.execute(state, cmd);
  assert.strictEqual(D.execute(after, cmd), after);
  assert.equal(after.headers.length, 1); assert.equal(after.lines.length, 1); assert.equal(after.events.length, 1);
  assert.throws(() => D.execute(after, { ...cmd, quantity: 2 }), D.BusinessError);
});
test('Guided/practice độc lập, cùng nghiệp vụ; không tham chiếu ID xuyên dataset', () => {
  const x = lab('guided'); const y = lab(); const a = x.order(2); x.confirm(a); x.qty('reserve', a, 2);
  assert.deepEqual(D.inventory(y.state, 'SP01'), { actual: 6, reserved: 0, available: 6, pickedOpen: 0 });
  y.rejects('pick', { orderLineId: a.line.id, quantity: 1 });
  assert.equal(y.state.events.length, 0);
});
function memoryStorage() {
  const map = new Map();
  return { getItem: key => map.has(key) ? map.get(key) : null, setItem: (key, value) => map.set(key, value), map };
}
test('localStorage: tải lại, retry/reset không sinh Event, reset không chạm guided', () => {
  const memory = memoryStorage(); const store = Storage.createStore(() => memory);
  const x = lab(); x.delivered(6, 10); x.payment(4000000);
  const guided = JSON.stringify(Seed.createDataset('guided'));
  memory.setItem('o2c-lab.guided.v1', guided);
  assert.equal(store.save(x.state).saved, true);
  assert.deepEqual(store.open('practice').state, x.state);
  const counts = x.state.events.length; store.save(x.state); assert.equal(x.state.events.length, counts);
  const result = store.reset('practice');
  assert.equal(result.state.events.length, 0); assert.equal(result.status.saved, true);
  assert.equal(memory.getItem('o2c-lab.guided.v1'), guided);
});
test('localStorage: lỗi quota giữ bộ nhớ, báo đúng chức năng; retry không chạy lại nghiệp vụ', () => {
  const memory = memoryStorage(); let blocked = true;
  const store = Storage.createStore(() => ({ getItem: memory.getItem, setItem: (k, v) => { if (blocked) throw new Error('quota'); memory.setItem(k, v); } }));
  const opened = store.open('practice'); assert.equal(opened.status.saved, false);
  const x = lab(); x.order(1);
  const before = JSON.stringify(x.state); const result = store.save(x.state);
  assert.equal(result.saved, false); assert.match(result.message, /chưa có xuất/i);
  assert.equal(JSON.stringify(x.state), before);
  blocked = false; assert.equal(store.save(x.state).saved, true);
  assert.equal(JSON.stringify(store.open('practice').state), before);
});
test('localStorage: chặn quyền getter, dữ liệu hỏng/schema sai/tamper không bị ghi đè', () => {
  const denied = Storage.createStore(() => { throw new Error('denied'); });
  assert.equal(denied.open('practice').status.saved, false);
  assert.equal(denied.reset('practice').status.saved, false);
  const x = lab(); x.delivered(1); const tampered = JSON.parse(JSON.stringify(x.state)); tampered.reservations[0].quantity = 2;
  for (const raw of ['{bad', JSON.stringify({ schemaVersion: 99 }), JSON.stringify(tampered)]) {
    const memory = memoryStorage(); memory.setItem('o2c-lab.practice.v1', raw);
    const store = Storage.createStore(() => memory); const result = store.open('practice');
    assert.equal(result.status.saved, false); assert.equal(result.state.events.length, 0);
    assert.equal(store.save(result.state).saved, false); assert.equal(memory.getItem('o2c-lab.practice.v1'), raw);
    assert.equal(store.reset('practice').status.saved, true);
  }
});
