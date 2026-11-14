# ADR-004: Mô hình Phân quyền Đa cơ sở (RBAC + ABAC) và Nhật ký Kiểm toán Bất biến (Tamper-Evident Audit Logging)

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-08
- **Người đề xuất (Author):** Lê Viết Nghĩa (Requirements Owner) & Nguyễn Đức Bảo Hy (Lead Architect)
- **Người tham gia rà soát (Reviewers):** Nguyễn Quang Trường, Trần Tiến Danh

---

## 1. Bối cảnh (Context)

Nền tảng MediLink xử lý dữ liệu hồ sơ bệnh án (EHR) và kết quả xét nghiệm, thuộc danh mục **Dữ liệu cá nhân nhạy cảm** theo quy định tại Điều 2 & Điều 17 **Nghị định 13/2023/NĐ-CP**.
Hệ thống phải giải quyết 2 thách thức bảo mật trọng tâm:
1. **Kiểm soát ranh giới dữ liệu liên cơ sở (ASR-03):** Nhân viên lễ tân hoặc thu ngân tại cơ sở Đà Nẵng chỉ được phép xem thông tin bệnh nhân đăng ký khám tại cơ sở Đà Nẵng. Nếu cố tình truy cập hồ sơ của bệnh nhân thuộc cơ sở Huế hay Quảng Nam thì hệ thống phải chặn đứng (HTTP 403 Forbidden).
2. **Tính toàn vẹn của vết kiểm toán (ASR-05):** 100% các hành vi đọc, ghi hoặc cố tình truy cập trái phép phải được ghi lại nhật ký kiểm toán không thể sửa hoặc xóa (Append-only & Tamper-evident), kể cả bởi Quản trị viên cơ sở dữ liệu (DBA).

---

## 2. Các phương án được cân nhắc (Options Considered)

### 2.1. Về Mô hình Phân quyền:
1. **Phương án A: Phân quyền theo vai trò truyền thống (Pure RBAC)**
   - *Đánh giá:* Chỉ gán vai trò: `PATIENT`, `DOCTOR`, `RECEPTIONIST`, `ADMIN`.
   - *Hạn chế:* Không giải quyết được bài toán đa chi nhánh địa lý (Multi-tenancy / Multi-facility). Lễ tân Đà Nẵng và Lễ tân Huế đều có vai trò `RECEPTIONIST`. Nếu chỉ kiểm tra role, lễ tân Đà Nẵng vẫn đọc được toàn bộ bệnh nhân của Huế.
2. **Phương án B: Phân quyền kết hợp RBAC và Contextual ABAC (Lựa chọn)**
   - *Mô tả:* Kết hợp kiểm tra vai trò người dùng (Role) và đối chiếu động thuộc tính ngữ cảnh: `User.facility_id` và `Resource.facility_id`.
   - *Chính sách (Policy):*
     - Bác sĩ: Được xem hồ sơ nếu bác sĩ đó được phân công ca khám cho bệnh nhân đó.
     - Lễ tân: Chỉ được xem danh sách và tiếp đón bệnh nhân có `appointment.facility_id == user.facility_id`.
     - Bệnh nhân: Chỉ xem được hồ sơ của chính mình (`user.id == patient.user_id`).

### 2.2. Về Cơ chế Nhật ký Kiểm toán (Audit Logging):
1. **Phương án A: Ghi bảng log thông thường trong Database**
   - *Đánh giá:* Quản trị viên hệ thống hoặc kẻ tấn công chiếm quyền SQL có thể chạy lệnh `UPDATE audit_logs SET action = '...'` hoặc `DELETE FROM audit_logs` để xóa dấu vết phạm tội. Không đáp ứng yêu cầu thanh tra pháp lý.
2. **Phương án B: Chuỗi băm mật mã liên hoàn Append-Only (HMAC-SHA256 Cryptographic Chaining) (Lựa chọn)**
   - *Mô tả:* Bảng `audit_logs` được cấu hình chỉ cho phép lệnh `INSERT` (Append-Only). Mỗi bản ghi log được liên kết mật mã với bản ghi liền trước (tương tự cơ chế Blockchain):
     $$\text{current\_hash} = \text{HMAC-SHA256}(\text{SECRET\_KEY}, \text{prev\_hash} + \text{timestamp} + \text{actor\_id} + \text{action} + \text{resource\_id} + \text{status})$$
   - *Cơ chế xác thực:* Một tiến trình nền định kỳ tính toán lại chuỗi băm từ bản ghi đầu tiên (Genesis) đến bản ghi cuối cùng. Nếu bất kỳ dòng log nào bị sửa đổi hoặc xóa, chuỗi băm sẽ bị đứt gãy ngay lập tức và báo động an ninh đỏ.

---

## 3. Quyết định (Decision)

Nhóm quyết định lựa chọn:
1. **Mô hình Phân quyền lai: RBAC kết hợp Contextual ABAC (kiểm tra `facility_id` tại API Gateway và Application Middleware).**
2. **Cơ chế Nhật ký Kiểm toán Bất biến: Append-Only Audit Logging với chuỗi băm mật mã HMAC-SHA256 liên hoàn.**

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive):
- Ngăn chặn triệt để lỗ hổng leo thang đặc quyền ngang hàng (BOLA / IDOR - Broken Object Level Authorization). Lễ tân không bao giờ xem chéo được dữ liệu cơ sở khác (đáp ứng 100% ASR-03).
- Nhật ký kiểm toán có tính chứng cứ pháp lý cao, tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP về trách nhiệm giải trình và không thể chối bỏ (Non-repudiation).
- Phát hiện tức thì bất kỳ can thiệp trái phép nào vào cơ sở dữ liệu.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations):
- *Chi phí tính toán mật mã:* Tính mã HMAC cho mỗi request làm tăng nhẹ thời gian xử lý.
  - *Biện pháp:* Tách việc ghi log sang cơ chế bất đồng bộ (Asynchronous Event / Worker) để phản hồi người dùng không bị chậm trễ.
- *Bảo vệ khóa bí mật (Secret Key):* Nếu lộ khóa `HMAC_SECRET_KEY`, kẻ tấn công có thể tính toán lại toàn bộ chuỗi băm giả mạo.
  - *Biện pháp:* Khóa bí mật được quản lý qua biến môi trường tách biệt (hoặc HashiCorp Vault), phân quyền truy cập nghiêm ngặt.
