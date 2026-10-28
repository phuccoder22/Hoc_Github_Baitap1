(function () {
  'use strict';
  const { Domain: D, Storage } = O2C;
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = value => value.toLocaleString('vi-VN');
  const money = value => number(value) + ' ₫';
  const code = id => String(id).split(':').pop();
  const option = (value, text) => `<option value="${esc(value)}">${esc(text)}</option>`;
  const store = Storage.createStore(() => window.localStorage);
  let { state, status } = store.open('practice');
  let selectedOrder = state.headers[0]?.id || '';
  let customerId = 'KH01';
  let action = selectedOrder ? suggestedAction(D.orderLine(state, selectedOrder)) : 'confirmOrder';
  let pending = null;
  let requestCounter = 0;
  const predictions = {
    createOrder: 'Dự đoán: chỉ tạo đơn thì tồn vật lý và số dư hóa đơn có thay đổi không?',
    confirmOrder: 'Dự đoán: Confirm nội dung đơn có đồng nghĩa hàng đã rời kho không?',
    reserve: 'Dự đoán: giữ hàng sẽ đổi tồn thực tế hay chỉ đổi lượng giữ và khả dụng?',
    pick: 'Dự đoán: sau Picking, hàng đã lấy có còn nằm trong tồn và lượng giữ không?',
    postPackingSlip: 'Dự đoán: tồn thực tế, giữ và lượng lấy chưa giao cùng giảm; khả dụng có đổi không?',
    invoice: 'Dự đoán: lập invoice sẽ tăng O và N; U và số lượng tồn có đổi không?',
    recordPayment: 'Dự đoán: nhận tiền sẽ giảm số dư invoice ngay, hay chỉ tăng U và giảm N?',
    settle: 'Dự đoán: cấn trừ giảm O và U cùng số tiền. Số dư ròng N có giảm thêm không?'
  };
  function notice(text, error = false) {
    $('notice').textContent = text;
    $('notice').classList.toggle('error', error);
    $('notice').hidden = false;
    $('notice').focus({ preventScroll: true });
  }
  function renderStorage() {
    $('storage-status').textContent = status.message;
    $('storage-status').parentElement.classList.toggle('unsaved', !status.saved);
  }
  function setOptions(select, items, empty) {
    const previous = select.value;
    select.innerHTML = items.length ? items.map(x => option(x.id, x.label)).join('') : option('', empty);
    if (items.some(x => x.id === previous)) select.value = previous;
  }
  function renderPrice() {
    const product = state.products.find(x => x.id === $('order-product').value);
    $('order-price').textContent = product ? `Giá chốt: ${money(product.unitPrice)} / đơn vị học tập. Được đặt vượt tồn.` : '';
  }
  function progress(value, total, noun) {
    return value === 0 ? `Chưa ${noun}` : value === total ? `${noun} đủ` : `${noun} một phần`;
  }
  function suggestedAction(item) {
    const m = D.lineMetrics(state, item.id);
    if (!m.confirmed) return 'confirmOrder';
    if (m.pickRemaining > 0) return 'pick';
    if (m.pickedOpen > 0) return 'postPackingSlip';
    if (m.readyToInvoice > 0) return 'invoice';
    return 'reserve';
  }
  function renderOrders() {
    $('order-list').innerHTML = state.headers.length ? state.headers.map(h => {
      const m = D.lineMetrics(state, D.orderLine(state, h.id).id);
      return `<button type="button" data-order="${esc(h.id)}" class="${h.id === selectedOrder ? 'selected' : ''}" aria-pressed="${h.id === selectedOrder}">${esc(h.code)} · ${m.complete ? 'Hoàn tất' : 'Đang mở'}</button>`;
    }).join('') : '<p class="empty">Chưa có đơn hàng. Hãy tạo đơn đầu tiên ở bên trái.</p>';
    const order = state.headers.find(x => x.id === selectedOrder);
    if (!order) { $('order-detail').innerHTML = ''; return; }
    const item = D.orderLine(state, order.id);
    const product = state.products.find(x => x.id === item.productId);
    const customer = state.customers.find(x => x.id === order.customerId);
    const m = D.lineMetrics(state, item.id);
    const paymentStatus = m.invoiceTotal === 0 ? 'Chưa có invoice' : m.openInvoices === 0 ? 'Các invoice hiện có đã trả đủ' : m.openInvoices === m.invoiceTotal ? 'Chưa settlement' : 'Invoice được trả một phần';
    const metrics = [['Đặt', m.ordered], ['Giữ còn lại', m.reserved], ['Đã lấy chưa giao', m.pickedOpen], ['Đã giao', m.shipped], ['Còn chờ giao', m.backorder], ['Đã invoice', m.invoiced], ['Đã giao chưa invoice', m.readyToInvoice], ['Đã lấy lũy kế', m.picked]];
    $('order-detail').innerHTML = `<div class="detail-header"><div><h3>${esc(order.code)}</h3><p class="small">Header: ${esc(customer.name)} · ${order.currency} · ${order.warehouseId}<br>Line 1: ${esc(product.name)} · giá chốt ${money(item.unitPriceSnapshot)}</p></div><span class="pill">${m.complete ? 'Đơn hoàn tất' : 'Đơn chưa hoàn tất'}</span></div>
      <div class="statuses"><span>${m.confirmed ? 'Đã Confirm' : 'Chưa Confirm'}</span><span>${progress(m.shipped, m.ordered, 'Giao')}</span><span>${progress(m.invoiced, m.ordered, 'Invoice')}</span><span>${paymentStatus}</span></div>
      <div class="metrics">${metrics.map(([title, value]) => `<div class="metric"><span>${title}</span><strong>${number(value)}</strong></div>`).join('')}</div>
      <p class="small">Còn chờ giao (Backorder) = lượng đặt − đã giao; gồm cả phần giữ/lấy nhưng chưa giao. Không phải số tiền nợ. Dư invoice của đơn: ${money(m.openInvoices)}.</p>
      <form id="operation-form" class="operation"><div class="action-grid"><div><label for="operation-kind">Thao tác trên đơn này</label><select id="operation-kind">${['confirmOrder', 'reserve', 'pick', 'postPackingSlip', 'invoice'].map(t => option(t, D.labels[t])).join('')}</select></div><div id="operation-quantity-group"><label for="operation-quantity">Số lượng</label><input id="operation-quantity" type="number" min="1" step="1" value="1" required></div><div class="wide" id="operation-slip-group"><label for="operation-slip">Phiếu giao để lập invoice</label><select id="operation-slip"></select></div></div><p class="small" id="operation-help"></p><button type="submit">Xem trước thao tác</button></form>`;
    $('operation-kind').value = action;
    $('operation-kind').addEventListener('change', () => { action = $('operation-kind').value; renderOperationFields(); });
    $('operation-form').addEventListener('submit', event => {
      event.preventDefault();
      const command = action === 'confirmOrder' ? { type: action, orderId: order.id } : { type: action, orderLineId: item.id, quantity: Number($('operation-quantity').value) };
      if (action === 'invoice') command.packingSlipId = $('operation-slip').value;
      preview(command);
    });
    renderOperationFields();
  }
  function renderOperationFields() {
    const item = D.orderLine(state, selectedOrder);
    const m = D.lineMetrics(state, item.id);
    const inv = D.inventory(state, item.productId);
    $('operation-quantity-group').hidden = action === 'confirmOrder';
    $('operation-quantity').disabled = action === 'confirmOrder';
    $('operation-slip-group').hidden = action !== 'invoice';
    $('operation-slip').disabled = action !== 'invoice';
    $('operation-slip').required = action === 'invoice';
    setOptions($('operation-slip'), state.packingSlips.filter(s => s.orderLineId === item.id && D.invoiceRemaining(state, s.id) > 0).map(s => ({ id: s.id, label: `${s.code} · còn ${D.invoiceRemaining(state, s.id)} chưa invoice` })), 'Chưa có phiếu giao đủ điều kiện');
    const hints = {
      confirmOrder: 'Confirm tạo chứng từ xác nhận nội dung, không tự giữ hàng, giao hoặc invoice.',
      reserve: `Đơn còn cần giữ ${m.reserveRemaining}; kho còn ${inv.available} khả dụng. Chỉ giữ vật lý hiện có trong simulator.`,
      pick: `Có thể lấy tiếp tối đa ${m.pickRemaining} từ lượng giữ của chính đơn này. Không cần chọn mã nguồn.`,
      postPackingSlip: `Có thể giao tối đa ${m.pickedOpen} đã lấy chưa giao của chính đơn. Packing slip là lần ghi nhận giao duy nhất.`,
      invoice: `Đã giao chưa invoice ${m.readyToInvoice}. Chọn đúng phiếu giao; không invoice vượt phần còn lại của phiếu.`
    };
    $('operation-help').textContent = hints[action];
  }
  function renderFinance() {
    const balance = D.balances(state, customerId);
    const cards = [['O', 'Số dư hóa đơn còn mở', balance.O, 'Chỉ giảm khi settlement'], ['U', 'Khoản thanh toán chưa cấn trừ', balance.U, 'Tiền đã nhận, chưa ghép hết invoice'], ['N', 'Số dư ròng của khách hàng', balance.N, 'N = O − U; được phép âm']];
    $('balance-cards').innerHTML = cards.map(([key, title, value, note]) => `<article class="balance-card" data-balance="${key}"><p>${key} · ${title}</p><strong>${money(value)}</strong><small>${note}</small></article>`).join('');
    const payments = state.payments.filter(x => x.customerId === customerId);
    const invoices = state.invoices.filter(x => D.customerOfInvoice(state, x) === customerId);
    setOptions($('settlement-payment'), payments.filter(x => D.paymentBalance(state, x.id) > 0).map(x => ({ id: x.id, label: `${x.code} · dư ${money(D.paymentBalance(state, x.id))}` })), 'Chưa có payment còn số dư');
    setOptions($('settlement-invoice'), invoices.filter(x => D.invoiceBalance(state, x.id) > 0).map(x => ({ id: x.id, label: `${x.code} · mở ${money(D.invoiceBalance(state, x.id))}` })), 'Chưa có invoice còn mở');
    $('financial-documents').innerHTML = `<h3>Payment của khách đang xem</h3>${payments.length ? payments.map(p => `<span class="doc">${p.code} · nhận ${money(p.amount)} · chưa cấn trừ ${money(D.paymentBalance(state, p.id))}</span>`).join('') : '<p class="small">Chưa có payment.</p>'}<h3>Invoice của khách đang xem</h3>${invoices.length ? invoices.map(i => `<span class="doc">${i.code} · ${money(i.amount)} · còn mở ${money(D.invoiceBalance(state, i.id))}</span>`).join('') : '<p class="small">Chưa có invoice.</p>'}`;
  }
  function renderFlow() {
    const order = state.headers.find(x => x.id === selectedOrder);
    $('flow-order').textContent = order ? order.code : 'Chưa chọn đơn';
    if (!order) { $('document-flow').innerHTML = '<p class="empty">Tạo hoặc chọn một đơn để xem các chứng từ liên quan.</p>'; return; }
    const item = D.orderLine(state, order.id);
    const slips = state.packingSlips.filter(x => x.orderLineId === item.id);
    const invoices = state.invoices.filter(x => slips.some(s => s.id === x.packingSlipId));
    const settlements = state.settlements.filter(x => invoices.some(i => i.id === x.invoiceId));
    const groups = [
      ['Sales Order', [{ ...order, text: `Header → ${item.code} · đặt ${item.orderedQty}` }]],
      ['Confirm', state.confirmations.filter(x => x.orderId === order.id)],
      ['Reservation', state.reservations.filter(x => x.orderLineId === item.id)],
      ['Picking', state.pickings.filter(x => x.orderLineId === item.id).map(x => ({ ...x, text: x.reservationAllocations.map(a => `${code(a.reservationId)}: ${a.quantity}`).join(', ') }))],
      ['Packing slip', slips.map(x => ({ ...x, text: x.allocations.map(a => `${code(a.pickingId)}: ${a.quantity}`).join(', ') }))],
      ['Invoice', invoices.map(x => ({ ...x, text: `từ ${code(x.packingSlipId)} · mở ${money(D.invoiceBalance(state, x.id))}` }))],
      ['Settlement', settlements.map(x => ({ ...x, text: `${code(x.paymentId)} → ${code(x.invoiceId)}` }))]
    ];
    $('document-flow').innerHTML = groups.map(([title, docs]) => `<div class="flow-group"><h3>${title}</h3><div>${docs.length ? docs.map(d => `<span class="doc">${esc(d.code)}${d.quantity ? ` · ${d.quantity} sản phẩm` : ''}${d.amount ? ` · ${money(d.amount)}` : ''}${d.text ? ` · ${esc(d.text)}` : ''}</span>`).join('') : '<span class="small">Chưa có</span>'}</div></div>`).join('');
  }
  function changes(before, after) {
    const rows = [];
    before.inventory.forEach((p, index) => {
      const next = after.inventory[index];
      const product = state.products.find(x => x.id === p.productId);
      [['actual', 'thực tế'], ['reserved', 'giữ'], ['available', 'khả dụng'], ['pickedOpen', 'lấy chưa giao']].forEach(([key, title]) => {
        if (p[key] !== next[key]) rows.push([`${product.name} · ${title}`, number(p[key]), number(next[key])]);
      });
    });
    before.balances.forEach((p, index) => {
      const next = after.balances[index];
      const customer = state.customers.find(x => x.id === p.customerId);
      ['O', 'U', 'N'].forEach(key => { if (p[key] !== next[key]) rows.push([`${customer.name} · ${key}`, money(p[key]), money(next[key])]); });
    });
    return rows.length ? `<div class="table-wrap changes"><table><thead><tr><th>Chỉ tiêu thay đổi</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="small">Không thay đổi tồn kho và ba số dư khách hàng.</p>';
  }
  function renderEvents() {
    $('event-count').textContent = `${state.events.length} sự kiện`;
    $('event-list').innerHTML = state.events.length ? state.events.slice().reverse().map(e => `<details class="event"><summary>#${e.sequence} · ${esc(D.labels[e.action])} · ${e.documentIds.map(code).map(esc).join(', ')}<span class="event-time">${esc(e.role)} · ${new Date(e.createdAt).toLocaleTimeString('vi-VN')}</span></summary>${changes(e.before, e.after)}</details>`).join('') : '<p class="empty">Chưa có sự kiện nghiệp vụ.</p>';
  }
  function render() {
    renderStorage();
    $('inventory-rows').innerHTML = state.products.map(p => {
      const x = D.inventory(state, p.id);
      return `<tr data-product="${p.id}"><td>${p.name}<small>${p.id} · ${money(p.unitPrice)} / đơn vị</small></td>${[x.actual, x.reserved, x.available, x.pickedOpen].map(n => `<td class="number">${number(n)}</td>`).join('')}</tr>`;
    }).join('');
    renderOrders(); renderFinance(); renderFlow(); renderEvents();
  }
  function preview(command) {
    if (pending || $('preview-dialog').open) return;
    try {
      const requestId = `practice-${Date.now()}-${++requestCounter}`;
      command = { ...command, requestId };
      const candidate = D.execute(state, command);
      pending = { command, revision: state.revision };
      $('preview-title').textContent = D.labels[command.type];
      const subject = command.orderId || (command.orderLineId ? D.orderLine(state, selectedOrder).orderId : command.customerId);
      $('preview-description').textContent = `${code(subject || '')}${command.quantity ? ` · ${number(command.quantity)} sản phẩm` : ''}${command.amount ? ` · ${money(command.amount)}` : ''}${command.packingSlipId ? ` · ${code(command.packingSlipId)}` : ''}${command.paymentId ? ` · ${code(command.paymentId)} → ${code(command.invoiceId)}` : ''}`;
      $('prediction').textContent = predictions[command.type] + ' (Tự dự đoán, chưa chấm điểm.)';
      $('preview-changes').innerHTML = changes(D.snapshot(state), D.snapshot(candidate));
      $('preview-dialog').querySelector('details').open = false;
      $('commit').disabled = false;
      $('preview-dialog').showModal();
    } catch (error) { pending = null; notice(error.message, true); }
  }
  $('commit').addEventListener('click', () => {
    if (!pending) return;
    const current = pending;
    pending = null; // Consume once before any DOM render or write; a second click is harmless.
    $('commit').disabled = true;
    try {
      if (current.revision !== state.revision) throw new Error('Dữ liệu phiên đã đổi. Hãy mở lại xem trước.');
      state = D.execute(state, current.command);
      if (current.command.type === 'createOrder') {
        selectedOrder = state.headers.at(-1).id;
        action = 'confirmOrder';
        customerId = current.command.customerId;
        $('finance-customer').value = customerId;
      }
      status = store.save(state);
      $('preview-dialog').close();
      render();
      notice(`${D.labels[current.command.type]} đã ghi nhận. ${status.saved ? 'Đã lưu.' : 'Chưa lưu trên máy; hãy đọc cảnh báo lưu dữ liệu.'}`);
    } catch (error) { $('preview-dialog').close(); notice(error.message, true); }
  });
  function cancelPreview() { pending = null; $('preview-dialog').close(); }
  $('cancel-preview').addEventListener('click', cancelPreview);
  $('preview-dialog').addEventListener('cancel', () => { pending = null; });
  $('order-form').addEventListener('submit', e => { e.preventDefault(); preview({ type: 'createOrder', customerId: $('order-customer').value, productId: $('order-product').value, quantity: Number($('order-quantity').value) }); });
  $('order-product').addEventListener('change', renderPrice);
  $('order-list').addEventListener('click', e => {
    const button = e.target.closest('[data-order]');
    if (!button) return;
    selectedOrder = button.dataset.order;
    const item = D.orderLine(state, selectedOrder);
    action = suggestedAction(item);
    renderOrders(); renderFlow();
  });
  $('finance-customer').addEventListener('change', () => { customerId = $('finance-customer').value; renderFinance(); });
  $('payment-form').addEventListener('submit', e => { e.preventDefault(); preview({ type: 'recordPayment', customerId, amount: Number($('payment-amount').value) }); });
  $('settlement-form').addEventListener('submit', e => { e.preventDefault(); preview({ type: 'settle', customerId, paymentId: $('settlement-payment').value, invoiceId: $('settlement-invoice').value, amount: Number($('settlement-amount').value) }); });
  $('retry-save').addEventListener('click', () => { status = store.save(state); renderStorage(); notice(status.saved ? 'Đã lưu trạng thái hiện tại, không tạo thêm nghiệp vụ.' : status.message, !status.saved); });
  $('reset').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => {
    if (!$('reset-dialog').open) return;
    ({ state, status } = store.reset('practice'));
    selectedOrder = ''; action = 'confirmOrder';
    $('reset-dialog').close(); render(); notice('Đã đặt lại practice về dữ liệu mẫu. Guided không bị thay đổi. ' + (status.saved ? 'Đã lưu.' : 'Chưa lưu trên máy.'));
  });
  for (const id of ['order-customer', 'finance-customer']) $(id).innerHTML = state.customers.map(x => option(x.id, x.name)).join('');
  $('order-product').innerHTML = state.products.map(x => option(x.id, x.name)).join('');
  renderPrice(); render();
})();
