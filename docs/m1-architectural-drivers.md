# Mốc M1 – Architectural Drivers: Hệ thống MediLink

- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm
- **Đề tài 1:** MediLink – Nền tảng đặt lịch khám và hồ sơ sức khỏe điện tử cho chuỗi 12 phòng khám
- **Sản phẩm bàn giao M1:** Business Goals, Stakeholders & Xung đột, 10 Use Cases chính, Phân loại dữ liệu & Ràng buộc Nghị định 13/2023/NĐ-CP, Cơ sở tính toán tải & nguồn gốc con số, 8 Quality Attribute Scenarios (đủ 6 phần), Utility Tree & Danh mục ASR.

---

## 1. Mục tiêu Kinh doanh Đo lường được (Business Goals – Bước 3)

Chuỗi 12 phòng khám tư nhân tại Đà Nẵng (5 cơ sở), Huế (4 cơ sở) và Quảng Nam (3 cơ sở) đang mất khách hàng và tốn chi phí vận hành do đặt lịch thủ công qua điện thoại/Excel và dữ liệu bệnh án bị cô lập ở từng phòng khám. Ban Giám đốc đặt ra **5 mục tiêu kinh doanh định lượng**:

| Mã | Mục tiêu kinh doanh | Chỉ số đo lường thành công (KPI) | Thời hạn |
|:--:|---------------------|----------------------------------|:--------:|
| **BG-01** | **Chuyển đổi số kênh đặt lịch khám** | Chuyển tối thiểu **65%** tổng lượt đặt hẹn toàn chuỗi từ điện thoại/quầy sang trực tuyến trên MediLink; rút ngắn thời gian hoàn tất đặt lịch trung bình từ 10–15 phút (gọi tổng đài) xuống **≤ 30 giây** thao tác (xác nhận hệ thống **< 1 giây**). | 6 tháng sau vận hành |
| **BG-02** | **Chấm dứt triệt để sự cố trùng lịch khám** | Giảm tỷ lệ đặt trùng khung giờ bác sĩ (*double-booking*) từ ~4.5% (do ghi Excel/điện thoại chồng chéo) về mức **0.00%** trong mọi khung giờ cao điểm. | Ngay khi Go-Live |
| **BG-03** | **Liên thông Hồ sơ Sức khỏe Điện tử (EHR) an toàn** | **100%** lịch sử khám, đơn thuốc và kết quả xét nghiệm của bệnh nhân trên 12 cơ sở được định danh thống nhất qua `MPI` và tra cứu liên cơ sở (khi có Consent) trong **< 1.5 giây**, đạt **0 vụ việc** vi phạm Nghị định 13/2023/NĐ-CP. | 3 tháng sau vận hành |
| **BG-04** | **Tối ưu chi phí M&A và bảo tồn đầu tư phần mềm cũ** | Giữ nguyên 3 hệ thống HIS đang chạy tại 12 cơ sở (tiết kiệm hàng tỷ đồng chi phí thay mới); khi mua thêm cơ sở thứ 13 dùng phần mềm HIS thứ 4, thời gian tích hợp kỹ thuật **≤ 2 tuần công (10 ngày công)** mà không sửa lõi hệ thống. | Xuyên suốt vòng đời |
| **BG-05** | **Đảm bảo vận hành liên tục, cô lập sự cố chi nhánh** | Độ sẵn sàng (*Availability*) của cổng đặt lịch đạt **≥ 99.5%** trong khung giờ hoạt động (07:00–21:00 hằng ngày); sự cố mất mạng hoặc hỏng máy chủ HIS tại 1 cơ sở **không làm gián đoạn (0% ảnh hưởng)** việc đặt lịch ở 11 cơ sở còn lại. | Xuyên suốt vòng đời |

---

## 2. Các Bên liên quan & Phân tích Xung đột Mối quan tâm (Stakeholders – Bước 3)

| STT | Stakeholder | Vai trò trong hệ thống | Mối quan tâm cốt lõi (Concerns) | Quality Attributes ưu tiên nhất |
|:---:|-------------|------------------------|---------------------------------|---------------------------------|
| 1 | **Bệnh nhân** (*Patients*) | Đặt/đổi/hủy lịch, nộp cọc, cấp quyền chia sẻ hồ sơ, xem kết quả xét nghiệm trực tuyến. | Tìm lịch trống nhanh, đặt xong chắc chắn có chỗ (không bị báo trùng khi tới nơi), bí mật bệnh tật cá nhân được bảo vệ tuyệt đối. | **Consistency, Performance, Privacy** |
| 2 | **Bác sĩ** (*Doctors*) | Quản lý lịch trực, xem bệnh sử & xét nghiệm cũ, ghi chẩn đoán và kê đơn. | Lịch khám điều độ không bị chồng chéo 2 bệnh nhân cùng giờ; mở bệnh sử liên cơ sở nhanh ngay trong lúc khám mà không rườm rà. | **Consistency, Performance, Usability** |
| 3 | **Lễ tân / Thu ngân** (*Receptionists*) | Tiếp đón check-in tại quầy, hỗ trợ khách vãng lai, đối soát đặt cọc. | Tra cứu phiếu hẹn trong vài giây để không ùn tắc sảnh chờ; phạm vi màn hình rõ ràng theo đúng chi nhánh mình làm việc. | **Availability, Security (Access Control)** |
| 4 | **Quản lý cơ sở** (*Clinic Managers*) | Điều hành hoạt động khám chữa bệnh tại từng phòng khám địa phương. | Khi đường truyền Internet hoặc máy chủ HIS tại cơ sở gặp trục trặc, dữ liệu lịch hẹn không bị mất trắng và đồng bộ lại trơn tru. | **Availability, Reliability** |
| 5 | **Ban Giám đốc** (*Executive Board*) | Chủ đầu tư chuỗi 12 phòng khám, quyết định mở rộng chi nhánh mới. | Xem Dashboard công suất khám theo thời gian thực; chi phí hạ tầng hợp lý; mở rộng thêm phòng khám mới nhanh, không rủi ro pháp lý. | **Modifiability, Interoperability, Cost-efficiency** |
| 6 | **Bộ phận IT / Vận hành** (*IT Team*) | Phát triển, tích hợp HIS, vận hành container, giám sát và xử lý sự cố. | Kiến trúc rành mạch, dễ debug lỗi tích hợp giữa JSON/XML/RPC, dễ triển khai và không bị quá tải vận hành. | **Maintainability, Interoperability, Observability** |
| 7 | **Cơ quan Quản lý Y tế & Pháp luật** | Sở Y tế, cơ quan giám sát tuân thủ bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP). | Dữ liệu sức khỏe nhạy cảm được mã hóa, chỉ truy cập khi có sự đồng ý hợp pháp, nhật ký kiểm toán lưu vết 100% và không thể chỉnh sửa. | **Security, Privacy, Auditability** |

