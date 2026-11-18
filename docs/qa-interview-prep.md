# Cẩm nang Luyện Vấn đáp Kiến trúc & Mã nguồn – Đề tài 1: MediLink

Tài liệu này giúp cả 4 thành viên (**Trần Tiến Danh, Lê Viết Nghĩa, Nguyễn Đức Bảo Hy, Nguyễn Quang Trường**) nắm chắc 100% lý do đằng sau mọi quyết định kiến trúc, sơ đồ và từng dòng code để tự tin trả lời vấn đáp ngẫu nhiên với **TS. Nguyễn Đức Mận** mà không cần nhìn tài liệu.

---

## PHẦN 1: BA CÂU HỎI BẮT BUỘC RIÊNG CỦA ĐỀ TÀI 1 – MEDILINK (Trang 6 File Hướng dẫn)

### Câu 1: Vì sao chỉ dùng `UNIQUE CONSTRAINT` trong Database có thể chưa đủ khi hệ thống có nhiều instance và có cache?
> **Cách trả lời gọn, trúng bản chất:**
> Ràng buộc `UNIQUE(doctor_id, slot_time)` trong CSDL quan hệ là **điều kiện cần (chốt chặn cuối cùng)** nhưng **chưa đủ** vì 4 lý do kiến trúc:
> 1. **Gây bão tải lên CSDL chính (*DB Connection Pool Exhaustion*):** Khi 50–500 người cùng săn 1 slot qua nhiều instance `medilink-core`, nếu không có lớp khóa nhanh trên bộ nhớ (`Redis SET NX PX`), tất cả 50 luồng đều chạy hết kiểm tra nghiệp vụ và dội thẳng 50 giao dịch ghi vào CSDL chỉ để 49 luồng bị ném ngoại lệ SQL.
> 2. **Nguy cơ bắn lệnh trùng ra hệ thống HIS bên ngoài:** Nếu luồng nghiệp vụ lỡ kiểm tra cache thấy trống rồi gọi sang HIS phòng khám trước khi commit DB, thì cả nhiều instance sẽ cùng gửi lệnh đặt trùng sang HIS.
> 3. **Lệch dữ liệu với tầng Cache (*Cache Race Condition*):** Nhiều instance cùng đọc cache thấy slot đang `AVAILABLE` tại cùng thời điểm trước khi DB kịp cập nhật và xóa cache.
> 4. **Không phân biệt được khách khác tranh chỗ với cùng một khách retry do rớt mạng:** `UNIQUE` chỉ biết báo lỗi trùng, trong khi nếu chính bệnh nhân đó gửi lặp request kèm cùng `X-Idempotency-Key` thì hệ thống phải trả lại `200 OK` thay vì báo lỗi `409`!
> - **Giải pháp trong code của nhóm (`src/core/booking/bookingService.js`):** Kết hợp 3 lớp `IdempotencyManager` → `LockManager` (`Redis SET NX PX 3000` + `Fencing Token`, nhả khóa ngay sau khi commit DB) → `SQLite BEGIN IMMEDIATE + UNIQUE(active_slot_key)` + `slotCache.invalidateAll()`.

---

### Câu 2: Khi HIS bên ngoài trả lỗi Timeout, hệ thống MediLink làm gì với lịch hẹn đang chờ xác nhận?
> **Cách trả lời gọn, trúng bản chất:**
> Nhóm xử lý theo thiết kế **Architecture v2 (`ADR-007`)** trong `bookingService.js` (dòng 110–145) và `backgroundWorker.js`:
> 1. **Không hủy lịch của bệnh nhân và không giữ khóa chờ mạng:** Vì bước giữ chỗ trong CSDL của MediLink đã commit thành công và khóa Redis đã được nhả trước khi gọi HIS, ngay khi `hisDispatcher.syncAppointment()` vượt ngưỡng `HIS_TIMEOUT_MS = 1500 ms` (`AbortSignal.timeout`), cuộc gọi mạng bị cắt đứt ngay.
> 2. **Chuyển sang trạng thái Chịu lỗi (*Graceful Degradation*):** Lịch hẹn trên MediLink vẫn giữ trạng thái `CONFIRMED`, nhưng cột `his_sync_status` được cập nhật thành `'OUTBOX_QUEUED'`, đồng thời một sự kiện bền vững được chèn vào bảng `outbox_events`. Bệnh nhân nhận `HTTP 201` kèm thông báo rõ ràng là đã giữ chỗ thành công và mã phiếu phòng khám sẽ gửi sau.
> 3. **Ngắt mạch bảo vệ (*Circuit Breaker*):** Bộ đếm lỗi của riêng cơ sở đó tăng lên; đủ `3 lần` liên tiếp thì `CircuitBreaker` mở sang `OPEN` để các request kế tiếp không phải chờ `1.5s` nữa mà phản hồi ngay trong `~7.38 ms`.
> 4. **Đồng bộ bù chống trùng có điều tiết (*Rate-Controlled Idempotent Replay*):** Vì lỗi Timeout là lỗi "không xác định" (có thể HIS thực chất đã ghi xong trước khi đứt cáp trả lời!), sự kiện trong Outbox luôn mang theo `IdempotencyToken` (`booking.id`). Khi HIS phục hồi, `OutboxSyncWorker` gửi lại theo lô nhỏ `5 bản ghi` kèm **Random Jitter (`20–60 ms`)**; nếu HIS đã ghi trước đó thì trả lại mã cũ, nếu chưa ghi thì tạo mới — đảm bảo **không mất đơn và không bao giờ tạo trùng phiếu bên HIS**.

