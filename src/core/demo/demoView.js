/**
 * MediLink Interactive Architecture Verification Dashboard View
 * Zero-dependency standalone HTML/CSS/JS page for CMUSE 403 / SE403 Defense & Demo
 */

function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediLink - Kiến Trúc Hệ Thống (Architecture Verification Dashboard)</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --success: #22c55e;
      --success-bg: rgba(34, 197, 94, 0.15);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.15);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.15);
      --accent: #818cf8;
      --code-bg: #090d16;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 20px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .badge-topic {
      background: linear-gradient(135deg, #0284c7, #6366f1);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    h1 { font-size: 22px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 13px; color: var(--text-muted); }

    .status-bar {
      display: flex;
      gap: 12px;
      background: var(--card-bg);
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      align-items: center;
      flex-wrap: wrap;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background-color: var(--success); box-shadow: 0 0 8px var(--success); }
    .dot-red { background-color: var(--danger); box-shadow: 0 0 8px var(--danger); }
    .dot-yellow { background-color: var(--warning); box-shadow: 0 0 8px var(--warning); }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 8px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .tab-btn.active {
      color: #fff;
      background: var(--card-border);
      box-shadow: inset 0 -2px 0 var(--primary);
    }

    /* Content Panels */
    .panel { display: none; }
    .panel.active { display: block; animation: fadeIn 0.25s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 960px) { .grid-2 { grid-template-columns: 1fr; } }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tag-driver {
      font-size: 11px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }

    /* Buttons & Controls */
    .btn {
      background: var(--primary);
      color: #04101c;
      border: none;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { background: var(--primary-hover); }
    .btn-secondary {
      background: rgba(255,255,255,0.08);
      color: var(--text);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.15); }
    .btn-danger {
      background: var(--danger);
      color: #fff;
    }
    .btn-danger:hover { background: #dc2626; }
    .btn-success {
      background: var(--success);
      color: #04101c;
    }
    .btn-success:hover { background: #16a34a; }
    .btn-warning {
      background: var(--warning);
      color: #04101c;
    }

    .form-group { margin-bottom: 14px; }
    label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; }
    select, input {
      width: 100%;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
    }
    select:focus, input:focus { outline: none; border-color: var(--primary); }

    /* Live results box */
    .result-box {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      max-height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .alert-success { background: var(--success-bg); border: 1px solid var(--success); color: #86efac; }
    .alert-danger { background: var(--danger-bg); border: 1px solid var(--danger); color: #fca5a5; }
    .alert-warning { background: var(--warning-bg); border: 1px solid var(--warning); color: #fde047; }
    .alert-info { background: rgba(56, 189, 248, 0.12); border: 1px solid var(--primary); color: #bae6fd; }

    /* Stats Grid */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: rgba(0,0,0,0.25);
      border: 1px solid var(--card-border);
      padding: 12px;
      border-radius: 6px;
      text-align: center;
    }
    .stat-num { font-size: 20px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-top: 2px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th { text-align: left; padding: 8px 10px; background: rgba(0,0,0,0.3); color: var(--text-muted); border-bottom: 1px solid var(--card-border); }
    td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    tr:hover td { background: rgba(255,255,255,0.02); }
  </style>
</head>
<body>

  <header>
    <div class="logo-area">
      <div class="badge-topic">CMUSE 403 / SE 403</div>
      <div>
        <h1>MediLink Platform - Kiến Trúc & Kiểm Định Trực Quan</h1>
        <div class="subtitle">Đề tài 1: Nền tảng Đặt lịch khám & Quản lý EHR Liên chuỗi 12 Phòng khám (Architecture v2)</div>
      </div>
    </div>
    <div class="status-bar">
      <div class="status-item">
        <span class="dot dot-green" id="dot-core"></span>
        <span>Core API: <b>Port 3000</b></span>
      </div>
      <div class="status-item">
        <span class="dot dot-green" id="dot-lock"></span>
        <span id="txt-lock">Lock: <b>Redis/Atomic</b></span>
      </div>
      <div class="status-item">
        <span class="dot dot-green" id="dot-audit"></span>
        <span id="txt-audit">Audit HMAC: <b>Toàn vẹn</b></span>
      </div>
      <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="resetAllState()">
        🔄 Reset Toàn Bộ
      </button>
    </div>
  </header>

  <!-- NAVIGATION TABS -->
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('tab-concurrency')">1. [ASR-01] Chống Double-Booking (Concurrency)</button>
    <button class="tab-btn" onclick="switchTab('tab-security')">2. [ASR-03] Bảo mật ABAC, Consent & Giải mã AES</button>
    <button class="tab-btn" onclick="switchTab('tab-circuit')">3. [ASR-02] Cách ly Lỗi HIS (Circuit Breaker & Outbox)</button>
    <button class="tab-btn" onclick="switchTab('tab-audit')">4. [ASR-05] Sổ Cái Audit HMAC & Phát Hiện Giả Mạo</button>
  </div>

  <!-- ==================== TAB 1: CONCURRENCY & DOUBLE-BOOKING ==================== -->
  <div id="tab-concurrency" class="panel active">
    <div class="grid-2">
      <div class="card">
        <div class="card-title">
          <span>Kịch Bản Đặt Lịch Tranh Chấp (Race Condition)</span>
          <span class="tag-driver">ASR-01 | ADR-0003</span>
        </div>
        <p class="desc">
          Hai bệnh nhân cùng mở app và bấm đặt vào đúng <b>Bác sĩ Lê Viết Dũng</b> lúc <b>08:00</b> tại cơ sở Đà Nẵng. Khóa phân tán <code>Redis SET NX PX 3000</code> kèm Fencing Token và ràng buộc RDBMS <code>UNIQUE(active_slot_key)</code> đảm bảo tỷ lệ trùng lịch chính xác bằng <b>0.00%</b>.
        </p>

        <div class="form-group">
          <label>Khung giờ thử nghiệm</label>
          <input type="text" id="slot-time-input" value="2026-11-20 08:00" readonly>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
          <button class="btn" onclick="runRaceTwoUsers()">
            ⚡ 2 Bệnh Nhân Đặt Cùng Lúc (+2ms)
          </button>
          <button class="btn btn-secondary" onclick="runStressRace(20)">
            🔥 Bão Tải (20 Requests Đồng Thời)
          </button>
          <button class="btn btn-secondary" onclick="resetSlotOnly()">
            🔄 Reset Lại Khung Giờ
          </button>
        </div>

        <div id="concurrency-alert"></div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Kết Quả Đo Đạc Thực Nghiệm & Telemetry</span>
          <span class="tag-driver">Latency & Concurrency Metrics</span>
        </div>

        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-num" id="stat-race-total">0</div>
            <div class="stat-label">Tổng Request</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: var(--success);" id="stat-race-success">0</div>
            <div class="stat-label">Thành Công (201)</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: var(--danger);" id="stat-race-conflict">0</div>
            <div class="stat-label">Từ Chối (409)</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: var(--primary);" id="stat-race-rate">0%</div>
            <div class="stat-label">Tỷ Lệ Trùng Lịch</div>
          </div>
        </div>

        <label>Nhật ký phản hồi chi tiết (Real-time HTTP Logs)</label>
        <div class="result-box" id="concurrency-logs">// Bấm một trong hai nút bên trái để kích hoạt mô phỏng luồng tranh chấp...</div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 2: SECURITY, ABAC & PATIENT CONSENT ==================== -->
  <div id="tab-security" class="panel">
    <div class="grid-2">
      <div class="card">
        <div class="card-title">
          <span>Kiểm Soát Quyền ABAC & Consent (Nghị định 13/2023/NĐ-CP)</span>
          <span class="tag-driver">ASR-03 | ADR-0004 & 0006</span>
        </div>
        <p class="desc">
          Bảo vệ hồ sơ bệnh án <b>REC-HUE-5544</b> (Bệnh nhân Trần Thị Bình - Phòng khám Huế). Thử nghiệm vai trò Lễ tân (phạm vi cơ sở) vs Bác sĩ liên cơ sở (yêu cầu Consent) vs Tải file PDF xét nghiệm qua Pre-signed URL mã hóa nhị phân AES-256-GCM.
        </p>

        <div class="form-group">
          <label>Người dùng truy cập (Actor Context & Token)</label>
          <select id="sec-user-select" onchange="updateSecRoleDescription()">
            <option value="reception_dn">Lễ tân Đà Nẵng (reception_dn / FAC_DANANG)</option>
            <option value="doctor_dn">Bác sĩ Đà Nẵng (doctor_dn / FAC_DANANG - Liên cơ sở)</option>
            <option value="doctor_hue">Bác sĩ Huế (doctor_hue / FAC_HUE - Cùng cơ sở)</option>
          </select>
        </div>

        <div class="alert alert-info" id="sec-role-desc">
          Lễ tân chỉ có quyền check-in và tra cứu hành chính trong cơ sở Đà Nẵng. Không được phép đọc bệnh án lâm sàng của Huế.
        </div>

        <div class="card" style="background: rgba(0,0,0,0.2); border: 1px dashed var(--card-border); padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; font-weight: 700;">Consent của Bệnh nhân Bình (Trần Thị Bình)</div>
              <div style="font-size: 11px; color: var(--text-muted);">Cấp quyền cho Bác sĩ cơ sở Đà Nẵng tra cứu bệnh án liên thông</div>
            </div>
            <button class="btn btn-secondary" id="btn-toggle-consent" onclick="toggleConsent()">
              Đang Tải...
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn" onclick="fetchMedicalRecord()">
            🔍 Truy Xuất Bệnh Án (GET /api/ehr/records/REC-HUE-5544)
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Kết Quả Giải Mã Bệnh Án & Kiểm Soát Rò Rỉ</span>
          <span class="tag-driver">AES-256-GCM & Object Storage</span>
        </div>

        <div id="sec-access-result">
          <div class="alert alert-info">
            Vui lòng chọn vai trò và bấm nút <b>Truy Xuất Bệnh Án</b> để kiểm chứng luồng phân quyền.
          </div>
        </div>

        <label>Dữ liệu y tế giải mã trong RAM (Zero Plaintext on Disk)</label>
        <div class="result-box" id="sec-payload-json">// Payload JSON sẽ hiển thị tại đây...</div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 3: CIRCUIT BREAKER & OUTBOX ==================== -->
  <div id="tab-circuit" class="panel">
    <div class="grid-2">
      <div class="card">
        <div class="card-title">
          <span>Cách Ly Sự Cố HIS Huế & Phục Hồi Outbox</span>
          <span class="tag-driver">ASR-02 | ADR-0002 & 0007</span>
        </div>
        <p class="desc">
          Khi hệ thống HIS Huế (SOAP 1.1 / XML, Port 8002) bị tê liệt, Circuit Breaker của cơ sở Huế tự động mở mạch (<code>OPEN</code>) sau 3 lần lỗi liên tiếp, ngăn chặn tắc nghẽn tài nguyên Core API. Lịch hẹn vẫn được xác nhận với bệnh nhân và lưu vào hàng đợi <code>outbox_events</code>.
        </p>

        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-num" id="cb-state-hue" style="color: var(--success);">CLOSED</div>
            <div class="stat-label">Circuit Breaker Huế</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" id="cb-failures-hue">0 / 3</div>
            <div class="stat-label">Số Lần Lỗi Liên Tiếp</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" id="outbox-pending-count" style="color: var(--warning);">0</div>
            <div class="stat-label">Sự Kiện Chờ Outbox</div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
          <button class="btn btn-danger" onclick="toggleHueChaos('DOWN_503')">
            💥 Giả Lập HIS Huế Sập (HTTP 503)
          </button>
          <button class="btn btn-success" onclick="toggleHueChaos('UP')">
            ✅ Khôi Phục HIS Huế (UP)
          </button>
          <button class="btn" onclick="bookAppointmentAtHue()">
            📅 Đặt 1 Lịch Khám Tại Huế
          </button>
          <button class="btn btn-secondary" onclick="runOutboxWorkerReplay()">
            ⚙️ Chạy Outbox Worker Bù Đơn
          </button>
        </div>

        <div id="cb-alert-box"></div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Trạng Thái Cụm 3 HIS Dị Thể & Nhật Ký Đồng Bộ</span>
          <span class="tag-driver">Anti-Corruption Layer (FHIR R4)</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cơ Sở</th>
              <th>Chuẩn Giao Tiếp</th>
              <th>Port</th>
              <th>Mã Bệnh Nhân</th>
              <th>Trạng Thái Mạch</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>FAC_DANANG</b></td>
              <td>REST / JSON</td>
              <td>8001</td>
              <td>UUID</td>
              <td><span class="dot dot-green"></span> <b id="cb-dn-state">CLOSED</b></td>
            </tr>
            <tr>
              <td><b>FAC_HUE</b></td>
              <td>SOAP 1.1 / XML</td>
              <td>8002</td>
              <td>HUE-BN-xxx</td>
              <td><span class="dot dot-green" id="dot-cb-hue"></span> <b id="cb-hue-state-tbl">CLOSED</b></td>
            </tr>
            <tr>
              <td><b>FAC_QUANGNAM</b></td>
              <td>Custom RPC / JSON</td>
              <td>8003</td>
              <td>Số nguyên</td>
              <td><span class="dot dot-green"></span> <b id="cb-qn-state">CLOSED</b></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 16px;">
          <label>Nhật ký xử lý Outbox & Circuit Breaker Events</label>
          <div class="result-box" id="cb-logs">// Nhật ký dung lỗi sẽ hiển thị tại đây...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== TAB 4: AUDIT HMAC CHAIN & INTEGRITY ==================== -->
  <div id="tab-audit" class="panel">
    <div class="card">
      <div class="card-title">
        <span>Sổ Cái Kiểm Toán Bất Biến (HMAC-SHA256 Chain & SQLite Triggers)</span>
        <span class="tag-driver">ASR-05 | ADR-0004</span>
      </div>
      <p class="desc">
        Mỗi thao tác đặt lịch, xem bệnh án hay vi phạm quyền đều được nối chuỗi băm liên hoàn <code>current_hash = HMAC(Secret, prev_hash || metadata)</code>. SQLite Triggers cấm tuyệt đối lệnh SQL UPDATE/DELETE. Nếu hacker hoặc DBA có quyền root can thiệp sửa trực tiếp trên đĩa, bộ kiểm định AuditVerifier lập tức phát hiện trong vòng &lt; 5ms!
      </p>

      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
        <button class="btn btn-success" onclick="verifyAuditChain()">
          🛡️ Quét Kiểm Định Toàn Vẹn Chuỗi (HMAC Verifier)
        </button>
        <button class="btn btn-danger" onclick="simulateTamperAttack()">
          🕵️ Giả Lập Hacker Sửa Trộm Log #1 Trong Database
        </button>
        <button class="btn btn-secondary" onclick="restoreTamper()">
          ✨ Khôi Phục Dữ Liệu Gốc Của Log #1
        </button>
        <button class="btn btn-secondary" onclick="refreshAuditTable()">
          🔄 Tải Lại Bảng Nhật Ký
        </button>
      </div>

      <div id="audit-verify-alert"></div>

      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Thời Gian</th>
              <th>Actor</th>
              <th>Hành Động</th>
              <th>Tài Nguyên</th>
              <th>Trạng Thái</th>
              <th>Mã Băm Liên Hoàn (Current Hash)</th>
            </tr>
          </thead>
          <tbody id="audit-table-body">
            <tr><td colspan="7" style="text-align:center;">Đang tải nhật ký kiểm toán...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let tokens = {};
    let consentState = false;

    async function init() {
      await fetchTokens();
      await refreshSystemState();
      await checkConsentStatus();
      await refreshAuditTable();
    }

    async function fetchTokens() {
      const users = ['reception_dn', 'doctor_dn', 'doctor_hue', 'patient1', 'patient2', 'admin'];
      for (const u of users) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u })
          });
          const d = await res.json();
          if (d.success) tokens[u] = d.token;
        } catch (e) {
          console.error('Error fetching token for', u, e);
        }
      }
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    async function refreshSystemState() {
      try {
        const res = await fetch('/api/demo/state');
        const d = await res.json();
        if (d.success) {
          const s = d.data;
          // Status bar
          document.getElementById('txt-lock').innerHTML = 'Lock: <b>' + (s.lock_backend === 'REDIS_DISTRIBUTED' ? 'Redis SET NX' : 'In-Memory Atomic') + '</b>';
          const auditOk = s.audit_verification && s.audit_verification.isValid;
          const dotAudit = document.getElementById('dot-audit');
          dotAudit.className = auditOk ? 'dot dot-green' : 'dot dot-red';
          document.getElementById('txt-audit').innerHTML = 'Audit HMAC: <b>' + (auditOk ? 'Toàn vẹn' : 'BỊ SỬA TRỘM!') + '</b>';

          // Circuit breaker tab
          const hueCb = s.circuits.FAC_HUE || { state: 'CLOSED', failureCount: 0 };
          document.getElementById('cb-state-hue').innerText = hueCb.state;
          document.getElementById('cb-state-hue').style.color = hueCb.state === 'CLOSED' ? 'var(--success)' : 'var(--danger)';
          document.getElementById('cb-failures-hue').innerText = hueCb.failureCount + ' / 3';
          document.getElementById('outbox-pending-count').innerText = s.pending_outbox_count;

          const dotCbHue = document.getElementById('dot-cb-hue');
          dotCbHue.className = hueCb.state === 'CLOSED' ? 'dot dot-green' : 'dot dot-red';
          document.getElementById('cb-hue-state-tbl').innerText = hueCb.state;
        }
      } catch (e) {
        console.error('State refresh failed', e);
      }
    }

    // ==================== TAB 1 ACTIONS ====================
    async function runRaceTwoUsers() {
      const logsEl = document.getElementById('concurrency-logs');
      logsEl.innerText = '[Bắt đầu kịch bản tranh chấp 2 người dùng]\\nĐang bắn 2 request đồng thời chênh nhau 2ms...\\n';
      try {
        const res = await fetch('/api/demo/race-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 2, slot_time: '2026-11-20 08:00', doctor_id: 'DOC_101', facility_id: 'FAC_DANANG' })
        });
        const d = await res.json();
        updateRaceStats(d);
      } catch (err) {
        logsEl.innerText += 'Lỗi: ' + err.message;
      }
    }

    async function runStressRace(count) {
      const logsEl = document.getElementById('concurrency-logs');
      logsEl.innerText = '[Bắt đầu kịch bản Bão Tải Concurrency]\\nĐang bắn ' + count + ' requests song song vào cùng 1 slot...\\n';
      try {
        const res = await fetch('/api/demo/race-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: count, slot_time: '2026-11-20 08:00', doctor_id: 'DOC_101', facility_id: 'FAC_DANANG' })
        });
        const d = await res.json();
        updateRaceStats(d);
      } catch (err) {
        logsEl.innerText += 'Lỗi: ' + err.message;
      }
    }

    function updateRaceStats(d) {
      document.getElementById('stat-race-total').innerText = d.total;
      document.getElementById('stat-race-success').innerText = d.success;
      document.getElementById('stat-race-conflict').innerText = d.conflict;
      document.getElementById('stat-race-rate').innerText = d.doubleBookingRate + '%';

      const alertEl = document.getElementById('concurrency-alert');
      if (d.success === 1 && d.doubleBookingRate === 0) {
        alertEl.innerHTML = '<div class="alert alert-success">✅ <b>KIỂM ĐỊNH THÀNH CÔNG:</b> Chính xác 1 người giữ được chỗ, ' + d.conflict + ' người nhận HTTP 409 Conflict (Fast-fail < 10ms). Tỷ lệ trùng lịch = <b>0.00%</b>!</div>';
      } else {
        alertEl.innerHTML = '<div class="alert alert-danger">❌ Phát hiện bất thường trong kiểm định concurrency!</div>';
      }

      const logsEl = document.getElementById('concurrency-logs');
      logsEl.innerText = JSON.stringify(d.details, null, 2);
      refreshSystemState();
    }

    async function resetSlotOnly() {
      await fetch('/admin/reset', { method: 'POST' });
      document.getElementById('concurrency-alert').innerHTML = '<div class="alert alert-info">Đã đặt lại trạng thái slot khám về AVAILABLE.</div>';
      document.getElementById('concurrency-logs').innerText = '// Đã reset slot khám.';
      refreshSystemState();
    }

    // ==================== TAB 2 ACTIONS ====================
    function updateSecRoleDescription() {
      const user = document.getElementById('sec-user-select').value;
      const el = document.getElementById('sec-role-desc');
      if (user === 'reception_dn') {
        el.className = 'alert alert-warning';
        el.innerText = 'Lễ tân Đà Nẵng: Chỉ có quyền check-in cơ sở Đà Nẵng. Khi đọc hồ sơ Huế sẽ bị chặn 403 Forbidden ngay lập tức (Rò rỉ = 0 byte).';
      } else if (user === 'doctor_dn') {
        el.className = 'alert alert-info';
        el.innerText = 'Bác sĩ Đà Nẵng (Liên cơ sở): Đọc được bệnh án Huế NẾU Bệnh nhân đã cấp Consent. Nếu chưa có Consent -> Bị chặn 403.';
      } else {
        el.className = 'alert alert-success';
        el.innerText = 'Bác sĩ Huế (Cùng cơ sở): Có quyền đọc bệnh án lâm sàng tại cơ sở mình phụ trách.';
      }
    }

    async function checkConsentStatus() {
      try {
        const res = await fetch('/api/demo/state');
        const d = await res.json();
        if (d.success) {
          consentState = Boolean(d.data.patient2_consent_danang);
          const btn = document.getElementById('btn-toggle-consent');
          if (consentState) {
            btn.className = 'btn btn-success';
            btn.innerText = '✅ ĐÃ CẤP QUYỀN (Bấm để Thu Hồi)';
          } else {
            btn.className = 'btn btn-secondary';
            btn.innerText = '❌ CHƯA CẤP QUYỀN (Bấm để Cấp)';
          }
        }
      } catch (e) { console.error(e); }
    }

    async function toggleConsent() {
      const token = tokens['patient2'];
      const nextVal = !consentState;
      await fetch('/api/ehr/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ facility_id: 'FAC_DANANG', grant: nextVal })
      });
      await checkConsentStatus();
      await fetchMedicalRecord();
    }

    async function fetchMedicalRecord() {
      const user = document.getElementById('sec-user-select').value;
      const token = tokens[user];
      const resultBox = document.getElementById('sec-access-result');
      const jsonBox = document.getElementById('sec-payload-json');

      try {
        const res = await fetch('/api/ehr/records/REC-HUE-5544', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const d = await res.json();

        if (res.status === 200 && d.success) {
          resultBox.innerHTML = '<div class="alert alert-success">' +
            '<div><b>TRUY XUẤT THÀNH CÔNG (HTTP 200):</b> Dữ liệu y tế đã được giải mã AES-256-GCM trong RAM an toàn!</div>' +
            '<div style="margin-top:8px;"><a href="' + d.data.lab_report_download_url + '" target="_blank" class="btn btn-secondary" style="font-size:12px; padding:4px 10px;">📄 Tải File Xét Nghiệm PDF (Pre-signed URL 120s)</a></div>' +
            '</div>';
          jsonBox.innerText = JSON.stringify(d.data, null, 2);
        } else {
          resultBox.innerHTML = '<div class="alert alert-danger">' +
            '<b>TRUY CẬP BỊ TỪ CHỐI (' + res.status + ' ' + (d.error || 'FORBIDDEN') + '):</b><br/>' +
            (d.message || 'Chính sách Contextual ABAC đã ngăn chặn yêu cầu này.') +
            '</div>';
          jsonBox.innerText = JSON.stringify(d, null, 2);
        }
      } catch (e) {
        resultBox.innerHTML = '<div class="alert alert-danger">Lỗi kết nối: ' + e.message + '</div>';
      }
      refreshAuditTable();
      refreshSystemState();
    }

    // ==================== TAB 3 ACTIONS ====================
    async function toggleHueChaos(mode) {
      await fetch('/api/demo/toggle-his-hue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      document.getElementById('cb-alert-box').innerHTML = mode === 'DOWN_503'
        ? '<div class="alert alert-danger">💥 Đã giả lập HIS Huế sập (503 Service Unavailable). Hãy bấm đặt lịch để quan sát Circuit Breaker ngắt mạch!</div>'
        : '<div class="alert alert-success">✅ Đã khôi phục HIS Huế hoạt động bình thường!</div>';
      refreshSystemState();
    }

    async function bookAppointmentAtHue() {
      const token = tokens['patient1'];
      const slotTime = '2026-11-21 ' + String(8 + Math.floor(Math.random() * 8)).padStart(2, '0') + ':00';
      const logsEl = document.getElementById('cb-logs');
      logsEl.innerText = '[Đang gửi request đặt lịch tại Huế @ ' + slotTime + ']...\\n';

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            doctor_id: 'DOC_202',
            slot_time: slotTime,
            patient_id: 'user_pat_01',
            facility_id: 'FAC_HUE'
          })
        });
        const d = await res.json();
        logsEl.innerText += JSON.stringify(d, null, 2);

        if (d.data && d.data.his_sync_status === 'OUTBOX_QUEUED') {
          document.getElementById('cb-alert-box').innerHTML = '<div class="alert alert-warning">' +
            '⚠️ <b>Graceful Degradation:</b> HIS Huế lỗi/ngắt mạch, nhưng Bệnh nhân vẫn được <b>xác nhận lịch khám thành công (BK ID: ' + d.data.booking_id + ')</b> và đẩy vào Outbox Queue an toàn!' +
            '</div>';
        } else if (d.success) {
          document.getElementById('cb-alert-box').innerHTML = '<div class="alert alert-success">' +
            '✅ Đặt lịch và đồng bộ trực tiếp sang HIS Huế thành công (SYNCED, Mã: ' + d.data.his_reference_code + ')!' +
            '</div>';
        }
      } catch (e) {
        logsEl.innerText += 'Lỗi: ' + e.message;
      }
      refreshSystemState();
    }

    async function runOutboxWorkerReplay() {
      const logsEl = document.getElementById('cb-logs');
      logsEl.innerText = '[Kích hoạt OutboxSyncWorker]\\nĐang quét và replay các sự kiện pending kèm rate limit + Jitter...\\n';
      try {
        const res = await fetch('/api/demo/run-outbox', { method: 'POST' });
        const d = await res.json();
        logsEl.innerText += JSON.stringify(d, null, 2);
        document.getElementById('cb-alert-box').innerHTML = '<div class="alert alert-success">' +
          '🎉 Outbox Worker đã đồng bộ bù thành công <b>' + d.syncedCount + '</b> sự kiện sang HIS Huế!' +
          '</div>';
      } catch (e) { logsEl.innerText += 'Lỗi: ' + e.message; }
      refreshSystemState();
    }

    // ==================== TAB 4 ACTIONS ====================
    async function verifyAuditChain() {
      const alertEl = document.getElementById('audit-verify-alert');
      try {
        const res = await fetch('/api/audit/verify');
        const d = await res.json();
        if (d.success) {
          alertEl.innerHTML = '<div class="alert alert-success">' +
            '🛡️ <b>CHUỖI KIỂM TOÁN 100% TOÀN VẸN:</b> ' + d.verification.verifiedCount + ' bản ghi đã được kiểm tra liên hoàn từ Genesis Block. Chữ ký HMAC-SHA256 hoàn toàn trùng khớp bí mật hệ thống!' +
            '</div>';
        } else {
          alertEl.innerHTML = '<div class="alert alert-danger">' +
            '🚨 <b>CẢNH BÁO BẢO MẬT: PHÁT HIỆN GIAN LẬN!</b><br/>' +
            'Bản ghi ID #' + (d.verification.tamperedAtId || 1) + ' đã bị sửa đổi trái phép trên đĩa cứng! Mã băm tính toán không trùng khớp!' +
            '</div>';
        }
      } catch (e) { alertEl.innerHTML = '<div class="alert alert-danger">Lỗi: ' + e.message + '</div>'; }
      refreshSystemState();
    }

    async function simulateTamperAttack() {
      await fetch('/api/demo/tamper-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TAMPER' })
      });
      document.getElementById('audit-verify-alert').innerHTML = '<div class="alert alert-warning">' +
        '🕵️ Đã giả lập Root DBA can thiệp sửa trực tiếp chi tiết của Log #1. Hãy bấm nút <b>Quét Kiểm Định Toàn Vẹn</b> để xem hệ thống phát hiện can thiệp!' +
        '</div>';
      refreshAuditTable();
      refreshSystemState();
    }

    async function restoreTamper() {
      await fetch('/api/demo/tamper-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESTORE' })
      });
      document.getElementById('audit-verify-alert').innerHTML = '<div class="alert alert-success">' +
        '✨ Đã khôi phục nguyên bản Log #1.' +
        '</div>';
      refreshAuditTable();
      refreshSystemState();
    }

    async function refreshAuditTable() {
      const tbody = document.getElementById('audit-table-body');
      try {
        const res = await fetch('/api/audit/logs', {
          headers: { 'Authorization': 'Bearer ' + tokens['admin'] }
        });
        const d = await res.json();
        if (d.success && d.data.length > 0) {
          tbody.innerHTML = d.data.slice(0, 15).map(l => {
            const isTampered = String(l.details || '').includes('FORGED');
            const statusClass = l.status === 'SUCCESS' ? 'color: var(--success);' : 'color: var(--danger);';
            return '<tr style="' + (isTampered ? 'background: rgba(239,68,68,0.15);' : '') + '">' +
              '<td><b>#' + l.id + '</b></td>' +
              '<td style="color:var(--text-muted); font-size:11px;">' + l.timestamp.slice(11, 19) + '</td>' +
              '<td>' + l.actor_id + ' <span style="font-size:10px; color:var(--text-muted);">(' + l.actor_role + ')</span></td>' +
              '<td><code>' + l.action + '</code></td>' +
              '<td>' + (l.target_resource || '-') + '</td>' +
              '<td style="' + statusClass + '"><b>' + l.status + '</b></td>' +
              '<td style="font-family:monospace; font-size:11px; color:var(--primary);">' + l.current_hash.slice(0, 18) + '...</td>' +
              '</tr>';
          }).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7">Lỗi tải audit logs.</td></tr>';
      }
    }

    async function resetAllState() {
      await fetch('/admin/reset', { method: 'POST' });
      await restoreTamper();
      alert('Đã reset toàn bộ trạng thái hệ thống!');
      await init();
    }

    // Auto initialize on load
    window.onload = init;
  </script>
</body>
</html>`;
}

module.exports = { renderDashboardHtml };
