# O2C Learning Lab — Mốc 1

Ứng dụng tiếng Việt để tự thực hành Order to Cash: tạo đơn → Confirm → giữ hàng → Picking → Packing slip → Invoice → Payment → Settlement. Dữ liệu giả định, một kho, hai khách, ba sản phẩm; nhiều đơn, mỗi đơn một dòng.

## Mở trên Windows

1. Tải repository thành ZIP (trên GitHub: **Code → Download ZIP**) hoặc tải thư mục dự án về máy.
2. Nhấp phải file ZIP → **Extract All / Giải nén tất cả**. Không mở app khi vẫn ở bên trong ZIP.
3. Mở thư mục đã giải nén, tìm `index.html`. Nhấp phải → **Open with / Mở bằng → Microsoft Edge hoặc Google Chrome**.
4. Giữ `styles.css` và thư mục `js` cạnh `index.html`. Không chuyển riêng file HTML ra chỗ khác. Nếu JavaScript bị tắt, bật lại trong trình duyệt.

Không cần mạng, server, npm, Python, API key hoặc D365 để sử dụng. App không tải CDN/font/dữ liệu ngoài và không fetch file cục bộ. Các lệnh kiểm thử ở cuối README chỉ dành cho người phát triển.

## Làm case đầu tiên

Mỗi biểu mẫu có hai bước: **Xem trước → Ghi nhận**. Xem trước hoặc Quay lại chưa tạo chứng từ. Có câu hỏi để tự dự đoán tác động; mở “Xem tác động dự kiến trước → sau” để đối chiếu. Chưa chấm điểm/bộ bài hướng dẫn trong mốc này.

1. **Tạo đơn mới:** chọn Công ty An Phát, Gạch lát nền, số lượng **10**. Header là thông tin chung; Line là hàng/ lượng/giá. Giá mẫu SP01 là 1.000.000 VND, tồn đầu 6; đặt vượt tồn được phép.
2. Trong đơn đang chọn, chọn **Confirm đơn bán** → Xem trước → Ghi nhận. Không giảm tồn hoặc sinh invoice.
3. Chọn **Giữ hàng**, nhập **6**, ghi nhận. Đơn giữ 6; tồn thực tế vẫn 6, khả dụng còn 0. Lab chỉ giữ vật lý đang có; ERP thật có thể có chính sách khác.
4. Chọn **Picking — lấy hàng**, nhập **6**, ghi nhận. Hàng được lấy nhưng vẫn nằm trong tồn và lượng giữ.
5. Chọn **Giao hàng — Packing slip**, nhập **6**, ghi nhận. Tồn, giữ và lấy chưa giao về 0; đơn còn **4 Còn chờ giao (Backorder)**. PackingSlip là bản ghi giao hàng duy nhất, không thêm Shipment.
6. Chọn **Lập hóa đơn**, chọn phiếu PS của đơn, nhập **6**, ghi nhận. Invoice là 6.000.000 VND.
7. Ở khu vực kế toán, kiểm tra khách đang xem là **Công ty An Phát**. Ghi nhận payment **4.000.000**. Khi này O/U/N = **6/4/2 triệu**: invoice vẫn mở 6, payment chưa cấn trừ 4, ròng 2.
8. Chọn payment PAY và invoice I của cùng khách, nhập settlement **4.000.000**, ghi nhận. O/U/N = **2/0/2 triệu**. **Payment 4 triệu dùng hết; invoice 6 triệu còn mở 2 triệu; đơn còn 4 sản phẩm chờ giao.** Settlement không giảm ròng thêm lần nữa.

Dòng chứng từ theo đơn và Nhật ký nghiệp vụ giúp đối chiếu. Case này có đúng **8 sự kiện nghiệp vụ**, không đếm xem trước/dự đoán/lưu. Đơn chưa hoàn tất. Muốn thử đơn hoàn tất, đặt lại rồi đặt/giao/invoice **2**, payment **2 triệu**, settlement **2 triệu**.

## Tự thử thêm

- Chọn các nút SO để đổi đơn; có thể tạo nhiều đơn cùng sản phẩm. Giữ/lấy/giao chỉ dùng nguồn của đúng đơn, ứng dụng tự phân bổ theo thứ tự tạo.
- Có thể giữ/lấy/giao/invoice từng phần; invoice phải chọn phiếu giao còn lượng chưa xuất.
- Có thể ghi payment trước invoice. Settlement là bước riêng; một payment trả được nhiều invoice của **cùng khách**, kể cả khác đơn. Không chuyển payment sang khách khác.
- “Còn chờ giao” là số lượng đặt trừ đã giao, không phải số tiền nợ. Ba trạng thái giao, invoice và trả tiền được hiển thị riêng. Ròng 0 chưa bảo đảm invoice đã được settlement.
- Thử chuỗi **giữ 6, lấy 4, giao 3**: thực tế 3; giữ 3; khả dụng 0; lấy chưa giao 1.

## Lưu và đặt lại

App tự thử lưu bằng localStorage của trình duyệt sau mỗi nghiệp vụ. Xem thông báo lưu ở đầu trang; nút **Thử lưu lại** không chạy lại nghiệp vụ hoặc tạo thêm chứng từ.

