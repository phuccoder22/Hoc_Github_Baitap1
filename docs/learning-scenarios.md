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

## 2. Case xuyên suốt: Đặt 10, có 6, giao 6 và thanh toán một phần

### Tình huống và mục tiêu

KH01 — Công ty An Phát đặt 10 SP01 — Gạch lát nền, giá giả định 1.000.000/đơn vị học tập. Kho chỉ có 6. Người học xác nhận đơn, giữ/lấy/giao 6, invoice 6.000.000, ghi nhận payment 4.000.000, rồi settlement 4.000.000.

Mục tiêu là hiểu tình trạng **đang xử lý một phần**, không phải bằng mọi cách hoàn tất đơn. Không tự thêm 4 vào kho hoặc giảm lượng đặt về 6 để có kết quả đẹp. Bài hoàn thành đúng khi người học giải thích được vì sao vẫn còn backorder 4 và invoice mở 2 triệu.

Khi xây guided ở mốc sau, dùng riêng dataset `guided`. Mốc 1 dùng case này như hướng dẫn thao tác thủ công trong `practice`, không xây bộ điều phối bài học. Cả hai khởi đầu theo business-rules: SP01 thực tế 6, giữ 0, khả dụng 6, đã lấy chưa giao 0; chưa có đơn/invoice/payment/settlement; số dư khách bằng 0. KH02, SP02 và SP03 không đổi trong bài. Khi chạy guided ở mốc sau, dataset `practice` không bị tác động; khi tự thử case trong mốc 1, chỉ practice thay đổi.

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

### Điều kiện qua từng bước và câu hỏi hiểu tác động — dành cho guided ở mốc sau

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

### Kiểm tra cuối bài: giải thích và đối chiếu thực tế — dành cho guided ở mốc sau

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

**Kết thúc:** payment 4 triệu đã được settlement hết (số dư payment = 0); invoice 6 triệu còn mở 2 triệu, tức invoice mới được settlement một phần; đơn SO-01 còn 4 sản phẩm chờ giao. Bài học ở mốc sau chỉ đạt nếu kiểm tra trên đạt, khác với đơn hoàn tất. Không tự thêm hàng, payment, settlement hoặc đóng đơn sau khi bấm hết bước.

### Câu hỏi dự đoán trước thao tác (nội dung học)

Trước một số thao tác, hỏi dự đoán, sau đó đối chiếu số liệu thật và giải thích. Mốc 1 có gợi ý dự đoán trong xem trước thao tác; chưa chấm điểm hoặc ghi tiến độ bài hướng dẫn.

| Trước thao tác | Câu hỏi dự đoán | Tác động cần đối chiếu sau đó |
| --- | --- | --- |
| Confirm | Xác nhận đơn có làm giảm tồn 6 không? | Không; chỉ có confirmation, tồn và ba số dư không đổi |
| Picking 4 sau giữ 6 | Hàng đã lấy còn ở trong tồn và lượng giữ không? | Có; tồn 6, giữ 6, khả dụng 0, lấy chưa giao 4 |
| Giao 3 sau giữ 6/lấy 4 | Tồn, giữ, khả dụng, lấy chưa giao còn bao nhiêu? | 3 / 3 / 0 / 1; PackingSlip chỉ giảm tồn một lần |
| Payment 4 triệu sau invoice 6 triệu | O/U/N sẽ là bao nhiêu, invoice đã giảm dư chưa? | 6/4/2 triệu; invoice chưa giảm số dư mở |
| Settlement 4 triệu | Ròng có giảm thêm 4 triệu không, payment còn dư không? | Không; O/U/N=2/0/2, payment dùng hết |

## 3. Ngân hàng 18 tình huống và kết quả mong đợi

**Đây là ngân hàng tình huống nghiệp vụ, không phải 18 bài cần xây trong mốc 1.** Mốc 1 không có hệ thống giao/chấm bài. Kiểm chứng tự thực hành bằng case chính và TH02, TH04, TH05, TH06, TH07, TH08, TH09, TH12, TH18; thêm các kiểm tra bắt buộc về giữ 6/lấy 4/giao 3, lỗi lưu, bấm đúp và sự kiện. Các tiêu chí guided, import, migration, nhiều tab ở phần sau chỉ áp dụng mốc tương ứng.

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

## 4. Tình huống dữ liệu và giao diện — ghi rõ mốc áp dụng

- **Tải lại:** sau payment trước settlement (bước 7) và cuối case, tải lại; nếu lưu được, khôi phục đúng trạng thái, câu hỏi, ID liên kết và ba số dư; không tạo lại nghiệp vụ.
- **Hoàn thành giả (khi xây guided):** đặt cờ completed hoặc bấm hết nút khi chưa có PS-01/ST-01 đúng liên kết; không được công nhận. Dữ liệu đích đúng nhưng câu hỏi/giải thích sai cũng chưa hoàn thành. N=0 không thay kiểm tra invoice còn mở.
- **Lỗi lưu (mốc 1):** giả lập setItem ném lỗi quota/quyền; vẫn có trạng thái hợp lệ trong phiên và cảnh báo rõ; thử lưu lại không tạo thêm chứng từ. Không có xuất JSON ở mốc 1.
- **Dữ liệu hỏng:** lỗi JSON/schema không hỗ trợ không âm thầm ghi đè. Bảo toàn bản gốc nếu đọc được, rồi đặt lại có xác nhận.
- **Nhập sai (mốc sau, chưa mốc 1):** ID trùng, tham chiếu mất, sai line/khách, phân bổ vượt Picking/Reservation, O/U âm, sai mode hoặc >5 MB bị từ chối. N âm đúng công thức phải được chấp nhận. Nhập file hợp lệ khôi phục đúng cả ba số dư.
- **Bấm lặp:** bấm đúp một lần xác nhận chỉ có một chứng từ; mở lại bước cũ không chạy lại. Trong practice, thao tác lặp có chủ đích vẫn hợp lệ nếu còn lượng/số dư.
- **Hai tab (mốc sau, chưa mốc 1):** phát hiện revision mới hơn thì chặn ghi và hướng dẫn xuất/tải lại; không tuyên bố có khóa đồng thời đầy đủ.
- **Windows ngoại tuyến:** giải nén ở đường dẫn có dấu/khoảng trắng, mở index.html bằng Edge/Chrome khi ngắt mạng; mốc 1 chạy case tự thực hành, lưu/tải lại và đặt lại; nghiệm thu Windows đầy đủ và xuất/nhập theo mốc sau. Đọc bài không cần truy cập Microsoft Learn; link chỉ là tham khảo trực tuyến tùy chọn.
