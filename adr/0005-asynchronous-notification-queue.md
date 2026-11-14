# ADR-005: Chiến lược Xử lý Tác vụ Nền và Gửi Thông báo Nhắc lịch Bất đồng bộ (Queue-Based Background Worker)

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-09
- **Người đề xuất (Author):** Lê Viết Nghĩa & Trần Tiến Danh
- **Người tham gia rà soát (Reviewers):** Nguyễn Đức Bảo Hy, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

Nền tảng MediLink cần gửi các thông báo nhắc lịch khám tự động đến bệnh nhân qua nhiều kênh (SMS, tin nhắn Zalo ZNS, Email) trước 24 giờ và trước 2 giờ khám; đồng thời gửi tin nhắn mã QR xác nhận ngay sau khi đặt lịch thành công.
Nếu việc gọi API sang các nhà mạng viễn thông hoặc cổng Zalo được thực hiện đồng bộ (Synchronous) ngay trong luồng xử lý API đặt lịch, độ trễ mạng của bên thứ ba (thường mất từ 1-3 giây) sẽ làm chậm nghiêm trọng trải nghiệm người dùng, vi phạm chỉ số SLA phản hồi p95 < 800ms của ASR-01.

---

## 2. Các phương án được cân nhắc (Options Considered)

1. **Phương án 1: Gọi API đồng bộ (Synchronous HTTP calls)**
   - *Mô tả:* Khi bệnh nhân bấm đặt lịch, server gọi sang nhà mạng gửi tin nhắn SMS, chờ nhà mạng trả về mã phản hồi rồi mới trả kết quả cho người dùng.
   - *Đánh giá:* Rất tệ. Nếu nhà mạng gặp sự cố hoặc nghẽn mạng, giao dịch đặt lịch của người dùng sẽ bị treo (timeout), dẫn đến trải nghiệm tồi tệ và làm cạn kiệt luồng kết nối của server.

2. **Phương án 2: Sử dụng Tiến trình quét định kỳ trực tiếp trên Database (Polling Cronjob)**
   - *Mô tả:* Một cron job chạy mỗi 5 phút quét cơ sở dữ liệu `SELECT * FROM appointments WHERE reminder_sent = false` để gửi tin.
   - *Đánh giá:* Gây tải liên tục (polling overhead) lên cơ sở dữ liệu quan hệ chính; khó xử lý retry khi gửi thất bại; độ trễ thông báo có thể bị chậm tới 5 phút.

3. **Phương án 3: Hàng đợi công việc phân tán dựa trên Redis (BullMQ / Queue-based Worker) (Lựa chọn)**
   - *Mô tả:* Tách rời hoàn toàn luồng nghiệp vụ chính và luồng thông báo:
     - Khi đặt lịch thành công, `BookingService` chỉ đẩy một thông điệp (Job: `SEND_CONFIRMATION_SMS`) vào Redis Queue và trả về kết quả 201 Created ngay lập tức cho người dùng (< 50ms).
     - Tiến trình `NotificationWorker` độc lập sẽ lắng nghe hàng đợi, lấy Job ra xử lý, gọi cổng SMS/Zalo/Email, tự động retry với độ lùi lũy thừa (Exponential Backoff) nếu mạng viễn thông chập chờn, và ghi log khi hoàn tất.
     - Sử dụng tính năng Delayed Jobs của BullMQ để lập lịch tự động cho các tin nhắn nhắc hẹn trước 24 giờ và 2 giờ.

---

## 3. Quyết định (Decision)

Nhóm quyết định lựa chọn **Phương án 3: Hàng đợi công việc phân tán dựa trên Redis (Queue-based Background Worker với BullMQ)**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive):
- Tối ưu hóa tối đa hiệu năng luồng đặt lịch: Thời gian phản hồi API xác nhận giảm từ hơn 2000ms xuống dưới 50ms.
- Cách ly lỗi tuyệt đối: Sự cố mạng từ các nhà mạng viễn thông (SMS/Zalo/Email) hoàn toàn không ảnh hưởng đến nghiệp vụ đặt lịch khám của bệnh nhân.
- Hỗ trợ cơ chế thử lại (Auto-Retry) thông minh với 3 lần thử lại và độ trễ tăng dần khi gặp sự cố mạng tạm thời.
- Hỗ trợ lập lịch hẹn gửi tin chính xác (Delayed Jobs) mà không cần quét bảng dữ liệu liên tục.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations):
- *Hiện tượng mất mát tác vụ nếu Redis bị khởi động lại:*
  - *Biện pháp:* Bật chế độ ghi dữ liệu Redis Persistence (AOF - Append Only File với fsync mỗi giây) để đảm bảo không bị thất thoát hàng đợi tin nhắn.
- *Nguy cơ nghẽn hàng đợi (Queue backlog) khi gửi hàng loạt:*
  - *Biện pháp:* Cấu hình tỷ lệ xử lý song song (Concurrency = 10 workers) và áp dụng cơ chế Rate Limiting phù hợp với hạn ngạch cho phép của các nhà mạng viễn thông.
