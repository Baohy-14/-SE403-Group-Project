# MediLink – Nền tảng Đặt lịch khám & Hồ sơ Sức khỏe Điện tử Đa cơ sở

> **Đồ án Môn học SE 403 – Thiết kế Kiến trúc Phần mềm (*Software Architecture & Design*)**  
> **Giảng viên hướng dẫn:** TS. Nguyễn Đức Mận (`@ManNguyen`)  
> **Đề tài 1:** Thiết kế kiến trúc & hiện thực Prototype nền tảng đặt lịch khám chống trùng, liên thông 3 hệ thống HIS dị thể và bảo mật dữ liệu y tế theo **Nghị định 13/2023/NĐ-CP** cho chuỗi 12 phòng khám tại Đà Nẵng, Huế và Quảng Nam.

---

## 1. Thành viên Nhóm & Phân vai Thực hiện

| STT | Họ và Tên | Vai trò đảm nhiệm | Trách nhiệm chính |
|:---:|-----------|-------------------|-------------------|
| 1 | **Trần Tiến Danh** | *Prototype Lead* | Hiện thực khung kiến trúc `src/` (`core`, `worker`, `mock-his`), khóa phân tán Redis + Fencing Token, CSDL SQLite WAL (`UNIQUE` + Trigger), mã hóa `AES-256-GCM`, Object Storage Pre-signed URL & `docker-compose.yml`. |
| 2 | **Lê Viết Nghĩa** | *Requirements & Documentation Owner* | Phân tích Business Goals, Stakeholders, 10 Use Cases, phân loại dữ liệu & trích xuất 5 ràng buộc kỹ thuật từ Nghị định 13/2023/NĐ-CP; quản lý `SAD.md`, Slide, báo cáo `.docx` và nhật ký `ai-log.md`. |
| 3 | **Nguyễn Đức Bảo Hy** | *Lead Architect* | Xây dựng Utility Tree & chọn 4 ASR `(H, H)`, lựa chọn Tactics/Style, thiết kế đồng bộ 6 sơ đồ C4/Deployment/Sequence, chủ trì đánh giá ATAM nâng cấp lên Architecture v2 và phê duyệt 7 ADRs (`ADR-001` → `ADR-007`). |
| 4 | **Nguyễn Quang Trường** | *QA / Test Lead* | Định lượng hóa 8 QA Scenarios chuẩn 6 phần kèm mô hình ước lượng tải, xây dựng 6 kịch bản kiểm thử tự động trong `src/tests/`, đo đạc số liệu thực tế và biên soạn cẩm nang luyện vấn đáp. |

---

## 2. Bản đồ Sản phẩm Bàn giao theo Quy trình 15 Bước & 5 Mốc (M1 – M5)

```text
├── README.md                                 # Tổng quan dự án, kiến trúc & hướng dẫn chạy kiểm chứng
├── ai-log.md                                 # [BẮT BUỘC] Nhật ký sử dụng AI đủ 6 cột & quy tắc 3 câu hỏi
├── BaoCao_GroupProject_MediLink_SE403.docx   # Báo cáo tổng hợp hoàn chỉnh định dạng Microsoft Word (.docx)
├── docker-compose.yml                        # Khởi chạy 6 containers trên 3 mạng cách ly (app-net, data-net, his-net)
├── docs/
│   ├── stage-0.md                            # Giai đoạn 0 (Bước 1–2): Phân vai M1–M5, 5 câu tóm tắt & 10 giả định A1–A10
│   ├── m1-architectural-drivers.md           # Mốc M1 (Bước 3–6): Goals, Stakeholders, 10 UCs, NĐ 13/2023, 8 QAS, Utility Tree
│   ├── m2-architecture-design.md             # Mốc M2 (Bước 7–10): Tactics, Bảng so sánh Lock/ACL/Style, C4 L1–L3, Deployment, Sequences
│   ├── m3-architecture-evaluation.md         # Mốc M3 (Bước 11–12): Đánh giá ATAM rút gọn, Peer Review & nâng cấp Architecture v2
│   ├── m4-prototype-verification.md          # Mốc M4 (Bước 13–14): Ánh xạ 1:1 C4 -> Code & Báo cáo số đo thực nghiệm thật
│   ├── SAD.md                                # Mốc M5 (Bước 15): Software Architecture Document hoàn chỉnh + Checklist 8 mục
│   ├── presentation-slides.md                # Mốc M5 (Bước 15): Đề cương 15 slides thuyết trình 20 phút + kịch bản Live Demo
│   └── qa-interview-prep.md                  # Mốc M5 (Bước 15): Đáp án 3 câu bắt buộc MediLink & bộ câu hỏi 6 cấp độ Bloom
├── diagrams/                                 # Mã nguồn 6 sơ đồ C4-PlantUML (đều có Trust Boundary & Legend)
│   ├── c4-context.puml                       # C4 Level 1: System Context View
│   ├── c4-container.puml                     # C4 Level 2: Container View (khớp 1:1 với Docker Compose)
│   ├── c4-component-acl.puml                 # C4 Level 3: Component View của medilink-core & Anti-Corruption Layer
│   ├── deployment-view.puml                  # Deployment View trên 3 mạng Docker cách ly
│   ├── sequence-booking-concurrency.puml     # Sequence 1: Chống Double-Booking 3 lớp & Dự phòng Outbox (ASR-01, ASR-02)
│   └── sequence-security-audit.puml          # Sequence 2: ABAC, Consent, Giải mã AES-256-GCM & Audit HMAC (ASR-03, QAS-05)
├── adr/                                      # 7 Bản ghi Quyết định Kiến trúc (Architecture Decision Records)
│   ├── 0001-architectural-style.md           # ADR-001: Modular Monolith + Hexagonal + Background Worker tách rời
│   ├── 0002-his-integration-acl-canonical-model.md        # ADR-002: ACL + HL7 FHIR R4 (Partially Superseded by ADR-007)
│   ├── 0003-concurrency-distributed-locking-idempotency.md# ADR-003: Idempotency + Redis Lock (Fencing) + SQLite UNIQUE
│   ├── 0004-security-rbac-facility-scope-immutable-audit.md# ADR-004: RBAC + Facility ABAC + Consent + AES-256-GCM + HMAC Chain
│   ├── 0005-asynchronous-notification-queue.md            # ADR-005: Hàng đợi gửi nhắc lịch Zalo/SMS/Email có Backoff
│   ├── 0006-lab-result-object-storage-presigned-url.md    # ADR-006: Lưu file PDF xét nghiệm bằng Object Storage + Pre-signed URL
│   └── 0007-v2-outbox-rate-controlled-recovery.md         # ADR-007 (v2): Circuit Breaker + Transactional Outbox + Jitter
└── src/                                      # Mã nguồn Prototype Node.js 22 thuần chuẩn (0 dependency rác bên ngoài)
    ├── core/                                 # Container `medilink-core` (gateway, auth, booking, ehr, acl, audit, db)
    ├── worker/backgroundWorker.js            # Container `medilink-worker` (OutboxSync, NotificationQueue, AuditVerifier)
    ├── mock-his/                             # 3 Containers Mock HIS độc lập: Đà Nẵng (REST), Huế (SOAP/XML), Quảng Nam (RPC)
    └── tests/                                # 6 bộ kiểm thử tự động + báo cáo JSON số đo thật `latest_verification_report.json`
```

