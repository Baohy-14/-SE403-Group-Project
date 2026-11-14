# Bộ Câu Hỏi và Đáp Án Luyện Vấn Đáp Kiến Trúc (MediLink)

Tài liệu này được biên soạn để chuẩn bị cho buổi vấn đáp tốt nghiệp đồ án M5 của nhóm 4 thành viên: **Nguyễn Đức Bảo Hy, Lê Viết Nghĩa, Trần Tiến Danh, Nguyễn Quang Trường**. Mọi thành viên đều phải hiểu rõ và tự trả lời được toàn bộ các câu hỏi dưới đây mà không cần nhìn tài liệu.

---

## PHẦN 1: CÁC CÂU HỎI BẮT BUỘC RIÊNG CỦA ĐỀ TÀI 1 (MEDILINK)

### Câu 1: Vì sao chỉ dùng UNIQUE CONSTRAINT trong Database có thể chưa đủ khi hệ thống có nhiều instance và có cache?
> **Đáp án chuẩn của nhóm:**
> - Nếu chỉ dựa vào ràng buộc `UNIQUE(doctor_id, slot_time)` tại cơ sở dữ liệu quan hệ, khi có 50 request cùng ập vào một lúc, tất cả 50 request này đều đi qua tầng logic ứng dụng, chiếm dụng 50 kết nối cơ sở dữ liệu (Database Connection Pool) và bắt CPU của máy chủ DB phải xử lý 50 câu lệnh `INSERT` đồng thời. 49 request thất bại sẽ bị ném ngoại lệ vi phạm khóa chính, gây lãng phí nghiêm trọng tài nguyên và có nguy cơ làm nghẽn kết nối của toàn bộ hệ thống (Connection Pool Exhaustion).
> - Ngoài ra, nếu hệ thống có bộ đệm (Cache) hoặc cần đồng bộ trạng thái hai chiều sang máy chủ HIS bên ngoài trước khi commit, việc không có cơ chế khóa phân tán ở tầng trên sẽ dẫn tới tình trạng dữ liệu trong cache bị sai lệch (Cache Invalidation Race Condition) hoặc các Adapter bên ngoài nhận được nhiều lệnh giữ chỗ trùng nhau trước khi database báo lỗi.
> - **Giải pháp của MediLink:** Áp dụng mô hình **Kiểm soát Đa tầng**:
>   1. *Tầng 1 (In-Memory Distributed Lock với Redis):* Chặn đứng 49 request đến sau ngay tại bộ nhớ trong chỉ trong 1-2ms, giải phóng kết nối tức thì (Fast-Fail với mã 409 Conflict).
>   2. *Tầng 2 (RDBMS Unique Constraint):* Đóng vai trò là chốt chặn phòng thủ cuối cùng (Last-mile Defense), đảm bảo tính toàn vẹn dữ liệu tuyệt đối dù Redis có gặp sự cố hy hữu.

---

### Câu 2: Khi HIS bên ngoài trả về lỗi Timeout, hệ thống MediLink làm gì với lịch hẹn đang chờ xác nhận?
> **Đáp án chuẩn của nhóm:**
> - MediLink áp dụng mẫu thiết kế **Circuit Breaker kết hợp Transactional Outbox và Graceful Degradation**:
>   1. Lịch hẹn của bệnh nhân vẫn được tạo và lưu vào cơ sở dữ liệu MediLink với trạng thái `status: 'CONFIRMED'` và cờ đồng bộ `his_sync_status: 'OUTBOX_QUEUED'`.
>   2. Bệnh nhân nhận được phản hồi thành công kèm mã đặt lịch nội bộ của MediLink và thông báo rõ ràng: *"Lịch khám của bạn đã được hệ thống giữ chỗ thành công. Mã tiếp đón tại phòng khám đang được xử lý và sẽ gửi qua tin nhắn cho bạn."*
>   3. Bộ đếm lỗi của Circuit Breaker tương ứng với cơ sở đó tăng lên. Nếu lỗi tiếp diễn quá 3 lần, Circuit Breaker chuyển sang trạng thái **OPEN** để ngừng gọi sang HIS đó, tránh việc tiếp tục làm nghẽn tài nguyên luồng.
>   4. Tiến trình nền `OutboxDispatcherWorker` sẽ lưu lịch hẹn vào hàng đợi ngoại tuyến, tự động thử lại với độ lùi lũy thừa (Exponential Backoff with Jitter) khi Circuit Breaker chuyển sang trạng thái **HALF-OPEN** (thăm dò kết nối phục hồi).
>   5. Khi HIS online trở lại, lịch hẹn được đồng bộ tự động xuống HIS cơ sở mà không làm mất mát dữ liệu hoặc đòi hỏi bệnh nhân phải thao tác lại.

---

