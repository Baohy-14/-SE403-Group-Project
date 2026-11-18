# Mốc M3 – Đánh giá Kiến trúc (ATAM Rút gọn) & Cải tiến lên Architecture v2

- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm
- **Đề tài 1:** MediLink – Nền tảng đặt lịch khám và hồ sơ sức khỏe điện tử
- **Sản phẩm bàn giao M3:** Phân tích ATAM rút gọn cho ≥ 3 kịch bản ASR ưu tiên cao nhất (Sensitivity Points, Trade-off Points, Risks, Non-Risks), Biên bản phản biện chéo (*Peer Review*), Thiết kế cải tiến **Architecture Design v2** xử lý dứt điểm 3 rủi ro kiến trúc và cập nhật trạng thái ADR (`ADR-002` → *Partially Superseded by* `ADR-007`).

---

## 1. Quy trình Đánh giá ATAM Rút gọn (Bước 11)

Dựa trên phương pháp **ATAM (*Architecture Tradeoff Analysis Method*)** của Viện Kỹ nghệ Phần mềm SEI (Carnegie Mellon University), nhóm tiến hành rà soát bản thiết kế **Architecture v1 (M2)** trước 3 kịch bản hạng `(H, H)` có rủi ro kỹ thuật cao nhất (`ASR-01`, `ASR-02`, `ASR-03`) cùng kịch bản bảo toàn chứng cứ pháp lý (`QAS-05`).

### 1.1. Phân tích Kịch bản 1 – `ASR-01`: 50 Bệnh nhân Cùng đặt 1 Slot Khám (*Consistency & Concurrency*)

- **Tóm tắt kịch bản & SLA:** 50 requests đồng thời đặt `DOC_101 @ 08:00` → đúng `1` thành công (`201`), `49` nhận `409`, `double-booking = 0%`, `p95 ≤ 500 ms`.
- **Cách Kiến trúc v1 đáp ứng:** Sử dụng `Idempotency Key` + khóa phân tán Redis `SET lock:slot:... NX PX 3000` + chèn vào CSDL.
- **Kết quả phân tích ATAM:**
  - **Sensitivity Point `S-01` (Thời gian giữ khóa `LOCK_TTL_MS` và Phạm vi giữ khóa):** Độ an toàn và thông lượng cực kỳ nhạy cảm với thời gian giữ khóa. Ở thiết kế v1 ban đầu, khóa Redis được giữ xuyên suốt cả bước gọi HTTP đồng bộ sang HIS cơ sở. Nếu mạng HIS chậm 3.2 giây (> `TTL = 3.0 giây`), khóa Redis tự động hết hạn cho phép luồng thứ hai lọt vào trong khi luồng thứ nhất vẫn đang chạy dở!
  - **Trade-off Point `T-01` (*Strict Consistency* vs *Immediate Retry Availability*):** Chính sách Fast-fail trả ngay `409 Conflict` cho 49 người đến sau giúp độ trễ cực thấp và không nghẽn hàng đợi, nhưng đánh đổi lại là nếu người đầu tiên thanh toán lỗi hoặc hủy ngay sau 5 giây thì 49 người kia phải bấm chọn lại chứ không được xếp hàng chờ tự động.
  - **Risk `R-01` (Nguy cơ Spam Request làm nghẽn tầng Khóa & Nguy cơ Hết hạn Khóa sớm khi gọi HIS):**
    1. Chưa có bộ giới hạn tần suất (*Rate Limiter*) ở cửa ngõ Gateway nên 1 bot hoặc người dùng nhấn F5 liên tục hàng trăm lần/giây sẽ dội thẳng vào Redis.
    2. Giữ khóa Redis trong lúc chờ mạng gọi sang HIS ngoài tạo rủi ro hết TTL khóa sớm hoặc làm chậm toàn hệ thống.
  - **Non-Risk `NR-01`:** Việc dùng mã định danh khóa theo cặp `(doctor_id, slot_time)` đảm bảo bệnh nhân đặt bác sĩ A hoàn toàn không khóa chéo sang bác sĩ B hay khung giờ `08:30` kế bên (*Fine-grained lock granularity*).

---

### 1.2. Phân tích Kịch bản 2 – `ASR-02`: HIS Cơ sở Huế Ngừng hoạt động 2 Giờ (*Availability & Fault Isolation*)

