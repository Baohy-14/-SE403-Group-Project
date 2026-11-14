# Slide Thuyết trình Bảo vệ Đồ án: Nền tảng MediLink (20 Phút)

**Môn học:** CMUSE 403 – Software Architecture & Design  
**Đề tài:** Đề tài 1 – MediLink: Nền tảng Đặt lịch khám và Hồ sơ Sức khỏe Điện tử  
**Nhóm sinh viên thực hiện:**
- Nguyễn Đức Bảo Hy (Lead Architect)
- Lê Viết Nghĩa (Requirements & Documentation Owner)
- Trần Tiến Danh (Prototype Lead)
- Nguyễn Quang Trường (QA/Test Lead)

---

## Slide 1: Trang bìa (Title Slide)
- **Tiêu đề:** MEDILINK – NỀN TẢNG ĐẶT LỊCH KHÁM VÀ HỒ SƠ SỨC KHỎE ĐIỆN TỬ
- **Phụ đề:** Kiến trúc Tích hợp Hệ thống Y tế Dị thể, Chống Trùng lịch và Bảo mật theo Nghị định 13/2023/NĐ-CP
- **Người trình bày:** Nguyễn Đức Bảo Hy, Lê Viết Nghĩa, Trần Tiến Danh, Nguyễn Quang Trường
- **Giảng viên hướng dẫn:** ThS. Nguyễn Văn Mẫn

---

## Slide 2: Bối cảnh và Nỗi đau Doanh nghiệp (Problem Statement)
- Chuỗi 12 phòng khám tư nhân tại Đà Nẵng, Huế, Quảng Nam.
- Quản lý thủ công qua điện thoại & Excel -> Thường xuyên xảy ra đặt trùng lịch (double-booking).
- Hệ thống HIS không đồng nhất:
  - Cơ sở Đà Nẵng: REST/JSON hiện đại.
  - Cơ sở Huế: SOAP/XML di sản cũ.
  - Cơ sở Quảng Nam: Custom Database/REST.
- Sự cố mất mạng hoặc sập máy chủ tại 1 cơ sở gây tê liệt dây chuyền.
- Nguy cơ lộ lọt hồ sơ y tế cá nhân (vi phạm Nghị định 13/2023/NĐ-CP).

---

## Slide 3: Mục tiêu Kinh doanh & Ràng buộc Pháp lý
- **Mục tiêu Kinh doanh (KPIs):**
  - Chuyển đổi số ≥ 60% lượt đặt lịch online; xác nhận < 10 giây.
  - Tỷ lệ double-booking: **0.00%**.
  - Tính sẵn sàng (Availability): **≥ 99.5%** trong giờ làm việc.
  - Tích hợp HIS mới: **≤ 2 tuần công** không sửa Core.
- **Ràng buộc Pháp lý (Nghị định 13/2023/NĐ-CP):**
  - Mã hóa đa tầng (TLS 1.3 và AES-256 lưu trữ).
  - Phân quyền theo ngữ cảnh cơ sở (Contextual ABAC): Lễ tân cơ sở này tuyệt đối không xem bệnh án cơ sở khác.
  - Nhật ký kiểm toán bất biến (Append-only Audit Log) được bảo vệ bằng mã băm liên hoàn HMAC.

---

## Slide 4: Bảng Cây Tiện ích & Các Yêu cầu Kiến trúc Cốt lõi (ASR)
- **ASR-01 (Consistency & Concurrency):** 50 người cùng đặt 1 slot -> Đúng 1 người được duyệt, double-booking = 0, p95 < 800ms.
- **ASR-02 (Availability & Fault Tolerance):** HIS Huế sập 2 giờ -> 11 cơ sở khác vẫn đặt bình thường 100%, Circuit Breaker ngắt mạch fast-fail.
- **ASR-03 (Security & Contextual ABAC):** Lễ tân Đà Nẵng xem hồ sơ bệnh án tại Huế -> Bị chặn đứng 403 Forbidden, dữ liệu rò rỉ 0%, ghi audit log.
- **ASR-04 (Modifiability & Interoperability):** Tích hợp HIS thứ 4 trong ≤ 2 tuần công mà không sửa đổi mã nguồn Core.

---