### Câu 3: Làm sao chứng minh được Nhật ký Kiểm toán (Audit Log) không bị sửa đổi trái phép bởi chính Quản trị viên Cơ sở dữ liệu (DBA)?
> **Đáp án chuẩn của nhóm:**
> - MediLink áp dụng kỹ thuật **Chuỗi băm Mật mã Liên hoàn (HMAC-SHA256 Cryptographic Hash Chaining)** tương tự cấu trúc Blockchain:
>   1. Bảng `audit_logs` được cấu hình chỉ cho phép thêm mới (Append-Only), không cung cấp bất kỳ API cập nhật hoặc xóa nào.
>   2. Mỗi bản ghi log thứ $i$ chứa con trỏ `prev_hash` trỏ về `current_hash` của bản ghi liền trước $i-1$.
>   3. Trường `current_hash` được tính toán bằng hàm:
>      $$\text{current\_hash}_i = \text{HMAC-SHA256}(\text{HMAC\_SECRET\_KEY}, \text{prev\_hash}_i + \text{timestamp} + \text{actor} + \text{action} + \text{target} + \text{status} + \text{details})$$
>   4. Khóa bí mật `HMAC_SECRET_KEY` được lưu tách biệt khỏi máy chủ cơ sở dữ liệu (lưu trong biến môi trường bảo mật của máy chủ ứng dụng hoặc Secret Vault), DBA không có quyền truy cập khóa này.
>   5. Tiến trình nền `AuditIntegrityVerifier` định kỳ kiểm tra toàn bộ chuỗi từ bản ghi Genesis ($i=1$) đến bản ghi mới nhất. Nếu DBA dùng quyền root chạy câu lệnh SQL `UPDATE audit_logs SET details = '...' WHERE id = 1` để xóa dấu vết, con trỏ băm sẽ bị đứt gãy ngay tại mắt xích đó vì $\text{HMAC}(\text{nội dung mới}) \neq \text{current\_hash cũ}$.
>   6. Nhóm đã chứng minh thực nghiệm thành công qua Test 4 (`test_audit_tamper_detection.js`): hệ thống phát hiện chính xác bản ghi bị can thiệp chỉ trong < 2ms!

---

## PHẦN 2: BỘ CÂU HỎI THEO 6 CẤP ĐỘ BLOOM (ÁP DỤNG CHO 4 THÀNH VIÊN)

### 1. Cấp độ 1: Nhớ – Hiểu (Knowledge & Comprehension)
- **Câu hỏi:** *Tactic "Circuit Breaker" là gì? Nó thuộc nhóm thuộc tính chất lượng (QA) nào?*
  - **Trả lời:** Circuit Breaker là một tactic thuộc nhóm **Availability & Fault Tolerance**. Nó hoạt động giống như một chiếc aptomat điện: theo dõi tỷ lệ lỗi của dịch vụ bên ngoài; khi lỗi vượt ngưỡng cho phép, nó tự động "ngắt mạch" (chuyển sang trạng thái OPEN) để từ chối các cuộc gọi tiếp theo ngay lập tức (Fast-Fail), ngăn ngừa việc các cuộc gọi bị treo làm cạn kiệt luồng (Thread Starvation) và gây sập dây chuyền toàn bộ hệ thống.

### 2. Cấp độ 2: Áp dụng (Application)
- **Câu hỏi:** *Chỉ vào sơ đồ Container View và Component View: Tactic Anti-Corruption Layer (ACL) và Adapter được hiện thực ở những tệp tin nào trong mã nguồn?*
  - **Trả lời:** 
    - Trên sơ đồ Component View, ACL nằm tại khối `Anti-Corruption Layer (HIS Integration Engine)`.
    - Trong mã nguồn, nó được hiện thực tại thư mục `src/core/acl/`:
      - `canonicalModel.js`: Chuyển đổi dữ liệu sang mô hình chuẩn HL7 FHIR Release 4.
      - `hisDispatcher.js`: Bộ điều phối trung tâm.
      - `circuitBreaker.js`: Bộ ngắt mạch bảo vệ từng cơ sở.
      - `src/core/acl/adapters/`: Các adapter chuyển đổi cụ thể (`daNangJsonAdapter.js`, `hueXmlAdapter.js`, `quangNamCustomAdapter.js`).

### 3. Cấp độ 3: Phân tích (Analysis)
- **Câu hỏi:** *Nếu loại bỏ thành phần Redis Lock Engine trong kiến trúc MediLink, kịch bản nào sẽ thất bại và thất bại như thế nào?*
  - **Trả lời:**
    - Kịch bản **ASR-01 (Chống double-booking khi 50 người cùng đặt 1 slot)** sẽ bị ảnh hưởng nghiêm trọng.
    - *Cơ chế thất bại:* Khi 50 người cùng bấm đặt lịch, thay vì 49 người bị từ chối tức thì tại bộ nhớ trong Redis với thời gian < 10ms, toàn bộ 50 request sẽ tràn thẳng xuống cơ sở dữ liệu quan hệ. Database Connection Pool sẽ bị bão hòa, thời gian phản hồi p95 sẽ vọt lên nhiều giây (vi phạm chỉ số < 800ms). Nếu hệ thống triển khai cụm nhiều instance phía sau Load Balancer, các luồng đọc trạng thái slot trước khi ghi sẽ xảy ra hiện tượng đọc bẩn (dirty read), làm tăng nguy cơ xảy ra race condition.