> **Tự kiểm tra Bước 3 – Hai stakeholder nào có mối quan tâm xung đột nhau và kiến trúc giải quyết thế nào?**
> 1. **Bác sĩ / Bệnh nhân** *(muốn truy xuất bệnh sử liên cơ sở tức thì, ít bước xác nhận để khám nhanh – Performance & Usability)* **XUNG ĐỘT VỚI** **Cơ quan Quản lý Pháp luật / An ninh CNTT** *(đòi hỏi kiểm tra phân quyền nhiều lớp, kiểm tra sự đồng ý Consent, giải mã dữ liệu và ghi vết kiểm toán đầy đủ – Security & Privacy)*.
>    - *Cách giải quyết trong kiến trúc:* Lưu cờ Consent có chỉ mục sẵn trong bảng `patient_consents`, kiểm tra Contextual ABAC ngay trên RAM/SQLite trong `< 3 ms`, giải mã `AES-256-GCM` bằng `node:crypto` tăng tốc phần cứng C++ và dùng Pre-signed URL 120s cho file PDF để vừa tuân thủ tuyệt đối Nghị định 13/2023, vừa giữ thời gian tải bệnh án `< 100 ms`.
> 2. **Ban Giám đốc** *(muốn vẫn nhận đặt lịch online cho cơ sở Huế ngay cả khi máy chủ HIS Huế mất mạng để không mất doanh thu – Availability)* **XUNG ĐỘT VỚI** **Lễ tân / Quản lý cơ sở Huế** *(sợ lịch nhận trên mây chưa kịp đẩy về phần mềm HIS tại quầy gây lệch lịch – Immediate Consistency)*.
>    - *Cách giải quyết:* Tách quỹ slot Online do MediLink kiểm soát khóa chuẩn kết hợp **Circuit Breaker + Transactional Outbox** tự động đồng bộ bù có điều tiết nhịp độ ngay khi mạng Huế khôi phục (`ADR-007`).

---

## 3. Danh sách Use Cases Chính & Các Ràng buộc Hệ thống (Bước 4 & MediLink Mục 1)

### 3.1. Danh sách 10 Use Cases Chính (Bao phủ trọn vẹn 6 nhóm chức năng đề bài)

| Mã | Tên Use Case | Tác nhân | Tóm tắt luồng chính & Luồng ngoại lệ kiến trúc quan trọng |
|:--:|--------------|----------|-----------------------------------------------------------|
| **UC-01** | **Tìm kiếm Bác sĩ & Khung giờ khám trống** | Bệnh nhân | Lọc bác sĩ theo cơ sở/chuyên khoa/ngày; đọc từ Read-Through Slot Cache để phản hồi tức thì trong giờ cao điểm. |
| **UC-02** | **Đặt lịch khám chống trùng (Online Booking)** | Bệnh nhân | Chọn slot → kiểm tra `X-Idempotency-Key` → giữ khóa phân tán `Redis SET NX PX` → ghi nguyên tử `UNIQUE` vào DB → đồng bộ sang HIS cơ sở qua ACL (*Ngoại lệ:* 49 người chậm chân nhận `409`; HIS cơ sở sập thì chuyển sang `OUTBOX_QUEUED`). |
| **UC-03** | **Nhắc lịch hẹn tự động đa kênh** | Notification Worker | Gửi mã QR xác nhận ngay sau khi đặt và nhắc hẹn trước 24h / 2h qua Zalo ZNS, SMS, Email (*Ngoại lệ:* Cổng SMS lỗi `503` → tự động retry theo hàm mũ tối đa 3 lần, quá ngưỡng đưa vào `DEAD_LETTER`). |
| **UC-04** | **Đổi / Hủy lịch khám & Hoàn cọc** | Bệnh nhân, Lễ tân | Hủy lịch trước giờ khám quy định → giải phóng `active_slot_key = NULL` để mở lại slot trống, xóa cache đọc, kích hoạt hoàn cọc và đồng bộ lệnh hủy sang HIS. |
| **UC-05** | **Quản lý Sự đồng ý (Consent) & Xem Hồ sơ EHR** | Bệnh nhân, Bác sĩ | Bệnh nhân bật/tắt quyền chia sẻ bệnh án cho từng cơ sở (`patient_consents`); Bác sĩ/Bệnh nhân xem tiền sử, đơn thuốc (giải mã `AES-256-GCM`) và nhận Pre-signed URL 120s để tải PDF kết quả xét nghiệm (*Ngoại lệ:* Chưa có Consent → chặn `403`). |
| **UC-06** | **Bác sĩ Quản lý Lịch trực, Ghi chú khám & Kê đơn** | Bác sĩ | Bác sĩ đăng ký/điều chỉnh ca làm việc, nhập chẩn đoán ICD-10, ghi chú lâm sàng và kê đơn điện tử; dữ liệu nhạy cảm được mã hóa cấp trường trước khi lưu xuống DB. |
| **UC-07** | **Đồng bộ Dị thể Hai chiều với 3 Nhóm HIS** | ACL & Outbox Worker | Chuẩn hóa dữ liệu qua mô hình HL7 FHIR R4 (`Patient` kèm ánh xạ `MPI`, `Appointment`) và dịch sang `REST/JSON` (Đà Nẵng), `SOAP/XML` (Huế), `Custom RPC` (Quảng Nam). |
| **UC-08** | **Tiếp đón & Check-in tại Quầy Lễ tân** | Lễ tân | Quét QR lịch hẹn của bệnh nhân tại quầy; hệ thống kiểm tra cứng `user.facility_id == record.facility_id` và chỉ hiển thị thông tin hành chính, ẩn toàn bộ chẩn đoán nhạy cảm (*Ngoại lệ:* Xem khác cơ sở → chặn `403` + ghi Audit vi phạm). |
| **UC-09** | **Thanh toán Đặt cọc Trực tuyến** | Bệnh nhân, Payment GW | Khởi tạo giao dịch đặt cọc với cổng thanh toán giả lập và xử lý Webhook xác nhận có kiểm tra chữ ký HMAC + Idempotency chống cộng tiền/trừ cọc trùng. |
| **UC-10** | **Xem Dashboard Thống kê Toàn chuỗi** | Ban Giám đốc | Tổng hợp số lượt đặt khám, tỷ lệ lấp đầy bác sĩ, trạng thái đồng bộ HIS/Outbox của 12 phòng khám trên dữ liệu đã ẩn danh cá nhân. |

