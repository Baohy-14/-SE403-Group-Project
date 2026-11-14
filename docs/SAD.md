# Software Architecture Document (SAD): Nền tảng MediLink

**Dự án:** MediLink – Nền tảng Đặt lịch khám và Hồ sơ Sức khỏe Điện tử  
**Môn học:** CMUSE 403 – Software Architecture & Design  
**Đề tài:** Đề tài 1 (Chuỗi 12 phòng khám tư nhân tại Đà Nẵng, Huế và Quảng Nam)  
**Nhóm thực hiện:**
- **Nguyễn Đức Bảo Hy** (Lead Architect)
- **Lê Viết Nghĩa** (Requirements & Documentation Owner)
- **Trần Tiến Danh** (Prototype Lead)
- **Nguyễn Quang Trường** (QA/Test Lead)

---

## MỤC LỤC
1. [Giới thiệu và Bối cảnh Dự án](#1-giới-thiệu-và-bối-cảnh-dự-án)
2. [Mục tiêu Kinh doanh và Các bên liên quan](#2-mục-tiêu-kinh-doanh-và-các-bên-liên-quan)
3. [Ràng buộc Hệ thống và Pháp lý Y tế (Nghị định 13/2023/NĐ-CP)](#3-ràng-buộc-hệ-thống-và-pháp-lý-y-tế-nghị-định-132023nđ-cp)
4. [Các Yêu cầu Thuộc tính Chất lượng Then chốt (ASR & Utility Tree)](#4-các-yêu-cầu-thuộc-tính-chất-lượng-then-chốt-asr--utility-tree)
5. [Chiến lược Kiến trúc: Tactics và Lựa chọn Phong cách](#5-chiến-lược-kiến-trúc-tactics-và-lựa-chọn-phong-cách)
6. [Các Khung nhìn Kiến trúc (C4 Model & Deployment View)](#6-các-khung-nhìn-kiến-trúc-c4-model--deployment-view)
7. [Tóm tắt Các Quyết định Kiến trúc (ADR Index)](#7-tóm-tắt-các-quyết-định-kiến-trúc-adr-index)
8. [Đánh giá Kiến trúc (Lightweight ATAM) và Phiên bản Kiến trúc v2](#8-đánh-giá-kiến-trúc-lightweight-atam-và-phiên-bản-kiến-trúc-v2)
9. [Hiện thực Prototype và Kết quả Kiểm chứng Thuộc tính Chất lượng](#9-hiện-thực-prototype-và-kết-quả-kiểm-chứng-thuộc-tính-chất-lượng)
10. [Bài học Kinh nghiệm và Hướng phát triển](#10-bài-học-kinh-nghiệm-và-hướng-phát-triển)
11. [Phụ lục: Sử dụng Công cụ AI và Bảng Đóng góp Thành viên](#11-phụ-lục-sử-dụng-công-cụ-ai-và-bảng-đóng-góp-thành-viên)

---

## 1. Giới thiệu và Bối cảnh Dự án

Chuỗi 12 phòng khám tư nhân tại khu vực miền Trung (Đà Nẵng, Huế, Quảng Nam) đang trên đà mở rộng nhanh chóng. Hiện tại, mỗi phòng khám hoạt động như một ốc đảo thông tin độc lập:
- Quy trình tiếp nhận bệnh nhân chủ yếu qua gọi điện thoại hotline hoặc ghi chép thủ công bằng Excel.
- Mỗi cơ sở tự trang bị một hệ thống Quản lý Bệnh viện / Phòng khám (HIS) riêng biệt từ các nhà cung cấp phần mềm khác nhau (HIS Đà Nẵng dùng công nghệ Web/REST, HIS Huế dùng phần mềm di sản SOAP XML cũ, HIS Quảng Nam dùng hệ thống cơ sở dữ liệu chuyên biệt).
- Hậu quả: Bệnh nhân mất nhiều thời gian chờ đợi, thường xuyên xảy ra tình trạng đặt trùng lịch (double-booking), hồ sơ bệnh án bị phân mảnh, lãnh đạo chuỗi không có số liệu tổng thể kịp thời.

**Nền tảng MediLink** ra đời nhằm cung cấp một giải pháp kiến trúc tích hợp tập trung, cho phép bệnh nhân đặt lịch trực tuyến, theo dõi tiến trình khám, tra cứu hồ sơ sức khỏe điện tử (EHR), đồng thời liên thông dữ liệu lịch hẹn với các phần mềm HIS hiện hữu mà không làm gián đoạn quy trình nghiệp vụ tại từng phòng khám.

---

## 2. Mục tiêu Kinh doanh và Các bên liên quan

### 2.1. Mục tiêu Kinh doanh (Business Goals)
- **BG-01:** Chuyển đổi số toàn diện kênh đặt lịch hẹn: Tối thiểu 60% tổng lượt đặt khám toàn hệ thống được thực hiện qua MediLink; giảm thời gian xác nhận lịch hẹn xuống < 10 giây.
- **BG-02:** Loại bỏ hoàn toàn sự cố đặt trùng lịch: Tỷ lệ double-booking giảm về **0.00%**, kể cả trong khung giờ cao điểm.
- **BG-03:** Liên thông hồ sơ sức khỏe điện tử (EHR): 100% hồ sơ khám được liên kết theo mã định danh bệnh nhân duy nhất (MPI); thời gian tải hồ sơ < 2 giây.
- **BG-04:** Bảo tồn đầu tư công nghệ hiện có: Tích hợp với 3 loại HIS hiện hữu và mở rộng thêm các phòng khám mới trong ≤ 2 tuần công (≤ 10 ngày).
- **BG-05:** Đảm bảo tính sẵn sàng và vận hành liên tục: Uptime đạt tối thiểu **99.5%** trong giờ làm việc; sự cố tại 1 cơ sở không làm gián đoạn 11 cơ sở còn lại.

### 2.2. Các bên liên quan (Stakeholders)
- **Bệnh nhân:** Cần ứng dụng nhanh, đặt lịch không bị trùng, an tâm về bảo mật thông tin y tế cá nhân.
- **Bác sĩ:** Cần lịch làm việc chính xác, không bị trùng ca, xem bệnh sử và kê đơn nhanh chóng.
- **Lễ tân phòng khám:** Cần tra cứu nhanh tại quầy, chỉ thao tác trên phạm vi cơ sở mình phụ trách.
- **Ban Giám đốc:** Cần dashboard tổng quan, mở rộng chuỗi phòng khám dễ dàng với chi phí tối ưu.
- **Bộ phận IT:** Cần hệ thống dễ bảo trì, cấu trúc module rành mạch, có khả năng cô lập lỗi.
- **Cơ quan Quản lý Y tế:** Thanh kiểm tra tính tuân thủ quy chuẩn y tế và Nghị định 13/2023/NĐ-CP.

---

## 3. Ràng buộc Hệ thống và Pháp lý Y tế (Nghị định 13/2023/NĐ-CP)

Dữ liệu y tế được phân loại nghiêm ngặt:
1. **Dữ liệu công khai:** Danh mục cơ sở, chuyên khoa, lịch làm việc bác sĩ.
2. **Dữ liệu cá nhân cơ bản:** Họ tên, số điện thoại, ngày sinh, địa chỉ (Mã hóa đường truyền TLS 1.3).
3. **Dữ liệu cá nhân nhạy cảm:** Bệnh án, kết quả xét nghiệm, chẩn đoán ICD-10 (Tuân thủ Điều 2 & Điều 17 Nghị định 13/2023/NĐ-CP).

### 3 Ràng buộc Kỹ thuật bắt buộc:
- **C-01 (Mã hóa đa tầng):** Bắt buộc mã hóa đường truyền TLS 1.3 và mã hóa lưu trữ trường nhạy cảm bằng AES-256 với khóa tách rời cơ sở dữ liệu.
- **C-02 (Kiểm soát truy cập ngữ cảnh ABAC):** Lễ tân chỉ được truy cập dữ liệu bệnh nhân thuộc đúng `facility_id` được phân công. Nghiêm cấm xem chéo dữ liệu cơ sở khác.
- **C-03 (Nhật ký kiểm toán Append-Only có mã băm mật mã HMAC):** 100% thao tác đọc/ghi dữ liệu bệnh án phải được ghi vết kiểm toán liên hoàn, chống can thiệp từ quản trị viên cơ sở dữ liệu.

---

## 4. Các Yêu cầu Thuộc tính Chất lượng Then chốt (ASR & Utility Tree)

Dựa trên Cây Tiện ích (Utility Tree), nhóm xác định 4 ASR cốt lõi đạt mức **(High Business Importance, High Technical Risk)**:

```
+--- Consistency:      [ASR-01] (H, H) Chống đặt trùng lịch khi 50 người cùng đặt 1 slot (Zero double-booking)
+--- Availability:     [ASR-02] (H, H) HIS Huế sập 2 giờ, 11 cơ sở khác vẫn đặt bình thường (Circuit Breaker)
+--- Security/Privacy: [ASR-03] (H, H) Lễ tân cố xem bệnh án khác cơ sở -> chặn 403 & ghi audit log
+--- Modifiability:    [ASR-04] (H, H) Tích hợp HIS thứ 4 trong ≤ 2 tuần công không sửa Core (ACL + FHIR)
+--- Integrity:        [ASR-05] (H, M) Toàn vẹn chuỗi kiểm toán bất biến bằng HMAC Hash Chaining
```

---

## 5. Chiến lược Kiến trúc: Tactics và Lựa chọn Phong cách

### 5.1. Architectural Tactics Selection (Bass et al.)
- **ASR-01 (Consistency):** Lựa chọn *Distributed Lock (Redis Redlock Pattern)* đa tầng kết hợp *RDBMS Unique Constraint* và *Idempotency Key*.
- **ASR-02 (Availability):** Lựa chọn *Circuit Breaker (Closed, Open, Half-Open)* kết hợp *Bulkhead Isolation* và *Graceful Degradation*.
- **ASR-03 (Security):** Lựa chọn *Hybrid Access Control (RBAC kết hợp Contextual ABAC)* và *Tamper-evident Audit Logging*.
- **ASR-04 (Modifiability):** Lựa chọn *Anti-Corruption Layer (ACL)* kết hợp *Adapter Pattern* và *Canonical Data Model (HL7 FHIR R4)*.

### 5.2. Lựa chọn Phong cách Kiến trúc Tổng thể
Nhóm so sánh 3 phương án: Monolith truyền thống, Microservices thuần túy và **Modular Monolith kết hợp Hexagonal / Ports-and-Adapters Architecture**.
- **Quyết định:** Chọn **Modular Monolith + Hexagonal Architecture**.
- **Biện luận:** Đảm bảo triển khai gọn nhẹ (1 lệnh `docker compose up`), không tốn kém hạ tầng mạng, đảm bảo tính nhất quán dữ liệu cao cho ASR-01, trong khi vẫn đạt tính module hóa cao và bảo vệ Core Domain thông qua lớp Ports-and-Adapters.

---

## 6. Các Khung nhìn Kiến trúc (C4 Model & Deployment View)

Toàn bộ sơ đồ kiến trúc được định nghĩa dạng mã nguồn (PlantUML / Mermaid) lưu trong thư mục `diagrams/`:
- **C4 Level 1 (Context View):** Định nghĩa ranh giới tin cậy (Trust Boundary), các tác nhân và 3 hệ thống HIS ngoài. [Xem tệp `diagrams/c4-context.puml`].
- **C4 Level 2 (Container View):** Mô tả các khối deployable: Web SPA, Mobile App, API Gateway, MediLink Core, Redis In-memory Store, PostgreSQL Main DB, Encrypted Audit Store và 3 Mock HIS. [Xem tệp `diagrams/c4-container.puml`].
- **C4 Level 3 (Component View - ACL Engine):** Mô tả chi tiết `HisDispatcher`, `CircuitBreakerManager`, `CanonicalModelMapper` và các Adapters cụ thể (`DaNangHisJsonAdapter`, `HueHisXmlAdapter`, `QuangNamHisAdapter`). [Xem tệp `diagrams/c4-component-acl.puml`].
- **Deployment View:** Mô tả môi trường chuẩn Docker Compose với 4 vùng mạng cách ly: DMZ Network, Internal App Network, Isolated Data Network và Mock HIS Network. [Xem tệp `diagrams/deployment-view.puml`].
- **Sequence Diagrams:**
  1. Luồng đặt lịch chống double-booking qua Distributed Lock [Xem `diagrams/sequence-booking-concurrency.puml`].
  2. Luồng kiểm soát ABAC và tính toán chuỗi băm HMAC Audit [Xem `diagrams/sequence-security-audit.puml`].

---

## 7. Tóm tắt Các Quyết định Kiến trúc (ADR Index)

| Mã ADR | Tiêu đề quyết định | Trạng thái | Lựa chọn chính |
|:---:|:---|:---:|:---|
| **ADR-001** | Phong cách Kiến trúc Tổng thể | **Accepted** | Modular Monolith kết hợp Hexagonal / Ports-and-Adapters Architecture. |
| **ADR-002** | Chiến lược Tích hợp HIS Dị thể | **Accepted** | Anti-Corruption Layer (ACL) + Canonical Model chuẩn HL7 FHIR Release 4. |
| **ADR-003** | Chống Đặt trùng lịch (Concurrency) | **Accepted** | Redis Distributed Lock đa tầng + Idempotency Key + RDBMS Unique Constraint. |
| **ADR-004** | Phân quyền & Nhật ký Kiểm toán | **Accepted** | Phân quyền lai RBAC + Contextual ABAC (theo cơ sở) + HMAC Hash Chaining. |
| **ADR-005** | Tác vụ Nền & Gửi Thông báo | **Accepted** | Hàng đợi công việc phân tán dựa trên Redis (BullMQ / Queue-based Worker). |

*(Toàn văn 5 bản ADR chi tiết được lưu trữ trong thư mục `adr/0001-...` đến `adr/0005-...`)*.

---

## 8. Đánh giá Kiến trúc (Lightweight ATAM) và Phiên bản Kiến trúc v2

Qua phiên đánh giá ATAM rút gọn và phản biện chéo (Peer Review) với nhóm bạn, 3 rủi ro kỹ thuật chính đã được phát hiện và giải quyết trong **Architecture Design v2**:
1. **Rủi ro Quá tải Tranh chấp / Spam request (Risk R-01):** Được giải quyết bằng cách tích hợp thuật toán *Token Bucket Rate Limiting* tại API Gateway (10 req/phút/IP).
2. **Rủi ro Sập dây chuyền Thundering Herd khi HIS phục hồi (Risk R-02):** Được giải quyết bằng mô hình *Transactional Outbox có điều tiết nhịp độ (Rate-Controlled Sync with Jitter)*.
3. **Rủi ro DBA sửa lén nhật ký kiểm toán (Risk R-03):** Được giải quyết bằng tiến trình nền *AuditIntegrityVerifier* định kỳ quét và đối soát tính toàn vẹn chuỗi băm HMAC.

---

## 9. Hiện thực Prototype và Kết quả Kiểm chứng Thuộc tính Chất lượng

Một Prototype hoàn chỉnh đã được xây dựng và đóng gói trong thư mục `src/`, chạy bằng lệnh `node tests/run_all_verification_tests.js` hoặc `docker compose up`.

### Bảng Kết quả Đo lường Thực nghiệm:
```text
╔═════════╦════════════════════════════════════════╦══════════════════════════════════╦════════════╗
║ Mã ASR  ║ Thuộc tính chất lượng kiểm chứng     ║ Kết quả đo lường thực tế         ║ Đánh giá   ║
╠═════════╬════════════════════════════════════════╬══════════════════════════════════╬════════════╣
║ ASR-01  ║ Chống Đặt trùng lịch (Concurrency 50) ║ 1 thành công, 49 rejected, p95: 388ms ║  [ PASSED ]  ║
║ ASR-02  ║ Chịu lỗi & Cách ly Sự cố HIS Huế     ║ Đà Nẵng: OK, Quảng Nam: OK, Huế: OPEN ║  [ PASSED ]  ║
║ ASR-03  ║ Bảo mật & Contextual ABAC            ║ Mã HTTP: 403, Audit Log Recorded: true ║  [ PASSED ]  ║
║ ASR-05  ║ Toàn vẹn Nhật ký Kiểm toán HMAC       ║ Phát hiện gian lận: CÓ (Chính xác) ║  [ PASSED ]  ║
║ ASR-04  ║ Khả năng Mở rộng Tích hợp HIS 4 (FHIR)║ Đồng bộ HIS 4: THÀNH CÔNG, FHIR: true ║  [ PASSED ]  ║
╚═════════╩════════════════════════════════════════╩══════════════════════════════════╩════════════╝
```

---

## 10. Bài học Kinh nghiệm và Hướng phát triển

### 10.1. Bài học kinh nghiệm:
- **Tầm quan trọng của Anti-Corruption Layer:** Việc tách biệt nghiệp vụ lõi khỏi các định dạng dữ liệu dị biệt của HIS giúp hệ thống linh hoạt và giảm thiểu tối đa rủi ro hồi quy khi tích hợp phần mềm mới.
- **Không vội vàng nhảy vào Microservices:** Modular Monolith là sự lựa chọn tối ưu cho giai đoạn đầu, vừa giúp đảm bảo tính nhất quán dữ liệu mạnh cho việc chống double-booking, vừa giảm thiểu chi phí vận hành.
- **Bảo mật dữ liệu y tế phải là ưu tiên hàng đầu:** Việc kết hợp RBAC và ABAC giải quyết triệt để bài toán phân quyền ranh giới đa cơ sở theo Nghị định 13/2023/NĐ-CP.

### 10.2. Hướng phát triển trong tương lai:
- Nâng cấp cụm Redis sang Redis Sentinel / Redis Cluster khi mở rộng chuỗi lên 50 phòng khám.
- Tích hợp chữ ký số bác sĩ (Digital Certificate) trực tiếp vào tệp PDF bệnh án.
- Kết nối thử nghiệm với Cổng Dữ liệu Y tế Quốc gia thông qua giao thức HL7 FHIR đã chuẩn hóa.

---

## 11. Phụ lục: Sử dụng Công cụ AI và Bảng Đóng góp Thành viên

### 11.1. Tuyên bố Sử dụng AI:
Nhóm đã sử dụng công cụ AI hỗ trợ trong quá trình brainstorm các kịch bản kiểm thử, rà soát văn bản và sinh mã nguồn khung ban đầu. Toàn bộ các quyết định kiến trúc, lựa chọn tactics, đối chiếu số liệu đo lường thực tế và chỉnh sửa mã nguồn đều do các thành viên trong nhóm trực tiếp tư duy và làm chủ 100%. Nhật ký sử dụng AI chi tiết được lưu trữ đầy đủ tại tệp tin `ai-log.md`.

### 11.2. Đánh giá Đóng góp của Từng Thành viên:

| STT | Họ và Tên | Vai trò | Tỷ lệ đóng góp | Chữ ký xác nhận |
|:---:|-----------|---------|:--------------:|:---------------:|
| 1 | **Nguyễn Đức Bảo Hy** | Lead Architect | 25% | Đã ký |
| 2 | **Lê Viết Nghĩa** | Requirements & Documentation Owner | 25% | Đã ký |
| 3 | **Trần Tiến Danh** | Prototype Lead | 25% | Đã ký |
| 4 | **Nguyễn Quang Trường** | QA/Test Lead | 25% | Đã ký |
| **Tổng cộng** | | | **100%** | |
