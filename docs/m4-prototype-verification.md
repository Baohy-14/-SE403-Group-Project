# Mốc M4 – Hiện thực Prototype & Báo cáo Kiểm chứng Thuộc tính Chất lượng

- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm
- **Đề tài 1:** MediLink – Nền tảng đặt lịch khám và hồ sơ sức khỏe điện tử
- **Sản phẩm bàn giao M4:** Mã nguồn khung kiến trúc (*Architectural Skeleton*) trong `src/`, cấu hình `docker-compose.yml` 6 containers trên 3 mạng cách ly, bộ 6 kịch bản kiểm thử tự động trong `src/tests/` và số liệu thực nghiệm đo thật trên phần cứng của nhóm.

---

## 1. Ma trận Ánh xạ 1:1 từ Sơ đồ Kiến trúc (C4 Views) sang Mã nguồn Prototype (Bước 13)

Toàn bộ mã nguồn trong `src/` được xây dựng bằng **Node.js 22 LTS thuần chuẩn** (`node:http`, `node:sqlite`, `node:crypto`, `node:net`) không phụ thuộc gói thư viện bên thứ ba nặng nề, đảm bảo bất kỳ thành viên nào cũng đọc hiểu từng dòng lệnh và chạy được ngay lập tức:

| Thành phần trên C4 Container / Component View | Tệp mã nguồn hiện thực trong Repository | Tactic / Pattern được hiện thực & Truy vết ASR |
|:---|:---|:---|
| **Container `medilink-core` – HTTP Gateway & Rate Limiter** | [`src/core/server.js`](../src/core/server.js), [`src/core/gateway/httpApp.js`](../src/core/gateway/httpApp.js), [`src/core/gateway/rateLimiter.js`](../src/core/gateway/rateLimiter.js) | Định tuyến REST, gắn `X-Request-Id`, thuật toán **Token Bucket Rate Limiter** chống spam (`Risk R-01`). |
| **Component `JWT Auth & Contextual ABAC + Consent Guard`** | [`src/core/auth/jwtService.js`](../src/core/auth/jwtService.js), [`src/core/auth/authMiddleware.js`](../src/core/auth/authMiddleware.js), [`src/core/auth/abacMiddleware.js`](../src/core/auth/abacMiddleware.js) | Ký/xác thực chữ ký số **JWT HS256**, kiểm tra `RBAC`, chặn xem chéo cơ sở `user.facility_id == record.facility_id` và kiểm tra `patient_consents` (`ASR-03`, `ADR-004`). |
| **Component `Booking Domain Service & Slot Cache`** | [`src/core/booking/bookingService.js`](../src/core/booking/bookingService.js), [`src/core/booking/slotCache.js`](../src/core/booking/slotCache.js) | Điều phối đặt/hủy lịch, **Read-Through Cache** có xóa đệm tức thì khi ghi (`QAS-06`), đẩy sự kiện Outbox & Notification. |
| **Component `Concurrency & Idempotency Engine` + `medilink-redis`** | [`src/core/booking/lockManager.js`](../src/core/booking/lockManager.js), [`src/core/booking/redisRespClient.js`](../src/core/booking/redisRespClient.js), [`src/core/booking/idempotencyManager.js`](../src/core/booking/idempotencyManager.js) | Giao thức TCP RESP gọi thẳng Redis `SET NX PX 3000` + `INCR fencing_seq` + Lua Script nhả khóa nguyên tử; lưu khóa chống trùng `X-Idempotency-Key` (`ASR-01`, `QAS-07`, `ADR-003`). |
| **Component `EHR & Crypto Storage` + `Lab Object Bucket`** | [`src/core/ehr/ehrService.js`](../src/core/ehr/ehrService.js), [`src/core/ehr/encryptionService.js`](../src/core/ehr/encryptionService.js), [`src/core/ehr/labStorageService.js`](../src/core/ehr/labStorageService.js) | Mã hóa cấp trường & nhị phân **`AES-256-GCM`**, che dữ liệu (`[REDACTED]`) đối với lễ tân và cấp **Pre-signed URL (TTL 120s)** tải file PDF xét nghiệm (`ASR-03`, `ADR-006`). |
| **Component `Append-Only Audit & Chain Verifier`** | [`src/core/audit/auditService.js`](../src/core/audit/auditService.js), [`src/core/audit/auditVerifier.js`](../src/core/audit/auditVerifier.js) | Ghi nhật ký kiểm toán liên kết chuỗi băm **`HMAC-SHA256`** và quét phát hiện dòng bị sửa đổi từ khối `GENESIS_HASH` (`QAS-05`, `ADR-004`). |
| **Component `Anti-Corruption Layer (ACL)`** | [`src/core/acl/hisDispatcher.js`](../src/core/acl/hisDispatcher.js), [`src/core/acl/canonicalModel.js`](../src/core/acl/canonicalModel.js), [`src/core/acl/circuitBreaker.js`](../src/core/acl/circuitBreaker.js), [`src/core/acl/adapters/`](../src/core/acl/adapters/) | Chuẩn hóa sang **HL7 FHIR R4 (`Patient`, `Appointment`)**, ánh xạ đa mã bệnh nhân `MPI`, **Circuit Breaker** riêng từng cơ sở và 4 Adapters độc lập (`ASR-02`, `ASR-04`, `ADR-002`). |
| **Container `SQLite WAL RDBMS`** | [`src/core/db/database.js`](../src/core/db/database.js) | CSDL quan hệ SQLite 3 (WAL mode) thực thi ràng buộc `UNIQUE(active_slot_key)` và Trigger `BEFORE UPDATE / BEFORE DELETE` bảo vệ bảng `audit_logs`. |
| **Container `medilink-worker` (Background Worker)** | [`src/worker/backgroundWorker.js`](../src/worker/backgroundWorker.js) | 3 luồng nền: `OutboxSyncWorker` (có Random Jitter), `NotificationQueueWorker` (Exponential Backoff 3 lần) và `AuditIntegrityWorker` (`ADR-005`, `ADR-007`). |
| **3 Containers `mock-his-*` (Đà Nẵng, Huế, Quảng Nam)** | [`src/mock-his/hisDaNangServer.js`](../src/mock-his/hisDaNangServer.js), [`src/mock-his/hisHueServer.js`](../src/mock-his/hisHueServer.js), [`src/mock-his/hisQuangNamServer.js`](../src/mock-his/hisQuangNamServer.js) | 3 máy chủ giả lập độc lập: REST/JSON (`8001`), Legacy SOAP 1.1/XML có Chaos Mode (`8002`), Custom RPC (`8003`). |