---

### 3.2. Phân loại Dữ liệu Y tế & Ràng buộc Pháp lý theo Nghị định 13/2023/NĐ-CP (MediLink Mục 1)

#### Bảng Phân loại Dữ liệu 3 Cấp độ

| Cấp độ | Phân loại theo Nghị định 13/2023/NĐ-CP | Các trường dữ liệu cụ thể trong MediLink | Biện pháp bảo vệ kiến trúc áp dụng |
|:------:|----------------------------------------|------------------------------------------|------------------------------------|
| **Mức 1** | **Dữ liệu Công khai** (*Public Data*) | Tên & địa chỉ 12 phòng khám, danh mục chuyên khoa, họ tên & học vị bác sĩ, khung giờ trống (`AVAILABLE`/`BOOKED`), bảng giá khám niêm yết. | Cho phép truy cập không cần đăng nhập; được phép lưu trên Read-Through Cache (`slotCache.js`) để tối ưu tốc độ tìm kiếm. |
| **Mức 2** | **Dữ liệu Cá nhân Cơ bản** *(Khoản 3 Điều 2 NĐ 13/2023)* | Họ tên bệnh nhân, ngày sinh, giới tính, số điện thoại, email, mã định danh `MPI`, mã lịch hẹn, trạng thái đặt cọc. | Bắt buộc truyền qua HTTPS/TLS 1.3; xác thực JWT; Lễ tân chỉ xem được dữ liệu hành chính phát sinh tại đúng `facility_id` của mình; ẩn thông tin cá nhân trên Dashboard lãnh đạo. |
| **Mức 3** | **Dữ liệu Cá nhân Nhạy cảm – Tình trạng sức khỏe** *(Khoản 4a Điều 2 NĐ 13/2023)* | Tiền sử bệnh lý, mã chẩn đoán ICD-10 (`diagnosis`), ghi chú khám lâm sàng (`clinical_notes`), đơn thuốc (`prescription`), tóm tắt & tệp PDF/ảnh kết quả xét nghiệm (`lab_summary`, `lab_file`). | **Kiểm soát nghiêm ngặt nhất:** (1) Bắt buộc có Consent tường minh khi chia sẻ liên cơ sở; (2) Che hoàn toàn (`[REDACTED]`) trước nhân viên lễ tân; (3) Mã hóa xác thực cấp trường `AES-256-GCM` trong DB + mã hóa tệp trên Object Storage kèm Pre-signed URL 120s; (4) Ghi 100% thao tác vào Audit Log bất biến. |

#### Trích xuất 5 Ràng buộc Kỹ thuật Bắt buộc (Technical Constraints) từ Nghị định 13/2023/NĐ-CP

1. **`C-01` – Ràng buộc Sự đồng ý Tường minh & Có thể Thu hồi (*Điều 11 & Điều 14 NĐ 13/2023*):** Hệ thống không được mặc định mở thông suốt bệnh án cá nhân cho mọi nhân viên y tế toàn chuỗi; bắt buộc có bảng quản lý trạng thái đồng ý theo mục đích và cơ sở (`patient_consents`), cho phép bệnh nhân cấp hoặc rút lại quyền chia sẻ bất cứ lúc nào.
2. **`C-02` – Ràng buộc Mã hóa Dữ liệu Nhạy cảm & Tách biệt Khóa (*Khoản 2b Điều 27 NĐ 13/2023*):** Các trường bệnh án nhạy cảm và tệp kết quả xét nghiệm bắt buộc phải được mã hóa khi truyền (`TLS 1.3`) và khi lưu trữ (`AES-256-GCM` ở tầng ứng dụng); khóa giải mã (`DATA_ENCRYPTION_KEY`) phải tách rời khỏi cơ sở dữ liệu.
3. **`C-03` – Ràng buộc Phân quyền Đặc quyền Tối thiểu theo Cơ sở (*Khoản 2a Điều 27 NĐ 13/2023*):** Phải kết hợp kiểm tra vai trò (`RBAC`) với thuộc tính phạm vi cơ sở (`Contextual ABAC: user.facility_id == resource.facility_id`) và giảm thiểu dữ liệu hiển thị (*Data Minimization*) đối với nhân sự hành chính/lễ tân.
4. **`C-04` – Ràng buộc Lưu vết Kiểm toán Bất biến & Phản ứng Vi phạm 72 giờ (*Điều 23 & Điều 27 NĐ 13/2023*):** 100% hành vi đọc, ghi, tải tệp hoặc truy cập bị từ chối trên dữ liệu nhạy cảm phải được ghi vào nhật ký kiểm toán chỉ cho phép ghi thêm (*Append-only*), có cơ chế mật mã (`HMAC-SHA256 Hash Chain`) phát hiện mọi can thiệp sửa/xóa trái phép để kịp thời lập hồ sơ thông báo vi phạm trong hạn 72 giờ.
5. **`C-05` – Ràng buộc Không Lộ Đường dẫn Tĩnh Tệp Y tế:** Tệp PDF xét nghiệm và hình ảnh chẩn đoán không được đặt ở thư mục web tĩnh công khai; chỉ được tải qua Pre-signed URL có chữ ký mật mã và thời hạn ngắn (≤ 120 giây).