## Slide 5: Lựa chọn Tactics Kiến trúc (Bass et al.)
- **Consistency:** Redis Distributed Lock (Redlock algorithm) + Idempotency Key + RDBMS Unique Constraint.
- **Availability:** Circuit Breaker (Closed, Open, Half-Open) + Bulkhead Isolation + Graceful Degradation.
- **Security:** Hybrid Access Control (RBAC + Contextual ABAC Policy Engine) + Cryptographic HMAC Hash Chaining.
- **Modifiability:** Anti-Corruption Layer (ACL) + Adapter Pattern + Canonical Data Model chuẩn HL7 FHIR Release 4.

---

## Slide 6: Biện luận Phong cách Kiến trúc Tổng thể (ADR-001)
- **So sánh 3 phương án:** Monolith truyền thống vs Microservices thuần túy vs **Modular Monolith + Hexagonal Architecture**.
- **Lý do chọn Modular Monolith:**
  - Đảm bảo tính nhất quán mạnh (Strict Consistency) chống race condition hiệu quả nhất.
  - Chi phí vận hành tối ưu cho nhóm 4 người trong 15 tuần.
  - Đóng gói và kiểm thử độc lập nhanh chóng (1 lệnh `docker compose up`).
  - Phân tách ranh giới module rõ ràng, sẵn sàng phân rã sang Microservices khi mở rộng quy mô trong tương lai.

---

## Slide 7: Sơ đồ Ngữ cảnh C4 Level 1 & Container C4 Level 2
- Trình bày ranh giới an toàn (Trust Boundary).
- Phân tầng Container:
  - Frontend SPA & Mobile App.
  - API Gateway & Reverse Proxy (Rate Limiting).
  - MediLink Core Application (Auth ABAC, Booking Core, EHR, ACL Engine).
  - In-memory Store (Redis Lock) & Relational DB & Encrypted Audit Table.
  - 3 Mock HIS ngoài.

---

## Slide 8: Trái tim Kiến trúc: Lớp Chống Thối rữa (Anti-Corruption Layer - C4 Level 3)
- Cơ chế hoạt động của `HisIntegrationDispatcher`.
- Chuẩn hóa trung gian qua Mô hình Chuẩn **HL7 FHIR R4 (Appointment & Patient)**.
- Quản lý trạng thái Circuit Breaker riêng biệt cho từng cơ sở.
- Các Adapter độc lập: `DaNangHisJsonAdapter`, `HueHisXmlAdapter`, `QuangNamHisAdapter`.

---

## Slide 9: Đánh giá Kiến trúc (ATAM) & Cải tiến lên Architecture v2
- **3 Rủi ro kiến trúc phát hiện qua ATAM:**
  1. Rủi ro spam request / quá tải Redis Lock -> **Cải tiến v2:** Bổ sung Token Bucket Rate Limiting tại Gateway.
  2. Rủi ro sập dây chuyền (Thundering Herd) khi HIS phục hồi -> **Cải tiến v2:** Transactional Outbox với Rate-Controlled Sync & Jitter.
  3. Rủi ro can thiệp sửa đổi trái phép nhật ký kiểm toán trong DB -> **Cải tiến v2:** Tiến trình tự động xác thực chuỗi băm HMAC `AuditIntegrityVerifier`.

---

## Slide 10: Minh chứng Thực nghiệm Prototype (Live Metrics Demo)
- Trình chiếu video hoặc terminal chạy lệnh: `node tests/run_all_verification_tests.js`.
- **Số liệu thực tế đo lường:**
  - Concurrency 50 requests: **Đúng 1 thành công, 49 rejected (409 Conflict), Double-booking = 0.00%, p95 = 388ms**.
  - Fault injection HIS Huế sập: **Đà Nẵng & Quảng Nam 100% OK, Circuit Breaker Huế chuyển sang OPEN**.
  - Security check: **Chặn 403 Forbidden, 0% rò rỉ, Audit Log ghi nhận kèm mã băm HMAC**.
  - Tamper detection: **Phát hiện ngay lập tức bản ghi bị can thiệp trái phép (< 2ms)**.
  - Extensibility: **Tích hợp HIS thứ 4 chuẩn HL7 FHIR, sửa Core Domain: 0 dòng code**.

---

## Slide 11: Kết luận & Đóng góp Thành viên
- Đề tài đã hoàn thành xuất sắc 100% các yêu cầu từ M1 đến M5.
- Đạt chuẩn kiến trúc y tế chuẩn hóa quốc tế (HL7 FHIR) và pháp lý Việt Nam (Nghị định 13/2023/NĐ-CP).
- Phân công đồng đều 4 thành viên (mỗi thành viên đóng góp 25%), toàn đội sẵn sàng bước vào phần Vấn đáp Q&A!
