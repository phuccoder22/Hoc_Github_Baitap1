(function (root) {
  'use strict';
  const app = root.O2C = root.O2C || {};
  function createDataset(mode) {
    if (!['guided', 'practice'].includes(mode)) throw new Error('Chế độ dữ liệu không hợp lệ.');
    return {
      schemaVersion: 1, mode, revision: 0, counters: {},
      customers: [{ id: 'KH01', name: 'Công ty An Phát' }, { id: 'KH02', name: 'Cửa hàng Bình Minh' }],
      products: [
        { id: 'SP01', name: 'Gạch lát nền', initialStock: 6, unitPrice: 1000000 },
        { id: 'SP02', name: 'Keo dán gạch', initialStock: 60, unitPrice: 50000 },
        { id: 'SP03', name: 'Ke chít mạch', initialStock: 40, unitPrice: 25000 }
      ],
      headers: [], lines: [], confirmations: [], reservations: [], pickings: [],
      packingSlips: [], invoices: [], payments: [], settlements: [], events: [],
      lessonProgress: {}
    };
  }
  app.Seed = { createDataset };
})(globalThis);
