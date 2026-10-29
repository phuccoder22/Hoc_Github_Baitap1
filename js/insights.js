(function (root) {
  'use strict';
  const { Domain: D } = root.O2C;
  const collections = ['headers', 'lines', 'confirmations', 'reservations', 'pickings', 'packingSlips', 'invoices', 'payments', 'settlements', 'events'];
  const explanations = {
    createOrder: 'Đơn chỉ ghi nhận nhu cầu. Chưa giữ hàng, giao hàng hay phát sinh số dư hóa đơn.',
    confirmOrder: 'Confirm xác nhận nội dung đơn. Tồn kho và ba số dư không đổi; chưa giao hàng.',
    reserve: 'Giữ hàng cho đúng đơn: lượng giữ tăng, khả dụng giảm; tồn thực tế chưa giảm. Lab chỉ giữ vật lý hiện có, không phải quy luật của mọi ERP.',
    pick: 'Picking lấy từ lượng đã giữ của chính đơn. Hàng vẫn thuộc tồn và lượng giữ; chỉ tăng đã lấy chưa giao.',
    postPackingSlip: 'Packing slip ghi nhận giao hàng một lần: tồn, lượng giữ và đã lấy chưa giao cùng giảm. Khả dụng không đổi.',
    invoice: 'Invoice cho phần đã giao làm tăng số dư hóa đơn O và số dư ròng N; không trừ tồn thêm lần nữa.',
    recordPayment: 'Ghi nhận tiền của khách: U tăng, N giảm. Số dư mở invoice O chưa giảm vì chưa chỉ định tiền trả hóa đơn nào.',
    settle: 'Dùng tiền đã nhận để thanh toán hóa đơn; không nhận thêm tiền. O và U giảm cùng số tiền; N không đổi.'
  };
  // Read-only historical projection. No execute(), storage writes or new events on review.
  function at(state, sequence) {
    const view = { ...state };
    for (const key of collections) view[key] = state[key].filter(doc => doc.sequence <= sequence);
    return view;
  }
  function describe(before, after, command, documentIds) {
    const created = documentIds.map(id => collections.flatMap(key => after[key]).find(x => x.id === id)).filter(Boolean);
    const c = command;
    let item;
    if (c.type === 'createOrder') item = after.lines.find(x => x.id === documentIds[1]);
    else if (c.orderId) item = D.orderLine(after, c.orderId);
    else if (c.orderLineId) item = after.lines.find(x => x.id === c.orderLineId);
    else if (c.invoiceId) {
      const invoice = after.invoices.find(x => x.id === c.invoiceId);
      const slip = after.packingSlips.find(x => x.id === invoice.packingSlipId);
      item = after.lines.find(x => x.id === slip.orderLineId);
    }
    const customerId = c.customerId || after.headers.find(x => x.id === item.orderId).customerId;
    const rows = [];
    function row(label, a, b, kind = 'quantity') { rows.push({ label, before: a, after: b, kind }); }
    if (item) {
      const old = before.lines.some(x => x.id === item.id) ? D.lineMetrics(before, item.id) : { ordered: 0, confirmed: false, reserved: 0, pickedOpen: 0, shipped: 0, backorder: 0, invoiced: 0, readyToInvoice: 0, openInvoices: 0 };
      const next = D.lineMetrics(after, item.id);
      const orderFields = {
        createOrder: [['ordered', 'Lượng đặt']], confirmOrder: [['confirmed', 'Đơn đã Confirm', 'boolean']],
        reserve: [['reserved', 'Giữ còn lại của đơn']], pick: [['pickedOpen', 'Đã lấy chưa giao của đơn']],
        postPackingSlip: [['shipped', 'Đã giao của đơn'], ['backorder', 'Còn chờ giao']],
        invoice: [['invoiced', 'Đã lập hóa đơn của đơn'], ['readyToInvoice', 'Đã giao chưa lập hóa đơn']],
        settle: [['openInvoices', 'Số dư mở hóa đơn của đơn', 'money']]
      };
      for (const [key, title, kind] of orderFields[c.type] || []) row(title, old[key], next[key], kind);
      if (c.type !== 'settle') {
        const a = D.inventory(before, item.productId), b = D.inventory(after, item.productId);
        for (const [key, title] of [['actual', 'Tồn thực tế'], ['reserved', 'Đang giữ'], ['available', 'Khả dụng'], ['pickedOpen', 'Đã lấy chưa giao']]) row(title, a[key], b[key]);
      }
    }
    const a = D.balances(before, customerId), b = D.balances(after, customerId);
    for (const [key, title] of [['O', 'O — Hóa đơn còn mở của khách'], ['U', 'U — Payment chưa cấn trừ của khách'], ['N', 'N — Số dư ròng của khách']]) row(title, a[key], b[key], 'money');
    const invoiceId = c.invoiceId || (c.type === 'invoice' ? documentIds[0] : null);
    const paymentId = c.paymentId || (c.type === 'recordPayment' ? documentIds[0] : null);
    if (invoiceId) row(`${invoiceId.split(':').pop()} — số dư mở`, before.invoices.some(x => x.id === invoiceId) ? D.invoiceBalance(before, invoiceId) : 0, D.invoiceBalance(after, invoiceId), 'money');
    if (paymentId) row(`${paymentId.split(':').pop()} — chưa cấn trừ`, before.payments.some(x => x.id === paymentId) ? D.paymentBalance(before, paymentId) : 0, D.paymentBalance(after, paymentId), 'money');
    return {
      rows, explanation: explanations[c.type], customerId,
      documents: created.map(x => x.code),
      quantity: c.quantity || (c.type === 'confirmOrder' ? item.orderedQty : null),
      amount: c.amount || (c.type === 'invoice' ? created[0].amount : null),
      related: [c.paymentId, c.invoiceId, c.packingSlipId].filter(Boolean).map(id => id.split(':').pop())
    };
  }
  function timeline(state) {
    return state.events.map(event => ({ event, ...describe(at(state, event.sequence - 1), at(state, event.sequence), event.command, event.documentIds) }));
  }
  function preview(state, candidate) {
    const event = candidate.events.at(-1);
    return describe(state, candidate, event.command, event.documentIds);
  }
  root.O2C.Insights = { timeline, preview, explanations };
})(globalThis);