---

## 2. Cấu hình Môi trường Đo Thực tế & Lệnh Tái hiện Thí nghiệm (Bước 14)

### 2.1. Thông số Phần cứng & Hệ điều hành Máy Thực nghiệm
Toàn bộ số liệu trong báo cáo này được đo trực tiếp vào ngày **18/11/2026** trên máy tính của thành viên nhóm (kết quả gốc xuất tự động ra tệp [`src/tests/latest_verification_report.json`](../src/tests/latest_verification_report.json)):
- **Vi xử lý (CPU):** `Intel(R) Core(TM) i3-1005G1 CPU @ 1.20GHz` (4 luồng xử lý logic – `4 vCPU`).
- **Bộ nhớ RAM:** `4.0 GB` (`3.79 GB` khả dụng).
- **Hệ điều hành:** `Windows 11 64-bit (win32 10.0.26200 x64)`.
- **Môi trường thực thi:** `Node.js v22.15.0` (tích hợp sẵn `node:sqlite`, `node:crypto` C++, `fetch` native) & `Docker Engine v28.0.4` / `Docker Compose v2.34.0`.

### 2.2. Hai Cách Chạy Tái hiện Kiểm chứng

**Cách 1 – Chạy trọn bộ 6 thí nghiệm tự động bằng 1 lệnh Node.js (Không cần cài thêm gói ngoài, hoàn tất trong ~3 giây):**
```powershell
node --no-warnings src/tests/run_all_verification_tests.js
```

**Cách 2 – Khởi chạy đầy đủ 6 Containers trên 3 Mạng Docker cách ly bằng 1 lệnh duy nhất:**
```powershell
docker compose up --build -d
# Thử nghiệm tắt hẳn container HIS Huế để chứng minh cô lập lỗi:
docker stop mock-his-hue
```

---

## 3. Kết quả Thí nghiệm Thực tế & Đối chiếu với Response Measure

