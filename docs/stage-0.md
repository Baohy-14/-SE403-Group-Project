# Giai đoạn 0 – Khởi động Dự án & Hiểu Bài toán: MediLink

- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm (*Software Architecture & Design*)
- **Giảng viên hướng dẫn:** TS. Nguyễn Đức Mận (`@ManNguyen`)
- **Đề tài lựa chọn:** **Đề tài 1 – MediLink: Nền tảng đặt lịch khám và hồ sơ sức khỏe điện tử**

---

## 1. Thành viên Nhóm và Phân vai (Bước 1)

Nhóm gồm **4 thành viên** đảm nhiệm đầy đủ 5 vai trò chuẩn của quy trình thiết kế kiến trúc (trong đó thành viên Lê Viết Nghĩa kiêm nhiệm vai trò *Requirements Owner* và *Documentation Owner*; mọi thành viên đều tham gia đọc hiểu, phản biện chéo và nắm vững toàn bộ các phần):

| STT | Họ và Tên | Vai trò đảm nhiệm | Trách nhiệm cốt lõi xuyên suốt dự án |
|:---:|-----------|-------------------|--------------------------------------|
| 1 | **Trần Tiến Danh** | Phụ trách Prototype (*Prototype Lead*) | Hiện thực khung kiến trúc (*Architectural Skeleton*) trong `src/`, lớp Anti-Corruption Layer (ACL) & 4 HIS Adapters, cơ chế Redis Distributed Lock kèm Fencing Token, SQLite RDBMS (`UNIQUE` + Trigger), mã hóa `AES-256-GCM`, tiến trình `medilink-worker` và cấu hình `docker-compose.yml`. |
| 2 | **Lê Viết Nghĩa** | Phụ trách Yêu cầu & Tài liệu (*Requirements & Documentation Owner*) | Phân tích Business Goals, Stakeholders, 10 Use Cases, phân loại dữ liệu y tế & trích xuất 5 ràng buộc kỹ thuật từ Nghị định 13/2023/NĐ-CP; biên tập đồng bộ hồ sơ SAD, Slide thuyết trình, báo cáo tổng hợp `.docx` và nhật ký trung thực `ai-log.md`. |
| 3 | **Nguyễn Đức Bảo Hy** | Kiến trúc sư trưởng (*Lead Architect*) | Chủ trì xây dựng Utility Tree, lựa chọn ASR mức `(H, H)`, đối chiếu Tactics theo Bass et al., thiết kế đồng bộ hệ thống sơ đồ C4 (Context, Container, Component), Deployment View, Sequence Diagrams; chủ trì phiên ATAM (M3) và phê duyệt chuỗi 7 bản ghi quyết định kiến trúc (`ADR-001` → `ADR-007`). |
| 4 | **Nguyễn Quang Trường** | Phụ trách Đảm bảo Chất lượng & Kiểm thử (*QA/Test Lead*) | Định lượng hóa 8 Quality Attribute Scenarios chuẩn 6 phần kèm cơ sở tính toán con số đo lường; xây dựng bộ 6 kịch bản kiểm thử tự động trong `src/tests/` (Concurrency 50 requests, Fault Injection HIS Huế, Security ABAC/Consent/Encryption, Audit Tamper Detection, FHIR Extensibility, Load Read 200 reqs); thu thập số liệu thực đo. |

### Tổ chức Cấu trúc Repository Chuẩn
```text
├── README.md                  # Tổng quan dự án, kiến trúc và hướng dẫn chạy nhanh
├── ai-log.md                  # [BẮT BUỘC] Nhật ký sử dụng AI đủ 6 cột và quy tắc 3 câu hỏi
├── docker-compose.yml         # Khởi chạy 6 containers trên 3 mạng cách ly bằng 1 lệnh duy nhất
├── docs/                      # Hồ sơ kiến trúc đầy đủ qua 5 mốc (Stage 0, M1, M2, M3, M4, M5 SAD, Slides, Q&A)
├── adr/                       # 7 Architecture Decision Records (ADR-001 -> ADR-007, gồm cả cập nhật Superseded ở v2)
├── diagrams/                  # 6 sơ đồ kiến trúc dạng mã nguồn C4-PlantUML (có Trust Boundary & Legend)
└── src/                       # Mã nguồn Prototype hoàn chỉnh (core/, worker/, mock-his/, tests/)
```

