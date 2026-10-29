# O2C Learning Lab — Kế hoạch và nghiệm thu V1.1

## 1. Hiện trạng và mục tiêu

Mốc 1 đã có tám nghiệp vụ, nhiều đơn một dòng, phân bổ tự động, lưu và reset practice. V1.1 giúp người mới trả lời: **đơn thiếu hàng, thiếu hóa đơn, thiếu tiền hay thiếu cấn trừ?** Không thay các công thức và điều kiện đã chốt trong [business-rules.md](business-rules.md).

Khi kiểm tra trước sửa, Tạo đơn/Confirm không có bảng trước/sau vì giao diện chỉ lọc chỉ tiêu tồn/tiền có chênh lệch. Không phải mất dữ liệu nghiệp vụ. V1.1 đọc lại chứng từ theo sequence để dựng cả trạng thái đơn và các giá trị không đổi, không execute khi xem lịch sử.

## 2. Thứ tự triển khai V1.1

| Phần | Thay đổi | Tiêu chí nghiệm thu |
| --- | --- | --- |
| 1. Nhật ký | Chứng từ, lượng/tiền, giải thích, bảng trước/sau cho mọi sự kiện | Tạo đơn/Confirm không trống; settlement hiện N không đổi và không nhận thêm tiền; mở/đóng không đổi state/Event |
| 2. Chẩn đoán đơn | Bốn chỉ tiêu riêng: còn chờ giao, giao chưa invoice, chưa giao chưa đủ điều kiện invoice, dư invoice của đơn; nút đi đến form | Hai đơn cùng khách có dư invoice riêng; U/thiếu tiền ròng là cấp khách, không tự dành tiền hoặc settlement |
| 3. Ba số dư | Tổng thực và phép tính O/U/N; giải thích dấu N; tiêu đề rõ | N=0 vẫn có thể có invoice mở, N âm không lỗi; không dùng N làm dư riêng của đơn |
| 4. Preview | Bảng mở sẵn, giải thích và cùng Domain.execute trên bản sao | Xem trước/hủy không có Event; xác nhận kiểm tra mode/revision và execute lại trên state mới nhất |
| 5. Guided | Case thiếu hàng tám bước, dự đoán trước/giải thích sau/kiểm tra cuối có cấu trúc | Đúng cả chứng từ và đáp án mới hoàn thành bài; sai được thử lại; reload giữ bước; đúng 8 Event; đơn vẫn mở |
| 6. Practice đơn 2 | Bắt đầu từ seed mới có xác nhận, người học tự làm đủ tám thao tác | Nhận 2 triệu có N=0 vẫn chưa xong nếu chưa settlement; sau giao/invoice đủ và hết dư invoice mới hoàn tất; reset không xóa guided |

Chưa thêm nhập kho, thuế, giá vốn/doanh thu kế toán, GL, credit management, aging, collections, X++, AI/API, integrations, nhập/xuất JSON, migration, nhiều tab hoặc 18 bài học. Ngân hàng 18 tình huống vẫn là nguồn kiểm tra, không là số bài được triển khai.

## 3. Cấu trúc mã

```text
index.html                  File mở trực tiếp; script cổ điển defer
styles.css                  CSS/font hệ thống, không CDN
js/
  seed.js                   Hai mode, cùng danh mục và cấu trúc
  domain.js                 Tám giao dịch, tồn/số dư, tổng khách, chẩn đoán đơn
  insights.js               Đọc lịch sử và mô tả tác động; không execute khi xem lại
  lessons.js                Case, câu hỏi, tiến độ dẫn từ chứng từ, bài practice 2
  storage.js                Hai khóa độc lập, kiểm tra/ghi JSON đầy đủ, lỗi lưu/reset
  app.js                    Giao diện, hash mode, cache phiên, preview và xác nhận
tests/
  domain.test.cjs            Hồi quy nghiệp vụ/lưu mốc 1
  v11.test.cjs               Chẩn đoán, lịch sử, tiến độ, cô lập, hoàn tất đơn
  browser-smoke.cjs          Hồi quy trình duyệt
  v11-browser.cjs            Các luồng V1.1 qua điều khiển giao diện
```

Không server, fetch dữ liệu cục bộ, ES modules, bundler, tài nguyên ngoài hoặc runtime cần cài cho người dùng. Playwright/Node chỉ phục vụ phát triển/kiểm tra. Hai mode gọi cùng domain, không có hàm “giữ/giao/cấn trừ” riêng cho guided.

## 4. Dữ liệu và tương thích

Giữ schemaVersion 1, hai khóa `o2c-lab.practice.v1` và `o2c-lab.guided.v1`. Dữ liệu mốc 1 có lessonProgress rỗng vẫn đọc được; không viết lại chứng từ/snapshot cũ để thêm bảng lịch sử. Tiến độ học dùng phần lessonProgress đã dành sẵn; không cộng Event/revision nghiệp vụ khi trả lời hoặc lưu. Domain.validate kiểm tra phần nghiệp vụ độc lập; Lessons kiểm tra bước/đáp án/case.

Guided chỉ có case chuẩn; dữ liệu không khớp hoặc phiên bản tiến độ không hỗ trợ thì báo rõ, không công nhận hoàn thành hoặc âm thầm reset. Reset cần xác nhận và chỉ chạm mode hiện tại. Bài practice đơn 2 đặt lại riêng practice có xác nhận, không tự tạo đơn. Cache phiên giữ dữ liệu khi chuyển mode nếu lưu thất bại; reload chỉ bảo toàn phần đã lưu thành công. Hash #guided/#practice giữ chế độ khi tải lại.

## 5. Kiểm tra

- `node tests/domain.test.cjs`: mọi quy tắc cũ, gồm các TH trọng tâm, không biến đổi state khi lỗi, không mượn nguồn đơn/khách, idempotency, lỗi lưu và hai mode.
- `node tests/v11.test.cjs`: bảng lịch sử có dữ liệu và không execute; xem trước không ghi; chẩn đoán hai đơn cùng khách; công thức O/U/N và dấu N; bài guided sai/thử lại/reload/chống completed giả; bài practice 2 và tương thích dữ liệu mốc 1.
- `node tests/browser-smoke.cjs`: mặc định thử `file://`, có biến `CHROMIUM_PATH` để chọn Chromium. `O2C_TEST_TRANSPORT=route` là kiểm tra qua origin ảo cấp file nội bộ, mạng tắt, không phải kiểm chứng file://.
- `node tests/v11-browser.cjs`: bảng nhật ký nhìn thấy được, số dư từng đơn so với U cấp khách, điều hướng không tự ghi, dự đoán/giải thích/final sai và thử lại, reload ở các thời điểm, cô lập/reset, bài đơn 2, lỗi lưu tiến độ.

Kết quả thật (đạt/thất bại/chưa chạy hoặc bị môi trường chặn) ghi ở README sau khi thực thi. Không suy thành công từ số ca dự kiến hoặc chỉ mở trang.

## 6. Giới hạn nghiệm thu

Cần thử mở file trực tiếp ngoại tuyến ngay trong công việc này. Nếu Chromium của môi trường chặn file://, ghi lỗi cụ thể; kiểm tra qua origin ảo chỉ chứng minh giao diện/logic/storage trên origin đó. Không dùng Linux/headless hoặc ảnh chụp làm bằng chứng Windows.

Nghiệm thu Edge và Chrome Windows trên thư mục giải nén có dấu/khoảng trắng vẫn cần chạy thật trên Windows. Kiểm tra tải lại/localStorage, đổi chế độ, reset, cả guided và practice; không cần server hoặc key. Không đổi chính sách môi trường để né hạn chế file://.
