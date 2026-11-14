# M1 – Architectural Drivers: Hệ thống MediLink

## 1. Giới thiệu tổng quan và Bối cảnh kinh doanh

Chuỗi 12 phòng khám tư nhân tại khu vực miền Trung (Đà Nẵng, Huế, Quảng Nam) đang trên đà mở rộng nhanh chóng. Hiện tại, mỗi phòng khám hoạt động như một ốc đảo thông tin độc lập:
- Quy trình tiếp nhận bệnh nhân chủ yếu qua gọi điện thoại hotline hoặc ghi chép thủ công bằng Excel.
- Mỗi cơ sở tự trang bị một hệ thống Quản lý Bệnh viện / Phòng khám (HIS) riêng biệt từ các nhà cung cấp phần mềm khác nhau (ví dụ: HIS Đà Nẵng dùng công nghệ Web/REST, HIS Huế dùng phần mềm Desktop/SOAP XML cũ, HIS Quảng Nam dùng hệ thống cơ sở dữ liệu chuyên biệt).
- Hậu quả: Bệnh nhân mất nhiều thời gian chờ đợi, thường xuyên xảy ra tình trạng đặt trùng lịch (double-booking), hồ sơ bệnh án bị phân mảnh (bệnh nhân khám ở Huế nhưng sang Đà Nẵng điều trị thì bác sĩ không xem được lịch sử), lãnh đạo chuỗi không có số liệu tổng thể kịp thời.

**Nền tảng MediLink** ra đời nhằm cung cấp một giải pháp kiến trúc tích hợp tập trung, cho phép bệnh nhân đặt lịch trực tuyến, theo dõi tiến trình khám, tra cứu hồ sơ sức khỏe điện tử (EHR), đồng thời liên thông dữ liệu lịch hẹn với các phần mềm HIS hiện hữu mà không làm gián đoạn quy trình nghiệp vụ tại từng phòng khám.

---

## 2. Mục tiêu kinh doanh (Business Goals)

| Mã | Mục tiêu kinh doanh | Chỉ số đo lường (KPI) | Thời hạn đạt |
|:---:|---------------------|-----------------------|:------------:|
| **BG-01** | **Chuyển đổi số toàn diện kênh đặt lịch hẹn:** Tăng tỷ lệ bệnh nhân đặt lịch qua ứng dụng trực tuyến, giảm tải cho nhân viên tổng đài và lễ tân tại quầy. | Tối thiểu **60%** tổng lượt đặt khám toàn hệ thống được thực hiện qua MediLink; giảm thời gian xác nhận lịch hẹn từ 15 phút (gọi điện) xuống **dưới 10 giây**. | 6 tháng sau golive |
| **BG-02** | **Loại bỏ hoàn toàn sự cố đặt trùng lịch:** Nâng cao sự hài lòng của bệnh nhân và bảo vệ uy tín chuyên môn của bác sĩ. | Tỷ lệ xung đột lịch khám (double-booking) giảm về **0.00%**, kể cả trong các khung giờ cao điểm có nhiều người cùng thao tác. | Ngay khi triển khai |
| **BG-03** | **Liên thông hồ sơ sức khỏe điện tử (EHR):** Giúp bệnh nhân và bác sĩ dễ dàng truy cập lịch sử điều trị, kết quả xét nghiệm, đơn thuốc trên toàn chuỗi 12 cơ sở. | **100%** hồ sơ khám và kết quả xét nghiệm được số hóa và liên kết theo mã định danh bệnh nhân duy nhất (MPI); thời gian tải hồ sơ bệnh án **< 2 giây**. | 3 tháng sau golive |
| **BG-04** | **Bảo tồn đầu tư công nghệ hiện có (Cost-Efficiency & Interoperability):** Tích hợp với 3 loại HIS hiện hữu và mở rộng thêm các phòng khám mới mà không cần thay thế phần mềm cũ tại cơ sở. | Chi phí và thời gian tích hợp thêm một cơ sở mới dùng HIS khác biệt không vượt quá **2 tuần công** (≤ 10 ngày làm việc). | Suốt vòng đời hệ thống |
| **BG-05** | **Đảm bảo tính sẵn sàng và vận hành liên tục:** Đảm bảo hệ thống đặt lịch phục vụ người dân 24/7, cách ly sự cố cục bộ. | Tính sẵn sàng của toàn hệ thống đạt tối thiểu **99.5%** trong giờ làm việc (7:00 – 21:00); sự cố mất mạng hoặc lỗi máy chủ tại 1 cơ sở không làm gián đoạn 11 cơ sở còn lại. | Suốt vòng đời hệ thống |

