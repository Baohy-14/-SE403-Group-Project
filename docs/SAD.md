# Software Architecture Document (SAD): Nền tảng MediLink (Phiên bản Hoàn chỉnh M5)

- **Dự án:** MediLink – Nền tảng Đặt lịch khám và Hồ sơ Sức khỏe Điện tử cho chuỗi 12 phòng khám
- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm (*Software Architecture & Design*)
- **Giảng viên hướng dẫn:** TS. Nguyễn Đức Mận (`@ManNguyen`)
- **Nhóm thực hiện (Đề tài 1):**
  1. **Trần Tiến Danh** – *Prototype Lead*
  2. **Lê Viết Nghĩa** – *Requirements Owner & Documentation Owner*
  3. **Nguyễn Đức Bảo Hy** – *Lead Architect*
  4. **Nguyễn Quang Trường** – *QA / Test Lead*

---

## MỤC LỤC HỒ SƠ KIẾN TRÚC (SAD)
1. [Giới thiệu Bài toán & Tầm nhìn Kiến trúc](#1-giới-thiệu-bài-toán--tầm-nhìn-kiến-trúc)
2. [Architectural Drivers: Business Goals, Stakeholders, Use Cases & Nghị định 13/2023/NĐ-CP](#2-architectural-drivers-business-goals-stakeholders-use-cases--nghị-định-132023nđ-cp)
3. [Quality Attribute Scenarios, Nguồn gốc Số liệu & Utility Tree (ASR)](#3-quality-attribute-scenarios-nguồn-gốc-số-liệu--utility-tree-asr)
4. [Thiết kế Kiến trúc: Tactics, Styles & Lựa chọn Đồng bộ / Bất đồng bộ](#4-thiết-kế-kiến-trúc-tactics-styles--lựa-chọn-đồng-bộ--bất-đồng-bộ)
5. [Hệ thống Khung nhìn Kiến trúc (C4 L1–L3, Deployment & Sequence Views)](#5-hệ-thống-khung-nhìn-kiến-trúc-c4-l1l3-deployment--sequence-views)
6. [Tổng hợp 7 Quyết định Kiến trúc (ADR-001 đến ADR-007)](#6-tổng-hợp-7-quyết-định-kiến-trúc-adr-001-đến-adr-007)
7. [Đánh giá ATAM Rút gọn & Cải tiến từ Architecture v1 lên Architecture v2](#7-đánh-giá-atam-rút-gọn--cải-tiến-từ-architecture-v1-lên-architecture-v2)
8. [Hiện thực Prototype & Kết quả Kiểm chứng Thực nghiệm](#8-hiện-thực-prototype--kết-quả-kiểm-chứng-thực-nghiệm)
9. [Bài học Kinh nghiệm & Nhìn lại Quyết định Kiến trúc](#9-bài-học-kinh-nghiệm--nhìn-lại-quyết-định-kiến-trúc)
10. [Checklist Tự Đánh giá Trước Khi Nộp & Bảng Đóng góp Thành viên](#10-checklist-tự-đánh-giá-trước-khi-nộp--bảng-đóng-góp-thành-viên)

---

## 1. Giới thiệu Bài toán & Tầm nhìn Kiến trúc

Chuỗi **12 phòng khám tư nhân** tại Đà Nẵng (5 cơ sở), Huế (4 cơ sở) và Quảng Nam (3 cơ sở) đang vận hành rời rạc: lịch hẹn quản lý qua điện thoại/Excel dễ nhầm lẫn, trong khi mỗi cụm cơ sở lại chạy một phần mềm quản lý phòng khám (**HIS**) khác nhau (`REST/JSON`, `SOAP 1.1/XML`, `Custom RPC`) với cách đánh mã bệnh nhân hoàn toàn khác nhau.

**MediLink** được thiết kế làm nền tảng trung tâm thống nhất đặt lịch khám trực tuyến, quản lý Hồ sơ Sức khỏe Điện tử (**EHR**), thanh toán đặt cọc, nhắc lịch đa kênh và báo cáo điều hành, giải quyết **4 bài toán cốt lõi**:
1. **Bảo mật & Tuân thủ Pháp lý Y tế:** Tuân thủ nghiêm ngặt **Nghị định 13/2023/NĐ-CP** cho dữ liệu sức khỏe nhạy cảm (Consent tường minh, phân quyền theo cơ sở, mã hóa cấp trường `AES-256-GCM`, tệp xét nghiệm lưu trên Object Storage kèm Pre-signed URL, nhật ký kiểm toán bất biến).
2. **Chống Đặt trùng lịch (*Zero Double-Booking*):** Xử lý chính xác 50 bệnh nhân tranh chấp cùng 1 khung giờ khám mà không nghẽn CSDL và chống gửi lặp khi mạng 4G chập chờn.
3. **Liên thông Dị thể Dễ Mở rộng:** Tích hợp 3 dòng HIS hiện hữu và sẵn sàng nối thêm HIS thứ 4 trong `≤ 2 tuần công` với `0 dòng` sửa đổi miền nghiệp vụ lõi thông qua lớp **Anti-Corruption Layer (ACL)** chuẩn **HL7 FHIR R4**.
4. **Cô lập Sự cố Chi nhánh:** Khi máy chủ HIS tại Huế sập suốt 2 giờ, 11 cơ sở còn lại vẫn vận hành `100%` bình thường, còn lịch hẹn tại Huế được bảo toàn và tự động đồng bộ bù êm ái khi có mạng lại.

*(Chi tiết khởi động dự án và bảng 10 giả định `A1–A10` xem tại [`docs/stage-0.md`](stage-0.md)).*

---

## 2. Architectural Drivers: Business Goals, Stakeholders, Use Cases & Nghị định 13/2023/NĐ-CP

*(Toàn văn phân tích chi tiết xem tại [`docs/m1-architectural-drivers.md`](m1-architectural-drivers.md)).*

### 2.1. Năm Mục tiêu Kinh doanh (`BG-01` → `BG-05`)
- **`BG-01`:** Chuyển đổi ≥ **65%** lượt đặt khám sang trực tuyến; xác nhận giao dịch **< 1 giây**.
- **`BG-02`:** Đưa tỷ lệ trùng lịch khám (*double-booking*) về **0.00%**.
- **`BG-03`:** Liên thông **100%** hồ sơ khám theo mã định danh `MPI`; tải EHR **< 1.5 giây**; **0 vi phạm** pháp lý dữ liệu cá nhân.
- **`BG-04`:** Tích hợp thêm phòng khám mới dùng HIS thứ 4 trong **≤ 2 tuần công (10 ngày công)**.
- **`BG-05`:** Độ sẵn sàng cổng đặt lịch đạt **≥ 99.5%** giờ làm việc (`07:00–21:00`); cô lập `100%` sự cố đơn lẻ tại chi nhánh.

### 2.2. Bảy Stakeholders & Cặp Xung đột Chính
7 nhóm bên liên quan gồm: *Bệnh nhân, Bác sĩ, Lễ tân, Quản lý cơ sở, Ban Giám đốc, Bộ phận IT, Cơ quan quản lý y tế*. Hai xung đột kiến trúc nổi bật được hóa giải là:
- **Tiện lợi truy cập nhanh của Bác sĩ/Bệnh nhân** vs **Kiểm soát nghiêm ngặt theo Nghị định 13/2023** → Hóa giải bằng kiểm tra ABAC + Consent đánh chỉ mục sẵn kết hợp giải mã phần cứng `AES-256-GCM` trong `< 3 ms`.
- **Không bỏ lỡ khách đặt khám khi HIS chi nhánh đứt mạng** vs **Tránh lệch dữ liệu với phòng khám** → Hóa giải bằng tách quỹ slot Online kết hợp Circuit Breaker + Transactional Outbox.

### 2.3. Phân loại Dữ liệu & 5 Ràng buộc Kỹ thuật từ Nghị định 13/2023/NĐ-CP
Dữ liệu được chia 3 mức (*Mức 1 – Công khai*, *Mức 2 – Cá nhân cơ bản*, *Mức 3 – Cá nhân nhạy cảm sức khỏe*), dẫn xuất thành **5 ràng buộc kỹ thuật bắt buộc**:
- **`C-01` (Consent – Điều 11):** Chia sẻ bệnh án liên cơ sở bắt buộc có bản ghi đồng ý đang hiệu lực trong `patient_consents`.
- **`C-02` (Encryption – Điều 27):** Truyền tải TLS 1.3; lưu trữ cột nhạy cảm mã hóa xác thực `AES-256-GCM` với khóa tách rời DB.
- **`C-03` (Facility ABAC & Masking – Điều 27):** Lễ tân bị khóa cứng trong phạm vi `user.facility_id == record.facility_id` và bị ẩn (`[REDACTED]`) các trường bệnh lý.
- **`C-04` (Append-Only Audit – Điều 23 & 27):** Ghi vết 100% truy cập/vi phạm bằng SQLite Trigger cấm sửa/xóa kết hợp chuỗi băm mật mã `HMAC-SHA256`.
- **`C-05` (Protected Lab Files):** Tệp PDF/ảnh xét nghiệm lưu tách rời ở kho Object Storage mã hóa, chỉ tải qua Pre-signed URL thời hạn 120 giây.

---

## 3. Quality Attribute Scenarios, Nguồn gốc Số liệu & Utility Tree (ASR)

Từ mô hình chuỗi **12 phòng khám × 10 bác sĩ = 120 bác sĩ (1.920 slot/ngày, 420 giờ làm việc/tháng)**, nhóm xây dựng 8 kịch bản chuẩn 6 phần và chọn **4 ASR cốt lõi hạng `(H, H)`**:

| Mã ASR / QAS | Nhóm QA | Hạng | Kịch bản tóm tắt & Chỉ số Response Measure (có nguồn gốc định lượng) |
|:------------:|---------|:----:|-----------------------------------------------------------------------|
| **`ASR-01`** (`QAS-01`) | Consistency | **`(H, H)`** | **50 bệnh nhân** cùng săn 1 slot mở lịch đầu tuần → đúng **1 `201`**, **49 `409`**, `double-booking = 0%`, **`p95 ≤ 500 ms`**. |
| **`ASR-02`** (`QAS-02`) | Availability | **`(H, H)`** | **HIS Huế sập 2 giờ** → sau 3 lỗi (`≤ 1.5s`/lần) mở CB `OPEN`, phản hồi Outbox **`≤ 50 ms`**, 11 cơ sở ĐN & QN đạt **`100%`**, hồi phục đồng bộ đủ `100%`. |
| **`ASR-03`** (`QAS-03`) | Security & Privacy | **`(H, H)`** | **Lễ tân Đà Nẵng xem bệnh án Huế** → chặn **`HTTP 403 ≤ 50 ms`**, rò rỉ **`0 byte`**, ghi `100%` vào `audit_logs` bất biến. |
| **`ASR-04`** (`QAS-04`) | Interoperability | **`(H, H)`** | **Tích hợp thêm HIS thứ 4** → hoàn tất **`≤ 10 ngày công (2 tuần công)`**, sửa đổi **`0 dòng` code** trong Core Domain. |
| `QAS-05` | Integrity | `(H, M)` | **DBA/kẻ nội gián sửa `audit_logs`** → Trigger chặn SQL sửa/xóa; `AuditVerifier` phát hiện `100%` dòng bị can thiệp đĩa trong **`< 10 ms`**. |
| `QAS-07` | Reliability | `(H, M)` | **Mạng 4G gửi lặp 5 lần cùng `Idempotency-Key`** → chỉ tạo **`1` lịch**, 4 lần lặp trả `200 OK Replay` trong `< 30 ms`. |
| `QAS-08` | Fault Isolation | `(M, M)` | **Cổng SMS/Zalo lỗi `503`** → không chặn đặt lịch (`p95 ≤ 500 ms`), Worker tự retry hàm mũ thành công (`SENT`). |
| `QAS-06` | Performance | `(H, L)` | **200 truy vấn xem lịch trống đồng thời** giờ cao điểm sáng → **`p95 < 300 ms`** nhờ `SlotReadCache`. |

---

## 4. Thiết kế Kiến trúc: Tactics, Styles & Lựa chọn Đồng bộ / Bất đồng bộ

*(Chi tiết so sánh từng phương án xem tại [`docs/m2-architecture-design.md`](m2-architecture-design.md)).*

1. **Phong cách Kiến trúc Tổng thể (`ADR-001`):** Lựa chọn **Modular Monolith kết hợp Hexagonal Architecture (Ports & Adapters)** cho `medilink-core` đi kèm tiến trình **`medilink-worker` tách rời**. Thiết kế này đạt điểm đánh giá có trọng số cao nhất (**4.81 / 5.0**) so với Layered Monolith (2.98) và Microservices tách vụn (3.38) đối với quy mô 12 phòng khám và nhóm 4 kỹ sư trong 15 tuần.
2. **Chiến lược Tích hợp HIS (`ADR-002` & `ADR-007`):** Áp dụng **Anti-Corruption Layer** chuẩn hóa qua cặp tài nguyên **HL7 FHIR R4 `Patient` (gắn bảng quy chiếu `MPI` ↔ mã bệnh nhân riêng của từng HIS) và `Appointment`**. Chế độ giao tiếp được thiết kế **lai thông minh**: gọi đồng bộ có ngân sách thời gian ngắn (`1.5s`) khi mạch `CLOSED` để lấy mã phiếu khám ngay, và tự động chuyển sang bất đồng bộ qua `Transactional Outbox` khi HIS chi nhánh gặp sự cố.
3. **Chiến lược Chống Double-Booking (`ADR-003`):** Kết hợp 3 lớp `Idempotency Key` → `Redis Distributed Lock (SET NX PX 3000 + Fencing Token, nhả khóa ngay sau khi ghi DB)` → `SQLite BEGIN IMMEDIATE + UNIQUE(active_slot_key)`.
4. **Chiến lược Bảo mật & Lưu trữ Tệp Xét nghiệm (`ADR-004` & `ADR-006`):** `JWT HS256` + `RBAC/ABAC/Consent` + `Data Masking` + mã hóa cấp trường `AES-256-GCM` + `Encrypted Object Storage` cấp Pre-signed URL 120s + `SQLite Append-Only Trigger & HMAC-SHA256 Audit Chain`.

---

## 5. Hệ thống Khung nhìn Kiến trúc (C4 L1–L3, Deployment & Sequence Views)

Toàn bộ 6 sơ đồ C4-PlantUML lưu tại thư mục [`diagrams/`](../diagrams/) đều có **Trust Boundary**, **Legend** và khớp 100% với `docker-compose.yml` cùng mã nguồn `src/`:
- **C4 Level 1 – Context View:** [`diagrams/c4-context.puml`](../diagrams/c4-context.puml) – Định nghĩa 4 ranh giới tin cậy giữa Người dùng Internet, MediLink, 3 cụm HIS ngoài và Cổng Thanh toán/Tin nhắn.
- **C4 Level 2 – Container View:** [`diagrams/c4-container.puml`](../diagrams/c4-container.puml) – Mô tả `medilink-core`, `medilink-worker`, `medilink-redis`, `SQLite WAL RDBMS`, `Encrypted Lab Object Storage` và 3 containers `mock-his-*`.
- **C4 Level 3 – Component View:** [`diagrams/c4-component-acl.puml`](../diagrams/c4-component-acl.puml) – Chi tiết hóa 6 modules bên trong `medilink-core` và cấu trúc cổng `BaseHisAdapter` của lớp ACL.
- **Deployment View:** [`diagrams/deployment-view.puml`](../diagrams/deployment-view.puml) – Triển khai thực tế trên 3 mạng Docker (`app-net`, `data-net` với `internal: true`, và `his-net`).
- **Sequence Diagram 1 (`ASR-01` & `ASR-02`):** [`diagrams/sequence-booking-concurrency.puml`](../diagrams/sequence-booking-concurrency.puml) – Luồng tranh chấp khóa, nhả khóa sớm, đồng bộ HIS và phục hồi Outbox.
- **Sequence Diagram 2 (`ASR-03` & `QAS-05`):** [`diagrams/sequence-security-audit.puml`](../diagrams/sequence-security-audit.puml) – Luồng chặn truy cập chéo 403, kiểm tra Consent, giải mã `AES-256-GCM`, cấp Pre-signed URL và ghi chuỗi HMAC.

---

## 6. Tổng hợp 7 Quyết định Kiến trúc (ADR-001 đến ADR-007)

| Mã ADR | Chủ đề quyết định | Trạng thái | Phương án được chọn (Tóm tắt) |
|:------:|-------------------|:----------:|-------------------------------|
| [`ADR-001`](../adr/0001-architectural-style.md) | Kiểu kiến trúc tổng thể | `Accepted` | Modular Monolith + Hexagonal Architecture + tiến trình `medilink-worker` tách rời. |
| [`ADR-002`](../adr/0002-his-integration-acl-canonical-model.md) | Chiến lược tích hợp HIS dị thể | `Partially Superseded by ADR-007` | Anti-Corruption Layer + Canonical Model HL7 FHIR R4 (`Patient`, `Appointment`) + ánh xạ `MPI`. |
| [`ADR-003`](../adr/0003-concurrency-distributed-locking-idempotency.md) | Chống double-booking đa tầng | `Accepted` | `X-Idempotency-Key` + `Redis SET NX PX` kèm `Fencing Token` (nhả sớm) + RDBMS `UNIQUE`. |
| [`ADR-004`](../adr/0004-security-rbac-facility-scope-immutable-audit.md) | Phân quyền, Mã hóa & Audit | `Accepted` | `RBAC + Facility ABAC + Consent + Masking` + `AES-256-GCM` + Trigger & `HMAC-SHA256` Chain. |
| [`ADR-005`](../adr/0005-asynchronous-notification-queue.md) | Gửi nhắc lịch đa kênh | `Accepted` | Hàng đợi bền vững `notification_jobs` + Worker xử lý nền có Exponential Backoff & DLQ. |
| [`ADR-006`](../adr/0006-lab-result-object-storage-presigned-url.md) | Lưu trữ tệp kết quả xét nghiệm | `Accepted` | Kho `Encrypted Object Storage` tách rời RDBMS + cấp quyền tải qua `Pre-signed URL` 120s. |
| [`ADR-007`](../adr/0007-v2-outbox-rate-controlled-recovery.md) | Tích hợp HIS chịu lỗi (v2) | `Accepted` | `Per-Facility Circuit Breaker` + `Transactional Outbox` + `Rate-Controlled Sync` kèm Jitter. |

---

## 7. Đánh giá ATAM Rút gọn & Cải tiến từ Architecture v1 lên Architecture v2

*(Báo cáo đánh giá chi tiết xem tại [`docs/m3-architecture-evaluation.md`](m3-architecture-evaluation.md)).*

Qua phiên đánh giá ATAM và phản biện chéo với nhóm bạn tại M3, nhóm đã phát hiện và khắc phục triệt để **3 rủi ro lớn của bản v1** khi nâng cấp lên **Architecture v2**:
1. **Khắc phục `Risk R-01` (Giữ khóa quá lâu khi gọi mạng ngoài & bị spam F5):** Tách việc gọi mạng HIS ra sau bước nhả khóa Redis, bổ sung `Fencing Token` tăng đơn điệu và thêm `TokenBucketRateLimiter` ngay tại HTTP Gateway.
2. **Khắc phục `Risk R-02` (Bão đồng bộ *Thundering Herd* làm sập lại HIS Huế sau sự cố 2 giờ):** Ban hành `ADR-007` bổ sung bảng `outbox_events` và `OutboxSyncWorker` phát lại theo từng lô nhỏ có chèn độ trễ ngẫu nhiên (*Random Jitter*) và `IdempotencyToken`.
3. **Khắc phục `Risk R-03` (Lộ chẩn đoán nhạy cảm trước lễ tân cùng cơ sở & DBA sửa log):** Bổ sung chế độ che dữ liệu `[REDACTED]` cho vai trò lễ tân, kiểm tra bảng `patient_consents` cho bác sĩ liên cơ sở, cài đặt SQLite Trigger cấm `UPDATE/DELETE` và tiến trình `AuditIntegrityWorker` quét chuỗi HMAC định kỳ.

---

## 8. Hiện thực Prototype & Kết quả Kiểm chứng Thực nghiệm

*(Báo cáo thực nghiệm đầy đủ xem tại [`docs/m4-prototype-verification.md`](m4-prototype-verification.md) và [`src/tests/latest_verification_report.json`](../src/tests/latest_verification_report.json)).*

- **Môi trường đo thật:** `Intel(R) Core(TM) i3-1005G1 CPU @ 1.20GHz (4 vCPU)`, `3.79 GB RAM`, `Windows 11 (build 26200 x64)`, `Node.js v22.15.0`.
- **Tóm tắt số đo thực nghiệm (6/6 Kịch bản ĐẠT 100%):**
  - **`ASR-01` & `QAS-07`:** 50 requests tranh 1 slot → **1 thành công (`201`), 49 từ chối (`409`), `0.00%` trùng, `p95 = 142.16 ms`**; 5 lần gửi lặp cùng `Idempotency-Key` trả `200 OK Replay`.
  - **`ASR-02` & `ADR-007`:** Khi Mock HIS Huế lỗi `503` → mạch Huế mở `OPEN`, phản hồi Outbox trong **`7.38 ms`**, Đà Nẵng & Quảng Nam đạt **`100% SYNCED`**; khi Huế bật lại đồng bộ bù đủ **`4/4` lịch hẹn**.
  - **`ASR-03` & NĐ 13/2023:** Lễ tân Đà Nẵng xem bệnh án Huế bị chặn **`403` trong `2.37 ms`** + ghi Audit `#13`; CSDL lưu bản mã `enc:v1:...` (`AES-256-GCM`); Pre-signed URL bị sửa chữ ký trả `403`.
  - **`QAS-05`:** SQLite Trigger chặn đứng `UPDATE`/`DELETE` thường; giả lập Root DBA sửa đĩa bị `AuditVerifier` phát hiện chính xác dòng `#1` trong **`0.395 ms`**.
  - **`ASR-04`:** Cắm thêm HIS thứ 4 (Hội An – chuẩn HL7 FHIR R4 cổng `8004`) đồng bộ thành công với **`0 dòng` code sửa trong Core**.
  - **`QAS-06` & `QAS-08`:** 200 truy vấn đọc đồng thời đạt **`683 req/s`, `p95 = 258.50 ms`**; cổng SMS lỗi 2 lần đầu không ảnh hưởng đặt lịch (`6.77 ms`) và Worker tự retry thành công ở lần thứ 3 (`SENT`).

---

## 9. Bài học Kinh nghiệm & Nhìn lại Quyết định Kiến trúc

### 9.1. Ba Bài học Thiết kế Sâu sắc Nhất của Nhóm
1. **Sơ đồ kiến trúc và mã nguồn phải là một thể thống nhất:** Một thiết kế vẽ trên giấy có đầy đủ Redis, Worker, Encryption nhưng trong code lại chỉ dùng mảng tạm trong RAM là vô giá trị khi kiểm chứng thực tế. Việc hiện thực thật cả SQLite Trigger, `AES-256-GCM`, TCP RESP Redis Client và `OutboxSyncWorker` giúp nhóm hiểu thấu đáo từng mắt xích.
2. **Đừng bao giờ giữ khóa đồng thời xuyên qua lời gọi mạng bên ngoài:** Tách giao dịch giữ chỗ nguyên tử trong CSDL ra khỏi bước gọi HTTP sang HIS ngoài là chìa khóa giúp hệ thống vừa đạt `0%` double-booking, vừa đạt `p95 = 142.16 ms` ngay trên laptop Core i3 4GB RAM.
3. **Bảo mật y tế thực chất nằm ở ranh giới dữ liệu, không chỉ ở màn hình đăng nhập:** Kết hợp `Contextual ABAC + Consent + Data Masking + Field Encryption + HMAC Audit Chain` mới thực sự đáp ứng tinh thần Nghị định 13/2023/NĐ-CP.

### 9.2. Tự kiểm tra Bước 15: Nếu làm lại từ đầu, nhóm sẽ thay đổi quyết định nào và vì sao?
- Nếu được bắt đầu lại từ tuần 1, nhóm sẽ:
  1. **Thiết kế ngay mô hình `Transactional Outbox` (`ADR-007`) từ Mốc M2 thay vì đợi tới phiên đánh giá ATAM ở Mốc M3 mới nâng cấp từ `ADR-002`:** Trong mọi bài toán tích hợp với hệ thống di sản bên ngoài (như HIS phòng khám), lỗi mất mạng luôn là trạng thái tất yếu chứ không phải ngoại lệ hiếm gặp.
  2. **Chuẩn hóa thêm cơ chế `Contract Testing` tự động (dạng JSON Schema / WSDL Validator) cho từng HIS Adapter ngay từ đầu:** Giúp phát hiện sớm ngay trên CI/CD nếu phía nhà cung cấp phần mềm HIS tại Huế hoặc Quảng Nam âm thầm đổi tên thẻ XML/JSON trong các bản cập nhật của họ.

---

## 10. Checklist Tự Đánh giá Trước Khi Nộp & Bảng Đóng góp Thành viên

### 10.1. Checklist Tự Kiểm tra của Nhóm (Mục 8 Tài liệu Hướng dẫn)
- [x] Mọi QA scenario đều có response measure bằng con số cụ thể và giải thích rõ nguồn gốc con số đó (Mục 4 tài liệu M1).
- [x] Mọi pattern, tactic và công nghệ quan trọng đều truy vết trực tiếp về ít nhất một ASR.
- [x] Mỗi ADR trong 7 bản (`ADR-001` → `ADR-007`) đều cân nhắc ≥ 3 phương án và phân tích trung thực hệ quả tiêu cực kèm biện pháp giảm thiểu.
- [x] Các Architecture Views nhất quán 100% với nhau về tên thành phần, cổng mạng, giao thức; mọi sơ đồ đều có Trust Boundary và Legend.
- [x] Cấu trúc mã nguồn `src/` và `docker-compose.yml` ánh xạ chính xác 1:1 về Container View & Component View.
- [x] Toàn bộ số liệu kiểm chứng là số đo thật chạy trên máy của nhóm, có ghi rõ CPU/RAM/OS và cách tái hiện bằng 1 lệnh.
- [x] Nhật ký [`ai-log.md`](../ai-log.md) cập nhật đầy đủ 6 cột trung thực, cột *"Nhóm đã giữ / sửa / bỏ gì và vì sao"* được ghi chi tiết cho từng mục.
- [x] Cả 4 thành viên đã đọc chéo toàn bộ bài nộp và luyện vấn đáp theo 6 cấp độ tư duy Bloom ([`docs/qa-interview-prep.md`](qa-interview-prep.md)).

### 10.2. Bảng Đánh giá Mức độ Đóng góp của Thành viên

| STT | Họ và Tên | Vai trò chính | Các hạng mục phụ trách & Review chéo | Tỷ lệ đóng góp | Hệ số đề xuất |
|:---:|-----------|---------------|--------------------------------------|:--------------:|:-------------:|
| 1 | **Trần Tiến Danh** | Prototype Lead | Hiện thực `src/core/`, `src/worker/`, `src/mock-his/`, `Dockerfile`, `docker-compose.yml`, `ADR-006`, phụ trách Live Demo. | **25%** | **1.0** |
| 2 | **Lê Viết Nghĩa** | Requirements & Doc Owner | Phân tích M1 Drivers, Nghị định 13/2023/NĐ-CP, `ADR-004`, `ADR-005`, biên tập đồng bộ `SAD.md`, Slide, báo cáo `.docx` & `ai-log.md`. | **25%** | **1.0** |
| 3 | **Nguyễn Đức Bảo Hy** | Lead Architect | Xây dựng Utility Tree, chọn Tactics/Styles, vẽ 6 sơ đồ C4/Deployment/Sequence, chủ trì ATAM & v2, viết `ADR-001`, `002`, `003`, `007`. | **25%** | **1.0** |
| 4 | **Nguyễn Quang Trường** | QA / Test Lead | Định lượng hóa 8 QA Scenarios, viết 6 kịch bản test tự động `src/tests/`, thực nghiệm thu số liệu thật M4 và biên soạn bộ luyện vấn đáp Q&A. | **25%** | **1.0** |
| **Tổng** | | | **Cam kết đồng thuận 100% từ cả 4 thành viên** | **100%** | |
