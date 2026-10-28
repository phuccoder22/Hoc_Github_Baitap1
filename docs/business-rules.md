# O2C Learning Lab — Dữ liệu và quy tắc nghiệp vụ

## 1. Phân biệt kiến thức và giới hạn

**O2C chung:** ghi nhận đơn, chuẩn bị/giao hàng, lập hóa đơn, ghi nhận payment, chỉ định payment trả hóa đơn nào. Header/Line giúp tách thông tin chung và chi tiết hàng. Các ERP có nhiều cách tổ chức và cấu hình khác nhau.

**Liên hệ D365:** phần bán hàng/kho liên quan Dynamics 365 Supply Chain Management; customer payment/settlement liên quan Dynamics 365 Finance. Confirm, Picking và Post packing slip là các khái niệm khác nhau. D365 có thể reserve ordered inventory tùy cấu hình; có luồng giao hàng không yêu cầu đăng ký picking riêng; settlement có thể diễn ra khi post payment hoặc sau đó/tự động. Không suy từ workflow lab thành quy tắc chung của D365. Nguồn đối chiếu ở mục 10.

**Simulator V1:** manual physical reservation, Confirm trước giữ, Picking trước giao, invoice theo phiếu giao và settlement thủ công tách riêng payment. Đây là lựa chọn thiết kế để học, không là bộ quy tắc đầy đủ của ERP.

## 2. Quy ước và dữ liệu mẫu

Mỗi chế độ sở hữu dataset riêng, gồm danh mục, tồn, chứng từ, nhật ký và tiến độ. Không tra cứu hoặc tham chiếu xuyên chế độ. ID có thể giống về chữ nhưng chỉ có nghĩa trong dataset hiện tại.

| Loại | Mã | Tên | Tồn đầu | Đơn giá VND |
| --- | --- | --- | --- | --- |
| Khách hàng | KH01 | Công ty An Phát | — | — |
| Khách hàng | KH02 | Cửa hàng Bình Minh | — | — |
| Sản phẩm | SP01 | Gạch lát nền | 6 | 1.000.000 |
| Sản phẩm | SP02 | Keo dán gạch | 60 | 50.000 |
| Sản phẩm | SP03 | Ke chít mạch | 40 | 25.000 |

Cả `guided` và `practice` khởi tạo độc lập từ bảng này. SP01 được điều chỉnh để tính đúng case người dùng đã chọn; tên hàng giữ bối cảnh phân phối, không bắt buộc laptop trong memory. Đơn vị là “đơn vị học tập”, không quy đổi thùng/viên/kg; giá hoàn toàn giả định.

Một kho WH01, tiền VND, không số dư đầu của khách. Số lượng và số tiền nghiệp vụ là số nguyên dương, hữu hạn, nằm trong giới hạn số nguyên an toàn của JavaScript. Kiểm tra cả kết quả nhân/cộng/tích lũy; số dư ròng được phép âm. Giá chốt khi tạo line. Không thuế, phí, chiết khấu, write-off, tỷ giá hoặc bút toán GL. Thời gian máy chỉ để hiển thị; sequence xác định thứ tự; không hồi tố.

## 3. Thực thể và quan hệ

Các bản ghi nghiệp vụ có ID duy nhất trong dataset, mã dễ đọc, createdAt, sequence; bộ đếm không tái sử dụng. Mốc 1 triển khai mô hình này; chưa hỗ trợ migration, nhập/xuất JSON hoặc nhiều tab.

