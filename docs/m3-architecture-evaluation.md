# M3 – Architecture Evaluation & Architecture Design v2: Nền tảng MediLink

## 1. Phương pháp Đánh giá Kiến trúc (Lightweight ATAM)

Nhóm thực hiện đánh giá kiến trúc theo phương pháp **ATAM rút gọn (Lightweight Architecture Tradeoff Analysis Method)** của Viện Kỹ nghệ Phần mềm SEI (Carnegie Mellon University). 
Mục tiêu của phiên ATAM là kiểm tra xem bản thiết kế kiến trúc v1 (M2) có đáp ứng được các yêu cầu thuộc tính chất lượng then chốt hay không, đồng thời phát hiện sớm các điểm nhạy cảm (*Sensitivity Points*), điểm đánh đổi (*Trade-off Points*), rủi ro kiến trúc (*Risks*) và các điểm an toàn (*Non-risks*).

---

## 2. Phân tích Chi tiết 3 Kịch bản Ưu tiên cao nhất (ASR)

---

### 2.1. Đánh giá ASR-01: Chống Đặt trùng lịch (Consistency & Concurrency)

- **Kịch bản:** 50 bệnh nhân đồng thời bấm đặt cùng 1 slot khám (Bác sĩ Nguyễn Văn A, 08:00 sáng). Yêu cầu: Đúng 1 người thành công, 49 người nhận 409 Conflict, p95 < 800ms.
- **Cách kiến trúc đáp ứng:**
  1. Yêu cầu đi qua API Gateway với Header `X-Idempotency-Key`.
  2. Booking Core Service gửi lệnh nguyên tử `SET lock:slot:101:0800 NX PX 3000` lên cụm Redis.
  3. Chỉ duy nhất request đầu tiên giành được khóa In-memory (thời gian xử lý ~1-2ms).
  4. 49 request còn lại nhận `NULL` từ Redis, lập tức trả về mã HTTP 409 Conflict (Fast-fail mà không chạm vào Database).
  5. Request thành công thực hiện lưu vào Database chính với ràng buộc duy nhất `UNIQUE(doctor_id, slot_time)`, đồng bộ sang HIS cơ sở và giải phóng khóa.
- **Phân tích thuộc tính:**
  - **Sensitivity Point (S-01):** Thời gian sống của khóa (Lock TTL) trong Redis. Nếu đặt TTL quá ngắn (< 500ms), lock có thể tự giải phóng trước khi giao dịch DB hoàn tất; nếu đặt quá dài (> 10s), nếu server bị crash thì slot sẽ bị phong tỏa quá lâu khiến người khác không đặt được.
  - **Trade-off Point (T-01):** Đánh đổi giữa **Strict Consistency** và **Latency của request đến sau**. Việc áp dụng Distributed Lock đảm bảo tính nhất quán tuyệt đối (0% double-booking) nhưng buộc các request đến sau phải chờ hoặc bị từ chối, làm giảm tỷ lệ chấp nhận tức thời.
  - **Risk (R-01):** Nếu máy chủ Redis duy nhất bị treo hoặc khởi động lại đúng thời điểm cao điểm, toàn bộ cơ chế lock phân tán sẽ bị vô hiệu hóa, khiến các request tràn thẳng xuống Database gây nghẽn kết nối.
  - **Non-risk (N-01):** Ràng buộc `UNIQUE` ở tầng cơ sở dữ liệu quan hệ luôn đảm bảo tính toàn vẹn dữ liệu cuối cùng, không thể xảy ra trường hợp ghi 2 dòng dữ liệu trùng lặp trong database dù Redis có gặp sự cố.

---

### 2.2. Đánh giá ASR-02: Cách ly Sự cố khi HIS Cơ sở ngừng hoạt động (Availability & Fault Tolerance)

- **Kịch bản:** Hệ thống HIS của cơ sở Huế bị sập hoặc mất kết nối mạng liên tục trong 2 giờ vào giờ hành chính. Yêu cầu: 11 cơ sở còn lại vẫn đặt lịch 100%, toàn hệ thống duy trì Availability ≥ 99.5%.
- **Cách kiến trúc đáp ứng:**
  1. Mọi cuộc gọi từ MediLink Core sang HIS Huế đều đi qua `HueHisXmlAdapter` được bọc bởi `CircuitBreaker`.
  2. Cấu hình Timeout Budget = 2.5 giây. Nếu quá 2.5s không nhận được phản hồi, cuộc gọi được tính là lỗi.
  3. Khi tỷ lệ lỗi vượt quá 50% trong cửa sổ trượt 10 giây (Rolling Window), Circuit Breaker chuyển trạng thái sang **OPEN**.
  4. Khi mạch OPEN, 100% các yêu cầu liên quan đến cơ sở Huế được trả về ngay lập tức với thông báo trạng thái tạm ngưng (thời gian phản hồi < 10ms, không treo luồng).
  5. Các yêu cầu đặt lịch tại cơ sở Đà Nẵng và Quảng Nam được xử lý bởi các Adapter và Circuit Breaker hoàn toàn độc lập, tài nguyên kết nối không bị chiếm dụng.
