# ADR-001: Lựa chọn Kiểu Kiến trúc Tổng thể – Modular Monolith kết hợp Hexagonal Architecture & Tách riêng Background Worker

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-05 (Mốc M2)
- **Truy vết ASR (Traces to):** `ASR-01` (Consistency), `ASR-02` (Availability), `ASR-04` (Interoperability/Modifiability), Ràng buộc `C-06` (Nhóm 4 sinh viên, 15 tuần)
- **Người đề xuất:** Nguyễn Đức Bảo Hy (Lead Architect)
- **Người phản biện & phê duyệt:** Lê Viết Nghĩa, Trần Tiến Danh, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

Hệ thống **MediLink** phục vụ chuỗi 12 phòng khám tư nhân tại Đà Nẵng (5 cơ sở), Huế (4 cơ sở) và Quảng Nam (3 cơ sở), kết nối với 3 hệ thống phần mềm quản lý phòng khám (HIS) không đồng nhất. Lưu lượng ước tính khoảng 1.500–2.500 lượt đặt khám/ngày, đỉnh điểm giờ mở lịch buổi sáng có thể xảy ra 50 bệnh nhân cùng đặt 1 khung giờ của bác sĩ chuyên khoa đầu ngành (`ASR-01`).

Đồng thời, dự án có ràng buộc thực tế nghiêm ngặt:
- Đội ngũ phát triển gồm **4 sinh viên** thực hiện trong **15 tuần**.
- Môi trường chạy thử nghiệm cần đóng gói gọn nhẹ bằng 1 lệnh `docker compose up` trên máy tính cá nhân cấu hình phổ thông (4 vCPU, 4–8 GB RAM).
- Không được chọn "Microservices chỉ vì hiện đại"; mọi quyết định phân rã phải xuất phát từ yêu cầu thuộc tính chất lượng cụ thể.

---

## 2. Các phương án đã cân nhắc (Options Considered)

### Phương án 1: Layered Monolith truyền thống (3-Tier CRUD Monolith)
- **Mô tả:** Chia ứng dụng theo tầng kỹ thuật ngang (`Controllers` → `Services` → `Repositories`) dùng chung một cơ sở dữ liệu, các dịch vụ gọi trực tiếp HTTP sang từng HIS ngay trong tầng Service.
- **Ưu điểm:** Dễ khởi tạo ban đầu, giao dịch ACID cục bộ đơn giản, chi phí vận hành thấp nhất.
- **Nhược điểm:**
  - Coupling cao giữa nghiệp vụ lõi và chi tiết giao thức của 3 HIS ngoài (`JSON`, `SOAP/XML`, `RPC`), vi phạm `ASR-04` (thêm HIS thứ 4 phải sửa sâu trong tầng Service).
  - Các tác vụ nền (gửi SMS/Zalo, đồng bộ lại lịch khi HIS lỗi) chạy chung luồng với API chính dễ gây nghẽn Event Loop.

### Phương án 2: Microservices phân tán hoàn toàn (bao gồm tách mỗi HIS thành một Microservice riêng)
- **Mô tả:** Tách thành 7–9 microservices độc lập (`Auth Service`, `Booking Service`, `EHR Service`, `Audit Service`, `Notification Service`, `HIS-DaNang Service`, `HIS-Hue Service`, `HIS-QuangNam Service`), mỗi service có database riêng và giao tiếp qua Message Broker.
- **Ưu điểm:** Cách ly lỗi ở mức tiến trình hệ điều hành; có thể scale-out độc lập từng dịch vụ.
- **Nhược điểm:**
  - **Không cần thiết với quy mô tải của chuỗi 12 phòng khám** (~2.500 đơn/ngày hoàn toàn nằm trong khả năng xử lý của 1–2 node ứng dụng). Việc vẽ mỗi HIS thành một microservice riêng chỉ làm tăng gấp ba chi phí đóng gói, mạng nội bộ và giám sát mà không mang lại lợi ích kiến trúc vượt trội so với Adapter in-process có Circuit Breaker.
  - Phá vỡ tính nhất quán tức thời cho bài toán chống double-booking (`ASR-01`) và kiểm tra phân quyền liên bảng (`ASR-03`), buộc phải xử lý giao dịch phân tán phức tạp.
  - Chi phí DevOps (Service Discovery, Distributed Tracing, quản lý nhiều DB) vượt quá nguồn lực nhóm 4 người trong 15 tuần.