---

## 3. Các bên liên quan và Mối quan tâm (Stakeholders & Concerns)

| STT | Bên liên quan (Stakeholder) | Vai trò & Trách nhiệm | Mối quan tâm chính | Quality Attribute quan tâm nhất |
|:---:|----------------------------|-----------------------|-------------------|---------------------------------|
| 1 | **Bệnh nhân (Patients)** | Khách hàng sử dụng ứng dụng di động/web để tìm bác sĩ, đặt lịch, thanh toán tạm ứng, xem bệnh án. | Giao diện nhanh, thao tác đơn giản, không bị hủy lịch đột ngột, thông tin bệnh án tuyệt đối không bị lộ ra ngoài. | **Usability, Performance, Privacy** |
| 2 | **Bác sĩ (Doctors)** | Khám chữa bệnh, xem bệnh sử, ghi chú chẩn đoán, kê đơn. | Lịch làm việc chính xác, không bị xếp trùng giờ, xem kết quả xét nghiệm nhanh chóng, thao tác mượt mà trong phòng khám. | **Consistency, Availability, Performance** |
| 3 | **Lễ tân / Thu ngân (Receptionists)** | Tiếp đón tại quầy, đối soát bệnh nhân đến khám, thu tiền cọc/viện phí, hỗ trợ đặt lịch trực tiếp. | Thao tác tra cứu nhanh; chỉ quản lý dữ liệu thuộc cơ sở mình; không bị lỗi hệ thống làm dồn ứ bệnh nhân tại sảnh chờ. | **Availability, Security (Access Control)** |
| 4 | **Quản lý cơ sở (Clinic Managers)** | Điều hành hoạt động phòng khám chi nhánh, phân công ca trực bác sĩ, kiểm soát chất lượng dịch vụ. | Báo cáo công suất khám chi nhánh chính xác theo thời gian thực; hệ thống hoạt động ổn định không phụ thuộc đường truyền chập chờn. | **Availability, Reliability** |
| 5 | **Ban Giám đốc (Executive Board)** | Chủ đầu tư, định hướng chiến lược phát triển chuỗi, tối ưu hóa doanh thu và mở rộng thị trường. | Dashboard tài chính/vận hành trực quan; chi phí đầu tư CNTT tối ưu; khả năng mở rộng thêm cơ sở mới nhanh chóng; không vi phạm pháp luật. | **Modifiability, Security (Compliance), Cost** |
| 6 | **Bộ phận IT / Vận hành (IT Ops & Dev)** | Triển khai, giám sát máy chủ, tích hợp phần mềm HIS, bảo trì và xử lý sự cố. | Dễ bảo trì, cấu trúc code rõ ràng, có cơ chế cách ly lỗi (fault isolation), log kiểm toán đầy đủ để điều tra khi có sự cố. | **Maintainability, Modifiability, Observability** |
| 7 | **Cơ quan quản lý Y tế & Pháp luật** | Thanh tra chuyên ngành Y tế, Cục An toàn Thông tin (Bộ TT&TT / Bộ Công an). | Tuân thủ quy định lưu trữ bệnh án điện tử, tuân thủ nghiêm ngặt **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân. | **Security, Privacy, Auditability** |

### Tự kiểm tra Bước 3: Hai stakeholder nào có mối quan tâm xung đột nhau?
> **Trả lời:**
> Hai bên liên quan có mối quan tâm xung đột rõ nét nhất là **Bệnh nhân / Bác sĩ** (mong muốn truy cập dữ liệu hồ sơ bệnh án thật nhanh chóng, tiện lợi, linh hoạt mọi lúc mọi nơi trên điện thoại) và **Cơ quan quản lý Y tế / Bộ phận An ninh thông tin (IT Security)** (đòi hỏi quy trình kiểm soát bảo mật khắt khe, xác thực nhiều lớp, phân quyền ngặt nghèo theo cơ sở khám, mã hóa nhiều tầng và lưu vết kiểm toán chi tiết).
> - *Nếu thiên về tính tiện dụng (Usability):* Người dùng có xu hướng bỏ qua bước xác thực, cấp quyền rộng cho nhân viên quầy để thao tác nhanh, dẫn đến nguy cơ rò rỉ dữ liệu y tế nhạy cảm (vi phạm Nghị định 13/2023).
> - *Nếu siết chặt bảo mật tối đa:* Thời gian tải hồ sơ có thể bị chậm (ảnh hưởng Performance), bác sĩ phải thao tác nhiều bước xác thực trong lúc cấp cứu/khám bệnh. Kiến trúc MediLink giải quyết xung đột này bằng cách áp dụng **Contextual ABAC** (kiểm tra tự động quyền theo cơ sở tại middleware) kết hợp **Token Caching** để vừa đảm bảo độ trễ < 2 giây, vừa đảm bảo 100% ranh giới an toàn.

