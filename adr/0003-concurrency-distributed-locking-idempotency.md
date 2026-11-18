# ADR-003: Cơ chế Chống Đặt trùng lịch Đa tầng – Idempotency Key, Redis Distributed Lock (kèm Fencing Token) và RDBMS Unique Constraint

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-07 (Mốc M2)
- **Truy vết ASR (Traces to):** `ASR-01` (50 bệnh nhân cùng đặt 1 slot → đúng 1 thành công, double-booking = 0%), `QAS-07` (Idempotency khi mạng 4G gửi lặp)
- **Người đề xuất:** Trần Tiến Danh (Prototype Lead) & Nguyễn Đức Bảo Hy (Lead Architect)
- **Người phản biện & phê duyệt:** Nguyễn Quang Trường (QA/Test Lead), Lê Viết Nghĩa

---

## 1. Bối cảnh (Context)

Trong giờ mở cổng đăng ký khám buổi sáng (07:30–08:30), 50 bệnh nhân có thể cùng bấm xác nhận đặt vào duy nhất 1 khung giờ trống (`08:00`) của bác sĩ chuyên khoa đầu ngành (`ASR-01`). Đồng thời, bệnh nhân dùng mạng di động 3G/4G chập chờn thường bấm nút "Đặt lịch" liên tiếp nhiều lần hoặc ứng dụng tự động retry (`QAS-07`).

Hệ thống phải đảm bảo:
1. Tỷ lệ đặt trùng lịch (**double-booking**) bằng **0.00%** trong mọi tình huống (kể cả khi scale-out nhiều instance `medilink-core` hoặc có tầng cache).
2. Độ trễ phản hồi `p95 ≤ 500 ms` (49 người chậm chân phải nhận phản hồi từ chối lịch sự `HTTP 409 Conflict` thật nhanh thay vì chờ treo kết nối).
3. Cùng một khách hàng gửi lặp request với cùng khóa định danh giao dịch không bị tạo 2 lịch hẹn hay trừ cọc 2 lần.

---

## 2. Các phương án đã cân nhắc (Options Considered)

| Phương án | Cơ chế hoạt động | Ưu điểm | Nhược điểm / Khi nào thất bại? |
|:---|:---|:---|:---|
| **1. Pessimistic Lock trong DB (`SELECT ... FOR UPDATE`)** | Mở transaction DB và khóa dòng `slots` cho đến khi kiểm tra và ghi xong. | Nhất quán ACID mạnh trên 1 DB đơn lẻ. | Giữ kết nối DB trong suốt phiên xử lý; khi 50–200 requests ập vào cùng lúc dễ gây cạn kiệt Connection Pool, tăng vọt độ trễ và nguy cơ Deadlock nếu khóa nhiều bảng. |
| **2. Optimistic Lock (`version` column)** | Đọc `version = v`, khi ghi chạy `UPDATE slots SET status='BOOKED', version=v+1 WHERE id=? AND version=v`. | Không giữ lock khi đọc; rất tốt khi ít va chạm. | Khi tỷ lệ tranh chấp cao (50 người nhắm vào đúng 1 slot), cả 50 luồng đều chạy hết kiểm tra nghiệp vụ rồi 49 luồng thất bại ở câu lệnh ghi cuối cùng; nếu bật retry sẽ gây bão truy vấn (*Retry Storm*). |
| **3. Chỉ dùng DB `UNIQUE(doctor_id, slot_time)`** | Cho phép mọi request chạy thẳng xuống lệnh `INSERT INTO bookings` và bắt lỗi vi phạm khóa duy nhất. | Đơn giản, đảm bảo DB không bao giờ có 2 dòng trùng. | **Chưa đủ khi có nhiều instance, cache và HIS ngoài:** (a) Toàn bộ 50 requests đều dội tải xuống DB chính; (b) Nếu luồng gọi giữ chỗ sang HIS ngoài trước khi commit DB thì 50 lệnh trùng đã bắn sang HIS; (c) Không phân biệt được "lỗi khách khác chiếm chỗ (409)" với "chính khách đó retry do rớt mạng (cần trả lại 200 OK)". |
| **4. Phòng thủ đa tầng: Idempotency Key + Redis Distributed Lock (Fencing Token) + RDBMS `UNIQUE` *(Được chọn)*** | Lớp 1 kiểm tra `X-Idempotency-Key`; Lớp 2 khóa nguyên tử trên Redis `SET NX PX 3000` kèm `INCR fencing_seq`; Lớp 3 giao dịch nguyên tử DB có `UNIQUE(active_slot_key)` rồi nhả khóa ngay trước khi gọi mạng HIS. | Kết hợp tốc độ chặn sớm tại RAM (< 5ms) với độ an toàn tuyệt đối của RDBMS. | Phải quản lý thêm thành phần Redis và xử lý kịch bản Redis tạm mất kết nối hoặc khóa hết hạn sớm. |

