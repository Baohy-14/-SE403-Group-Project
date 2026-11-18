# ADR-007 (Architecture v2): Nâng cấp Tích hợp HIS Chịu lỗi bằng Per-Facility Circuit Breaker, Transactional Outbox và Rate-Controlled Sync có Jitter

- **Trạng thái (Status):** Accepted *(Supersedes phần xử lý lỗi đồng bộ trực tiếp của [ADR-002](0002-his-integration-acl-canonical-model.md))*
- **Ngày quyết định (Date):** 2026-11-12 (Mốc M3 – Cải tiến Architecture v2 sau đánh giá ATAM)
- **Truy vết ASR & Risk (Traces to):** `ASR-02` (HIS Huế sập 2 giờ, 11 cơ sở khác vẫn đặt lịch 100%), xử lý triệt để **Risk `R-02` (Thundering Herd khi HIS hồi phục & Timeout không xác định)**
- **Người đề xuất:** Nguyễn Đức Bảo Hy (Lead Architect) & Nguyễn Quang Trường (QA/Test Lead)
- **Người phản biện & phê duyệt:** Trần Tiến Danh, Lê Viết Nghĩa

---

## 1. Bối cảnh & Vấn đề phát hiện từ ATAM (Context)

Trong phiên đánh giá **ATAM rút gọn (Mốc M3)** đối với kịch bản bắt buộc `ASR-02` (*"HIS của cơ sở Huế ngừng hoạt động 2 giờ trong giờ hành chính"*), nhóm phát hiện bản thiết kế v1 (gọi đồng bộ trực tiếp qua ACL) tồn tại **2 rủi ro kiến trúc lớn**:
1. **Nguy cơ nghẽn luồng & chờ đợi vô ích:** Nếu HIS Huế bị đứt mạng hoặc treo socket mà không có bộ ngắt mạch riêng, mọi bệnh nhân đặt khám tại Huế đều phải chờ hết thời gian timeout mới nhận phản hồi, làm tăng độ trễ và tiêu tốn tài nguyên kết nối của `medilink-core`.
2. **Nguy cơ sập dây chuyền khi hồi sinh (*Thundering Herd - Risk R-02*):** Trong 2 giờ HIS Huế ngừng hoạt động, giả sử có 150 lịch hẹn tại Huế được MediLink tiếp nhận tạm. Khi máy chủ HIS Huế vừa khởi động lại (CPU và cache còn lạnh), nếu worker bắn dồn dập cả 150 SOAP XML requests cùng một lúc sang HIS Huế, máy chủ di sản tại Huế sẽ lập tức quá tải và sập trở lại! Ngoài ra, nếu một request bị timeout ở giây 1.5 nhưng phía HIS thực chất đã ghi xong, việc gửi lại không có khóa chống trùng sẽ gây trùng phiếu khám bên HIS.

---

## 2. Các phương án đã cân nhắc (Options Considered)

### Phương án 1: Từ chối hoàn toàn việc đặt lịch tại Huế khi HIS Huế lỗi (Hard Fail 503)
- **Ưu điểm:** Không lo đồng bộ bù hay lệch dữ liệu.
- **Nhược điểm:** Trải nghiệm bệnh nhân rất tệ — mất khách hàng trong suốt 2 giờ mất mạng tại chi nhánh, dù bác sĩ và khung giờ trên MediLink vẫn còn trống rõ ràng.

### Phương án 2: Retry ngay lập tức trong luồng HTTP (Immediate In-Request Retries)
- **Ưu điểm:** Khắc phục được lỗi rớt gói tin thoáng qua vài mili-giây.
- **Nhược điểm:** Phản tác dụng thảm hại khi HIS Huế sập hẳn 2 giờ: retry 3 lần liên tiếp kéo dài thời gian treo mỗi request gấp 3 lần, làm trầm trọng hóa nguy cơ sập dây chuyền (*Cascading Failure*).