- **Tóm tắt kịch bản & SLA:** Máy chủ `SOAP/XML` tại Huế mất kết nối 2 giờ → 11 cơ sở thuộc Đà Nẵng & Quảng Nam vẫn đặt lịch `100%`, không treo dây chuyền, không mất lịch hẹn tại Huế.
- **Cách Kiến trúc v1 đáp ứng:** Gọi qua `HueXmlAdapter` trong lớp ACL có đặt timeout.
- **Kết quả phân tích ATAM:**
  - **Sensitivity Point `S-02` (`HIS_TIMEOUT_MS`, `CB_FAILURE_THRESHOLD` và `CB_RESET_TIMEOUT_MS`):** Nếu đặt `HIS_TIMEOUT_MS = 10s` và `failureThreshold = 10`, hệ thống sẽ mất tới `100 giây` treo kết nối trước khi ngắt mạch; ngược lại nếu đặt `failureThreshold = 1` thì chỉ 1 gói tin mạng rớt thoáng qua đã làm ngắt mạch oan cả cơ sở Huế. Giá trị cân bằng được chốt là `Timeout = 1.500 ms` và `Threshold = 3 lỗi liên tiếp`.
  - **Trade-off Point `T-02` (*Availability* vs *Immediate Data Consistency*):** Chấp nhận tiếp nhận lịch hẹn vào hàng đợi trên MediLink khi HIS Huế mất mạng giúp duy trì `Availability ≥ 99.5%` và giữ chân bệnh nhân, nhưng chấp nhận độ trễ đồng bộ (*Eventual Consistency*) với máy chủ tại phòng khám Huế trong thời gian đứt mạng.
  - **Risk `R-02` (Bão đồng bộ *Thundering Herd* & Ghi trùng phiếu khám khi HIS Huế sống lại):** Ở bản v1 (`ADR-002`), chưa có bảng `Transactional Outbox` bền vững có điều tiết tốc độ. Khi HIS Huế bật lại sau 2 giờ, nếu đẩy ồ ạt hàng trăm lịch hẹn tích lũy sang máy chủ SOAP/XML cũ kỹ cùng một lúc, HIS Huế sẽ quá tải sập ngay lần nữa; đồng thời các request từng bị timeout lửng lơ nếu gửi lại không kèm `IdempotencyToken` sẽ tạo 2 phiếu khám trùng bên HIS.
  - **Non-Risk `NR-02`:** Mỗi `facility_id` sở hữu một thực thể `CircuitBreaker` độc lập trong `HisIntegrationDispatcher` (mẫu *Bulkhead*), nên trạng thái `OPEN` của `FAC_HUE` hoàn toàn không chạm tới `FAC_DANANG` hay `FAC_QUANGNAM`.

---

### 1.3. Phân tích Kịch bản 3 – `ASR-03` & `QAS-05`: Bảo mật Liên cơ sở & Chống Sửa Nhật ký Kiểm toán (*Security & Privacy*)

- **Tóm tắt kịch bản & SLA:** Lễ tân Đà Nẵng xem bệnh án Huế bị chặn `403` (`0 byte` rò rỉ) + ghi Audit; chống quản trị viên DB xem trộm bệnh án hoặc sửa/xóa dòng log.
- **Cách Kiến trúc v1 đáp ứng:** Middleware kiểm tra `RBAC + ABAC` theo `facility_id` và ghi bảng `audit_logs` có băm `HMAC-SHA256`.
- **Kết quả phân tích ATAM:**
  - **Sensitivity Point `S-03` (Vị trí lưu trữ các khóa bí mật `DATA_ENCRYPTION_KEY` và `HMAC_AUDIT_SECRET`):** Toàn bộ tính bảo mật của bản mã `AES-256-GCM` và tính chống giả mạo của chuỗi `HMAC` phụ thuộc tuyệt đối vào việc 2 khóa này phải nằm ngoài tệp cơ sở dữ liệu (truyền qua biến môi trường cách ly / Secret Manager).
  - **Trade-off Point `T-03` (*Confidentiality / Encryption At-Rest* vs *SQL Query Flexibility*):** Mã hóa xác thực `AES-256-GCM` với IV ngẫu nhiên cho các cột chẩn đoán và đơn thuốc đảm bảo kẻ lấy trộm file DB không đọc được gì, nhưng đánh đổi lại là không thể viết câu lệnh SQL `WHERE diagnosis LIKE '%tiểu đường%'` trực tiếp trên CSDL.
  - **Risk `R-03` (Lỗ hổng Xem lén tại Cùng cơ sở, Thiếu kiểm tra Consent Liên cơ sở & Phát hiện Chậm khi DBA Sửa Log):**
    1. Ở bản v1, lễ tân Đà Nẵng tuy bị chặn xem bệnh án Huế nhưng lại xem được toàn bộ chẩn đoán nhạy cảm của bệnh nhân khám tại Đà Nẵng (vi phạm nguyên tắc tối thiểu hóa dữ liệu của Nghị định 13/2023).
    2. Bác sĩ Đà Nẵng xem hồ sơ Huế chưa kiểm tra tường minh bảng `patient_consents` của bệnh nhân.
    3. Bảng `audit_logs` chưa cài Trigger chặn `UPDATE/DELETE` ở tầng CSDL và chưa có tiến trình nền quét kiểm định chuỗi băm định kỳ.
  - **Non-Risk `NR-03`:** `abacMiddleware.js` luôn đọc `record.facility_id` trực tiếp từ CSDL thay vì đọc tham số từ request của client, loại bỏ hoàn toàn nguy cơ giả mạo tham số đầu vào.

