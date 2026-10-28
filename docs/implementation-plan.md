# O2C Learning Lab — Kế hoạch triển khai

## 1. Điều chỉnh phạm vi theo yêu cầu mới

Mốc 1 cũ chỉ là khung giao diện; nay **mốc 1 là bản tự thực hành đủ tám thao tác**. Logic nhiều đơn, giữ/lấy/giao đúng đơn, invoice/payment/settlement, tính số dư, nhật ký và localStorage cơ bản đều có ở mốc 1. Mốc 6 chỉ hoàn thiện trải nghiệm và giải thích, không trì hoãn logic nhiều đơn.

Không đổi công thức nghiệp vụ trong [business-rules.md](business-rules.md). Sửa cách kết luận case: **payment 4 triệu được settlement hết, invoice 6 triệu còn mở 2 triệu, đơn còn 4 sản phẩm chờ giao**. “Settlement một phần” nếu nói về invoice phải nêu rõ; không ngụ ý payment vẫn chưa dùng hết.

[learning-scenarios.md](learning-scenarios.md) là ngân hàng 18 tình huống, không phải 18 bài phải xây ở mốc 1. Mốc 1 dùng case chính như hướng dẫn thao tác thủ công trong practice, chưa có bộ điều phối/chấm bài guided. Seed hỗ trợ hai dataset độc lập `practice`/`guided`, cả hai dùng chung domain.

**Chưa làm trong mốc 1:** nhập/xuất JSON, migration, xử lý nhiều tab; toàn bộ chế độ hướng dẫn; thuế, giá vốn, doanh thu kế toán, GL, integrations, X++, credit management, aging, collections. Review-o2c.md là bản ghép tài liệu trước lần điều chỉnh này, không phải nguồn quy tắc hiện hành.

## 2. Cấu trúc mốc 1

```text
index.html                 Mở trực tiếp, dùng script cổ điển defer
styles.css                 Trình bày tiếng Việt, không font/CDN bên ngoài
js/
  seed.js                  Danh mục và dataset độc lập theo mode
  domain.js                Execute, tự phân bổ, tính tồn/số dư từ chứng từ
  storage.js               Đọc/ghi, kiểm tra dữ liệu, lỗi lưu, reset riêng mode
  app.js                   Biểu mẫu, xem trước, ghi nhận một lần, truy vết
tests/
  domain.test.cjs           Kiểm tra nghiệp vụ và lưu bằng Node tích hợp sẵn
  browser-smoke.cjs         Kiểm tra trình duyệt bằng Playwright (chỉ phát triển)
docs/                      Thiết kế; không cần mở để chạy app
README.md                  Hướng dẫn Windows và giới hạn thực tế
```

Không fetch file cục bộ, ES modules, bundler, server hoặc API runtime. Domain không đọc DOM/localStorage. Mỗi lệnh trả trạng thái mới hoặc lỗi; lỗi không sửa đầu vào. Seed/dataset mode khác nhau vẫn dùng cùng execute và công thức. Reservation/Picking được tự phân bổ theo thứ tự tạo, không bắt chọn ID kỹ thuật. Chỉ có PackingSlip ghi nhận giao hàng, không tạo thêm Shipment.

Xem trước chạy trên bản sao, chưa ghi nghiệp vụ. Chỉ Ghi nhận mới cập nhật trạng thái và thử lưu. Mã requestId dùng một lần và kiểm tra trùng ở domain; giao diện tiêu thụ xác nhận trước khi render/lưu để bấm đúp không sinh hai chứng từ.

## 3. Các mốc và tiêu chí nghiệm thu

### Mốc 1 — Tự thực hành xuyên suốt

Phạm vi: một kho WH01, hai khách, ba sản phẩm theo seed; nhiều đơn, mỗi đơn một Header/Line; tạo → Confirm → Reservation → Picking → PackingSlip → Invoice → CustomerPayment → Settlement. Xử lý từng phần; tồn và O/U/N tính từ chứng từ; trạng thái giao/invoice/settlement riêng; nhãn **Còn chờ giao** có giải thích Backorder. Có dòng chứng từ, nhật ký và lỗi rõ sai ở đâu/vì sao/làm gì tiếp.

Có câu hỏi gợi dự đoán trong xem trước một số thao tác; chưa chấm điểm hoặc hoàn thành bài. Sự kiện chỉ là nghiệp vụ; học, xem trước, lưu, retry và reset không thêm Event. Case chính có đúng 8 Event; tạo Header/Line là một Event.

LocalStorage: ghi một dataset đầy đủ mỗi giao dịch; báo thành công/thất bại đúng thực tế, giữ phiên khi lỗi và cho thử lưu lại. Đọc dữ liệu lỗi không âm thầm ghi đè; reset phải xác nhận và chỉ tác động practice. Không hứa xuất JSON vì chưa làm. Chỉ một tab được hỗ trợ.

**Kiểm tra bắt buộc:** case chính và TH02, TH04, TH05, TH06, TH07, TH08, TH09, TH12, TH18. Chứng minh thêm:

- Giữ 6/lấy 4/giao 3 từ tồn 6 → thực tế 3, giữ còn lại 3, khả dụng 0, lấy chưa giao 1.
- Sau payment: O/U/N=6/4/2 triệu; sau settlement: 2/0/2 triệu; N không đổi do settlement.
- Đơn nhỏ đủ hàng, invoice và settlement hết có thể hoàn tất; N=0 chưa đủ để đóng invoice.
- Không dùng nguồn giữ/lấy sai đơn hoặc payment sai khách. Payment có thể trả nhiều đơn **cùng khách**; không gắn payment cố định vào một đơn.
- Sai thao tác giữ nguyên toàn bộ trạng thái. Một xác nhận bấm đúp chỉ ghi một lần.
- Thử mở index.html ngoại tuyến và localStorage ngay trong mốc 1. Nếu môi trường chặn `file://`, báo đúng bằng chứng/giới hạn, không nhận nghiệm thu Windows hoặc file:// thay cho kết quả khác.

README chỉ rõ giải nén rồi mở index.html bằng Edge/Chrome Windows, không cài công cụ phát triển để dùng app. Nghiệm thu Windows đầy đủ vẫn ở mốc cuối; lỗi môi trường kiểm thử phải phân biệt với lỗi app. Kết quả đã chạy được ghi ở README, không suy từ tài liệu hoặc số ca dự kiến.

### Mốc 2 — Hoàn thiện kiểm tra dữ liệu và truy vết

Không xây lại logic đã có ở mốc 1. Đào sâu kiểm tra dữ liệu lưu và trình bày quan hệ/chứng từ trên tập dữ liệu lớn hơn nếu cần. Đạt khi không phá ca hồi quy mốc 1, lỗi dữ liệu giải thích rõ, không mở rộng sang nhiều dòng/kho ngoài phê duyệt.

### Mốc 3 — Nội dung dự đoán và đối chiếu tác động

Mở rộng câu hỏi dự đoán trước thao tác, đối chiếu trước/sau và lý do; phân biệt O2C chung, D365, giới hạn lab. Đạt khi giải thích đúng các biến thể và ba số dư; không biến credit/GL/integrations trong nguồn đọc thêm thành tính năng. Logic tiền đã có ở mốc 1.

### Mốc 4 — Sao lưu và phục hồi nâng cao

Thiết kế/triển khai nhập/xuất JSON có kiểm tra; cân nhắc migration khi thực sự có schema mới và chính sách nhiều tab riêng. Đây là mốc sau, không làm ở task hiện tại. Đạt khi dữ liệu sai không ghi đè, khôi phục đúng quan hệ và mode; chỉ công bố hỗ trợ phần đã được kiểm chứng.

### Mốc 5 — Một bài hướng dẫn xuyên suốt

Xây bộ điều phối tám bước và kiểm tra hiểu ở learning-scenarios, dùng chung domain với practice. Đạt khi trạng thái thực và giải thích cùng đúng mới hoàn thành; dự đoán/trả lời/lưu không tăng 8 Event nghiệp vụ của case. Payment dùng hết nhưng invoice vẫn mở 2 triệu; đơn chờ giao 4 và chưa hoàn tất dù bài có thể hoàn thành.

### Mốc 6 — Trải nghiệm và khả năng giải thích

Hoàn thiện chọn/lọc nhiều đơn, đọc dòng chứng từ và hướng dẫn lỗi. Logic nhiều đơn và giữ đúng đơn đã có từ mốc 1. Đạt khi người mới xử lý/giải thích được các ca chọn trong ngân hàng mà không đọc mã; không yêu cầu xây đủ 18 màn hình bài học nếu chưa chốt phạm vi đó.

### Mốc 7 — Nghiệm thu Windows và đóng gói cuối

Kiểm Edge và Chrome trên Windows, mở trực tiếp file từ thư mục giải nén có dấu/khoảng trắng, ngoại tuyến, lưu/tải lại, reset và chức năng của các mốc đã thực sự hoàn thành. Ghi phiên bản Windows/trình duyệt, số ca đạt/thất bại/chưa chạy. Không lấy kết quả Linux/nguồn ảo làm bằng chứng Windows/file://. Không cần server/key/runtime cho người dùng cuối.

## 4. Cách kiểm tra mốc 1

`node tests/domain.test.cjs` chạy bộ kiểm tra logic bằng Node test/assert tích hợp sẵn. Đây là công cụ phát triển, không cần để mở app. Có cả kiểm số liệu, quan hệ, đầu vào lỗi, không đột biến trạng thái, idempotency, hai dataset và lỗi lưu.

`node tests/browser-smoke.cjs` mặc định thử mở `file://` bằng Chromium qua Playwright. Nếu chính sách trình duyệt chặn file://, có thể chạy riêng `O2C_TEST_TRANSPORT=route node tests/browser-smoke.cjs` trên Linux để kiểm giao diện/storage qua origin ảo phục vụ từ file địa phương; đây **không phải** xác nhận file://. Bộ kiểm thử chạy offline, không server hoặc kết nối dịch vụ ngoài. Playwright/Chromium chỉ là công cụ phát triển, không dependency của app. Chọn đường dẫn Chromium bằng biến `CHROMIUM_PATH` khi cần.

Không chạy nhiều suite ngoài phạm vi khi các kiểm tra liên quan đã đạt. Báo kết quả thực tế và giới hạn ở README và phản hồi task.