---

### Câu 3: Làm sao chứng minh được Nhật ký Kiểm toán (`Audit Log`) không bị sửa đổi trái phép (kể cả bởi DBA)?
> **Cách trả lời gọn, trúng bản chất:**
> Nhóm áp dụng cơ chế bảo vệ kép trong `database.js`, `auditService.js` và `auditVerifier.js`:
> 1. **Lớp 1 – Chặn trực tiếp ở CSDL (*Append-Only SQL Triggers*):** Trên bảng `audit_logs`, nhóm cài đặt 2 Trigger `trg_audit_logs_no_update` và `trg_audit_logs_no_delete` gọi `RAISE(ABORT, 'APPEND_ONLY_AUDIT_VIOLATION')`, chặn đứng mọi câu lệnh `UPDATE`/`DELETE` từ ứng dụng hay SQL client thông thường.
> 2. **Lớp 2 – Chuỗi băm mật mã liên hoàn (`HMAC-SHA256 Hash Chaining`) với Khóa Tách biệt:**
>    - Dòng đầu tiên móc nối vào `GENESIS_HASH` (`64 số 0`).
>    - Mỗi dòng thứ $i$ lưu `prev_hash = current_hash` của dòng $i-1$, và tính:
>      `current_hash = HMAC-SHA256(HMAC_AUDIT_SECRET, prev_hash | timestamp | actor_id | role | facility_id | action | target | ip | status | details)`
>    - Khóa bí mật `HMAC_AUDIT_SECRET` được lưu ở biến môi trường/Vault của tầng ứng dụng, **DBA không hề biết khóa này**.
> 3. **Chứng minh bằng thực nghiệm (`src/tests/test_audit_tamper_detection.js`):** Ngay cả khi DBA dùng quyền root gỡ tạm Trigger để sửa nội dung dòng `#1`, họ không có `HMAC_AUDIT_SECRET` để tính lại chuỗi băm hợp lệ cho dòng `#1` và tất cả các dòng phía sau. Khi chạy `AuditVerifier.verifyChainIntegrity()` (hoặc API `GET /api/audit/verify`), hệ thống phát hiện chính xác `tamperedBlockId: 1 (HMAC_SIGNATURE_MISMATCH)` chỉ trong **`0.395 ms`**, đồng thời kiểm tra cả khoảng trống `id` tăng dần để phát hiện nếu có dòng bị xóa ở giữa!

---

## PHẦN 2: BỘ CÂU HỎI VẤN ĐÁP THEO 6 CẤP ĐỘ TƯ DUY BLOOM (Mục 8 Trang 11 File Hướng dẫn)

### Cấp độ 1: Nhớ – Hiểu (*Knowledge & Comprehension*)

1. **Hỏi:** *Anti-Corruption Layer (ACL) là gì? Khác gì với việc chỉ viết một Adapter đơn giản cho từng HIS?*
   - **Đáp:** ACL là một lớp biên dịch ngữ nghĩa nằm giữa miền nghiệp vụ lõi (*Core Domain*) và hệ thống di sản bên ngoài để ngăn các khái niệm/cấu trúc dữ liệu lộn xộn bên ngoài làm "ô nhiễm" mô hình bên trong. Nếu chỉ viết *Adapter per HIS* ánh xạ thẳng vào bảng nội bộ của MediLink thì mỗi Adapter vẫn bị buộc chặt vào schema nội bộ và tự xử lý mã bệnh nhân một kiểu. Còn ACL của nhóm kết hợp thêm **Canonical Data Model chuẩn HL7 FHIR R4 (`Patient`, `Appointment`)** và bảng quy chiếu định danh xuyên chuỗi **`MPI` (`patient_his_mappings`)**, giúp tách rời hoàn toàn cả hai phía.