| Thực thể | Trường chính | Quan hệ / giới hạn |
| --- | --- | --- |
| Dataset | schemaVersion, mode, revision, counters, customers, products, documents, events, lessonProgress | Một bộ cho mỗi chế độ |
| Customer | id, name | Một khách có nhiều đơn/payment |
| Product | id, name, initialStock, unitPrice | Tồn đầu cố định, không nhập kho |
| SalesOrderHeader | id, customerId, currency=VND, warehouseId=WH01 | Thông tin chung; đúng một SalesOrderLine trong V1 |
| SalesOrderLine | id, orderId, lineNo=1, productId, orderedQty, unitPriceSnapshot | Mọi giữ/lấy/giao thuộc đúng line |
| OrderConfirmation | id, orderId, headerSnapshot, lineSnapshot | Tối đa một xác nhận cho mỗi đơn; không sửa đơn sau tạo trong V1 |
| Reservation | id, orderLineId, quantity | Một line có nhiều lần giữ; lượng gốc bất biến |
| Picking | id, orderLineId, quantity, reservationAllocations: [{reservationId, quantity}] | Lấy từ các phiếu giữ cùng line; có thể lấy từng phần |
| PackingSlip | id, orderLineId, quantity, allocations: [{pickingId, reservationId, quantity}] | Đây là bản ghi Shipment/giao hàng duy nhất; không thêm một Shipment trừ tồn lần nữa |
| Invoice | id, packingSlipId, quantity, unitPriceSnapshot, amount | Một packing slip nhiều invoice; mỗi invoice chỉ một packing slip |
| CustomerPayment | id, customerId, amount | Khoản thanh toán đã ghi nhận, không có journal draft trong V1 |
| Settlement | id, paymentId, invoiceId, amount | Liên kết payment–invoice cùng khách; nhiều-nhiều |
| Event | id, sequence, action, role, documentIds, before, after | Một sự kiện cho mỗi thao tác thành công; không là nguồn tính tồn/số dư |
| LessonProgress | lessonVersion, stepDocumentIds, answers, explanationChecks | Dùng tìm đối tượng/khôi phục câu hỏi; không thay thế kiểm tra nghiệp vụ |

Trong bản thiết kế trước, Cash Receipt/Cash Application là tên khái niệm. Từ bản này dùng CustomerPayment/Settlement nhất quán, không tạo thêm một cặp nghiệp vụ bên cạnh chúng.

Picking tự phân bổ các Reservation còn chưa được pick theo thứ tự tạo. Packing slip tự dùng các cặp Picking–Reservation còn chưa giao theo thứ tự tạo. Tổng lượng từng phân bổ phải bằng quantity của chứng từ; kiểm tra cặp nguồn tồn tại, cùng line, không dùng vượt lượng. “FIFO” ở đây chỉ là thứ tự dùng phiếu trong lab, không mô phỏng FIFO theo lô/ngày nhận hoặc tính giá vốn của D365.

## 4. Công thức tồn và lượng trên đơn

Ký hiệu `R.qty`, `P.qty`, `S.qty`, `I.qty` là lượng Reservation, Picking, PackingSlip, Invoice. Tất cả tổng chỉ dùng chứng từ của dataset hiện tại.

Với phiếu giữ R:

- `đã lấy từ R = tổng Picking.reservationAllocations.quantity tham chiếu R`.
- `đã giao từ R = tổng PackingSlip.allocations.quantity tham chiếu R`.
- `giữ còn lại(R) = R.qty − đã giao từ R`.
- `còn có thể lấy từ R = R.qty − đã lấy từ R`.

Với mỗi cặp Picking–Reservation: `đã lấy chưa giao = lượng phân bổ ở Picking − tổng lượng PackingSlip đã dùng đúng cặp đó`. Chưa giao thì vẫn thuộc lượng giữ; Picking không làm mất reservation và không giảm tồn.

Với sản phẩm:

- `tồn thực tế = tồn đầu − tổng PackingSlip.qty`.
- `đang giữ = tổng giữ còn lại(R)`.
- `khả dụng = tồn thực tế − đang giữ`.
- `đã lấy chưa giao = tổng lượng còn lại của các cặp Picking–Reservation` (là phần con của đang giữ, không trừ thêm lần nữa).

Với line có lượng đặt Q:

- `đã giao = tổng PackingSlip.qty`.
- `giữ còn lại của line = tổng giữ còn lại(R) thuộc line`.
- `còn cần giữ = Q − đã giao − giữ còn lại của line`.
- `đã lấy lũy kế = tổng Picking.qty`; `có thể lấy tiếp = giữ còn lại của line − đã lấy chưa giao của line`.
- `backorder / còn chờ giao = Q − đã giao`, bao gồm cả phần đã giữ/đã lấy nhưng chưa giao; không phải chỉ phần thiếu tồn, không phải dư nợ.
- `đã invoice = tổng Invoice.qty của line`; `đã giao chưa invoice = đã giao − đã invoice`.
- `còn phải invoice theo đơn = Q − đã invoice` khác với lượng đủ điều kiện invoice ngay.
- Với packing slip S: `còn được invoice = S.qty − tổng Invoice.qty thuộc S`.

Không dự báo ngày có hàng hoặc ngày giao. Case đặt 10, giữ 6: trước giao còn chờ giao 10, trong đó 6 đã được giữ và 4 chưa được giữ. Sau giao 6, backorder còn 4. Chưa có nhập kho nên 4 vẫn mở trong V1.

## 5. Ba số dư tài chính phải hiển thị riêng

Với invoice I: `amount = quantity × giá chốt line`; `đã settlement = tổng Settlement.amount của I`; `số dư mở(I) = amount − đã settlement`.

Với payment C: `chưa settlement(C) = C.amount − tổng Settlement.amount của C`.

Với một khách hàng:

1. **Số dư hóa đơn còn mở (O)** = tổng số dư mở các invoice của khách.
2. **Khoản thanh toán chưa cấn trừ (U)** = tổng phần chưa settlement các payment của khách.
3. **Số dư ròng của khách hàng (N)** = `O − U` = `tổng invoice − tổng payment` trong mô hình này.

O và U không âm. N có thể dương (khách còn nợ ròng), bằng 0 hoặc âm (khách có tiền dư). Không gọi riêng O là toàn bộ “customer balance” của D365. Công thức N chỉ tương ứng tập giao dịch giản lược của lab, không là công thức bao quát credit notes, chênh lệch tỷ giá hoặc số dư đầu trong hệ thống thật.

| Thao tác số tiền X | O | U | N |
| --- | --- | --- | --- |
| Invoice | Tăng X | Không đổi | Tăng X |
| Ghi nhận payment | Không đổi | Tăng X | Giảm X |
| Settlement payment–invoice | Giảm X | Giảm X | Không đổi |

Settlement không nhận thêm tiền. Trong V1 không có chiết khấu/tỷ giá/write-off nên settlement chỉ phân bổ, không đổi số dư ròng. D365 thật có thể phát sinh giao dịch điều chỉnh trong settlement theo cấu hình; chúng ngoài phạm vi này (ML07).

**Case bắt buộc, đơn vị triệu VND:** sau invoice 6: O/U/N = 6/0/6; sau ghi nhận payment 4: **6/4/2**; sau settlement 4: **2/0/2**. Không được mô tả “payment chưa settlement thì mọi loại công nợ đều không đổi”: chỉ O chưa đổi, N đã giảm.

**Ví dụ N = 0 chưa đủ:** invoice 2 triệu, payment 2 triệu chưa settlement → O=2, U=2, N=0; invoice vẫn mở, chưa được gọi đã trả đủ theo invoice.

## 6. Điều kiện và tác động của tám thao tác V1