- **Đã lưu:** có thể tải lại ở cùng trình duyệt/đường dẫn. `file://` và chế độ riêng tư phụ thuộc chính sách trình duyệt; hãy tự thử tải lại một đơn nhỏ trước khi làm lâu.
- **Chưa lưu / phiên tạm:** vẫn thao tác trong bộ nhớ, nhưng đóng/tải lại có thể mất dữ liệu. Thử lưu lại khi trình duyệt cho phép. **Mốc 1 chưa có nhập/xuất JSON hoặc bản sao lưu tải xuống**, đừng đóng trang nếu cần giữ dữ liệu phiên chưa lưu.
- Đọc dữ liệu lỗi/không hỗ trợ: dùng phiên tạm và giữ nguyên bản lưu cũ, không tự ghi đè. Chỉ **Đặt lại thực hành → Đồng ý đặt lại** mới cho thay bằng dữ liệu mẫu.
- Hủy hộp thoại đặt lại không đổi dữ liệu. Đồng ý đặt lại xóa toàn bộ chứng từ practice; không chạm guided. Reset không tạo sự kiện nghiệp vụ mới.

Chỉ mở **một tab**. Chưa xử lý nhiều tab, migration hoặc đồng bộ; đổi đường dẫn thư mục, trình duyệt hay xóa dữ liệu trình duyệt có thể mất liên kết với dữ liệu cũ. Không dùng lab làm sổ kế toán thật.

## Phạm vi hiện có và để sau

Mốc 1 có tự thực hành đầy đủ tám thao tác, số liệu từ chứng từ, phân bổ tự động, lỗi nghiệp vụ không sửa trạng thái, xem trước và chống xác nhận trùng. Có cấu trúc dataset `practice`/`guided` riêng và chung một domain; **chưa có giao diện/bộ bài guided**. Ngân hàng 18 tình huống trong docs dùng làm nguồn kiểm tra, không phải 18 bài đã xây.

Không có thuế, giá vốn, doanh thu kế toán, GL, X++, credit management, aging, collections, tích hợp, nhập kho, nhiều dòng/kho, sửa/hủy chứng từ. Có thể còn chờ giao vì thiếu hàng; đó là kết quả hợp lệ, không tự tăng tồn để đóng đơn. Đây không phải bản sao D365.

## Kiểm thử dành cho người phát triển

Không cần thực hiện phần này để mở app.

- Logic nghiệp vụ và lưu (chỉ Node.js, không package ngoài): `node tests/domain.test.cjs`.
- Trình duyệt: có Playwright và Chromium trong môi trường phát triển, chạy `node tests/browser-smoke.cjs`. Mặc định thử `file://`; cấu hình đường dẫn bằng `CHROMIUM_PATH` nếu cần.
- Khi môi trường quản lý chặn `file://`: trên Linux dùng `O2C_TEST_TRANSPORT=route node tests/browser-smoke.cjs` để kiểm giao diện/localStorage qua origin ảo cấp từ file dự án, không kết nối mạng ngoài hay server. Kết quả này **không xác nhận file:// hoặc Windows**.

### Kết quả kiểm tra thực tế ngày 28/10/2026

| Kiểm tra | Kết quả |
| --- | --- |
| `node tests/domain.test.cjs` — Node 24.19.0 | **18/18 đạt**, không skip; gồm case chính, TH02/04/05/06/07/08/09/12/18 và kiểm tra bổ sung về lỗi, lưu, mode, xác nhận trùng |
| `O2C_TEST_TRANSPORT=route node tests/browser-smoke.cjs` — Chromium 154.0.8037.57, Linux | **5/5 đạt** trên origin ảo do bộ kiểm thử cấp file, mạng tắt; không request dịch vụ ngoài. Kiểm case/ba số dư, reload, tạo nhiều đơn, partial, đơn nhỏ hoàn tất, double-confirm đơn/payment, lỗi quota/quyền, dữ liệu hỏng, reset/cancel và không xóa guided |
| `node tests/browser-smoke.cjs` — mở trực tiếp file | **Bị môi trường chặn**, Chromium trả `ERR_BLOCKED_BY_ADMINISTRATOR` ở điều hướng `file://`. Chưa kiểm chứng app hoặc localStorage trên file:// |
| Edge/Chrome trên Windows, giải nén thư mục có dấu/khoảng trắng | **Chưa chạy**; môi trường hiện tại là Linux. Cần kiểm nghiệm thu Windows riêng |

Đã rà cú pháp JavaScript, khoảng trắng diff và ảnh giao diện desktop/390px; không tràn ngang toàn trang ở kích thước đã kiểm. Chưa thấy lỗi ứng dụng còn tái hiện trong các kiểm tra đã chạy. Giới hạn chưa giải quyết: file:// bị chính sách môi trường chặn nên chưa thể nhận nghiệm thu mở file trực tiếp; localStorage qua origin ảo không chứng minh hành vi file://. Các phần ngoài mốc 1 được liệt kê ở trên, không được coi là đã triển khai.

 Tài liệu thiết kế hiện hành ở `docs/`. `review-o2c.md` là bản ghép nguyên văn trước lần triển khai này, được giữ nguyên theo yêu cầu trước, không là bản cập nhật tự động.