---

## 4. Use Cases chính và Ràng buộc hệ thống (Use Cases & Constraints)

### 4.1. Danh sách Use Cases chính (6–10 Use Cases)

| Mã | Tên Use Case | Tác nhân chính | Tóm tắt luồng nghiệp vụ |
|:---:|--------------|----------------|--------------------------|
| **UC-01** | **Tìm kiếm và Đặt lịch khám** | Bệnh nhân | Bệnh nhân tìm bác sĩ theo chuyên khoa/cơ sở/ngày khám; chọn khung giờ trống; cung cấp thông tin lý do khám; hệ thống giữ chỗ (lock), kiểm tra xung đột và tạo lịch hẹn tạm thời. |
| **UC-02** | **Thanh toán đặt cọc lịch hẹn** | Bệnh nhân | Bệnh nhân thực hiện chuyển khoản hoặc thanh toán ví điện tử cho khoản cọc khám (giả lập cổng thanh toán). Sau khi thanh toán thành công, trạng thái lịch chuyển sang "CONFIRMED". |
| **UC-03** | **Đồng bộ lịch hẹn sang phần mềm HIS** | Hệ thống (Adapter) | Ngay khi lịch hẹn được xác nhận, hệ thống gửi dữ liệu thông qua Anti-Corruption Layer (ACL) sang HIS của cơ sở tiếp nhận; HIS trả về mã tiếp đón nội bộ. |
| **UC-04** | **Nhắc lịch hẹn tự động** | Hệ thống (Notification Worker) | Hệ thống quét các lịch hẹn sắp diễn ra (trước 24h và 2h) và gửi tin nhắn nhắc lịch qua SMS / Zalo / Email kèm mã QR check-in. |
| **UC-05** | **Đổi / Hủy lịch khám** | Bệnh nhân, Bác sĩ, Lễ tân | Bệnh nhân hủy lịch trước giờ khám quy định; hệ thống giải phóng slot trống, hoàn cọc (nếu hợp lệ) và thông báo đồng bộ hủy sang HIS cơ sở. |
| **UC-06** | **Tra cứu Hồ sơ Sức khỏe Điện tử (EHR)** | Bệnh nhân, Bác sĩ | Bác sĩ truy cập bệnh sử, đơn thuốc cũ, kết quả xét nghiệm (PDF/ảnh) của bệnh nhân trong phiên khám bệnh; Bệnh nhân tra cứu lịch sử khám cá nhân. |
| **UC-07** | **Cập nhật bệnh án và Kê đơn thuốc** | Bác sĩ | Bác sĩ nhập chẩn đoán ICD-10, chỉ định cận lâm sàng và đơn thuốc điện tử sau phiên khám; dữ liệu được ký số và đồng bộ về MediLink Core & HIS. |
| **UC-08** | **Tra cứu bệnh nhân tại quầy tiếp đón** | Lễ tân | Lễ tân quét mã QR check-in hoặc tìm kiếm theo số điện thoại; hệ thống kiểm tra phân quyền cơ sở (`facility_id`), hiển thị lịch hẹn ngày hôm nay để in phiếu khám. |

---

### 4.2. Phân loại dữ liệu y tế và Ràng buộc pháp lý (Nghị định 13/2023/NĐ-CP)

Dữ liệu xử lý trong MediLink được phân loại chặt chẽ thành 3 cấp độ:

| Cấp độ | Loại dữ liệu | Ví dụ cụ thể trong MediLink | Yêu cầu kiểm soát kiến trúc |
|:---:|--------------|-----------------------------|-----------------------------|
| **Cấp 1** | **Dữ liệu công khai (Public)** | Danh sách cơ sở phòng khám, bảng giá niêm yết, chuyên khoa, danh sách bác sĩ, khung giờ khám mở. | Có thể lưu trữ và phân phối qua CDN/Cache công khai; không cần xác thực để đọc. |
| **Cấp 2** | **Dữ liệu cá nhân cơ bản (General Personal Data)** | Họ và tên bệnh nhân, số điện thoại, ngày sinh, giới tính, địa chỉ liên hệ. | Mã hóa khi truyền tải (TLS 1.3); chỉ hiển thị cho nhân sự có thẩm quyền; mã hóa cột lưu trữ (AES-256). |
| **Cấp 3** | **Dữ liệu cá nhân nhạy cảm (Sensitive Personal Data)** | Tiền sử bệnh lý, nhóm máu, kết quả xét nghiệm máu/HIV/viêm gan, hình ảnh X-quang/CT, chẩn đoán, đơn thuốc. | Tuân thủ Điều 2 & Điều 17 Nghị định 13/2023/NĐ-CP: Phải có sự đồng thuận rõ ràng của chủ thể dữ liệu; mã hóa lưu trữ cấp độ ứng dụng; ghi log kiểm toán 100% mọi hành vi đọc/ghi; ranh giới cách ly nghiêm ngặt. |