| Thao tác | Điều kiện khi xác nhận | Tác động thành công |
| --- | --- | --- |
| Tạo đơn Header/Line | Khách/sản phẩm hợp lệ; một line; lượng/giá/tổng an toàn; cho đặt vượt tồn | Tạo header và line nguyên tử; chưa Confirm; không đổi tồn hoặc O/U/N |
| Confirm đơn | Đơn tồn tại, chưa có confirmation; snapshot khớp header/line | Tạo OrderConfirmation; không tự giữ/giao/invoice; không đổi tồn hoặc O/U/N |
| Giữ hàng | Đơn đã Confirm; lượng ≤ khả dụng vật lý và ≤ còn cần giữ của line | Tạo Reservation đúng line; đang giữ tăng, khả dụng giảm; tồn thực tế và O/U/N không đổi |
| Picking | Đơn đã Confirm; lượng ≤ phần giữ cùng line chưa pick | Tạo Picking và phân bổ; đã lấy chưa giao tăng; tồn thực tế/đang giữ/khả dụng/O/U/N không đổi |
| Giao / ghi nhận Packing slip | Lượng ≤ đã lấy chưa giao cùng line; các cặp nguồn hợp lệ và còn lượng | Tạo PackingSlip; giảm tồn thực tế, giữ còn lại, đã lấy chưa giao cùng lượng; khả dụng không đổi; chưa tăng O/U/N |
| Invoice | Có packing slip; lượng ≤ lượng chưa invoice của chính phiếu | Tạo Invoice đúng giá; O và N tăng amount; U/tồn không đổi |
| Ghi nhận payment | Khách tồn tại; số tiền hợp lệ; không cần có đơn hoặc invoice | Tạo CustomerPayment; U tăng, N giảm; O/tồn không đổi |
| Settlement | Payment và invoice tồn tại, cùng khách; tiền ≤ dư hai phía | Tạo Settlement; O và U giảm cùng amount; N/tồn không đổi |

Chặn sai trước ghi nhận, không tự ép đầu vào về giới hạn, không tự chuyển phần vượt sang đơn/khách khác. Không lấy/giao hàng của đơn khác dù cùng khách/sản phẩm. Không đổi quantity gốc của chứng từ. Không tự invoice khi giao hoặc settlement khi ghi payment. Trong lỗi, toàn bộ chứng từ, bộ đếm, revision, nhật ký thành công và tiến độ giữ nguyên.

Tám thao tác là thiết kế simulator. Confirm/Picking bắt buộc trong lab không chứng minh ERP thực tế luôn bắt buộc theo thứ tự này. Nút “xác nhận” trên biểu mẫu không tự tạo OrderConfirmation.

## 7. Trạng thái độc lập và hoàn tất

| Chỉ tiêu | Quy tắc |
| --- | --- |
| Confirm | Chưa xác nhận / đã có OrderConfirmation hợp lệ |
| Picking | Hiển thị đã lấy lũy kế và đã lấy chưa giao riêng, tránh mất dấu khi giao xong |
| Giao hàng | Chưa giao nếu 0; một phần nếu 0 < đã giao < Q; đủ nếu = Q |
| Invoice theo lượng đặt | Chưa nếu 0; một phần nếu 0 < đã invoice < Q; đủ nếu = Q |
| Thanh toán các invoice hiện có | Chưa có invoice / chưa settlement / settlement một phần / hết số dư mở các invoice hiện có |
| Backorder | Q − đã giao; không là trạng thái thanh toán hoặc cờ sửa tay |

`đơn hoàn tất của lab = đã giao = Q AND đã invoice = Q AND mọi invoice của đơn có số dư mở = 0`. Không dùng N=0 hoặc tổng tiền đã nhận để thay điều kiện này. Tiền dư của khách không quyết định hoàn tất một đơn. D365 “Invoiced” là trạng thái liên quan giao/invoice theo hệ thống, không chứng minh đã thu đủ; không dùng nhãn “Hoàn tất” của lab làm tên status D365.

`bài học hoàn thành = trạng thái đích case đúng AND kiểm tra giải thích tác động đạt`. Nó khác `đơn hoàn tất`. Cuối case: Confirm có; giao 6/10; invoice 6/10; backorder 4; invoice còn mở 2 triệu; payment 4 triệu được settlement hết (dư payment = 0), invoice 6 triệu còn mở 2 triệu; đơn còn 4 sản phẩm chờ giao và chưa hoàn tất. Guided và công nhận hoàn thành bài là mốc sau.

## 8. Bất biến cần kiểm tra