### Phương án 3: Per-Facility Circuit Breaker + Transactional Outbox + Rate-Controlled Recovery có Jitter & Idempotency Token *(Được chọn)*
- **Mô tả:**
  1. **Cô lập theo cơ sở (`CircuitBreaker` riêng cho từng `facility_id`):** Áp đặt `HIS_TIMEOUT_MS = 1500ms`. Sau `3` lần lỗi/timeout liên tiếp tại Huế, mạch của riêng `FAC_HUE` chuyển sang **`OPEN`**. Các mạch `FAC_DANANG` và `FAC_QUANGNAM` hoàn toàn độc lập (mẫu *Bulkhead*).
  2. **Graceful Degradation & Transactional Outbox:** Khi mạch `FAC_HUE` đang `OPEN` (hoặc lời gọi vừa lỗi), yêu cầu đặt lịch không hề chờ mạng mà chuyển ngay sang ghi bản ghi `PENDING` vào bảng `outbox_events` (phản hồi Fast-fail mạng chỉ mất `< 10 ms`), giữ chỗ an toàn trên MediLink với cờ `his_sync_status = 'OUTBOX_QUEUED'` và thông báo rõ cho bệnh nhân.
  3. **Đồng bộ bù có điều tiết nhịp độ (`OutboxSyncWorker` trong `medilink-worker`):** Khi hết cửa sổ chờ (`resetTimeoutMs`), Circuit Breaker chuyển sang `HALF_OPEN` chỉ cho phép thăm dò từng bước; Worker lấy từng lô nhỏ (`OUTBOX_BATCH_SIZE = 5`), chèn **độ trễ ngẫu nhiên (Random Jitter `20–60 ms` trên Prototype / `200–500 ms` trên Production)** giữa từng bản tin và đính kèm `<hue:IdempotencyToken>` / `X-Idempotency-Key` để phía HIS không bao giờ tạo trùng phiếu khám!

---

## 3. Quyết định (Decision)

Nhóm quyết định phê duyệt **Phương án 3**, nâng cấp kiến trúc tích hợp lên **Architecture Design v2** và đánh dấu phần xử lý lỗi đồng bộ của `ADR-002` là *Partially Superseded by ADR-007*.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Cô lập lỗi 100% & Phản hồi tức thì (`ASR-02`):** Thực nghiệm `Test 2` chứng minh khi HIS Huế sập `503`, mạch Huế mở `OPEN`, yêu cầu thứ 4 phản hồi ở chế độ Outbox chỉ mất **`7.38 ms`**, trong khi Đà Nẵng và Quảng Nam đạt **`100% SYNCED`**.
- **Hồi phục êm ái, không mất lịch, không trùng phiếu:** Khi HIS Huế bật lại, `OutboxSyncWorker` đồng bộ bù thành công `4/4` lịch hẹn tích lũy và đóng mạch về `CLOSED` an toàn.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1 (Đánh đổi nhất quán tức thời lấy tính sẵn sàng):** Trong khoảng thời gian HIS Huế mất mạng, lễ tân tại quầy Huế nếu vừa đặt lịch thủ công trực tiếp vào phần mềm HIS cục bộ tại phòng khám cho đúng khung giờ bác sĩ đó thì khi mạng có lại có thể xảy ra xung đột hai chiều (*Split-brain booking conflict*).
  - *Giảm thiểu:* Quy chế vận hành chuỗi quy định mỗi bác sĩ tách riêng quỹ slot Online (do MediLink làm nguồn chuẩn *Source of Truth*) và quỹ slot Walk-in tại quầy; nếu vẫn phát sinh xung đột hiếm gặp khi đồng bộ bù, sự kiện chuyển sang trạng thái `CONFLICT_MANUAL_REVIEW` và đẩy cảnh báo ưu tiên cho Lễ tân trưởng gọi điện sắp xếp sang khung giờ kế cận cho bệnh nhân.