---

## 2. Đọc hiểu Đề tài Độc lập của Từng Thành viên – 5 Câu Tóm tắt (Bước 2)

Trước khi họp thống nhất, từng thành viên tự đọc bản mô tả Đề tài 1 và viết 5 câu tóm tắt dưới góc nhìn vai trò của mình:

### 2.1. Nguyễn Đức Bảo Hy (*Lead Architect*)
1. MediLink giải quyết bài toán hợp nhất đặt lịch khám và liên thông hồ sơ sức khỏe điện tử (EHR) cho chuỗi 12 phòng khám tại Đà Nẵng, Huế và Quảng Nam vốn đang vận hành rời rạc bằng điện thoại, Excel và 3 hệ thống phần mềm HIS không đồng nhất.
2. Về mặt kiến trúc, điểm khó nhất không nằm ở giao diện đặt lịch mà nằm ở việc vừa phải giữ miền nghiệp vụ lõi sạch sẽ trước các giao thức dị biệt (`REST/JSON`, `SOAP/XML`, `Custom RPC`), vừa phải đảm bảo mở rộng thêm HIS thứ 4 trong tối đa 2 tuần công mà không sửa code lõi.
3. Khi 50 bệnh nhân cùng săn một khung giờ khám của bác sĩ chuyên khoa giỏi, hệ thống bắt buộc đạt tỷ lệ đặt trùng lịch bằng `0%` ngay cả khi mở rộng nhiều instance hoặc mạng di động gửi lặp request.
4. Hệ thống phải cô lập được sự cố cục bộ: nếu máy chủ HIS tại Huế mất kết nối suốt 2 giờ, việc đặt khám ở các cơ sở Đà Nẵng và Quảng Nam vẫn phải diễn ra bình thường để giữ độ sẵn sàng chung tối thiểu `99.5%`.
5. Với quy mô nhóm 4 sinh viên trong 15 tuần và lưu lượng chuỗi 12 phòng khám, phong cách **Modular Monolith kết hợp Hexagonal Architecture** kèm tiến trình Worker tách rời là lựa chọn cân bằng tốt nhất giữa tính nhất quán dữ liệu, khả năng cô lập lỗi và chi phí vận hành.

### 2.2. Lê Viết Nghĩa (*Requirements & Documentation Owner*)
1. Hệ thống phục vụ 7 nhóm bên liên quan (Bệnh nhân, Bác sĩ, Lễ tân, Quản lý cơ sở, Ban Giám đốc, Bộ phận IT, Cơ quan quản lý y tế) với nhiều mong muốn đối lập nhau giữa sự tiện lợi, tốc độ truy cập và yêu cầu kiểm soát quyền riêng tư.
2. Ngoài luồng đặt/đổi/hủy lịch và thanh toán đặt cọc, MediLink còn quản lý tiền sử bệnh, đơn thuốc, kết quả xét nghiệm PDF/hình ảnh, nhắc lịch qua SMS/Zalo/Email và cung cấp bảng điều khiển thống kê cho Ban Giám đốc.
3. Theo Nghị định 13/2023/NĐ-CP, thông tin tình trạng sức khỏe là **dữ liệu cá nhân nhạy cảm**, đòi hỏi sự đồng ý tường minh (*Consent*) của bệnh nhân khi chia sẻ liên cơ sở, mã hóa dữ liệu nhạy cảm khi lưu trữ và hạn chế tối đa phạm vi nhân sự được xem.
4. Một quy tắc nghiệp vụ sống còn là nhân viên lễ tân cơ sở nào chỉ được phép tiếp đón và xem thông tin hành chính của bệnh nhân cơ sở đó, tuyệt đối bị chặn nếu cố truy cập hồ sơ thuộc cơ sở khác.
5. Mọi thao tác đọc, ghi hoặc cố tình truy cập trái phép vào hồ sơ bệnh án đều phải được lưu lại trong nhật ký kiểm toán chỉ ghi thêm (*Append-only*) để phục vụ thanh tra pháp lý bất cứ lúc nào.

