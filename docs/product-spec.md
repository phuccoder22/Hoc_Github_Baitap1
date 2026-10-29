# O2C Learning Lab — Đặc tả sản phẩm

## 1. Mục tiêu và căn cứ thiết kế

Ứng dụng web tiếng Việt giúp người mới hiểu Order to Cash (O2C) bằng thao tác và quan sát chứng từ, tồn kho, hóa đơn, khoản thanh toán. Chạy ngoại tuyến: tải ZIP, giải nén trên Windows, mở `index.html`; không cần server, API, API key hay tài khoản D365.

Bối cảnh V1: một công ty phân phối, một kho, hai khách hàng, ba sản phẩm; nhiều đơn, mỗi đơn đúng một dòng sản phẩm. Hai chế độ “Học có hướng dẫn” và “Tự thực hành” có dữ liệu độc lập.

### Quyết định đã xác nhận và tài liệu tham khảo

- Yêu cầu trong hội thoại là căn cứ phạm vi: tách O2C chung/D365; bổ sung Header/Line, Confirm, Picking, Packing slip, Backorder, Settlement; tách ba số dư; dùng case đặt 10, tồn 6, giao 6, invoice 6 triệu, payment 4 triệu, settlement 4 triệu; kiểm tra trạng thái và hiểu tác động. Yêu cầu V1.1 triển khai hai chế độ dùng chung nghiệp vụ.
- Đã đọc file người dùng cung cấp `memory_O2C.md` (được nhắc ban đầu là `memory_O2C(1).md`). File là ghi chú tham khảo, không phải danh sách yêu cầu được duyệt. Chọn phần thuật ngữ và case phù hợp với quyết định trong hội thoại.
- Không kế thừa kết luận “đã hoàn tất O2C nhập môn”, định hướng nghề developer hay lộ trình X++ trong memory thành trạng thái/nhiệm vụ của người học. Các ví dụ credit hold, aging, collections không trở thành tính năng V1.
- Các lựa chọn cụ thể như giá seed, một dòng/đơn, biểu diễn Picking và không nhập thêm hàng là giả định thiết kế V1 ở mục 3; không gán chúng thành quy luật ERP hoặc quyết định đã có trong memory.
- Nguồn Microsoft Learn và nội dung đối chiếu nằm ở [business-rules.md, mục 10](business-rules.md#10-nguồn-microsoft-learn-và-phạm-vi-đối-chiếu).

## Phạm vi V1.1 hiện hành

V1.1 mở rộng mốc 1, giữ nguyên tám nghiệp vụ và quy tắc tồn/số dư. Mục tiêu: người mới phân biệt **thiếu hàng, thiếu hóa đơn, thiếu tiền và thiếu cấn trừ**.

- **Nhật ký:** mọi sự kiện có chứng từ, lượng/tiền, lời giải thích và bảng trước/sau có dữ liệu. Tạo đơn/Confirm hiện cả lượng đặt/trạng thái và số không đổi. Settlement hiện O/U giảm, N không đổi; không mô tả là nhận tiền mới. Xem lại chỉ đọc chứng từ theo sequence, không execute hoặc ghi dữ liệu.
- **Chi tiết đơn:** hiển thị còn chờ giao, đã giao chưa invoice, chưa giao nên chưa đủ điều kiện invoice và dư mở invoice riêng đơn; có nút đi đến thao tác hợp lệ. Khi kho thiếu, giải thích giới hạn chưa nhập kho, không tăng tồn thay người học.
- **Tiền của khách:** hiển thị các tổng thực và phép tính O/U/N; N dương/0/âm được giải thích. U là tiền dùng chung của khách, chưa dành cho đơn đang xem; thiếu tiền ròng hiển thị ở cấp khách, không dùng làm dư riêng của đơn. N=0 không tự đóng invoice hoặc settlement.
- **Xem trước:** bảng và lời giải thích mở sẵn, tính bằng cùng Domain.execute trên bản sao. Chỉ Ghi nhận mới execute lại trên trạng thái hiện tại; chống request trùng và đổi chế độ khi đang xem trước.
- **Guided:** một case đặt 10/tồn 6/giao 6/invoice 6 triệu/payment 4 triệu/settlement 4 triệu. Mỗi bước có vai trò, dự đoán có cấu trúc trước thao tác và kiểm tra lý do sau thao tác. Sai được thử lại mà không tạo chứng từ. Kiểm tra cuối dựa cả câu trả lời và dữ liệu thật; kết thúc ghi rõ “Bài học hoàn thành; đơn chưa hoàn tất”.
- **Practice:** tự xử lý nhiều đơn như mốc 1; thêm bài hoàn tất đơn 2 SP01 từ dữ liệu mới, giá 1 triệu. Bắt đầu/đặt lại bài cần xác nhận xóa riêng practice; không tạo đơn hoặc xử lý hàng/tiền thay người học. Hoàn thành chỉ khi giao đủ, invoice đủ và các invoice của đơn hết dư.
- **Cô lập:** hai khóa guided/practice, cùng seed/domain. URL #guided/#practice giữ chế độ khi tải lại; trạng thái học nằm ở lessonProgress của đúng dataset. Học, xem trước, lưu/retry/reset không tạo Event nghiệp vụ; case chuẩn đúng 8 Event.

**Ngoài V1.1:** nhập kho, thuế, giá vốn, doanh thu kế toán, GL, credit management, aging, collections, X++, integrations, AI/API, nhập/xuất JSON, migration và nhiều tab. Ngân hàng 18 tình huống không phải 18 bài đã xây. Lưu lỗi báo nguy cơ mất phiên, không hứa có sao lưu tải xuống.

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
| Lưu tại máy | localStorage riêng từng chế độ; V1.1 có chế độ bộ nhớ khi lưu lỗi; chưa có sao lưu JSON | `file://` tùy trình duyệt, dữ liệu có thể tách theo đường dẫn; chỉ hỗ trợ một tab |

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
- **Dữ liệu:** V1.1 lưu cả chứng từ và tiến độ học, đặt lại có xác nhận chỉ cho chế độ đang chọn. Xuất/nhập JSON để mốc sau.

### Học có hướng dẫn

Case chuẩn: đặt 10 SP01, tồn 6, giao 6, đơn giá 1.000.000; invoice 6.000.000, payment 4.000.000, settlement 4.000.000. Vai trò và lý do thao tác hiện ở từng bước. Xem bảng trước/sau và câu hỏi giải thích tác động. Điều kiện qua bước = chứng từ/trạng thái thật đúng **và** trả lời đúng câu hỏi hiểu tác động. Khi sai được xem lại giải thích và thử lại, không mất hoặc tạo thêm chứng từ.

Bài hoàn thành khi đạt trạng thái đích của case và vượt kiểm tra hiểu; đơn vẫn chưa hoàn tất: còn chờ giao 4, invoice 6.000.000 còn mở 2.000.000; payment 4.000.000 đã được settlement hết (dư payment = 0). Chi tiết ở [learning-scenarios.md](learning-scenarios.md). Không dùng số lần bấm hoặc phần trăm nút đã bấm làm bằng chứng hoàn thành.

### Tự thực hành

Tự tạo nhiều đơn, giữ/pick/giao/invoice từng phần, ghi nhận nhiều payment và settlement nhiều lần. Cho thu trước invoice; chặn mọi phân bổ vượt hoặc sai khách/đơn. Backorder có thể tồn tại vì V1 không bổ sung hàng. Lỗi nêu rõ “sai ở đâu, vì sao, làm gì tiếp”; ví dụ: “Bạn muốn giữ 10 nhưng simulator chỉ còn 6 sản phẩm vật lý khả dụng. Hãy giữ tối đa 6; 4 còn lại vẫn chờ giao. ERP thực tế có thể có chính sách reservation khác.”

## 5. Phản hồi, lưu và trải nghiệm

Mỗi thao tác: nhập → xem trước → xác nhận thao tác → kiểm tra lại trạng thái mới nhất → ghi nguyên tử chứng từ/sự kiện → hiển thị trước/sau và tình trạng lưu. Bấm đúp không tạo hai chứng từ cho một lần xác nhận. “Confirm đơn bán” là một nghiệp vụ riêng, không phải nút xác nhận chung của mọi biểu mẫu.

Nhãn tiếng Việt kèm thuật ngữ Anh khi cần; không chỉ dùng màu để báo trạng thái; có nhãn trường, lỗi gần trường và dùng bàn phím được. Ưu tiên máy tính Windows, vẫn đọc được khi thu hẹp cửa sổ.

Khi lưu thất bại, giữ trạng thái hợp lệ trong bộ nhớ và hiện liên tục “Chưa lưu trên máy; đóng trang có thể mất dữ liệu”; có thử lưu lại. V1.1 chưa có xuất JSON; đóng trang khi chưa lưu có thể mất dữ liệu phiên. Không báo đã lưu nếu chỉ cập nhật bộ nhớ. Dữ liệu hỏng/khác phiên bản không bị ghi đè tự động; cho bảo toàn dữ liệu gốc và đặt lại có xác nhận. Chi tiết ở business-rules.

## 6. Tiêu chí thành công

Người học giải thích được Confirm ≠ giao, Picking ≠ Packing slip, Backorder ≠ dư nợ, Payment ≠ Settlement; phân biệt ba số dư khách hàng và giới hạn simulator với ERP thực tế. Case đúng số liệu sau từng bước, đặc biệt payment làm giảm số dư ròng trước settlement. Tự thực hành chặn sai nghiệp vụ và cô lập hai chế độ. Chạy Windows ngoại tuyến, lưu/khôi phục hoặc thông báo lỗi đúng phải được kiểm chứng ở task triển khai, không coi tài liệu này là bằng chứng app đã chạy.