#### Các Ràng buộc Kỹ thuật, Kinh doanh & Tổ chức Khác

| Mã | Nhóm ràng buộc | Nội dung chi tiết | Hệ quả áp đặt lên Kiến trúc |
|:--:|----------------|-------------------|-----------------------------|
| **C-06** | Kỹ thuật / Di sản | 3 phần mềm HIS tại Đà Nẵng, Huế, Quảng Nam là hộp đen đóng gói sẵn, không thể sửa mã nguồn hay chọc thẳng vào DB nội bộ của chúng. | Mọi tích hợp phải đi qua cổng dịch vụ ngoài bằng lớp Anti-Corruption Layer & Adapters. |
| **C-07** | Tổ chức & Thời gian | Nhóm phát triển gồm đúng **4 thành viên**, thời gian thực hiện **15 tuần**, ngân sách hạ tầng thử nghiệm giới hạn trên máy cá nhân / Docker Host đơn. | Loại bỏ các kiến trúc quá nặng về vận hành (như Service Mesh / Kubernetes / ESB thương mại); ưu tiên Modular Monolith + Docker Compose gọn nhẹ. |
| **C-08** | Chuẩn liên thông | Định dạng trung gian cần tham chiếu chuẩn trao đổi thông tin y tế quốc tế để thuận lợi mở rộng về sau. | Mô hình dữ liệu chuẩn nội bộ (*Canonical Model*) bám sát tài nguyên `Patient` và `Appointment` của chuẩn **HL7 FHIR Release 4**. |

> **Tự kiểm tra Bước 4 – Constraint khác Requirement ở điểm nào? Cho ví dụ cụ thể trong MediLink.**
> - **Requirement (Yêu cầu):** Mô tả *hệ thống cần đạt được chức năng hoặc mức chất lượng gì* (kiến trúc sư **được tự do lựa chọn giải pháp thiết kế** để đạt mục tiêu đó). *Ví dụ:* "Khi 50 người cùng đặt 1 khung giờ, không được xảy ra double-booking" — nhóm có quyền tự do cân nhắc chọn Redis Lock, DB Lock hay Queue.
> - **Constraint (Ràng buộc):** Là *quyết định thiết kế đã bị khóa cứng trước bởi pháp luật, môi trường di sản hoặc nguồn lực*, kiến trúc sư **không có quyền thương lượng hay thay đổi**, chỉ có thể tuân thủ. *Ví dụ:* (1) Pháp luật Nghị định 13/2023 bắt buộc dữ liệu sức khỏe là dữ liệu nhạy cảm phải mã hóa và lưu log truy cập (`C-02`, `C-04`); (2) HIS cơ sở Huế chỉ nhận giao thức `SOAP 1.1 / XML` chứ không thể bắt phòng khám Huế viết lại sang REST/JSON (`C-06`).

---

## 4. Ước lượng Tải & Nguồn gốc Định lượng của các Con số trong Response Measure (Bước 5)

Để tránh lỗi phổ biến là "chọn bừa một con số đẹp cho Response Measure", nhóm thiết lập mô hình ước lượng tải thực tế từ quy mô chuỗi **12 phòng khám**:

1. **Quy mô cung ứng lịch khám:**
   - 12 phòng khám × trung bình **10 bác sĩ/cơ sở** = **120 bác sĩ** toàn chuỗi.
   - Giờ hoạt động: `07:00 – 21:00` (**14 giờ/ngày**). Mỗi bác sĩ làm việc trung bình 8 giờ/ngày × 2 slot/giờ (30 phút/slot) = **16 slot/bác sĩ/ngày** → Tổng năng lực cung ứng = `120 × 16 = 1.920 slot khám/ngày` (~57.600 slot/tháng).
2. **Nguồn gốc con số `50 requests đồng thời vào 1 slot` & `p95 ≤ 500 ms` (`QAS-01`):**
   - Lưu lượng đặt lịch bình thường chỉ khoảng `2.000 lượt/ngày` (~0.04 req/s trung bình). Tuy nhiên, vào **07:30 sáng thứ Hai** khi hệ thống mở lịch khám tuần mới cho các bác sĩ trưởng khoa/chuyên gia Tim mạch – Nội tiết đầu ngành, thống kê thực tế tại phòng khám cho thấy có khoảng **40–50 bệnh nhân** canh sẵn trên điện thoại và bấm nút *"Xác nhận đặt lịch"* vào đúng khung giờ đẹp `08:00` trong cùng 1 giây!
   - Về ngưỡng `p95 ≤ 500 ms`: Theo chuẩn trải nghiệm tương tác người dùng (Jakob Nielsen / Google Web Vitals), phản hồi dưới `0.5 giây` giữ cảm giác tức thì khi bấm nút giao dịch, đồng thời đủ ngân sách thời gian cho `Redis Lock (< 5ms) + SQLite Commit (< 10ms) + gọi đồng bộ HIS nội vùng Đà Nẵng/Quảng Nam (~50–150ms)`.