### Thí nghiệm 1 (`test_concurrency_double_booking.js`) – Kiểm chứng `ASR-01` & `QAS-07`
- **Thiết kế thí nghiệm:** Dùng `Promise.all` kích hoạt đồng thời **50 HTTP POST requests** từ 50 phiên khách hàng khác nhau cùng đặt bác sĩ `DOC_101` khung giờ `2026-11-20 08:00`; sau đó lấy `X-Idempotency-Key` của người thắng cuộc gửi lặp lại **5 lần liên tiếp**.
- **Số liệu đo thực tế:**
  - Số request đặt thành công (`HTTP 201 Created`): **`1`** (Kỳ vọng: `1`).
  - Số request bị từ chối xung đột (`HTTP 409 Conflict`): **`49`** (Kỳ vọng: `49`).
  - Truy vấn trực tiếp bảng SQLite `bookings`: **`1 bản ghi CONFIRMED`** → Tỷ lệ Double-booking = **`0.00%`**.
  - Kiểm tra 5 lần gửi lặp cùng `X-Idempotency-Key`: Cả 5 lần trả về **`HTTP 200 OK` (`idempotent_replay: true`)**, không tạo thêm bản ghi trùng.
  - Phân bố độ trễ thực đo (50 requests): `min = 126.26 ms` | `avg = 134.22 ms` | `p50 = 134.13 ms` | **`p95 = 142.16 ms`** *(SLA yêu cầu: `≤ 500 ms`)* | `p99 = 170.93 ms`.
- **Đánh giá:** **ĐẠT XUẤT SẮC (`PASSED`)**.

---

### Thí nghiệm 2 (`test_circuit_breaker_fault_tolerance.js`) – Kiểm chứng `ASR-02` & `ADR-007`
- **Thiết kế thí nghiệm:** Bật chế độ sự cố `DOWN_503` trên `mock-his-hue` (cổng `8002`); gửi 3 yêu cầu đặt lịch vào Huế để kích hoạt ngưỡng ngắt mạch, gửi yêu cầu thứ 4 đo tốc độ Fast-fail; đồng thời gửi yêu cầu đặt lịch vào Đà Nẵng (`8001`) và Quảng Nam (`8003`); cuối cùng khôi phục `mock-his-hue` về `UP` và chạy `OutboxSyncWorker`.
- **Số liệu đo thực tế:**
  - Trạng thái `CircuitBreaker(FAC_HUE)` sau 3 lỗi liên tiếp: Chuyển chính xác sang **`OPEN`**.
  - Độ trễ yêu cầu thứ 4 vào Huế khi mạch đang `OPEN` (ghi nhận vào `outbox_events`): **`7.38 ms`** *(SLA yêu cầu: `≤ 50 ms`)*.
  - Khả năng cô lập lỗi (*Blast Radius = 0*): Đặt lịch tại Đà Nẵng đạt **`201 SYNCED (DN-HIS-1002)`** và Quảng Nam đạt **`201 SYNCED (QN-RPC-3001)`** (**`100%` không bị ảnh hưởng**).
  - Sau khi HIS Huế hoạt động trở lại: `OutboxSyncWorker` đồng bộ bù có Jitter thành công **`4/4` lịch hẹn** và chuyển mạch Huế về lại **`CLOSED`**.
- **Đánh giá:** **ĐẠT XUẤT SẮC (`PASSED`)**.

---

### Thí nghiệm 3 (`test_security_rbac_abac.js`) – Kiểm chứng `ASR-03`, `ADR-004` & `ADR-006`
- **Thiết kế thí nghiệm:** Kiểm thử 6 kịch bản xâm nhập và kiểm soát quyền riêng tư theo Nghị định 13/2023/NĐ-CP.
- **Số liệu đo thực tế:**
  1. Gửi JWT bị sửa chữ ký cuối: Bị chặn **`HTTP 401 Unauthorized`**.
  2. Lễ tân Đà Nẵng (`FAC_DANANG`) đọc bệnh án `REC-HUE-5544` của cơ sở Huế (`FAC_HUE`): Bị chặn **`HTTP 403 Forbidden`** trong **`2.37 ms`** *(SLA: `≤ 50 ms`)*, lượng dữ liệu bệnh lý rò rỉ = **`0 byte`**, tự động ghi dòng Audit Log `#13` (`ACCESS_DENIED_CROSS_FACILITY_EHR`).
  3. Lễ tân Đà Nẵng đọc hồ sơ hành chính đúng cơ sở Đà Nẵng (`REC-DN-1122`): Nhận `200 OK` nhưng toàn bộ trường chẩn đoán và đơn thuốc bị che thành **`[REDACTED]`**.
  4. Bác sĩ Đà Nẵng đọc liên cơ sở hồ sơ Huế khi bệnh nhân chưa cấp Consent: Bị chặn **`HTTP 403 (MISSING_PATIENT_CONSENT)`**; ngay sau khi bệnh nhân gọi `POST /api/ehr/consents` cấp quyền, bác sĩ đọc thành công **`HTTP 200 OK`**.
  5. Kiểm tra trực tiếp cột `diagnosis_enc` trong bảng SQLite `medical_records`: Chuỗi lưu trên đĩa là **`enc:v1:mfIQ4jwyK+4GOh9I:...`** (`AES-256-GCM`), hoàn toàn không chứa chữ rõ.
  6. Tải tệp PDF xét nghiệm qua Pre-signed URL: Đường dẫn hợp lệ trả về **`200 OK (%PDF-1.4)`**; sửa 2 ký tự chữ ký lập tức bị chặn **`403 Forbidden`**.