- **Phân tích thuộc tính:**
  - **Sensitivity Point (S-02):** Ngưỡng chuyển mạch (Error Threshold) và thời gian ngủ chờ hồi phục (Sleep Window) của Circuit Breaker.
  - **Trade-off Point (T-02):** Đánh đổi giữa **Availability** và **Data Freshness / Consistency**. Khi cách ly sự cố, hệ thống giữ được độ sẵn sàng phục vụ người dùng nhưng chấp nhận dữ liệu lịch tại cơ sở Huế bị trễ (Eventual Consistency) và phải chờ đồng bộ sau.
  - **Risk (R-02):** Khi HIS Huế phục hồi sau 2 giờ, nếu hàng trăm lịch hẹn tích lũy trong thời gian offline đồng loạt được bắn sang HIS Huế cùng lúc, có thể gây ra hiện tượng *Thundering Herd* làm HIS Huế vừa sống lại đã bị sập tiếp.
  - **Non-risk (N-02):** Mô hình đa Adapter cô lập hoàn toàn tài nguyên xử lý theo từng cơ sở (Bulkhead pattern), đảm bảo lỗi tại Huế không thể lây lan sang Đà Nẵng hay Quảng Nam.

---

### 2.3. Đánh giá ASR-03: Ngăn chặn Truy cập Trái phép Hồ sơ Y tế (Security & Privacy)

- **Kịch bản:** Lễ tân cơ sở Đà Nẵng cố tình gửi request xem kết quả xét nghiệm của bệnh nhân đang điều trị tại cơ sở Huế. Yêu cầu: Trả về HTTP 403 Forbidden, dữ liệu rò rỉ 0%, ghi audit log có mã băm HMAC < 10ms.
- **Cách kiến trúc đáp ứng:**
  1. API Gateway xác thực tính hợp lệ của JWT Token và giải mã các claims (`user_id`, `role: RECEPTIONIST`, `facility_id: FAC_DANANG`).
  2. `Security & ABAC Middleware` chặn request trước khi vào Controller, truy vấn thuộc tính cơ sở của hồ sơ bệnh án mục tiêu (`target.facility_id: FAC_HUE`).
  3. Bộ thẩm định chính sách phát hiện vi phạm ranh giới: `FAC_DANANG != FAC_HUE`.
  4. Lệnh truy cập bị hủy bỏ tức thì, trả về HTTP 403 Forbidden.
  5. Đồng thời gửi thông điệp sự kiện bảo mật sang `AuditService` để tính mã băm HMAC-SHA256 liên hoàn và ghi vào bảng `audit_logs`.
- **Phân tích thuộc tính:**
  - **Sensitivity Point (S-03):** Độ an toàn và cơ chế bảo mật của khóa bí mật `HMAC_SECRET_KEY` dùng để tạo chữ ký băm chuỗi kiểm toán.
  - **Trade-off Point (T-03):** Đánh đổi giữa **Security Strictness** và **Latency**. Việc kiểm tra chính sách ABAC và tính toán mã băm HMAC làm tăng thêm khoảng 5-8ms cho mỗi request truy cập dữ liệu nhạy cảm.
  - **Risk (R-03):** Nếu quản trị viên ứng dụng có quyền cấu hình lại policy hoặc tắt bỏ middleware thì cơ chế ABAC có thể bị vô hiệu hóa mà không để lại cảnh báo tức thời.
  - **Non-risk (N-03):** Kiến trúc phân lớp phòng thủ nhiều tầng (Defense-in-Depth): Token được ký số RSA/ECDSA, kiểm tra ABAC tại Middleware tầng ứng dụng và kiểm tra quyền tại tầng dữ liệu, ngăn ngừa hoàn toàn nguy cơ rò rỉ dữ liệu ngoài ý muốn.

---

## 3. Báo cáo Phản biện Kiến trúc (Peer Review Feedback)

Nhóm đã tổ chức buổi báo cáo và phản biện kiến trúc chéo với Nhóm bạn (Nhóm Đề tài 2 - ShopHub). Dưới đây là các câu hỏi phản biện then chốt và cách xử lý của nhóm:

| Bên phản biện | Câu hỏi phản biện chất vấn | Phân tích của nhóm & Hướng xử lý |
|:---|:---|:---|
| **Nhóm ShopHub** | *"Nếu 100 người dùng cùng refresh liên tục một khung giờ để canh săn lịch khám của một giáo sư nổi tiếng, việc gọi Redis Lock liên tục có làm nghẽn Redis không?"* | **Ghi nhận rủi ro:** Bản thiết kế v1 chưa có bộ đệm giới hạn tốc độ (Rate Limiter) tại API Gateway cho từng IP/User. Nếu bị spam F5, Redis sẽ phải chịu tải vô ích. Nhóm sẽ bổ sung thuật toán **Token Bucket Rate Limiting** tại Gateway trong phiên bản v2. |
| **Nhóm ShopHub** | *"Trong kịch bản HIS Huế sập 2 giờ, khi HIS Huế bật lại, làm sao đảm bảo các lịch hẹn đã nhận trong thời gian offline được đồng bộ xuống mà không bị ghi đè hoặc trùng lặp?"* | **Ghi nhận rủi ro:** Cần bổ sung cơ chế **Transactional Outbox Pattern** với thuật toán điều tiết tốc độ (Rate-controlled sync) và độ lùi lũy thừa kèm jitter để tránh hiện tượng dồn ứ làm sập HIS Huế khi vừa hồi sinh. |
| **Giảng viên hướng dẫn** | *"Làm sao chứng minh được một bản ghi trong Audit Log không bị sửa lén bởi một DBA có toàn quyền truy cập cơ sở dữ liệu?"* | **Ghi nhận rủi ro:** Bản thiết kế v1 đã có chuỗi băm HMAC nhưng chưa có quy trình kiểm tra toàn vẹn tự động định kỳ (Integrity Verification Worker) và chưa công bố public hash checkpoint. |

---

## 4. Cải tiến Thiết kế Kiến trúc lên Phiên bản v2 (Architecture Design v2)

Để giải quyết triệt để 3 rủi ro (Risks) nghiêm trọng nhất được phát hiện qua phiên ATAM và phản biện, nhóm tiến hành nâng cấp thiết kế kiến trúc lên **Architecture Design v2**:

```
Bản thiết kế Kiến trúc v1 (M2) 
      |
      +---> [Risk R-01: Quá tải tranh chấp / Spam request]
      |        ===> BỔ SUNG: Token Bucket Rate Limiting tại Ingress Proxy Gateway.
      |
      +---> [Risk R-02: Thundering Herd khi HIS phục hồi]
      |        ===> BỔ SUNG: Rate-Controlled Outbox Worker với Exponential Backoff & Jitter.
      |
      +---> [Risk R-03: Kiểm toán bị sửa lén trong DB]
      |        ===> BỔ SUNG: Periodic Audit Integrity Verifier & Genesis Hash Anchor.
      v
Bản thiết kế Kiến trúc Hoàn thiện v2 (M3 -> Triển khai Prototype M4)
```

### 4.1. Cải tiến 1: Tích hợp Token Bucket Rate Limiting tại Gateway (Xử lý Risk R-01)
- **Thiết kế mới:** Tại tầng API Gateway (Nginx / Express Gateway), áp dụng thuật toán **Token Bucket Rate Limiter**:
  - Đối với endpoint tạo lịch hẹn `/api/bookings`: Giới hạn tối đa **10 requests / phút** cho mỗi địa chỉ IP và tài khoản bệnh nhân.
  - Nếu vượt ngưỡng, hệ thống trả về mã **HTTP 429 Too Many Requests** ngay tại Gateway trong < 1ms, chặn đứng 100% các cuộc tấn công spam F5 hoặc brute-force trước khi gói tin chạm tới Redis Lock Engine.

### 4.2. Cải tiến 2: Bổ sung Transactional Outbox & Rate-Controlled Sync (Xử lý Risk R-02)
- **Thiết kế mới:** Khi Circuit Breaker của cơ sở Huế ở trạng thái OPEN:
  - Lịch hẹn vẫn được ghi vào cơ sở dữ liệu MediLink với trạng thái `SYNC_STATUS = 'PENDING_OUTBOX'`.
  - Một tiến trình nền `OutboxDispatcherWorker` giám sát trạng thái Circuit Breaker qua sự kiện Half-Open.
  - Khi Circuit Breaker chuyển sang Half-Open (cho phép thăm dò kết nối), Worker gửi lần lượt từng đợt nhỏ (Batch size = 5 requests/giây) kèm cơ chế ngẫu nhiên hóa độ trễ (Jitter). Nếu 3 đợt thành công liên tiếp, Circuit Breaker mới đóng hoàn toàn (CLOSED) và tốc độ đồng bộ được tăng dần, bảo vệ HIS Huế không bao giờ bị quá tải đột ngột.

