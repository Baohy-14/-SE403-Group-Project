# ADR-003: Cơ chế Kiểm soát Tranh chấp Đồng thời và Chống Đặt trùng lịch (Distributed Concurrency & Double-Booking Prevention)

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-07
- **Người đề xuất (Author):** Trần Tiến Danh (Prototype Lead) & Nguyễn Đức Bảo Hy (Lead Architect)
- **Người tham gia rà soát (Reviewers):** Nguyễn Quang Trường (QA/Test Lead), Lê Viết Nghĩa

---

## 1. Bối cảnh (Context)

Một trong những vấn đề bức xúc nhất của chuỗi phòng khám là tình trạng đặt trùng lịch khám (double-booking). Yêu cầu cốt lõi **ASR-01** quy định: Khi có 50 bệnh nhân cùng bấm xác nhận đặt lịch vào đúng 1 khung giờ khám của 1 bác sĩ tại 1 cơ sở, hệ thống phải đảm bảo:
- Chỉ duy nhất 1 bệnh nhân đặt thành công (double-booking = 0%).
- 49 bệnh nhân còn lại nhận thông báo hết chỗ (HTTP 409 Conflict) với độ trễ phản hồi p95 < 800ms.
- Phải hỗ trợ tính Idempotency khi bệnh nhân bị lag mạng và click đúp nhiều lần hoặc hệ thống retry tự động.

---

## 2. Các phương án được cân nhắc (Options Considered)

1. **Phương án 1: Chỉ dựa vào Unique Constraint tại Database quan hệ (`UNIQUE(doctor_id, appointment_slot)`)**
   - *Mô tả:* Mọi request đều cho chạy hết luồng kiểm tra logic, sau đó cùng gọi câu lệnh `INSERT INTO appointments` xuống database; database sẽ ném ngoại lệ vi phạm khóa chính đối với 49 request đến sau.
   - *Ưu điểm:* Đơn giản, không cần cài thêm công cụ ngoài.
   - *Nhược điểm:* Khi có nhiều instance ứng dụng hoặc có cache, việc 50 request cùng tính toán và ập vào DB gây quá tải bộ đệm kết nối (Connection Pool Exhaustion); lãng phí tài nguyên CPU cho 49 request thất bại; không giải quyết được trường hợp trạng thái slot được lưu ở tầng Cache/HIS bên ngoài.

2. **Phương án 2: Khóa lạc quan (Optimistic Locking với trường Version)**
   - *Mô tả:* Đọc version hiện tại của slot, khi cập nhật kiểm tra `WHERE id = ? AND version = ?`.
   - *Ưu điểm:* Nhanh khi tỷ lệ tranh chấp thấp.
   - *Nhược điểm:* Khi 50 người cùng giành 1 slot (tỷ lệ tranh chấp 100%), 49 request thất bại và nếu cấu hình retry thì sẽ gây bão yêu cầu (Retry Storm) làm sập hệ thống.

3. **Phương án 3: Kiểm soát Đa tầng: Redis Distributed Lock + Idempotency Key + RDBMS Unique Constraint (Lựa chọn)**
   - *Mô tả:*
     - **Tầng 1 (Idempotency Key):** Mỗi request gửi kèm Header `X-Idempotency-Key: <UUID>`. Nếu một client gửi đúp cùng key trong vòng 60 giây, hệ thống trả về ngay kết quả đã lưu mà không xử lý lại.
     - **Tầng 2 (Distributed Lock trên Redis):** Sử dụng lệnh nguyên tử `SET lock:slot:{doctor_id}:{slot_time} {client_id} NX PX 3000` (khóa tự hủy sau 3 giây). Request đầu tiên giành được khóa sẽ đi tiếp; 49 request còn lại không lấy được khóa sẽ bị từ chối ngay lập tức (Fast-fail với HTTP 409 Conflict) mà không cần chạm vào Database.
     - **Tầng 3 (RDBMS Unique Constraint):** Đặt chỉ mục duy nhất `UNIQUE(doctor_id, slot_time)` tại bảng `appointments` làm chốt chặn thép cuối cùng (Last-mile defense), đề phòng trường hợp Redis bị sập đột ngột.

---

## 3. Quyết định (Decision)

Nhóm quyết định lựa chọn **Phương án 3: Cơ chế Kiểm soát Đa tầng kết hợp Redis Distributed Lock, Idempotency Key và RDBMS Unique Constraint**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive):
- Đảm bảo tỷ lệ double-booking tuyệt đối bằng **0.00%**, thỏa mãn hoàn toàn kịch bản ASR-01.
- Hiệu năng vượt trội: 49 request bị từ chối ngay tại bộ nhớ In-Memory Redis chỉ mất < 10ms, bảo vệ cơ sở dữ liệu quan hệ hoàn toàn không bị ảnh hưởng bởi đỉnh tải tranh chấp.
- Ngăn ngừa triệt để lỗi người dùng click liên tiếp hoặc app gửi trùng lệnh nhờ Idempotency Key.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations):
- *Sự cố Deadlock nếu tiến trình giữ khóa bị sập giữa chừng:*
  - *Biện pháp:* Bắt buộc cài đặt thời gian sống `PX 3000` (TTL 3 giây). Nếu server bị crash khi đang xử lý, Redis sẽ tự động giải phóng lock sau 3 giây, các slot không bao giờ bị treo vĩnh viễn.
- *Phụ thuộc hạ tầng Redis:* Nếu Redis sập, toàn bộ tiến trình lock có thể gặp lỗi.
  - *Biện pháp:* Cấu hình Redis AOF/RDB persistence và thiết kế cơ chế Fallback sang Database Row-level lock (`SELECT ... FOR UPDATE`) nếu kết nối Redis bị gián đoạn.
