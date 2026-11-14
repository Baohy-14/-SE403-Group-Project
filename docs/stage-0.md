# Giai đoạn 0 – Khởi động Dự án: MediLink

## 1. Thành viên nhóm và phân vai

| STT | Thành viên | Vai trò | Trách nhiệm chính |
|:---:|------------|---------|-------------------|
| 1 | **Nguyễn Đức Bảo Hy** | Kiến trúc sư trưởng (*Lead Architect*) | Chủ trì phân tích ASR, lựa chọn architectural styles & tactics, thiết kế các View kiến trúc (C4, Deployment), chủ trì đánh giá ATAM và phê duyệt các quyết định ADR. |
| 2 | **Lê Viết Nghĩa** | Phụ trách Yêu cầu & Tài liệu (*Requirements & Documentation Owner*) | Khảo sát bài toán chuỗi 12 phòng khám, làm rõ Business Goals, Stakeholders, Use Cases, ràng buộc pháp lý (Nghị định 13/2023/NĐ-CP), quản lý tài liệu SAD và AI Log. |
| 3 | **Trần Tiến Danh** | Phụ trách Prototype (*Prototype Lead*) | Thiết kế và hiện thực architectural skeleton, lớp tích hợp Anti-Corruption Layer (ACL), Adapters cho 3 HIS không đồng nhất, cơ chế Distributed Lock (Redis) và container hóa Docker Compose. |
| 4 | **Nguyễn Quang Trường** | Phụ trách QA/Test (*QA/Test Lead*) | Xây dựng kịch bản kiểm thử Quality Attributes, viết test scripts giả lập tải 50 concurrent requests (chống double-booking), fault injection (ngắt HIS Huế), security RBAC test, phân tích số liệu đo lường. |

---

## 2. Đề tài được lựa chọn

- **Tên đề tài:** Đề tài 1 – MediLink: Nền tảng đặt lịch khám và hồ sơ sức khỏe điện tử.
- **Bối cảnh:** Chuỗi 12 phòng khám tư nhân tại Đà Nẵng, Huế và Quảng Nam hiện đang vận hành phân tán, đặt lịch qua điện thoại và ghi chép Excel; mỗi cơ sở sử dụng một phần mềm quản lý phòng khám (HIS) riêng biệt (không đồng nhất về công nghệ, định dạng dữ liệu và giao thức). Ban giám đốc cần một nền tảng tập trung, tin cậy để bệnh nhân đặt lịch hẹn trực tuyến không bị trùng, đồng bộ hồ sơ sức khỏe điện tử (EHR), bảo mật tuyệt đối dữ liệu y tế cá nhân và đảm bảo hệ thống vận hành liên tục 99.5%.

---

## 3. Hiểu bài toán của từng thành viên (5 câu tóm tắt độc lập)

### 3.1. Nguyễn Đức Bảo Hy (Lead Architect)
1. Bài toán cốt lõi của MediLink không phải là ứng dụng CRUD thông thường mà là bài toán tích hợp hệ thống phân tán không đồng nhất (heterogeneous legacy systems) giữa 12 phòng khám sử dụng ít nhất 3 loại HIS khác biệt.
2. Thách thức kiến trúc lớn nhất là đảm bảo tính nhất quán (Consistency) chống đặt trùng lịch (double-booking) khi nhiều người bệnh cùng tranh chấp một khung giờ khám của bác sĩ trong môi trường mạng phân tán.
3. Tính sẵn sàng (Availability) phải đạt tối thiểu 99.5% trong giờ hành chính; sự cố sập hoặc mất kết nối tại một phòng khám đơn lẻ (ví dụ HIS Huế) không được phép gây tê liệt toàn bộ hệ thống đặt lịch ở các cơ sở khác.
4. Lớp tích hợp phải được thiết kế theo mẫu Anti-Corruption Layer (ACL) và Canonical Data Model (chuẩn hóa theo HL7 FHIR) để việc kết nối thêm bất kỳ HIS mới nào cũng không làm biến dạng nghiệp vụ lõi (Core Domain).
5. Dữ liệu bệnh án thuộc danh mục dữ liệu cá nhân nhạy cảm, đòi hỏi kiến trúc phải phân vùng ranh giới tin cậy (Trust Boundary), áp dụng RBAC kết hợp ABAC (theo cơ sở), mã hóa lưu trữ và ghi nhận Audit Log bất biến (Append-only).

