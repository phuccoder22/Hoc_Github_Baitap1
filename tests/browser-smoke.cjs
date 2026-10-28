'use strict';
// Development-only: Playwright + Chromium. The app itself has no dependencies.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const transport = process.env.O2C_TEST_TRANSPORT || 'file';
if (!['file', 'route'].includes(transport)) throw new Error('Choose file or route transport');
const appUrl = transport === 'file' ? pathToFileURL(path.join(root, 'index.html')).href : 'https://o2c.test/index.html';
const key = 'o2c-lab.practice.v1';
let passed = 0;
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const version = browser.version();
  try {
    async function scenario(name, run, init) {
      const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 1000 } });
      if (transport === 'route') {
        // Test-only virtual HTTPS origin, all responses served from local files. No server or remote connection.
        const assets = new Set(['index.html', 'styles.css', 'js/seed.js', 'js/domain.js', 'js/storage.js', 'js/app.js']);
        await context.route('https://o2c.test/**', route => {
          const name = new URL(route.request().url()).pathname.slice(1);
          if (!assets.has(name)) return route.fulfill({ status: 404, body: 'Not found' });
          return route.fulfill({ status: 200, body: fs.readFileSync(path.join(root, name)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' });
        });
      }
      if (init) await context.addInitScript(init);
      const page = await context.newPage();
      const errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', req => { if (/^https?:/.test(req.url()) && !(transport === 'route' && req.url().startsWith('https://o2c.test/'))) requests.push(req.url()); });
      try {
        await page.goto(appUrl);
        await page.locator('#inventory-rows tr').first().waitFor();
        await run(page);
        assert.deepEqual(errors, [], 'no unhandled browser errors');
        assert.deepEqual(requests, [], 'no HTTP(S) requests while offline');
        passed++; console.log(`PASS ${name.replace('file://', transport === 'file' ? 'file://' : 'virtual HTTPS route')}`);
      } finally { await context.close(); }
    }
    const read = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const balance = (page, customerId = 'KH01') => page.evaluate(({ key, customerId }) => O2C.Domain.balances(JSON.parse(localStorage.getItem(key)), customerId), { key, customerId });
    async function commit(page, double = false) {
      await page.locator('#preview-dialog[open]').waitFor();
      if (double) await page.locator('#commit').evaluate(button => { button.click(); button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      else await page.locator('#commit').click();
      assert.equal(await page.locator('#preview-dialog').evaluate(d => d.open), false);
    }
    async function order(page, quantity, customer = 'KH01', double = false) {
      await page.locator('#order-customer').selectOption(customer);
      await page.locator('#order-quantity').fill(String(quantity));
      await page.locator('#order-form button').click();
      await commit(page, double);
    }
    async function operation(page, type, quantity) {
      await page.locator('#operation-kind').selectOption(type);
      if (quantity !== undefined) await page.locator('#operation-quantity').fill(String(quantity));
      await page.locator('#operation-form button').click();
      await commit(page);
    }
    async function payment(page, amount) {
      await page.locator('#payment-amount').fill(String(amount));
      await page.locator('#payment-form button').click(); await commit(page, true); // Also duplicate a payment confirmation, where quantity limits cannot hide duplication.
    }
    async function settle(page, amount) {
      await page.locator('#settlement-amount').fill(String(amount));
      await page.locator('#settlement-form button').click(); await commit(page);
    }
    await scenario('file:// ngoại tuyến: case chính, double-confirm, reload, reset riêng practice', async page => {
      assert.equal(new URL(page.url()).protocol, transport === 'file' ? 'file:' : 'https:');
      assert.equal((await read(page)).events.length, 0);
      await page.evaluate(() => localStorage.setItem('o2c-lab.guided.v1', 'guided-sentinel'));
      await page.locator('#order-quantity').fill('10');
      await page.locator('#order-form button').click();
      assert.equal((await read(page)).headers.length, 0, 'preview does not persist business activity');
      await page.locator('#cancel-preview').click();
      assert.equal((await read(page)).events.length, 0, 'cancel does not add Event');
      await order(page, 10, 'KH01', true);
      assert.equal((await read(page)).headers.length, 1);
      assert.equal((await read(page)).events.length, 1);
      await operation(page, 'confirmOrder');
      await operation(page, 'reserve', 6);
      await operation(page, 'pick', 6);
      await operation(page, 'postPackingSlip', 6);
      await operation(page, 'invoice', 6);
      await payment(page, 4000000);
      assert.deepEqual(await balance(page), { O: 6000000, U: 4000000, N: 2000000 });
      await page.reload();
      assert.equal((await read(page)).events.length, 7);
      assert.deepEqual(await balance(page), { O: 6000000, U: 4000000, N: 2000000 });
      await settle(page, 4000000);
      assert.deepEqual(await balance(page), { O: 2000000, U: 0, N: 2000000 });
      assert.equal((await read(page)).events.length, 8);
      assert.match(await page.locator('#financial-documents').innerText(), /chưa cấn trừ 0/);
      assert.match(await page.locator('#order-detail').innerText(), /Đơn chưa hoàn tất/);
      assert.match(await page.locator('#order-detail').innerText(), /Còn chờ giao\s+4/);
      assert.match(await page.locator('#document-flow').innerText(), /PAY-0001 → I-0001/);
      await page.locator('#retry-save').click();
      assert.equal((await read(page)).events.length, 8);
      await page.reload();
      assert.deepEqual(await balance(page), { O: 2000000, U: 0, N: 2000000 });
      await page.screenshot({ path: '/tmp/o2c-m1-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile has no page-level overflow');
      await page.screenshot({ path: '/tmp/o2c-m1-mobile.png', fullPage: true });
      await page.locator('#reset').click(); await page.locator('#cancel-reset').click();
      assert.equal((await read(page)).events.length, 8);
      await page.locator('#reset').click(); await page.locator('#confirm-reset').click();
      assert.equal((await read(page)).events.length, 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('o2c-lab.guided.v1')), 'guided-sentinel');
      assert.deepEqual(await page.locator('[data-product="SP01"] td.number').allTextContents(), ['6', '0', '6', '0']);
    });
    await scenario('file://: nhiều đơn, chặn lấy sai đơn, giữ 6/lấy 4/giao 3, đơn nhỏ hoàn tất', async page => {
      await order(page, 6); await operation(page, 'confirmOrder'); await operation(page, 'reserve', 6); await operation(page, 'pick', 4);
      await order(page, 1); await operation(page, 'confirmOrder');
      await page.locator('#operation-kind').selectOption('pick');
      await page.locator('#operation-quantity').fill('1');
      const before = JSON.stringify(await read(page));
      await page.locator('#operation-form button').click();
      assert.match(await page.locator('#notice').innerText(), /chính đơn/);
      await page.waitForFunction(() => { const r = document.getElementById('notice').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, null, { timeout: 3000 });
      assert.equal(JSON.stringify(await read(page)), before);
      await page.locator('[data-order="practice:SO-0001"]').click();
      await operation(page, 'postPackingSlip', 3);
      assert.deepEqual(await page.locator('[data-product="SP01"] td.number').allTextContents(), ['3', '3', '0', '1']);
      await page.locator('#reset').click(); await page.locator('#confirm-reset').click();
      await order(page, 2); await operation(page, 'confirmOrder'); await operation(page, 'reserve', 2); await operation(page, 'pick', 2); await operation(page, 'postPackingSlip', 2); await operation(page, 'invoice', 2);
      await payment(page, 2000000);
      assert.deepEqual(await balance(page), { O: 2000000, U: 2000000, N: 0 });
      assert.match(await page.locator('#order-detail').innerText(), /Đơn chưa hoàn tất/);
      await settle(page, 2000000);
      assert.match(await page.locator('#order-detail').innerText(), /Đơn hoàn tất/);
      await page.locator('#finance-customer').selectOption('KH02');
      assert.deepEqual(await page.locator('#settlement-invoice option').allTextContents(), ['Chưa có invoice còn mở']);
    });
    await scenario('file://: quota lỗi, phiên vẫn thao tác, retry không thêm Event, lưu phục hồi', async page => {
      assert.match(await page.locator('#storage-status').innerText(), /Chưa lưu trên máy/);
      await order(page, 1);
      assert.match(await page.locator('#event-count').innerText(), /1 sự kiện/);
      await page.locator('#retry-save').click();
      assert.match(await page.locator('#event-count').innerText(), /1 sự kiện/);
      await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
      await page.locator('#retry-save').click();
      assert.equal((await read(page)).events.length, 1);
      assert.match(await page.locator('#storage-status').innerText(), /Đã lưu/);
    }, () => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); }; });
    await scenario('file://: localStorage getter bị chặn vẫn mở được và thao tác trong phiên', async page => {
      assert.match(await page.locator('#storage-status').innerText(), /phiên tạm/);
      await order(page, 1);
      assert.match(await page.locator('#event-count').innerText(), /1 sự kiện/);
      await page.locator('#retry-save').click();
      assert.match(await page.locator('#event-count').innerText(), /1 sự kiện/);
    }, () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }); });
    await scenario('file://: dữ liệu hỏng không bị ghi đè đến khi đồng ý đặt lại', async page => {
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), '{bad');
      await order(page, 1);
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), '{bad');
      await page.locator('#reset').click(); await page.locator('#cancel-reset').click();
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), '{bad');
      await page.locator('#reset').click(); await page.locator('#confirm-reset').click();
      assert.equal((await read(page)).events.length, 0);
    }, () => localStorage.setItem('o2c-lab.practice.v1', '{bad'));
    console.log(`RESULT ${passed}/5 browser scenarios passed; Chromium ${version}; Linux; ${transport === 'file' ? 'file://' : 'virtual HTTPS route (NOT file://)'}; offline. Windows/Edge not tested.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
