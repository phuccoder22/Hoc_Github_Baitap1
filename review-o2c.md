# docs/product-spec.md

# O2C Learning Lab — Đặc tả sản phẩm

## 1. Mục tiêu và căn cứ thiết kế

Ứng dụng web tiếng Việt giúp người mới hiểu Order to Cash (O2C) bằng thao tác và quan sát chứng từ, tồn kho, hóa đơn, khoản thanh toán. Chạy ngoại tuyến: tải ZIP, giải nén trên Windows, mở `index.html`; không cần server, API, API key hay tài khoản D365.

Bối cảnh V1: một công ty phân phối, một kho, hai khách hàng, ba sản phẩm; nhiều đơn, mỗi đơn đúng một dòng sản phẩm. Hai chế độ “Học có hướng dẫn” và “Tự thực hành” có dữ liệu độc lập.

### Quyết định đã xác nhận và tài liệu tham khảo

- Yêu cầu trong hội thoại là căn cứ phạm vi: tách O2C chung/D365; bổ sung Header/Line, Confirm, Picking, Packing slip, Backorder, Settlement; tách ba số dư; dùng case đặt 10, tồn 6, giao 6, invoice 6 triệu, payment 4 triệu, settlement 4 triệu; kiểm tra trạng thái và hiểu tác động; chưa triển khai app.
- Đã đọc file người dùng cung cấp `memory_O2C.md` (được nhắc ban đầu là `memory_O2C(1).md`). File là ghi chú tham khảo, không phải danh sách yêu cầu được duyệt. Chọn phần thuật ngữ và case phù hợp với quyết định trong hội thoại.
- Không kế thừa kết luận “đã hoàn tất O2C nhập môn”, định hướng nghề developer hay lộ trình X++ trong memory thành trạng thái/nhiệm vụ của người học. Các ví dụ credit hold, aging, collections không trở thành tính năng V1.
- Các lựa chọn cụ thể như giá seed, một dòng/đơn, biểu diễn Picking và không nhập thêm hàng là giả định thiết kế V1 ở mục 3; không gán chúng thành quy luật ERP hoặc quyết định đã có trong memory.
- Nguồn Microsoft Learn và nội dung đối chiếu nằm ở [business-rules.md, mục 10](business-rules.md#10-nguồn-microsoft-learn-và-phạm-vi-đối-chiếu).

## 2. Ba lớp nội dung học

Giao diện gắn nhãn rõ **“O2C chung”**, **“Liên hệ D365”** và **“Giới hạn simulator”**. Bài giảng có sẵn trong file tĩnh để học ngoại tuyến; các liên kết Microsoft Learn chỉ là đọc thêm khi có mạng.

| Nội dung | O2C chung — giải thích đơn giản | Liên hệ D365 Finance / Supply Chain Management | Cách làm trong simulator V1 |
| --- | --- | --- | --- |
| Header / Line | Header là thông tin chung của đơn; Line là từng dòng hàng | Đơn bán có phần header và các dòng sales order lines | Hiển thị hai vùng; header gồm khách, VND, kho cố định; chỉ một line gồm sản phẩm, lượng, đơn giá |
| Confirm | Xác nhận nội dung đơn, chưa phải giao hàng | Confirm sales order tạo xác nhận đơn; có document status riêng | Thao tác xác nhận đơn một lần, lưu ảnh chụp header/line; không đổi tồn hay ba số dư |
| Reservation | Dành hàng cho đúng nhu cầu/đơn | D365 có physical reservation và có thể reserve ordered inventory tùy cấu hình | Chỉ giữ hàng vật lý đang có, làm thủ công; không coi đây là quy luật của mọi ERP |
| Picking | Lấy hàng khỏi vị trí lưu để chuẩn bị giao; chưa nhất thiết ra khỏi kho | Cách đăng ký picking phụ thuộc quy trình kho; có luồng D365 không bắt buộc đăng ký picking trước shipment | Một thao tác lấy hàng đơn giản từ phần đã giữ; chưa giảm tồn thực tế, không mô phỏng vị trí/bin/WMS |
| Packing slip | Chứng từ xác nhận lượng giao; không chỉ là việc đóng gói | Post packing slip là cập nhật vật lý cho giao hàng | “Ghi nhận giao hàng (Packing slip)” chính là thao tác Shipment, không tạo thêm lần trừ tồn |
| Backorder | Lượng trên đơn còn chờ giao; không đồng nghĩa khoản tiền còn nợ | Có cách xem các đơn/lượng còn chờ giao theo khách, mặt hàng | Tính `đặt − đã giao`; không mô phỏng quá hạn giao hoặc báo cáo D365 |
| Invoice | Hóa đơn làm phát sinh khoản khách phải trả | D365 có nhiều lựa chọn xuất invoice, gồm theo packing slip hoặc các cơ sở khác | Chỉ xuất theo lượng đã giao chưa lập hóa đơn; đây là giới hạn V1 |
| Payment | Ghi nhận khoản thanh toán của khách | Customer payment journal có bước nhập/lưu và post; chưa post không tương đương khoản thanh toán đã ghi nhận | “Ghi nhận thanh toán” tạo ngay giao dịch payment của mô hình, không xây journal hay bút toán |
| Settlement | Chỉ rõ tiền dùng trả hóa đơn nào, giảm hai số dư mở tương ứng | Có thể settlement cùng lúc post payment, sau đó hoặc tự động tùy cấu hình | Luôn thao tác riêng, thủ công, chỉ payment–invoice cùng khách |

Lộ trình học minh họa: **Sales Order (Header/Line) → Confirm → Reservation → Picking → Shipment / Packing slip → Invoice → Payment → Settlement**. Đây là trình tự sư phạm đã chọn, không phải cấu hình bắt buộc cho mọi ERP/D365. Payment có thể được ghi nhận trước invoice trong chế độ tự thực hành.

## 3. Giả định và giới hạn mô phỏng

| Vấn đề cần chốt | Lựa chọn thiết kế V1 | Ý nghĩa / giới hạn |
| --- | --- | --- |
| Header/Line nhưng một sản phẩm | Tách dữ liệu header và line; đúng một line/đơn | Học cấu trúc thật mà chưa hỗ trợ nhiều dòng |
| Confirm và Picking có thao tác không? | Có hai thao tác tối giản để thấy trạng thái thực, không chỉ nút “đã đọc” | Đây là cách triển khai nội dung học đề xuất cho V1; không làm toàn bộ quy trình D365 |
| Trình tự kho | Confirm trước giữ, giữ trước picking, picking trước packing slip | Chỉ là workflow simulator; không áp đặt lên ERP khác |
| Tồn kho | Chỉ giữ vật lý hiện có; không tồn âm, không reserve nguồn hàng dự kiến | D365 có thể hỗ trợ chính sách khác; xem nguồn ML03 |
| Thiếu hàng | Vẫn nhận đơn vượt tồn; không nhập thêm hàng trong V1 | Case có backorder 4 là kết quả học hợp lệ, không cần “sửa” cho đơn hoàn tất |
| Phiếu giao và invoice | Một phiếu giao thuộc một line; một invoice thuộc một phiếu giao; cho chia nhỏ | Không gộp nhiều phiếu/đơn vào một invoice; không khẳng định D365 chỉ làm được vậy |
| Giá, lượng và tiền | Giá chốt lúc tạo line; số lượng nguyên dương; VND nguyên; không thuế/chiết khấu | Giá mẫu phục vụ tính toán, không là báo giá thị trường |
| Payment và settlement | Ghi nhận payment riêng rồi chọn invoice để settlement | Không tự settlement hoặc bù trừ do số dư ròng bằng 0 |
| Hoàn tất đơn | Giao đủ, invoice đủ lượng đặt, mọi invoice của đơn hết số dư | Đây là chỉ tiêu của lab; không ánh xạ trực tiếp vào D365 Sales order status “Invoiced” |
| Vai trò | Bán hàng, kho, kế toán là vai trò học tập | Không đăng nhập hoặc phân quyền thật |
| Sửa sai | Chứng từ đã ghi nhận không sửa/xóa; có xem trước và đặt lại bộ dữ liệu | Chưa có hủy, giải phóng giữ, trả hàng, hoàn tiền, đảo settlement hoặc chứng từ đảo |
| Lưu tại máy | localStorage riêng từng chế độ; có sao lưu JSON và chế độ bộ nhớ khi lưu lỗi | `file://` tùy trình duyệt, dữ liệu có thể tách theo đường dẫn; chỉ hỗ trợ một tab |

**Ngoài phạm vi triển khai đầu:** X++, extensions, integrations, credit management/credit hold, aging, collections, thuế, doanh thu kế toán, giá vốn, bút toán sổ cái, đối soát ngân hàng, nhiều kho, nhiều dòng đơn, mua hàng/nhập kho, cộng tác nhiều người. Nhật ký sự kiện của lab không phải payment journal hay sổ cái D365. Không mở rộng phạm vi chỉ vì các chủ đề này xuất hiện trong memory hoặc nguồn đọc thêm.

## 4. Màn hình và hành vi

### Trang bắt đầu và thẻ kiến thức

Giới thiệu O2C chung, hai chế độ, trạng thái lưu và giới hạn học thuật. Có thẻ thuật ngữ ba lớp ở mục 2; nhắc “Mô phỏng học tập, không phải bản sao D365”. Chuyển chế độ không sao chép chứng từ hoặc tiến độ. Bài hướng dẫn thông báo trước: bài hoàn thành có thể để lại đơn đang mở.

### Không gian làm việc

- **Tổng quan tồn kho:** tồn thực tế, đang giữ, khả dụng, đã lấy chưa giao theo sản phẩm. Picking là phần con của lượng giữ, không trừ thêm vào khả dụng.
- **Đơn hàng:** tạo header/line, xem giá và tổng; danh sách nhiều đơn với nhãn confirm, giao hàng, invoice, thanh toán các invoice hiện có và hoàn tất riêng biệt.
- **Chi tiết đơn:** hai vùng Header/Line rõ ràng; số đặt, giữ còn lại, đã lấy chưa giao, đã giao, backorder, đã invoice, đã giao chưa invoice. Có Confirm, giữ, Picking, “Ghi nhận giao hàng (Packing slip)” và lập invoice. Không dùng “xác nhận biểu mẫu” thay cho nghiệp vụ Confirm.
- **Khách hàng và thanh toán:** luôn hiển thị ba chỉ tiêu riêng: **Số dư hóa đơn còn mở**, **Khoản thanh toán chưa cấn trừ**, **Số dư ròng của khách hàng**. Số dư ròng = mở hóa đơn − payment chưa cấn trừ; dương là khách còn nợ ròng, âm là khách đang có số tiền dư theo mô hình. Không gộp hai số đầu thành một nhãn “công nợ” mơ hồ.
- **Ghi nhận payment:** chọn khách và số tiền; xem trước tác động ba số dư; không tự settlement. Câu “Payment đã ghi nhận” không đồng nghĩa “Invoice đã trả đủ”.
- **Settlement (cấn trừ thanh toán):** chọn payment và invoice cùng khách, nhập số tiền, hiển thị giới hạn hai phía và ba số dư trước/sau. Bộ lọc giúp chọn đúng nhưng kiểm tra nghiệp vụ vẫn bắt buộc.
- **Dòng chứng từ và nhật ký:** mở từng SO/header-line → confirmation → reservation → picking → packing slip → invoice → settlement → payment. Payment liên kết theo khách, có thể có trước SO; không vẽ nó như chứng từ con bắt buộc của một đơn. Nhật ký lưu vai trò học tập, số thứ tự, thời gian, mã liên quan, trước/sau; thao tác bị chặn không thành chứng từ thành công.
- **Dữ liệu:** xuất/nhập JSON có kiểm tra và đặt lại riêng chế độ có xác nhận; không xóa chế độ còn lại.

### Học có hướng dẫn

Case chuẩn: đặt 10 SP01, tồn 6, giao 6, đơn giá 1.000.000; invoice 6.000.000, payment 4.000.000, settlement 4.000.000. Vai trò và lý do thao tác hiện ở từng bước. Xem bảng trước/sau và câu hỏi giải thích tác động. Điều kiện qua bước = chứng từ/trạng thái thật đúng **và** trả lời đúng câu hỏi hiểu tác động. Khi sai được xem lại giải thích và thử lại, không mất hoặc tạo thêm chứng từ.

Bài hoàn thành khi đạt trạng thái đích của case và vượt kiểm tra hiểu; đơn vẫn chưa hoàn tất: còn chờ giao 4, invoice còn mở 2.000.000. Chi tiết ở [learning-scenarios.md](learning-scenarios.md). Không dùng số lần bấm hoặc phần trăm nút đã bấm làm bằng chứng hoàn thành.

### Tự thực hành

Tự tạo nhiều đơn, giữ/pick/giao/invoice từng phần, ghi nhận nhiều payment và settlement nhiều lần. Cho thu trước invoice; chặn mọi phân bổ vượt hoặc sai khách/đơn. Backorder có thể tồn tại vì V1 không bổ sung hàng. Lỗi nêu rõ “sai ở đâu, vì sao, làm gì tiếp”; ví dụ: “Bạn muốn giữ 10 nhưng simulator chỉ còn 6 sản phẩm vật lý khả dụng. Hãy giữ tối đa 6; 4 còn lại vẫn chờ giao. ERP thực tế có thể có chính sách reservation khác.”

## 5. Phản hồi, lưu và trải nghiệm

Mỗi thao tác: nhập → xem trước → xác nhận thao tác → kiểm tra lại trạng thái mới nhất → ghi nguyên tử chứng từ/sự kiện → hiển thị trước/sau và tình trạng lưu. Bấm đúp không tạo hai chứng từ cho một lần xác nhận. “Confirm đơn bán” là một nghiệp vụ riêng, không phải nút xác nhận chung của mọi biểu mẫu.

Nhãn tiếng Việt kèm thuật ngữ Anh khi cần; không chỉ dùng màu để báo trạng thái; có nhãn trường, lỗi gần trường và dùng bàn phím được. Ưu tiên máy tính Windows, vẫn đọc được khi thu hẹp cửa sổ.

Khi lưu thất bại, giữ trạng thái hợp lệ trong bộ nhớ và hiện liên tục “Chưa lưu trên máy; đóng trang có thể mất dữ liệu”; có xuất JSON và thử lưu lại. Không báo đã lưu nếu chỉ cập nhật bộ nhớ. Dữ liệu hỏng/khác phiên bản không bị ghi đè tự động; cho bảo toàn dữ liệu gốc và đặt lại có xác nhận. Chi tiết ở business-rules.

## 6. Tiêu chí thành công

Người học giải thích được Confirm ≠ giao, Picking ≠ Packing slip, Backorder ≠ dư nợ, Payment ≠ Settlement; phân biệt ba số dư khách hàng và giới hạn simulator với ERP thực tế. Case đúng số liệu sau từng bước, đặc biệt payment làm giảm số dư ròng trước settlement. Tự thực hành chặn sai nghiệp vụ và cô lập hai chế độ. Chạy Windows ngoại tuyến, lưu/khôi phục hoặc thông báo lỗi đúng phải được kiểm chứng ở task triển khai, không coi tài liệu này là bằng chứng app đã chạy.


# docs/business-rules.md

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

Các bản ghi nghiệp vụ có ID duy nhất trong dataset, mã dễ đọc, createdAt, sequence; bộ đếm không tái sử dụng. Dữ liệu mô hình chỉ tồn tại trong thiết kế hiện tại; chưa có app hoặc dữ liệu người học cần migrate.

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

`bài học hoàn thành = trạng thái đích case đúng AND kiểm tra giải thích tác động đạt`. Nó khác `đơn hoàn tất`. Cuối case: Confirm có; giao 6/10; invoice 6/10; backorder 4; invoice còn mở 2 triệu; payment đã dùng hết; đơn chưa hoàn tất nhưng bài có thể hoàn thành.

## 8. Bất biến cần kiểm tra

- Mọi tham chiếu hợp lệ, đúng dataset; một header đúng một line; confirmation khớp đơn; các giữ/lấy/giao/invoice gắn đúng line.
- Tổng lượng Picking dùng từng Reservation ≤ lượng gốc Reservation. Tổng giao theo từng cặp Picking–Reservation ≤ lượng cặp đó ở Picking. Tổng mỗi phân bổ bằng lượng chứng từ, không có lượng âm/0.
- `tồn thực tế ≥ đang giữ ≥ đã lấy chưa giao ≥ 0`; khả dụng ≥ 0. Với mỗi line: đã giao + giữ còn lại ≤ Q; đã lấy lũy kế ≤ Q; backorder ≥ 0.
- Tổng invoice từng packing slip ≤ lượng phiếu; amount khớp giá chốt. Tổng settlement không vượt amount invoice hoặc payment; mọi settlement cùng khách.
- O ≥ 0, U ≥ 0; N = O − U và có thể âm. Không áp bất biến “mọi số dư không âm” cho N.
- Hành động thành công sinh đúng một sự kiện và tăng revision một lần, kể cả khi lưu localStorage thất bại; thử lưu lại không tạo thêm nghiệp vụ. Số liệu tính từ chứng từ, không tin tổng/cờ trạng thái trong file nhập.

## 9. Lưu trữ, khôi phục và giới hạn kỹ thuật

Dùng HTML/CSS/JavaScript thuần, script cổ điển `defer`; không ES modules, fetch dữ liệu nội bộ hoặc CDN. Bài học/seed đóng gói trong script; nguồn Learn là đọc thêm, không phải API runtime. Mở `file://` phải kiểm chứng trên Edge/Chrome Windows.

Hai khóa riêng: `o2c-lab.guided.v1`, `o2c-lab.practice.v1`, mỗi khóa là JSON dataset đầy đủ có schemaVersion, revision. Chỉ seed tự động khi khóa chưa tồn tại. Parse/đọc lỗi hoặc schema không hỗ trợ: không tự ghi đè; cho bảo toàn dữ liệu gốc khi đọc được, giải thích lỗi và đặt lại có xác nhận. Nếu không đọc được do quyền, dùng phiên tạm và không tự ghi đè dữ liệu không đọc được.

Mỗi thao tác: tạo bản sao trạng thái → kiểm tra → thêm chứng từ/sự kiện và tăng revision → kiểm tra bất biến → thử setItem trọn dataset → cập nhật bộ nhớ/giao diện. setItem lỗi quota/quyền: vẫn dùng bản sao hợp lệ trong phiên, đánh dấu chưa lưu; có xuất JSON và thử lưu trạng thái mới nhất, không chạy lại nghiệp vụ. Chỉ bỏ cảnh báo khi ghi thành công. Không ghi nửa chứng từ/nửa nhật ký.

Sao lưu có schemaVersion, mode, savedAt, dataset; xuất từ bộ nhớ được ngay cả khi lưu lỗi. Nhập giới hạn 5 MB; kiểm tra kiểu dữ liệu, số học, ID không trùng, quan hệ, bất biến, mode và liên kết tiến độ bài trước khi xem trước/xác nhận thay thế. File không hợp lệ không đổi trạng thái. N âm hợp lệ, O/U âm không hợp lệ. File xuất quá giới hạn nhập phải cảnh báo rõ. Nhập thành công nhưng lưu lỗi vẫn là phiên tạm.

Một tab tại một thời điểm. Kiểm tra revision nếu đọc được và dùng storage event để cảnh báo xung đột; khi thấy bản lưu mới hơn, chặn ghi, cho xuất bản trong phiên rồi tải lại. Đây không phải khóa đồng thời đầy đủ, không tự trộn dữ liệu. Chuyển đường dẫn/thư mục/trình duyệt không bảo đảm dùng cùng vùng localStorage; chuyển dữ liệu bằng sao lưu.

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


# docs/learning-scenarios.md

# O2C Learning Lab — Bài học và tình huống thực hành

## 1. Nguyên tắc học và thuật ngữ

Nội dung phân biệt ba nhãn: **O2C chung**, **Liên hệ D365**, **Giới hạn simulator**. Bài học không là hướng dẫn sao chép mọi nút/cấu hình D365. Tham khảo file `memory_O2C.md` do người dùng cung cấp cho thuật ngữ và case, không kế thừa kết luận “đã hoàn tất O2C nhập môn” hoặc các chủ đề ngoài phạm vi. Nguồn Microsoft Learn ML01–ML09 được liệt kê tại [business-rules.md, mục 10](business-rules.md#10-nguồn-microsoft-learn-và-phạm-vi-đối-chiếu).

| Thuật ngữ | Cách giải thích cho người mới | Nhắc về D365 và simulator |
| --- | --- | --- |
| Header / Line | Header trả lời “ai mua, tiền gì, kho nào”; Line trả lời “hàng gì, bao nhiêu, giá nào” | D365 có nhiều line; V1 đúng một line nhưng vẫn tách hai phần (ML01) |
| Confirm | Xác nhận nội dung đơn bán, chưa phải giao hoặc invoice | Tạo confirmation của lab; không phải nút xác nhận chung trên biểu mẫu (ML02) |
| Reservation | Dành hàng cho đúng đơn/line | Lab chỉ giữ vật lý hiện có; D365 có thể giữ ordered inventory theo cấu hình (ML03) |
| Picking | Lấy hàng để chuẩn bị giao; hàng vẫn có thể đang trong kho | V1 đăng ký Picking riêng, chưa trừ tồn; quy trình D365 có thể khác (ML04) |
| Packing slip | Chứng từ ghi nhận lượng giao; “post” nghĩa là ghi nhận nghiệp vụ, không chỉ in giấy | Trong lab là thao tác giao hàng duy nhất; không trừ tồn lần nữa sau Shipment (ML04, ML09) |
| Backorder | Lượng đặt còn chờ giao, không phải số tiền còn nợ | V1 tính lượng đặt trừ lượng giao; không có ngày hẹn/quá hạn (ML08) |
| Invoice | Chứng từ số tiền khách phải trả | V1 chỉ invoice phần đã giao; D365 có lựa chọn khác (ML05) |
| Payment | Khoản thanh toán của khách đã được ghi nhận | V1 không mô phỏng payment journal draft/post; ghi nhận payment là một nghiệp vụ độc lập (ML06) |
| Settlement | Chỉ định payment trả invoice nào, bao nhiêu | V1 luôn thủ công và riêng payment; D365 có thể kết hợp/tự động theo cấu hình (ML07) |

Không mô phỏng thuế, doanh thu kế toán, giá vốn hay bút toán sổ cái. Không thêm X++, integrations, credit management, aging hoặc collections vào bài thực hành V1.

## 2. Bài xuyên suốt: Đặt 10, có 6, giao 6 và thanh toán một phần

### Tình huống và mục tiêu

KH01 — Công ty An Phát đặt 10 SP01 — Gạch lát nền, giá giả định 1.000.000/đơn vị học tập. Kho chỉ có 6. Người học xác nhận đơn, giữ/lấy/giao 6, invoice 6.000.000, ghi nhận payment 4.000.000, rồi settlement 4.000.000.

Mục tiêu là hiểu tình trạng **đang xử lý một phần**, không phải bằng mọi cách hoàn tất đơn. Không tự thêm 4 vào kho hoặc giảm lượng đặt về 6 để có kết quả đẹp. Bài hoàn thành đúng khi người học giải thích được vì sao vẫn còn backorder 4 và invoice mở 2 triệu.

Dùng riêng dataset `guided`, khởi đầu theo business-rules: SP01 thực tế 6, giữ 0, khả dụng 6, đã lấy chưa giao 0; chưa có đơn/invoice/payment/settlement; số dư khách bằng 0. KH02, SP02 và SP03 không đổi trong bài. Dataset `practice` không bị tác động.

### Tám thao tác và tác động số lượng

Mã SO-01/L-01/CF-01/R-01/PK-01/PS-01/I-01/PAY-01/ST-01 là nhãn trong bài, triển khai dùng ID thật và đúng quan hệ.

| Bước / vai trò | Chỉ dẫn và lý do | Thực tế | Giữ còn lại | Khả dụng | Đã lấy chưa giao | Backorder |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · Bán hàng | Tạo SO-01: header KH01/VND/WH01; line L-01: SP01, 10, giá 1.000.000. Ghi nhu cầu dù chưa đủ hàng | 6 → 6 | 0 → 0 | 6 → 6 | 0 → 0 | Chưa có đơn → 10 |
| 2 · Bán hàng | Confirm SO-01, tạo CF-01 đúng header/line. Xác nhận nội dung, chưa giao hàng | 6 → 6 | 0 → 0 | 6 → 6 | 0 → 0 | 10 → 10 |
| 3 · Kho | Giữ 6 cho L-01, tạo R-01. Không giữ 10 vì lab chỉ có 6 vật lý | 6 → 6 | 0 → 6 | 6 → 0 | 0 → 0 | 10 → 10 |
| 4 · Kho | Picking 6 từ R-01, tạo PK-01. Đã lấy để chuẩn bị giao, chưa ra khỏi kho | 6 → 6 | 6 → 6 | 0 → 0 | 0 → 6 | 10 → 10 |
| 5 · Kho | Ghi nhận giao hàng 6, tạo Packing slip PS-01 từ PK-01/R-01. Đây chính là Shipment | 6 → 0 | 6 → 0 | 0 → 0 | 6 → 0 | 10 → 4 |
| 6 · Kế toán | Invoice 6 của PS-01, tạo I-01 trị giá 6.000.000. Chỉ invoice phần đủ điều kiện | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 4 → 4 |
| 7 · Kế toán | Ghi nhận PAY-01 của KH01, 4.000.000. Chưa chỉ định tiền trả I-01 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 4 → 4 |
| 8 · Kế toán | Settlement ST-01: PAY-01 vào I-01, 4.000.000. Dùng tiền đã nhận, không nhận thêm tiền | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 4 → 4 |

Ở bước 3, 10 còn chờ giao gồm 6 đã giữ và 4 chưa được giữ. Backorder chưa giảm khi chỉ Confirm/Reservation/Picking. Không trừ lượng Picking thêm lần nữa vào khả dụng vì nó đã nằm trong lượng giữ.

### Ba số dư tài chính trước → sau

Đơn vị bảng: **triệu VND**. O = số dư hóa đơn còn mở; U = khoản thanh toán chưa cấn trừ; N = số dư ròng khách hàng = O − U.

| Bước | O — Invoice còn mở | U — Payment chưa cấn trừ | N — Số dư ròng | Ý nghĩa |
| --- | --- | --- | --- | --- |
| 1–5 | 0 → 0 | 0 → 0 | 0 → 0 | Đơn/Confirm/giữ/lấy/giao chưa tạo invoice trong lab |
| 6 · Invoice 6 triệu | 0 → 6 | 0 → 0 | 0 → 6 | Phát sinh khoản phải thu của invoice |
| 7 · Payment 4 triệu | 6 → 6 | 0 → 4 | 6 → 2 | Invoice vẫn mở 6, nhưng số dư ròng đã giảm còn 2 |
| 8 · Settlement 4 triệu | 6 → 2 | 4 → 0 | 2 → 2 | Hai số dư mở giảm cùng 4; không thay đổi số dư ròng |

Không giải thích bước 7 thành “nhận tiền không làm thay đổi bất kỳ số dư công nợ nào”. Câu đúng: chưa giảm **số dư mở invoice**, nhưng đã giảm **số dư ròng khách hàng**.

### Điều kiện qua từng bước và câu hỏi hiểu tác động

Mỗi bước cần chứng từ thật hợp lệ **và** câu trả lời đúng. Đáp án dưới đây để người xây dựng kiểm tra, không hiện sẵn trong câu hỏi của app.

| Bước | Điều kiện nghiệp vụ | Câu hỏi và đáp án / giải thích khi sai |
| --- | --- | --- |
| 1 | Header đúng KH01/VND/WH01; đúng một line SP01 lượng 10, giá 1.000.000; tạo đơn không đổi tồn/số dư | “Khách hàng nằm ở Header hay Line? Lượng 10 nằm ở đâu?” **Khách ở Header, lượng ở Line**. Hai phần mô tả hai cấp thông tin |
| 2 | CF-01 tham chiếu SO-01, snapshot khớp header/line; không có giao/invoice do Confirm | “Confirm có nghĩa đã giao 10 chưa?” **Chưa**. Xác nhận nội dung khác ghi nhận giao hàng |
| 3 | R-01 của L-01 có lượng gốc 6; thực tế không giảm; khả dụng lúc thao tác về 0 | “Có phải mọi ERP chỉ giữ được hàng vật lý hiện có?” **Không**. Đây là giới hạn lab; D365 có thể reserve ordered inventory tùy cấu hình |
| 4 | PK-01 lượng 6 phân bổ đúng R-01; tại thời điểm này đã lấy chưa giao 6, tồn thực tế vẫn 6 | “Lấy 6 rồi kho đã giảm xuống 0 chưa?” **Chưa**. Lab giảm khi ghi nhận Packing slip, không ở Picking |
| 5 | PS-01 lượng 6 dùng đúng cặp PK-01/R-01; giao của đơn 6, backorder 4; không tạo Shipment thứ hai | “Còn chờ giao bao nhiêu? Có phải đó là tiền nợ không?” **4 sản phẩm; không phải tiền** |
| 6 | I-01 thuộc PS-01, lượng 6, amount 6.000.000; không invoice 4 chưa giao | “Vì sao invoice 6 triệu thay vì 10 triệu?” **Lab chỉ invoice 6 đã giao**, không phải mọi ERP chỉ có lựa chọn này |
| 7 | PAY-01 đúng KH01, amount 4.000.000; tại thời điểm ghi nhận payment chưa có ST-01 và O/U/N là 6/4/2 triệu | “Invoice mở và số dư ròng lúc này là bao nhiêu?” **6 triệu và 2 triệu**. Payment chưa ghép invoice nhưng đã là giao dịch của khách |
| 8 | ST-01 nối đúng PAY-01/I-01 với 4.000.000; dư I-01 2 triệu, dư PAY-01 0 | “Settlement có làm ròng giảm thêm 4 triệu không?” **Không**. Chỉ giảm O và U cùng 4, ròng vẫn 2 |

Trả lời sai: chỉ ra nhầm lẫn, cho “Xem lại tác động” và thử lại không giới hạn; không ghi thêm chứng từ hay hoàn tác bước đúng. Các câu hỏi không chỉ hỏi tên nút tiếp theo.

### Kiểm tra cuối bài: giải thích và đối chiếu thực tế

Chỉ hiện **“Hoàn thành bài học”** khi tất cả điều kiện sau đạt:

1. Đọc lại chứng từ để xác minh: 1 header/line đặt 10; 1 confirmation đúng đơn; 1 reservation 6; 1 picking 6; 1 packing slip 6; 1 invoice 6 triệu; 1 payment 4 triệu; 1 settlement 4 triệu cùng khách. Có đúng 8 sự kiện nghiệp vụ; bất biến toàn dataset hợp lệ; không có chứng từ ngoài case.
2. Tính lại từ dữ liệu hiện tại: SP01 thực tế/giữ/khả dụng/đã lấy chưa giao = 0/0/0/0; giao 6; backorder 4; invoice lượng 6; O/U/N = 2/0/2 triệu; KH02/SP02/SP03 không đổi. Không tin cờ “complete” trong localStorage hoặc file nhập.
3. Người học nhập kết quả số cho ba số dư trước/sau settlement và backorder, rồi chọn đúng lý do của từng tác động. Phải phân biệt Confirm/Picking chưa giảm tồn, payment giảm ròng, settlement không nhận thêm tiền. Đây là kiểm tra có cấu trúc, chấm cục bộ bằng đáp án; không giả định app có AI chấm văn bản tự do.
4. Trả lời đúng câu chuyển tình huống: “Invoice 2 triệu, payment 2 triệu chưa settlement: ròng 0 có nghĩa invoice đóng chưa?” **Chưa**; invoice mở 2, payment chưa cấn trừ 2. Chọn đúng lý do thay vì chỉ nhập số 0.
5. Giải thích đúng **bài đã hoàn thành nhưng đơn chưa hoàn tất**: chưa giao/invoice 4 còn lại, I-01 còn mở 2 triệu; không khẳng định mọi ERP đều không thể giữ 4 hàng dự kiến.

Nếu trạng thái đúng nhưng phần giải thích sai, giữ bài ở “Cần xem lại tác động”, cho quay lại bảng trước/sau và thử lại. Nếu câu trả lời đúng nhưng chứng từ sai, cũng không công nhận; báo phần dữ liệu không khớp. Không yêu cầu người học hoàn tất toàn bộ đơn để qua bài thiếu hàng này.

### Tiến độ, tải lại và xem lại

Guided chỉ mở thao tác của bước hiện hành với đối tượng/lượng của case. Sau thành công chỉ hiện câu hỏi, không cho tạo lại cùng chứng từ. Lưu ID liên kết bước và phiên bản bài để tìm đối tượng, nhưng phải kiểm tra nội dung, quan hệ và bất biến khi tải lại. Tiến độ không suy từ số lần bấm hoặc câu “đã hoàn tất” trong memory.

Các số trước/sau là ảnh chụp tại thời điểm từng bước, không là điều kiện đòi dữ liệu hiện tại mãi bằng số cũ. Ví dụ R-01 có lượng gốc 6 nhưng dư giữ về 0 sau giao; invoice mở 6 ở bước 7 và còn 2 sau bước 8. Có thể tính lại trạng thái theo tiền tố sequence của chứng từ bất biến để đối chiếu ảnh chụp sự kiện, không tin riêng trường before/after trong JSON nhập.

Bước hiện tại là bước đầu còn thiếu nghiệp vụ hợp lệ hoặc câu hỏi hiểu tác động. Xem lại bước cũ không chạy lại thao tác. Nếu cấu trúc bài không khớp dữ liệu, báo không thể tiếp tục và cho sao lưu/đặt lại riêng guided, không âm thầm seed hoặc đánh dấu hoàn thành.

**Kết thúc:** bài học đạt nếu kiểm tra trên đạt; đơn SO-01 vẫn giao một phần, invoice một phần và settlement một phần. Không tự thêm hàng, payment, settlement hoặc đóng đơn sau khi bấm hết bước.

## 3. Tình huống tự thực hành và kết quả mong đợi

Mỗi ca bắt đầu với seed mới của `practice` (SP01 tồn 6, giá 1 triệu), không xóa guided. Trong bảng, “đã giao/invoice X” là chuẩn bị đủ các thao tác tạo đơn → Confirm → giữ → Picking → Packing slip → invoice X. Ngoại trừ ca cố ý làm sai thứ tự, không được bỏ qua các điều kiện này. Các lỗi giữ nguyên chứng từ, bộ đếm, revision và nhật ký thành công.

| Mã | Chuẩn bị và thao tác | Kết quả cần quan sát |
| --- | --- | --- |
| TH01 · Đặt vượt tồn | Tạo Header KH01 và một Line SP01 lượng 10 | Hợp lệ; thực tế/giữ/khả dụng 6/0/6; O/U/N = 0/0/0; backorder 10 |
| TH02 · Hai đơn tranh hàng | A/B đã Confirm, SP01 lượng 4/3; A giữ 4; B thử giữ 3 rồi giữ 2 | 3 bị chặn vì khả dụng 2; giữ 2 hợp lệ; tồn/giữ/khả dụng 6/6/0 |
| TH03 · Giữ vượt nhu cầu | Đơn đã Confirm lượng 3, giữ 2; thử giữ thêm 2 rồi 1 | Giữ thêm 2 bị chặn vì đơn còn cần 1, dù kho còn 4 khả dụng; thêm 1 hợp lệ |
| TH04 · Đúng line/đơn | A/B cùng KH01/SP01 lượng 3 đã Confirm; chỉ A giữ và pick 3; B cố pick hoặc giao dùng nguồn của A | Chặn do nguồn không thuộc B; không mượn giữ/lấy của A dù cùng khách và sản phẩm |
| TH05 · Giao từng phần | Đơn 6 đã Confirm, giữ và pick 6; giao 2; thử giao 5; sau đó giao 4 | Sau giao 2: thực tế/giữ/khả dụng 4/4/0, đã lấy chưa giao 4; giao 5 bị chặn; giao thêm 4 về 0/0/0 |
| TH06 · Nhiều phiếu giữ | Đơn 6 đã Confirm, giữ 2 rồi 4, pick 3, giao 3 | Pick dùng 2 từ phiếu đầu và 1 từ phiếu sau; Picking chưa đổi 6/6/0; giao xong tồn/giữ/khả dụng 3/3/0; phiếu sau dư giữ 3 |
| TH07 · Invoice theo phiếu | Đơn 6 đã Confirm, giữ 6, pick/giao 4; thử invoice 5; invoice 2 rồi 2; thử thêm 1 trên cùng phiếu | Invoice 5 và lần thêm 1 bị chặn; hai invoice mỗi cái 2 triệu; O/U/N=4/0/4 triệu; tồn/giữ/khả dụng vẫn 2/2/0 |
| TH08 · Payment trước invoice | Ghi payment KH01 3 triệu trước khi có invoice; thử settlement không có invoice; sau đó đặt/giao/invoice đủ 2 SP01, settlement 2 triệu | Ban đầu O/U/N=0/3/−3 triệu; thiếu invoice bị chặn; cuối 0/1/−1 triệu. Đơn 2 sản phẩm hoàn tất, khách vẫn có tiền dư |
| TH09 · Sai khách | KH01 có invoice 2 triệu; KH02 có payment 2 triệu; cố settlement hai bên | Chặn vì khác khách; giữ nguyên các số dư của từng khách, không net giữa hai khách |
| TH10 · Vượt dư payment | KH01 có invoice 5 triệu, payment 2 triệu; thử settlement 2,5 triệu | Chặn, tối đa 2 triệu; settlement 2 triệu hợp lệ thì O/U/N = 3/0/3 triệu |
| TH11 · Vượt dư invoice | KH01 có invoice 2 triệu, payment 5 triệu; thử settlement 3 triệu | Chặn, tối đa 2 triệu; settlement 2 triệu thì O/U/N = 0/3/−3 triệu |
| TH12 · Nhiều-nhiều | KH01 có hai đơn đã giao/invoice đủ 2 và 3 SP01; payment 4 triệu, settlement 2 triệu vào mỗi invoice; thêm payment 1 triệu và settlement vào invoice thứ hai | Một payment trả hai invoice, invoice thứ hai nhận hai payment; cuối O/U/N = 0/0/0; cả hai đơn hoàn tất |
| TH13 · Invoice đủ tiền, đơn chưa xong | Làm case chính, thêm payment 2 triệu và settlement nốt I-01 | I-01 đóng; O/U/N=0/0/0; vẫn backorder 4, invoice 6/10; đơn chưa hoàn tất |
| TH14 · Cô lập chế độ | Tạo đơn/giữ/payment trong practice, chuyển guided, đặt lại practice | Guided không có chứng từ practice và không bị xóa; practice về seed |
| TH15 · Đầu vào sai | Thử số 0, âm, lẻ, rỗng, không phải số và vượt giới hạn số nguyên an toàn | Bị chặn tại domain và biểu mẫu; không tạo chứng từ. Riêng N âm là kết quả tính hợp lệ, không áp lỗi “số tiền âm” cho N |
| TH16 · Confirm/Picking khác giao | Đơn 3 chưa Confirm thử giữ; Confirm rồi pick khi chưa giữ; giữ/pick 3; thử Confirm lần hai | Sai thứ tự/Confirm trùng bị chặn. Sau giữ/pick hợp lệ: thực tế 6, giữ 3, khả dụng 3, đã lấy chưa giao 3; chưa giao và O/U/N vẫn 0 |
| TH17 · Thiếu hàng vật lý | Đơn đã Confirm lượng 10, thử giữ 10 rồi giữ 6 và giao 6 đúng quy trình | Giữ 10 bị chặn bằng lời giải thích giới hạn lab; giữ/giao 6 hợp lệ; backorder 4. Không nói D365 luôn cấm reserve nguồn hàng dự kiến |
| TH18 · Ròng 0 chưa settlement | Đơn giao/invoice đủ 2, payment 2 triệu, chưa settlement; sau đó settlement 2 triệu | Trước: O/U/N=2/2/0 triệu, invoice vẫn mở và đơn chưa hoàn tất. Sau: 0/0/0, invoice đóng và đơn hoàn tất |

TH07 còn phải thử khi phiếu giao thứ hai đã có lượng đủ điều kiện invoice: không được invoice vượt phiếu thứ nhất dù tổng lượng giao của đơn còn chưa invoice. Packing slip không có thao tác Shipment bổ sung làm giảm tồn hai lần.

## 4. Tình huống dữ liệu và giao diện

- **Tải lại:** sau payment trước settlement (bước 7) và cuối case, tải lại; nếu lưu được, khôi phục đúng trạng thái, câu hỏi, ID liên kết và ba số dư; không tạo lại nghiệp vụ.
- **Hoàn thành giả:** đặt cờ completed hoặc bấm hết nút khi chưa có PS-01/ST-01 đúng liên kết; không được công nhận. Dữ liệu đích đúng nhưng câu hỏi/giải thích sai cũng chưa hoàn thành. N=0 không thay kiểm tra invoice còn mở.
- **Lỗi lưu:** giả lập setItem ném lỗi quota/quyền; vẫn có trạng thái hợp lệ trong phiên và cảnh báo rõ; xuất JSON được; thử lưu lại không tạo thêm chứng từ.
- **Dữ liệu hỏng:** lỗi JSON/schema không hỗ trợ không âm thầm ghi đè. Bảo toàn bản gốc nếu đọc được, rồi đặt lại có xác nhận.
- **Nhập sai:** ID trùng, tham chiếu mất, sai line/khách, phân bổ vượt Picking/Reservation, O/U âm, sai mode hoặc >5 MB bị từ chối. N âm đúng công thức phải được chấp nhận. Nhập file hợp lệ khôi phục đúng cả ba số dư.
- **Bấm lặp:** bấm đúp một lần xác nhận chỉ có một chứng từ; mở lại bước cũ không chạy lại. Trong practice, thao tác lặp có chủ đích vẫn hợp lệ nếu còn lượng/số dư.
- **Hai tab:** phát hiện revision mới hơn thì chặn ghi và hướng dẫn xuất/tải lại; không tuyên bố có khóa đồng thời đầy đủ.
- **Windows ngoại tuyến:** giải nén ở đường dẫn có dấu/khoảng trắng, mở index.html bằng Edge/Chrome khi ngắt mạng; hoàn thành bài, lưu/tải lại, xuất/nhập, đặt lại. Đọc bài không cần truy cập Microsoft Learn; link chỉ là tham khảo trực tuyến tùy chọn.


# docs/implementation-plan.md

# O2C Learning Lab — Kế hoạch triển khai sau thiết kế

## 1. Hiện trạng, căn cứ và điểm dừng

Repository có README.md, hello.txt và bốn tài liệu thiết kế; chưa có app, package manifest, test hay CI. Task hiện tại **chỉ cập nhật tài liệu**, không tạo index.html, CSS, JavaScript, test ứng dụng hoặc dependency. Các mốc dưới là kế hoạch tương lai, không phải tính năng đã chạy hoặc kết quả đã nghiệm thu.

Đã đọc `memory_O2C.md` do người dùng cung cấp. Dùng thuật ngữ/case phù hợp với quyết định trong hội thoại; không đưa toàn bộ ghi chú hoặc kết luận “đã hoàn tất nhập môn” thành yêu cầu/tiến độ. Tài liệu nguồn Microsoft Learn và phạm vi đối chiếu ở [business-rules.md, mục 10](business-rules.md#10-nguồn-microsoft-learn-và-phạm-vi-đối-chiếu).

Nguồn thiết kế thống nhất: [product-spec.md](product-spec.md) mô tả người dùng/phạm vi và giả định; [business-rules.md](business-rules.md) định nghĩa dữ liệu/công thức; [learning-scenarios.md](learning-scenarios.md) có case và kết quả mong đợi. Phải cập nhật đồng bộ nếu thay đổi mô hình ở task sau.

Phạm vi triển khai đầu không có X++, integrations, credit management/credit hold, aging, collections, thuế, doanh thu kế toán, giá vốn hay bút toán sổ cái. Không cần tenant D365. Bài lab không phải bản sao giao diện hoặc cấu hình D365.

## 2. Cấu trúc dự kiến cho người mới

```text
index.html                 Trang mở trực tiếp trên Windows
styles.css                 Trình bày, nhãn và trạng thái giao diện
js/
  seed.js                  Hai khách, ba sản phẩm, hai dataset độc lập
  domain.js                Tám thao tác, quan hệ và công thức/bất biến
  storage.js               Đọc/ghi, schema, revision, sao lưu và lỗi lưu
  lessons.js               Ba lớp nội dung, câu hỏi, điều kiện bài học
  app.js                   Nối biểu mẫu, bộ nhớ và giao diện
tests/
  index.html               Trang kiểm tra cục bộ dành cho người phát triển
  domain-tests.js          Các ca nghiệp vụ theo tài liệu
  storage-tests.js         Lỗi lưu, dữ liệu nhập và xung đột
docs/                      Bốn tài liệu thiết kế
```

Đây chỉ là sơ đồ, chưa tạo các file ứng dụng/test. Dùng script cổ điển `defer` theo thứ tự phụ thuộc, một namespace đơn giản; không ES modules, bundler, fetch JSON nội bộ hoặc CDN. Đóng gói nội dung O2C/D365/giới hạn và seed trong script, không tải Microsoft Learn khi app chạy. Người dùng Windows không cần npm, Python, server hay API key.

Luồng: biểu mẫu gửi yêu cầu → domain kiểm tra và tạo bản sao trạng thái/chứng từ/sự kiện → storage thử lưu → app hiển thị trước/sau và trạng thái lưu. Domain không đọc DOM hoặc localStorage. Có hai thao tác bổ sung tối giản Confirm/Picking; Shipment và Packing slip là cùng một lần ghi nhận giao hàng, không hai bước giảm tồn.

## 3. Các mốc và tiêu chí nghiệm thu

### Mốc 1 — Khung ngoại tuyến và nội dung ba lớp

Tạo trang tiếng Việt, nhãn chế độ, hai vùng Header/Line, tổng quan và thẻ thuật ngữ. Seed độc lập: SP01 6 đơn vị giá 1 triệu, SP02 60 giá 50.000, SP03 40 giá 25.000; hai khách, một kho.

**Đạt khi:** mở index.html trực tiếp trên Edge/Chrome Windows không cần mạng; không yêu cầu server hoặc tenant D365. Hai chế độ không chia sẻ đối tượng dữ liệu. Thẻ học phân biệt O2C chung, liên hệ D365 và giới hạn lab; có đủ Header/Line, Confirm, Picking, Packing slip, Backorder, Settlement. Nói rõ physical-only reservation không là luật chung ERP. Bài học đọc ngoại tuyến; link nguồn Learn chỉ là tùy chọn. Có nhãn trường và dùng bàn phím được.

### Mốc 2 — Đơn, Confirm, giữ, Picking và Packing slip

Tách SalesOrderHeader/Line, đúng một line/đơn. Làm Confirm một lần với snapshot; giữ đúng line; Picking phân bổ reservation; Packing slip dùng đúng cặp nguồn. Thêm backorder và các chỉ tiêu số lượng, nhật ký/trước-sau cho các thao tác đã có.

**Đạt khi:** TH01–TH06, TH16–TH17 và phần đầu vào số lượng TH15 đúng. Đặt 10 khi có 6 vẫn hợp lệ; giữ 10 bị chặn; giữ 6 hợp lệ. Confirm/Picking không giảm tồn thực tế; trước giao 6 vẫn còn 6 vật lý. Ghi nhận Packing slip 6 một lần làm tồn/giữ/khả dụng/đã lấy chưa giao về 0, backorder 4. Chặn nguồn sai đơn và số lượng vượt ngay ở domain, không chỉ ô nhập. Bấm đúp không sinh hai chứng từ. Không áp quy trình này thành khẳng định D365 luôn bắt buộc Confirm/Picking trước giao.

### Mốc 3 — Invoice, payment và settlement với ba số dư

Invoice theo packing slip; CustomerPayment riêng Settlement; quan hệ nhiều-nhiều cùng khách, giới hạn dư hai phía. Hiển thị O/U/N và các trạng thái giao/invoice/settlement độc lập.

**Đạt khi:** TH07–TH13, TH18 và phần số tiền TH15 đúng. Case chuẩn sau invoice O/U/N=6/0/6 triệu, sau payment **6/4/2**, sau settlement **2/0/2**. Không dùng câu “payment không đổi công nợ” nếu không chỉ rõ đó là dư invoice mở. N âm được phép; không ghi số âm vào payment. Chặn sai khách, vượt dư payment và vượt dư invoice. Ròng 0 chưa settlement không đóng invoice/đơn. Thử invoice đã trả hết nhưng backorder vẫn 4: đơn chưa hoàn tất. Không thêm GL để tính các chỉ tiêu này.

### Mốc 4 — Lưu và khôi phục độc lập hai chế độ

Làm hai khóa localStorage, schemaVersion/revision, lỗi đọc/ghi, xuất/nhập JSON và đặt lại có xác nhận. Ghi nguyên tử mỗi thao tác gồm chứng từ/sự kiện; giữ trạng thái trong bộ nhớ khi lưu lỗi.

**Đạt khi:** TH14 và các ca dữ liệu ở mục 4 learning-scenarios đúng. Tải lại sau payment trước settlement khôi phục 6/4/2, không tự settlement. Lỗi setItem hiện cảnh báo chưa lưu liên tục, vẫn xuất được bản phiên và thử lưu lại không nhân đôi. Dữ liệu hỏng không bị seed ghi đè; file nhập sai line/khách/nguồn Picking/Reservation hoặc sai mode không thay dữ liệu. File có N âm hợp lệ khôi phục được, O/U âm bị chặn. Đặt lại chỉ xóa chế độ được chọn; xung đột revision chặn ghi và hướng dẫn bảo toàn dữ liệu.

### Mốc 5 — Bài hướng dẫn thiếu hàng và kiểm tra hiểu tác động

Làm tám thao tác của case: tạo Header/Line → Confirm → giữ 6 → Picking 6 → Packing slip 6 → invoice 6 triệu → payment 4 triệu → settlement 4 triệu. Có vai trò, lý do, trước/sau và câu hỏi từng bước; cuối bài có bài kiểm tra giải thích theo mục 2 learning-scenarios.

**Đạt khi:** chứng từ/quan hệ/bất biến và số liệu thực cùng đúng, câu hỏi từng bước và kiểm tra cuối đều đạt mới công nhận bài. Kết thúc có 1 header/line, 1 confirmation, 1 reservation, 1 picking, 1 packing slip, 1 invoice, 1 payment, 1 settlement; 8 sự kiện; giao/invoice 6/10, backorder 4, O/U/N=2/0/2 triệu. **Bài hoàn thành nhưng đơn chưa hoàn tất** phải hiện rõ. Chỉ bấm hết nút, đặt cờ completed, đọc memory hoặc nhập đáp án đúng khi chứng từ sai đều không qua. Dữ liệu đúng nhưng giải thích sai cũng chưa qua; được xem lại và thử lại. Chấm đáp án số/lý do có cấu trúc tại máy, không đòi AI/API đánh giá văn bản.

### Mốc 6 — Tự thực hành, dòng chứng từ và khả năng giải thích

Hoàn thiện nhiều đơn, nhiều đợt giữ/lấy/giao/invoice/payment/settlement; mở liên kết chứng từ và nhật ký; phản hồi “sai ở đâu → vì sao → làm gì tiếp”.

**Đạt khi:** lần theo đúng Header/Line → confirmation → reservation → picking → packing slip → invoice và từ settlement sang payment theo khách. Không vẽ payment thành con bắt buộc của một đơn, vẫn cho ghi payment trước invoice. O/U/N được gắn tên riêng, không dùng một nhãn “công nợ” cho cả ba. Người mới giải thích được TH08, TH13, TH17, TH18 qua dữ liệu/thông báo, không cần đọc mã. Không có tính năng credit/aging/collections xuất hiện vì tham khảo memory. Giao diện dùng bàn phím được và không chỉ dùng màu báo trạng thái.

### Mốc 7 — Kiểm chứng Windows và đóng gói

Viết hướng dẫn tải/giải nén/mở file, sao lưu/chuyển thư mục/trình duyệt, giới hạn một tab và localStorage `file://`; đóng ZIP file tĩnh, không build bắt buộc.

**Đạt khi:** giải nén đường dẫn có dấu/khoảng trắng, mở ngoại tuyến bằng Edge và Chrome trên Windows; chạy tám thao tác cùng kiểm tra hiểu và TH01–TH18. Kiểm chứng lưu/tải lại, xuất/nhập, reset, lỗi lưu, không phát sinh yêu cầu mạng bắt buộc. Ghi Windows/trình duyệt và ca đạt/thất bại/chưa chạy. Chưa kiểm Windows không được coi là nghiệm thu Windows; không dùng kết quả Linux thay thế. Không quảng bá là mô phỏng đầy đủ D365 hay hệ thống kế toán.

## 4. Chiến lược kiểm tra và rà soát tài liệu

- **Số lượng:** assert toàn bộ phân bổ và bất biến sau từng thao tác; Picking vẫn trong lượng giữ; Packing slip giảm tồn đúng một lần. Thất bại giữ nguyên trạng thái/bộ đếm/nhật ký thành công.
- **Ba số dư:** assert O/U/N riêng trước/sau invoice, payment, settlement; N=O−U và tổng invoice−tổng payment. Bắt lỗi mô hình cũ “payment không đổi mọi số dư”, lỗi settlement giảm ròng lần nữa và lỗi chặn N âm.
- **Bài học:** kiểm tra chứng từ thật và giải thích độc lập; tải lại bước đã làm nhưng chưa trả lời không tạo lại nghiệp vụ; ảnh chụp bước trước đối chiếu theo sequence, không đòi tổng hiện tại giữ nguyên số cũ. Bài thiếu hàng kết thúc đúng vẫn để đơn mở.
- **Lưu trữ:** đưa lớp lưu giả có thể ném lỗi quota/quyền; thử parse/schema/mode/tham chiếu sai, phiên tạm, khôi phục và revision xung đột.
- **Tích hợp/Windows:** dùng đầy đủ ca trong learning-scenarios, ghi số ca đã chạy; trang mở được hoặc kiểm cú pháp không chứng minh nghiệp vụ đúng.
- **Nội dung D365:** rà mọi câu “luôn/phải/chỉ” xem đó là luật lab hay mô tả có nguồn; không ánh xạ một-một trạng thái lab vào D365. Kiểm lại nguồn Learn khi thay nội dung; không tự thêm tính năng từ trang tham khảo.

Không cần framework test hoặc dependency runtime nếu trang test JavaScript nội bộ đáp ứng; chỉ dành cho người phát triển. Ở task tài liệu chỉ rà soát nội dung/số liệu, không tuyên bố các ca test app đã chạy.

## 5. Rủi ro và giới hạn cần giữ

- `file://` và localStorage tùy trình duyệt: kiểm chứng sớm; nếu lưu bị chặn phải dùng được trong phiên và xuất sao lưu, không âm thầm yêu cầu server.
- Còn 4 chờ giao nhưng chưa có nhập kho: kết quả chủ đích của bài, không là lỗi cần mở rộng scope. Practice vẫn có thể hoàn tất đơn nhỏ đủ tồn và xử lý nhiều đợt.
- Nguồn Microsoft có các biến thể reservation, invoicing, settlement và posting ngoài V1: đưa vào chú thích giới hạn khi cần, không biến thành tính năng mặc định.
- Chỉ hỗ trợ một tab; không cộng tác/đồng bộ. Snapshot và dữ liệu chưa triển khai không cần migration ở task này.

**Điểm dừng hiện tại:** cập nhật đúng bốn tài liệu thiết kế; chưa triển khai app, chưa cấu hình D365 hoặc viết X++/integration/GL.