3. **Nguồn gốc con số `99.5% Availability giờ làm việc` & `Fast-fail ≤ 50 ms` (`QAS-02`):**
   - Khung giờ làm việc: `14 giờ/ngày × 30 ngày = 420 giờ/tháng`. Mức cam kết `99.5%` tương ứng thời gian gián đoạn tối đa toàn hệ thống không quá `420 × 0.5% = 2.1 giờ/tháng`. Nếu sự cố đứt mạng 2 giờ tại riêng cơ sở Huế làm treo luôn cả hệ thống thì chỉ **1 lần sự cố ở Huế đã tiêu hết sạch 100% quỹ downtime cả tháng của cả 12 phòng khám!** Do đó bắt buộc phải cô lập lỗi để 11 cơ sở kia đạt `100%` hoạt động, và khi mạch Huế đã `OPEN` thì phản hồi dự phòng qua Outbox phải trả về trong `≤ 50 ms` (thay vì bắt người dùng đợi timeout 30 giây).
4. **Nguồn gốc con số `≤ 2 tuần công (10 ngày công)` cho tích hợp HIS thứ 4 (`QAS-04`):**
   - Được bóc tách từ định mức công việc kỹ thuật thực tế khi đã có sẵn ACL + FHIR Canonical Model: (a) Khảo sát tài liệu API & mã bệnh nhân của HIS thứ 4: **2 ngày công**; (b) Viết class Adapter mới kế thừa `BaseHisAdapter` (~60–80 dòng code): **3 ngày công**; (c) Cấu hình Circuit Breaker, khóa bảo mật & bảng ánh xạ MPI: **1 ngày công**; (d) Viết Mock/Contract Test & kiểm thử tích hợp end-to-end: **3 ngày công**; (e) Triển khai & nghiệm thu: **1 ngày công** → Tổng cộng = **10 ngày công (2 tuần công)** với **0 dòng code sửa trong Core**.
5. **Nguồn gốc con số `200 người dùng đọc đồng thời, p95 < 300 ms` (`QAS-06`):**
   - Vào cao điểm đầu giờ sáng (`07:00 – 08:30`), ước tính ~35% lượng truy cập trong ngày dồn vào (~700 lượt đặt → với tỷ lệ xem/đặt `Look-to-Book = 15:1` tương ứng ~10.500 lượt xem trang lịch bác sĩ trong 90 phút, đỉnh cục bộ đạt **~200 requests tra cứu đồng thời**). Nhờ phục vụ từ `SlotReadCache` trong RAM, mục tiêu `p95 < 300 ms` hoàn toàn khả thi ngay trên cấu hình máy chủ phổ thông.

---

## 5. Tám Kịch bản Thuộc tính Chất lượng Chuẩn 6 Phần (Quality Attribute Scenarios – Bước 5)

Bộ **8 kịch bản** dưới đây phủ **5 thuộc tính chất lượng khác nhau** (*Consistency, Availability, Security & Privacy, Interoperability/Modifiability, Performance*) và bao gồm đầy đủ **4 kịch bản bắt buộc (a), (b), (c), (d)** của Đề tài 1 MediLink:

### `QAS-01` [ASR-01 – Bắt buộc (a)] – Chống Đặt trùng lịch dưới tải tranh chấp cao (*Consistency*)
- **Source:** 50 bệnh nhân đã đăng nhập hợp lệ trên ứng dụng Web/Mobile từ 50 phiên kết nối độc lập.
- **Stimulus:** Đồng thời gửi yêu cầu `POST /api/bookings` vào đúng cùng một khung giờ `2026-11-20 08:00` của bác sĩ `DOC_101` tại cơ sở Đà Nẵng trong cùng một thời điểm.
- **Artifact:** `BookingService`, `LockManager` (Redis Distributed Lock) và bảng `bookings` / `slots` trong CSDL quan hệ.
- **Environment:** Giờ cao điểm mở lịch khám đầu tuần, hệ thống và HIS Đà Nẵng đang hoạt động bình thường.
- **Response:** Hệ thống cấp khóa nguyên tử kèm `Fencing Token` cho yêu cầu đầu tiên, ghi nhận lịch khám vào CSDL có ràng buộc `UNIQUE(active_slot_key)`, nhả khóa ngay trước khi đồng bộ sang HIS; 49 yêu cầu còn lại bị từ chối sạch mà không tạo bản ghi trùng và không bắn lệnh trùng sang HIS.
- **Response Measure:** Đúng **1 yêu cầu** nhận `HTTP 201 Created` (`double-booking = 0.00%`); đúng **49 yêu cầu** nhận `HTTP 409 Conflict`; số dòng `CONFIRMED` của slot đó trong CSDL bằng đúng **`1`**; độ trễ phản hồi **`p95 ≤ 500 ms`**.

### `QAS-02` [ASR-02 – Bắt buộc (b)] – Cô lập Sự cố khi HIS Cơ sở Huế Ngừng hoạt động 2 giờ (*Availability*)
- **Source:** Sự cố mất điện hoặc đứt đường truyền tại phòng khám chi nhánh Huế.
- **Stimulus:** Máy chủ HIS Huế (`SOAP/XML`, cổng `8002`) ngừng phản hồi hoặc trả lỗi `HTTP 503` liên tục suốt **2 giờ** trong giờ hành chính, trong khi bệnh nhân trên toàn chuỗi vẫn liên tục đặt lịch ở Huế, Đà Nẵng và Quảng Nam.
- **Artifact:** `HisIntegrationDispatcher`, `CircuitBreaker(FAC_HUE)`, `HueXmlAdapter`, bảng `outbox_events` và `OutboxSyncWorker`.
- **Environment:** Chế độ vận hành có sự cố một phần tại hệ thống bên ngoài (*Degraded External Dependency*).
- **Response:** Sau **3 lần lỗi/timeout** liên tiếp (mỗi lần giới hạn cứng `≤ 1.500 ms`), `CircuitBreaker(FAC_HUE)` chuyển sang trạng thái **`OPEN`**, ngắt ngay mọi lời gọi mạng sang Huế và chuyển lịch hẹn mới tại Huế vào hàng đợi bền vững `outbox_events` (`OUTBOX_QUEUED`); các mạch của Đà Nẵng và Quảng Nam giữ nguyên `CLOSED`. Khi HIS Huế hoạt động lại, `OutboxSyncWorker` đồng bộ bù từng lô nhỏ có Jitter cho tới khi hết hàng đợi và đóng mạch về `CLOSED`.
- **Response Measure:** Tỷ lệ đặt lịch và đồng bộ thành công tại 11 cơ sở thuộc Đà Nẵng & Quảng Nam đạt **`100%`**; độ trễ phản hồi cho yêu cầu vào Huế khi mạch đã `OPEN` đạt **`≤ 50 ms`**; **`100%`** lịch hẹn lưu trong Outbox được đồng bộ bù thành công không mất đơn sau khi HIS Huế phục hồi; độ sẵn sàng tổng thể đạt **`≥ 99.5%`**.