---

## 2. Biên bản Phản biện Chéo (Peer Review Feedback)

Nhóm đã trình bày bản thiết kế v1 và nhận phản biện trực tiếp từ nhóm bạn cùng lớp (Nhóm Đề tài 2 – ShopHub) và rà soát theo bộ câu hỏi ATAM:

| STT | Câu hỏi chất vấn trong buổi Peer Review | Điểm yếu phát hiện ở v1 | Quyết định sửa đổi sang Architecture v2 |
|:---:|-----------------------------------------|-------------------------|-----------------------------------------|
| 1 | *"Trong lúc đang giữ khóa Redis, nếu hàm gọi sang Mock HIS mất 2 giây mới xong thì sao? Có cần giữ khóa lâu vậy không?"* | Giữ khóa xuyên qua lời gọi mạng ngoài là phản mẫu (*anti-pattern*), vừa chậm vừa dễ lố TTL 3 giây (`Risk R-01`). | **Tách phạm vi khóa:** Nhả khóa Redis bằng Lua Script ngay sau khi `BEGIN IMMEDIATE ... INSERT UNIQUE ... COMMIT` hoàn tất (`< 5 ms`), rồi mới gọi ACL đồng bộ HIS; kèm thêm `Fencing Token` và `Token Bucket Rate Limiter` ở Gateway. |
| 2 | *"Khi HIS Huế chết 2 tiếng rồi sống lại, làm sao không mất lịch đặt trong 2 tiếng đó mà cũng không làm sập lại HIS Huế?"* | Chưa có kho lưu tạm bền vững và cơ chế điều tiết tốc độ phát lại (`Risk R-02`). | Ban hành **`ADR-007`** (thay thế phần xử lý lỗi của `ADR-002`): Thêm bảng `outbox_events` và `OutboxSyncWorker` chạy theo lô nhỏ (`Batch = 5`) kèm **Random Jitter** và `IdempotencyToken`. |
| 3 | *"Lễ tân ngồi ở quầy Đà Nẵng mở hồ sơ bệnh nhân Đà Nẵng có nhìn thấy bệnh nhân bị HIV hay bệnh nhạy cảm không? Và nếu DBA sửa trực tiếp file SQLite thì sao biết?"* | Chưa che dữ liệu lâm sàng đối với lễ tân cùng cơ sở; thiếu Consent liên cơ sở và thiếu trình quét tự động (`Risk R-03`). | Bổ sung chế độ `ADMIN_SUMMARY_ONLY` (`[REDACTED]`) cho lễ tân, bảng `patient_consents`, Trigger SQL cấm `UPDATE/DELETE` trên `audit_logs` và `AuditIntegrityWorker` quét chuỗi HMAC tự động. |

---

## 3. Tổng hợp Nâng cấp từ Architecture v1 (M2) sang Architecture v2 (M3)

Bảng dưới đây đối chiếu rõ ràng sự tiến hóa kiến trúc từ phiên bản v1 sang phiên bản hoàn thiện v2 (đã được hiện thực 100% trong mã nguồn Prototype M4):

