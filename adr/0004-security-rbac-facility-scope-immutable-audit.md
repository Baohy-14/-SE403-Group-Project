# ADR-004: Kiến trúc Bảo mật Đa lớp – Phân quyền RBAC + Contextual ABAC + Consent, Mã hóa Cấp trường AES-256-GCM và Audit Log Append-Only HMAC

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-08 (Mốc M2)
- **Truy vết ASR (Traces to):** `ASR-03` (Chặn lễ tân xem chéo hồ sơ cơ sở khác → 403 & ghi Audit), `QAS-05` (Chống sửa/xóa Audit Log), Ràng buộc pháp lý `C-01..C-04` (Nghị định 13/2023/NĐ-CP)
- **Người đề xuất:** Lê Viết Nghĩa (Requirements & Doc Owner) & Nguyễn Đức Bảo Hy (Lead Architect)
- **Người phản biện & phê duyệt:** Nguyễn Quang Trường, Trần Tiến Danh

---

## 1. Bối cảnh (Context)

Hồ sơ sức khỏe điện tử (tiền sử bệnh, chẩn đoán ICD-10, đơn thuốc, kết quả xét nghiệm) thuộc nhóm **Dữ liệu cá nhân nhạy cảm** theo Khoản 4 Điều 2 **Nghị định 13/2023/NĐ-CP**. Nếu chỉ áp dụng "HTTPS và JWT" chung chung thì hệ thống sẽ mắc 4 lỗ hổng nghiêm trọng:
1. **Truy cập chéo cơ sở (Broken Object Level Authorization - `ASR-03`):** Lễ tân Đà Nẵng và Lễ tân Huế cùng mang role `RECEPTIONIST`; nếu chỉ kiểm tra role, lễ tân Đà Nẵng có thể xem bệnh án của bệnh nhân tại Huế.
2. **Lạm quyền xem dữ liệu lâm sàng:** Nhân viên lễ tân tại cùng cơ sở chỉ cần thông tin hành chính để tiếp đón, không có quyền đọc chẩn đoán bệnh nhạy cảm; bác sĩ cơ sở khác muốn xem bệnh sử liên thông phải có sự đồng ý (*Consent*) của bệnh nhân (Điều 11 Nghị định 13/2023).
3. **Rò rỉ bản sao lưu cơ sở dữ liệu:** Nếu lưu chữ rõ (*plaintext*) trong bảng `medical_records`, kẻ tấn công lấy được file DB sẽ đọc được toàn bộ bệnh án.
4. **Sửa/xóa dấu vết kiểm toán (`QAS-05`):** Nếu bảng `audit_logs` chỉ là bảng SQL thông thường, quản trị viên DB (DBA) có thể chạy lệnh `UPDATE`/`DELETE` để xóa dấu vết xem trộm hồ sơ người nổi tiếng.

---

## 2. Các phương án đã cân nhắc (Options Considered)

### 2.1. Về Mô hình Phân quyền Truy cập Hồ sơ
- **Phương án A1 – Pure RBAC (Chỉ kiểm tra Role trong JWT):** Đơn giản nhưng thất bại hoàn toàn trước `ASR-03` vì không phân biệt được phạm vi cơ sở (`facility_id`) và quyền sở hữu hồ sơ (`patient_id`).
- **Phương án A2 – Giải pháp Phân quyền doanh nghiệp tách rời (Keycloak + Open Policy Agent / Casbin Server riêng):** Rất mạnh nhưng tăng thêm 2 containers nặng nề và độ trễ mạng nội bộ, vượt quá nhu cầu của 5 vai trò cố định trong chuỗi phòng khám.
- **Phương án A3 – Hybrid RBAC + Contextual ABAC + Explicit Consent kèm Data Masking *(Được chọn)*:**
  - Xác thực danh tính qua chữ ký số JWT chuẩn RFC 7519 (`HS256`).
  - Middleware `abacMiddleware.js` truy vấn trực tiếp thuộc tính gốc của bản ghi trong DB (`record.facility_id`, `record.patient_id`) — tuyệt đối không tin dữ liệu client gửi lên:
    - `PATIENT`: Chỉ đọc hồ sơ có `record.patient_id === user.id`.
    - `RECEPTIONIST`: Bắt buộc `user.facility_id === record.facility_id` (khác cơ sở → chặn `403` ngay); kể cả đúng cơ sở cũng chỉ trả về phạm vi `ADMIN_SUMMARY_ONLY` (ẩn toàn bộ chẩn đoán, đơn thuốc!).
    - `DOCTOR`: Cùng cơ sở được đọc đầy đủ; khác cơ sở bắt buộc kiểm tra bảng `patient_consents` (`is_active = 1`), nếu chưa có Consent → chặn `403`.
    - `DIRECTOR / ADMIN`: Chỉ xem thống kê tổng hợp ẩn danh, bị chặn `403` nếu cố mở bệnh án cá nhân.

