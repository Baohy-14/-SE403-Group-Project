# Đề cương Slide Bảo vệ Đồ án Cuối kỳ M5 – Nền tảng MediLink (20 Phút)

- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm (*Software Architecture & Design*)
- **Giảng viên chấm & vấn đáp:** TS. Nguyễn Đức Mận (`@ManNguyen`)
- **Tổng thời lượng:** **20 phút** (*14 phút thuyết trình chia đều 4 thành viên + 6 phút Live Demo thực nghiệm*) + **Phiên Vấn đáp Q&A**

---

## Bảng Phân chia Thời lượng Trình bày Giữa 4 Thành viên

| Thứ tự | Người trình bày | Slides phụ trách | Thời lượng | Nội dung trọng tâm |
|:------:|-----------------|:----------------:|:----------:|--------------------|
| **Phần 1** | **Lê Viết Nghĩa** (*Req & Doc Owner*) | Slide 1 → Slide 4 | **3.5 phút** | Bối cảnh chuỗi 12 phòng khám, Business Goals, phân tích Nghị định 13/2023/NĐ-CP và 5 ràng buộc kỹ thuật. |
| **Phần 2** | **Nguyễn Đức Bảo Hy** (*Lead Architect*) | Slide 5 → Slide 9 | **4.5 phút** | Utility Tree, 4 ASR `(H, H)`, lựa chọn Tactics/Style (`ADR-001`..`007`), sơ đồ C4/Deployment và nâng cấp ATAM từ v1 lên v2. |
| **Phần 3** | **Trần Tiến Danh** (*Prototype Lead*) | Slide 10 → Slide 11 + **Live Demo** | **6.0 phút** | Ánh xạ 1:1 từ C4 sang mã nguồn `src/` & `docker-compose.yml`; chạy trực tiếp kịch bản Concurrency, tắt HIS Huế và kiểm tra bản mã SQLite. |
| **Phần 4** | **Nguyễn Quang Trường** (*QA/Test Lead*) | Slide 12 → Slide 15 | **4.0 phút** | Cơ sở tính toán Response Measure, phân tích số liệu đo thật trên phần cứng nhóm, bài học kinh nghiệm và tổng kết. |

---

## Nội dung Chi tiết Từng Slide

### Slide 1 – Trang bìa (*Lê Viết Nghĩa*)
- **Tiêu đề:** MEDILINK – KIẾN TRÚC NỀN TẢNG ĐẶT LỊCH KHÁM & HỒ SƠ SỨC KHỎE ĐIỆN TỬ ĐA CƠ SỞ
- **Môn học:** SE 403 – Thiết kế Kiến trúc Phần mềm | **GVHD:** TS. Nguyễn Đức Mận
- **Nhóm thực hiện:** Trần Tiến Danh – Lê Viết Nghĩa – Nguyễn Đức Bảo Hy – Nguyễn Quang Trường

### Slide 2 – Bối cảnh Bài toán & Vì sao Không phải CRUD Thông thường (*Lê Viết Nghĩa*)
- Chuỗi **12 phòng khám** tại Đà Nẵng (5), Huế (4), Quảng Nam (3) đang đặt lịch qua điện thoại/Excel → trùng lịch ~4.5%.
- **3 hệ thống HIS di sản dị thể** không cho phép sửa DB: REST/JSON (UUID), SOAP 1.1/XML (`HUE-BN-xxx`), Custom RPC (`ma_bn_noi_bo` số nguyên).
- Đứt mạng 2 giờ ở 1 chi nhánh dễ kéo treo toàn chuỗi; dữ liệu bệnh án nhạy cảm chịu chế tài nghiêm khắc của **Nghị định 13/2023/NĐ-CP**.

### Slide 3 – Business Goals & Hóa giải Xung đột Stakeholders (*Lê Viết Nghĩa*)
- **KPI cốt lõi:** `Double-booking = 0.00%`; `Availability ≥ 99.5%` giờ làm việc; tích hợp HIS thứ 4 `≤ 2 tuần công`; `0` vi phạm dữ liệu cá nhân.
- **Xung đột chính:** Bác sĩ cần mở bệnh sử liên cơ sở tức thì **↔** Pháp luật đòi hỏi Consent, phân quyền cơ sở và mã hóa nhiều lớp.