### `QAS-03` [ASR-03 – Bắt buộc (c)] – Ngăn chặn Lễ tân Truy cập Chéo Hồ sơ Cơ sở khác (*Security & Privacy*)
- **Source:** Nhân viên lễ tân tại cơ sở Đà Nẵng (`role = RECEPTIONIST`, `facility_id = FAC_DANANG`) đang đăng nhập với JWT hợp lệ.
- **Stimulus:** Gửi yêu cầu `GET /api/ehr/records/REC-HUE-5544` nhằm cố xem hồ sơ bệnh án và kết quả xét nghiệm của bệnh nhân chỉ đăng ký khám tại cơ sở Huế (`record.facility_id = FAC_HUE`).
- **Artifact:** `authMiddleware.js`, `abacMiddleware.js`, `ehrService.js` và `auditService.js`.
- **Environment:** Hệ thống vận hành bình thường.
- **Response:** Bộ kiểm tra chính sách Contextual ABAC truy xuất `facility_id` gốc của hồ sơ từ CSDL, phát hiện bất khớp phạm vi cơ sở (`FAC_DANANG != FAC_HUE`), lập tức từ chối yêu cầu trước khi giải mã dữ liệu và ghi một bản ghi vi phạm an ninh vào chuỗi kiểm toán bất biến.
- **Response Measure:** Phản hồi **`HTTP 403 Forbidden`** trong **`≤ 50 ms`**; lượng dữ liệu bệnh án nhạy cảm bị rò rỉ = **`0 byte`**; **`100%`** lần truy cập trái phép sinh ra bản ghi `ACCESS_DENIED_CROSS_FACILITY_EHR` có mã băm `HMAC-SHA256` hợp lệ trong bảng `audit_logs`.

### `QAS-04` [ASR-04 – Bắt buộc (d)] – Tích hợp thêm Hệ thống HIS thứ 4 (*Interoperability & Modifiability*)
- **Source:** Đội ngũ kỹ sư phát triển của chuỗi MediLink.
- **Stimulus:** Ban Giám đốc mua lại phòng khám thứ 13 (Phòng khám Quốc tế Hội An) đang dùng phần mềm HIS thứ 4 (giao tiếp chuẩn HL7 FHIR R4 REST) và yêu cầu tích hợp luồng đặt lịch vào nền tảng MediLink.
- **Artifact:** Lớp Anti-Corruption Layer (`src/core/acl/`), `CanonicalModelMapper`, `BaseHisAdapter` và `HisIntegrationDispatcher`.
- **Environment:** Giai đoạn phát triển, kiểm thử tích hợp và triển khai mở rộng (*Design / Maintenance time*).
- **Response:** Kỹ sư chỉ cần xây dựng một lớp Adapter mới (`FhirGenericAdapter`) kế thừa `BaseHisAdapter` và đăng ký vào `HisIntegrationDispatcher` kèm cấu hình URL cơ sở mới, hoàn toàn không chỉnh sửa các module nghiệp vụ lõi.
- **Response Measure:** Tổng khối lượng thực hiện và kiểm thử tích hợp **`≤ 10 ngày công (2 tuần công)`**; số tệp và số dòng mã nguồn phải sửa đổi trong `src/core/booking/`, `src/core/ehr/` và `src/core/auth/` bằng đúng **`0 dòng`**.

### `QAS-05` – Phát hiện Can thiệp Trái phép vào Nhật ký Kiểm toán & Bảo vệ Dữ liệu Tĩnh (*Security / Integrity*)
- **Source:** Kẻ tấn công nội bộ hoặc Quản trị viên CSDL (DBA) có quyền truy cập trực tiếp tệp cơ sở dữ liệu.
- **Stimulus:** Thực hiện câu lệnh SQL `UPDATE`/`DELETE` trên bảng `audit_logs` hoặc tắt tạm trigger hệ thống để sửa nội dung 1 dòng nhật ký truy cập bệnh án, đồng thời đọc trộm bảng `medical_records`.
- **Artifact:** Trigger Append-only trên SQLite, `AuditVerifier` (`HMAC-SHA256` chain) và `EncryptionService` (`AES-256-GCM`).
- **Environment:** Vận hành bình thường hoặc trong kỳ thanh tra bảo mật.
- **Response:** Mọi lệnh `UPDATE`/`DELETE` thông thường bị CSDL từ chối ngay bởi Trigger; nếu kẻ tấn công dùng quyền root sửa thẳng dữ liệu đĩa, trình quét `AuditVerifier` phát hiện chính xác vị trí dòng bị gãy mã băm `HMAC-SHA256`; các cột bệnh án trong DB chỉ hiển thị chuỗi bản mã `enc:v1:...`.
- **Response Measure:** Chặn **`100%`** lệnh SQL sửa/xóa thường; phát hiện **`100%`** hành vi sửa đổi trái phép cấp độ đĩa với thời gian quét xác minh **`< 10 ms`** cho 1.000 bản ghi (chu kỳ quét tự động `≤ 5 phút`); **`0%`** trường chẩn đoán lưu dạng văn bản rõ trong DB.