### 4.3. Cải tiến 3: Tiến trình Giám sát Toàn vẹn Kiểm toán Tự động (Xử lý Risk R-03)
- **Thiết kế mới:**
  - Bổ sung một mô-đun nền độc lập: `AuditIntegrityVerifier`.
  - Định kỳ mỗi 30 phút (hoặc khi có yêu cầu thanh tra), tiến trình chạy thuật toán duyệt đệ quy toàn bộ chuỗi băm từ `id = 1` đến bản ghi mới nhất.
  - Tại mỗi mắt xích $i$, tính toán lại:
    $$\text{recomputed\_hash} = \text{HMAC-SHA256}(\text{SECRET}, \text{prev\_hash}_{i-1} + \text{data}_i)$$
    Nếu $\text{recomputed\_hash} \neq \text{current\_hash}_i$, hệ thống lập tức khóa quyền truy cập của tài khoản quản trị bị nghi vấn và phát chuông cảnh báo vi phạm bảo mật cấp độ cao nhất (Severity 1).

---

## 5. Tự kiểm tra Mốc M3

### 5.1. Phân biệt Sensitivity Point và Trade-off Point bằng ví dụ trong chính thiết kế của MediLink:
> **Trả lời:**
> 1. **Sensitivity Point (Điểm nhạy cảm):** Là một thông số kiến trúc hoặc thuộc tính thành phần mà nếu **thay đổi nhỏ** giá trị của nó sẽ dẫn đến sự **thay đổi rất lớn** về một thuộc tính chất lượng cụ thể.
>    - *Ví dụ thực tế trong MediLink:* Thông số **TTL của Redis Lock** (thời gian giữ khóa phân tán). Nếu đặt TTL = 300ms (quá ngắn), khi mạng hơi trễ thì lock bị nhả trước khi DB ghi xong, dẫn tới double-booking ngay lập tức. Nếu đặt TTL = 10 giây (quá dài), khi một node mạng bị treo thì slot khám bị đóng băng 10 giây khiến mọi bệnh nhân khác không thể đặt được. Thuộc tính *Consistency* và *Availability* cực kỳ nhạy cảm với thông số này.
> 2. **Trade-off Point (Điểm đánh đổi):** Là một quyết định kiến trúc tác động đồng thời đến **ít nhất hai thuộc tính chất lượng khác nhau theo hai chiều hướng trái ngược nhau** (được thuộc tính này thì phải hy sinh một phần thuộc tính kia).
>    - *Ví dụ thực tế trong MediLink:* Quyết định áp dụng **Circuit Breaker và Graceful Degradation** cho cổng HIS Huế.
>      - *Chiều hướng tích cực:* Tối đa hóa thuộc tính **Availability** (11 cơ sở khác vẫn hoạt động 100%, không bị sập theo).
>      - *Chiều hướng hy sinh:* Phải chấp nhận giảm bớt thuộc tính **Immediate Consistency** (dữ liệu lịch tại Huế không được cập nhật ngay lập tức xuống máy chủ nội bộ mà chấp nhận nhất quán muộn - Eventual Consistency).

### 5.2. Thay đổi từ v1 sang v2 là gì và risk nào đã được giảm?
> **Trả lời:**
> - **Thay đổi 1:** Bổ sung Token Bucket Rate Limiting tại Gateway -> Giảm triệt để **Risk R-01 (Quá tải Redis và nghẽn tài nguyên do spam request cùng lúc)**.
> - **Thay đổi 2:** Bổ sung Transactional Outbox có kiểm soát nhịp độ đồng bộ (Rate-controlled sync with Jitter) -> Giảm triệt để **Risk R-02 (Hiện tượng sập dây chuyền Thundering Herd làm nghẽn HIS Huế khi vừa phục hồi sau sự cố 2 giờ)**.
> - **Thay đổi 3:** Bổ sung tiến trình tự động xác thực chuỗi băm `AuditIntegrityVerifier` -> Giảm triệt để **Risk R-03 (Nguy cơ DBA hoặc kẻ xâm nhập nội bộ can thiệp chỉnh sửa dữ liệu kiểm toán mà không bị phát hiện)**.