### Rút ra ≥ 3 Ràng buộc kỹ thuật (Technical Constraints) từ Nghị định 13/2023/NĐ-CP:
1. **Constraint C-01 (Mã hóa đa tầng và Tách biệt khóa):** Toàn bộ dữ liệu cá nhân nhạy cảm (chẩn đoán y tế, tiền sử bệnh, kết quả xét nghiệm) phải được mã hóa khi truyền tải (In-transit: TLS 1.3 bắt buộc) và khi lưu trữ (At-rest: mã hóa trường nhạy cảm bằng thuật toán AES-256-GCM với khóa mã hóa tách biệt khỏi máy chủ cơ sở dữ liệu).
2. **Constraint C-02 (Kiểm soát truy cập theo ngữ cảnh & Nguyên tắc đặc quyền tối thiểu):** Áp dụng mô hình RBAC kết hợp ABAC với thuộc tính cơ sở (`facility_id`). Tuyệt đối cấm lễ tân tại một cơ sở chi nhánh truy cập hoặc hiển thị thông tin bệnh án của bệnh nhân không đăng ký khám tại cơ sở của mình (ngăn chặn rò rỉ dữ liệu ngang hàng - Horizontal Privilege Escalation).
3. **Constraint C-03 (Hệ thống Audit Log bất biến - Append-Only & Tamper-Evident):** 100% thao tác truy vấn (Read), tạo mới (Create), chỉnh sửa (Update), chia sẻ hoặc xuất dữ liệu bệnh án phải được ghi nhận vào nhật ký kiểm toán với đầy đủ thông tin: `Timestamp, User_ID, Role, Action, Resource_ID, IP_Address, MAC/Device`. Bảng Audit Log phải được bảo vệ bằng cơ chế băm liên hoàn (HMAC Hash Chaining), quyền ghi chỉ được thêm mới (Append-only), không cho phép bất kỳ ai (kể cả Database Administrator) sửa hoặc xóa.

---

### 4.3. Các ràng buộc kỹ thuật & nghiệp vụ khác (Other Constraints)

| Mã | Loại ràng buộc | Chi tiết ràng buộc | Tác động kiến trúc |
|:---:|----------------|--------------------|-------------------|
| **C-04** | Kỹ thuật / Di sản | 3 hệ thống HIS hiện hữu là phần mềm đóng gói sẵn, không cho phép can thiệp vào cơ sở dữ liệu nội bộ. | Bắt buộc phải xây dựng lớp tích hợp Anti-Corruption Layer (ACL) và Adapter riêng biệt cho từng HIS. |
| **C-05** | Ngân sách & Tài nguyên | Dự án xây dựng kiến trúc và prototype cho đồ án nhóm (4 thành viên), chạy thử nghiệm trên môi trường chuẩn container hóa. | Ưu tiên kiến trúc Modular Monolith có ranh giới module rõ ràng thay vì triển khai hàng chục Microservices phức tạp; đóng gói toàn bộ qua Docker Compose. |
| **C-06** | Chuẩn công nghiệp | Giao diện chuẩn hóa dữ liệu hồ sơ và lịch hẹn phải tương thích với định dạng y tế quốc tế. | Áp dụng mô hình dữ liệu chuẩn (Canonical Model) tham chiếu chuẩn **HL7 FHIR Release 4** (Resources: `Appointment`, `Patient`, `Observation`, `Encounter`). |