2. **Hỏi:** *Tactic `Bulkhead` và `Circuit Breaker` khác nhau thế nào? Thuộc nhóm Quality Attribute nào?*
   - **Đáp:** Cả hai đều thuộc nhóm **Availability (Fault Isolation / Prevent Ripple Effect)**. *Bulkhead* (vách ngăn khoang tàu) là phân tách tài nguyên/bộ điều khiển riêng cho từng đích đến để một đích bị tràn không hút cạn tài nguyên chung; còn *Circuit Breaker* (cầu dao tự động) là theo dõi số lỗi theo thời gian thực để chủ động cắt cuộc gọi sang đích đang hỏng (`OPEN`). Trong MediLink, việc tạo một thực thể `CircuitBreaker` riêng biệt cho từng `facility_id` trong `Map` của `hisDispatcher.js` chính là sự kết hợp cả hai!

---

### Cấp độ 2: Áp dụng (*Application – Chỉ vào Sơ đồ & Mã nguồn*)

3. **Hỏi:** *Chỉ vào sơ đồ Container View và mã nguồn: Ràng buộc mã hóa dữ liệu y tế nhạy cảm và phân quyền cơ sở theo Nghị định 13/2023 được hiện thực cụ thể ở đâu?*
   - **Đáp:**
     - Trên sơ đồ Component View (`diagrams/c4-component-acl.puml`), luồng đi qua `JWT Auth & Contextual ABAC Guard` rồi mới tới `EHR & Crypto Storage Service`.
     - Trong mã nguồn:
       - Kiểm tra phạm vi cơ sở (`user.facility_id !== rawRecord.facility_id`) và kiểm tra `patient_consents`: nằm tại [`src/core/auth/abacMiddleware.js`](../src/core/auth/abacMiddleware.js) dòng 52–100.
       - Mã hóa/giải mã cấp trường `AES-256-GCM` với IV 96-bit và AAD gắn theo `record.id`: nằm tại [`src/core/ehr/encryptionService.js`](../src/core/ehr/encryptionService.js) dòng 18–56.
       - Lưu tệp PDF xét nghiệm mã hóa nhị phân và ký Pre-signed URL 120s: nằm tại [`src/core/ehr/labStorageService.js`](../src/core/ehr/labStorageService.js).

4. **Hỏi:** *Hãy giải thích cách MediLink xử lý khi cùng một bệnh nhân Nguyễn Văn An đi khám ở cả Đà Nẵng, Huế và Quảng Nam mà 3 HIS dùng 3 kiểu mã bệnh nhân khác nhau?*
   - **Đáp:** Trên MediLink, bệnh nhân Nguyễn Văn An mang một mã định danh duy nhất là `MPI-2026-0001`. Trong CSDL có bảng `patient_his_mappings` ánh xạ `MPI-2026-0001` sang `pat_uuid_dn_91a2f0` (ở Đà Nẵng), `HUE-BN-00921` (ở Huế) và số nguyên `88412` (ở Quảng Nam). Khi đặt lịch, `CanonicalModelMapper.toFhirPatient()` đóng gói cả mã `MPI` lẫn mã địa phương vào mảng `Patient.identifier[]` chuẩn HL7 FHIR R4, rồi từng Adapter trích đúng mã của cơ sở mình để gửi đi.

---

### Cấp độ 3: Phân tích (*Analysis – "Nếu bỏ thành phần Y đi thì sao?"*)

5. **Hỏi:** *Nếu trong `bookingService.js`, em dời câu lệnh `lockManager.releaseLock()` xuống cuối hàm (tức là giữ khóa Redis suốt trong lúc chờ gọi HTTP sang HIS), điều gì xấu sẽ xảy ra?*
   - **Đáp:** Sẽ xảy ra 2 hậu quả nghiêm trọng (đây chính là `Sensitivity Point S-01` nhóm phát hiện ở ATAM):
     1. Nếu mạng HIS chậm `3.2 giây` trong khi `LOCK_TTL_MS = 3.0 giây`, khóa Redis tự hết hạn nhả ra khi luồng 1 chưa chạy xong, tạo kẽ hở an toàn đồng thời.
     2. Làm tăng thời gian giữ khóa gấp hàng trăm lần (từ `3 ms` lên `1.500 ms`). Giải phóng khóa ngay sau khi CSDL đã commit `status = 'BOOKED'` và `UNIQUE(active_slot_key)` hoàn toàn an toàn vì bất kỳ luồng nào vào sau đều thấy ngay slot đã `BOOKED` trong `< 1 ms`!