### 2.2. Về Bảo vệ Dữ liệu Lưu trữ & Tính Bất biến của Nhật ký Kiểm toán
- **Phương án B1 – Chỉ bật mã hóa ổ đĩa (Disk Encryption) & bảng SQL log thường:** Không chống được DBA hoặc lộ file dump SQL; không phát hiện được hành vi sửa log nội bộ.
- **Phương án B2 – Lưu Audit Log lên dịch vụ Blockchain công cộng / Cloud WORM chuyên dụng:** Tốn phí giao dịch, độ trễ cao và phụ thuộc mạng Internet ngoài.
- **Phương án B3 – Mã hóa cấp trường `AES-256-GCM` + RDBMS Append-Only Trigger + Chuỗi băm mật mã `HMAC-SHA256` *(Được chọn)*:**
  - Các cột nhạy cảm (`diagnosis_enc`, `clinical_notes_enc`, `prescription_enc`, `lab_summary_enc`) được mã hóa xác thực bằng **`AES-256-GCM`** với IV 96-bit ngẫu nhiên và AAD gắn chặt vào `record.id`; khóa `DATA_ENCRYPTION_KEY` tách rời khỏi DB.
  - Bảng `audit_logs` được gắn **SQLite Trigger `BEFORE UPDATE` & `BEFORE DELETE`** chặn mọi lệnh sửa/xóa thông thường, đồng thời mỗi dòng thứ $i$ lưu `prev_hash` của dòng $i-1$ và tính:
    `current_hash = HMAC-SHA256(HMAC_AUDIT_SECRET, prev_hash | timestamp | actor_id | actor_role | facility_id | action | target | ip | status | details)`
    với khóa `HMAC_AUDIT_SECRET` nằm ngoài quyền truy cập của DBA.

---

## 3. Quyết định (Decision)

Nhóm quyết định áp dụng đồng bộ **Phương án A3 + Phương án B3**, tạo thành kiến trúc bảo mật phòng thủ chiều sâu 4 lớp (JWT → RBAC/ABAC/Consent → AES-256-GCM Field Encryption → Trigger + HMAC Hash Chain Audit).

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Đáp ứng 100% `ASR-03` & Nghị định 13/2023/NĐ-CP:** Thực nghiệm chứng minh lễ tân Đà Nẵng cố đọc hồ sơ Huế bị chặn `HTTP 403` trong `2.37 ms`, dữ liệu rò rỉ = `0 byte`, ghi vết vi phạm tức thì.
- **An toàn ngay cả khi lộ file DB hoặc DBA gian lận (`QAS-05`):** Truy vấn trực tiếp bảng `medical_records` chỉ thấy chuỗi bản mã `enc:v1:...`; nếu DBA dùng quyền root tắt tạm trigger để sửa 1 ký tự trong `audit_logs`, trình kiểm định `AuditVerifier` phát hiện chính xác dòng bị sửa trong `0.395 ms`.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1:** Không thể thực hiện tìm kiếm chuỗi `LIKE '%tiểu đường%'` trực tiếp bằng SQL trên các cột đã mã hóa `AES-256-GCM` với IV ngẫu nhiên.
  - *Giảm thiểu:* Các trường định danh phục vụ lọc nhanh (`patient_id`, `patient_mpi`, `facility_id`, `doctor_id`, `created_at`) được giữ làm chỉ mục quan hệ; khi cần thống kê dịch tễ cho Ban Giám đốc thì dùng bảng tổng hợp ẩn danh theo nhóm mã ICD-10 cấp cao.
- **Hệ quả tiêu cực 2:** Nếu làm mất `DATA_ENCRYPTION_KEY` thì toàn bộ dữ liệu bệnh án không thể khôi phục.
  - *Giảm thiểu:* Trong môi trường Production, quản lý khóa qua KMS/Vault có cơ chế sao lưu phân mảnh khóa (Key Rotation & Envelope Encryption).
