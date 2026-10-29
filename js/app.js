(function () {
  'use strict';
  const { Domain: D, Storage, Insights: I, Lessons: L } = O2C;
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = value => value.toLocaleString('vi-VN');
  const money = value => number(value) + ' ₫';
  const code = id => String(id).split(':').pop();
  const option = (value, text) => `<option value="${esc(value)}">${esc(text)}</option>`;
  const store = Storage.createStore(() => window.localStorage);
  let mode = location.hash === '#guided' ? 'guided' : 'practice';
  let { state, status } = store.open(mode);
  const sessions = new Map([[mode, { state, status }]]);
  let historyViews = [];
  let learningFeedback = '';
  let resetIntent = null;
  let selectedOrder = state.headers[0]?.id || '';
  let customerId = state.headers[0]?.customerId || 'KH01';
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
    $('notice-text').textContent = text;
    $('notice').classList.toggle('error', error);
    $('notice').hidden = false;
    $('notice').focus({ preventScroll: true });
  }
  function newRequestId() { return `${mode}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++requestCounter}`}`; }
  function persist(next) {
    state = next; status = store.save(state); sessions.set(mode, { state, status });
  }
  function setExerciseDefaults() {
    const exercise = mode === 'practice' && L.practiceStatus(state).active;
    if (exercise) { $('order-customer').value = 'KH01'; $('order-product').value = 'SP01'; }
    $('order-quantity').value = exercise ? '2' : '10';
    $('payment-amount').value = exercise ? '2000000' : '4000000';
    $('settlement-amount').value = exercise ? '2000000' : '4000000';
  }
  function activateMode(target) {
    if (target === mode) return;
    cancelPreview(); $('reset-dialog').close(); resetIntent = null;
    sessions.set(mode, { state, status }); mode = target;
    if (!sessions.has(mode)) sessions.set(mode, store.open(mode));
    ({ state, status } = sessions.get(mode));
    selectedOrder = state.headers[0]?.id || ''; customerId = state.headers[0]?.customerId || 'KH01';
    action = selectedOrder ? suggestedAction(D.orderLine(state, selectedOrder)) : 'confirmOrder';
    $('finance-customer').value = customerId; learningFeedback = '';
    setExerciseDefaults(); render();
  }
  function requestReset(exercise) {
    resetIntent = { mode, exercise };
    $('reset-title').textContent = exercise ? 'Bắt đầu bài đơn 2 từ dữ liệu practice mới?' : `Đặt lại riêng ${mode === 'guided' ? 'học có hướng dẫn' : 'tự thực hành'}?`;
    $('reset-dialog').querySelector('p').textContent = `Chứng từ và tiến độ của ${mode} sẽ thay bằng dữ liệu mẫu. Chế độ ${mode === 'guided' ? 'practice' : 'guided'} không bị thay đổi. Không thể hoàn tác; V1.1 chưa có xuất bản sao lưu. ${exercise ? 'Bạn sẽ tự tạo đơn 2 SP01 và làm đủ các bước; ứng dụng không làm thay.' : ''}`;
    $('reset-dialog').showModal();
  }
  function goTo(target) {
    if (mode === 'guided') { $('learning-panel').scrollIntoView({ block: 'start' }); return; }
    const order = state.headers.find(x => x.id === selectedOrder);
    if (order && ['recordPayment', 'settle'].includes(target)) {
      customerId = order.customerId; $('finance-customer').value = customerId; renderFinance();
      if (target === 'settle') {
        const item = D.orderLine(state, order.id);
        const invoice = state.invoices.find(i => state.packingSlips.find(p => p.id === i.packingSlipId)?.orderLineId === item.id && D.invoiceBalance(state, i.id) > 0);
        if (invoice) $('settlement-invoice').value = invoice.id;
      }
      const form = $(target === 'settle' ? 'settlement-form' : 'payment-form');
      form.scrollIntoView({ block: 'center' }); form.querySelector('input').focus({ preventScroll: true });
    } else {
      action = target; renderOrders(); $('operation-form').scrollIntoView({ block: 'center' }); $('operation-kind').focus({ preventScroll: true });
    }
  }
  function diagnosisHtml(orderId) {
    const d = D.orderDiagnosis(state, orderId), stock = D.inventory(state, D.orderLine(state, orderId).productId);
    const buttons = [];
    function button(type, title) { buttons.push(`<button type="button" class="quiet" data-go="${type}">${title}</button>`); }
    if (!d.confirmed) button('confirmOrder', 'Đi đến Confirm');
    if (d.confirmed && d.reserveRemaining > 0 && stock.available > 0) button('reserve', 'Đi đến giữ hàng');
    if (d.confirmed && d.pickRemaining > 0) button('pick', 'Đi đến Picking');
    if (d.pickedOpen > 0) button('postPackingSlip', 'Đi đến giao hàng');
    if (d.readyToInvoice > 0) button('invoice', 'Đi đến lập hóa đơn');
    let finance = d.complete ? 'Đã kiểm tra: đơn giao đủ, lập hóa đơn đủ và tất cả invoice của riêng đơn đã hết số dư.' : d.openInvoices === 0 ? 'Các invoice hiện có của đơn không còn số dư mở. Điều này chưa chứng minh đơn đã giao và invoice đủ.' : '';
    if (d.openInvoices > 0) {
      if (d.customerUnapplied > 0) {
        finance = `Khách đang có ${money(d.customerUnapplied)} chưa cấn trừ, có thể chọn dùng để trả invoice của đơn. Tiền này dùng chung cho các đơn cùng khách, chưa được dành riêng cho đơn đang xem.`;
        button('settle', 'Đi đến cấn trừ tiền đã nhận');
      } else finance = 'Khách chưa có khoản thanh toán còn dư để trả các invoice đang mở của đơn. Cần ghi nhận thêm tiền, rồi settlement.';
      if (d.customerFundingShortfall > 0) {
        finance += ` Xét toàn bộ khách, còn thiếu ${money(d.customerFundingShortfall)} so với tổng invoice đã lập. Đây là thiếu tiền ở cấp khách, không phải số dư riêng của đơn này.`;
        button('recordPayment', 'Đi đến nhận thêm tiền');
      }
    }
    return `<section id="order-diagnosis" class="diagnosis" aria-label="Vì sao đơn chưa hoàn tất"><h3>${d.complete ? 'Đơn đã hoàn tất' : 'Đơn đang thiếu hàng, hóa đơn, tiền hay cấn trừ?'}</h3><dl><div><dt>Còn chờ giao</dt><dd data-diagnosis="backorder">${number(d.backorder)} sản phẩm</dd></div><div><dt>Đã giao nhưng chưa lập hóa đơn</dt><dd data-diagnosis="readyToInvoice">${number(d.readyToInvoice)} sản phẩm</dd></div><div><dt>Chưa giao nên chưa đủ điều kiện lập hóa đơn</dt><dd data-diagnosis="notDelivered">${number(d.notDeliveredForInvoice)} sản phẩm</dd></div><div><dt>Số dư mở invoice thuộc riêng đơn này</dt><dd data-diagnosis="orderOpen">${money(d.openInvoices)}</dd></div></dl><p data-diagnosis="finance">${esc(finance)}</p>${d.physicalShortfall > 0 ? `<p class="limit-note">Để giữ hết phần còn lại, hiện thiếu ${d.physicalShortfall} sản phẩm vật lý khả dụng. Lab chưa có nhập kho; không tự tăng tồn. Có thể xử lý phần đã giữ/lấy và thanh toán các invoice hiện có.</p>` : ''}<div class="next-actions">${buttons.join('')}</div></section>`;
  }
  function renderLearning() {
    const panel = $('learning-panel');
    if (mode === 'practice') {
      const exercise = L.practiceStatus(state);
      panel.innerHTML = `<p class="eyebrow">TỰ THỰC HÀNH · ĐƠN NHỎ ĐỦ HÀNG</p><h2>${exercise.complete ? 'Hoàn thành bài tự thực hành: đơn 2 sản phẩm đã hoàn tất' : 'Tự hoàn tất một đơn 2 SP01'}</h2><p>KH01 đặt 2 SP01, giá 1 triệu. Bạn tự tạo đơn, Confirm, giữ, lấy, giao, invoice 2 triệu, ghi nhận payment 2 triệu và settlement đủ. ${exercise.active ? 'Bài đang dùng dữ liệu practice riêng; không có thao tác tự làm thay.' : 'Bắt đầu bài sẽ yêu cầu xác nhận đặt lại riêng practice về dữ liệu mới.'}</p><button id="start-practice-exercise" type="button" class="quiet">${exercise.active ? 'Đặt lại bài đơn 2 sản phẩm' : 'Bắt đầu bài đơn 2 sản phẩm'}</button>${exercise.orderId ? '<button id="view-exercise-order" type="button" class="quiet">Xem đơn của bài</button>' : ''}`;
      $('start-practice-exercise').addEventListener('click', () => requestReset(true));
      if ($('view-exercise-order')) $('view-exercise-order').addEventListener('click', () => { selectedOrder = exercise.orderId; customerId = 'KH01'; $('finance-customer').value = customerId; action = suggestedAction(D.orderLine(state, selectedOrder)); renderOrders(); renderFinance(); renderFlow(); $('order-detail').scrollIntoView({ block: 'start' }); });
      return;
    }
    const current = L.guidedStatus(state);
    const intro = '<p class="eyebrow">HỌC CÓ HƯỚNG DẪN · DỮ LIỆU GUIDED ĐỘC LẬP</p>';
    if (current.phase === 'invalid') { panel.innerHTML = intro + `<h2>Chưa thể tiếp tục bài</h2><p role="alert">${esc(current.error)}</p><p>Dùng nút đặt lại riêng học có hướng dẫn nếu muốn bắt đầu lại. Practice được giữ nguyên.</p>`; return; }
    if (current.phase === 'complete') {
      panel.innerHTML = intro + '<h2 id="lesson-complete">Bài học hoàn thành; đơn chưa hoàn tất</h2><p>O/U/N = 2.000.000 / 0 / 2.000.000 VND. Payment 4 triệu đã được settlement hết; invoice 6 triệu còn mở 2 triệu; còn 4 sản phẩm chờ giao. Có đúng 8 sự kiện nghiệp vụ.</p><p>Đơn chưa giao và invoice đủ 10, và invoice hiện có chưa hết số dư. Không tự nhập kho, nhận tiền hoặc settlement phần còn lại.</p>';
      return;
    }
    if (current.phase === 'final') {
      const value = current.final;
      panel.innerHTML = intro + `<h2>Đối chiếu cuối bài: giải thích bằng số liệu thật</h2><p>8 thao tác đã có chứng từ. Nhập số nguyên VND không có dấu phân cách và lượng còn chờ giao; trả lời lý do để công nhận bài học.</p>${learningFeedback ? `<p role="status">${esc(learningFeedback)}</p>` : ''}${current.tried ? '<p class="limit-note">Chưa đúng toàn bộ. Xem ba số dư và chi tiết đơn bên dưới rồi thử lại; không tạo thêm chứng từ.</p>' : ''}<form id="lesson-final-form"><div class="final-fields">${[['O','O — Hóa đơn còn mở (VND)'],['U','U — Payment chưa cấn trừ (VND)'],['N','N — Số dư ròng (VND)'],['backorder','Còn chờ giao (sản phẩm)']].map(([key,title]) => `<div><label for="final-${key}">${title}</label><input id="final-${key}" type="number" step="1" required value="${Number.isSafeInteger(value[key]) ? value[key] : ''}"></div>`).join('')}</div><label for="final-reason">Đơn trong case đã hoàn tất chưa, vì sao?</label><select id="final-reason" required>${option('', 'Chọn lý do')}${option('order-open','Chưa: còn 4 chưa giao/chưa invoice, invoice hiện có còn mở 2 triệu')}${option('all-complete','Đã hoàn tất vì bấm đủ tám thao tác')}</select><label for="final-zeroNet">Nếu invoice 2 triệu, payment 2 triệu chưa settlement, N=0 thì invoice đã đóng chưa?</label><select id="final-zeroNet" required>${option('', 'Chọn giải thích')}${option('still-open','Chưa: O=2, U=2; cần chọn tiền cấn trừ vào invoice')}${option('closed','Đã đóng vì ròng bằng 0')}</select><button type="submit">Kiểm tra cuối bài</button></form>`;
      $('final-reason').value = value.reason || ''; $('final-zeroNet').value = value.zeroNet || '';
      $('lesson-final-form').addEventListener('submit', event => {
        event.preventDefault();
        try {
          const answer = Object.fromEntries(['O','U','N','backorder'].map(key => [key, Number($('final-'+key).value)]));
          answer.reason = $('final-reason').value; answer.zeroNet = $('final-zeroNet').value;
          persist(L.answerFinal(state, answer)); learningFeedback = 'Đã kiểm tra câu trả lời bằng trạng thái thực tế.'; render();
        } catch (error) { notice(error.message, true); }
      });
      return;
    }
    const { step, index, phase } = current;
    const question = phase === 'predict' ? step.prediction : step.review;
    panel.innerHTML = intro + `<div class="section-title"><div><p>Bước ${index+1}/8 · Vai trò: <strong>${esc(step.role)}</strong></p><h2>${esc(step.title)}</h2></div><span class="pill">${current.count} sự kiện nghiệp vụ</span></div><p>${esc(step.instruction)}</p>${learningFeedback ? `<p role="status">${esc(learningFeedback)}</p>` : ''}${phase === 'operate' ? '<p>Dự đoán đúng. Hãy xem trước và tự xác nhận thao tác của bước này.</p><button id="guided-operate" type="button">Xem trước bước này</button>' : `<h3>${phase === 'predict' ? 'Dự đoán trước khi thao tác' : 'Giải thích tác động sau thao tác'}</h3>${current.explanation ? `<p class="limit-note">${current.selected ? 'Chưa đúng, bạn có thể thử lại. ' : ''}${esc(current.explanation)}</p>` : ''}${phase === 'review' && historyViews[index] ? impactTable(historyViews[index]) : ''}<form id="lesson-answer-form"><label for="lesson-choice">${esc(question.text)}</label><select id="lesson-choice" required>${option('','Chọn câu trả lời')}${question.options.map(o => option(o.value,o.label)).join('')}</select><button type="submit">${phase === 'predict' ? 'Kiểm tra dự đoán' : 'Kiểm tra giải thích'}</button></form>`}`;
    if (phase === 'operate') $('guided-operate').addEventListener('click', () => { try { preview(L.nextCommand(state, newRequestId())); } catch (error) { notice(error.message,true); } });
    else {
      $('lesson-choice').value = current.selected;
      $('lesson-answer-form').addEventListener('submit', event => {
        event.preventDefault();
        try {
          const choice = $('lesson-choice').value;
          persist(L.answer(state, phase === 'predict' ? 'predictions' : 'reviews', index, choice));
          learningFeedback = choice === question.correct ? 'Đúng. Tiếp tục theo chỉ dẫn đang hiển thị.' : 'Câu trả lời chưa đúng; xem giải thích và thử lại. Chứng từ không thay đổi.';
          render();
        } catch (error) { notice(error.message,true); }
      });
    }
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
      ${diagnosisHtml(order.id)}
      <form id="operation-form" class="operation" ${mode === 'guided' ? 'hidden' : ''}><div class="action-grid"><div><label for="operation-kind">Thao tác trên đơn này</label><select id="operation-kind">${['confirmOrder', 'reserve', 'pick', 'postPackingSlip', 'invoice'].map(t => option(t, D.labels[t])).join('')}</select></div><div id="operation-quantity-group"><label for="operation-quantity">Số lượng</label><input id="operation-quantity" type="number" min="1" step="1" value="1" required></div><div class="wide" id="operation-slip-group"><label for="operation-slip">Phiếu giao để lập invoice</label><select id="operation-slip"></select></div></div><p class="small" id="operation-help"></p><button type="submit">Xem trước thao tác</button></form>`;
    $('operation-kind').value = action;
    $('operation-kind').addEventListener('change', () => { action = $('operation-kind').value; renderOperationFields(); });
    $('operation-form').addEventListener('submit', event => {
      event.preventDefault();
      if (mode !== 'practice') return;
      const command = action === 'confirmOrder' ? { type: action, orderId: order.id } : { type: action, orderLineId: item.id, quantity: Number($('operation-quantity').value) };
      if (action === 'invoice') command.packingSlipId = $('operation-slip').value;
      preview(command);
    });
    renderOperationFields();
    $('order-detail').querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => goTo(button.dataset.go)));
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
    const totals = D.customerTotals(state, customerId);
    const cards = [['O', 'Số dư hóa đơn còn mở', balance.O, 'Chỉ giảm khi settlement'], ['U', 'Khoản thanh toán chưa cấn trừ', balance.U, 'Tiền đã nhận, chưa ghép hết invoice'], ['N', 'Số dư ròng của khách hàng', balance.N, 'N = O − U; được phép âm']];
    $('balance-cards').innerHTML = cards.map(([key, title, value, note]) => `<article class="balance-card" data-balance="${key}"><p>${key} · ${title}</p><strong>${money(value)}</strong><small>${note}</small></article>`).join('');
    const sign = balance.N > 0 ? 'N dương: tổng invoice còn lớn hơn tổng payment; khách còn thiếu tiền ròng ở cấp khách.' : balance.N < 0 ? 'N âm: khách có tiền dư ròng trong mô hình. Invoice cụ thể vẫn chỉ hết dư sau settlement.' : 'N bằng 0: tổng invoice bằng tổng payment. Invoice vẫn có thể còn mở nếu tiền chưa được cấn trừ.';
    $('balance-formulas').innerHTML = `<p data-formula="O">O = tổng hóa đơn − tổng settlement = ${money(totals.invoices)} − ${money(totals.settlements)} = <strong>${money(balance.O)}</strong></p><p data-formula="U">U = tổng payment − tổng settlement = ${money(totals.payments)} − ${money(totals.settlements)} = <strong>${money(balance.U)}</strong></p><p data-formula="N">N = O − U = ${money(balance.O)} − ${money(balance.U)} = ${money(balance.N)}<br>N = tổng hóa đơn − tổng payment = ${money(totals.invoices)} − ${money(totals.payments)} = <strong>${money(balance.N)}</strong></p><p>${sign} Đây là số dư của khách, không phải số dư riêng của đơn.</p>`;
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
  function impactTable(view) {
    const format = (value, kind) => kind === 'money' ? money(value) : kind === 'boolean' ? (value ? 'Đã xác nhận' : 'Chưa xác nhận') : number(value);
    return `<div class="table-wrap changes"><table><thead><tr><th>Chỉ tiêu liên quan</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${view.rows.map(row => `<tr><th scope="row">${esc(row.label)}</th><td>${esc(format(row.before, row.kind))}</td><td>${esc(format(row.after, row.kind))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function eventDescription(view) {
    return `${view.documents.join(', ')}${view.quantity ? ` · ${view.quantity} sản phẩm${view.event?.action === 'confirmOrder' ? ' trên đơn xác nhận' : ''}` : ''}${view.amount ? ` · ${money(view.amount)}` : ''}${view.related.length ? ` · ${view.related.join(' → ')}` : ''}`;
  }
  function renderEvents() {
    $('event-count').textContent = `${state.events.length} sự kiện`;
    $('event-list').innerHTML = historyViews.length ? historyViews.slice().reverse().map(view => `<details class="event"><summary>#${view.event.sequence} · ${esc(D.labels[view.event.action])} · ${esc(eventDescription(view))}<span class="event-time">${esc(view.event.role)} · ${new Date(view.event.createdAt).toLocaleTimeString('vi-VN')}</span></summary><p class="event-explanation">${esc(view.explanation)}</p>${impactTable(view)}</details>`).join('') : '<p class="empty">Chưa có sự kiện nghiệp vụ.</p>';
  }
  function render() {
    renderStorage();
    document.querySelectorAll('[data-mode]').forEach(button => {
      button.classList.toggle('active-mode', button.dataset.mode === mode);
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });
    $('order-form').hidden = mode === 'guided';
    $('finance-forms').hidden = mode === 'guided';
    $('finance-customer').disabled = mode === 'guided';
    $('reset').textContent = mode === 'guided' ? 'Đặt lại học có hướng dẫn' : 'Đặt lại thực hành';
    $('inventory-rows').innerHTML = state.products.map(p => {
      const x = D.inventory(state, p.id);
      return `<tr data-product="${p.id}"><td>${p.name}<small>${p.id} · ${money(p.unitPrice)} / đơn vị</small></td>${[x.actual, x.reserved, x.available, x.pickedOpen].map(n => `<td class="number">${number(n)}</td>`).join('')}</tr>`;
    }).join('');
    historyViews = I.timeline(state);
    renderLearning(); renderOrders(); renderFinance(); renderFlow(); renderEvents();
  }
  function preview(command) {
    if (pending || $('preview-dialog').open) return;
    try {
      command = { ...command, requestId: command.requestId || newRequestId() };
      if (mode === 'guided') L.assertCurrentCommand(state, command);
      const candidate = D.execute(state, command);
      pending = { command, revision: state.revision, mode };
      $('preview-title').textContent = D.labels[command.type];
      const subject = command.orderId || (command.orderLineId ? D.orderLine(state, selectedOrder).orderId : command.customerId);
      $('preview-description').textContent = `${code(subject || '')}${command.quantity ? ` · ${number(command.quantity)} sản phẩm` : ''}${command.amount ? ` · ${money(command.amount)}` : ''}${command.packingSlipId ? ` · ${code(command.packingSlipId)}` : ''}${command.paymentId ? ` · ${code(command.paymentId)} → ${code(command.invoiceId)}` : ''}`;
      $('prediction').textContent = predictions[command.type] + ' (Tự dự đoán, chưa chấm điểm.)';
      const impact = I.preview(state, candidate);
      $('preview-explanation').textContent = impact.explanation;
      $('preview-changes').innerHTML = impactTable(impact);
      $('preview-dialog').querySelector('details').open = true;
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
      if (current.mode !== mode || current.revision !== state.revision) throw new Error('Dữ liệu phiên đã đổi. Hãy mở lại xem trước.');
      if (mode === 'guided') L.assertCurrentCommand(state, current.command);
      state = D.execute(state, current.command);
      if (current.command.type === 'createOrder') {
        selectedOrder = state.headers.at(-1).id;
        action = 'confirmOrder';
        customerId = current.command.customerId;
        $('finance-customer').value = customerId;
      }
      persist(state);
      $('preview-dialog').close();
      render();
      notice(`${D.labels[current.command.type]} đã ghi nhận. ${status.saved ? 'Đã lưu.' : 'Chưa lưu trên máy; hãy đọc cảnh báo lưu dữ liệu.'}`);
    } catch (error) { $('preview-dialog').close(); notice(error.message, true); }
  });
  function cancelPreview() { pending = null; $('preview-dialog').close(); }
  $('cancel-preview').addEventListener('click', cancelPreview);
  $('preview-dialog').addEventListener('cancel', () => { pending = null; });
  $('order-form').addEventListener('submit', e => { e.preventDefault(); if (mode !== 'practice') return; preview({ type: 'createOrder', customerId: $('order-customer').value, productId: $('order-product').value, quantity: Number($('order-quantity').value) }); });
  $('order-product').addEventListener('change', renderPrice);
  $('order-list').addEventListener('click', e => {
    const button = e.target.closest('[data-order]');
    if (!button) return;
    selectedOrder = button.dataset.order;
    const item = D.orderLine(state, selectedOrder);
    action = suggestedAction(item);
    customerId = state.headers.find(h => h.id === selectedOrder).customerId;
    $('finance-customer').value = customerId;
    renderOrders(); renderFlow(); renderFinance();
  });
  $('finance-customer').addEventListener('change', () => { customerId = $('finance-customer').value; renderFinance(); });
  $('payment-form').addEventListener('submit', e => { e.preventDefault(); if (mode !== 'practice') return; preview({ type: 'recordPayment', customerId, amount: Number($('payment-amount').value) }); });
  $('settlement-form').addEventListener('submit', e => { e.preventDefault(); if (mode !== 'practice') return; preview({ type: 'settle', customerId, paymentId: $('settlement-payment').value, invoiceId: $('settlement-invoice').value, amount: Number($('settlement-amount').value) }); });
  $('retry-save').addEventListener('click', () => { persist(state); renderStorage(); notice(status.saved ? 'Đã lưu trạng thái hiện tại, không tạo thêm nghiệp vụ.' : status.message, !status.saved); });
  $('reset').addEventListener('click', () => requestReset(false));
  $('cancel-reset').addEventListener('click', () => { resetIntent = null; $('reset-dialog').close(); });
  $('reset-dialog').addEventListener('cancel', () => { resetIntent = null; });
  $('confirm-reset').addEventListener('click', () => {
    if (!$('reset-dialog').open || !resetIntent) return;
    const intent = resetIntent; resetIntent = null;
    if (intent.mode !== mode) { $('reset-dialog').close(); return; }
    ({ state, status } = store.reset(mode));
    if (intent.exercise) persist(L.startPractice(state));
    else sessions.set(mode, { state, status });
    selectedOrder = ''; action = 'confirmOrder'; learningFeedback = ''; customerId = 'KH01';
    $('finance-customer').value = customerId;
    setExerciseDefaults();
    $('reset-dialog').close(); render();
    notice(`Đã đặt lại riêng ${mode}. Chế độ còn lại được giữ nguyên. ${status.saved ? 'Đã lưu.' : 'Chưa lưu trên máy.'}`);
  });
  $('dismiss-notice').addEventListener('click', () => { $('notice').hidden = true; });
  $('mode-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    activateMode(button.dataset.mode); location.hash = mode;
  });
  window.addEventListener('hashchange', () => { if (['#guided','#practice'].includes(location.hash)) activateMode(location.hash.slice(1)); });
  for (const id of ['order-customer', 'finance-customer']) $(id).innerHTML = state.customers.map(x => option(x.id, x.name)).join('');
  $('order-product').innerHTML = state.products.map(x => option(x.id, x.name)).join('');
  setExerciseDefaults(); renderPrice(); render();
})();