- Mọi tham chiếu hợp lệ, đúng dataset; một header đúng một line; confirmation khớp đơn; các giữ/lấy/giao/invoice gắn đúng line.
- Tổng lượng Picking dùng từng Reservation ≤ lượng gốc Reservation. Tổng giao theo từng cặp Picking–Reservation ≤ lượng cặp đó ở Picking. Tổng mỗi phân bổ bằng lượng chứng từ, không có lượng âm/0.
- `tồn thực tế ≥ đang giữ ≥ đã lấy chưa giao ≥ 0`; khả dụng ≥ 0. Với mỗi line: đã giao + giữ còn lại ≤ Q; đã lấy lũy kế ≤ Q; backorder ≥ 0.
- Tổng invoice từng packing slip ≤ lượng phiếu; amount khớp giá chốt. Tổng settlement không vượt amount invoice hoặc payment; mọi settlement cùng khách.
- O ≥ 0, U ≥ 0; N = O − U và có thể âm. Không áp bất biến “mọi số dư không âm” cho N.
- Chỉ hành động nghiệp vụ thành công sinh đúng một sự kiện và tăng revision một lần, kể cả khi lưu localStorage thất bại; thử lưu lại không tạo thêm nghiệp vụ. Số liệu tính từ chứng từ, không tin tổng/cờ trạng thái trong file nhập.

Hoạt động học (dự đoán/trả lời/xem giải thích), lưu/tải/thử lưu lại và reset không thêm Event nghiệp vụ. Case đầy đủ tạo đúng 8 Event; một lần tạo header + line chỉ là một sự kiện. Reset tạo dataset mới có 0 Event. Dữ liệu học được giữ riêng ở lessonProgress khi triển khai guided; không dùng Event để đếm lượt bấm học.

## 9. Lưu trữ, khôi phục và giới hạn kỹ thuật

Dùng HTML/CSS/JavaScript thuần, script cổ điển `defer`; không ES modules, fetch dữ liệu nội bộ hoặc CDN. Bài học/seed đóng gói trong script; nguồn Learn là đọc thêm, không phải API runtime. Mở `file://` phải kiểm chứng trên Edge/Chrome Windows.

### Mốc 1: localStorage cơ bản

Hai khóa riêng: `o2c-lab.guided.v1`, `o2c-lab.practice.v1`; mỗi khóa có dataset đầy đủ, schemaVersion và revision. Chỉ practice có giao diện hoạt động. Seed, execute và tính số dư là logic chung cho cả hai mode; không tạo bản domain riêng cho guided.

Chỉ tự seed khi khóa không tồn tại. Nếu JSON hỏng, schema không hỗ trợ, chứng từ/quan hệ không hợp lệ hoặc đọc bị chặn: giữ nguyên dữ liệu cũ, dùng phiên tạm có cảnh báo, không âm thầm ghi đè. Người dùng phải xác nhận đặt lại để cho phép thay dữ liệu cũ. Mốc 1 không migration hoặc xuất file khôi phục.

Thao tác: tạo bản sao → kiểm tra → thêm chứng từ/Event, tăng revision → kiểm tra bất biến → thử ghi một JSON đầy đủ → cập nhật bộ nhớ/giao diện. Nếu setItem lỗi quota/quyền: vẫn dùng trạng thái hợp lệ trong phiên, báo rõ “Chưa lưu trên máy; đóng trang có thể mất dữ liệu”, cho thử lưu lại. Thử lưu lại chỉ lưu trạng thái mới nhất, không gọi nghiệp vụ lần nữa. Không có xuất JSON trong mốc này và thông báo không được đề nghị chức năng chưa có.

Đặt lại practice có xác nhận; nếu hủy không đổi gì, nếu đồng ý tạo seed mới và thử lưu, báo kết quả thực tế. Không chạm khóa guided. Không hỗ trợ nhiều tab: hướng dẫn chỉ mở một tab, không triển khai storage event, merge hoặc khóa xung đột. Di chuyển thư mục/đổi trình duyệt có thể không thấy cùng dữ liệu.

