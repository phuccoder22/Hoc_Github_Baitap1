'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const transport = process.env.O2C_TEST_TRANSPORT || 'file';
const url = transport === 'route' ? 'https://o2c.test/index.html' : pathToFileURL(path.join(root,'index.html')).href;
const key = 'o2c-lab.practice.v1', guidedKey = 'o2c-lab.guided.v1';
const read = (p,k=key) => p.evaluate(k=>localStorage.getItem(k),k);
const data = async (p,k=key) => JSON.parse(await read(p,k));
let passed=0;
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  async function scenario(name,run,init) {
   const c=await b.newContext({offline:true,viewport:{width:1440,height:1000}});
   if(transport==='route')await c.route('https://o2c.test/**',r=>{
    const n=new URL(r.request().url()).pathname.slice(1);
    if(!['index.html','styles.css','js/seed.js','js/domain.js','js/insights.js','js/lessons.js','js/storage.js','js/app.js'].includes(n))return r.fulfill({status:404,body:''});
    return r.fulfill({body:fs.readFileSync(path.join(root,n)),contentType:n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
   });
   if(init)await c.addInitScript(init);
   const p=await c.newPage(),errors=[],requests=[];
   p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!(transport==='route'&&r.url().startsWith('https://o2c.test/')))requests.push(r.url());});
   try {await p.goto(url);await p.locator('#inventory-rows tr').first().waitFor();await run(p);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);passed++;console.log('PASS',name);}finally{await c.close();}
  }
  async function commit(p,double=false){await p.locator('#preview-dialog[open]').waitFor();assert.equal(await p.locator('#preview-dialog details').getAttribute('open'),'');assert((await p.locator('#preview-changes tbody tr').count())>0);if(double)await p.locator('#commit').evaluate(el=>{el.click();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});else await p.locator('#commit').click();await p.locator('#preview-dialog').waitFor({state:'hidden'});}
  async function order(p,q){await p.locator('#order-quantity').fill(String(q));await p.locator('#order-form button').click();await commit(p);}
  async function op(p,t,q){await p.locator('#operation-kind').selectOption(t);if(q!==undefined)await p.locator('#operation-quantity').fill(String(q));await p.locator('#operation-form button').click();await commit(p);}
  async function delivered(p,q){await order(p,q);await op(p,'confirmOrder');for(const t of ['reserve','pick','postPackingSlip','invoice'])await op(p,t,q);}
  async function payment(p,n){await p.locator('#payment-amount').fill(String(n));await p.locator('#payment-form button').click();await commit(p);}
  async function settle(p,n){await p.locator('#settlement-amount').fill(String(n));await p.locator('#settlement-form button').click();await commit(p);}
  async function balances(p,expected){const actual=[];for(const k of ['O','U','N'])actual.push(Number((await p.locator(`[data-balance="${k}"] strong`).innerText()).replace(/[^0-9-]/g,'')));assert.deepEqual(actual,expected);}
  await scenario('Nhật ký và preview có bảng thật cho cả Tạo đơn/Confirm; xem lại không ghi nghiệp vụ',async p=>{
   const before=await read(p);await p.locator('#order-form button').click();assert.equal(await read(p),before);assert((await p.locator('#preview-changes tbody tr').count())>0);await p.locator('#cancel-preview').click();assert.equal(await read(p),before);
   await order(p,10);await op(p,'confirmOrder');for(const t of ['reserve','pick','postPackingSlip','invoice'])await op(p,t,6);await payment(p,4000000);await settle(p,4000000);
   const saved=await read(p);assert.equal((await data(p)).events.length,8);
   for(const detail of await p.locator('#event-list details').all()){await detail.locator('summary').click();assert((await detail.locator('tbody tr').count())>0);assert(await detail.locator('tbody td').first().isVisible());}
   assert.equal(await read(p),saved);
   const last=p.locator('#event-list details').first();assert.match(await last.innerText(),/không nhận thêm tiền/);assert.match(await last.innerText(),/4\.000\.000/);assert.match(await last.innerText(),/N — Số dư ròng/);
   await last.screenshot({path:'/tmp/o2c-v11-ledger.png'});
  });
  await scenario('Hai đơn cùng khách: invoice dư riêng 2/3 triệu; U 4 triệu dùng chung; nút điều hướng không tự cấn',async p=>{
   await delivered(p,2);await delivered(p,3);await payment(p,4000000);
   assert.match(await p.locator('[data-diagnosis="orderOpen"]').innerText(),/3\.000\.000/);
   assert.match(await p.locator('[data-diagnosis="finance"]').innerText(),/4\.000\.000/);
   assert.match(await p.locator('[data-diagnosis="finance"]').innerText(),/chưa được dành riêng/);
   await p.locator('[data-order="practice:SO-0001"]').click();
   assert.match(await p.locator('[data-diagnosis="orderOpen"]').innerText(),/2\.000\.000/);
   const before=await read(p);await p.locator('[data-go="settle"]').click();assert.equal(await read(p),before);assert.equal(await p.locator('#settlement-invoice').inputValue(),'practice:I-0001');
   await settle(p,2000000);await p.locator('[data-order="practice:SO-0002"]').click();
   assert.match(await p.locator('[data-diagnosis="orderOpen"]').innerText(),/3\.000\.000/);await balances(p,[3000000,2000000,1000000]);
   await p.locator('#order-diagnosis').screenshot({path:'/tmp/o2c-v11-diagnosis.png'});
  });
  await scenario('Ba công thức số thật và N=0 vẫn còn invoice mở; N âm được giải thích',async p=>{
   await delivered(p,2);await payment(p,2000000);await balances(p,[2000000,2000000,0]);
   assert.match(await p.locator('#balance-formulas').innerText(),/N bằng 0/);assert.match(await p.locator('[data-formula="O"]').innerText(),/2\.000\.000.*0.*2\.000\.000/);
   assert.match(await p.locator('[data-diagnosis="orderOpen"]').innerText(),/2\.000\.000/);assert.match(await p.locator('#order-detail').innerText(),/Đơn chưa hoàn tất/);
   assert.equal(await p.locator('[data-go="recordPayment"]').count(),0);assert.equal(await p.locator('[data-go="settle"]').count(),1);
   await payment(p,1000000);await balances(p,[2000000,3000000,-1000000]);assert.match(await p.locator('#balance-formulas').innerText(),/N âm/);
  });
  const predictions=['unchanged','not-shipped','6-6-0','still-6','four','6-0-6','6-4-2','2-0-2'];
  const reviews=['request','confirmation','lab-limit','inside','quantity','delivered-only','not-applied','allocate'];
  async function answer(p,choice){await p.locator('#lesson-choice').selectOption(choice);await p.locator('#lesson-answer-form button').click();}
  await scenario('Guided đủ 8 bước, thử lại, reload và hoàn thành theo trạng thái thật; không chạm practice',async p=>{
   await order(p,1);const practice=await read(p);
   await p.locator('[data-mode="guided"]').click();assert.equal(await p.locator('#finance-customer').isDisabled(),true);assert.equal((await data(p,guidedKey)).events.length,0);assert.equal(await p.locator('#order-form').isVisible(),false);
   await answer(p,'stock');assert.match(await p.locator('#learning-panel').innerText(),/chưa đúng/);assert.equal((await data(p,guidedKey)).events.length,0);
   await answer(p,predictions[0]);await p.reload();await p.locator('#guided-operate').waitFor();
   await p.locator('#guided-operate').click();assert.equal((await data(p,guidedKey)).events.length,0);await commit(p,true);
   await answer(p,'paid');assert.equal((await data(p,guidedKey)).events.length,1);
   await p.reload();await p.locator('#lesson-answer-form').waitFor();assert.match(await p.locator('#learning-panel').innerText(),/Giải thích tác động/);
   await answer(p,reviews[0]);
   for(let i=1;i<8;i++){
    await answer(p,predictions[i]);await p.locator('#guided-operate').click();const old=(await data(p,guidedKey)).events.length;await commit(p);
    assert.equal((await data(p,guidedKey)).events.length,old+1);
    if(i===6){await balances(p,[6000000,4000000,2000000]);await p.reload();await p.locator('#lesson-answer-form').waitFor();}
    await answer(p,reviews[i]);
   }
   await balances(p,[2000000,0,2000000]);assert.equal((await data(p,guidedKey)).events.length,8);
   for(const[k,v]of Object.entries({O:'0',U:'0',N:'0',backorder:'0'}))await p.locator('#final-'+k).fill(v);
   await p.locator('#final-reason').selectOption('all-complete');await p.locator('#final-zeroNet').selectOption('closed');await p.locator('#lesson-final-form button').click();assert.equal(await p.locator('#lesson-complete').count(),0);assert.equal((await data(p,guidedKey)).events.length,8);
   for(const[k,v]of Object.entries({O:'2000000',U:'0',N:'2000000',backorder:'4'}))await p.locator('#final-'+k).fill(v);
   await p.locator('#final-reason').selectOption('order-open');await p.locator('#final-zeroNet').selectOption('still-open');await p.locator('#lesson-final-form button').click();
   assert.equal(await p.locator('#lesson-complete').innerText(),'Bài học hoàn thành; đơn chưa hoàn tất');assert.equal(await read(p),practice);
   await p.reload();await p.locator('#lesson-complete').waitFor();assert.equal((await data(p,guidedKey)).events.length,8);
   await p.locator('#learning-panel').screenshot({path:'/tmp/o2c-v11-guided.png'});
   const guided=await read(p,guidedKey);await p.locator('[data-mode="practice"]').click();assert.equal(await read(p),practice);
   await p.locator('#start-practice-exercise').click();await p.locator('#cancel-reset').click();assert.equal(await read(p),practice);
   await p.locator('#start-practice-exercise').click();await p.locator('#confirm-reset').click();assert.equal((await data(p)).events.length,0);assert.equal(await read(p,guidedKey),guided);assert.equal(await p.locator('#order-quantity').inputValue(),'2');
  });
  await scenario('Bài đơn 2 bắt đầu mới, người học tự làm, chỉ hoàn tất sau settlement; reset không xóa guided',async p=>{
   await p.locator('[data-mode="guided"]').click();await answer(p,predictions[0]);const guided=await read(p,guidedKey);
   await p.locator('[data-mode="practice"]').click();await p.locator('#order-customer').selectOption('KH02');await p.locator('#order-product').selectOption('SP02');await p.locator('#start-practice-exercise').click();await p.locator('#confirm-reset').click();
   assert.equal(await p.locator('#order-customer').inputValue(),'KH01');assert.equal(await p.locator('#order-product').inputValue(),'SP01');assert.equal((await data(p)).headers.length,0);assert.equal((await data(p)).events.length,0);
   await delivered(p,2);await payment(p,2000000);assert.match(await p.locator('#order-detail').innerText(),/Đơn chưa hoàn tất/);assert.doesNotMatch(await p.locator('#learning-panel').innerText(),/đơn 2 sản phẩm đã hoàn tất/);
   const before=await read(p);await p.locator('[data-go="settle"]').click();assert.equal(await read(p),before);await settle(p,2000000);
   assert.match(await p.locator('#learning-panel').innerText(),/Hoàn thành bài tự thực hành/);assert.match(await p.locator('[data-diagnosis="finance"]').innerText(),/Đã kiểm tra: đơn giao đủ/);assert.equal((await data(p)).events.length,8);assert.equal(await read(p,guidedKey),guided);
   await p.reload();await p.locator('#learning-panel').waitFor();assert.match(await p.locator('#learning-panel').innerText(),/Hoàn thành bài tự thực hành/);
   await p.locator('#reset').click();await p.locator('#cancel-reset').click();assert.equal((await data(p)).events.length,8);
   await p.locator('#reset').click();await p.locator('#confirm-reset').click();assert.equal((await data(p)).events.length,0);assert.equal(await read(p,guidedKey),guided);
  });
  await scenario('Guided lỗi lưu giữ tiến độ trong phiên và khi chuyển chế độ, không hứa đã lưu',async p=>{
   await p.locator('[data-mode="guided"]').click();await answer(p,predictions[0]);assert.match(await p.locator('#storage-status').innerText(),/Chưa lưu/);
   await p.locator('[data-mode="practice"]').click();await p.locator('[data-mode="guided"]').click();await p.locator('#guided-operate').waitFor();
   await p.locator('#guided-operate').click();await commit(p);assert.match(await p.locator('#learning-panel').innerText(),/Giải thích tác động/);assert.equal(await read(p,guidedKey),null);
   assert.match(await p.locator('#event-count').innerText(),/1 sự kiện/);
  },()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='o2c-lab.guided.v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};});
  console.log(`RESULT ${passed}/6 V1.1 browser groups passed; Chromium ${b.version()}, Linux, ${transport==='route'?'virtual origin; NOT file://':'file://'}, offline. Windows not tested.`);
 } finally { await b.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
