# O2C Learning Lab — V1.1

Web tiếng Việt giúp người mới phân biệt **thiếu hàng, thiếu hóa đơn, thiếu tiền và thiếu cấn trừ**. Một kho, hai khách, ba sản phẩm; nhiều đơn, mỗi đơn một dòng. Hai chế độ độc lập nhưng dùng chung logic chứng từ, tồn và số dư.

## Mở trên Windows

1. Tải [ZIP trên nhánh phát triển](https://github.com/phuccoder22/Hoc_Github_Baitap1/archive/refs/heads/o2c-moc-1.zip), hoặc chọn đúng nhánh `o2c-moc-1` trên GitHub → **Code → Download ZIP**.
2. Nhấp phải ZIP → **Extract All / Giải nén tất cả**. Không mở khi vẫn ở trong ZIP.
3. Mở thư mục giải nén, nhấp phải **index.html → Open with → Edge hoặc Chrome**.
4. Giữ `styles.css` và toàn bộ `js` cạnh HTML. Không cần mạng, server, npm, Python, API key hoặc tài khoản D365 để dùng app.

App dùng script cổ điển, không CDN, font ngoài, API hoặc fetch file cục bộ. Dữ liệu lưu theo trình duyệt/đường dẫn; khi nâng cấp đừng xóa thư mục cũ trước khi tự kiểm tra dữ liệu cần giữ. V1.1 chưa có nhập/xuất bản sao lưu.

## Học có hướng dẫn

Chọn **Học có hướng dẫn** ở đầu trang. Bài dùng riêng `guided`; không thay dữ liệu tự thực hành.

1. Đọc vai trò và chỉ dẫn của bước.
2. Chọn đáp án **dự đoán trước thao tác** → **Kiểm tra dự đoán**.
3. Khi đúng, chọn **Xem trước bước này**. Bảng trước/sau mở sẵn; đọc lý do rồi **Ghi nhận** nếu đồng ý.
4. Trả lời câu **giải thích tác động** sau thao tác. Sai được xem giải thích và thử lại, không tạo lại chứng từ.
5. Lặp đến đủ tám thao tác rồi làm kiểm tra cuối bằng số tiền VND, lượng còn chờ giao và lý do.

Case: đặt 10 SP01, tồn 6, giao 6, invoice 6 triệu, payment 4 triệu, settlement 4 triệu. Sau payment O/U/N=6/4/2 triệu; sau settlement là **2/0/2 triệu**. Payment 4 triệu dùng hết; invoice 6 triệu còn mở 2 triệu; còn 4 sản phẩm chờ giao.

Chỉ khi trạng thái thật và các câu trả lời đều đúng, app hiện **“Bài học hoàn thành; đơn chưa hoàn tất”**. Có đúng 8 sự kiện nghiệp vụ; dự đoán/trả lời/xem lại/lưu không thêm sự kiện. Tải lại giữ bước và câu hỏi nếu localStorage đã lưu được; không tự làm lại nghiệp vụ đã xong.

## Tự thực hành: hoàn tất một đơn nhỏ

Chọn **Tự thực hành → Bắt đầu bài đơn 2 sản phẩm**. App hỏi xác nhận vì sẽ thay riêng dữ liệu practice bằng dữ liệu mới. Hủy thì giữ nguyên; guided không bị xóa. Bắt đầu bài chưa tạo đơn hoặc chứng từ nào.

Bạn tự làm từng thao tác, mỗi lần **Xem trước → Ghi nhận**:

| Bước | Chọn / nhập |
| --- | --- |
| Tạo đơn mới | Công ty An Phát, SP01 Gạch lát nền, lượng **2**, giá chốt **1 triệu** |
| Confirm đơn bán | Xác nhận nội dung; chưa giảm tồn |
| Giữ hàng | **2** cho đúng đơn |
| Picking | **2** từ phần đã giữ |
| Giao hàng — Packing slip | **2**; đây là lần giao duy nhất, không có Shipment bổ sung |
| Lập hóa đơn | Chọn phiếu giao của đơn, lượng **2** → invoice 2 triệu |
| Ghi nhận thanh toán | Đúng khách An Phát, **2000000** VND |
| Settlement | Chọn payment/invoice cùng khách, **2000000** VND |

Sau payment: O/U/N=2/2/0 triệu nhưng invoice vẫn mở, đơn chưa hoàn tất. Chỉ sau giao đủ, invoice đủ và các invoice của đơn hết số dư, app mới công nhận đơn và bài practice hoàn tất. Không tự nhận tiền, phân bổ hoặc đóng đơn thay bạn.

Bạn vẫn có thể tự tạo nhiều đơn và xử lý từng phần ngoài bài mẫu. Chọn các nút SO để xem đơn; nguồn giữ/lấy được app tự phân bổ theo thứ tự tạo và đúng đơn, không cần chọn ID kỹ thuật.

## Đọc lý do đơn chưa hoàn tất

Trong chi tiết đơn có bốn số khác nhau:

- **Còn chờ giao:** lượng đặt trừ lượng đã giao, còn gọi Backorder; không phải tiền nợ.
- **Đã giao nhưng chưa lập hóa đơn:** phần có thể invoice ngay.
- **Chưa giao nên chưa đủ điều kiện lập hóa đơn:** phần chưa được invoice trong simulator.
- **Số dư mở invoice thuộc riêng đơn:** chỉ cộng invoice của đơn đó.

Nút “Đi đến…” chỉ mở/chọn form phù hợp, không tạo chứng từ. Nếu kho thiếu, lab giải thích giới hạn chưa nhập kho và vẫn cho xử lý phần đủ điều kiện; không tự tăng tồn.

**Payment thuộc khách, không thuộc riêng đơn.** Nếu hai đơn cùng khách dư invoice 2 và 3 triệu, khách có U=4 triệu, thì U dùng chung là 4 triệu, không phải mỗi đơn đã được dành riêng 4 triệu. Bạn chọn payment/invoice và số tiền khi settlement. Phần thiếu tiền ròng của khách cũng không được gán làm dư riêng từng đơn.

## Ba số dư và nhật ký

Phần **“Đã nhận tiền — cần xác định tiền trả hóa đơn nào”** hiển thị số liệu thực:

- **O = tổng hóa đơn − tổng settlement:** invoice còn mở.
- **U = tổng payment − tổng settlement:** tiền đã ghi nhận chưa cấn trừ.
- **N = O − U = tổng hóa đơn − tổng payment:** số dư ròng khách.

N dương: khách thiếu tiền ròng so với tổng invoice đã lập. N=0: hai tổng bằng nhau nhưng invoice cụ thể có thể vẫn mở. N âm: khách có tiền dư trong mô hình. N không phải số dư riêng của một đơn.

Settlement **dùng tiền đã nhận, không nhận thêm tiền**: O và U giảm cùng số tiền, N không đổi. Không tự settlement khi N=0.

Mở từng dòng trong **Nhật ký nghiệp vụ** để xem chứng từ, lượng/tiền, lý do và bảng trước/sau, kể cả Tạo đơn/Confirm không đổi tồn/tiền. Mở/đóng nhật ký không chạy lại nghiệp vụ. Preview dùng cùng phép tính nghiệp vụ trên bản sao; Ghi nhận kiểm tra lại state hiện tại.

## Lưu, chuyển chế độ và đặt lại

App tự thử lưu dataset đầy đủ của chế độ hiện tại vào localStorage. Hash `#guided`/`#practice` giữ chế độ khi tải lại. Dữ liệu/tiến độ hai chế độ dùng hai khóa riêng; chuyển qua lại không sao chép hoặc trộn chứng từ.

- **Đã lưu:** có thể tải lại ở cùng trình duyệt/đường dẫn; hãy thử một bước nhỏ trước khi học lâu vì `file://` tùy chính sách trình duyệt.
- **Chưa lưu / phiên tạm:** vẫn thao tác và đổi chế độ trong phiên, nhưng đóng/tải lại có thể mất phần chưa lưu. **Thử lưu lại** không tạo lại nghiệp vụ. Chưa có xuất JSON hoặc bản sao lưu tải xuống.
- Đọc dữ liệu hỏng/không hỗ trợ: giữ nguyên bản lưu cũ, báo phiên tạm, không âm thầm ghi đè. Tiến độ guided không khớp case cũng không được coi đã hoàn thành.
- **Đặt lại** hỏi xác nhận, chỉ xóa chứng từ và tiến độ của chế độ đang chọn. Chế độ khác giữ nguyên. “Bắt đầu bài đơn 2” cũng cần xác nhận thay riêng practice.

Chỉ dùng một tab. Không hỗ trợ migration, cộng tác hoặc đồng bộ; đổi đường dẫn/trình duyệt hay xóa dữ liệu trình duyệt có thể không còn thấy dữ liệu cũ. Dữ liệu mốc 1 cùng schema/khóa vẫn đọc được; không sửa lịch sử cũ chỉ để thêm bảng nhật ký.

## Giới hạn

Chưa có nhập kho, thuế, giá vốn, doanh thu kế toán, GL, credit management, aging, collections, X++, tích hợp, AI/API, nhiều dòng/kho, sửa/hủy/đảo chứng từ hoặc nhập/xuất JSON. Chỉ giữ vật lý hiện có là giới hạn lab, không phải luật của mọi ERP. D365 có các biến thể reservation, invoicing và settlement tùy cấu hình.

V1.1 có một case guided và một bài practice hoàn tất đơn 2. Ngân hàng 18 tình huống trong docs không phải 18 bài đã xây. Đây là mô phỏng học tập, không phải bản sao D365 hoặc sổ kế toán thật.

## Kiểm tra dành cho người phát triển

Người dùng cuối không cần thực hiện phần này.

- `node tests/domain.test.cjs`: nghiệp vụ/lưu mốc 1, dùng Node test/assert tích hợp sẵn.
- `node tests/v11.test.cjs`: lịch sử, chẩn đoán, công thức, tiến độ/đáp án thật, cô lập và bài đơn 2.
- `node tests/browser-smoke.cjs` và `node tests/v11-browser.cjs`: cần Playwright và Chromium chỉ trong môi trường phát triển; mặc định thử `file://`. Có thể chọn executable bằng `CHROMIUM_PATH`.
- Nếu môi trường chặn file://, trên Linux chạy riêng `O2C_TEST_TRANSPORT=route node tests/browser-smoke.cjs` và `O2C_TEST_TRANSPORT=route node tests/v11-browser.cjs`. Origin ảo chỉ cấp các file của dự án, mạng tắt, không server/API ngoài. Kết quả này **không xác nhận file:// hoặc Windows**.

### Kết quả thực tế V1.1 ngày 29/10/2026

| Kiểm tra | Kết quả |
| --- | --- |
| Nghiệp vụ/lưu mốc 1 (`domain.test.cjs`), Node 24.19.0 | **18/18 đạt**, 0 thất bại, 0 bỏ qua |
| Logic V1.1 (`v11.test.cjs`) | **12/12 đạt**, gồm fixture dữ liệu thật tạo từ mã mốc 1 commit e21134b; 0 thất bại, 0 bỏ qua |
| Hồi quy trình duyệt (`browser-smoke.cjs`, transport route) | **5/5 nhóm đạt**: case chính, nhiều đơn/partial, double-confirm đơn và payment, reload, lỗi quota/quyền, dữ liệu hỏng và reset/cancel |
| Trình duyệt V1.1 (`v11-browser.cjs`, transport route) | **6/6 nhóm đạt**: nhật ký/preview thật, hai đơn cùng khách, N=0/N âm, guided đủ bước/sai/thử lại/reload/cô lập, bài đơn 2 và lỗi lưu tiến độ |
| `v11-browser.cjs` mặc định mở file trực tiếp | **Bị môi trường chặn** ngay khi điều hướng: `ERR_BLOCKED_BY_ADMINISTRATOR` trên file://. Chưa chạy các ca app bằng file:// |
| Edge/Chrome Windows, thư mục giải nén có dấu/khoảng trắng | **Chưa chạy**; không nghiệm thu Windows |

Kiểm tra trình duyệt đã chạy trên Chromium 154.0.8037.57/Linux headless, origin ảo phục vụ file địa phương, mạng tắt, không request dịch vụ ngoài. Không có lỗi JavaScript chưa xử lý trong các luồng đã chạy. Đã kiểm bảng lịch sử/preview nhìn thấy dữ liệu trên giao diện, không chỉ kiểm hàm tính. Không còn ca app thất bại trong các suite đã hoàn tất; file:// và Windows vẫn là giới hạn chưa kiểm chứng. Tài liệu/lịch sử mốc 1 không được coi là bằng chứng nghiệm thu Windows.

 Tài liệu hiện hành ở docs. `review-o2c.md` giữ nguyên bản ghép thiết kế cũ, không cập nhật tự động và không là nguồn quy tắc V1.1.