### 2.3. Trần Tiến Danh (*Prototype Lead*)
1. Prototype của nhóm không tập trung viết thật nhiều màn hình CRUD mà tập trung hiện thực chuẩn xác khung kiến trúc (*Architectural Skeleton*) ánh xạ 1-1 với sơ đồ Container và Component View, khởi chạy trọn vẹn bằng `docker compose up`.
2. Để mô phỏng thực tế chuỗi 12 phòng khám, nhóm cần dựng các máy chủ Mock HIS độc lập nói các "ngôn ngữ" khác nhau (Đà Nẵng dùng REST/JSON với mã UUID, Huế dùng SOAP 1.1/XML với mã y tế chuỗi, Quảng Nam dùng RPC với mã số nguyên) và dịch qua mô hình chuẩn HL7 FHIR R4 (`Patient`, `Appointment`).
3. Để chống double-booking triệt để mà không làm nghẽn CSDL, luồng đặt lịch cần kết hợp 3 chốt chặn: kiểm tra khóa `X-Idempotency-Key`, giữ khóa phân tán nguyên tử trên Redis kèm `Fencing Token` (nhả khóa ngay sau khi ghi DB), và ràng buộc `UNIQUE` ở tầng CSDL quan hệ.
4. Dữ liệu bệnh án trong bảng `medical_records` phải được mã hóa thật ở cấp trường bằng thuật toán `AES-256-GCM`, còn tệp PDF xét nghiệm tách ra kho Object Storage mã hóa và chỉ tải được qua đường dẫn Pre-signed URL ngắn hạn.
5. Khi Mock HIS Huế bị tắt hoặc trả lỗi `503`, bộ ngắt mạch `CircuitBreaker` phải mở mạch tức thì và chuyển lịch hẹn vào bảng `outbox_events` để tiến trình `medilink-worker` tự động đồng bộ bù có điều tiết nhịp độ khi HIS Huế sống lại.

### 2.4. Nguyễn Quang Trường (*QA/Test Lead*)
1. Mọi yêu cầu chất lượng như "nhanh", "ổn định", "bảo mật" đều vô nghĩa nếu không chuyển thành kịch bản 6 phần có con số đo đạc cụ thể và giải thích rõ nguồn gốc của từng con số đó.
2. Bài kiểm thử đồng thời phải bắn đúng 50 HTTP POST song song vào cùng 1 bác sĩ và cùng 1 khung giờ, kiểm tra cả phản hồi HTTP (`1` mã `201`, `49` mã `409`) lẫn đếm trực tiếp trong bảng SQLite để chứng minh `double-booking = 0%`.
3. Bài kiểm thử chịu lỗi phải chủ động đánh sập Mock HIS Huế, đo thời gian phản hồi Fast-fail khi mạch `OPEN`, chứng minh Đà Nẵng và Quảng Nam vẫn đạt `100%` thành công, sau đó bật lại HIS Huế để kiểm chứng Outbox không làm mất đơn.
4. Bài kiểm thử bảo mật phải đóng vai kẻ tấn công và nhân viên tò mò: gửi JWT giả chữ ký (`401`), lễ tân Đà Nẵng đọc bệnh án Huế (`403` + có dòng Audit Log), bác sĩ chưa có Consent đọc liên cơ sở (`403`), và mở thẳng file SQLite để kiểm tra không lộ chữ rõ, thử chạy `UPDATE/DELETE` trên `audit_logs` để chứng minh hệ thống phát hiện gian lận 100%.
5. Toàn bộ số liệu đưa vào báo cáo M4 và SAD phải là số đo thật chạy trên chính máy tính của nhóm kèm thông số CPU, RAM, hệ điều hành rõ ràng để ai cũng tái hiện lại được.

---

## 3. Nhận thức Thống nhất của Cả Nhóm & 10 Câu hỏi Làm rõ Yêu cầu với Khách hàng

Sau khi đối chiếu 4 bản tóm tắt, cả nhóm thống nhất danh sách **10 câu hỏi kiến trúc cốt lõi** đặt ra cho Ban Giám đốc & Bộ phận IT chuỗi phòng khám, từ đó chốt lại bảng **Giả định Kiến trúc (Assumptions A1–A10)**:

| Mã | Câu hỏi Kiến trúc sư hỏi Khách hàng | Giả định Chốt của Nhóm (Assumption) | Tác động tới Quyết định Kiến trúc | Mốc xác minh |
|:--:|--------------------------------------|--------------------------------------|-----------------------------------|:------------:|
| **A1** | Các phần mềm HIS hiện có tại 12 cơ sở có cho phép MediLink truy cập trực tiếp vào CSDL nội bộ của họ không? | **Không.** Các HIS là phần mềm thương mại đóng gói của bên thứ ba; chỉ cho phép tích hợp qua tầng dịch vụ (`REST API`, `SOAP XML Web Service` hoặc cổng `RPC` nội bộ). | Bắt buộc thiết kế lớp **Anti-Corruption Layer (ACL)** và Adapter riêng cho từng dòng HIS (`ADR-002`). | M1, M2 |
| **A2** | Khi cùng 1 bệnh nhân từng khám ở Huế rồi ra Đà Nẵng khám tiếp, mã bệnh nhân trên 2 HIS có giống nhau không? | **Không giống nhau.** Mỗi HIS tự sinh mã cục bộ riêng (UUID, chuỗi ký tự, số tự tăng). MediLink phải quản lý mã định danh xuyên chuỗi **Master Patient Index (`MPI`)** dựa trên CCCD + SĐT đã xác thực. | Bảng ánh xạ `patient_his_mappings` và tài nguyên chuẩn HL7 FHIR `Patient.identifier[]` tại ACL (`ADR-002`). | M2, M4 |
| **A3** | Mỗi khung giờ khám (*slot*) của một bác sĩ được phép nhận tối đa bao nhiêu bệnh nhân đặt trực tuyến? | Mỗi bác sĩ khám theo khung giờ chuẩn **30 phút/slot**, mỗi slot trực tuyến chỉ nhận **đúng 1 bệnh nhân** (`1-1`). | Cơ sở thiết lập khóa phân tán `lock:slot:{doctor_id}:{slot_time}` và ràng buộc `UNIQUE(active_slot_key)` (`ADR-003`). | M1, M2 |
| **A4** | Nếu khách hàng vãng lai (*walk-in*) đến trực tiếp quầy lễ tân đặt lịch cùng lúc với khách đặt trên app thì xử lý thế nào? | Quầy lễ tân sử dụng Portal MediLink để giữ slot trước khi in phiếu, hoặc phòng khám tách riêng quỹ slot Online (70%) và quỹ slot Walk-in dự phòng (30%) để tránh xung đột khi chi nhánh đứt mạng tạm thời. | Giảm thiểu xung đột *Split-brain* trong thời gian HIS chi nhánh mất kết nối 2 giờ (`ADR-007`). | M2, M3 |
| **A5** | Khi HIS của một cơ sở (như Huế) bị mất mạng 2 giờ, Ban Giám đốc muốn chặn không cho khách đặt lịch cơ sở Huế hay vẫn nhận giữ chỗ trên MediLink? | **Vẫn cho phép bệnh nhân giữ chỗ trên quỹ slot Online của MediLink**, trả thông báo rõ ràng "Đã giữ chỗ, đang chờ đồng bộ mã phiếu phòng khám" và tự động đồng bộ bù khi HIS Huế có mạng lại. | Áp dụng **Circuit Breaker + Graceful Degradation + Transactional Outbox** (`ADR-007`). | M2, M3, M4 |
| **A6** | Nhân viên lễ tân tại phòng khám có cần xem chẩn đoán bệnh và kết quả xét nghiệm của bệnh nhân để làm thủ tục tiếp đón không? | **Tuyệt đối không.** Lễ tân chỉ cần xem thông tin hành chính (họ tên, giờ hẹn, bác sĩ, trạng thái cọc) thuộc đúng cơ sở mình phụ trách. | Áp dụng **Contextual ABAC + Data Masking** che các trường lâm sàng đối với vai trò `RECEPTIONIST` (`ADR-004`). | M1, M2, M4 |
| **A7** | Bác sĩ tại cơ sở Đà Nẵng có được tự động xem toàn bộ bệnh sử cũ của bệnh nhân từng khám tại cơ sở Huế không? | Chỉ được xem khi **bệnh nhân đã cấp Sự đồng ý (*Explicit Consent*)** cho phép chia sẻ hồ sơ liên cơ sở trên ứng dụng (trừ trường hợp cấp cứu có ghi biên bản đặc biệt). | Bổ sung bảng `patient_consents` và kiểm tra bắt buộc tại `abacMiddleware.js` theo Điều 11 Nghị định 13/2023/NĐ-CP. | M1, M2, M4 |
| **A8** | Dung lượng và tần suất phát sinh tệp kết quả cận lâm sàng (PDF xét nghiệm, ảnh siêu âm/X-quang) lớn cỡ nào? | Trung bình **0.5 MB – 15 MB/tệp**, khoảng 1.500–2.000 tệp/ngày (~1–3 TB/năm), cần lưu trữ tối thiểu 10 năm theo quy định ngành Y. | Không lưu `BLOB` trong RDBMS; tách sang **Encrypted Object Storage + Pre-signed URL** (`ADR-006`). | M2 |
| **A9** | Lưu lượng người dùng thực tế của chuỗi 12 phòng khám ở mức nào để thiết kế hạ tầng không bị lãng phí (*over-engineering*)? | Khoảng **80.000 bệnh nhân hoạt động**, ~2.000–2.500 lịch hẹn/ngày; giờ cao điểm sáng 200 người tra cứu cùng lúc, đỉnh điểm 50 người tranh 1 slot bác sĩ nổi tiếng. | Chọn **Modular Monolith + Background Worker** thay vì cụm hàng chục Microservices tốn kém (`ADR-001`). | M1, M2 |
| **A10** | Yêu cầu thanh toán đặt cọc và gửi tin nhắn nhắc lịch (Zalo/SMS/Email) tích hợp ở mức nào trong giai đoạn đầu? | Kết nối qua cổng thanh toán và cổng Zalo ZNS/SMS qua HTTPS Webhook/REST; lỗi hoặc độ trễ từ nhà mạng không được làm hỏng giao dịch đặt lịch. | Xử lý gửi thông báo qua **Persistent Queue + Worker có Exponential Backoff** (`ADR-005`). | M2, M4 |