### Slide 4 – Phân loại Dữ liệu & 5 Constraints từ Nghị định 13/2023/NĐ-CP (*Lê Viết Nghĩa*)
- Bảng 3 mức: *Công khai* → *Cá nhân cơ bản* → *Cá nhân nhạy cảm sức khỏe (Điều 2 NĐ 13)*.
- **5 Ràng buộc kỹ thuật (`C-01` → `C-05`):** Bảng `patient_consents` tường minh; mã hóa cấp trường `AES-256-GCM` tách khóa; ABAC theo `facility_id` + che `[REDACTED]` với lễ tân; Object Storage + Pre-signed URL 120s cho file PDF; Audit Log chỉ ghi thêm (Trigger + HMAC).

### Slide 5 – Nguồn gốc Con số Định lượng & Utility Tree (*Nguyễn Đức Bảo Hy*)
- Quy mô 120 bác sĩ (`1.920 slot/ngày`, `420 giờ làm việc/tháng` → `99.5%` chỉ cho phép tối đa `2.1 giờ` gián đoạn/tháng).
- Chọn **4 ASR cốt lõi hạng `(H, H)`:**
  - `ASR-01`: 50 người tranh 1 slot → đúng 1 `201`, 49 `409`, `p95 ≤ 500 ms`.
  - `ASR-02`: HIS Huế sập 2 giờ → ĐN & QN `100%` OK, Huế phản hồi Outbox `≤ 50 ms`.
  - `ASR-03`: Lễ tân xem chéo cơ sở → chặn `403 ≤ 50 ms`, `0 byte` lộ, ghi Audit `100%`.
  - `ASR-04`: Cắm thêm HIS thứ 4 `≤ 10 ngày công`, sửa `0 dòng` Core.

### Slide 6 – Biện luận Phong cách Kiến trúc Tổng thể (`ADR-001`) (*Nguyễn Đức Bảo Hy*)
- Bảng đối chiếu có trọng số: Layered Monolith (`2.98`) vs Microservices tách từng HIS (`3.38`) vs **Modular Monolith + Hexagonal + `medilink-worker` tách rời (`4.81`)**.
- Tránh bẫy "vẽ mỗi HIS thành 1 microservice không lý do": Adapter in-process bọc `CircuitBreaker` + Worker nền vừa cô lập lỗi hoàn hảo, vừa chạy nhẹ `< 250 MB RAM` cho nhóm 4 người.

### Slide 7 – Chống Double-Booking 3 Lớp (`ADR-003`) & Tích hợp ACL FHIR (`ADR-002`) (*Nguyễn Đức Bảo Hy*)
- So sánh 4 cơ chế khóa → Chọn phòng thủ 3 lớp: `X-Idempotency-Key` → `Redis SET NX PX 3000 + Fencing Token` (**nhả khóa ngay sau khi ghi DB, không giữ khóa chờ mạng HIS!**) → `SQLite UNIQUE(active_slot_key)`.
- Lớp **ACL + HL7 FHIR R4 (`Patient` kèm bảng `MPI`, `Appointment`)**: So sánh rõ vì sao vượt trội hơn *Adapter-per-HIS không có Canonical Model*.

### Slide 8 – Sơ đồ C4 Container, Component & Deployment View (*Nguyễn Đức Bảo Hy*)
- Trình chiếu sơ đồ Container & Deployment gồm 6 containers trên 3 mạng Docker (`app-net`, `data-net` với `internal: true`, `his-net`), chỉ rõ **Trust Boundaries**.

### Slide 9 – Đánh giá ATAM & Tiến hóa lên Architecture v2 (`ADR-007`) (*Nguyễn Đức Bảo Hy*)
- 3 rủi ro phát hiện ở v1 và cách giải quyết dứt điểm ở v2:
  1. `Risk R-01` (Giữ khóa lâu & spam F5) → Nhả khóa sớm + `Fencing Token` + `TokenBucketRateLimiter`.
  2. `Risk R-02` (*Thundering Herd* khi HIS Huế hồi phục) → Đổi `ADR-002` sang *Partially Superseded*, ban hành `ADR-007` với `Transactional Outbox + Random Jitter`.
  3. `Risk R-03` (Lộ bệnh án cùng cơ sở & DBA sửa log) → Masking `[REDACTED]`, bảng `patient_consents`, SQL Trigger + `AuditIntegrityWorker`.