- **Đánh giá:** **ĐẠT XUẤT SẮC (`PASSED`)**.

---

### Thí nghiệm 4 (`test_audit_tamper_detection.js`) – Kiểm chứng `QAS-05` & `C-04`
- **Thiết kế thí nghiệm:** Thực thi trực tiếp câu lệnh SQL `UPDATE` và `DELETE` lên bảng `audit_logs`; sau đó mô phỏng kịch bản quản trị viên tối cao (Root DBA) tạm gỡ Trigger để sửa lén nội dung dòng log `#1` trên đĩa rồi gọi API `/api/audit/verify`.
- **Số liệu đo thực tế:**
  - Chốt chặn 1 (SQLite Trigger): Chặn đứng **`100%`** lệnh `UPDATE` và `DELETE` thông thường với ngoại lệ `APPEND_ONLY_AUDIT_VIOLATION`.
  - Chốt chặn 2 (Chuỗi băm mật mã `HMAC-SHA256`): Phát hiện chính xác **`tamperedBlockId = 1` (`HMAC_SIGNATURE_MISMATCH`)** chỉ trong **`0.395 ms`** *(SLA: `< 10 ms`)*.
- **Đánh giá:** **ĐẠT XUẤT SẮC (`PASSED`)**.

---

### Thí nghiệm 5 (`test_extensibility_his4.js`) – Kiểm chứng `ASR-04`
- **Thiết kế thí nghiệm:** Khởi chạy thêm máy chủ Mock HIS thứ 4 cho Phòng khám Quốc tế Hội An trên cổng `8004` nhận tài nguyên chuẩn `HL7 FHIR R4 Appointment`, đăng ký `FhirGenericAdapter` vào `HisIntegrationDispatcher` và thực hiện đặt lịch cho bác sĩ `DOC_404`.
- **Số liệu đo thực tế:**
  - Phản hồi đặt lịch: **`HTTP 201 Created`**, đồng bộ thành công với mã **`HOIAN-FHIR-1285`**.
  - Gói tin HIS thứ 4 nhận được đạt chuẩn `resourceType: "Appointment"`, đủ `3 participants` (`Patient`, `Practitioner`, `Location`).
  - Số dòng code phải sửa trong `bookingService.js`, `ehrService.js`, `database.js`: **`0 dòng`**.
- **Đánh giá:** **ĐẠT XUẤT SẮC (`PASSED`)**.

---

### Thí nghiệm 6 (`test_performance_and_async_worker.js`) – Kiểm chứng `QAS-06` & `QAS-08`
- **Thiết kế thí nghiệm:** (A) Bắn đồng thời **200 requests** tra cứu khung giờ trống (`GET /api/slots?facility_id=FAC_DANANG`); (B) Giả lập cổng SMS/Zalo trả lỗi `503` trong 2 lần đầu, thực hiện đặt lịch và theo dõi tiến trình `NotificationQueueWorker`.
- **Số liệu đo thực tế:**
  - Tải đọc 200 requests đồng thời trên máy `Core i3-1005G1 (4GB RAM)`: Thông lượng đạt **`683 requests/giây`**, độ trễ `p50 = 211.32 ms`, **`p95 = 258.50 ms`** *(SLA: `< 300 ms`)*, `p99 = 259.44 ms`, tỷ lệ lỗi = `0%`.
  - Khi cổng SMS/Zalo bị lỗi `503`: Giao dịch đặt lịch vẫn hoàn tất trong **`6.77 ms`**; Worker tự động retry qua 2 lần lỗi theo hàm mũ và gửi thành công ở lần thứ 3 (**`status = SENT`**).
- **Đánh giá:** **ĐẠT XUẤT SẮC (`PASSED`)**.

---

## 4. Bảng Tổng hợp Đối chiếu Kết quả Kiểm chứng M4