---

## 4. Tự kiểm tra Giai đoạn 0

### Câu 1: Vai trò của từng thành viên chịu trách nhiệm sản phẩm nào ở mỗi mốc (M1 → M5)?

| Thành viên (Vai trò) | M1 (Tuần 4 – Drivers) | M2 (Tuần 8 – Design v1) | M3 (Tuần 11 – Evaluation & v2) | M4 (Tuần 14 – Prototype) | M5 (Tuần 15 – Final SAD & Vấn đáp) |
|:---|:---|:---|:---|:---|:---|
| **Nguyễn Đức Bảo Hy** (*Lead Architect*) | Xây dựng Utility Tree, xếp hạng `(H,H)` chọn 4 ASR cốt lõi. | Chọn Tactics, lập bảng so sánh Style, vẽ C4 L1/L2/L3 & Deployment, viết `ADR-001`, `ADR-002`, `ADR-003`. | Chủ trì phân tích ATAM (Sensitivity, Trade-off, Risk), thiết kế cải tiến v2 và viết `ADR-007`. | Kiểm duyệt cấu trúc code `src/` khớp 1:1 với sơ đồ C4 và ranh giới module. | Trình bày phần Tổng quan Kiến trúc, C4 Views, ADRs & ATAM; điều phối Q&A. |
| **Lê Viết Nghĩa** (*Req & Doc Owner*) | Viết 5 Business Goals, 7 Stakeholders, 10 Use Cases, phân loại dữ liệu & 5 Constraints từ NĐ 13/2023. | Viết `ADR-004` (RBAC/ABAC/Audit) & `ADR-005` (Notification Queue), rà soát mô tả các sơ đồ. | Ghi biên bản Peer Review với nhóm bạn, cập nhật tài liệu đặc tả sang v2. | Kiểm tra tính tuân thủ Nghị định 13/2023 trên API Consent, Masking và hướng dẫn chạy `README.md`. | Biên tập hoàn chỉnh `SAD.md`, `presentation-slides.md`, `ai-log.md`, báo cáo Word và trình bày phần Drivers & Bảo mật. |
| **Trần Tiến Danh** (*Prototype Lead*) | Đánh giá độ khó kỹ thuật (Technical Risk) cho các kịch bản tích hợp & đồng thời. | Thiết kế chi tiết Component View lớp ACL, Canonical FHIR Model và viết `ADR-006` (Object Storage). | Phân tích rủi ro nghẽn khóa Redis, Timeout HIS và đề xuất cơ chế Fencing Token + Outbox Jitter. | Hiện thực toàn bộ `src/core/`, `src/worker/`, `src/mock-his/`, `Dockerfile` và `docker-compose.yml`. | Phụ trách chạy Live Demo trực tiếp trên terminal & giải thích sâu kiến trúc mã nguồn. |
| **Nguyễn Quang Trường** (*QA/Test Lead*) | Viết 8 QA Scenarios chuẩn 6 phần và tính toán cơ sở định lượng cho từng Response Measure. | Thiết kế tiêu chí nghiệm thu định lượng cho từng Tactics và Sequence Diagrams. | Đóng vai phản biện viên nội bộ đặt câu hỏi chất vấn ATAM tìm điểm gãy của bản v1. | Viết 6 test suites tự động trong `src/tests/`, chạy thực nghiệm thu số đo thật, xuất `m4-prototype-verification.md`. | Trình bày kết quả đo lường thực nghiệm M4, phân tích độ trễ/chịu lỗi và biên soạn bộ luyện vấn đáp `qa-interview-prep.md`. |