### 3.2. Lê Viết Nghĩa (Requirements & Documentation Owner)
1. Dự án phục vụ mạng lưới đa dạng các bên liên quan (Bệnh nhân, Bác sĩ, Lễ tân, Quản lý cơ sở, Ban Giám đốc, Bộ phận IT, Cơ quan quản lý Y tế) với các mục tiêu và kỳ vọng bảo mật xung đột nhau.
2. Nền tảng phải đáp ứng đầy đủ chu trình: Đặt/đổi/hủy lịch khám, nhắc hẹn đa kênh (SMS, Zalo, Email), quản lý hồ sơ sức khỏe điện tử (EHR) và thanh toán đặt cọc trực tuyến.
3. Ràng buộc pháp lý nghiêm ngặt theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân yêu cầu mọi thao tác đọc/ghi/truy xuất bệnh án phải có cơ chế đồng thuận và lưu vết kiểm toán 100%.
4. Lễ tân tại một cơ sở (ví dụ Đà Nẵng) tuyệt đối không được phép xem trộm hoặc truy xuất trái phép dữ liệu hồ sơ bệnh nhân đang điều trị riêng tại cơ sở khác (ví dụ Huế hay Quảng Nam).
5. Hồ sơ kiến trúc (SAD) và các quyết định kiến trúc (ADR) phải được tài liệu hóa rõ ràng, truy vết trực tiếp từ bài toán kinh doanh đến kịch bản thuộc tính chất lượng (ASR).

### 3.3. Trần Tiến Danh (Prototype Lead)
1. Mục tiêu của Prototype là chứng minh tính khả thi của các quyết định kiến trúc then chốt chứ không sa đà vào giao diện hào nhoáng hay số lượng chức năng CRUD.
2. Cần xây dựng ít nhất 2 Mock HIS đại diện: một HIS sử dụng chuẩn hiện đại REST/JSON (HIS Đà Nẵng) và một HIS cũ sử dụng XML/SOAP (HIS Huế) để kiểm chứng khả năng tích hợp qua Adapter.
3. Hiện thực cơ chế khóa phân tán (Distributed Lock với Redis) kết hợp Idempotency Key và RDBMS Unique Constraint để chặn triệt để hiện tượng race condition khi 50 request cùng ập vào 1 slot.
4. Triển khai mẫu Circuit Breaker và Graceful Degradation: khi ngắt kết nối đến Mock HIS Huế, hệ thống vẫn phản hồi trạng thái hợp lệ, thông báo rõ ràng cho người dùng thay vì treo request (timeout cascade).
5. Đóng gói toàn bộ skeleton và kịch bản chạy thử nghiệm thành một tập lệnh `docker compose up` duy nhất, giúp kiểm chứng độc lập trên môi trường chuẩn hóa.

### 3.4. Nguyễn Quang Trường (QA/Test Lead)
1. Các thuộc tính chất lượng (Quality Attributes) không được mô tả mơ hồ mà phải định lượng hóa thành các kịch bản chuẩn 6 phần có thể đo đạc thực tế trong phòng thí nghiệm.
2. Kịch bản kiểm thử đồng thời (Concurrency Test) cần chứng minh chính xác: khi kích hoạt 50 requests đồng thời gửi yêu cầu đặt cùng 1 khung giờ của 1 bác sĩ, chỉ có duy nhất 1 booking thành công (HTTP 200/201), 49 requests còn lại nhận phản hồi từ chối lịch sự (HTTP 409 Conflict).
3. Kịch bản kiểm thử chịu lỗi (Fault Injection): chủ động ngắt mạng hoặc dừng container Mock HIS Huế trong 2 giờ, đo lường tỷ lệ lỗi cục bộ và xác nhận 100% các yêu cầu tại cơ sở Đà Nẵng và Quảng Nam vẫn hoạt động bình thường.
4. Kịch bản kiểm thử an ninh (Security Penetration Test): mô phỏng việc lễ tân cơ sở Đà Nẵng dùng JWT token của mình để truy vấn endpoint bệnh án của cơ sở Huế, kỳ vọng hệ thống chặn đứng với mã HTTP 403 Forbidden và tạo 1 bản ghi Audit Log.
5. Mọi số liệu đo lường (độ trễ p95, throughput, số lượng record audit) phải được xuất ra từ log thực nghiệm khách quan, không chấp nhận số liệu lý thuyết do AI phỏng đoán.

---

## 4. Nhận thức thống nhất của nhóm

### 4.1. Bài toán
Xây dựng nền tảng kiến trúc phần mềm tích hợp tập trung (**MediLink**) cho chuỗi 12 phòng khám y tế tư nhân tại khu vực miền Trung, giải quyết triệt để tình trạng phân mảnh thông tin, loại bỏ phương thức quản lý thủ công (điện thoại/Excel), kết nối thông suốt với các hệ thống HIS dị thể có sẵn, chống trùng lịch khám tuyệt đối và bảo mật thông tin hồ sơ sức khỏe điện tử.

