(function (root) {
  'use strict';
  const app = root.O2C;
  function createStore(getStorage) {
    const protectedModes = new Set();
    const key = mode => `o2c-lab.${mode}.v1`;
    function save(state) {
      if (protectedModes.has(state.mode)) return { saved: false, message: 'Đang dùng phiên tạm; dữ liệu cũ không bị ghi đè vì đọc/kiểm tra bị lỗi. Đóng trang có thể mất dữ liệu phiên. Chỉ đặt lại nếu bạn đồng ý bỏ dữ liệu cũ.' };
      try {
        getStorage().setItem(key(state.mode), JSON.stringify(state));
        return { saved: true, message: 'Đã lưu trên trình duyệt này. Chỉ dùng một tab; đổi đường dẫn hoặc trình duyệt có thể không thấy cùng dữ liệu.' };
      } catch {
        return { saved: false, message: 'Chưa lưu trên máy do trình duyệt chặn lưu hoặc hết dung lượng. Vẫn dùng được trong phiên; đóng trang có thể mất dữ liệu. Có thể thử lưu lại. V1.1 chưa có xuất file sao lưu.' };
      }
    }
    function open(mode) {
      let raw;
      try { raw = getStorage().getItem(key(mode)); }
      catch {
        protectedModes.add(mode);
        return { state: app.Seed.createDataset(mode), status: save(app.Seed.createDataset(mode)) };
      }
      if (raw === null) {
        const state = app.Seed.createDataset(mode);
        return { state, status: save(state) };
      }
      try {
        const state = app.Domain.validate(JSON.parse(raw), mode);
        return { state, status: { saved: true, message: 'Đã khôi phục dữ liệu lưu. Chỉ dùng một tab. Dữ liệu gắn với trình duyệt và đường dẫn hiện tại.' } };
      } catch {
        protectedModes.add(mode);
        const state = app.Seed.createDataset(mode);
        return { state, status: save(state) };
      }
    }
    function reset(mode) {
      protectedModes.delete(mode);
      const state = app.Seed.createDataset(mode);
      return { state, status: save(state) };
    }
    return { open, save, reset };
  }
  app.Storage = { createStore };
})(globalThis);