### Tự kiểm tra Bước 4: Constraint khác Requirement ở điểm nào? Cho ví dụ trong đề tài.
> **Trả lời:**
> - **Requirement (Yêu cầu chức năng / chất lượng):** Là điều mà hệ thống *phải làm được* hoặc *đặc tính hệ thống phải sở hữu* để thỏa mãn nhu cầu người dùng (ví dụ: "Bệnh nhân có thể đổi lịch khám trước 24 giờ", "Thời gian phản hồi tìm kiếm bác sĩ p95 < 500ms"). Nhóm kỹ sư có quyền tự do lựa chọn giải pháp, công nghệ để đáp ứng yêu cầu này.
> - **Constraint (Ràng buộc):** Là một *giới hạn hoặc điều kiện bắt buộc từ bên ngoài* (về công nghệ, pháp lý, thời gian, ngân sách, môi trường hiện hữu) mà đội ngũ thiết kế *không được quyền thay đổi* và phải tuân theo khi đưa ra các quyết định kiến trúc.
> - **Ví dụ thực tế trong đề tài MediLink:**
>   - *Requirement:* "Hệ thống phải đặt được lịch hẹn tại phòng khám Huế." (Nhóm có thể chọn bất kỳ giao thức nào giữa MediLink và Client).
>   - *Constraint:* "Phần mềm HIS tại phòng khám Huế là hệ thống di sản (legacy) chỉ giao tiếp qua cổng dịch vụ SOAP/XML cố định, không được phép thay đổi mã nguồn HIS." -> Đây là ràng buộc bất di bất dịch, buộc nhóm kiến trúc sư phải thiết kế riêng một `HueHisXmlAdapter` mà không được phép đòi hỏi phía phòng khám Huế phải viết lại API sang REST/JSON.

---

## 5. Kịch bản Thuộc tính Chất lượng (Quality Attribute Scenarios)

Dưới đây là 6 kịch bản chất lượng trọng tâm, được mô tả đầy đủ 6 thành phần tiêu chuẩn: **Source, Stimulus, Artifact, Environment, Response, Response Measure**.

```
  +-----------+    Stimulus     +--------------+   Response    +------------------+
  |  Source   | --------------> |   Artifact   | ------------> |     Response     |
  |  (Nguồn)  |                 | (Thành phần) |               |     (Đáp ứng)    |
  +-----------+                 +--------------+               +------------------+
        |                              |                                 |
   Environment                 Environment Context               Response Measure
   (Môi trường)                                                  (Chỉ số đo lường)
```

---

### Kịch bản 1 (ASR-01): Chống đặt trùng lịch khám khi chịu tải cạnh tranh cao (Consistency & Concurrency)
- **Source:** 50 bệnh nhân đồng thời.
- **Stimulus:** Đồng thời bấm nút xác nhận đặt lịch vào cùng 1 khung giờ duy nhất (ví dụ: 08:00 - 08:30 ngày 20/11) của cùng 1 bác sĩ chuyên khoa Tim mạch tại cơ sở Đà Nẵng.
- **Artifact:** Booking Service & Slot Allocation Engine của MediLink.
- **Environment:** Giờ mở cổng đăng ký khám online (đỉnh tải cao điểm), điều kiện vận hành bình thường.
- **Response:** Hệ thống kích hoạt cơ chế khóa phân tán (Distributed Lock) và kiểm tra nguyên tử; chỉ duy nhất 1 yêu cầu thành công được cấp phát lịch hẹn; 49 yêu cầu còn lại bị từ chối lịch sự, giải phóng khóa tức thì và gợi ý các khung giờ trống khác.
- **Response Measure:**
  - Số lượng lịch hẹn được ghi nhận thành công: **Đúng 1** (Tỷ lệ double-booking = **0.00%**).
  - 49 yêu cầu còn lại nhận thông báo hết chỗ (HTTP 409 Conflict) với thời gian phản hồi p95 **< 800ms**.
  - Không xảy ra deadlock hay rò rỉ tài nguyên khóa.

---

### Kịch bản 2 (ASR-02): Khả năng chịu lỗi và vận hành liên tục khi HIS cơ sở gặp sự cố (Availability & Fault Tolerance)
- **Source:** Sự cố hạ tầng tại phòng khám chi nhánh (đứt cáp mạng quang hoặc sập máy chủ HIS cục bộ).
- **Stimulus:** Hệ thống HIS của cơ sở Huế đột ngột ngừng hoạt động và không thể kết nối trong vòng 2 giờ liên tục.
- **Artifact:** Anti-Corruption Layer, Hue HIS Adapter, Booking Service.
- **Environment:** Giờ làm việc hành chính cao điểm (9:00 - 11:00 sáng).
- **Response:** Bộ giám sát Circuit Breaker tại Hue HIS Adapter phát hiện lỗi liên tiếp và chuyển sang trạng thái *OPEN*; hệ thống kích hoạt cơ chế Fallback (thông báo cơ sở Huế tạm ngưng tiếp nhận đặt lịch mới trực tuyến, ghi nhận yêu cầu vào hàng đợi chờ xử lý); đồng thời cô lập hoàn toàn lỗi, đảm bảo các yêu cầu đặt lịch tại 11 cơ sở còn lại (Đà Nẵng, Quảng Nam) tiếp tục diễn ra bình thường.
- **Response Measure:**
  - Tính khả dụng của luồng đặt lịch tại các cơ sở khác: **100% không bị ảnh hưởng** (Zero cascading failure).
  - Độ trễ của yêu cầu khi Circuit Breaker ở trạng thái OPEN: **< 50ms** (Fast-fail, không để người dùng chờ đợi connection timeout 30s).
  - Toàn hệ thống duy trì Availability tổng thể **≥ 99.5%**.