### 4.2. Người dùng / Các bên liên quan chính (Stakeholders)
- **Bệnh nhân:** Người hưởng dịch vụ, cần trải nghiệm đặt lịch nhanh chóng (< 2 giây), xem hồ sơ bệnh án trực tuyến tiện lợi, an tâm về bí mật đời tư.
- **Bác sĩ:** Người cung cấp dịch vụ chuyên môn, cần lịch làm việc chính xác, không bị đặt trùng giờ, truy cập hồ sơ bệnh sử nhanh chóng khi khám bệnh.
- **Lễ tân / Thu ngân phòng khám:** Tiếp nhận bệnh nhân tại quầy, check-in, xem lịch cơ sở của mình, tuyệt đối bị ngăn chặn xem chéo dữ liệu cơ sở khác.
- **Quản lý cơ sở:** Giám sát vận hành phòng khám địa phương, quản lý bác sĩ và doanh thu chi nhánh.
- **Ban Giám đốc chuỗi phòng khám:** Cần dashboard tổng quan toàn diện, tối ưu hóa công suất phòng khám, mở rộng chuỗi phòng khám dễ dàng.
- **Bộ phận IT / Đội ngũ vận hành:** Chịu trách nhiệm bảo trì hệ thống, tích hợp thêm HIS mới dễ dàng, vận hành ổn định 24/7 với chi phí hợp lý.
- **Cơ quan quản lý Y tế / Pháp luật:** Thanh kiểm tra tính tuân thủ quy chuẩn y tế, an toàn thông tin theo Nghị định 13/2023/NĐ-CP.

### 4.3. Vấn đề chính cần giải quyết
1. **Dị thể dữ liệu và giao thức:** 12 cơ sở dùng các phần mềm HIS từ các nhà cung cấp khác nhau, từ công nghệ cổ điển (SOAP/XML, Database kết nối trực tiếp) đến web service REST/JSON.
2. **Cạnh tranh tài nguyên (Race Condition):** Bệnh nhân đặt lịch qua ứng dụng MediLink đồng thời với khách hàng gọi điện trực tiếp đến quầy lễ tân gây nguy cơ xung đột lịch khám nghiêm trọng.
3. **Phân ranh giới truy cập hồ sơ nhạy cảm:** Bệnh án chứa thông tin sức khỏe cá nhân đặc biệt nhạy cảm, đòi hỏi kiểm soát quyền hạn phân tầng chặt chẽ và không thể chối bỏ (Non-repudiation).
4. **Hiệu ứng domino khi hệ thống ngoài gặp sự cố:** Nếu máy chủ HIS tại 1 cơ sở địa phương bị mất điện hoặc đứt cáp quang, toàn bộ nền tảng MediLink không được phép bị ngưng trệ.

### 4.4. Những thách thức về kiến trúc
1. **Thiết kế Anti-Corruption Layer (ACL) và Canonical Data Model:** Ngăn chặn mô hình dữ liệu dị biệt của các HIS bên ngoài làm bẩn miền nghiệp vụ lõi (Core Domain), chuẩn hóa theo mô hình HL7 FHIR (Appointment, Patient, Encounter).
2. **Cơ chế kiểm soát tranh chấp phân tán (Distributed Concurrency Control):** Kết hợp đa tầng giữa Redis Distributed Lock (Redlock algorithm), Idempotency Key và RDBMS Unique Constraints.
3. **Mô hình phân quyền RBAC kết hợp Contextual ABAC:** Đảm bảo nguyên tắc đặc quyền tối thiểu (Least Privilege), lễ tân chỉ xem được dữ liệu bệnh nhân phát sinh tại đúng `facility_id` được phân công.
4. **Kiểm toán bất biến (Tamper-evident / Append-only Audit Log):** Lưu trữ toàn bộ nhật ký truy cập hồ sơ với mã băm chuỗi mật mã (HMAC Cryptographic Hash Chain), chống can thiệp từ quản trị viên cơ sở dữ liệu.
5. **Cơ chế cách ly sự cố (Circuit Breaker & Fallback):** Tránh cạn kiệt tài nguyên luồng kết nối khi gọi sang các HIS ngoài bị chậm/treo.

---

## 5. Các giả định ban đầu (Assumptions)