### Câu 2: Điều gì làm bài toán MediLink khó về mặt kiến trúc, khác hẳn với một ứng dụng CRUD thông thường?

Một ứng dụng CRUD thông thường (như web quản lý danh bạ hay tin tức) làm việc trên **1 cơ sở dữ liệu nội bộ đồng nhất**, tải ghi tuần tự ít va chạm và phân quyền đơn giản. Ngược lại, **MediLink** đối mặt với **4 bài toán kiến trúc hệ thống thực thụ**:
1. **Tích hợp dị thể không được phép sửa nguồn (*Heterogeneous Legacy Integration*):** MediLink phải nói chuyện đồng thời với 3 thế hệ HIS khác nhau (`REST/JSON`, `SOAP/XML`, `Custom RPC`) có cách định danh bệnh nhân khác nhau mà không được sửa DB của họ, đồng thời phải sẵn sàng cắm thêm HIS thứ 4 mà không đụng tới code nghiệp vụ lõi.
2. **Tranh chấp đồng thời nghiêm ngặt kết hợp giao tiếp ngoài (*High-Contention Concurrency + External I/O*):** Khi 50 người cùng bấm đặt 1 khung giờ, hệ thống vừa phải đảm bảo đúng 1 người thành công (`0%` double-booking), vừa không được giữ khóa DB trong lúc chờ gọi mạng sang HIS ngoài, lại vừa phải xử lý trường hợp khách bấm lặp do mạng 4G yếu (*Idempotency*).
3. **Cô lập sự cố và nhất quán muộn có kiểm soát (*Fault Isolation & Controlled Eventual Consistency*):** HIS của một phòng khám ở Huế có thể mất điện hoặc đứt cáp quang 2 giờ bất kỳ lúc nào; nếu gọi đồng bộ ngây thơ sẽ gây treo luồng dây chuyền (*Cascading Failure*) làm sập cả 11 cơ sở còn lại, còn khi Huế sống lại nếu xả hàng đợi ồ ạt sẽ gây sập lại lần hai (*Thundering Herd*).
4. **Bảo mật dữ liệu y tế nhạy cảm và tính không thể chối bỏ (*Healthcare Privacy & Tamper-Evident Audit*):** Tuân thủ Nghị định 13/2023/NĐ-CP buộc kiến trúc phải kiểm soát truy cập tới từng cơ sở khám + từng sự đồng ý của bệnh nhân (*ABAC + Consent*), mã hóa cấp trường dữ liệu bệnh án (`AES-256-GCM`) và bảo vệ nhật ký kiểm toán bằng cả Trigger CSDL lẫn chuỗi băm mật mã `HMAC-SHA256` để ngay cả DBA cũng không thể sửa xóa dấu vết.