### `QAS-06` – Hiệu năng Tra cứu Lịch trống Bác sĩ Giờ Cao điểm (*Performance*)
- **Source:** 200 người dùng đồng thời trên ứng dụng bệnh nhân và quầy lễ tân.
- **Stimulus:** Cùng gửi yêu cầu tra cứu danh sách khung giờ khám trống (`GET /api/slots`) vào khung giờ cao điểm buổi sáng.
- **Artifact:** HTTP Gateway, `SlotReadCache` và CSDL SQLite WAL.
- **Environment:** Chế độ tải cao điểm thường nhật (07:30 – 08:30 sáng).
- **Response:** Hệ thống phục vụ truy vấn từ bộ nhớ đệm `SlotReadCache` (tự động xóa đệm ngay khi phát sinh giao dịch đặt/hủy lịch mới) mà không cần gọi sang các HIS ngoài.
- **Response Measure:** Độ trễ phản hồi **`p95 < 300 ms`**, thông lượng đạt **`≥ 400 requests/giây`** trên máy chủ chuẩn, tỷ lệ lỗi HTTP 5xx bằng **`0.00%`**.

### `QAS-07` – Đảm bảo Tính Lũy đẳng khi Mạng Di động Chập chờn Gửi lặp Request (*Reliability / Consistency*)
- **Source:** Ứng dụng di động của một bệnh nhân đang đi trong vùng sóng 4G yếu.
- **Stimulus:** Gửi lặp **5 lần liên tiếp** cùng một yêu cầu đặt lịch khám kèm cùng một mã `X-Idempotency-Key` do không nhận kịp gói tin phản hồi đầu tiên.
- **Artifact:** `IdempotencyManager` và `BookingService`.
- **Environment:** Đường truyền mạng khách hàng mất gói tin / trễ cao.
- **Response:** Lần đầu tiên thực hiện đặt lịch bình thường và lưu kết quả gắn với `X-Idempotency-Key`; 4 lần gửi lặp tiếp theo nhận diện trúng khóa đã xử lý và trả lại đúng thông tin lịch hẹn ban đầu mà không tạo lịch mới hay báo lỗi xung đột giả.
- **Response Measure:** Số lượng lịch hẹn tạo ra trong CSDL và trên HIS = **`1`**; 4 lần gửi lặp trả về **`HTTP 200 OK`** (`idempotent_replay = true`) với độ trễ **`< 30 ms`**.

### `QAS-08` – Cô lập Sự cố Cổng Tin nhắn Nhắc lịch Bên thứ ba (*Availability / Fault Isolation*)
- **Source:** Cổng dịch vụ gửi tin nhắn Zalo ZNS / SMS của đối tác viễn thông bên ngoài.
- **Stimulus:** Cổng tin nhắn trả lỗi tạm thời `HTTP 503` liên tiếp trước khi hoạt động ổn định trở lại.
- **Artifact:** Bảng hàng đợi `notification_jobs` và tiến trình nền `NotificationQueueWorker` (`medilink-worker`).
- **Environment:** Đối tác dịch vụ thông báo ngoài gặp sự cố chập chờn.
- **Response:** Luồng đặt lịch chính chỉ đẩy công việc vào hàng đợi rồi trả kết quả ngay cho bệnh nhân; `medilink-worker` tự động thử gửi lại theo cơ chế lùi hàm mũ (*Exponential Backoff*) tối đa 3 lần mà không làm nghẽn API chính.
- **Response Measure:** Độ trễ API đặt lịch không bị kéo giãn (**`p95 ≤ 500 ms`**); **`100%`** tin nhắn được gửi thành công ngay khi cổng SMS phục hồi trong giới hạn 3 lần thử lại (`status = SENT`).

> **Tự kiểm tra Bước 5 – Con số trong Response Measure lấy từ đâu? Làm sao kiểm chứng nó trong Prototype?**
> - Mọi con số đều được dẫn xuất từ bài toán 12 phòng khám (120 bác sĩ, 1.920 slot/ngày, cam kết 99.5% giờ làm việc = tối đa 2.1h sự cố/tháng, bóc tách 10 ngày công tích hợp Adapter) như đã trình bày tại Mục 4.
> - Trong Prototype (M4), nhóm kiểm chứng trực tiếp bằng bộ script tự động `src/tests/run_all_verification_tests.js` sử dụng bộ đo thời gian độ phân giải nano-giây `process.hrtime.bigint()`, khởi chạy máy chủ thật + 3 Mock HIS thật + CSDL SQLite thật để thu số đo khách quan (`p50`, `p95`, `p99`, tỷ lệ lỗi, trạng thái Circuit Breaker và kiểm tra bản mã trực tiếp trong DB).

---

## 6. Cây Tiện ích (Utility Tree) & Lựa chọn ASR (Bước 6)

Nhóm đánh giá toàn bộ 8 kịch bản theo hai trục độc lập:
1. **Tầm quan trọng nghiệp vụ (*Business Importance*):** `H` (Cao – ảnh hưởng sống còn tới uy tín, doanh thu hoặc pháp lý), `M` (Trung bình), `L` (Thấp).
2. **Độ khó & Rủi ro kiến trúc (*Technical Risk*):** `H` (Cao – tác động xuyên suốt cấu trúc phân rã, dễ xảy ra race condition, cascading failure hoặc lỗ hổng thiết kế nếu làm sai), `M` (Trung bình – có mẫu kỹ thuật tiêu chuẩn nhưng cần cài đặt cẩn thận), `L` (Thấp – giải quyết cục bộ dễ dàng).

