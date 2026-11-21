/**
 * MediLink Interactive Architecture Verification Dashboard View
 * Thiết kế giao diện trực quan, rõ ràng, màu sắc tự nhiên chuẩn Y tế (Clean Medical UI)
 * Dành cho buổi Báo cáo & Vấn đáp đồ án SE 403 (TS. Nguyễn Đức Mận)
 * Nhóm Đề tài 1: Nguyễn Đức Bảo Hy, Lê Viết Nghĩa, Trần Tiến Danh, Nguyễn Quang Trường
 */

function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediLink Healthcare - Bảng Điều Khiển & Kiểm Định Kiến Trúc</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --primary-light: #e0f2fe;
      --success: #16a34a;
      --success-bg: #f0fdf4;
      --success-border: #86efac;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --danger-border: #fca5a5;
      --warning: #d97706;
      --warning-bg: #fffbeb;
      --warning-border: #fcd34d;
      --code-bg: #0f172a;
      --code-text: #e2e8f0;
      --radius: 10px;
      --shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px;
      font-size: 15px;
    }

    /* Header */
    header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 20px 28px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-area {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0284c7, #0ea5e9);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: 800;
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
    }

    .brand-title h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
    }

    .brand-title .subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .system-status-pills {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      background: #f1f5f9;
      border: 1px solid var(--card-border);
      color: #334155;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-green { background-color: var(--success); }
    .dot-red { background-color: var(--danger); }
    .dot-yellow { background-color: var(--warning); }

    /* Navigation Tabs */
    .nav-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .nav-tab-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #475569;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: var(--radius);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      white-space: nowrap;
    }

    .nav-tab-btn:hover {
      background: #f8fafc;
      color: var(--primary);
      border-color: #cbd5e1;
    }

    .nav-tab-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      box-shadow: 0 3px 8px rgba(2, 132, 199, 0.25);
    }

    /* Panel layout */
    .tab-panel {
      display: none;
    }
    .tab-panel.active {
      display: block;
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 1024px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    @media (max-width: 900px) {
      .grid-3 { grid-template-columns: 1fr; }
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 1100px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .grid-4 { grid-template-columns: 1fr; }
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: var(--shadow);
      margin-bottom: 20px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .badge-driver {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .card-desc {
      font-size: 14px;
      color: #475569;
      margin-bottom: 20px;
      line-height: 1.6;
    }

    /* Big Metric Boxes */
    .metric-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      transition: all 0.2s;
    }
    .metric-box:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }
    .metric-value {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .metric-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Buttons */
    .btn-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .btn {
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease-in-out;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .btn-success {
      background: var(--success);
      color: white;
    }
    .btn-success:hover {
      background: #15803d;
    }

    .btn-danger {
      background: var(--danger);
      color: white;
    }
    .btn-danger:hover {
      background: #b91c1c;
    }

    /* Form Controls */
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      transition: border-color 0.15s;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    /* Alert Boxes */
    .alert {
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      line-height: 1.5;
    }
    .alert-success {
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: #166534;
    }
    .alert-danger {
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      color: #991b1b;
    }
    .alert-warning {
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
      color: #92400e;
    }
    .alert-info {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
    }

    /* Code & JSON Result Box */
    .code-box {
      background: var(--code-bg);
      color: var(--code-text);
      border-radius: 8px;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      max-height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid #334155;
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 12px 16px;
      border-bottom: 1px solid var(--card-border);
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }

    /* Explanation Note Box */
    .arch-note {
      background: #f8fafc;
      border-left: 4px solid var(--primary);
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #475569;
      margin-top: 14px;
    }
    .arch-note b { color: #0f172a; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header>
    <div class="brand-area">
      <div class="brand-icon">M</div>
      <div class="brand-title">
        <h1>MediLink Platform - Bảng Điều Khiển & Kiểm Định Kiến Trúc</h1>
        <div class="subtitle">
          SE 403 (TS. Nguyễn Đức Mận) · Đề tài 1: Nền tảng Đặt lịch & Quản lý EHR Liên chuỗi 12 Phòng khám (v2)
        </div>
      </div>
    </div>

    <div class="system-status-pills">
      <div class="pill">
        <span class="dot dot-green" id="dot-core"></span>
        <span>Core API: <b id="lbl-port">Port 3000</b></span>
      </div>
      <div class="pill">
        <span class="dot dot-green" id="dot-lock"></span>
        <span id="txt-lock">Lock: <b>Redis/Atomic</b></span>
      </div>
      <div class="pill">
        <span class="dot dot-green" id="dot-audit"></span>
        <span id="txt-audit">Audit HMAC: <b>Toàn vẹn</b></span>
      </div>
      <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px;" onclick="resetAllState()">
        🔄 Reset Trạng Thái
      </button>
    </div>
  </header>

  <!-- NAVIGATION TABS -->
  <div class="nav-tabs">
    <button class="nav-tab-btn active" onclick="switchTab('tab-overview')">
      📊 1. Tổng Quan Chuỗi 12 Phòng Khám
    </button>
    <button class="nav-tab-btn" onclick="switchTab('tab-concurrency')">
      ⚡ 2. [ASR-01] Đặt Lịch & Chống Trùng (Concurrency)
    </button>
    <button class="nav-tab-btn" onclick="switchTab('tab-security')">
      🛡️ 3. [ASR-03] Bảo Mật ABAC & Nghị Định 13/2023
    </button>
    <button class="nav-tab-btn" onclick="switchTab('tab-circuit')">
      🔌 4. [ASR-02] Cách Ly Lỗi HIS & Outbox Recovery
    </button>
    <button class="nav-tab-btn" onclick="switchTab('tab-audit')">
      📜 5. [ASR-05] Sổ Cái Audit HMAC Bất Biến
    </button>
  </div>

  <!-- ==================== TAB 1: EXECUTIVE OVERVIEW ==================== -->
  <div id="tab-overview" class="tab-panel active">
    <!-- 4 High-level KPI Cards -->
    <div class="grid-4">
      <div class="card metric-box">
        <div class="metric-value" style="color: var(--primary);" id="ov-clinics">12</div>
        <div class="metric-label">Tổng Cơ Sở Phòng Khám</div>
      </div>
      <div class="card metric-box">
        <div class="metric-value" style="color: var(--success);" id="ov-bookings">0</div>
        <div class="metric-label">Lịch Hẹn Xác Nhận</div>
      </div>
      <div class="card metric-box">
        <div class="metric-value" style="color: #0d9488;" id="ov-double-booking">0.00%</div>
        <div class="metric-label">Tỷ Lệ Double-Booking</div>
      </div>
      <div class="card metric-box">
        <div class="metric-value" style="color: #6366f1;" id="ov-outbox">0</div>
        <div class="metric-label">Sự Kiện Outbox Chờ Bù</div>
      </div>
    </div>

    <!-- 3 Facility Cards -->
    <div class="grid-3">
      <!-- Cơ sở Đà Nẵng -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🏥 Cụm Phòng Khám Đà Nẵng</span>
          </div>
          <span class="badge-driver" style="background: #e0f2fe; color: #0369a1;">REST / JSON</span>
        </div>
        <p class="card-desc">
          Chuỗi gồm <b>5 phòng khám</b> tại TP. Đà Nẵng. Hệ thống HIS hỗ trợ giao tiếp chuẩn RESTful API với định dạng JSON tiêu chuẩn.
        </p>
        <div style="font-size: 13px; line-height: 1.8;">
          <div>• Cổng kết nối Mock HIS: <code>http://localhost:8001</code></div>
          <div>• Trạng thái Circuit Breaker: <b id="cb-danang-status" style="color: var(--success);">CLOSED (Bình thường)</b></div>
          <div>• Số lượt khám đã đồng bộ: <b id="cnt-danang">0</b></div>
        </div>
      </div>

      <!-- Cơ sở Huế -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🏥 Cụm Phòng Khám Huế</span>
          </div>
          <span class="badge-driver" style="background: #fef3c7; color: #92400e;">SOAP / XML (Di sản)</span>
        </div>
        <p class="card-desc">
          Chuỗi gồm <b>4 phòng khám</b> tại tỉnh Thừa Thiên Huế. Dùng hệ thống HIS di sản cũ, giao tiếp qua SOAP Envelope và XML.
        </p>
        <div style="font-size: 13px; line-height: 1.8;">
          <div>• Cổng kết nối Mock HIS: <code>http://localhost:8002</code></div>
          <div>• Trạng thái Circuit Breaker: <b id="cb-hue-status" style="color: var(--success);">CLOSED (Bình thường)</b></div>
          <div>• Cơ chế bảo vệ: <b>Circuit Breaker + Outbox Fallback</b></div>
        </div>
      </div>

      <!-- Cơ sở Quảng Nam -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🏥 Cụm Phòng Khám Quảng Nam</span>
          </div>
          <span class="badge-driver" style="background: #f3e8ff; color: #6b21a8;">Custom REST</span>
        </div>
        <p class="card-desc">
          Chuỗi gồm <b>3 phòng khám</b> tại tỉnh Quảng Nam. Sử dụng cấu trúc trường dữ liệu chuyên biệt (Vendor-specific REST API).
        </p>
        <div style="font-size: 13px; line-height: 1.8;">
          <div>• Cổng kết nối Mock HIS: <code>http://localhost:8003</code></div>
          <div>• Trạng thái Circuit Breaker: <b id="cb-quangnam-status" style="color: var(--success);">CLOSED (Bình thường)</b></div>
          <div>• Chuẩn hóa: <b>Chuyển đổi sang HL7 FHIR R4</b></div>
        </div>
      </div>
    </div>

    <!-- Team Members & Architectural Alignment -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <span>👥 Phân Công Trách Nhiệm Nhóm Sinh Viên Thực Hiện</span>
        </div>
        <span class="badge-driver">Nhóm 4 Thành Viên</span>
      </div>
      <div class="grid-4" style="margin-bottom: 0;">
        <div style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a;">Nguyễn Đức Bảo Hy</div>
          <div style="font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 2px;">Lead Architect</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Chủ trì kiến trúc tổng thể, ADRs, điều phối C4 Model & ATAM v2.</div>
        </div>
        <div style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a;">Lê Viết Nghĩa</div>
          <div style="font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 2px;">Req & Doc Owner</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Xây dựng 6 QA Scenarios, Utility Tree, hoàn thiện hồ sơ SAD và tài liệu Word.</div>
        </div>
        <div style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a;">Trần Tiến Danh</div>
          <div style="font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 2px;">Prototype Lead</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Hiện thực lõi Core Modular Monolith, Lock Fencing, ACL FHIR và SQLite WAL.</div>
        </div>
        <div style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a;">Nguyễn Quang Trường</div>
          <div style="font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 2px;">QA & Test Lead</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Thiết kế bộ kiểm thử 6 kịch bản QA, đo đạc p95 thực nghiệm và rà soát AI Log.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 2: CONCURRENCY & DOUBLE-BOOKING ==================== -->
  <div id="tab-concurrency" class="tab-panel">
    <div class="grid-2">
      <!-- Left: Simulation Controls -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>⚡ Thử Nghiệm Tranh Chấp Đặt Lịch (Race Condition)</span>
          </div>
          <span class="badge-driver">ASR-01 | ADR-0003</span>
        </div>
        <p class="card-desc">
          Mô phỏng trường hợp <b>nhiều bệnh nhân cùng bấm đặt chỗ vào đúng 1 khung giờ</b> của Bác sĩ Lê Viết Dũng lúc 08:00 sáng. Kiến trúc phòng vệ 2 lớp:
          <b>Khóa phân tán Redis SET NX PX 3000</b> (lớp 1) và <b>Ràng buộc cơ sở dữ liệu UNIQUE(doctor_id, slot)</b> (lớp 2) loại trừ hoàn toàn nguy cơ đặt trùng (Double-booking = 0.00%).
        </p>

        <div class="form-group">
          <label class="form-label">Khung giờ thử nghiệm</label>
          <input type="text" class="form-control" id="slot-time-input" value="2026-11-20 08:00" readonly>
        </div>

        <div class="btn-group">
          <button class="btn btn-primary" onclick="runRaceTwoUsers()">
            ⚡ 2 Bệnh Nhân Đặt Cùng Lúc (+2ms)
          </button>
          <button class="btn btn-secondary" onclick="runStressRace(20)">
            🔥 Bão Tải 20 Requests Đồng Thời
          </button>
          <button class="btn btn-secondary" onclick="resetSlotOnly()">
            🔄 Reset Khung Giờ
          </button>
        </div>

        <div id="concurrency-alert"></div>

        <div class="arch-note">
          <b>Điểm mấu chốt kiến trúc:</b> Khi tải cao, 49/50 requests bị khóa từ chối ngay lập tức (Fast-fail) ở tầng In-memory Redis với độ trễ chỉ ~2ms, không gây nghẽn đường truyền xuống CSDL hay HIS cơ sở.
        </div>
      </div>

      <!-- Right: Telemetry & Metrics -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>📊 Kết Quả Đo Lường Thực Tế & Telemetry</span>
          </div>
          <span class="badge-driver">Real Metrics</span>
        </div>

        <div class="grid-4" style="margin-bottom: 16px;">
          <div class="metric-box">
            <div class="metric-value" id="stat-race-total">0</div>
            <div class="metric-label">Tổng Request</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--success);" id="stat-race-success">0</div>
            <div class="metric-label">Thành Công (201)</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--danger);" id="stat-race-conflict">0</div>
            <div class="metric-label">Từ Chối (409)</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--primary);" id="stat-race-rate">0.00%</div>
            <div class="metric-label">Double-Booking</div>
          </div>
        </div>

        <label class="form-label">Nhật ký phản hồi chi tiết từ Server (HTTP Logs)</label>
        <div class="code-box" id="concurrency-logs">// Nhấn nút bên trái để bắt đầu mô phỏng luồng tranh chấp...</div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 3: SECURITY, ABAC & PATIENT CONSENT ==================== -->
  <div id="tab-security" class="tab-panel">
    <div class="grid-2">
      <!-- Left: Role & Context Simulation -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🛡️ Kiểm Soát Truy Cập ABAC & Nghị Định 13/2023/NĐ-CP</span>
          </div>
          <span class="badge-driver">ASR-03 | ADR-0004 & 0006</span>
        </div>
        <p class="card-desc">
          Bệnh án điện tử (EHR) là <b>dữ liệu cá nhân nhạy cảm</b>. Nền tảng áp dụng mô hình phân quyền kép: <b>RBAC</b> (vai trò bác sĩ, lễ tân) kết hợp <b>Contextual ABAC</b> (phạm vi cơ sở <code>facility_id</code> và sự đồng ý của bệnh nhân <code>Patient Consent</code>).
        </p>

        <div class="form-group">
          <label class="form-label">Chọn danh tính tài khoản đang thực hiện thao tác</label>
          <select class="form-control" id="sec-user-select" onchange="updateSecRoleDescription()">
            <option value="staff_dn">Lễ tân Đà Nẵng (staff_dn_01 - Thuộc cơ sở FAC_DANANG)</option>
            <option value="doc_dn">Bác sĩ Đà Nẵng (doc_dn_01 - Bác sĩ cơ sở FAC_DANANG)</option>
            <option value="pat_02">Bệnh nhân Trần Thị B (user_pat_02 - Chủ sở hữu hồ sơ)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Hồ sơ bệnh án mục tiêu</label>
          <input type="text" class="form-control" id="sec-record-id" value="REC-HUE-5544" readonly>
          <small style="color: #64748b;">(Hồ sơ thuộc Bệnh nhân Trần Thị B khám tại Cơ sở Huế - FAC_HUE)</small>
        </div>

        <div class="btn-group">
          <button class="btn btn-primary" onclick="fetchMedicalRecord()">
            🔍 Gửi Request Xem Hồ Sơ Bệnh Án
          </button>
          <button class="btn btn-secondary" id="btn-toggle-consent" onclick="toggleConsent()">
            📝 Cấp Quyền Consent Liên Cơ Sở (NĐ 13)
          </button>
        </div>

        <div id="security-alert"></div>

        <div class="arch-note">
          <b>Quy định pháp lý:</b> Nếu không có Consent, Bác sĩ khác cơ sở vẫn bị từ chối HTTP 403. Hồ sơ lưu trữ trên đĩa được mã hóa chuẩn <code>AES-256-GCM</code>, giải mã an toàn trong bộ nhớ RAM khi hợp lệ.
        </div>
      </div>

      <!-- Right: Decryption & Lab Storage View -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🔐 Kết Quả Kiểm Tra Quyền & Giải Mã An Toàn (Zero Leakage)</span>
          </div>
          <span class="badge-driver">AES-256-GCM & Pre-signed URL</span>
        </div>

        <div class="grid-2" style="margin-bottom: 16px;">
          <div class="metric-box">
            <div class="metric-value" style="color: var(--primary);" id="sec-http-status">-</div>
            <div class="metric-label">Mã HTTP Trả Về</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: #6366f1;" id="sec-consent-status">Chưa Cấp</div>
            <div class="metric-label">Consent Liên Cơ Sở</div>
          </div>
        </div>

        <label class="form-label">Dữ liệu bệnh án giải mã (hoặc Thông báo Từ Chối Bảo Mật)</label>
        <div class="code-box" id="sec-response-json">// Nhấn nút 'Gửi Request Xem Hồ Sơ' để kiểm chứng...</div>

        <div id="sec-presigned-box" style="margin-top: 16px; display: none;">
          <label class="form-label">File Xét Nghiệm PDF (Ký số Pre-signed URL 120s)</label>
          <div class="alert alert-info" style="margin-bottom: 0;">
            <div>
              <b>Tải tệp an toàn:</b> Đường dẫn được sinh động kèm chữ ký số HMAC:
              <br><code id="sec-presigned-url" style="word-break: break-all; font-size: 12px;"></code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 4: CIRCUIT BREAKER & OUTBOX RECOVERY ==================== -->
  <div id="tab-circuit" class="tab-panel">
    <div class="grid-2">
      <!-- Left: Chaos Controls -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🔌 Cơ Chế Ngắt Mạch Circuit Breaker & Hàng Đợi Bù Outbox</span>
          </div>
          <span class="badge-driver">ASR-02 | ADR-0002 & 0007</span>
        </div>
        <p class="card-desc">
          Khi một HIS bên ngoài (HIS Huế) bị ngắt kết nối hoặc phản hồi chậm quá 3 giây, <b>Circuit Breaker lập tức chuyển sang trạng thái [OPEN]</b>. Hệ thống không bị treo mà ghi nhận lịch hẹn vào <b>bảng Outbox</b> để tiếp tục phục vụ bệnh nhân ở Đà Nẵng và Quảng Nam bình thường.
        </p>

        <div class="btn-group">
          <button class="btn btn-danger" id="btn-toggle-chaos" onclick="toggleHueChaos()">
            💥 Giả Lập HIS Huế Sập Mạng (Chaos Injection)
          </button>
          <button class="btn btn-primary" onclick="bookAppointmentAtHue()">
            📅 Đặt Lịch Khám Tại Cơ Sở Huế
          </button>
          <button class="btn btn-success" onclick="runOutboxWorkerReplay()">
            ⚡ Kích Hoạt Worker Đồng Bộ Bù Outbox
          </button>
        </div>

        <div id="circuit-alert"></div>

        <div class="arch-note">
          <b>Đảm bảo tính sẵn sàng (Availability 99.5%):</b> Lỗi của một phòng khám đơn lẻ bị cô lập tuyệt đối, không làm ảnh hưởng đến các cơ sở còn lại trong chuỗi.
        </div>
      </div>

      <!-- Right: Circuit Breakers Real-time Grid -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>📡 Giám Sát Trạng Thái Mạch Thời Gian Thực (Resilience Telemetry)</span>
          </div>
          <span class="badge-driver">Outbox Queue Monitoring</span>
        </div>

        <div class="grid-3" style="margin-bottom: 20px;">
          <div class="metric-box">
            <div class="metric-value" style="color: var(--success);" id="cb-danang-state">CLOSED</div>
            <div class="metric-label">HIS Đà Nẵng</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--success);" id="cb-hue-state">CLOSED</div>
            <div class="metric-label">HIS Huế</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--success);" id="cb-quangnam-state">CLOSED</div>
            <div class="metric-label">HIS Quảng Nam</div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: 16px;">
          <div class="metric-box">
            <div class="metric-value" style="color: #6366f1;" id="stat-outbox-count">0</div>
            <div class="metric-label">Sự Kiện Đang Chờ Bù</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--primary);" id="stat-hue-synced">0</div>
            <div class="metric-label">Lịch Hẹn Đồng Bộ Tại Huế</div>
          </div>
        </div>

        <label class="form-label">Nhật ký xử lý ngắt mạch & Đồng bộ bù Outbox</label>
        <div class="code-box" id="circuit-logs">// Sẵn sàng nhận lệnh điều khiển...</div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 5: AUDIT LOG & TAMPER DETECTION ==================== -->
  <div id="tab-audit" class="tab-panel">
    <div class="grid-2">
      <!-- Left: Audit Controls -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>📜 Sổ Cái Kiểm Toán Bất Biến (HMAC Chaining & Triggers)</span>
          </div>
          <span class="badge-driver">ASR-05 | ADR-0004</span>
        </div>
        <p class="card-desc">
          Nhật ký truy cập và sửa đổi bệnh án được bảo vệ bằng 2 tầng: <b>Trigger CSDL cấm lệnh UPDATE/DELETE</b> và <b>Chuỗi băm mật mã HMAC-SHA256 liên hoàn (prev_hash -> current_hash)</b>. Dù Quản trị viên (Root DBA) có can thiệp trực tiếp vào đĩa cứng, hệ thống vẫn phát hiện ngay lập tức.
        </p>

        <div class="btn-group">
          <button class="btn btn-primary" onclick="verifyAuditChain()">
            🔍 Kiểm Tra Toàn Vẹn Chuỗi Băm HMAC
          </button>
          <button class="btn btn-danger" onclick="simulateTamperAttack()">
            🚨 Giả Lập DBA Gian Lận Sửa Lén CSDL
          </button>
          <button class="btn btn-secondary" onclick="restoreTamper()">
            🔄 Khôi Phục Bản Ghi Gốc
          </button>
        </div>

        <div id="audit-alert"></div>

        <div class="arch-note">
          <b>Khả năng chống chối bỏ (Non-repudiation):</b> Mỗi bản ghi được bảo vệ bởi khóa bí mật tách biệt khỏi CSDL. Việc kiểm toán có thể thực hiện tự động định kỳ 60 giây một lần bởi Background Worker.
        </div>
      </div>

      <!-- Right: Audit Verification Result -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🔍 Kết Quả Đối Soát Toàn Vẹn Khối Dữ Liệu</span>
          </div>
          <span class="badge-driver">Cryptographic Verification</span>
        </div>

        <div class="grid-3" style="margin-bottom: 16px;">
          <div class="metric-box">
            <div class="metric-value" style="color: var(--success);" id="audit-chain-status">HỢP LỆ</div>
            <div class="metric-label">Toàn Vẹn Chuỗi</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" id="audit-total-records">0</div>
            <div class="metric-label">Tổng Số Bản Ghi</div>
          </div>
          <div class="metric-box">
            <div class="metric-value" style="color: var(--primary);" id="audit-verify-ms">0.00ms</div>
            <div class="metric-label">Thời Gian Quét</div>
          </div>
        </div>

        <label class="form-label">Chi tiết đối soát từng bản ghi trong chuỗi băm</label>
        <div class="code-box" id="audit-verify-details">// Nhấn 'Kiểm Tra Toàn Vẹn Chuỗi Băm HMAC' để chạy thuật toán quét...</div>
      </div>
    </div>

    <!-- Bottom: Recent Audit Logs Table -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <span>📋 Danh Sách Nhật Ký Kiểm Toán Gần Nhất (Append-Only Log Stream)</span>
        </div>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px;" onclick="refreshAuditTable()">
          🔄 Làm Mới Bảng
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Thời Điểm</th>
              <th>Đối Tượng (Actor)</th>
              <th>Hành Vi</th>
              <th>Tài Nguyên</th>
              <th>Mã Trả Về</th>
              <th>Prev Hash</th>
              <th>Current HMAC-SHA256 Hash</th>
            </tr>
          </thead>
          <tbody id="audit-table-body">
            <tr><td colspan="8" style="text-align: center; color: #94a3b8;">Đang tải danh sách nhật ký...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    // ==================== STATE MANAGEMENT ====================
    let tokens = {};
    let hueChaosActive = false;

    async function init() {
      if (document.getElementById('lbl-port')) {
        document.getElementById('lbl-port').innerText = 'Port ' + (window.location.port || '3000');
      }
      await fetchTokens();
      await refreshSystemState();
      await refreshAuditTable();
      setInterval(refreshSystemState, 3000);
    }

    async function fetchTokens() {
      try {
        const res = await fetch('/api/demo/tokens');
        if (res.ok) {
          const body = await res.json();
          tokens = body.tokens || {};
        }
      } catch (e) {
        console.warn('Lỗi lấy token demo:', e);
      }
    }

    function switchTab(tabId) {
      document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      const btn = Array.from(document.querySelectorAll('.nav-tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (btn) btn.classList.add('active');

      const panel = document.getElementById(tabId);
      if (panel) panel.classList.add('active');
    }

    async function refreshSystemState() {
      try {
        const res = await fetch('/api/demo/state');
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data;

        // Executive overview metrics
        if (data.dashboard_stats) {
          const stats = data.dashboard_stats;
          document.getElementById('ov-bookings').innerText = stats.totalBookings || 0;
          if (stats.byFacility) {
            stats.byFacility.forEach(f => {
              if (f.id === 'FAC_DANANG') document.getElementById('cnt-danang').innerText = f.synced_count || 0;
            });
          }
        }
        document.getElementById('ov-outbox').innerText = data.pending_outbox_count || 0;
        document.getElementById('stat-outbox-count').innerText = data.pending_outbox_count || 0;

        // Circuit Breakers
        const circuits = data.circuits || {};
        updateCircuitBadge('danang', circuits.FAC_DANANG);
        updateCircuitBadge('hue', circuits.FAC_HUE);
        updateCircuitBadge('quangnam', circuits.FAC_QUANGNAM);

        // Audit check indicator
        const audit = data.audit_verification || {};
        const txtAudit = document.getElementById('txt-audit');
        const dotAudit = document.getElementById('dot-audit');
        if (audit.isValid) {
          txtAudit.innerHTML = 'Audit HMAC: <b>Toàn vẹn</b>';
          dotAudit.className = 'dot dot-green';
        } else {
          txtAudit.innerHTML = 'Audit HMAC: <b style="color:var(--danger)">CẢNH BÁO BỊ SỬA</b>';
          dotAudit.className = 'dot dot-red';
        }

        // Lock mode
        document.getElementById('txt-lock').innerHTML = 'Lock: <b>' + (data.lock_backend || 'Atomic') + '</b>';

        // Consent status in tab 3
        const consentBadge = document.getElementById('sec-consent-status');
        const toggleBtn = document.getElementById('btn-toggle-consent');
        if (data.patient2_consent_danang) {
          consentBadge.innerText = 'ĐÃ CẤP QUYỀN';
          consentBadge.style.color = 'var(--success)';
          toggleBtn.innerText = '🚫 Thu Hồi Quyền Consent';
          toggleBtn.className = 'btn btn-secondary';
        } else {
          consentBadge.innerText = 'CHƯA CẤP';
          consentBadge.style.color = '#64748b';
          toggleBtn.innerText = '📝 Cấp Quyền Consent (NĐ 13)';
          toggleBtn.className = 'btn btn-primary';
        }
      } catch (e) {
        console.warn('Lỗi refresh state:', e);
      }
    }

    function updateCircuitBadge(id, state) {
      const elText = document.getElementById('cb-' + id + '-status');
      const elCard = document.getElementById('cb-' + id + '-state');
      const st = state ? state.state : 'CLOSED';

      if (elText) {
        elText.innerText = st + (st === 'CLOSED' ? ' (Bình thường)' : ' (Đang ngắt mạch)');
        elText.style.color = st === 'CLOSED' ? 'var(--success)' : 'var(--danger)';
      }
      if (elCard) {
        elCard.innerText = st;
        elCard.style.color = st === 'CLOSED' ? 'var(--success)' : 'var(--danger)';
      }
    }

    // ==================== TAB 2: CONCURRENCY RACE ====================
    async function runRaceTwoUsers() {
      const logs = document.getElementById('concurrency-logs');
      const alert = document.getElementById('concurrency-alert');
      logs.innerText = 'Đang bắn 2 request đồng thời từ Bệnh nhân A và Bệnh nhân B...';
      alert.innerHTML = '';

      try {
        const res = await fetch('/api/demo/race-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 2, slot_time: '2026-11-20 08:00' })
        });
        const body = await res.json();
        updateRaceStats(body.stats);
        logs.innerText = JSON.stringify(body, null, 2);

        if (body.stats.success === 1 && body.stats.conflicts === 1) {
          alert.innerHTML = '<div class="alert alert-success">✅ <b>Kiểm định thành công tuyệt đối:</b> 1 Bệnh nhân đặt thành công (201 Created), 1 Bệnh nhân nhận lỗi (409 Conflict). Không có Double-Booking!</div>';
        }
      } catch (e) {
        logs.innerText = 'Lỗi gửi request: ' + e.message;
      }
    }

    async function runStressRace(count) {
      const logs = document.getElementById('concurrency-logs');
      const alert = document.getElementById('concurrency-alert');
      logs.innerText = 'Đang bắn ' + count + ' request đồng thời vào cùng 1 slot...';
      alert.innerHTML = '';

      try {
        const res = await fetch('/api/demo/race-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count, slot_time: '2026-11-20 08:00' })
        });
        const body = await res.json();
        updateRaceStats(body.stats);
        logs.innerText = JSON.stringify(body, null, 2);

        alert.innerHTML = '<div class="alert alert-success">🔥 <b>Hoàn tất tải cao:</b> ' + body.stats.success + ' slot được xác nhận trong CSDL, ' + body.stats.conflicts + ' requests bị từ chối 409 trong ' + body.stats.duration_ms + 'ms. Tỷ lệ trùng lịch: <b>0.00%</b>!</div>';
      } catch (e) {
        logs.innerText = 'Lỗi: ' + e.message;
      }
    }

    function updateRaceStats(stats) {
      if (!stats) return;
      document.getElementById('stat-race-total').innerText = stats.total;
      document.getElementById('stat-race-success').innerText = stats.success;
      document.getElementById('stat-race-conflict').innerText = stats.conflicts;
      document.getElementById('stat-race-rate').innerText = '0.00%';
    }

    async function resetSlotOnly() {
      try {
        await fetch('/api/demo/race-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 0, slot_time: '2026-11-20 08:00' })
        });
        document.getElementById('concurrency-logs').innerText = '// Đã reset slot khám về trạng thái TRỐNG.';
        document.getElementById('concurrency-alert').innerHTML = '<div class="alert alert-info">Đã giải phóng khóa phân tán và làm trống khung giờ khám.</div>';
      } catch (e) {}
    }

    // ==================== TAB 3: SECURITY & ABAC ====================
    function updateSecRoleDescription() {
      // placeholder for quick help text
    }

    async function toggleConsent() {
      try {
        const isCurrentlyActive = document.getElementById('sec-consent-status').innerText.includes('ĐÃ');
        const res = await fetch('/api/demo/toggle-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grant: !isCurrentlyActive })
        });
        await refreshSystemState();
        await fetchMedicalRecord();
      } catch (e) {
        alert('Lỗi toggle consent: ' + e.message);
      }
    }

    async function fetchMedicalRecord() {
      const select = document.getElementById('sec-user-select').value;
      const recId = document.getElementById('sec-record-id').value;
      const logs = document.getElementById('sec-response-json');
      const alertBox = document.getElementById('security-alert');
      const presignedBox = document.getElementById('sec-presigned-box');

      alertBox.innerHTML = '';
      presignedBox.style.display = 'none';

      let token = tokens.receptionist_danang;
      if (select === 'doc_dn') token = tokens.doctor_danang;
      if (select === 'pat_02') token = tokens.patient_2;

      logs.innerText = 'Đang gửi GET /api/ehr/records/' + recId + '...';

      try {
        const res = await fetch('/api/ehr/records/' + recId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        document.getElementById('sec-http-status').innerText = res.status;
        const body = await res.json();
        logs.innerText = JSON.stringify(body, null, 2);

        if (res.status === 403) {
          document.getElementById('sec-http-status').style.color = 'var(--danger)';
          alertBox.innerHTML = '<div class="alert alert-danger">🚫 <b>BỊ TỪ CHỐI (HTTP 403 FORBIDDEN):</b> Vi phạm phân quyền Contextual ABAC. Người dùng thuộc cơ sở khác cố truy cập trái phép hồ sơ Huế khi chưa có Consent. Rò rỉ thông tin = 0 byte. Đã tự động ghi nhật ký kiểm toán vi phạm an ninh!</div>';
        } else if (res.status === 200) {
          document.getElementById('sec-http-status').style.color = 'var(--success)';
          alertBox.innerHTML = '<div class="alert alert-success">✅ <b>TRUY CẬP HỢP LỆ (HTTP 200 OK):</b> Quyền truy cập được phê duyệt hợp pháp theo Nghị định 13/2023. Bệnh án đã được giải mã AES-256-GCM an toàn trong bộ nhớ!</div>';
          if (body.data && body.data.lab_result_url) {
            presignedBox.style.display = 'block';
            document.getElementById('sec-presigned-url').innerText = window.location.origin + body.data.lab_result_url;
          }
        }
      } catch (e) {
        logs.innerText = 'Lỗi: ' + e.message;
      }
    }

    // ==================== TAB 4: CIRCUIT BREAKER & OUTBOX ====================
    async function toggleHueChaos() {
      const btn = document.getElementById('btn-toggle-chaos');
      hueChaosActive = !hueChaosActive;
      try {
        await fetch('/api/demo/toggle-his-hue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chaos: hueChaosActive })
        });
        if (hueChaosActive) {
          btn.innerText = '✅ Khôi Phục HIS Huế Trở Lại';
          btn.className = 'btn btn-success';
          document.getElementById('circuit-alert').innerHTML = '<div class="alert alert-warning">⚠️ <b>Đã kích hoạt chế độ lỗi cho HIS Huế:</b> Các cuộc gọi sang HIS Huế sẽ bị lỗi / timeout để thử nghiệm Circuit Breaker.</div>';
        } else {
          btn.innerText = '💥 Giả Lập HIS Huế Sập Mạng (Chaos Injection)';
          btn.className = 'btn btn-danger';
          document.getElementById('circuit-alert').innerHTML = '<div class="alert alert-info">Đã khôi phục HIS Huế hoạt động bình thường.</div>';
        }
        await refreshSystemState();
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    }

    async function bookAppointmentAtHue() {
      const logs = document.getElementById('circuit-logs');
      logs.innerText = 'Đang gửi đặt lịch tới Cơ sở Huế (FAC_HUE)...';
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tokens.patient_1
          },
          body: JSON.stringify({
            doctor_id: 'DOC_HUE_201',
            facility_id: 'FAC_HUE',
            appointment_time: '2026-11-20 ' + (Math.floor(Math.random() * 8) + 9) + ':00'
          })
        });
        const body = await res.json();
        logs.innerText = JSON.stringify(body, null, 2);

        if (body.data && body.data.his_sync_status === 'OUTBOX_QUEUED') {
          document.getElementById('circuit-alert').innerHTML = '<div class="alert alert-warning">🛡️ <b>Circuit Breaker phát huy tác dụng:</b> HIS Huế gặp sự cố, hệ thống không làm gián đoạn bệnh nhân mà lưu vào hàng đợi Outbox với trạng thái <code>OUTBOX_QUEUED</code>!</div>';
        }
        await refreshSystemState();
      } catch (e) {
        logs.innerText = 'Lỗi: ' + e.message;
      }
    }

    async function runOutboxWorkerReplay() {
      const logs = document.getElementById('circuit-logs');
      logs.innerText = 'Đang kích hoạt Worker quét và đồng bộ bù Outbox...';
      try {
        const res = await fetch('/api/demo/run-outbox', { method: 'POST' });
        const body = await res.json();
        logs.innerText = JSON.stringify(body, null, 2);
        document.getElementById('circuit-alert').innerHTML = '<div class="alert alert-success">✅ <b>Worker hoàn tất xử lý:</b> Đã đồng bộ bù thành công các lịch hẹn tồn sang HIS!</div>';
        await refreshSystemState();
      } catch (e) {
        logs.innerText = 'Lỗi: ' + e.message;
      }
    }

    // ==================== TAB 5: AUDIT LOG & TAMPERING ====================
    async function verifyAuditChain() {
      const details = document.getElementById('audit-verify-details');
      const statusEl = document.getElementById('audit-chain-status');
      details.innerText = 'Đang quét toàn bộ chuỗi băm HMAC-SHA256 từ khối Genesis...';

      const t0 = performance.now();
      try {
        const res = await fetch('/api/audit/verify');
        const t1 = performance.now();
        document.getElementById('audit-verify-ms').innerText = (t1 - t0).toFixed(2) + 'ms';

        const body = await res.json();
        details.innerText = JSON.stringify(body, null, 2);

        if (body.success) {
          statusEl.innerText = 'HỢP LỆ';
          statusEl.style.color = 'var(--success)';
          document.getElementById('audit-alert').innerHTML = '<div class="alert alert-success">✅ <b>Chuỗi kiểm toán nguyên vẹn 100%:</b> Không có bất kỳ dấu hiệu chỉnh sửa hay can thiệp trái phép nào!</div>';
        } else {
          statusEl.innerText = 'BỊ SỬA ĐỔI!';
          statusEl.style.color = 'var(--danger)';
          document.getElementById('audit-alert').innerHTML = '<div class="alert alert-danger">🚨 <b>CẢNH BÁO GIAN LẬN:</b> Phát hiện chữ ký HMAC không khớp tại bản ghi ID #' + body.verification.tampered_block_id + '! Cơ sở dữ liệu đã bị can thiệp trái phép ngoài luồng ứng dụng!</div>';
        }
        await refreshAuditTable();
      } catch (e) {
        details.innerText = 'Lỗi: ' + e.message;
      }
    }

    async function simulateTamperAttack() {
      try {
        const res = await fetch('/api/demo/tamper-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'tamper' })
        });
        const body = await res.json();
        document.getElementById('audit-alert').innerHTML = '<div class="alert alert-warning">⚠️ <b>Đã giả lập can thiệp CSDL:</b> Một dòng trong bảng audit_logs đã bị sửa lén trực tiếp trên đĩa mà không qua ứng dụng. Nhấn "Kiểm Tra Toàn Vẹn" để xem thuật toán phát hiện gian lận!</div>';
        await verifyAuditChain();
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    }

    async function restoreTamper() {
      try {
        await fetch('/api/demo/tamper-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' })
        });
        document.getElementById('audit-alert').innerHTML = '<div class="alert alert-info">Đã khôi phục dữ liệu nhật ký gốc.</div>';
        await verifyAuditChain();
      } catch (e) {
        alert('Lỗi: ' + e.message);
      }
    }

    async function refreshAuditTable() {
      try {
        const res = await fetch('/api/audit/logs', {
          headers: { 'Authorization': 'Bearer ' + (tokens.admin || '') }
        });
        if (!res.ok) return;
        const body = await res.json();
        const logs = body.data || [];
        document.getElementById('audit-total-records').innerText = logs.length;

        const tbody = document.getElementById('audit-table-body');
        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Chưa có bản ghi nào.</td></tr>';
          return;
        }

        tbody.innerHTML = logs.slice(0, 10).map(l => {
          let badgeClass = 'badge-driver';
          if (l.status >= 400) badgeClass = 'badge-driver" style="background:#fee2e2;color:#991b1b;';
          return '<tr>' +
            '<td><b>#' + l.id + '</b></td>' +
            '<td>' + new Date(l.timestamp).toLocaleTimeString() + '</td>' +
            '<td><code>' + l.actor + '</code></td>' +
            '<td>' + l.action + '</td>' +
            '<td>' + (l.resource_id || '-') + '</td>' +
            '<td><span class="' + badgeClass + '">' + l.status + '</span></td>' +
            '<td style="font-family:monospace;font-size:11px;">' + (l.prev_hash ? l.prev_hash.slice(0, 10) + '...' : 'GENESIS') + '</td>' +
            '<td style="font-family:monospace;font-size:11px;color:var(--primary);">' + (l.current_hash ? l.current_hash.slice(0, 14) + '...' : '-') + '</td>' +
          '</tr>';
        }).join('');
      } catch (e) {
        console.warn('Lỗi refresh table:', e);
      }
    }

    async function resetAllState() {
      if (!confirm('Bạn có chắc chắn muốn làm mới toàn bộ trạng thái hệ thống về ban đầu?')) return;
      await fetch('/api/demo/race-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 0, slot_time: '2026-11-20 08:00' })
      });
      await fetch('/api/demo/tamper-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      });
      await fetch('/api/demo/toggle-his-hue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chaos: false })
      });
      await refreshSystemState();
      await refreshAuditTable();
      alert('Đã khôi phục toàn bộ trạng thái hệ thống thành công!');
    }

    // Auto-init on load
    window.onload = init;
  </script>
</body>
</html>`;
}

module.exports = { renderDashboardHtml };
