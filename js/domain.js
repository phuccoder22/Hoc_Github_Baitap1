(function (root) {
  'use strict';
  const app = root.O2C;
  class BusinessError extends Error {
    constructor(message) { super(message); this.name = 'BusinessError'; }
  }
  const fail = message => { throw new BusinessError(message); };
  const copy = value => JSON.parse(JSON.stringify(value));
  function integer(value, label) {
    if (!Number.isSafeInteger(value) || value <= 0) fail(`${label} phải là số nguyên dương trong giới hạn an toàn. Hãy nhập lại, không dùng số lẻ hoặc để trống.`);
    return value;
  }
  function safe(value) {
    if (!Number.isSafeInteger(value)) fail('Tổng số lượng hoặc số tiền vượt giới hạn tính toán an toàn. Hãy dùng giá trị nhỏ hơn.');
    return value;
  }
  const sum = (items, get = x => x.quantity) => items.reduce((total, item) => safe(total + get(item)), 0);
  const find = (items, id, name) => items.find(x => x.id === id) || fail(`Không tìm thấy ${name} trong bộ dữ liệu hiện tại. Hãy chọn lại đúng chứng từ.`);
  const line = (state, id) => find(state.lines, id, 'dòng đơn');
  const header = (state, id) => find(state.headers, id, 'đơn hàng');
  const orderLine = (state, id) => state.lines.find(x => x.orderId === id) || fail('Đơn chưa có dòng hàng hợp lệ. Hãy chọn lại đơn.');
  const invoiceLine = (state, invoice) => line(state, find(state.packingSlips, invoice.packingSlipId, 'phiếu giao').orderLineId);
  const customerOfInvoice = (state, invoice) => header(state, invoiceLine(state, invoice).orderId).customerId;
  const allocations = state => state.packingSlips.flatMap(x => x.allocations);
  const reservedShipped = (state, id) => sum(allocations(state).filter(x => x.reservationId === id));
  const reservedPicked = (state, id) => sum(state.pickings.flatMap(x => x.reservationAllocations).filter(x => x.reservationId === id));
  const pairShipped = (state, pickingId, reservationId) => sum(allocations(state).filter(x => x.pickingId === pickingId && x.reservationId === reservationId));
  const invoiceBalance = (state, id) => find(state.invoices, id, 'hóa đơn').amount - sum(state.settlements.filter(x => x.invoiceId === id), x => x.amount);
  const paymentBalance = (state, id) => find(state.payments, id, 'khoản thanh toán').amount - sum(state.settlements.filter(x => x.paymentId === id), x => x.amount);
  const invoiceRemaining = (state, id) => find(state.packingSlips, id, 'phiếu giao').quantity - sum(state.invoices.filter(x => x.packingSlipId === id));
  function lineMetrics(state, id) {
    const item = line(state, id);
    const slips = state.packingSlips.filter(x => x.orderLineId === id);
    const invoices = state.invoices.filter(x => slips.some(s => s.id === x.packingSlipId));
    const reserved = sum(state.reservations.filter(x => x.orderLineId === id), x => x.quantity - reservedShipped(state, x.id));
    const picked = sum(state.pickings.filter(x => x.orderLineId === id));
    const shipped = sum(slips);
    const pickedOpen = picked - shipped;
    const invoiced = sum(invoices);
    const openInvoices = sum(invoices, x => invoiceBalance(state, x.id));
    const invoiceTotal = sum(invoices, x => x.amount);
    return {
      ordered: item.orderedQty, reserved, picked, pickedOpen, shipped, invoiced,
      backorder: item.orderedQty - shipped, reserveRemaining: item.orderedQty - shipped - reserved,
      pickRemaining: reserved - pickedOpen, readyToInvoice: shipped - invoiced,
      openInvoices, invoiceTotal,
      confirmed: state.confirmations.some(x => x.orderId === item.orderId),
      complete: shipped === item.orderedQty && invoiced === item.orderedQty && openInvoices === 0
    };
  }
  function inventory(state, productId) {
    find(state.products, productId, 'sản phẩm');
    const metrics = state.lines.filter(x => x.productId === productId).map(x => lineMetrics(state, x.id));
    const actual = find(state.products, productId, 'sản phẩm').initialStock - sum(metrics, x => x.shipped);
    const reserved = sum(metrics, x => x.reserved);
    return { actual, reserved, available: actual - reserved, pickedOpen: sum(metrics, x => x.pickedOpen) };
  }
  function balances(state, customerId) {
    find(state.customers, customerId, 'khách hàng');
    const invoices = state.invoices.filter(x => customerOfInvoice(state, x) === customerId);
    const payments = state.payments.filter(x => x.customerId === customerId);
    const O = sum(invoices, x => invoiceBalance(state, x.id));
    const U = sum(payments, x => paymentBalance(state, x.id));
    return { O, U, N: safe(O - U) };
  }
  function snapshot(state) {
    return {
      inventory: state.products.map(x => ({ productId: x.id, ...inventory(state, x.id) })),
      balances: state.customers.map(x => ({ customerId: x.id, ...balances(state, x.id) }))
    };
  }
  function invariant(state) {
    state.products.forEach(p => {
      const x = inventory(state, p.id);
      if (!(x.actual >= x.reserved && x.reserved >= x.pickedOpen && x.pickedOpen >= 0 && x.available >= 0)) fail('Dữ liệu tồn không hợp lệ. Không thể ghi thêm chứng từ.');
    });
    state.lines.forEach(l => {
      const x = lineMetrics(state, l.id);
      if (x.reserveRemaining < 0 || x.backorder < 0 || x.picked > x.ordered || x.readyToInvoice < 0) fail('Dữ liệu lượng trên đơn không hợp lệ. Không thể ghi chứng từ.');
    });
    state.invoices.forEach(x => { if (invoiceBalance(state, x.id) < 0) fail('Số dư hóa đơn không được âm.'); });
    state.payments.forEach(x => { if (paymentBalance(state, x.id) < 0) fail('Số dư khoản thanh toán không được âm.'); });
    state.customers.forEach(x => balances(state, x.id));
  }
  const fields = {
    createOrder: ['customerId', 'productId', 'quantity'], confirmOrder: ['orderId'],
    reserve: ['orderLineId', 'quantity'], pick: ['orderLineId', 'quantity'],
    postPackingSlip: ['orderLineId', 'quantity'], invoice: ['orderLineId', 'packingSlipId', 'quantity'],
    recordPayment: ['customerId', 'amount'], settle: ['customerId', 'paymentId', 'invoiceId', 'amount']
  };
  const labels = {
    createOrder: 'Tạo đơn', confirmOrder: 'Confirm đơn bán', reserve: 'Giữ hàng', pick: 'Picking — lấy hàng',
    postPackingSlip: 'Giao hàng — Packing slip', invoice: 'Lập hóa đơn', recordPayment: 'Ghi nhận thanh toán', settle: 'Settlement — cấn trừ'
  };
  const roles = { createOrder: 'Bán hàng', confirmOrder: 'Bán hàng', reserve: 'Kho', pick: 'Kho', postPackingSlip: 'Kho', invoice: 'Kế toán', recordPayment: 'Kế toán', settle: 'Kế toán' };
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  // Pure transaction: the input state is never mutated, including on failure.
  function execute(state, command, createdAt = new Date().toISOString()) {
    if (!command || !Object.hasOwn(fields, command.type)) fail('Thao tác không hợp lệ. Hãy chọn lại thao tác trong ứng dụng.');
    if (typeof command.requestId !== 'string' || !command.requestId || command.requestId.length > 200) fail('Thiếu mã xác nhận thao tác. Hãy mở lại phần xem trước.');
    const allowed = ['type', 'requestId', ...fields[command.type]];
    if (Object.keys(command).some(k => !allowed.includes(k))) fail('Không nhận ID nguồn giữ/lấy hoặc trường kỹ thuật chỉ định thủ công. Hãy chọn đúng đơn; ứng dụng tự phân bổ nguồn của đơn đó.');
    const previous = state.events.find(x => x.command.requestId === command.requestId);
    if (previous) {
      if (canonical(previous.command) !== canonical(command)) fail('Mã xác nhận đã dùng cho nội dung khác. Hãy mở lại xem trước.');
      return state;
    }
    const next = copy(state);
    const before = snapshot(state);
    const sequence = safe(state.revision + 1);
    function record(collection, prefix, values) {
      const count = next.counters[prefix] = safe((next.counters[prefix] || 0) + 1);
      const code = `${prefix}-${String(count).padStart(4, '0')}`;
      const doc = { id: `${state.mode}:${code}`, code, sequence, createdAt, ...values };
      next[collection].push(doc);
      return doc;
    }
    let documents = [];
    const c = command;
    if (c.type === 'createOrder') {
      find(state.customers, c.customerId, 'khách hàng');
      const product = find(state.products, c.productId, 'sản phẩm');
      integer(c.quantity, 'Số lượng đặt'); safe(c.quantity * product.unitPrice);
      const order = record('headers', 'SO', { customerId: c.customerId, currency: 'VND', warehouseId: 'WH01' });
      const item = record('lines', 'L', { orderId: order.id, lineNo: 1, productId: product.id, orderedQty: c.quantity, unitPriceSnapshot: product.unitPrice });
      documents = [order.id, item.id];
    } else if (c.type === 'confirmOrder') {
      const order = header(state, c.orderId);
      if (state.confirmations.some(x => x.orderId === c.orderId)) fail('Đơn đã được Confirm. Hãy tiếp tục giữ hoặc xử lý hàng; không cần xác nhận lần nữa.');
      const item = orderLine(state, order.id);
      documents = [record('confirmations', 'CF', { orderId: order.id, headerSnapshot: copy(order), lineSnapshot: copy(item) }).id];
    } else if (['reserve', 'pick', 'postPackingSlip', 'invoice'].includes(c.type)) {
      const item = line(state, c.orderLineId);
      const m = lineMetrics(state, item.id);
      if (!m.confirmed) fail('Đơn chưa được Confirm. Hãy xác nhận nội dung đơn trước khi xử lý hàng.');
      const qty = integer(c.quantity, 'Số lượng');
      if (c.type === 'reserve') {
        const available = inventory(state, item.productId).available;
        if (qty > available) fail(`Chỉ còn ${available} sản phẩm vật lý khả dụng, bạn muốn giữ ${qty}. Hãy giữ tối đa ${Math.min(available, m.reserveRemaining)}; phần còn lại vẫn chờ giao. Đây là giới hạn simulator, không phải mọi ERP.`);
        if (qty > m.reserveRemaining) fail(`Dòng đơn chỉ còn cần giữ ${m.reserveRemaining}, bạn muốn giữ ${qty}. Hãy giảm lượng giữ cho đúng nhu cầu còn lại.`);
        documents = [record('reservations', 'R', { orderLineId: item.id, quantity: qty }).id];
      } else if (c.type === 'pick') {
        if (qty > m.pickRemaining) fail(`Đơn này chỉ còn ${m.pickRemaining} đã giữ nhưng chưa lấy, bạn muốn lấy ${qty}. Hãy giữ thêm cho chính đơn này hoặc giảm lượng lấy.`);
        let remaining = qty;
        const source = [];
        for (const r of state.reservations.filter(x => x.orderLineId === item.id)) {
          const take = Math.min(remaining, r.quantity - reservedPicked(state, r.id));
          if (take > 0) { source.push({ reservationId: r.id, quantity: take }); remaining -= take; }
        }
        if (remaining) fail('Không đủ nguồn giữ của đúng đơn. Hãy kiểm tra lại lượng giữ.');
        documents = [record('pickings', 'PK', { orderLineId: item.id, quantity: qty, reservationAllocations: source }).id];
      } else if (c.type === 'postPackingSlip') {
        if (qty > m.pickedOpen) fail(`Đơn này chỉ có ${m.pickedOpen} đã lấy chưa giao, bạn muốn giao ${qty}. Hãy Picking thêm cho chính đơn này hoặc giảm lượng giao.`);
        let remaining = qty;
        const source = [];
        for (const p of state.pickings.filter(x => x.orderLineId === item.id)) {
          for (const r of p.reservationAllocations) {
            const take = Math.min(remaining, r.quantity - pairShipped(state, p.id, r.reservationId));
            if (take > 0) { source.push({ pickingId: p.id, reservationId: r.reservationId, quantity: take }); remaining -= take; }
          }
        }
        if (remaining) fail('Không đủ nguồn lấy của đúng đơn. Hãy kiểm tra Picking.');
        documents = [record('packingSlips', 'PS', { orderLineId: item.id, quantity: qty, allocations: source }).id];
      } else {
        const slip = find(state.packingSlips, c.packingSlipId, 'phiếu giao');
        if (slip.orderLineId !== item.id) fail('Phiếu giao thuộc đơn khác. Hãy chọn phiếu giao của đúng đơn đang lập hóa đơn.');
        const remaining = invoiceRemaining(state, slip.id);
        if (qty > remaining) fail(`Phiếu giao chỉ còn ${remaining} chưa lập hóa đơn, bạn nhập ${qty}. Hãy giảm số lượng hoặc chọn phiếu giao khác của đúng đơn.`);
        documents = [record('invoices', 'I', { packingSlipId: slip.id, quantity: qty, unitPriceSnapshot: item.unitPriceSnapshot, amount: safe(qty * item.unitPriceSnapshot) }).id];
      }
    } else if (c.type === 'recordPayment') {
      find(state.customers, c.customerId, 'khách hàng'); integer(c.amount, 'Số tiền thanh toán');
      documents = [record('payments', 'PAY', { customerId: c.customerId, amount: c.amount }).id];
    } else {
      find(state.customers, c.customerId, 'khách hàng'); integer(c.amount, 'Số tiền cấn trừ');
      const payment = find(state.payments, c.paymentId, 'khoản thanh toán');
      const invoice = find(state.invoices, c.invoiceId, 'hóa đơn');
      if (payment.customerId !== c.customerId || customerOfInvoice(state, invoice) !== c.customerId) fail('Payment và invoice không cùng khách hàng đang chọn. Hãy chọn hai chứng từ của cùng khách; không chuyển tiền giữa khách.');
      const max = Math.min(paymentBalance(state, payment.id), invoiceBalance(state, invoice.id));
      if (c.amount > max) fail(`Chỉ được cấn trừ tối đa ${max.toLocaleString('vi-VN')} VND theo số dư hai chứng từ. Hãy giảm tiền cấn trừ hoặc ghi nhận khoản thanh toán bổ sung.`);
      documents = [record('settlements', 'ST', { paymentId: payment.id, invoiceId: invoice.id, amount: c.amount }).id];
    }
    invariant(next);
    next.revision = sequence;
    record('events', 'EV', { action: c.type, role: roles[c.type], command: copy(c), documentIds: documents, before, after: snapshot(next) });
    return next;
  }
  // Validate persisted data by replaying its business commands, not trusting cached totals.
  function validate(state, mode) {
    if (!state || state.schemaVersion !== 1 || state.mode !== mode || !Array.isArray(state.events)) fail('Dữ liệu lưu không đúng chế độ hoặc phiên bản được hỗ trợ.');
    let replay = app.Seed.createDataset(mode);
    for (const event of state.events) {
      if (!event || typeof event.createdAt !== 'string' || !Number.isFinite(Date.parse(event.createdAt))) fail('Sự kiện lưu không hợp lệ.');
      replay = execute(replay, event.command, event.createdAt);
    }
    if (canonical(replay) !== canonical(state)) fail('Chứng từ hoặc số liệu lưu không khớp lịch sử nghiệp vụ. Dữ liệu cũ được giữ nguyên; hãy đặt lại nếu muốn bắt đầu mới.');
    return state;
  }
  app.Domain = { BusinessError, execute, validate, inventory, balances, lineMetrics, orderLine, invoiceBalance, paymentBalance, invoiceRemaining, customerOfInvoice, snapshot, labels };
})(globalThis);