---

### Kịch bản 3 (ASR-03): Ngăn chặn truy cập trái phép hồ sơ y tế liên cơ sở (Security & Privacy Compliance)
- **Source:** Nhân viên lễ tân cơ sở phòng khám Đà Nẵng (người dùng nội bộ hợp lệ nhưng có ý định xấu hoặc nhầm lẫn).
- **Stimulus:** Cố gắng gửi request API truy xuất xem kết quả xét nghiệm và bệnh án chi tiết của một bệnh nhân đang điều trị độc quyền tại cơ sở Huế.
- **Artifact:** API Gateway, Authentication Middleware, Access Control Engine (RBAC + ABAC Policy Validator).
- **Environment:** Vận hành bình thường, nhân viên đang đăng nhập với JWT token hợp lệ của chi nhánh Đà Nẵng.
- **Response:** Middleware trích xuất ngữ cảnh yêu cầu, phát hiện `user.facility_id` (Đà Nẵng) khác với `record.facility_id` (Huế); hệ thống ngay lập tức chặn đứng yêu cầu, từ chối trả về dữ liệu nhạy cảm, gửi cảnh báo bảo mật và ghi lại toàn bộ dấu vết vi phạm vào Audit Log bất biến.
- **Response Measure:**
  - Mã trạng thái phản hồi: **HTTP 403 Forbidden**.
  - Tỷ lệ dữ liệu bệnh án bị rò rỉ: **0%**.
  - 100% sự kiện vi phạm được ghi vào bảng Audit Log kèm chữ ký băm HMAC với thời gian ghi nhận **< 10ms**.

---

### Kịch bản 4 (ASR-04): Khả năng mở rộng tích hợp thêm hệ thống HIS thứ 4 (Interoperability & Modifiability)
- **Source:** Đội ngũ phát triển phần mềm (IT Engineering Team).
- **Stimulus:** Chuỗi phòng khám mua lại 1 phòng khám mới tại Hội An đang sử dụng một phần mềm HIS thứ 4 (chuẩn HL7 FHIR hoặc Database tùy biến), yêu cầu tích hợp vào MediLink.
- **Artifact:** Anti-Corruption Layer (HIS Integration Framework & Canonical Data Model).
- **Environment:** Môi trường phát triển và kiểm thử tích hợp (Staging/Production).
- **Response:** Kỹ sư hiện thực một Adapter mới tuân thủ interface chuẩn `IHisIntegrationAdapter` và ánh xạ dữ liệu sang Mô hình Chuẩn Canonical (HL7 FHIR); không cần sửa đổi bất kỳ dòng mã nguồn nào của Core Booking Service hoặc Database MediLink.
- **Response Measure:**
  - Thời gian công cần thiết để hoàn thành việc tích hợp và kiểm thử: **≤ 10 ngày làm việc (≤ 2 tuần công)**.
  - Số lượng tệp mã nguồn trong Core Business Domain phải chỉnh sửa: **0 tệp** (Tuân thủ triệt để Open-Closed Principle).

---