6. **Hỏi:** *Nếu bỏ `Random Jitter` trong `OutboxSyncWorker` (`src/worker/backgroundWorker.js` dòng 43), kịch bản nào sẽ gặp rủi ro?*
   - **Đáp:** Kịch bản **`ASR-02` lúc HIS Huế vừa khôi phục sau 2 giờ sập** sẽ gặp rủi ro *Thundering Herd*: toàn bộ các bản ghi tồn đọng trong `outbox_events` (hoặc nhiều worker cùng thức dậy đúng một nhịp đồng hồ) sẽ bắn dồn dập các gói tin SOAP XML nặng nề vào máy chủ HIS Huế vừa mới khởi động xong, khiến CPU/DB của HIS Huế nghẽn cứng và sập trở lại làm `CircuitBreaker` nhảy về `OPEN` liên tục (*flapping*).

---

### Cấp độ 4: Đánh giá (*Evaluation – Biện luận Trade-off*)

7. **Hỏi:** *Vì sao nhóm không vẽ mỗi HIS (Đà Nẵng, Huế, Quảng Nam) thành một Microservice riêng biệt? Chẳng phải tách riêng từng container HIS Adapter sẽ cô lập lỗi tốt hơn sao?*
   - **Đáp:** Đây là điểm nhóm đã cân nhắc rất kỹ trong `ADR-001` (và cũng là lỗi thường gặp được cảnh báo trong tài liệu hướng dẫn!). Với lưu lượng ~2.000 lịch hẹn/ngày (~0.04 req/s trung bình), các HIS Adapters thực chất chỉ làm nhiệm vụ chuyển đổi JSON/XML nhẹ nhàng và chờ I/O mạng không đồng bộ trên Event Loop của Node.js. Việc bọc từng Adapter bằng **`CircuitBreaker` riêng + `AbortSignal.timeout(1500ms)`** đã cô lập hoàn toàn lỗi mạng mà không tốn thêm 3–4 containers trung gian, không tốn thêm một chặng nhảy mạng nội bộ (*network hop*), và giảm một nửa gánh nặng cấu hình vận hành cho đội 4 người. Chỉ khi một Adapter cần nhúng thư viện native C++/COM cũ kỹ dễ gây crash cả tiến trình OS thì mới đáng tách thành tiến trình riêng.

8. **Hỏi:** *Vì sao nhóm chọn lưu tệp PDF xét nghiệm ở Object Storage kèm Pre-signed URL (`ADR-006`) thay vì trả thẳng luồng file qua endpoint đọc bệnh án hoặc lưu `BLOB` trong SQLite?*
   - **Đáp:** Lưu `BLOB` hàng chục MB làm phình trang nhớ của SQLite/RDBMS, làm chậm toàn bộ các truy vấn đặt lịch và tra cứu tóm tắt bệnh án (`QAS-06` bị ảnh hưởng). Đánh đổi mà nhóm chấp nhận khi tách sang Object Storage là mất tính giao dịch ACID gộp chung giữa file và dòng DB (có thể sinh file mồ côi nếu lỗi giữa chừng), nhưng khắc phục rất dễ bằng quy trình ghi file trước – ghi DB sau kèm job dọn rác định kỳ.

---

### Cấp độ 5: Sáng tạo (*Creation – Thay đổi yêu cầu đột xuất ngay tại bàn vấn đáp!*)

9. **Hỏi (Tình huống mở rộng 10x):** *Giả sử năm sau chuỗi MediLink mở rộng lên 120 phòng khám toàn quốc, tải giờ cao điểm tăng gấp 10 lần (500 người tranh slot, 2.000 người xem lịch/giây) và triển khai 4 instances `medilink-core` chạy song song sau Load Balancer. Kiến trúc hiện tại của nhóm có chỗ nào vỡ không và phải sửa đúng những đâu?*
   - **Đáp:** Nhóm nắm rất rõ **3 điểm trong Prototype hiện tại sẽ cần nâng cấp** khi chạy 4 instances `medilink-core` với tải 10x:
     1. **`SlotReadCache` và `TokenBucketRateLimiter` hiện đang lưu trên `Map` cục bộ của từng tiến trình:** Khi có 4 instances, instance 1 tạo booking xóa cache của nó nhưng instance 2 vẫn giữ cache cũ tới 15 giây! → *Cách nâng cấp:* Đẩy cả bộ đếm Rate Limit và Slot Cache (hoặc phát sự kiện `PUBLISH cache:invalidate:slots`) lên chung cụm **`medilink-redis`** đã có sẵn.
     2. **SQLite WAL chỉ tối ưu cho 1 Host dùng chung Volume:** Khi 4 instances nằm trên nhiều máy chủ vật lý khác nhau, cần thay lớp `database.js` sang **PostgreSQL 16 (1 Primary cho ghi + Read Replicas cho đọc)** — toàn bộ logic SQL `UNIQUE` và `BEFORE UPDATE/DELETE Trigger` chuyển sang PostgreSQL giữ nguyên 100% nguyên lý!
     3. **Trạng thái `CircuitBreaker`:** Chuyển bộ đếm lỗi của `CircuitBreaker` lên Redis dùng chung để khi instance 1 phát hiện HIS Huế sập thì cả 3 instances còn lại cũng biết ngay mạch Huế đã `OPEN` mà không cần tự đâm đầu thử lại thêm 3 lần nữa!