### Slide 10 – Ánh xạ 1:1 từ Sơ đồ Kiến trúc sang Mã nguồn Prototype (*Trần Tiến Danh*)
- Sơ đồ cây thư mục `src/{core, worker, mock-his, tests}` viết bằng Node.js 22 chuẩn (`node:sqlite`, `node:crypto`, `node:net`), 100% thành viên đọc hiểu từng hàm.

### Slide 11 – Kịch bản Live Demo Trực tiếp 4 Phút (*Trần Tiến Danh*)
1. Chạy lệnh `node --no-warnings src/tests/run_all_verification_tests.js` trực tiếp trên máy thuyết trình.
2. Trình chiếu log trực quan 6 thí nghiệm:
   - 50 requests bắn song song → `1` mã `201`, `49` mã `409`.
   - Ngắt `mock-his-hue` → mạch Huế nhảy sang `OPEN`, Đà Nẵng & Quảng Nam vẫn `SYNCED`, bật lại Huế → Outbox đồng bộ bù `4/4`.
   - In dòng thô từ SQLite `medical_records` cho thấy chuỗi mã hóa `enc:v1:...` và demo `AuditVerifier` bắt sống dòng log `#1` bị sửa!

### Slide 12 – Bảng Kết quả Đo lường Thực nghiệm trên Phần cứng Nhóm (*Nguyễn Quang Trường*)
- Nêu rõ cấu hình máy đo: `Intel Core i3-1005G1 @ 1.20GHz (4 vCPU), 3.79 GB RAM, Windows 11, Node v22.15.0`.
- Đối chiếu SLA vs Thực đo:
  - `ASR-01`: `p95 = 142.16 ms` (SLA `≤ 500 ms`), `0.00%` double-booking.
  - `ASR-02`: Fast-fail Outbox `7.38 ms` (SLA `≤ 50 ms`), hồi phục `4/4`.
  - `ASR-03`: Chặn `403` trong `2.37 ms`.
  - `QAS-05`: Phát hiện sửa log trong `0.395 ms`.
  - `QAS-06`: 200 reads đạt `683 req/s`, `p95 = 258.50 ms` (câu chuyện thật tối ưu từ `301.93 ms` nhờ thêm `SlotReadCache`!).

### Slide 13 – Minh bạch Sử dụng AI (`ai-log.md`) (*Nguyễn Quang Trường*)
- Trình bày quy tắc **"3 câu hỏi"** nhóm áp dụng nghiêm ngặt trước khi giữ bất kỳ gợi ý nào từ AI và các ví dụ cụ thể nhóm đã bác bỏ/chỉnh sửa đề xuất của AI (như bỏ Microservices tách từng HIS, sửa lỗi giữ khóa khi gọi mạng, sửa lỗi lấy `facility_id` từ client).

### Slide 14 – Bài học Kinh nghiệm & Hướng Mở rộng Khi Tải Tăng 10 Lần (*Nguyễn Quang Trường*)
- Nếu làm lại từ đầu: Đưa `Transactional Outbox` và `Contract Testing` vào ngay từ M2.
- Lộ trình mở rộng 10x (120 phòng khám): Chuyển SQLite sang PostgreSQL Primary/Replicas, bật cụm Redis Sentinel và tách riêng module `acl` thành dịch vụ độc lập.

### Slide 15 – Tổng kết & Sẵn sàng Vấn đáp (*Cả nhóm*)
- Hoàn thành đầy đủ 15 bước qua 5 mốc (M1 → M5), đồng bộ 100% giữa Tài liệu – Sơ đồ – ADR – Prototype – Số đo thực tế.
- Mời Giảng viên đặt câu hỏi vấn đáp bất kỳ cho từng thành viên!