### Kịch bản 5 (ASR-05): Tính bất biến và Toàn vẹn của Nhật ký Kiểm toán Y tế (Audit Log Tamper-Proofing & Integrity)
- **Source:** Kẻ tấn công nội bộ hoặc Quản trị viên Cơ sở dữ liệu (DBA) có quyền truy cập root trực tiếp vào máy chủ dữ liệu.
- **Stimulus:** Cố gắng sửa đổi nội dung nhật ký truy cập (ví dụ: sửa thời gian xem bệnh án, xóa vết truy cập của một tài khoản VIP) hoặc chèn dữ liệu giả mạo trực tiếp bằng câu lệnh SQL `UPDATE`/`DELETE`.
- **Artifact:** Audit Logging Service & Cryptographic Hash Chain Verifier.
- **Environment:** Máy chủ cơ sở dữ liệu nội bộ.
- **Response:** Bảng Audit Log được thiết lập chế độ Append-only (chỉ ghi thêm); mỗi bản ghi chứa trường `previous_hash` và `current_hash` được tính toán bằng HMAC-SHA256 kết hợp Secret Key được bảo vệ tại Secret Manager. Trình kiểm tra định kỳ (Audit Verifier) phát hiện đứt gãy chuỗi băm ngay khi có sự thay đổi giá trị bất kỳ.
- **Response Measure:**
  - Phát hiện **100%** hành vi sửa đổi hoặc xóa dữ liệu kiểm toán trái phép.
  - Thời gian phát hiện sự cố giả mạo: **Ngay lập tức** trong lần đối soát chu kỳ kế tiếp (< 5 phút).
  - Không có chức năng ứng dụng nào cung cấp API Update hoặc Delete trên bảng Audit Log.

---

### Kịch bản 6 (ASR-06): Hiệu năng tra cứu lịch hẹn và hồ sơ trong giờ cao điểm (Performance & Latency)
- **Source:** 1.000 bệnh nhân và bác sĩ truy cập đồng thời.
- **Stimulus:** Thực hiện các truy vấn tìm kiếm lịch làm việc của bác sĩ và tải tóm tắt hồ sơ sức khỏe điện tử.
- **Artifact:** MediLink API Core & In-memory Cache (Redis).
- **Environment:** Giờ cao điểm đầu ngày (07:30 - 08:30 sáng).
- **Response:** Hệ thống phục vụ các yêu cầu đọc thông qua bộ nhớ đệm phân tầng (Read-through Cache); chỉ các yêu cầu dữ liệu mới mới truy vấn cơ sở dữ liệu chính; tối ưu hóa chỉ mục (indexing) và phân trang.
- **Response Measure:**
  - Độ trễ phản hồi tìm kiếm lịch bác sĩ: **p95 < 500ms**, **p99 < 1000ms**.
  - Độ trễ tải hồ sơ bệnh án tóm tắt: **p95 < 1.5 giây**.
  - Tỷ lệ lỗi hệ thống (HTTP 5xx): **< 0.1%**.

---

## 6. Cây Tiện ích (Utility Tree) và Danh sách ASR

Utility Tree được xây dựng nhằm phân loại và đánh giá mức độ ưu tiên của các thuộc tính chất lượng theo 2 chiều:
1. **Business Importance (Tầm quan trọng đối với nghiệp vụ):** High (H), Medium (M), Low (L).
2. **Technical Risk / Difficulty (Độ khó và Rủi ro kỹ thuật):** High (H), Medium (M), Low (L).

Những kịch bản đạt mức **(H, H)** chính là **Architecturally Significant Requirements (ASR)** – các yêu cầu chi phối trực tiếp đến việc định hình cấu trúc kiến trúc của hệ thống.

```
Utility Tree: MediLink Platform
|
+--- Security & Privacy
|    +--- [ASR-03] (H, H) Ngăn chặn lễ tân truy cập chéo hồ sơ bệnh nhân khác cơ sở (RBAC + ABAC + 403)
|    +--- [ASR-05] (H, M) Tính bất biến và bảo vệ toàn vẹn nhật ký kiểm toán (HMAC Hash Chaining)
|    +--- [QA-07]  (M, L) Mã hóa dữ liệu truyền tải TLS 1.3 và AES-256 at-rest
|
+--- Consistency & Concurrency
|    +--- [ASR-01] (H, H) Chống đặt trùng lịch khi 50 bệnh nhân cùng bấm đặt 1 slot (Zero double-booking)
|    +--- [QA-08]  (H, M) Đảm bảo tính Idempotency khi mạng chập chờn gửi lại lệnh thanh toán cọc
|
+--- Availability & Fault Tolerance
|    +--- [ASR-02] (H, H) HIS Huế ngừng hoạt động 2 giờ, 11 cơ sở còn lại vẫn đặt lịch 100% (Circuit Breaker)
|    +--- [QA-09]  (H, M) Khôi phục tự động dịch vụ khi máy chủ Core khởi động lại mà không mất trạng thái
|
+--- Interoperability & Modifiability
|    +--- [ASR-04] (H, H) Tích hợp thêm HIS thứ 4 trong ≤ 2 tuần công không sửa đổi Core (ACL + FHIR)
|    +--- [QA-10]  (M, M) Thay đổi nhà cung cấp cổng SMS/Zalo thông báo trong ≤ 2 ngày làm việc
|
+--- Performance
     +--- [ASR-06] (H, M) Tìm kiếm lịch bác sĩ và tải EHR giờ cao điểm p95 < 500ms / < 1.5s
     +--- [QA-11]  (M, L) Gửi tin nhắn xác nhận lịch khám tức thì trong ≤ 5 giây qua hàng đợi
```