### Để mốc sau

Xuất/nhập JSON có kiểm tra, chính sách migration khi thực sự có schema mới và xử lý xung đột nhiều tab cần thiết kế/kiểm chứng riêng. Không coi những phần này là điều kiện hoàn thành mốc 1.

## 10. Nguồn Microsoft Learn và phạm vi đối chiếu

Đã đối chiếu nội dung Markdown chính thức trong repository `MicrosoftDocs/dynamics-365-unified-operations-public`, snapshot `286bcc83f93487230a7346094bb816ac7ff56b29`, ngày 28/10/2026. Các liên kết dưới là trang Microsoft Learn tương ứng; không phải bằng chứng đã chạy D365. Bản [nguồn biên soạn chính thức](https://github.com/MicrosoftDocs/dynamics-365-unified-operations-public/tree/286bcc83f93487230a7346094bb816ac7ff56b29/articles) giúp tra lại nội dung đã dùng. Không đưa những phần ngoài phạm vi của các trang này thành tính năng lab.

| Mã | Microsoft Learn | Nội dung dùng / lưu ý |
| --- | --- | --- |
| ML01 | [Create sales orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/tasks/create-sales-orders) | Phân biệt sales order header details và line details. V1 giới hạn một line, không mô phỏng toàn bộ dimensions/discounts |
| ML02 | [Confirm sales orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/tasks/confirm-sales-orders) | Confirmation/document status khác giao hàng. Các kiểm tra tín dụng trong tài liệu không thuộc V1 |
| ML03 | [Reserve inventory quantities](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/reserve-inventory-quantities) | Có physical on-hand và ordered inventory, manual/automatic tùy cấu hình. Chỉ physical/manual là giới hạn simulator |
| ML04 | [Ship sales orders without warehousing](https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/tasks/ship-sales-orders-without-warehousing) | Packing slip, giao một phần; có luồng không cần đăng ký picking trước shipment, có lựa chọn Picked nếu quy trình có picking riêng |
| ML05 | [Create a customer invoice](https://learn.microsoft.com/en-us/dynamics365/finance/accounts-receivable/configure-customer-invoices) | Invoice theo sales order/packing slip, có thể gộp; V1 chỉ theo từng packing slip, không bao quát mọi tùy chọn D365 |
| ML06 | [Customer payment overview](https://learn.microsoft.com/en-us/dynamics365/finance/cash-bank-management/tasks/customer-payment-overview) | Nhập/lưu journal khác Post; có thể post payment mà chưa settlement invoice. Lab gộp ghi nhận payment, không dựng payment journal |
| ML07 | [Settlement overview](https://learn.microsoft.com/en-us/dynamics365/finance/cash-bank-management/settlement-overview) | Có thể settlement khi post hoặc sau đó, thủ công/tự động; số dư mở hai giao dịch thay đổi. D365 hỗ trợ nhiều loại giao dịch/điều chỉnh hơn lab |
| ML08 | [Sales and marketing overview — Backorders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/overview-sales-marketing#backorders) | Sales backorders là đơn còn chưa giao; không đồng nhất với khoản phải thu hoặc chỉ đơn đã quá hạn |
| ML09 | [Physical and financial updates](https://learn.microsoft.com/en-us/dynamics365/supply-chain/cost-management/physical-financial-updates) | Sales packing slip là physical issue; sales invoice là financial issue. Lab chỉ giảm số lượng khi giao, không tính giá trị tồn/GL |

Memory là nguồn bối cảnh của người học, không thay thế nguồn Microsoft và không xác nhận trạng thái học. Các công thức số dư và bài tập trong lab được giản lược với VND, không thuế, không chênh lệch, không số dư đầu. Với ERP thực tế phải xem cấu hình và loại giao dịch; không tuyên bố mọi posting không nêu ở đây đều không ảnh hưởng tài chính.