---

## 3. Hướng dẫn Chạy Nhanh & Tái hiện Kiểm chứng (Quick Start)

### Yêu cầu môi trường
- **Node.js ≥ 22.5.0** (khuyến nghị `v22.15.0` LTS – sử dụng sẵn `node:sqlite`, `node:crypto`, `node:net`, không cần chạy `npm install`!) hoặc **Docker Compose v2**.

### Cách 1: Chạy trọn bộ 6 kịch bản kiểm chứng QA tự động bằng 1 lệnh (Nhanh nhất – ~3 giây)
```powershell
node --no-warnings src/tests/run_all_verification_tests.js
```

### Cách 2: Khởi chạy đầy đủ hạ tầng 6 Containers trên 3 Mạng Docker cách ly
```powershell
docker compose up --build -d

# Kiểm tra trạng thái sức khỏe & các bộ ngắt mạch Circuit Breaker:
curl http://localhost:3000/health

# Demo tắt hẳn container HIS Huế để chứng minh Đà Nẵng & Quảng Nam vẫn đặt lịch 100% bình thường:
docker stop mock-his-hue
```

---
## 3. Hướng dẫn Chạy Dashboard
```powershell
cd D:\-SE403-Group-Project\-SE403-Group-Project\src
node start-all.js
```
## 4. Tóm tắt Kết quả Đo lường Thực tế trên Máy Thực nghiệm của Nhóm

- **Môi trường phần cứng thực đo:** `Intel(R) Core(TM) i3-1005G1 CPU @ 1.20GHz (4 vCPU)`, `3.79 GB RAM`, `Windows 11 (win32 10.0.26200 x64)`, `Node.js v22.15.0`.

```text
╔══════════════════╦═══════════════════════════════════════╦══════════════════════════════════════════╦════════════╗
║ Kịch bản QA      ║ Thuộc tính Chất lượng Kiểm chứng      ║ Số liệu Đo lường Thực tế                 ║ Kết quả    ║
╠══════════════════╬═══════════════════════════════════════╬══════════════════════════════════════════╬════════════╣
║ ASR-01 / QAS-07  ║ Consistency & Idempotency (50 reqs)   ║ 1 OK, 49 Conflict, Replay OK, p95=142.16ms ║ [ PASSED ] ║
║ ASR-02 / ADR-007 ║ Availability & Outbox Recovery (Huế)  ║ CB=OPEN (7.38ms), Outbox=4/4             ║ [ PASSED ] ║
║ ASR-03 / NĐ 13   ║ Security ABAC, Consent & AES-256-GCM  ║ HTTP 403 (2.37ms), AES-GCM=true          ║ [ PASSED ] ║
║ QAS-05 / C-04    ║ Audit Append-Only Trigger & HMAC      ║ Trigger=Blocked, HMAC Catch=0.395ms      ║ [ PASSED ] ║
║ ASR-04           ║ Interoperability HIS #4 (HL7 FHIR R4) ║ Synced (HOIAN-FHIR-1285), Core=0 dòng    ║ [ PASSED ] ║
║ QAS-06 / QAS-08  ║ Performance (200 Reads) & Async Queue ║ 683 req/s, p95=258.5ms, Queue=SENT       ║ [ PASSED ] ║
╚══════════════════╩═══════════════════════════════════════╩══════════════════════════════════════════╩════════════╝
```