10. **Hỏi (Thêm yêu cầu nghiệp vụ mới):** *Nếu Bộ Y tế bổ sung quy định mới: "Trong tình huống cấp cứu tính mạng (Emergency Break-Glass), bác sĩ cấp cứu tại Đà Nẵng được phép mở bệnh án dị ứng thuốc tại Huế ngay cả khi bệnh nhân đang hôn mê chưa kịp bấm cấp Consent trên điện thoại" — kiến trúc của nhóm sửa ở đâu?*
    - **Đáp:** Không cần sửa lại kiến trúc tổng thể! Chỉ cần cập nhật chính sách tại 2 điểm đã thiết kế sẵn:
      1. Tại `abacMiddleware.js` (Policy 3 cho `DOCTOR`): Bổ sung nhánh kiểm tra cờ `X-Emergency-Break-Glass: true` kèm mã ca cấp cứu (`emergency_encounter_id`) và lý do lâm sàng bắt buộc.
      2. Tại `auditService.js`: Ghi bản ghi mức độ nghiêm trọng cao `EMERGENCY_BREAK_GLASS_ACCESS` vào chuỗi băm HMAC và đẩy ngay 1 job cảnh báo tức thời vào `notification_jobs` gửi tới Giám đốc Y khoa + gửi SMS thông báo minh bạch cho người nhà/bệnh nhân để hậu kiểm 100% chống lạm dụng!

---

### Cấp độ 6: Mã nguồn & Tính trung thực (*Code & Academic Integrity*)

11. **Hỏi:** *Mở tệp `src/core/booking/lockManager.js`: đoạn Lua Script `LUA_ATOMIC_RELEASE` ở dòng 12 làm nhiệm vụ gì? Vì sao không dùng lệnh `DEL lockKey` bình thường?*
    - **Đáp:**
      ```lua
      if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end
      ```
      Nếu chỉ gọi `DEL lockKey` mù quáng: giả sử Request A giữ khóa nhưng bị khựng quá 3 giây làm khóa hết hạn, Request B nhảy vào giữ khóa mới mang giá trị `reqB:42`; đúng lúc đó Request A tỉnh lại và gọi `DEL lockKey` thì **Request A sẽ xóa nhầm khóa hợp lệ của Request B**! Đoạn Lua Script chạy đơn luồng nguyên tử bên trong Redis đảm bảo: *chỉ xóa khóa nếu giá trị hiện tại vẫn đúng là `ownerId:fencingToken` của chính mình*.

12. **Hỏi:** *Trong quá trình dùng AI hỗ trợ sinh code hoặc thiết kế, có điểm nào AI đề xuất sai hoặc nguy hiểm mà nhóm đã phát hiện và sửa lại không?*
    - **Đáp:** Có 3 điểm rất rõ ràng đã được nhóm ghi trung thực trong `ai-log.md`:
      1. AI gợi ý kiểm tra ABAC bằng `req.user.facility_id === req.query.facility_id` — nhóm bác bỏ ngay vì client có thể truyền giả `facility_id` trên URL, sửa thành truy vấn trực tiếp `rawRecord.facility_id` từ CSDL.
      2. Ở bản đầu tiên, AI giữ khóa trong suốt lúc `await hisDispatcher.syncAppointment()` và chỉ dùng `new Map()` giả làm DB/Redis — nhóm đã viết lại hoàn toàn bằng CSDL thật `node:sqlite` có `UNIQUE` + Trigger, bổ sung `RedisRespClient` thật kèm `Fencing Token` và nhả khóa ngay trước khi gọi mạng ngoài.
      3. Trong `httpApp.js`, code đọc body ban đầu chỉ kiểm tra `contentType.includes('application/json')` khiến gói tin chuẩn y tế `application/fhir+json` của HIS thứ 4 không được parse — nhóm đã phát hiện khi chạy `Test 5` thực tế và sửa lại chuẩn theo RFC 6839 (`+json`).
