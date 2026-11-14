# MediLink – Nền Tảng Đặt Lịch Khám & Hồ Sơ Sức Khỏe Điện Tử

> **Đồ án môn học CMUSE 403 – Software Architecture & Design**  
> **Đề tài 1:** MediLink Platform – Tích hợp hệ thống quản lý phòng khám (HIS) dị thể cho chuỗi 12 phòng khám tại Đà Nẵng, Huế và Quảng Nam.

---

## 1. Thành viên Nhóm & Phân vai (4 Thành viên)

| STT | Họ và Tên | Vai trò chính | Trách nhiệm cốt lõi |
|:---:|-----------|---------------|---------------------|
| 1 | **Trần Tiến Danh** | Kiến trúc sư trưởng (*Lead Architect*) | Chủ trì phân tích ASR, lựa chọn Tactics, thiết kế C4 Views, chủ trì đánh giá ATAM và phê duyệt ADR. |
| 2 | **Lê Viết Nghĩa** | Phụ trách Yêu cầu & Tài liệu (*Requirements & Documentation Owner*) | Phân tích bài toán chuỗi 12 phòng khám, ràng buộc Nghị định 13/2023/NĐ-CP, quản lý SAD và AI Log. |
| 3 | **Nguyễn Đức Bảo Hy** | Phụ trách Prototype (*Prototype Lead*) | Xây dựng mã nguồn khung (Skeleton), Anti-Corruption Layer, Adapters cho 3 HIS, Distributed Lock và Docker hóa. |
| 4 | **Nguyễn Quang Trường** | Phụ trách QA/Test (*QA/Test Lead*) | Xây dựng kịch bản kiểm thử Quality Attributes, viết test scripts giả lập tải 50 requests, fault injection, security ABAC test. |

---

## 2. Bản đồ Tài liệu & Sản phẩm Bàn giao theo 5 Mốc (M1 – M5)

Toàn bộ sản phẩm bàn giao được tổ chức khoa học theo đúng cấu trúc yêu cầu của môn học:

```
├── ai-log.md                            # [BẮT BUỘC] Nhật ký sử dụng AI đầy đủ 6 cột theo quy định
├── README.md                            # Hướng dẫn tổng quan và hướng dẫn chạy hệ thống
├── docker-compose.yml                   # Cấu hình khởi chạy toàn bộ hệ thống bằng 1 lệnh
├── docs/
│   ├── stage-0.md                       # Giai đoạn 0: Khởi động, phân vai, 5 câu tóm tắt & giả định
│   ├── m1-architectural-drivers.md      # Mốc M1: Business Goals, Stakeholders, Use Cases, 6 QA Scenarios, Utility Tree
│   ├── m2-architecture-design.md        # Mốc M2: Tactics, Trade-offs, C4 Views & Sequence Diagrams
│   ├── m3-architecture-evaluation.md    # Mốc M3: Đánh giá ATAM rút gọn, Sensitivity/Trade-offs/Risks & Thiết kế v2
│   ├── m4-prototype-verification.md     # Mốc M4: Báo cáo kiểm chứng thực nghiệm, số liệu đo lường thực tế
│   ├── SAD.md                           # Mốc M5: Software Architecture Document hoàn chỉnh theo chuẩn ISO/IEC 42010
│   ├── presentation-slides.md           # Mốc M5: Đề cương slide bảo vệ đồ án 20 phút
│   └── qa-interview-prep.md             # Mốc M5: Bộ câu hỏi & đáp án luyện vấn đáp theo 6 cấp độ Bloom
├── diagrams/
│   ├── c4-context.puml                  # Sơ đồ C4 Level 1: System Context Diagram (kèm Trust Boundary)
│   ├── c4-container.puml                # Sơ đồ C4 Level 2: Container Diagram
│   ├── c4-component-acl.puml            # Sơ đồ C4 Level 3: Component Diagram (Anti-Corruption Layer)
│   ├── deployment-view.puml             # Sơ đồ Khung nhìn Triển khai (Deployment View)
│   ├── sequence-booking-concurrency.puml# Sơ đồ Tuần tự: Chống đặt trùng lịch (ASR-01)
│   └── sequence-security-audit.puml     # Sơ đồ Tuần tự: Phân quyền ABAC & Nhật ký kiểm toán HMAC (ASR-03 & ASR-05)
├── adr/
│   ├── 0001-architectural-style.md      # ADR-001: Lựa chọn Modular Monolith + Hexagonal Architecture
│   ├── 0002-his-integration-acl-canonical-model.md # ADR-002: Tích hợp HIS qua ACL & Mô hình Chuẩn HL7 FHIR
│   ├── 0003-concurrency-distributed-locking-idempotency.md # ADR-003: Chống double-booking qua Redis Lock & Idempotency
│   ├── 0004-security-rbac-facility-scope-immutable-audit.md # ADR-004: Phân quyền Contextual ABAC & Audit Log bất biến
│   └── 0005-asynchronous-notification-queue.md # ADR-005: Xử lý tác vụ nền & thông báo bất đồng bộ qua Redis BullMQ
└── src/                                 # Mã nguồn Prototype hoàn chỉnh
    ├── core/                            # MediLink Backend Core (Node.js Express)
    │   ├── server.js                    # Server chính & Ingress Rate Limiter (Token Bucket)
    │   ├── config.js                    # Cấu hình hệ thống & biến môi trường
    │   ├── db/database.js               # Database Engine nội bộ có ràng buộc UNIQUE slot
    │   ├── auth/                        # RBAC & Contextual ABAC Middleware (facility_id scoping)
    │   ├── booking/                     # Booking Service, Redis Lock Manager, Idempotency Manager
    │   ├── ehr/                         # EHR Service quản lý hồ sơ bệnh án nhạy cảm
    │   ├── audit/                       # Audit Service & Audit Chain Integrity Verifier (HMAC-SHA256)
    │   └── acl/                         # Anti-Corruption Layer, Canonical Mapper, Circuit Breaker & Adapters
    ├── mock-his/                        # 3 Máy chủ Giả lập HIS độc lập
    │   ├── hisDaNangServer.js           # Mock HIS Đà Nẵng (REST / JSON - Port 8001)
    │   ├── hisHueServer.js              # Mock HIS Huế (Legacy SOAP / XML - Port 8002)
    │   └── hisQuangNamServer.js         # Mock HIS Quảng Nam (Custom REST RPC - Port 8003)
    └── tests/                           # Bộ kịch bản kiểm chứng tự động hóa
        ├── test_concurrency_double_booking.js       # Kiểm chứng ASR-01 (50 concurrent requests)
        ├── test_circuit_breaker_fault_tolerance.js  # Kiểm chứng ASR-02 (Sập HIS Huế & Circuit Breaker)
        ├── test_security_rbac_abac.js               # Kiểm chứng ASR-03 (Chặn truy cập chéo 403 & Audit)
        ├── test_audit_tamper_detection.js           # Kiểm chứng ASR-05 (Phát hiện giả mạo chuỗi băm HMAC)
        ├── test_extensibility_his4.js               # Kiểm chứng ASR-04 (Tích hợp HIS 4 chuẩn HL7 FHIR)
        └── run_all_verification_tests.js            # Runner chính thực thi toàn bộ kiểm chứng & xuất báo cáo
```




## 2. Tóm tắt Kết quả Đo lường Thực nghiệm (Real Metrics Summary)

```text
╔═════════╦════════════════════════════════════════╦═══════════════════════════════════════╦══════════════╗
║ Mã ASR  ║ Thuộc tính chất lượng kiểm chứng       ║ Kết quả đo lường thực tế              ║ Đánh giá     ║
╠═════════╬════════════════════════════════════════╬═══════════════════════════════════════╬══════════════╣
║ ASR-01  ║ Chống Đặt trùng lịch (Concurrency 50)  ║ 1 thành công, 49 rejected, p95: 388ms ║  [ PASSED ]  ║
║ ASR-02  ║ Chịu lỗi & Cách ly Sự cố HIS Huế       ║ Đà Nẵng: OK, Quảng Nam: OK, Huế: OPEN ║  [ PASSED ]  ║
║ ASR-03  ║ Bảo mật & Contextual ABAC              ║ Mã HTTP: 403, Audit Log Recorded: true║  [ PASSED ]  ║
║ ASR-05  ║ Toàn vẹn Nhật ký Kiểm toán HMAC        ║ Phát hiện gian lận: CÓ (Chính xác)    ║  [ PASSED ]  ║
║ ASR-04  ║ Khả năng Mở rộng Tích hợp HIS 4 (FHIR) ║ Đồng bộ HIS 4: THÀNH CÔNG, FHIR: true ║  [ PASSED ]  ║
╚═════════╩════════════════════════════════════════╩═══════════════════════════════════════╩══════════════╝
```

---

## 3. Giấy phép & Tuyên bố Bản quyền

Đồ án được thực hiện nghiêm túc bởi Nhóm sinh viên CMUSE 403, tuân thủ đúng Quy chế học vụ và Đạo đức học thuật. Mọi công cụ AI được sử dụng đều có nhật ký giải trình đầy đủ tại `ai-log.md`.