---

## 3. Quyết định (Decision)

Nhóm chọn **Phương án 4: Kiến trúc Kiểm soát Đồng thời Đa tầng (3-Layer Defense-in-Depth)** gồm:
1. **Lớp 1 – Idempotency Key (`idempotencyManager.js`):** Bắt buộc header `X-Idempotency-Key`. Nếu khóa đã xử lý trong vòng TTL (300 giây), trả lại ngay kết quả gốc (`HTTP 200`, `idempotent_replay: true`) mà không thực thi lại.
2. **Lớp 2 – Distributed Lock kèm Fencing Token (`lockManager.js`):** Thực thi lệnh nguyên tử Redis `SET lock:slot:{doctor_id}:{slot_time} {owner}:{fencingToken} NX PX 3000` và giải phóng khóa bằng **Lua Script nguyên tử** (`EVAL` kiểm tra đúng `owner:fencingToken` mới `DEL`). Quan trọng: **Khóa được nhả ngay sau khi giao dịch RDBMS giữ chỗ hoàn tất**, tuyệt đối không giữ khóa trong lúc chờ gọi HTTP sang HIS ngoài!
3. **Lớp 3 – RDBMS Atomic Constraint (`database.js`):** Giao dịch `BEGIN IMMEDIATE` kiểm tra `status = 'AVAILABLE'` và chèn vào bảng `bookings` có ràng buộc `UNIQUE(active_slot_key)` (khi hủy lịch thì `active_slot_key` được gán `NULL` để cho phép đặt lại khung giờ đó hợp lệ).

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Loại bỏ 100% Double-Booking:** Thực nghiệm bắn 50 requests đồng thời đạt đúng **1 booking thành công (`201`)**, **49 bị từ chối sạch (`409`)**, độ trễ thực đo `p95 = 142.16 ms` (thấp hơn rất nhiều so với ngưỡng `500 ms`).
- **An toàn ngay cả khi GC Pause hoặc Redis sự cố:** Nhờ **Fencing Token** và ràng buộc `UNIQUE(active_slot_key)` ở tầng CSDL quan hệ, ngay cả trong kịch bản cực đoan khóa Redis hết TTL 3 giây sớm hoặc cụm Redis gặp sự cố chuyển sang chế độ Fallback, CSDL vẫn chặn đứng tuyệt đối bản ghi trùng thứ hai.
- **Trải nghiệm mượt khi mạng chập chờn:** Thử nghiệm gửi lặp 5 lần cùng `X-Idempotency-Key` trả về ngay lịch hẹn đã đặt mà không báo lỗi giả `409`.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1:** Phức tạp hóa luồng đặt lịch và thêm phụ thuộc vận hành vào dịch vụ Redis.
  - *Giảm thiểu:* Bật chế độ lưu bền vững `appendonly yes` trên container `medilink-redis` và thiết kế `lockManager.js` tự động chuyển sang khóa cục bộ kết hợp RDBMS `BEGIN IMMEDIATE` + `UNIQUE` nếu mất kết nối TCP tới Redis.
- **Hệ quả tiêu cực 2:** Chính sách Fast-Fail (`409`) từ chối ngay các request đến cùng mili-giây kể cả trong trường hợp hy hữu người đầu tiên hủy ngay sau đó.
  - *Giảm thiểu:* Trả kèm danh sách các khung giờ trống liền kề (`08:30`, `09:00`) trong phản hồi để bệnh nhân chọn lại chỉ với 1 chạm.