### Bảng tổng hợp đánh giá và Lựa chọn ASR

| Mã Kịch bản | Thuộc tính chất lượng (QA) | Tóm tắt kịch bản | Tầm quan trọng nghiệp vụ | Rủi ro kỹ thuật | Xếp hạng ưu tiên | Trở thành ASR? |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| **ASR-01** | Consistency & Concurrency | 50 người cùng đặt 1 slot, không xảy ra double-booking | **High** | **High** | **(H, H)** | **CÓ (ASR cốt lõi)** |
| **ASR-02** | Availability & Fault Tolerance | HIS Huế sập 2 giờ, 11 cơ sở khác vẫn hoạt động bình thường | **High** | **High** | **(H, H)** | **CÓ (ASR cốt lõi)** |
| **ASR-03** | Security & Access Control | Lễ tân cố xem bệnh án khác cơ sở -> chặn 403 & ghi audit log | **High** | **High** | **(H, H)** | **CÓ (ASR cốt lõi)** |
| **ASR-04** | Interoperability & Modifiability | Tích hợp HIS thứ 4 trong ≤ 2 tuần công không chạm Core | **High** | **High** | **(H, H)** | **CÓ (ASR cốt lõi)** |
| **ASR-05** | Security & Auditability | Nhật ký kiểm toán bất biến, chống DBA sửa/xóa bằng HMAC chain | **High** | **Medium** | **(H, M)** | Xem xét bổ sung |
| **ASR-06** | Performance | Tìm kiếm lịch bác sĩ p95 < 500ms, tải bệnh án tóm tắt < 1.5s | **High** | **Medium** | **(H, M)** | Xem xét bổ sung |

---

### Tự kiểm tra Bước 6: Vì sao Scenario ASR-01 và ASR-02 được xếp hạng (H, H) trong khi Kịch bản ASR-06 chỉ là (H, M)?
> **Trả lời:**
> 1. **ASR-01 (Chống double-booking - Concurrency):**
>    - *Business Importance (H):* Đặt trùng lịch là lỗi chết người trong ngành y. Hai bệnh nhân đến cùng một giờ mà bác sĩ chỉ có một người sẽ gây hỗn loạn, khiếu kiện gay gắt và phá hủy uy tín của chuỗi phòng khám.
>    - *Technical Risk (H):* Đây là bài toán tranh chấp tài nguyên phân tán phức tạp giữa Web App MediLink và hệ thống HIS cơ sở. Việc khóa tài nguyên nếu không cẩn thận sẽ gây nghẽn cổ chai (bottle-neck), giảm hiệu năng hoặc dẫn tới Deadlock khi có nhiều luồng cùng tranh chấp.
> 2. **ASR-02 (Cách ly sự cố HIS - Availability):**
>    - *Business Importance (H):* Nếu 1 cơ sở địa phương gặp sự cố mất mạng mà làm tê liệt toàn bộ 11 cơ sở còn lại thì toàn bộ chuỗi phòng khám sẽ ngưng trệ, thiệt hại doanh thu hàng trăm triệu đồng mỗi giờ.
>    - *Technical Risk (H):* Tích hợp với hệ thống ngoài (third-party/legacy) luôn tiềm ẩn rủi ro timeout lan truyền (cascading failure). Xử lý đòi hỏi áp dụng các mẫu kiến trúc phức tạp như Circuit Breaker, Fallback, Timeout Budget và Hàng đợi ngoại tuyến.
> 3. **Trong khi đó, Kịch bản ASR-06 (Performance giờ cao điểm):**
>    - *Business Importance (H):* Người dùng rất cần ứng dụng chạy nhanh để có trải nghiệm tốt.
>    - *Technical Risk (M):* Rủi ro kỹ thuật chỉ ở mức Medium vì bài toán tăng tốc độ đọc (Read-heavy) đã có các giải pháp công nghệ rất chuẩn mực và phổ biến trong ngành (như In-memory Caching với Redis, Indexing cơ sở dữ liệu quan hệ, Connection Pooling). Nó không đòi hỏi phải phát minh hay giải quyết bài toán phân tán hóc búa như ASR-01 và ASR-02.
