# ADR-006: Chiến lược Lưu trữ Tệp Kết quả Xét nghiệm (PDF, Ảnh Chẩn đoán Hình ảnh) bằng Encrypted Object Storage & Pre-signed URL

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-09 (Mốc M2)
- **Truy vết ASR (Traces to):** `ASR-03` (Bảo mật & chống truy cập trái phép dữ liệu nhạy cảm), `QAS-06` (Hiệu năng tải tóm tắt EHR), Ràng buộc `C-02` & `C-05` (Nghị định 13/2023/NĐ-CP)
- **Người đề xuất:** Trần Tiến Danh (Prototype Lead) & Lê Viết Nghĩa (Requirements Owner)
- **Người phản biện & phê duyệt:** Nguyễn Đức Bảo Hy, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

Một chức năng cốt lõi của MediLink là cho phép bác sĩ và bệnh nhân xem trực tuyến kết quả xét nghiệm máu (tệp PDF 0.5–3 MB) và ảnh siêu âm/X-quang (2–20 MB) trên toàn chuỗi 12 phòng khám (`UC-05`). Với ~2.000 lượt khám/ngày, lượng tệp nhị phân sinh ra có thể đạt **1–3 TB/năm**.

Nhóm cần quyết định nơi lưu trữ các tệp nhạy cảm này sao cho:
1. Không làm phình to và kéo sập hiệu năng của cơ sở dữ liệu quan hệ chính (`QAS-06`).
2. Đảm bảo tệp tin được mã hóa khi lưu trữ (*Encryption at-rest*) và **tuyệt đối không thể bị truy cập bằng cách đoán đường dẫn URL tĩnh** (`ASR-03`).

---

## 2. Các phương án đã cân nhắc (Options Considered)

### Phương án 1: Lưu trực tiếp dưới dạng cột nhị phân `BLOB` trong Cơ sở Dữ liệu Quan hệ
- **Ưu điểm:** Sao lưu chung 1 file DB duy nhất, dễ đảm bảo tính toàn vẹn tham chiếu.
- **Nhược điểm:**
  - Làm kích thước DB phình to gấp hàng trăm lần, gây tràn bộ nhớ đệm trang (Buffer Pool) và làm chậm nghiêm trọng các giao dịch đặt lịch (`bookings`) cũng như tra cứu bệnh án (`QAS-06`).
  - Mỗi lần tải file PDF 10 MB phải đọc toàn bộ mảng byte qua kết nối SQL làm nghẽn băng thông DB.

### Phương án 2: Lưu trên thư mục tĩnh cục bộ của Web Server (`public/uploads/*.pdf`)
- **Ưu điểm:** Đọc ghi nhanh, dễ lập trình.
- **Nhược điểm:**
  - **Rủi ro bảo mật nghiêm trọng:** Nếu cấu hình sai thư mục tĩnh hoặc lộ tên file, kẻ tấn công hoặc nhân viên cơ sở khác có thể tải trực tiếp file xét nghiệm mà bỏ qua hoàn toàn bước kiểm tra ABAC và Consent.
  - Không thể mở rộng ngang (*stateless scale-out*) khi chạy nhiều container `medilink-core` vì container B không thấy file vừa ghi trên ổ đĩa cục bộ của container A.

### Phương án 3: Tách riêng Lưu trữ Đối tượng Mã hóa (Encrypted Object Storage tương thích S3/MinIO) kết hợp Pre-signed URL ngắn hạn *(Được chọn)*
- **Mô tả:**
  - Cơ sở dữ liệu quan hệ (`medical_records`) chỉ lưu **khóa tham chiếu siêu dữ liệu nhẹ** (`lab_file_key = "lab-hue-5544.pdf"`).
  - Nội dung tệp nhị phân được mã hóa xác thực bằng **`AES-256-GCM`** (`encryptionService.encryptBuffer`) trước khi lưu vào kho Object Storage cách ly (`labStorageService.js` – ánh xạ S3/MinIO bucket trong Production hoặc volume cách ly `/data/lab-files/*.enc` trong Prototype).
  - Khi bác sĩ/bệnh nhân mở bệnh án và **vượt qua thành công lớp kiểm tra RBAC + ABAC + Consent**, `EhrService` mới sinh một **Pre-signed URL có chữ ký `HMAC-SHA256`** ràng buộc chặt 3 tham số `(fileKey, viewerId, expires)` với thời gian sống cực ngắn (**TTL = 120 giây**).
  - Mọi lượt tải file qua Pre-signed URL đều được xác thực chữ ký bằng hàm chống tấn công định thời (`crypto.timingSafeEqual`) và ghi nhận vào `audit_logs`.

---

## 3. Quyết định (Decision)

Nhóm quyết định chọn **Phương án 3: Lưu trữ tệp kết quả xét nghiệm trên Encrypted Object Storage tách rời RDBMS và cấp quyền tải qua Pre-signed URL ngắn hạn (TTL 120 giây)**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Giữ cho RDBMS cực kỳ gọn nhẹ & tốc độ cao:** Truy vấn tóm tắt hồ sơ bệnh án chỉ đọc vài trăm byte văn bản, không bị ảnh hưởng bởi kích thước file ảnh/PDF.
- **Bảo mật hai lớp cho tệp y tế nhạy cảm:** Tệp trên đĩa được mã hóa nhị phân `AES-256-GCM`; đường dẫn tải về tự hủy sau 120 giây và không thể sửa đổi tham số (`Test 3` chứng minh sửa 1 ký tự chữ ký lập tức bị chặn `HTTP 403`).
- **Dễ mở rộng hạ tầng:** Khi lên Production chỉ cần trỏ cấu hình bucket sang AWS S3 / Viettel Cloud Object Storage / MinIO nội bộ tại Việt Nam để tuân thủ Nghị định 13/2023/NĐ-CP.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1:** Không có giao dịch ACID chung giữa việc lưu dòng `medical_records` trong RDBMS và việc ghi file lên Object Storage (có thể sinh ra file mồ côi *orphan object* nếu ghi file xong nhưng bước lưu DB bị lỗi).
  - *Giảm thiểu:* Ghi đối tượng lên Object Storage trước, sau đó mới insert metadata vào DB; chạy tác vụ dọn dẹp (*Garbage Collection job*) hàng tuần để xóa các blob không có khóa tham chiếu quá 24 giờ.
- **Hệ quả tiêu cực 2:** Nếu người dùng mở trang bệnh án để treo quá 2 phút rồi mới bấm nút "Tải PDF", đường dẫn Pre-signed URL sẽ hết hạn (`403`).
  - *Giảm thiểu:* Giao diện client tự động gọi API làm mới Pre-signed URL khi người dùng bấm tải nếu phát hiện `expires < now`.