| Hạng mục thay đổi | Thiết kế Architecture v1 (M2) | Thiết kế Architecture v2 (M3 – Hoàn chỉnh) | Risk được giải quyết & ADR cập nhật |
|:---|:---|:---|:---|
| **1. Phạm vi Khóa & Chống Spam Đặt lịch** | Không có Rate Limit cửa ngõ; giữ khóa Redis cho tới khi gọi xong HIS ngoài. | Thêm **`TokenBucketRateLimiter`** tại Gateway; gắn **`Fencing Token`** tăng đơn điệu và **nhả khóa ngay sau khi commit `UNIQUE` tại DB** (trước khi gọi HIS). | Xử lý dứt điểm **`Risk R-01`** (`ADR-003`). |
| **2. Chịu lỗi & Phục hồi Đồng bộ HIS** | Chỉ gọi đồng bộ trực tiếp sang HIS Adapter (`ADR-002` bản đầu). | Đánh dấu `ADR-002` là *Partially Superseded*; ban hành **`ADR-007`** bổ sung **`CircuitBreaker` riêng từng cơ sở + `outbox_events` + `OutboxSyncWorker` có Jitter & Idempotency**. | Xử lý dứt điểm **`Risk R-02`** (`ADR-002` → `ADR-007`). |
| **3. Bảo mật Dữ liệu Nhạy cảm & Toàn vẹn Audit** | Chỉ chặn lễ tân khác cơ sở; chưa che trường bệnh lý với lễ tân cùng cơ sở; kiểm tra HMAC thủ công. | Thêm **Data Masking (`[REDACTED]`)** cho lễ tân cùng cơ sở, bảng **`patient_consents`** cho bác sĩ liên cơ sở, mã hóa cấp trường **`AES-256-GCM`**, **SQLite Trigger cấm sửa/xóa** + **`AuditIntegrityWorker`** quét định kỳ. | Xử lý dứt điểm **`Risk R-03`** (`ADR-004`, `ADR-006`). |

---

## 4. Tự kiểm tra Mốc M3

### Câu 1: Phân biệt *Sensitivity Point* và *Trade-off Point* bằng ví dụ thật trong chính thiết kế MediLink.
- **Sensitivity Point (Điểm nhạy cảm):** Là một thông số hoặc quyết định cục bộ mà chỉ cần chỉnh lệch một chút sẽ làm thay đổi mạnh **một thuộc tính chất lượng**.
  - *Ví dụ trong MediLink:* Ngưỡng thời gian chờ `HIS_TIMEOUT_MS` (đặt bằng `1.500 ms` trong `src/core/config.js`). Nếu tăng thông số này lên `15.000 ms`, khi HIS Huế treo mạng sẽ làm độ trễ của 3 request đầu tiên vọt lên 15 giây, ảnh hưởng trực tiếp tới **Performance/Availability**.
- **Trade-off Point (Điểm đánh đổi):** Là quyết định tác động lên **hai thuộc tính chất lượng theo hai chiều ngược nhau** (được cái này thì mất một phần cái kia).
  - *Ví dụ trong MediLink:* Áp dụng **Circuit Breaker + Transactional Outbox (`ADR-007`)** khi HIS Huế mất kết nối: giúp tăng tối đa **Availability** (người dân vẫn giữ chỗ được trong `< 10 ms`, 11 cơ sở khác không bị vạ lây), nhưng buộc phải hy sinh **Immediate Consistency** (chấp nhận dữ liệu bên HIS Huế chỉ đạt nhất quán muộn *Eventual Consistency* sau khi mạng có lại).

### Câu 2: Thay đổi lớn nhất từ v1 sang v2 là gì và những Risk nào đã được chứng minh giảm thiểu bằng code?
1. **Nhả khóa sớm sau bước ghi RDBMS + Fencing Token + Rate Limiter** → Giảm `Risk R-01` (được kiểm chứng ở `Test 1`: 50 requests đồng thời hoàn tất với `p95 = 142.16 ms`, `0%` double-booking).
2. **Bổ sung Transactional Outbox + Rate-Controlled Recovery có Jitter (`ADR-007`)** → Giảm `Risk R-02` (được kiểm chứng ở `Test 2`: mạch Huế mở `OPEN` phản hồi `7.38 ms`, khi Huế bật lại đồng bộ bù đủ `4/4` lịch hẹn).
3. **Bổ sung Consent + Data Masking + `AES-256-GCM` + SQL Trigger & `AuditIntegrityWorker`** → Giảm `Risk R-03` (được kiểm chứng ở `Test 3` & `Test 4`: chặn `403` trong `2.37 ms`, phát hiện DBA sửa trộm dòng log `#1` trong `0.395 ms`).
