'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
require('../js/seed.js'); require('../js/domain.js'); require('../js/insights.js'); require('../js/lessons.js'); require('../js/storage.js');
const { Seed, Domain: D, Insights: I, Lessons: L, Storage } = O2C;
let serial = 0;
const cmd = (type, data) => ({ type, ...data, requestId: `v11-${++serial}` });
function lab(mode = 'practice') {
  let state = Seed.createDataset(mode);
  return {
    get state() { return state; },
    run(type, data) { state = D.execute(state, cmd(type,data)); return state; },
    order(q) { this.run('createOrder',{customerId:'KH01',productId:'SP01',quantity:q}); const h=state.headers.at(-1),l=state.lines.at(-1); this.run('confirmOrder',{orderId:h.id}); return {h,l}; },
    qty(type,o,q) { this.run(type,{orderLineId:o.l.id,quantity:q}); },
    invoice(o,q,slip=state.packingSlips.at(-1)) { this.run('invoice',{orderLineId:o.l.id,packingSlipId:slip.id,quantity:q}); return state.invoices.at(-1); },
    delivered(q,total=q) { const o=this.order(total); for(const t of ['reserve','pick','postPackingSlip'])this.qty(t,o,q); return {...o,invoice:this.invoice(o,q)}; },
    pay(amount) { this.run('recordPayment',{customerId:'KH01',amount}); return state.payments.at(-1); },
    settle(p,i,amount) { this.run('settle',{customerId:'KH01',paymentId:p.id,invoiceId:i.id,amount}); }
  };
}
function fullGuide(beforeAnswer) {
 let state=Seed.createDataset('guided');
 for(let index=0;index<8;index++) {
  state=L.answer(state,'predictions',index,L.steps[index].prediction.correct);
  state=D.execute(state,L.nextCommand(state,`guide-${++serial}`));
  if(beforeAnswer)beforeAnswer(state,index);
  state=L.answer(state,'reviews',index,L.steps[index].review.correct);
 }
 return state;
}
function memory(){const map=new Map();return{map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};}
const final={O:2000000,U:0,N:2000000,backorder:4,reason:'order-open',zeroNet:'still-open'};
test('Nhật ký: mọi sự kiện có dữ liệu trước/sau và xem lại không gọi nghiệp vụ',()=>{
 const x=lab();const o=x.delivered(6,10);const p=x.pay(4000000);x.settle(p,o.invoice,4000000);
 const before=JSON.stringify(x.state), original=D.execute;
 D.execute=()=>{throw new Error('Review must not execute business operations');};
 let views;try{views=I.timeline(x.state);}finally{D.execute=original;}
 assert.equal(JSON.stringify(x.state),before);assert.equal(views.length,8);
 assert(views.every(v=>v.rows.length>0&&v.documents.length>0));
 assert.deepEqual(views[0].rows.find(r=>r.label==='Lượng đặt'),{label:'Lượng đặt',before:0,after:10,kind:'quantity'});
 assert.equal(views[1].rows.find(r=>r.kind==='boolean').before,false);
 assert.equal(views[1].rows.find(r=>r.kind==='boolean').after,true);
 assert.equal(views[5].amount,6000000);
 const st=views[7];assert.equal(st.amount,4000000);assert.match(st.explanation,/không nhận thêm tiền/);
 assert.deepEqual(st.rows.find(r=>r.label.startsWith('N —')),{label:'N — Số dư ròng của khách',before:2000000,after:2000000,kind:'money'});
 assert.equal(st.rows.find(r=>r.label.startsWith('PAY-')).after,0);
});
test('Xem trước cùng execute nhưng không ghi Event; trạng thái mới được kiểm lại khi xác nhận',()=>{
 const state=Seed.createDataset('practice'), command=cmd('createOrder',{customerId:'KH01',productId:'SP01',quantity:10});
 const candidate=D.execute(state,command), view=I.preview(state,candidate);
 assert.equal(state.events.length,0);assert.equal(state.headers.length,0);assert.equal(view.rows[0].after,10);
 const x=lab(),a=x.order(6),b=x.order(1);
 const previewCommand=cmd('reserve',{orderLineId:a.l.id,quantity:6});
 D.execute(x.state,previewCommand);x.qty('reserve',b,1);
 assert.throws(()=>D.execute(x.state,previewCommand),/khả dụng/);
});
test('Hai đơn cùng khách: O riêng từng đơn, U dùng chung không được dành riêng',()=>{
 const x=lab(),a=x.delivered(2),b=x.delivered(3),p=x.pay(4000000);
 const before=JSON.stringify(x.state), da=D.orderDiagnosis(x.state,a.h.id), db=D.orderDiagnosis(x.state,b.h.id);
 assert.equal(da.openInvoices,2000000);assert.equal(db.openInvoices,3000000);
 assert.equal(da.customerUnapplied,4000000);assert.equal(db.customerUnapplied,4000000);
 assert.equal(da.customerFundingShortfall,1000000);assert.equal(db.customerFundingShortfall,1000000);
 assert.equal(JSON.stringify(x.state),before);
 x.settle(p,a.invoice,2000000);
 assert.equal(D.orderDiagnosis(x.state,a.h.id).openInvoices,0);
 assert.equal(D.orderDiagnosis(x.state,b.h.id).openInvoices,3000000);
 assert.equal(D.orderDiagnosis(x.state,b.h.id).customerUnapplied,2000000);
});
test('Chẩn đoán phân biệt chưa giao, đã giao chưa invoice và thiếu tiền/cấn trừ',()=>{
 const x=lab(),o=x.order(10);x.qty('reserve',o,6);x.qty('pick',o,6);x.qty('postPackingSlip',o,6);
 let d=D.orderDiagnosis(x.state,o.h.id);
 assert.equal(d.backorder,4);assert.equal(d.readyToInvoice,6);assert.equal(d.notDeliveredForInvoice,4);assert.equal(d.physicalShortfall,4);
 x.invoice(o,6);const p=x.pay(6000000);d=D.orderDiagnosis(x.state,o.h.id);
 assert.equal(d.openInvoices,6000000);assert.equal(d.customerUnapplied,6000000);assert.equal(d.customerFundingShortfall,0);assert.equal(d.complete,false);
 x.settle(p,x.state.invoices[0],6000000);assert.equal(D.orderDiagnosis(x.state,o.h.id).complete,false);
});
test('Công thức tổng thật đúng với N dương, bằng 0 và âm',()=>{
 const x=lab(),o=x.delivered(2);
 assert.deepEqual(D.customerTotals(x.state,'KH01'),{invoices:2000000,payments:0,settlements:0});
 const p=x.pay(2000000);assert.deepEqual(D.balances(x.state,'KH01'),{O:2000000,U:2000000,N:0});
 assert.equal(D.lineMetrics(x.state,o.l.id).complete,false);
 x.settle(p,o.invoice,2000000);x.pay(1000000);
 assert.deepEqual(D.customerTotals(x.state,'KH01'),{invoices:2000000,payments:3000000,settlements:2000000});
 assert.deepEqual(D.balances(x.state,'KH01'),{O:0,U:1000000,N:-1000000});
});
test('Guided: đoán sai, giải thích sai được thử lại, không tạo lại chứng từ',()=>{
 let s=Seed.createDataset('guided');
 s=L.answer(s,'predictions',0,'stock');assert.equal(L.guidedStatus(s).phase,'predict');assert.equal(s.events.length,0);
 assert.throws(()=>L.nextCommand(s,'no-operation'));
 s=L.answer(s,'predictions',0,'unchanged');const before=JSON.stringify(s);
 const c=L.nextCommand(s,'first-guided');const preview=D.execute(s,c);assert.equal(JSON.stringify(s),before);
 L.assertCurrentCommand(s,c);s=D.execute(s,c);assert.equal(L.guidedStatus(s).phase,'review');
 s=L.answer(s,'reviews',0,'paid');assert.equal(L.guidedStatus(s).phase,'review');assert.equal(s.events.length,1);
 assert.throws(()=>L.nextCommand(s,'duplicate-step'));
 s=L.answer(s,'reviews',0,'request');assert.equal(L.guidedStatus(s).index,1);assert.equal(s.revision,1);
 assert.equal(preview.headers.length,1);D.validate(s,'guided');
});
test('Guided: reload giữa dự đoán/thao tác/câu hỏi giữ đúng bước và cô lập practice',()=>{
 const mem=memory(),store=Storage.createStore(()=>mem);
 const practice=lab();practice.delivered(1);store.save(practice.state);
 const rawPractice=mem.getItem('o2c-lab.practice.v1');
 let s=Seed.createDataset('guided');s=L.answer(s,'predictions',0,'unchanged');store.save(s);
 s=store.open('guided').state;assert.equal(L.guidedStatus(s).phase,'operate');
 s=D.execute(s,L.nextCommand(s,'reload-step'));store.save(s);
 s=store.open('guided').state;assert.equal(L.guidedStatus(s).phase,'review');assert.equal(s.events.length,1);
 s=L.answer(s,'reviews',0,'request');store.save(s);assert.equal(L.guidedStatus(store.open('guided').state).index,1);
 store.reset('guided');assert.equal(mem.getItem('o2c-lab.practice.v1'),rawPractice);
});
test('Guided đủ 8 nghiệp vụ, kiểm tra cuối sai chưa hoàn thành, đúng mới hoàn thành bài',()=>{
 let s=fullGuide((current,index)=>{assert.equal(current.events.length,index+1);D.validate(current,'guided');});
 assert.equal(L.guidedStatus(s).phase,'final');assert.equal(s.events.length,8);assert.equal(s.revision,8);
 s=L.answerFinal(s,{...final,O:0});assert.equal(L.guidedStatus(s).phase,'final');
 s=L.answerFinal(s,{...final,zeroNet:'closed'});assert.equal(L.guidedStatus(s).phase,'final');
 s=L.answerFinal(s,final);assert.equal(L.guidedStatus(s).phase,'complete');assert.equal(s.events.length,8);
 assert.equal(D.lineMetrics(s,s.lines[0].id).complete,false);
 const mem=memory(),store=Storage.createStore(()=>mem);store.save(s);
 assert.equal(L.guidedStatus(store.open('guided').state).phase,'complete');
});
test('Không tin cờ completed hoặc đáp án nếu trạng thái thật chưa đúng case',()=>{
 let s=Seed.createDataset('guided');s.lessonProgress.completed=true;
 assert.equal(L.guidedStatus(s).phase,'predict');
 s.lessonProgress.guided={version:1,predictions:Object.fromEntries(L.steps.map((x,i)=>[i,x.prediction.correct])),reviews:Object.fromEntries(L.steps.map((x,i)=>[i,x.review.correct])),final};
 assert.equal(L.guidedStatus(s).phase,'operate');assert.throws(()=>L.answerFinal(s,final));
 const altered=D.execute(Seed.createDataset('guided'),cmd('createOrder',{customerId:'KH01',productId:'SP01',quantity:2}));
 assert.equal(L.guidedStatus(altered).phase,'invalid');
});
test('Bài practice 2: bắt đầu mới không tự tạo đơn, nhận đủ tiền chưa đủ để hoàn tất',()=>{
 let s=L.startPractice(Seed.createDataset('practice'));assert.equal(s.events.length,0);assert.equal(s.headers.length,0);
 const run=(t,data)=>{s=D.execute(s,cmd(t,data));};
 run('createOrder',{customerId:'KH01',productId:'SP01',quantity:2});const h=s.headers[0],l=s.lines[0];run('confirmOrder',{orderId:h.id});
 for(const t of ['reserve','pick','postPackingSlip'])run(t,{orderLineId:l.id,quantity:2});
 run('invoice',{orderLineId:l.id,packingSlipId:s.packingSlips[0].id,quantity:2});run('recordPayment',{customerId:'KH01',amount:2000000});
 assert.equal(L.practiceStatus(s).complete,false);assert.equal(D.balances(s,'KH01').N,0);
 run('settle',{customerId:'KH01',invoiceId:s.invoices[0].id,paymentId:s.payments[0].id,amount:2000000});
 assert.equal(L.practiceStatus(s).complete,true);assert.equal(s.events.length,8);D.validate(s,'practice');
});
test('Bắt đầu/reset practice không xóa guided; dữ liệu mốc 1 vẫn đọc được',()=>{
 const mem=memory(),store=Storage.createStore(()=>mem);let guided=fullGuide();guided=L.answerFinal(guided,final);store.save(guided);
 const raw=mem.getItem('o2c-lab.guided.v1');let exercise=L.startPractice(store.reset('practice').state);store.save(exercise);
 assert.equal(mem.getItem('o2c-lab.guided.v1'),raw);assert.equal(L.practiceStatus(store.open('practice').state).active,true);
 const old=lab();old.delivered(1);store.save(old.state);assert.deepEqual(store.open('practice').state,old.state);
});

test('Đọc fixture đã lưu thật từ mốc 1 e21134b và dựng bảng lịch sử cũ',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'fixtures/milestone1-practice.json'),'utf8');
 const old=JSON.parse(raw),mem=memory();mem.setItem('o2c-lab.practice.v1',raw);
 const opened=Storage.createStore(()=>mem).open('practice');
 assert.equal(opened.status.saved,true);assert.deepEqual(opened.state,old);assert.equal(mem.getItem('o2c-lab.practice.v1'),raw);
 assert.deepEqual(D.inventory(opened.state,'SP01'),{actual:6,reserved:2,available:4,pickedOpen:0});
 assert(I.timeline(opened.state).every(view=>view.rows.length>0));assert.equal(opened.state.events.length,3);
});
