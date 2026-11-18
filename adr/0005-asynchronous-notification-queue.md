# ADR-005: Cơ chế Gửi Nhắc lịch Đa kênh (SMS, Zalo ZNS, Email) Bất đồng bộ qua Persistent Queue và Background Worker

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-09 (Mốc M2)
- **Truy vết ASR (Traces to):** `ASR-01` (Giữ độ trễ đặt lịch thấp), `QAS-08` (Cô lập lỗi cổng SMS/Zalo bên ngoài)
- **Người đề xuất:** Lê Viết Nghĩa & Trần Tiến Danh
- **Người phản biện & phê duyệt:** Nguyễn Đức Bảo Hy, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

Sau khi bệnh nhân đặt lịch thành công, hệ thống phải gửi ngay tin nhắn xác nhận kèm mã QR check-in qua Zalo ZNS / SMS / Email, đồng thời gửi tin nhắc hẹn tự động trước 24 giờ và 2 giờ khám (`UC-03`).

Các cổng viễn thông bên thứ ba thường có độ trễ biến thiên lớn (`500 ms – 5.000 ms`) và đôi khi trả lỗi tạm thời (`HTTP 503` hoặc nghẽn mạng nhà mạng). Nếu thực hiện gửi tin đồng bộ ngay trong request đặt lịch, luồng đặt lịch chính sẽ bị kéo chậm và thất bại oan khi nhà mạng bảo trì.

---

## 2. Các phương án đã cân nhắc (Options Considered)

### Phương án 1: Gọi HTTP đồng bộ tới cổng SMS/Zalo ngay trong `BookingService`
- **Ưu điểm:** Không cần tiến trình worker phụ.
- **Nhược điểm:** Vi phạm nghiêm trọng nguyên tắc cô lập lỗi (`QAS-08`). Cổng SMS treo 10 giây sẽ làm API đặt lịch treo 10 giây, gây cạn kiệt tài nguyên của `medilink-core`.

### Phương án 2: Triển khai cụm Message Broker hạng nặng riêng (Apache Kafka / RabbitMQ Cluster)
- **Ưu điểm:** Thông lượng hàng chục nghìn thông điệp/giây.
- **Nhược điểm:** Dư thừa tài nguyên cho lưu lượng ~2.500 lịch hẹn/ngày (~0.03 job/giây trung bình), tiêu tốn thêm 500 MB – 1.5 GB RAM trong `docker-compose.yml` và tăng gánh nặng cấu hình vận hành cho nhóm 4 người.

### Phương án 3: Persistent Job Queue lưu bền vững kết hợp tiến trình `medilink-worker` độc lập có Exponential Backoff & Dead-Letter Queue *(Được chọn)*
- **Mô tả:**
  - Khi giao dịch đặt lịch thành công, `BookingService` chỉ ghi 1 dòng trạng thái `QUEUED` vào bảng hàng đợi bền vững `notification_jobs` (hoặc Redis BullMQ trên môi trường mở rộng) trong `< 1 ms` rồi trả phản hồi `201 Created` ngay cho bệnh nhân.
  - Tiến trình container độc lập `medilink-worker` (`backgroundWorker.js`) tiêu thụ các job đến hạn (`next_run_at <= now`), gọi cổng Zalo ZNS / SMS.
  - Nếu cổng ngoài trả lỗi, Worker tự động tăng `attempts` và lùi thời gian chạy lại theo hàm mũ (**Exponential Backoff**); nếu quá `max_attempts = 3` vẫn lỗi thì chuyển sang trạng thái `DEAD_LETTER` để bộ phận vận hành kiểm tra mà không làm kẹt hàng đợi.

---

## 3. Quyết định (Decision)

Nhóm quyết định chọn **Phương án 3: Hàng đợi công việc bền vững (Persistent Queue) được xử lý bởi tiến trình `medilink-worker` tách rời kèm cơ chế Exponential Backoff & Dead-Letter Queue**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Bảo vệ tuyệt đối tốc độ luồng đặt lịch:** Thực nghiệm `Test 6` chứng minh ngay cả khi cổng SMS/Zalo bị giả lập lỗi `503` liên tiếp 2 lần, API đặt lịch vẫn hoàn tất trong **`6.77 ms`**, và `medilink-worker` tự động retry thành công ở lần thứ 3 (`status = SENT`) mà không mất tin nhắn nào.
- **Đơn giản, bền vững, không mất job khi khởi động lại:** Vì trạng thái job được ghi xuống đĩa (SQLite WAL / Redis AOF), việc restart container không làm mất lịch nhắc hẹn 24h/2h.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1:** Tin nhắn xác nhận gửi theo cơ chế bất đồng bộ có độ trễ trễ hơn vài trăm mili-giây đến 1–2 giây so với phản hồi màn hình.
  - *Giảm thiểu:* Hiển thị ngay mã QR check-in trực tiếp trên màn hình xác nhận của ứng dụng Web/Mobile ngay khi nhận `HTTP 201`, tin nhắn Zalo/SMS đóng vai trò kênh lưu trữ bổ trợ.
- **Hệ quả tiêu cực 2:** Cơ chế `at-least-once delivery` khi retry có thể khiến bệnh nhân nhận 2 tin nhắn trùng nếu cổng SMS đã gửi tin nhưng rớt mạng lúc trả ACK.
  - *Giảm thiểu:* Truyền kèm `booking_id` làm `message_dedup_id` sang cổng Zalo ZNS / SMS Gateway.