| Mã | Giả định ban đầu | Lý do đề xuất | Cần xác minh tại mốc nào |
|:---:|------------------|---------------|--------------------------|
| **A1** | Các hệ thống HIS hiện hữu đều có thể cung cấp API (REST hoặc SOAP) hoặc có thể dựng cổng Adapter trung gian để đọc/ghi lịch hẹn. | MediLink không can thiệp sâu vào mã nguồn đóng của các nhà cung cấp HIS bên thứ ba mà giao tiếp qua giao diện dịch vụ. | M1 (Khảo sát Drivers) & M2 (ADR-002) |
| **A2** | Tỷ lệ bệnh nhân đặt lịch qua kênh online MediLink chiếm khoảng 60–70%, 30% còn lại đến từ quầy lễ tân được đồng bộ hai chiều. | Là cơ sở để tính toán tải giờ cao điểm và tần suất đồng bộ trạng thái giữa MediLink và HIS. | M1 (Use cases & Scenarios) |
| **A3** | Mỗi bác sĩ tại một thời điểm chỉ khám tối đa 1 bệnh nhân trong khung thời gian chuẩn (thường là slot 15–30 phút). | Ràng buộc nghiệp vụ nền tảng để thiết kế cơ chế khóa và ràng buộc duy nhất `(doctor_id, appointment_slot)`. | M1 & M2 (ADR-003) |
| **A4** | Hệ thống mạng nội bộ và Cloud có độ trễ kết nối chấp nhận được (ping giữa MediLink Core và HIS Adapters < 150ms). | Đảm bảo thời gian giữ Distributed Lock trong Redis đủ ngắn (TTL = 3 - 5 giây) để không làm nghẽn người dùng khác. | M2 & M4 (Prototype) |
| **A5** | Hồ sơ xét nghiệm (hình ảnh DICOM, kết quả PDF) có dung lượng từ 1MB – 20MB và được lưu trữ trên Object Storage riêng biệt có mã hóa at-rest. | Giảm tải cho cơ sở dữ liệu quan hệ, tách biệt siêu dữ liệu (metadata) và tệp tin nhị phân lớn. | M2 (ADR-004) |

---

## 6. Tự kiểm tra Giai đoạn 0

### 6.1. Vai trò của tôi chịu trách nhiệm sản phẩm nào ở mỗi mốc?

- **Nguyễn Đức Bảo Hy (Lead Architect):**
  - *M1:* Chủ trì xây dựng Utility Tree, định nghĩa các ASR mức (H,H), rà soát tính khả thi kiến trúc.
  - *M2:* Thiết kế chính C4 Views (Context, Container, Component), Deployment View, soạn thảo ADR-001 (Kiến trúc tổng thể), ADR-002 (Chiến lược tích hợp HIS) và ADR-003 (Chống double-booking).
  - *M3:* Đóng vai trò Lead Evaluator trong ATAM, xác định Sensitivity points, Trade-off points, Risks; nâng cấp thiết kế lên Architecture Design v2.
  - *M4:* Phê duyệt mã nguồn khung kiến trúc, đảm bảo cấu trúc thư mục và package ánh xạ 1:1 với sơ đồ Container/Component view.
  - *M5:* Phụ trách phần Tổng quan Kiến trúc, Biện luận Quyết định trong báo cáo SAD và dẫn dắt phần thuyết trình nhóm.

- **Lê Viết Nghĩa (Requirements & Documentation Owner):**
  - *M1:* Thu thập và chuẩn hóa Business Goals, bảng Stakeholders & Concerns, danh sách 8 Use Cases chính, phân tích ràng buộc Nghị định 13/2023/NĐ-CP và phân loại dữ liệu y tế.
  - *M2:* Soạn thảo tài liệu đặc tả M2, quản lý danh mục ADR, viết ADR-004 (Phân quyền & Audit Log) và ADR-005 (Hàng đợi thông báo bất đồng bộ).
  - *M3:* Ghi chép biên bản phiên đánh giá ATAM, tổng hợp các phản biện từ nhóm bạn (peer review), cập nhật tài liệu v2.
  - *M4:* Kiểm tra tính nhất quán giữa tài liệu đặc tả và chức năng thực tế của prototype, cập nhật hướng dẫn cài đặt và vận hành.
  - *M5:* Hoàn thiện tài liệu Software Architecture Document (SAD) toàn diện, biên tập bộ slide báo cáo M5 và duy trì AI Log đầy đủ, trung thực.