```text
Utility Tree – Nền tảng MediLink
├── Consistency & Reliability
│   ├── [QAS-01 -> ASR-01] (H, H) 50 bệnh nhân cùng đặt 1 slot -> đúng 1 thành công, 0% double-booking, p95 <= 500ms
│   └── [QAS-07]           (H, M) Gửi lặp 5 lần cùng Idempotency-Key do rớt mạng 4G -> tạo đúng 1 lịch, trả 200 Replay
│
├── Availability & Fault Tolerance
│   ├── [QAS-02 -> ASR-02] (H, H) HIS Huế ngừng hoạt động 2 giờ -> 11 cơ sở khác 100% OK, Huế mở CB & lưu Outbox <= 50ms
│   └── [QAS-08]           (M, M) Cổng SMS/Zalo lỗi 503 tạm thời -> không chặn đặt lịch, Worker retry Backoff thành công
│
├── Security, Privacy & Auditability (Nghị định 13/2023/NĐ-CP)
│   ├── [QAS-03 -> ASR-03] (H, H) Lễ tân Đà Nẵng xem bệnh án Huế -> chặn 403 <= 50ms, 0 byte lộ, ghi Audit Log 100%
│   └── [QAS-05]           (H, M) Chống sửa/xóa Audit Log & mã hóa bệnh án -> Trigger + HMAC phát hiện 100% < 10ms
│
├── Interoperability & Modifiability
│   └── [QAS-04 -> ASR-04] (H, H) Tích hợp thêm HIS thứ 4 -> hoàn thành <= 2 tuần công, sửa 0 dòng code trong Core
│
└── Performance
    └── [QAS-06]           (H, L) 200 người dùng tra cứu slot trống giờ cao điểm -> p95 < 300ms qua Read-Through Cache
```

### Bảng Tổng hợp Xếp hạng và Chọn Lọc ASR Cốt lõi

| Mã kịch bản | Nhóm QA | Hạng `(Business, Risk)` | Kết luận chọn làm ASR? | Lý do xếp hạng kiến trúc |
|:-----------:|---------|:-----------------------:|:----------------------:|--------------------------|
| **`QAS-01`** | Consistency | **`(H, H)`** | **CÓ (`ASR-01`)** | Trùng lịch khám phá hủy uy tín phòng khám (`H`); kiểm soát đồng thời giữa nhiều request, khóa phân tán và đồng bộ HIS ngoài rất dễ gây race condition hoặc nghẽn khóa (`H`). |
| **`QAS-02`** | Availability | **`(H, H)`** | **CÓ (`ASR-02`)** | Sập dây chuyền 12 phòng khám gây thiệt hại nặng (`H`); đòi hỏi thiết kế Circuit Breaker theo từng cơ sở, Outbox bền vững và chống Thundering Herd khi hồi phục (`H`). |
| **`QAS-03`** | Security & Privacy | **`(H, H)`** | **CÓ (`ASR-03`)** | Vi phạm Nghị định 13/2023 chịu chế tài pháp lý nghiêm khắc (`H`); phân quyền đa cơ sở + kiểm tra Consent + che dữ liệu nhạy cảm phải xuyên suốt từ Gateway tới DB (`H`). |
| **`QAS-04`** | Interoperability | **`(H, H)`** | **CÓ (`ASR-04`)** | Quyết định khả năng mở rộng chuỗi M&A (`H`); nếu không tách kiến trúc Hexagonal + ACL + Canonical FHIR ngay từ đầu thì về sau phải đập đi xây lại toàn bộ Core (`H`). |
| `QAS-05` | Security / Integrity | `(H, M)` | Kịch bản bổ trợ trọng yếu | Rất quan trọng về pháp lý (`H`), rủi ro kỹ thuật mức `M` vì thuật toán chuỗi băm `HMAC-SHA256` + SQL Trigger hoàn toàn xác định, gắn liền cùng thiết kế của `ASR-03`. |
| `QAS-07` | Reliability | `(H, M)` | Kịch bản bổ trợ trọng yếu | Tránh đặt trùng/thu cọc trùng cho khách (`H`), độ khó kỹ thuật mức `M` và được hiện thực tích hợp trực tiếp trong cùng pipeline với `ASR-01`. |
| `QAS-08` | Availability | `(M, M)` | Kịch bản bổ trợ | Chậm tin nhắn SMS ít nghiêm trọng hơn mất lịch khám (`M`); giải quyết gọn bằng hàng đợi công việc nền (`ADR-005`). |
| `QAS-06` | Performance | `(H, L)` | Không phải ASR phức tạp | Tốc độ tra cứu rất quan trọng với trải nghiệm người dùng (`H`), nhưng với 120 bác sĩ (~1.920 slot/ngày) thì rủi ro kỹ thuật chỉ ở mức thấp (`L`), giải quyết dễ dàng bằng bộ nhớ đệm Read-Through Cache. |

> **Tự kiểm tra Bước 6 – Vì sao `QAS-01` được xếp hạng `(H, H)` còn `QAS-06` chỉ là `(H, L)`?**
> - Cả hai đều có tầm quan trọng kinh doanh cao (`Business = H`). Tuy nhiên, `QAS-06` là bài toán **đọc dữ liệu công khai quy mô nhỏ** (danh sách vài nghìn khung giờ khám), không có xung đột ghi và không gọi ra hệ thống di sản bên ngoài, nên chỉ cần áp dụng kỹ thuật kinh điển là Read-Through Cache có xóa đệm khi ghi là giải quyết triệt để (`Technical Risk = L`).
> - Trái lại, `QAS-01` là bài toán **tranh chấp ghi đồng thời cao độ (`50 chọi 1`) kết hợp tích hợp hệ thống phân tán**: nếu khóa quá lỏng sẽ sinh ra double-booking, còn nếu giữ khóa quá lâu trong lúc chờ mạng gọi sang HIS ngoài sẽ gây nghẽn toàn bộ hệ thống hoặc hết hạn khóa sớm dẫn đến ghi đè dữ liệu (`Technical Risk = H`). Vì vậy `QAS-01` mới thực sự là động lực định hình kiến trúc (*Architecturally Significant Requirement*).
