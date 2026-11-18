# ADR-002: Chiến lược Tích hợp HIS Dị thể qua Anti-Corruption Layer và Mô hình Dữ liệu Chuẩn HL7 FHIR R4

- **Trạng thái (Status):** Partially Superseded by [ADR-007](0007-v2-outbox-rate-controlled-recovery.md) *(Giữ nguyên kiến trúc ACL + HL7 FHIR R4 Canonical Model; phần cơ chế xử lý lỗi đồng bộ trực tiếp ở v1 được thay thế bằng Transactional Outbox có điều tiết nhịp độ ở v2 tại Mốc M3)*
- **Ngày quyết định (Date):** 2026-11-06 (Mốc M2) — Cập nhật trạng thái: 2026-11-12 (Mốc M3)
- **Truy vết ASR (Traces to):** `ASR-04` (Thêm HIS thứ 4 ≤ 2 tuần công, 0 dòng sửa Core), `ASR-02` (Cách ly lỗi HIS)
- **Người đề xuất:** Nguyễn Đức Bảo Hy (Lead Architect) & Trần Tiến Danh (Prototype Lead)
- **Người phản biện & phê duyệt:** Lê Viết Nghĩa, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

12 phòng khám trực thuộc chuỗi hiện vận hành trên 3 nhóm phần mềm HIS có giao thức và mô hình dữ liệu hoàn toàn khác biệt:
1. **HIS Cụm Đà Nẵng (5 cơ sở):** REST/JSON hiện đại, định danh bệnh nhân bằng chuỗi UUID (`pat_uuid_dn_91a2f0`), thời gian chuẩn ISO-8601.
2. **HIS Cụm Huế (4 cơ sở):** Hệ thống di sản SOAP 1.1 / XML (`AppointmentService.asmx`), định danh bệnh nhân bằng mã y tế địa phương (`<MaBenhNhanYTe>HUE-BN-00921</MaBenhNhanYTe>`).
3. **HIS Cụm Quảng Nam (3 cơ sở):** Giao diện Custom RPC/JSON gọi thủ tục lưu trữ (`sp_ghi_nhan_lich_hen_online`), định danh bệnh nhân bằng số nguyên tự tăng (`ma_bn_noi_bo: 88412`).

Chuỗi phòng khám có kế hoạch mua bán & sáp nhập (M&A) thêm cơ sở thứ 13 (sử dụng HIS thứ 4) và yêu cầu tích hợp xong trong **≤ 2 tuần công (10 ngày làm việc)** mà không phải sửa đổi logic nghiệp vụ đặt lịch hay cơ sở dữ liệu lõi (`ASR-04`).

---

## 2. Các phương án đã cân nhắc (Options Considered)

### Phương án 1: Gọi trực tiếp từng HIS từ Core Service (Direct Point-to-Point Integration)
- **Mô tả:** Trong `BookingService`, dùng câu lệnh rẽ nhánh `switch (facilityId)` để tự ghép chuỗi JSON/XML và gọi HTTP tới từng HIS.
- **Ưu điểm:** Không cần tạo lớp trung gian lúc mới bắt đầu.
- **Nhược điểm:**
  - Làm ô nhiễm nghiêm trọng Core Domain bởi các khái niệm ngoại lai (`MaBenhNhanYTe`, `ma_bn_noi_bo`, thẻ SOAP XML).
  - Vi phạm nguyên tắc Open-Closed: mỗi khi thêm HIS thứ 4 hoặc khi 1 HIS đổi tên trường, phải sửa trực tiếp `BookingService`, dẫn tới nguy cơ lỗi hồi quy cho cả 12 phòng khám.

### Phương án 2: Adapter per HIS ánh xạ thẳng vào Mô hình Nội bộ (Adapter Pattern without Canonical Model)
- **Mô tả:** Tạo interface `IHisAdapter` và viết Adapter riêng cho từng HIS, nhưng dữ liệu đầu vào/đầu ra của Adapter dùng trực tiếp cấu trúc bảng nội bộ của MediLink (`bookings`, `users`).
- **Ưu điểm:** Tách được code gọi HTTP/SOAP ra khỏi `BookingService`.
- **Nhược điểm:**
  - Chưa giải quyết triệt để bài toán **bất đồng bộ ngữ nghĩa y tế** và **ánh xạ đa mã bệnh nhân** (cùng 1 bệnh nhân Nguyễn Văn An nhưng ở Đà Nẵng mang mã UUID, ở Huế mang mã `HUE-BN-00921`, ở Quảng Nam mang số `88412`).
  - Khi cấu trúc bảng nội bộ của MediLink thay đổi, toàn bộ các HIS Adapters đều bị gãy theo; đồng thời khi đối tác mới (như phòng khám quốc tế hoặc Cổng Bộ Y tế) dùng chuẩn y tế quốc tế HL7 FHIR thì phải viết lại bộ quy chiếu từ đầu.