- **Trần Tiến Danh (Prototype Lead):**
  - *M1:* Đóng góp ý kiến về tính khả thi kỹ thuật (technical feasibility) cho các kịch bản QA trong Utility Tree.
  - *M2:* Phác thảo chi tiết Component View của lớp Anti-Corruption Layer (ACL) và Adapter design.
  - *M3:* Phân tích rủi ro kỹ thuật liên quan đến độ trễ mạng và hiệu năng của Redis Lock trong phiên ATAM.
  - *M4:* Xây dựng toàn bộ mã nguồn Skeleton Prototype: Core Service (Express/Node.js), Redis Lock/Idempotency engine, 3 Mock HIS services (REST/JSON, XML/SOAP, RPC), viết `docker-compose.yml`.
  - *M5:* Trực tiếp điều khiển demo trực tiếp (live demo) trong buổi vấn đáp tốt nghiệp M5.

- **Nguyễn Quang Trường (QA/Test Lead):**
  - *M1:* Chịu trách nhiệm viết và tinh chỉnh 6+ Quality Attribute Scenarios theo chuẩn 6 phần, đảm bảo tiêu chí Response Measure đo lường được bằng số liệu thực tế.
  - *M2:* Đề xuất các phương án đo lường kiểm chứng cho từng ADR.
  - *M3:* Đặt câu hỏi chất vấn và ghi nhận các chỉ số nhạy cảm (sensitivity metrics) trong ATAM.
  - *M4:* Viết bộ test scripts tự động hóa: Concurrency stress test (50 concurrent requests vào 1 slot), Fault injection script (ngắt kết nối HIS Huế), Security breach test (lễ tân xem trái tuyến); thu thập log và xuất biểu đồ kết quả đo.
  - *M5:* Trình bày phần kết quả kiểm chứng kiến trúc, số liệu đối chiếu trong slide M5 và trả lời các câu hỏi vấn đáp về kiểm thử.

### 6.2. Điều gì làm bài toán này khó về mặt kiến trúc, khác với một ứng dụng CRUD thông thường?

1. **Khác biệt về sự phụ thuộc vào các hệ thống ngoài không đồng nhất (Heterogeneity & External Dependencies):** Một ứng dụng CRUD bình thường sở hữu toàn bộ cơ sở dữ liệu của mình. Trong MediLink, dữ liệu lịch khám và hồ sơ bệnh nhân bị phân tán và quản lý bởi 12 cơ sở với 3 loại phần mềm HIS khác nhau do các đơn vị thứ ba phát triển. MediLink không thể ép các HIS này sửa database hay đổi công nghệ, mà phải tự thích ứng thông qua lớp Anti-Corruption Layer và chuyển đổi dữ liệu hai chiều sang mô hình chuẩn (Canonical Data Model - HL7 FHIR).
2. **Khác biệt về kiểm soát tranh chấp phân tán (Distributed Concurrency & Strict Consistency):** Trong CRUD đơn giản, chống trùng lặp chỉ cần 1 câu lệnh `INSERT` có `UNIQUE KEY` trong 1 database duy nhất. Nhưng ở MediLink, một lịch hẹn vừa được ghi trên MediLink vừa phải đồng bộ tức thời xuống database cục bộ của phòng khám thông qua HIS Adapter. Khi có 50 bệnh nhân cùng click đặt một bác sĩ vào đúng 8:00 sáng, hệ thống phải xử lý khóa tức thời (Distributed Lock) với độ trễ tính bằng mili-giây, chống tình trạng ghi đè (race condition) và phải đảm bảo tính Idempotency khi mạng chập chờn gửi lại request.
3. **Khác biệt về tính sẵn sàng và cô lập lỗi (Availability & Fault Isolation):** Một ứng dụng CRUD lỗi database là sập toàn bộ. Trong MediLink, một phòng khám tại Huế bị đứt mạng hoặc máy chủ HIS sở tại gặp sự cố trong 2 giờ thì 11 cơ sở còn lại (Đà Nẵng, Quảng Nam) vẫn phải nhận đặt lịch bình thường. Hệ thống phải có cơ chế Circuit Breaker, hàng đợi ngoại tuyến (Offline Sync Queue) và degraded service.
4. **Khác biệt về tính bảo mật và pháp lý y tế (Healthcare Privacy & Immutability):** Dữ liệu bệnh án không đơn thuần là bảng "Users" hay "Products", mà là dữ liệu nhạy cảm theo Luật Khám chữa bệnh và Nghị định 13/2023/NĐ-CP. Kiến trúc phải phân tách nghiêm ngặt miền tin cậy (Trust Boundaries), áp dụng kiểm soát truy cập ngữ cảnh (ABAC - lễ tân cơ sở này không xem được bệnh nhân cơ sở khác dù chung bảng dữ liệu) và Audit Log phải là chuỗi khối bất biến (Append-only / Cryptographic hash chain) để không một DBA nào có thể sửa hoặc xóa lịch sử truy cập hồ sơ.
