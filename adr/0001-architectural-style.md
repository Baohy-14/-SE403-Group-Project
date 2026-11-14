# ADR-001: Lựa chọn Phong cách Kiến trúc Tổng thể (Architectural Style)

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 2026-11-05
- **Người đề xuất (Author):** Nguyễn Đức Bảo Hy (Lead Architect)
- **Người tham gia rà soát (Reviewers):** Lê Viết Nghĩa, Trần Tiến Danh, Nguyễn Quang Trường

---

## 1. Bối cảnh (Context)

Nền tảng MediLink phục vụ chuỗi 12 phòng khám tư nhân tại Đà Nẵng, Huế và Quảng Nam. Hệ thống phải đảm bảo các thuộc tính chất lượng cốt lõi:
- Tính nhất quán mạnh (Strict Consistency) chống double-booking khi 50 người cùng đặt 1 slot (ASR-01).
- Tính sẵn sàng (Availability ≥ 99.5%) và cô lập lỗi khi một hệ thống HIS cơ sở gặp sự cố (ASR-02).
- Khả năng mở rộng tích hợp thêm HIS thứ 4 trong ≤ 2 tuần công mà không sửa Core (ASR-04).
- Ràng buộc thực tế: Dự án triển khai trong 15 tuần với nhóm phát triển gồm 4 kỹ sư, tài nguyên máy chủ có giới hạn và cần đóng gói triển khai kiểm chứng tự động qua Docker Compose.

---

## 2. Các phương án được cân nhắc (Options Considered)

1. **Phương án 1: Microservices Architecture thuần túy**
   - *Mô tả:* Tách rời hoàn toàn các dịch vụ thành các container/tiến trình riêng biệt: Booking Service, Patient Service, EHR Service, ACL Service, Notification Service, mỗi dịch vụ có cơ sở dữ liệu riêng (Database-per-service).
   - *Ưu điểm:* Khả năng scale-out độc lập, cách ly lỗi ở mức tiến trình rất tốt.
   - *Nhược điểm:* Độ phức tạp phân tán cực lớn (Distributed Transactions / 2PC / Saga), khó đảm bảo tính nhất quán tức thời cho việc chống double-booking; overhead mạng cao; chi phí vận hành, giám sát (Distributed Tracing, API Gateway, Service Mesh) vượt quá năng lực vận hành của nhóm 4 người trong 15 tuần.

2. **Phương án 2: Monolith truyền thống (Dạng khối đơn)**
   - *Mô tả:* Toàn bộ ứng dụng được đóng gói trong một ứng dụng duy nhất, chung một cơ sở dữ liệu và các tầng mã nguồn xen lẫn nhau.
   - *Ưu điểm:* Đơn giản, chi phí triển khai thấp, giao dịch ACID cục bộ rất dễ thực hiện.
   - *Nhược điểm:* Độ ghép nối (coupling) cao, dễ biến thành "Big Ball of Mud", lỗi tại module tích hợp HIS có thể làm sập toàn bộ tiến trình ứng dụng; vi phạm nguyên tắc Open-Closed khi mở rộng thêm cơ sở mới.

3. **Phương án 3: Modular Monolith kết hợp Hexagonal / Ports-and-Adapters Architecture (Lựa chọn)**
   - *Mô tả:* Hệ thống triển khai dưới dạng một đơn vị thực thi duy nhất (Single Deployable Unit) nhưng bên trong mã nguồn được phân rã thành các Module độc lập nghiêm ngặt theo miền nghiệp vụ (Domain-Driven Design). Tầng giao tiếp với các HIS bên ngoài được tách biệt hoàn toàn qua Ports-and-Adapters (Anti-Corruption Layer). Áp dụng in-memory event bus hoặc hàng đợi Redis cho các tác vụ bất đồng bộ.
   - *Ưu điểm:* Giữ được sự đơn giản của Monolith trong triển khai và kiểm thử (1 lệnh `docker compose up`); đảm bảo tính nhất quán dữ liệu cao; cấu trúc mã nguồn rành mạch; cách ly lỗi thông qua Circuit Breaker và Worker pools; khi lưu lượng tăng trưởng trong tương lai, từng module hoàn toàn có thể trích xuất thành Microservice độc lập mà không cần viết lại nghiệp vụ.

---

## 3. Quyết định (Decision)

Nhóm quyết định lựa chọn **Phương án 3: Modular Monolith kết hợp Hexagonal / Ports-and-Adapters Architecture**.

---

## 4. Hệ quả (Consequences)

### Tích cực (Positive):
- Đảm bảo triển khai nhanh chóng, dễ kiểm thử end-to-end trên môi trường Docker chuẩn hóa.
- Giảm thiểu triệt để độ trễ mạng nội bộ (in-process calls thay vì network RPC), hỗ trợ tối đa cho ASR-01 (xử lý đặt lịch trong < 800ms).
- Ranh giới module rõ ràng giúp phân chia công việc độc lập cho 4 thành viên (Lead, Requirements, Prototype, QA).
- Tuân thủ nguyên tắc Clean Architecture, sẵn sàng lộ trình phân rã sang Microservices khi chuỗi mở rộng lên 50 phòng khám.

### Tiêu cực & Biện pháp giảm thiểu (Negative & Mitigations):
- *Nguy cơ rò rỉ phụ thuộc (Leaky Abstraction):* Các lập trình viên có thể vô tình gọi chéo giữa các module nội bộ mà không qua interface chuẩn.
  - *Biện pháp:* Thiết lập quy tắc kiểm tra mã nguồn (linting rules, dependency validation) chặn đứng việc import trực tiếp module nội bộ khác trừ khi qua Public Service Interface.
- *Chia sẻ tài nguyên tiến trình (Resource Sharing):* Nếu module tích hợp HIS bị nghẽn CPU hoặc rò rỉ bộ nhớ, có thể ảnh hưởng đến Booking Core.
  - *Biện pháp:* Áp dụng mẫu Circuit Breaker, Worker Threads / Worker Pool riêng biệt và thiết lập Timeout Budget ngặt nghèo (2.5s) cho mọi lời gọi mạng ngoài.