### Phương án 3: Anti-Corruption Layer (ACL) + Canonical Data Model tham chiếu HL7 FHIR R4 (`Patient`, `Appointment`) *(Được chọn)*
- **Mô tả:** Xây dựng một lớp chống thối rữa (`src/core/acl/`) gồm 4 thành phần:
  1. **Master Patient Index (MPI) Mapping (`patient_his_mappings`):** Liên kết mã định danh toàn chuỗi (`MPI-2026-0001`) với mã bệnh nhân cục bộ của từng cơ sở.
  2. **Canonical Model Mapper (`canonicalModel.js`):** Chuẩn hóa dữ liệu trung gian theo chuẩn y tế quốc tế **HL7 FHIR Release 4** với hai tài nguyên cốt lõi `Patient` (chứa mảng `identifier[]` gồm cả MPI và mã HIS địa phương) và `Appointment` (chứa `participant[]`, `status`, `start`).
  3. **Port Interface (`BaseHisAdapter`) & Pluggable Adapters:** Mỗi loại HIS có một Adapter độc lập dịch từ bộ chuẩn FHIR `{ Patient, Appointment }` sang định dạng đích (`DaNangJsonAdapter`, `HueXmlAdapter`, `QuangNamCustomAdapter`).
  4. **Dispatcher Registry (`hisDispatcher.js`):** Định tuyến động theo `facility_id`.

---

## 3. Quyết định (Decision)

Nhóm chọn **Phương án 3: Thiết kế lớp tích hợp theo mẫu Anti-Corruption Layer (ACL) kết hợp Adapter Pattern và Mô hình Dữ liệu Chuẩn HL7 FHIR R4 (`Patient`, `Appointment`)**.

Về chế độ giao tiếp theo từng luồng:
- **Luồng đặt lịch (`MediLink → HIS`):** Ở thiết kế v1 (M2), gọi đồng bộ có giới hạn thời gian (`Timeout = 1.5s`) để lấy mã phiếu khám ngay. *(Lưu ý: Tại M3, phần xử lý khi HIS lỗi/timeout được nâng cấp bởi **ADR-007** sang cơ chế kết hợp Circuit Breaker + Transactional Outbox bất đồng bộ).*
- **Luồng tra cứu slot trống:** Đọc từ Read-Through Cache & DB của MediLink (không gọi trực tiếp HIS trên mỗi lượt xem của bệnh nhân).
- **Luồng đồng bộ kết quả xét nghiệm & gửi nhắc lịch:** Bất đồng bộ qua hàng đợi.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Cô lập tuyệt đối miền nghiệp vụ lõi:** `BookingService` và `EhrService` chỉ làm việc với thực thể sạch của MediLink và mã chuẩn `MPI`, hoàn toàn miễn nhiễm với XML hay RPC cũ kỹ của các phòng khám.
- **Đạt chuẩn mở rộng `ASR-04`:** Khi tích hợp thêm phòng khám thứ 4 dùng chuẩn HL7 FHIR R4 (`FhirGenericAdapter`), số dòng code phải sửa trong Core Domain bằng **0 dòng**, thời gian thực hiện thực tế chỉ tốn vài ngày thay vì hàng tháng.
- **Sẵn sàng liên thông quốc gia:** Việc bám sát tài nguyên `Patient` và `Appointment` của HL7 FHIR R4 giúp hệ thống dễ dàng tích hợp với Hồ sơ Sức khỏe Điện tử của Bộ Y tế về sau.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1:** Phát sinh chi phí chuyển đổi dữ liệu 2 bước (`Internal Entity → FHIR R4 Bundle → HIS Wire Format`) làm tăng nhẹ CPU và độ trễ khoảng `1–3 ms`/request.
  - *Giảm thiểu:* Chỉ ánh xạ các trường thiết yếu của chuẩn FHIR R4 (` Minimal Viable FHIR Profile`), không nạp các thư viện kiểm tra lược đồ nặng nề.
- **Hệ quả tiêu cực 2 (Phát hiện tại ATAM M3 → Dẫn tới ADR-007):** Ở bản v1, nếu chỉ gọi đồng bộ trực tiếp qua ACL mà HIS Huế bị sập kéo dài 2 giờ, các lịch hẹn phát sinh trong thời gian sập có nguy cơ thất bại hoặc khi HIS Huế sống lại sẽ bị dội tải đồng loạt (*Thundering Herd*). Nhóm đã khắc phục triệt để trong **ADR-007**.
