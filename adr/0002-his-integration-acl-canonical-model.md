# ADR-002: Chiến lược Tích hợp HIS Dị thể qua Anti-Corruption Layer và Mô hình Chuẩn HL7 FHIR

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-06
- **Người đề xuất (Author):** Nguyễn Đức Bảo Hy (Lead Architect) & Trần Tiến Danh (Prototype Lead)
- **Người tham gia rà soát (Reviewers):** Lê Viết Nghĩa, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

Chuỗi 12 phòng khám hiện đang sử dụng 3 phần mềm quản lý phòng khám (HIS) khác nhau từ các nhà cung cấp bên thứ ba:
- **HIS Đà Nẵng:** Cung cấp API Web dạng REST / JSON.
- **HIS Huế:** Phần mềm di sản cũ (Legacy Client-Server), chỉ hỗ trợ trao đổi qua giao diện SOAP / XML.
- **HIS Quảng Nam:** Hệ thống chuyên biệt với định dạng dữ liệu tự chế (Custom REST/RPC).
Ngoài ra, yêu cầu ASR-04 đặt ra là khi chuỗi mua lại phòng khám mới và cần kết nối HIS thứ 4, thời gian tích hợp không được vượt quá 2 tuần công (≤ 10 ngày làm việc) và tuyệt đối không được sửa đổi mã nguồn nghiệp vụ lõi (Core Domain).

---

## 2. Các phương án được cân nhắc (Options Considered)

1. **Phương án 1: Gọi trực tiếp (Point-to-Point / Direct Integration)**
   - *Mô tả:* Trong logic đặt lịch (`BookingService`), viết các câu lệnh `if-else` kiểm tra `facility_id` và trực tiếp tạo request HTTP tương ứng tới từng HIS.
   - *Ưu điểm:* Code nhanh ở những ngày đầu tiên.
   - *Nhược điểm:* Vi phạm nghiêm trọng nguyên tắc Single Responsibility và Open-Closed; mã nguồn Core bị vấy bẩn bởi định dạng dữ liệu ngoài (Data corruption); mỗi lần thêm HIS mới phải sửa Core và kiểm thử lại toàn bộ hệ thống; rủi ro sập hệ thống rất cao.

2. **Phương án 2: Sử dụng trục tích hợp Enterprise Service Bus (ESB)**
   - *Mô tả:* Sử dụng hệ thống trung gian như WSO2 ESB hoặc Apache Camel để trung chuyển và chuyển đổi định dạng bản tin.
   - *Ưu điểm:* Chuẩn hóa công nghiệp, hỗ trợ định tuyến mạnh mẽ.
   - *Nhược điểm:* Quá nặng nề và phức tạp cho quy mô chuỗi 12 phòng khám; tốn kém chi phí máy chủ hạ tầng; tạo thêm một điểm nghẽn (Single Point of Failure); đội ngũ 4 sinh viên không đủ thời gian làm chủ công nghệ ESB trong 15 tuần.

3. **Phương án 3: Thiết kế Lớp Chống Thối rữa (Anti-Corruption Layer - ACL) kết hợp Adapter Pattern và Mô hình Dữ liệu Chuẩn (Canonical Model - HL7 FHIR R4) (Lựa chọn)**
   - *Mô tả:* Xây dựng lớp ACL nằm giữa Core Domain và các HIS bên ngoài:
     - **Canonical Model:** Sử dụng chuẩn dữ liệu y tế quốc tế **HL7 FHIR Release 4** (Resource `Appointment`, `Patient`, `Observation`) làm ngôn ngữ chung nội bộ.
     - **Interface chuẩn `IHisIntegrationAdapter`:** Định nghĩa các phương thức trừu tượng (`syncAppointment`, `cancelAppointment`, `checkHealth`).
     - **Adapter cụ thể:** Mỗi HIS có một Adapter riêng (`DaNangHisJsonAdapter`, `HueHisXmlAdapter`, `QuangNamHisAdapter`) chịu trách nhiệm dịch thuật 2 chiều giữa định dạng riêng của HIS đó và HL7 FHIR Canonical Model.
     - **Circuit Breaker:** Tích hợp bộ ngắt mạch tại từng Adapter để cách ly sự cố.

---

## 3. Quyết định (Decision)

Nhóm quyết định lựa chọn **Phương án 3: Thiết kế Lớp Chống Thối rữa (Anti-Corruption Layer) kết hợp Adapter Pattern và Chuẩn dữ liệu HL7 FHIR R4**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive):
- Bảo vệ tuyệt đối Core Business Domain khỏi sự biến dị của các hệ thống ngoài (Zero data corruption).
- Thỏa mãn hoàn toàn kịch bản ASR-04: Khi tích hợp HIS thứ 4, chỉ cần tạo mới 1 Adapter class triển khai `IHisIntegrationAdapter` và đăng ký vào Adapter Factory. Mã nguồn Core thay đổi: 0 dòng. Thời gian tích hợp rút ngắn xuống dưới 5 ngày làm việc.
- Chuẩn hóa theo HL7 FHIR giúp nền tảng MediLink sẵn sàng liên thông với Cổng Dữ liệu Y tế Quốc gia của Bộ Y tế trong tương lai.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations):
- *Chi phí chuyển đổi dữ liệu (Mapping Overhead):* Việc chuyển đổi dữ liệu 2 lần (Internal Model -> HL7 FHIR -> HIS Specific Payload) làm tăng thời gian xử lý khoảng 2-5ms.
  - *Biện pháp:* Sử dụng thư viện ánh xạ đối tượng tối ưu bộ nhớ trong Node.js (Object Spread / Fast JSON Mapping), hoàn toàn không ảnh hưởng tới mục tiêu p95 < 800ms.
