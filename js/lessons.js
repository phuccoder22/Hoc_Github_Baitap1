(function (root) {
  'use strict';
  const { Domain: D, Seed } = root.O2C;
  const copy = x => JSON.parse(JSON.stringify(x));
  const reject = text => { throw new D.BusinessError(text); };
  function question(text, correct, options) { return { text, correct, options: options.map(([value, label]) => ({ value, label })) }; }
  const steps = [
    {
      title: 'Tạo Header và một Line', role: 'Bán hàng', action: 'createOrder',
      instruction: 'KH01 đặt 10 SP01, giá 1.000.000 VND. Kho chỉ có 6 nhưng vẫn ghi nhận nhu cầu 10.',
      prediction: question('Chỉ tạo đơn sẽ làm tồn thực tế và O thay đổi thế nào?', 'unchanged', [['unchanged', 'Tồn vẫn 6, O vẫn 0'], ['stock', 'Tồn giảm ngay 10'], ['debt', 'O tăng ngay 10 triệu']]),
      review: question('Vì sao tạo đơn chưa làm giảm tồn hoặc phát sinh invoice?', 'request', [['request', 'Đơn ghi nhu cầu; chưa giao và chưa lập hóa đơn'], ['paid', 'Vì khách đã trả tiền'], ['enough', 'Vì kho có đủ 10']])
    },
    {
      title: 'Confirm nội dung đơn', role: 'Bán hàng', action: 'confirmOrder',
      instruction: 'Xác nhận nội dung SO, không giao hàng hoặc tự giữ hàng.',
      prediction: question('Confirm có nghĩa là đã giao hàng chưa?', 'not-shipped', [['not-shipped', 'Chưa giao; tồn và O/U/N không đổi'], ['shipped', 'Đã giao đủ 10'], ['invoice', 'Đã lập invoice']]),
      review: question('Confirmation khác Packing slip ở đâu?', 'confirmation', [['confirmation', 'Confirmation xác nhận nội dung; Packing slip ghi nhận lượng giao'], ['same', 'Hai tên của cùng một lần giảm tồn'], ['payment', 'Confirmation nhận tiền']])
    },
    {
      title: 'Giữ 6 sản phẩm cho đúng đơn', role: 'Kho', action: 'reserve',
      instruction: 'Giữ 6 vật lý hiện có. 4 chưa được giữ vẫn thuộc phần còn chờ giao.',
      prediction: question('Sau giữ 6 từ tồn 6, tồn thực tế / giữ / khả dụng là gì?', '6-6-0', [['6-6-0', '6 / 6 / 0'], ['0-0-0', '0 / 0 / 0'], ['6-0-6', '6 / 0 / 6']]),
      review: question('Chỉ giữ vật lý hiện có có phải luật của mọi ERP?', 'lab-limit', [['lab-limit', 'Không; đây là giới hạn simulator, D365 tùy cấu hình'], ['all-erp', 'Có, mọi ERP đều như vậy'], ['payment', 'Giữ hàng là thanh toán']])
    },
    {
      title: 'Picking 6 đã giữ', role: 'Kho', action: 'pick',
      instruction: 'Lấy 6 từ lượng giữ của chính line này để chuẩn bị giao.',
      prediction: question('Lấy 6 rồi, tồn và giữ còn lại là bao nhiêu?', 'still-6', [['still-6', 'Tồn 6, giữ 6; đã lấy chưa giao 6'], ['gone', 'Tồn 0, giữ 0'], ['debt', 'O tăng 6 triệu']]),
      review: question('Vì sao Picking chưa giảm tồn thực tế trong lab?', 'inside', [['inside', 'Hàng mới được chuẩn bị, chưa ghi nhận giao bằng Packing slip'], ['invoiced', 'Vì đã invoice'], ['none', 'Vì không có hàng']])
    },
    {
      title: 'Giao 6 bằng Packing slip', role: 'Kho', action: 'postPackingSlip',
      instruction: 'Ghi nhận giao 6 một lần. Không tạo Shipment riêng để trừ tồn thêm lần nữa.',
      prediction: question('Sau giao 6 trên đơn đặt 10, còn chờ giao bao nhiêu?', 'four', [['four', '4 sản phẩm; tồn và giữ đều 0'], ['zero', '0 sản phẩm'], ['money', '4 triệu tiền nợ']]),
      review: question('Còn chờ giao (Backorder) là gì?', 'quantity', [['quantity', 'Lượng đặt chưa giao, không phải số tiền nợ'], ['debt', 'Số dư mở invoice'], ['payment', 'Payment chưa cấn trừ']])
    },
    {
      title: 'Invoice 6 triệu cho phần đã giao', role: 'Kế toán', action: 'invoice',
      instruction: 'Lập invoice 6 của Packing slip; 4 chưa giao chưa đủ điều kiện invoice trong lab.',
      prediction: question('Sau invoice 6 triệu, O/U/N là gì?', '6-0-6', [['6-0-6', '6 / 0 / 6 triệu'], ['0-0-0', '0 / 0 / 0'], ['10-0-10', '10 / 0 / 10 triệu']]),
      review: question('Vì sao chưa invoice cả 10?', 'delivered-only', [['delivered-only', 'Lab chỉ invoice 6 đã giao; ERP có thể có lựa chọn khác'], ['all-erp', 'Mọi ERP chỉ cho đúng quy trình này'], ['paid-only', 'Chỉ invoice phần đã nhận tiền']])
    },
    {
      title: 'Ghi nhận payment 4 triệu', role: 'Kế toán', action: 'recordPayment',
      instruction: 'Ghi nhận tiền của KH01 riêng, chưa chọn nó trả invoice nào.',
      prediction: question('Sau payment 4 triệu, O/U/N là gì?', '6-4-2', [['6-4-2', '6 / 4 / 2 triệu'], ['2-0-2', '2 / 0 / 2 triệu'], ['6-4-6', '6 / 4 / 6 triệu']]),
      review: question('Tại sao O vẫn 6 mà N đã còn 2?', 'not-applied', [['not-applied', 'Tiền đã ghi nhận ở cấp khách nhưng chưa cấn trừ vào invoice'], ['new-invoice', 'Vì phát sinh invoice khác'], ['stock', 'Vì tồn giảm']])
    },
    {
      title: 'Settlement 4 triệu', role: 'Kế toán', action: 'settle',
      instruction: 'Dùng PAY đã nhận để trả I của KH01. Không nhận thêm tiền.',
      prediction: question('Settlement 4 triệu làm O/U/N thành bao nhiêu?', '2-0-2', [['2-0-2', '2 / 0 / 2 triệu'], ['2-0-minus2', '2 / 0 / −2 triệu'], ['0-0-0', '0 / 0 / 0']]),
      review: question('Settlement thay đổi điều gì?', 'allocate', [['allocate', 'Dùng tiền đã nhận: O và U giảm 4 triệu, N không đổi'], ['receive-again', 'Nhận thêm 4 triệu'], ['close-order', 'Tự đóng toàn bộ đơn']])
    }
  ];
  function commandFor(state, index) {
    const order = state.headers[0], item = state.lines[0];
    switch (steps[index].action) {
      case 'createOrder': return { type: 'createOrder', customerId: 'KH01', productId: 'SP01', quantity: 10 };
      case 'confirmOrder': return { type: 'confirmOrder', orderId: order.id };
      case 'invoice': return { type: 'invoice', orderLineId: item.id, packingSlipId: state.packingSlips[0].id, quantity: 6 };
      case 'recordPayment': return { type: 'recordPayment', customerId: 'KH01', amount: 4000000 };
      case 'settle': return { type: 'settle', customerId: 'KH01', paymentId: state.payments[0].id, invoiceId: state.invoices[0].id, amount: 4000000 };
      default: return { type: steps[index].action, orderLineId: item.id, quantity: 6 };
    }
  }
  function guidedProgress(state) {
    const p = state.lessonProgress.guided;
    if (p === undefined) return { version: 1, predictions: {}, reviews: {}, final: {} };
    if (!p || p.version !== 1 || !p.predictions || !p.reviews || !p.final || [p.predictions, p.reviews, p.final].some(x => typeof x !== 'object' || Array.isArray(x))) reject('Tiến độ bài học không đúng phiên bản. Dữ liệu được giữ nguyên; hãy đặt lại riêng guided nếu muốn bắt đầu lại.');
    return p;
  }
  function inspectCase(state) {
    D.validate(state, 'guided');
    if (state.events.length > steps.length) reject('Bài có chứng từ ngoài case chuẩn. Hãy đặt lại riêng guided.');
    let prefix = Seed.createDataset('guided');
    state.events.forEach((event, index) => {
      const expected = commandFor(prefix, index), actual = event.command;
      if (Object.keys(actual).length !== Object.keys(expected).length + 1 || !Object.keys(expected).every(k => expected[k] === actual[k])) reject('Chứng từ không khớp case hướng dẫn. Không công nhận hoàn thành; hãy đặt lại riêng guided.');
      prefix = D.execute(prefix, actual, event.createdAt);
    });
    return state.events.length;
  }
  function finalCorrect(value) {
    return value.O === 2000000 && value.U === 0 && value.N === 2000000 && value.backorder === 4 && value.reason === 'order-open' && value.zeroNet === 'still-open';
  }
  function guidedStatus(state) {
    try {
      const count = inspectCase(state), p = guidedProgress(state);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (p.predictions[i] !== step.prediction.correct) return { phase: 'predict', index: i, step, count, selected: p.predictions[i] || '', explanation: p.predictions[i] ? root.O2C.Insights.explanations[step.action] : '' };
        if (i >= count) return { phase: 'operate', index: i, step, count };
        if (p.reviews[i] !== step.review.correct) return { phase: 'review', index: i, step, count, selected: p.reviews[i] || '', explanation: root.O2C.Insights.explanations[step.action] };
      }
      const m = D.lineMetrics(state, state.lines[0].id), b = D.balances(state, 'KH01');
      if (m.backorder !== 4 || m.shipped !== 6 || m.invoiced !== 6 || m.openInvoices !== 2000000 || b.O !== 2000000 || b.U !== 0 || b.N !== 2000000) reject('Số liệu thực tế chưa đúng trạng thái đích của case.');
      return { phase: finalCorrect(p.final) ? 'complete' : 'final', count, final: p.final, tried: Object.keys(p.final).length > 0 };
    } catch (error) { return { phase: 'invalid', error: error.message }; }
  }
  function answer(state, kind, index, choice) {
    const status = guidedStatus(state);
    const expectedPhase = kind === 'predictions' ? 'predict' : 'review';
    if (status.phase !== expectedPhase || status.index !== index) reject('Câu hỏi không thuộc bước đang học. Hãy xem lại bước hiện tại.');
    const q = kind === 'predictions' ? status.step.prediction : status.step.review;
    if (!q.options.some(x => x.value === choice)) reject('Hãy chọn một đáp án có cấu trúc.');
    const next = copy(state), p = copy(guidedProgress(state));
    p[kind][index] = choice; next.lessonProgress.guided = p;
    return next;
  }
  function answerFinal(state, value) {
    if (guidedStatus(state).phase !== 'final') reject('Chưa đến phần kiểm tra cuối bài.');
    if (!['O', 'U', 'N', 'backorder'].every(k => Number.isSafeInteger(value[k]))) reject('Hãy nhập số nguyên cho ba số dư và lượng còn chờ giao.');
    if (!['order-open', 'all-complete'].includes(value.reason) || !['still-open', 'closed'].includes(value.zeroNet)) reject('Hãy chọn lý do cho cả hai câu hỏi.');
    const next = copy(state), p = copy(guidedProgress(state));
    p.final = { O: value.O, U: value.U, N: value.N, backorder: value.backorder, reason: value.reason, zeroNet: value.zeroNet };
    next.lessonProgress.guided = p;
    return next;
  }
  function nextCommand(state, requestId) {
    const status = guidedStatus(state);
    if (status.phase !== 'operate') reject('Hãy trả lời đúng câu dự đoán hoặc kiểm tra tác động trước khi làm bước tiếp theo.');
    return { ...commandFor(state, status.index), requestId };
  }
  function assertCurrentCommand(state, command) {
    const expected = nextCommand(state, command.requestId);
    if (JSON.stringify(expected) !== JSON.stringify(command)) reject('Thao tác không đúng bước hướng dẫn hiện tại.');
  }
  function startPractice(state) {
    if (state.mode !== 'practice' || state.events.length) reject('Bài hoàn tất đơn phải bắt đầu từ dữ liệu practice mới.');
    const next = copy(state);
    next.lessonProgress.practiceExercise = { version: 1, kind: 'order-2' };
    return next;
  }
  function practiceStatus(state) {
    const active = state.lessonProgress.practiceExercise?.kind === 'order-2';
    if (!active) return { active: false, complete: false };
    const target = state.lines.find(l => l.productId === 'SP01' && l.orderedQty === 2 && l.unitPriceSnapshot === 1000000 && state.headers.find(h => h.id === l.orderId)?.customerId === 'KH01');
    return { active: true, orderId: target?.orderId, complete: !!target && D.lineMetrics(state, target.id).complete };
  }
  root.O2C.Lessons = { steps, guidedStatus, answer, answerFinal, nextCommand, assertCurrentCommand, startPractice, practiceStatus };
})(globalThis);