### 4. Cấp độ 4: Đánh giá (Evaluation)
- **Câu hỏi:** *Vì sao nhóm lựa chọn kiến trúc Modular Monolith thay vì Microservices thuần túy? Nhóm đã chấp nhận trade-off (đánh đổi) điều gì?*
  - **Trả lời:**
    - *Lý do lựa chọn:* Dự án được thực hiện bởi nhóm 4 kỹ sư trong 15 tuần. Microservices đòi hỏi chi phí vận hành hạ tầng rất lớn (Kubernetes, Service Mesh, Distributed Tracing) và đặc biệt là bài toán giao dịch phân tán (Saga/2PC) giữa các service rất khó đảm bảo tính nhất quán tức thời cho việc chống double-booking. Modular Monolith giúp giữ tính nhất quán mạnh, gọi hàm trong bộ nhớ (in-process) với độ trễ siêu thấp (< 2ms), dễ kiểm thử và triển khai bằng 1 lệnh `docker compose up`.
    - *Trade-off nhóm chấp nhận:* Đánh đổi **khả năng mở rộng độc lập ở mức tiến trình OS (Process-level Scalability)** để lấy **tính nhất quán dữ liệu (Strict Consistency), độ trễ thấp (Low Latency) và chi phí vận hành tối ưu (Operational Simplicity)**. Ranh giới giữa các module được phân định nghiêm ngặt qua interface, sẵn sàng trích xuất thành Microservice khi chuỗi mở rộng lên 50 phòng khám.

### 5. Cấp độ 5: Sáng tạo (Creation)
- **Câu hỏi:** *Nếu trong tương lai, Bộ Y tế yêu cầu kết nối MediLink với Cổng Dữ liệu Sức khỏe Quốc gia phục vụ 1 triệu người dân và lưu lượng tăng gấp 10 lần, kiến trúc của nhóm cần thay đổi những gì?*
  - **Trả lời:**
    1. Trích xuất mô-đun `Booking & Scheduling` và `ACL Integration` thành các Microservices độc lập để scale-out theo số lượng replica phía sau Load Balancer.
    2. Nâng cấp cụm Redis In-Memory đơn lẻ lên mô hình **Redis Cluster với Sharding** theo `doctor_id` để chia tải khóa phân tán.
    3. Chuyển đổi hàng đợi tin nhắn BullMQ sang cụm **Apache Kafka** phân vùng theo tỉnh thành (Đà Nẵng, Huế, Quảng Nam) để xử lý hàng chục nghìn thông điệp mỗi giây.
    4. Tận dụng lớp `CanonicalModelMapper` (đã được nhóm chuẩn hóa sẵn theo chuẩn **HL7 FHIR R4**) để liên thông trực tiếp với Cổng Bộ Y tế mà không cần thiết kế lại mô hình dữ liệu.

### 6. Cấp độ 6: Mã nguồn & Trung thực (Code & Integrity)
- **Câu hỏi:** *Đoạn code trong tệp `src/core/auth/abacMiddleware.js` do ai viết? Hoạt động như thế nào? Em đã kiểm tra và điều chỉnh gì so với gợi ý ban đầu của AI?*
  - **Trả lời:**
    - Đoạn code này do **Lê Viết Nghĩa** và **Nguyễn Đức Bảo Hy** phụ trách.
    - *Cơ chế hoạt động:* Middleware trích xuất thông tin người dùng từ Token (`req.user`), sau đó truy vấn đối tượng bệnh án mục tiêu. Nếu người dùng có vai trò `RECEPTIONIST`, middleware đối chiếu `user.facility_id` với `record.facility_id`. Nếu khác nhau (ví dụ: lễ tân Đà Nẵng xem hồ sơ Huế), middleware chặn đứng ngay lập tức với mã HTTP 403 Forbidden và kích hoạt `auditService.logSecurityEvent()` để ghi nhận hành vi vi phạm an ninh vào chuỗi băm HMAC.
    - *Phần đã chỉnh sửa so với AI:* Ban đầu AI gợi ý chỉ kiểm tra `user.facility_id === req.body.facility_id` (lấy từ dữ liệu gửi lên của client). Nhóm đã nhận ra lỗ hổng bảo mật nghiêm trọng (kẻ tấn công có thể sửa client payload) và đã sửa lại thành việc bắt buộc truy vấn trực tiếp thuộc tính `facility_id` của bản ghi lưu trong cơ sở dữ liệu (`record.facility_id`) để đối chiếu, bảo đảm an toàn tuyệt đối.