### Phương án 3: Modular Monolith kết hợp Hexagonal Architecture (Ports & Adapters) + Tiến trình Background Worker tách rời *(Được chọn)*
- **Mô tả:**
  - Nghiệp vụ chính đóng gói trong container `medilink-core` nhưng phân chia ranh giới module nghiêm ngặt theo miền nghiệp vụ (`gateway`, `auth`, `booking`, `ehr`, `audit`, `acl`).
  - Áp dụng **Hexagonal Architecture**: miền nghiệp vụ lõi (`booking`, `ehr`) hoàn toàn độc lập với hạ tầng bên ngoài; toàn bộ giao tiếp với 3 HIS dị thể đi qua cổng trừu tượng `BaseHisAdapter` thuộc lớp **Anti-Corruption Layer (`acl`)**.
  - Tách riêng một tiến trình container `medilink-worker` dùng chung hạ tầng lưu trữ để xử lý bất đồng bộ hàng đợi Outbox đồng bộ HIS, gửi thông báo SMS/Zalo và quét kiểm định chuỗi băm Audit Log.

---

## 3. Quyết định (Decision)

Nhóm quyết định chọn **Phương án 3: Modular Monolith kết hợp Hexagonal Architecture (Ports & Adapters) cùng tiến trình `medilink-worker` tách rời**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive)
- **Đáp ứng tối ưu `ASR-01`:** Kiểm tra khóa phân tán và giao dịch `BEGIN IMMEDIATE` + `UNIQUE` diễn ra nguyên tử với độ trễ cực thấp (thực đo `p95 = 142.16 ms` cho 50 requests đồng thời).
- **Đáp ứng `ASR-04`:** Thêm HIS thứ 4 chỉ cần viết thêm 1 class Adapter kế thừa `BaseHisAdapter` mà không sửa đổi `0 dòng` code trong `booking` hay `ehr`.
- **Tách tải nền hiệu quả (`ASR-02`, `QAS-08`):** Tiến trình `medilink-worker` tách biệt giúp việc retry HIS Huế hay gửi lại SMS lỗi không bao giờ làm chậm API đặt lịch của bệnh nhân.
- **Thực tế & khả thi:** Toàn bộ 6 containers trong `docker-compose.yml` khởi chạy nhẹ nhàng dưới 250 MB RAM, phù hợp 100% với nhóm 4 thành viên.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations)
- **Hệ quả tiêu cực 1:** Các module cùng chạy trong tiến trình `medilink-core` dùng chung bộ nhớ Heap/CPU; nếu một Adapter xử lý XML quá nặng hoặc treo socket có thể ảnh hưởng toàn tiến trình.
  - *Giảm thiểu:* Áp đặt cứng `HIS_TIMEOUT_MS = 1500ms` (`AbortSignal.timeout`) và bọc từng cơ sở bằng `CircuitBreaker` riêng để ngắt mạch tức thì.
- **Hệ quả tiêu cực 2:** Lập trình viên có nguy cơ gọi tắt (import chéo trạng thái nội bộ) giữa các module làm suy thoái ranh giới kiến trúc theo thời gian.
  - *Giảm thiểu:* Quy định rõ cấu trúc thư mục `src/core/{gateway,auth,booking,ehr,acl,audit}` và chỉ giao tiếp qua public service methods; kiểm soát qua code review của Lead Architect.