| Kịch bản | Thuộc tính chất lượng | Chỉ tiêu Response Measure (M1) | Số đo thực tế trên Prototype (M4) | Kết luận |
|:--------:|-----------------------|--------------------------------|-----------------------------------|:--------:|
| **`ASR-01` / `QAS-07`** | Consistency & Idempotency | 1 OK, 49 lỗi 409, `0%` trùng, `p95 ≤ 500 ms` | **1 OK, 49 lỗi 409, Replay 200 OK, `p95 = 142.16 ms`** | **ĐẠT** |
| **`ASR-02` / `ADR-007`** | Availability & Outbox Recovery | ĐN & QN `100%`, Huế CB `OPEN ≤ 50 ms`, Outbox `100%` | **ĐN & QN `100%`, Fast-fail `7.38 ms`, Outbox `4/4`** | **ĐẠT** |
| **`ASR-03` / NĐ 13** | Security ABAC, Consent & Encryption | Chặn chéo `403 ≤ 50 ms`, `0 byte` lộ, mã hóa DB | **`HTTP 403` (`2.37 ms`), Consent OK, `AES-256-GCM` OK** | **ĐẠT** |
| **`QAS-05` / `C-04`** | Audit Append-Only & Tamper Proof | Chặn SQL sửa/xóa, phát hiện DBA `< 10 ms` | **Trigger chặn `100%`, HMAC phát hiện trong `0.395 ms`** | **ĐẠT** |
| **`ASR-04`** | Interoperability & Extensibility | Thêm HIS thứ 4 sửa `0 dòng` Core | **Đồng bộ chuẩn HL7 FHIR R4, sửa Core = `0 dòng`** | **ĐẠT** |
| **`QAS-06` / `QAS-08`** | Performance & Async Queue | 200 reads `p95 < 300 ms`, lỗi SMS không chặn booking | **`683 req/s`, `p95 = 258.50 ms`, Booking `6.77 ms`, `SENT`** | **ĐẠT** |

---

## 5. Tự kiểm tra Mốc M4

### Câu 1: Chỉ ra chính xác trong code chỗ hiện thực Tactic X; nếu xóa đoạn đó thì kịch bản nào thất bại?
1. **Tactic Distributed Lock + Nhả khóa sớm (`src/core/booking/bookingService.js` dòng 45–107 & `src/core/booking/lockManager.js`):** Nếu xóa bước `lockManager.acquireLock()`, khi chạy trên môi trường nhiều instance và cần kiểm tra nghiệp vụ trước khi ghi, toàn bộ 50 requests đồng thời sẽ dội thẳng vào CSDL làm tăng vọt độ trễ và nguy cơ nghẽn kết nối trong `ASR-01`.
2. **Tactic Per-Facility Circuit Breaker (`src/core/acl/circuitBreaker.js` dòng 43–71):** Nếu xóa nhánh kiểm tra `if (!this.canAttempt()) throw CIRCUIT_OPEN`, khi HIS Huế treo mạng 2 giờ, mọi request vào Huế đều phải đứng chờ hết timeout thay vì phản hồi trong `7.38 ms` (`ASR-02` thất bại chỉ tiêu Fast-fail).
3. **Tactic Contextual ABAC (`src/core/auth/abacMiddleware.js` dòng 52–74):** Nếu xóa câu điều kiện `if (user.facility_id !== rawRecord.facility_id)`, nhân viên lễ tân cơ sở Đà Nẵng sẽ đọc được toàn bộ hồ sơ bệnh nhân Huế (`ASR-03` thất bại hoàn toàn).

### Câu 2: Trong quá trình chạy thử nghiệm, nhóm có gặp trường hợp số đo vượt ngưỡng không? Nguyên nhân do kiến trúc hay do môi trường test?
- **Có – Minh chứng trung thực của nhóm:** Ở lần đo đầu tiên của `Test 6` (200 requests tra cứu lịch đồng thời trên laptop `Intel Core i3-1005G1 @ 1.20GHz, 4GB RAM`), khi endpoint `GET /api/slots` chưa gắn lớp bộ nhớ đệm `SlotReadCache` mà truy vấn trực tiếp SQLite cả 200 lần, độ trễ `p95` đo được là **`301.93 ms`** (vượt nhẹ ngưỡng mục tiêu `300 ms` đúng `1.93 ms`).
- **Phân tích nguyên nhân:** Vừa do giới hạn CPU tiết kiệm điện xung nhịp cơ bản `1.20GHz` của máy test, vừa do code lúc đó **chưa hiện thực đầy đủ tactic Read-Through Cache** đã vẽ trong kiến trúc M2. Sau khi nhóm bổ sung `src/core/booking/slotCache.js` (có xóa đệm tức thì khi đặt/hủy lịch), thông lượng tăng từ `588 req/s` lên **`683 req/s`** và `p95` giảm xuống còn **`258.50 ms`** (`PASSED`)!
