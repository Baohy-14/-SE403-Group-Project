/**
 * Publication-Grade Architecture Diagram Renderer for MediLink SE 403
 * Generates 6 high-DPI (2800x1640) PNG diagrams from precision SVG/HTML templates
 * using local Headless Chrome / Edge, 100% faithful to diagrams/*.puml.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'diagrams', 'rendered');
const TMP_DIR = path.join(OUT_DIR, '_html_tmp');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

function findBrowser() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome/Edge executable found for headless diagram rendering.');
}

function wrapHtml(title, subtitle, badge, svgBody, width = 1400, height = 820) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: #FFFFFF;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    width: ${width}px;
    height: ${height}px;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 12%, #FFFFFF 100%);
    border: 2px solid #E2E8F0;
  }
  .header {
    height: 68px;
    background: linear-gradient(90deg, #0F2942 0%, #163E63 65%, #0D9488 100%);
    color: #FFFFFF;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .header-left h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.2px;
    line-height: 1.2;
  }
  .header-left p {
    font-size: 12.5px;
    color: #CBD5E1;
    margin-top: 3px;
  }
  .header-badge {
    background: rgba(255,255,255,0.16);
    border: 1px solid rgba(255,255,255,0.35);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
    letter-spacing: 0.6px;
  }
  .stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
  }
  svg {
    display: block;
    width: ${width - 24}px;
    height: ${height - 84}px;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="header">
      <div class="header-left">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="header-badge">${badge}</div>
    </div>
    <div class="stage">
      ${svgBody}
    </div>
  </div>
</body>
</html>`;
}

const COMMON_DEFS = `
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="112%" height="116%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.09"/>
    </filter>
    <filter id="shadowSm" x="-4%" y="-4%" width="110%" height="114%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.07"/>
    </filter>
    <marker id="arrNavy" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1E3A5F"/>
    </marker>
    <marker id="arrTeal" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0D9488"/>
    </marker>
    <marker id="arrRed" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626"/>
    </marker>
    <marker id="arrAmber" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706"/>
    </marker>
    <marker id="arrPurple" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#6D28D9"/>
    </marker>
    <marker id="arrGray" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/>
    </marker>
    <linearGradient id="gradCore" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F2942"/>
      <stop offset="100%" stop-color="#1D4E78"/>
    </linearGradient>
    <linearGradient id="gradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F766E"/>
      <stop offset="100%" stop-color="#0D9488"/>
    </linearGradient>
  </defs>
`;

// =========================================================================
// DIAGRAM 1: C4 LEVEL 1 - SYSTEM CONTEXT VIEW
// =========================================================================
function svgC4Context() {
  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- TRUST BOUNDARY 1: Untrusted Public Zone -->
  <rect x="18" y="14" width="1340" height="176" rx="14" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2" stroke-dasharray="8 5"/>
  <rect x="34" y="4" width="470" height="24" rx="12" fill="#1D4ED8"/>
  <text x="48" y="20" fill="#FFFFFF" font-size="11.5" font-weight="700">TRUST BOUNDARY 1: Untrusted Public Zone (Internet / 4G / Wi-Fi Phòng khám)</text>

  <!-- 4 Actors -->
  ${[
    { x: 40, name: 'Bệnh nhân (Patient)', tag: 'Web / Mobile Client', desc1: 'Tìm bác sĩ, đặt/hủy lịch, nộp cọc,', desc2: 'cấp/thu hồi Consent & xem EHR' },
    { x: 372, name: 'Bác sĩ (Doctor)', tag: 'Clinic Portal', desc1: 'Quản lý lịch làm việc, xem EHR', desc2: 'liên cơ sở (có Consent) & kê đơn' },
    { x: 704, name: 'Lễ tân / Thu ngân', tag: 'Clinic Front-Desk', desc1: 'Check-in tại quầy, đặt lịch hộ,', desc2: 'tra cứu hành chính đúng facility_id' },
    { x: 1036, name: 'Ban Giám đốc', tag: 'Executive Board', desc1: 'Theo dõi Dashboard công suất,', desc2: 'tỷ lệ đồng bộ toàn chuỗi 12 cơ sở' }
  ].map(a => `
    <g filter="url(#shadowSm)">
      <rect x="${a.x}" y="42" width="300" height="130" rx="12" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.8"/>
      <rect x="${a.x}" y="42" width="300" height="36" rx="12" fill="#1E40AF"/>
      <rect x="${a.x}" y="66" width="300" height="12" fill="#1E40AF"/>
      <circle cx="${a.x + 24}" cy="60" r="10" fill="#93C5FD"/>
      <text x="${a.x + 42}" y="64" fill="#FFFFFF" font-size="13.5" font-weight="700">${a.name}</text>
      <text x="${a.x + 15}" y="97" fill="#1D4ED8" font-size="11" font-weight="700">[Person] ${a.tag}</text>
      <text x="${a.x + 15}" y="120" fill="#334155" font-size="12">${a.desc1}</text>
      <text x="${a.x + 15}" y="138" fill="#334155" font-size="12">${a.desc2}</text>
      <text x="${a.x + 15}" y="159" fill="#64748B" font-size="10.5" font-style="italic">HTTPS / TLS 1.3 + Bearer JWT HS256</text>
    </g>
  `).join('')}

  <!-- Arrows from Actors to MediLink -->
  <line x1="190" y1="172" x2="430" y2="262" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="522" y1="172" x2="585" y2="262" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="854" y1="172" x2="790" y2="262" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="1186" y1="172" x2="945" y2="262" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>

  <rect x="485" y="204" width="406" height="24" rx="12" fill="#FFFFFF" stroke="#93C5FD" stroke-width="1.2"/>
  <text x="688" y="220" text-anchor="middle" fill="#1E3A8A" font-size="11.5" font-weight="700">HTTPS / TLS 1.3 + JWT + X-Idempotency-Key (Token Bucket Rate Limiter)</text>

  <!-- TRUSTED MEDILINK PLATFORM BOUNDARY -->
  <rect x="275" y="248" width="826" height="164" rx="16" fill="#F0FDFA" stroke="#0D9488" stroke-width="2.4" stroke-dasharray="9 5"/>
  <rect x="295" y="236" width="490" height="24" rx="12" fill="#0F766E"/>
  <text x="310" y="252" fill="#FFFFFF" font-size="11.5" font-weight="700">TRUSTED PLATFORM BOUNDARY (Tuân thủ Nghị định 13/2023/NĐ-CP)</text>

  <g filter="url(#shadow)">
    <rect x="305" y="268" width="766" height="128" rx="14" fill="url(#gradCore)"/>
    <text x="688" y="298" text-anchor="middle" fill="#FFFFFF" font-size="19" font-weight="800">MediLink Central Platform</text>
    <text x="688" y="318" text-anchor="middle" fill="#5EEAD4" font-size="12" font-weight="600">[Software System] Modular Monolith Core + Background Worker + Isolated Data Tier</text>
    <text x="688" y="344" text-anchor="middle" fill="#E2E8F0" font-size="12.5">• Đặt lịch chống trùng 3 lớp (Idempotency → Redis SET NX PX + Fencing → SQLite UNIQUE)</text>
    <text x="688" y="364" text-anchor="middle" fill="#E2E8F0" font-size="12.5">• Liên thông EHR mã hóa AES-256-GCM + RBAC/ABAC + Patient Consent + Audit HMAC bất biến</text>
    <text x="688" y="384" text-anchor="middle" fill="#E2E8F0" font-size="12.5">• Anti-Corruption Layer (ACL) chuẩn hóa HL7 FHIR R4 + Circuit Breaker + Outbox Recovery</text>
  </g>

  <!-- TRUST BOUNDARY 2: External Clinic Legacy HIS Zone -->
  <rect x="18" y="476" width="874" height="196" rx="14" fill="#FFF7ED" stroke="#EA580C" stroke-width="2" stroke-dasharray="8 5"/>
  <rect x="34" y="464" width="510" height="24" rx="12" fill="#C2410C"/>
  <text x="48" y="480" fill="#FFFFFF" font-size="11.5" font-weight="700">TRUST BOUNDARY 2: External Clinic Legacy Zone (12 Phòng khám – 3 Nhóm HIS Dị thể)</text>

  ${[
    { x: 36, title: 'HIS Cụm Đà Nẵng (5 cơ sở)', proto: 'REST / JSON  •  Port 8001', idFmt: 'Mã BN: UUID v4', extra: 'Sync / Outbox Replay + Idempotency' },
    { x: 318, title: 'HIS Cụm Huế (4 cơ sở)', proto: 'Legacy SOAP 1.1 / XML  •  Port 8002', idFmt: 'Mã BN: HUE-BN-xxx', extra: 'Circuit Breaker + Outbox Jitter' },
    { x: 600, title: 'HIS Cụm Quảng Nam (3 cơ sở)', proto: 'Custom RPC / JSON  •  Port 8003', idFmt: 'Mã BN: ma_bn_noi_bo (int)', extra: 'Stored-Proc RPC Adapter' }
  ].map(h => `
    <g filter="url(#shadowSm)">
      <rect x="${h.x}" y="502" width="268" height="152" rx="11" fill="#FFFFFF" stroke="#EA580C" stroke-width="1.8"/>
      <rect x="${h.x}" y="502" width="268" height="34" rx="11" fill="#9A3412"/>
      <rect x="${h.x}" y="524" width="268" height="12" fill="#9A3412"/>
      <text x="${h.x + 14}" y="524" fill="#FFFFFF" font-size="12.5" font-weight="700">${h.title}</text>
      <rect x="${h.x + 12}" y="546" width="244" height="24" rx="6" fill="#FFEDD5"/>
      <text x="${h.x + 134}" y="562" text-anchor="middle" fill="#9A3412" font-size="11" font-weight="700">${h.proto}</text>
      <text x="${h.x + 14}" y="592" fill="#334155" font-size="11.5">• ${h.idFmt}</text>
      <text x="${h.x + 14}" y="612" fill="#334155" font-size="11.5">• Không sửa được CSDL nội bộ HIS</text>
      <text x="${h.x + 14}" y="636" fill="#0F766E" font-size="11" font-weight="700">✓ ${h.extra}</text>
    </g>
  `).join('')}

  <!-- TRUST BOUNDARY 3: External Third-Party Providers -->
  <rect x="912" y="476" width="446" height="196" rx="14" fill="#F5F3FF" stroke="#7C3AED" stroke-width="2" stroke-dasharray="8 5"/>
  <rect x="928" y="464" width="350" height="24" rx="12" fill="#6D28D9"/>
  <text x="942" y="480" fill="#FFFFFF" font-size="11.5" font-weight="700">TRUST BOUNDARY 3: External Third-Party Providers</text>

  <g filter="url(#shadowSm)">
    <rect x="930" y="502" width="198" height="152" rx="11" fill="#FFFFFF" stroke="#7C3AED" stroke-width="1.8"/>
    <rect x="930" y="502" width="198" height="34" rx="11" fill="#5B21B6"/>
    <rect x="930" y="524" width="198" height="12" fill="#5B21B6"/>
    <text x="942" y="524" fill="#FFFFFF" font-size="12" font-weight="700">Cổng Thanh toán Cọc</text>
    <text x="942" y="556" fill="#5B21B6" font-size="11" font-weight="700">[External System]</text>
    <text x="942" y="578" fill="#334155" font-size="11.5">VNPay / MoMo giả lập.</text>
    <text x="942" y="596" fill="#334155" font-size="11.5">Thu cọc &amp; hoàn cọc.</text>
    <text x="942" y="632" fill="#64748B" font-size="10.5" font-weight="600">HTTPS REST + HMAC</text>
  </g>
  <g filter="url(#shadowSm)">
    <rect x="1142" y="502" width="200" height="152" rx="11" fill="#FFFFFF" stroke="#7C3AED" stroke-width="1.8"/>
    <rect x="1142" y="502" width="200" height="34" rx="11" fill="#5B21B6"/>
    <rect x="1142" y="524" width="200" height="12" fill="#5B21B6"/>
    <text x="1154" y="524" fill="#FFFFFF" font-size="12" font-weight="700">Cổng SMS / Zalo ZNS</text>
    <text x="1154" y="556" fill="#5B21B6" font-size="11" font-weight="700">[External System]</text>
    <text x="1154" y="578" fill="#334155" font-size="11.5">Gửi mã QR xác nhận,</text>
    <text x="1154" y="596" fill="#334155" font-size="11.5">nhắc lịch trước 24h / 2h.</text>
    <text x="1154" y="632" fill="#64748B" font-size="10.5" font-weight="600">Async Worker + Retry</text>
  </g>

  <!-- Arrows MediLink -> HIS & 3rd Party -->
  <line x1="420" y1="396" x2="170" y2="500" stroke="#C2410C" stroke-width="2" marker-end="url(#arrAmber)"/>
  <line x1="560" y1="396" x2="452" y2="500" stroke="#C2410C" stroke-width="2" marker-end="url(#arrAmber)"/>
  <line x1="700" y1="396" x2="734" y2="500" stroke="#C2410C" stroke-width="2" marker-end="url(#arrAmber)"/>
  <line x1="880" y1="396" x2="1028" y2="500" stroke="#6D28D9" stroke-width="2" marker-end="url(#arrPurple)"/>
  <line x1="990" y1="396" x2="1240" y2="500" stroke="#6D28D9" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#arrPurple)"/>

  <rect x="200" y="424" width="380" height="22" rx="11" fill="#FFF7ED" stroke="#FDBA74"/>
  <text x="390" y="439" text-anchor="middle" fill="#9A3412" font-size="11" font-weight="700">ACL Chuẩn hóa HL7 FHIR R4 → REST / SOAP XML / Custom RPC</text>

  <rect x="945" y="424" width="340" height="22" rx="11" fill="#F5F3FF" stroke="#C4B5FD"/>
  <text x="1115" y="439" text-anchor="middle" fill="#5B21B6" font-size="11" font-weight="700">Webhook HMAC (Sync) &amp; Messaging Queue (Async)</text>

  <!-- Legend Footer -->
  <rect x="18" y="686" width="1340" height="38" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="710" fill="#0F2942" font-size="12" font-weight="700">CHÚ GIẢI:</text>
  <rect x="120" y="698" width="16" height="14" rx="3" fill="#1E40AF"/><text x="144" y="710" fill="#334155" font-size="11.5">Tác nhân (Person)</text>
  <rect x="285" y="698" width="16" height="14" rx="3" fill="#0F2942"/><text x="309" y="710" fill="#334155" font-size="11.5">Hệ thống lõi MediLink</text>
  <rect x="470" y="698" width="16" height="14" rx="3" fill="#9A3412"/><text x="494" y="710" fill="#334155" font-size="11.5">HIS Di sản (Không sửa DB)</text>
  <rect x="680" y="698" width="16" height="14" rx="3" fill="#5B21B6"/><text x="704" y="710" fill="#334155" font-size="11.5">Đối tác bên thứ 3</text>
  <line x1="850" y1="705" x2="888" y2="705" stroke="#1E3A5F" stroke-width="2"/><text x="896" y="710" fill="#334155" font-size="11.5">Gọi đồng bộ (Sync)</text>
  <line x1="1040" y1="705" x2="1078" y2="705" stroke="#6D28D9" stroke-width="2" stroke-dasharray="5 3"/><text x="1086" y="710" fill="#334155" font-size="11.5">Bất đồng bộ (Async)</text>
</svg>`;
}

// =========================================================================
// DIAGRAM 2: C4 LEVEL 2 - CONTAINER VIEW (ARCHITECTURE V2)
// =========================================================================
function svgC4Container() {
  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- Top Clients -->
  <g filter="url(#shadowSm)">
    <rect x="130" y="14" width="460" height="66" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.8"/>
    <text x="360" y="38" text-anchor="middle" fill="#1E3A8A" font-size="14" font-weight="700">Bệnh nhân (Web / Mobile Client)</text>
    <text x="360" y="58" text-anchor="middle" fill="#475569" font-size="11.2">Đặt lịch, cấp Consent, xem EHR &amp; tải PDF (HTTPS + JWT + Idempotency)</text>
  </g>
  <g filter="url(#shadowSm)">
    <rect x="615" y="14" width="420" height="66" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.8"/>
    <text x="825" y="38" text-anchor="middle" fill="#1E3A8A" font-size="14" font-weight="700">Bác sĩ / Lễ tân / Ban Giám đốc</text>
    <text x="825" y="58" text-anchor="middle" fill="#475569" font-size="11.2">Check-in theo facility_id, khám bệnh, Dashboard &amp; Audit HMAC</text>
  </g>

  <!-- MediLink Platform Outer Boundary -->
  <rect x="18" y="112" width="1020" height="556" rx="16" fill="#F8FAFC" stroke="#0F2942" stroke-width="2.2"/>
  <rect x="34" y="100" width="340" height="24" rx="12" fill="#0F2942"/>
  <text x="50" y="116" fill="#FFFFFF" font-size="11.5" font-weight="700">MEDILINK PLATFORM BOUNDARY (Architecture v2)</text>

  <!-- Trust Boundary A: app-net -->
  <rect x="36" y="142" width="984" height="218" rx="12" fill="#F0FDFA" stroke="#0D9488" stroke-width="1.8" stroke-dasharray="7 4"/>
  <rect x="52" y="131" width="350" height="22" rx="11" fill="#0F766E"/>
  <text x="66" y="146" fill="#FFFFFF" font-size="11" font-weight="700">TRUST BOUNDARY A: Application Execution Zone (app-net)</text>

  <!-- medilink-core -->
  <g filter="url(#shadow)">
    <rect x="58" y="168" width="468" height="174" rx="12" fill="url(#gradCore)"/>
    <text x="78" y="196" fill="#FFFFFF" font-size="16" font-weight="800">MediLink Core API (medilink-core)</text>
    <text x="78" y="216" fill="#5EEAD4" font-size="11.5" font-weight="600">[Container: Node.js 22 LTS • Modular Monolith • src/core/ • Port 3000]</text>
    <text x="78" y="242" fill="#E2E8F0" font-size="12">• REST API Gateway + Token Bucket Rate Limiter (chống spam F5)</text>
    <text x="78" y="262" fill="#E2E8F0" font-size="12">• JWT HS256 Auth + Contextual ABAC (facility_id) + Patient Consent</text>
    <text x="78" y="282" fill="#E2E8F0" font-size="12">• Booking Concurrency + EHR AES-256-GCM + Pre-signed URL (120s)</text>
    <text x="78" y="302" fill="#E2E8F0" font-size="12">• Anti-Corruption Layer (HL7 FHIR R4) + Per-Facility Circuit Breaker</text>
    <rect x="78" y="314" width="210" height="20" rx="5" fill="rgba(94,234,212,0.2)"/>
    <text x="88" y="328" fill="#99F6E4" font-size="10.5" font-weight="700">SLA: Fast-fail &lt; 50ms | p95 ≤ 500ms</text>
  </g>

  <!-- medilink-worker -->
  <g filter="url(#shadow)">
    <rect x="556" y="168" width="444" height="174" rx="12" fill="url(#gradTeal)"/>
    <text x="576" y="196" fill="#FFFFFF" font-size="16" font-weight="800">Background Worker (medilink-worker)</text>
    <text x="576" y="216" fill="#CCFBF1" font-size="11.5" font-weight="600">[Container: Node.js 22 LTS Process • src/worker/ • Tách rời CPU]</text>
    <text x="576" y="244" fill="#FFFFFF" font-size="12">1. OutboxSyncWorker: Đồng bộ bù lịch hẹn (Batch=5 + Random Jitter)</text>
    <text x="576" y="266" fill="#FFFFFF" font-size="12">2. NotificationQueueWorker: Gửi SMS/Zalo ZNS (Exponential Backoff)</text>
    <text x="576" y="288" fill="#FFFFFF" font-size="12">3. AuditIntegrityWorker: Quét liên hoàn chuỗi băm HMAC-SHA256</text>
    <rect x="576" y="310" width="290" height="22" rx="5" fill="rgba(15,41,66,0.32)"/>
    <text x="588" y="325" fill="#F0FDFA" font-size="10.5" font-weight="700">ADR-007: Rate-Controlled Recovery chống Thundering Herd</text>
  </g>

  <!-- Trust Boundary B: data-net -->
  <rect x="36" y="408" width="984" height="242" rx="12" fill="#FEF2F2" stroke="#DC2626" stroke-width="2" stroke-dasharray="7 4"/>
  <rect x="52" y="396" width="560" height="24" rx="11" fill="#B91C1C"/>
  <text x="66" y="412" fill="#FFFFFF" font-size="11" font-weight="700">TRUST BOUNDARY B: Isolated Persistence &amp; Key Zone (data-net • internal: true • Không lộ Internet)</text>

  <!-- 3 Data Stores -->
  <g filter="url(#shadowSm)">
    <rect x="58" y="438" width="296" height="192" rx="12" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.8"/>
    <rect x="58" y="438" width="296" height="36" rx="12" fill="#991B1B"/>
    <rect x="58" y="462" width="296" height="12" fill="#991B1B"/>
    <text x="74" y="461" fill="#FFFFFF" font-size="13.5" font-weight="700">Redis 7 (Distributed Lock)</text>
    <text x="74" y="492" fill="#B91C1C" font-size="11" font-weight="700">[redis:7-alpine • AOF • TCP 6379]</text>
    <text x="74" y="516" fill="#334155" font-size="12">• Khóa phân tán nguyên tử:</text>
    <text x="74" y="534" fill="#0F172A" font-size="11.5" font-family="Consolas, monospace">  SET lock:slot NX PX 3000</text>
    <text x="74" y="556" fill="#334155" font-size="12">• Monotonic Fencing Token (INCR)</text>
    <text x="74" y="576" fill="#334155" font-size="12">• Lua Atomic Unlock (nhả sớm)</text>
    <text x="74" y="610" fill="#64748B" font-size="11" font-style="italic">ADR-003: Chặn tranh chấp &lt; 10ms</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="378" y="438" width="328" height="192" rx="12" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="1.8"/>
    <rect x="378" y="438" width="328" height="36" rx="12" fill="#1E3A8A"/>
    <rect x="378" y="462" width="328" height="12" fill="#1E3A8A"/>
    <text x="394" y="461" fill="#FFFFFF" font-size="13.5" font-weight="700">SQLite 3 WAL (RDBMS &amp; Audit)</text>
    <text x="394" y="492" fill="#1E40AF" font-size="11" font-weight="700">[database.js • Shared Volume /data]</text>
    <text x="394" y="515" fill="#334155" font-size="11.8">• Users, MPI Mappings, Consents</text>
    <text x="394" y="535" fill="#334155" font-size="11.8">• Bookings [UNIQUE(active_slot_key)]</text>
    <text x="394" y="555" fill="#334155" font-size="11.8">• EHR mã hóa AES-256-GCM (enc:v1:...)</text>
    <text x="394" y="575" fill="#334155" font-size="11.8">• Audit Logs [Trigger cấm sửa/xóa + HMAC]</text>
    <text x="394" y="595" fill="#334155" font-size="11.8">• Outbox Events &amp; Notification Queue</text>
    <text x="394" y="618" fill="#0F766E" font-size="10.8" font-weight="700">✓ Chốt chặn ACID &amp; nguồn sự thật duy nhất</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="730" y="438" width="270" height="192" rx="12" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
    <rect x="730" y="438" width="270" height="36" rx="12" fill="#0F766E"/>
    <rect x="730" y="462" width="270" height="12" fill="#0F766E"/>
    <text x="746" y="461" fill="#FFFFFF" font-size="13.5" font-weight="700">Encrypted Lab Storage</text>
    <text x="746" y="492" fill="#0F766E" font-size="11" font-weight="700">[Object/S3 Bucket • /data/lab-files]</text>
    <text x="746" y="518" fill="#334155" font-size="11.8">• Lưu PDF xét nghiệm &amp; ảnh y tế</text>
    <text x="746" y="538" fill="#334155" font-size="11.8">• Mã hóa nhị phân AES-256-GCM</text>
    <text x="746" y="558" fill="#334155" font-size="11.8">• Cấp Pre-signed URL (TTL 120s)</text>
    <text x="746" y="578" fill="#334155" font-size="11.8">• Không lộ đường dẫn tĩnh công khai</text>
    <text x="746" y="614" fill="#64748B" font-size="11" font-style="italic">ADR-006: Bảo vệ file PDF nhạy cảm</text>
  </g>

  <!-- Trust Boundary C: External HIS & Notif (Right side) -->
  <rect x="1062" y="112" width="296" height="432" rx="14" fill="#FFF7ED" stroke="#EA580C" stroke-width="2" stroke-dasharray="7 4"/>
  <rect x="1076" y="100" width="268" height="24" rx="12" fill="#C2410C"/>
  <text x="1088" y="116" fill="#FFFFFF" font-size="10.8" font-weight="700">TRUST BOUNDARY C: HIS Zone (his-net)</text>

  ${[
    { y: 146, name: 'Mock HIS Đà Nẵng', port: 'REST / JSON • Port 8001', sub: '5 cơ sở • Timeout 1.5s' },
    { y: 274, name: 'Mock HIS Huế', port: 'SOAP 1.1 / XML • Port 8002', sub: '4 cơ sở • Chaos + Outbox Replay' },
    { y: 402, name: 'Mock HIS Quảng Nam', port: 'Custom RPC / JSON • Port 8003', sub: '3 cơ sở • Timeout 1.5s' }
  ].map(h => `
    <g filter="url(#shadowSm)">
      <rect x="1080" y="${h.y}" width="260" height="106" rx="10" fill="#FFFFFF" stroke="#EA580C" stroke-width="1.6"/>
      <rect x="1080" y="${h.y}" width="260" height="30" rx="10" fill="#9A3412"/>
      <rect x="1080" y="${h.y + 18}" width="260" height="12" fill="#9A3412"/>
      <text x="1094" y="${h.y + 20}" fill="#FFFFFF" font-size="12.5" font-weight="700">${h.name}</text>
      <text x="1094" y="${h.y + 52}" fill="#C2410C" font-size="11.5" font-weight="700">${h.port}</text>
      <text x="1094" y="${h.y + 74}" fill="#475569" font-size="11.5">${h.sub}</text>
      <text x="1094" y="${h.y + 94}" fill="#64748B" font-size="10.5">[Container: node:22-alpine]</text>
    </g>
  `).join('')}

  <!-- External SMS/Zalo -->
  <g filter="url(#shadowSm)">
    <rect x="1062" y="564" width="296" height="104" rx="12" fill="#F5F3FF" stroke="#7C3AED" stroke-width="1.8"/>
    <rect x="1062" y="564" width="296" height="32" rx="12" fill="#5B21B6"/>
    <rect x="1062" y="584" width="296" height="12" fill="#5B21B6"/>
    <text x="1078" y="585" fill="#FFFFFF" font-size="12.5" font-weight="700">Cổng SMS / Zalo ZNS / Email</text>
    <text x="1078" y="618" fill="#334155" font-size="11.5">• Nhận job bất đồng bộ từ Worker</text>
    <text x="1078" y="638" fill="#334155" font-size="11.5">• Exponential Backoff khi mạng lỗi</text>
    <text x="1078" y="656" fill="#6D28D9" font-size="10.5" font-weight="700">ADR-005: Không chặn luồng đặt lịch</text>
  </g>

  <!-- Connections -->
  <line x1="320" y1="80" x2="260" y2="166" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="740" y1="80" x2="380" y2="166" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>

  <!-- Core -> Data Stores -->
  <line x1="206" y1="342" x2="206" y2="436" stroke="#DC2626" stroke-width="2" marker-end="url(#arrRed)"/>
  <text x="115" y="384" fill="#B91C1C" font-size="10.5" font-weight="700">RESP TCP 6379</text>

  <line x1="420" y1="342" x2="490" y2="436" stroke="#1E3A8A" stroke-width="2" marker-end="url(#arrNavy)"/>
  <text x="380" y="384" fill="#1E3A8A" font-size="10.5" font-weight="700">ACID WAL + Outbox</text>

  <line x1="490" y1="342" x2="800" y2="436" stroke="#0F766E" stroke-width="1.8" marker-end="url(#arrTeal)"/>
  <text x="645" y="378" fill="#0F766E" font-size="10.5" font-weight="700">Encrypted File I/O</text>

  <!-- Worker -> SQLite -->
  <line x1="650" y1="342" x2="585" y2="436" stroke="#0D9488" stroke-width="2" stroke-dasharray="6 3" marker-end="url(#arrTeal)"/>
  <text x="625" y="392" fill="#0F766E" font-size="10.5" font-weight="700">Async Poll</text>

  <!-- Core/Worker -> HIS -->
  <path d="M 505 168 L 505 154 L 1050 154 L 1050 200 L 1078 200" stroke="#C2410C" stroke-width="2" fill="none" marker-end="url(#arrAmber)"/>
  <path d="M 1000 280 L 1078 320" stroke="#0D9488" stroke-width="2.2" stroke-dasharray="6 3" fill="none" marker-end="url(#arrTeal)"/>
  <text x="1008" y="294" fill="#0F766E" font-size="9.5" font-weight="700">Outbox</text>

  <!-- Worker -> SMS -->
  <path d="M 960 342 L 960 616 L 1060 616" stroke="#6D28D9" stroke-width="2" stroke-dasharray="6 3" fill="none" marker-end="url(#arrPurple)"/>

  <!-- Legend -->
  <rect x="18" y="684" width="1340" height="40" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="709" fill="#0F2942" font-size="12" font-weight="700">CHÚ GIẢI:</text>
  <rect x="120" y="697" width="16" height="14" rx="3" fill="#0F2942"/><text x="144" y="709" fill="#334155" font-size="11.5">Core API (Sync)</text>
  <rect x="265" y="697" width="16" height="14" rx="3" fill="#0D9488"/><text x="289" y="709" fill="#334155" font-size="11.5">Background Worker (Async)</text>
  <rect x="475" y="697" width="16" height="14" rx="3" fill="#991B1B"/><text x="499" y="709" fill="#334155" font-size="11.5">Isolated Data Tier (data-net internal:true)</text>
  <line x1="785" y1="704" x2="825" y2="704" stroke="#1E3A8A" stroke-width="2"/><text x="833" y="709" fill="#334155" font-size="11.5">Đồng bộ (Sync)</text>
  <line x1="960" y1="704" x2="1000" y2="704" stroke="#0D9488" stroke-width="2" stroke-dasharray="5 3"/><text x="1008" y="709" fill="#334155" font-size="11.5">Bất đồng bộ (Async Poll / Retry)</text>
</svg>`;
}

// =========================================================================
// DIAGRAM 3: C4 LEVEL 3 - COMPONENT VIEW (MEDILINK-CORE + HEXAGONAL ACL)
// =========================================================================
function svgC4Component() {
  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- Outer Core Container -->
  <rect x="18" y="16" width="1026" height="652" rx="16" fill="#F8FAFC" stroke="#0F2942" stroke-width="2.2"/>
  <rect x="34" y="4" width="440" height="24" rx="12" fill="#0F2942"/>
  <text x="50" y="20" fill="#FFFFFF" font-size="11.5" font-weight="700">CONTAINER: medilink-core (src/core/) – Modular Monolith + Hexagonal ACL</text>

  <!-- Row 1: Gateway & Auth -->
  <g filter="url(#shadowSm)">
    <rect x="40" y="44" width="465" height="114" rx="11" fill="#FFFFFF" stroke="#1D4ED8" stroke-width="1.8"/>
    <rect x="40" y="44" width="465" height="32" rx="11" fill="#1E40AF"/>
    <rect x="40" y="64" width="465" height="12" fill="#1E40AF"/>
    <text x="56" y="65" fill="#FFFFFF" font-size="13" font-weight="700">1. HTTP Router &amp; Token Bucket Rate Limiter</text>
    <text x="56" y="94" fill="#1D4ED8" font-size="11" font-family="Consolas, monospace" font-weight="700">gateway/httpApp.js, rateLimiter.js</text>
    <text x="56" y="116" fill="#334155" font-size="11.5">• Tiếp nhận HTTP request, gắn X-Request-Id truy vết toàn luồng</text>
    <text x="56" y="136" fill="#334155" font-size="11.5">• Giới hạn tốc độ Token Bucket chống spam F5 giữ khóa (Risk R-01)</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="546" y="44" width="474" height="114" rx="11" fill="#FFFFFF" stroke="#B91C1C" stroke-width="1.8"/>
    <rect x="546" y="44" width="474" height="32" rx="11" fill="#991B1B"/>
    <rect x="546" y="64" width="474" height="12" fill="#991B1B"/>
    <text x="562" y="65" fill="#FFFFFF" font-size="13" font-weight="700">2. JWT Auth &amp; Contextual ABAC Guard</text>
    <text x="562" y="94" fill="#B91C1C" font-size="11" font-family="Consolas, monospace" font-weight="700">auth/jwtService.js, authMiddleware.js, abacMiddleware.js</text>
    <text x="562" y="116" fill="#334155" font-size="11.5">• Xác thực chữ ký JWT HS256, kiểm tra RBAC &amp; user.facility_id == record.facility_id</text>
    <text x="562" y="136" fill="#334155" font-size="11.5">• Kiểm tra Patient Consent (NĐ 13/2023) → Ghi Audit 401/403 tức thì</text>
  </g>

  <!-- Row 2: Domain Services -->
  <g filter="url(#shadowSm)">
    <rect x="40" y="192" width="310" height="136" rx="11" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
    <rect x="40" y="192" width="310" height="32" rx="11" fill="#0F766E"/>
    <rect x="40" y="212" width="310" height="12" fill="#0F766E"/>
    <text x="54" y="213" fill="#FFFFFF" font-size="12.5" font-weight="700">3. Booking Domain Service</text>
    <text x="54" y="242" fill="#0F766E" font-size="10.8" font-family="Consolas, monospace" font-weight="700">booking/bookingService.js, slotCache.js</text>
    <text x="54" y="264" fill="#334155" font-size="11.3">• Điều phối đặt/hủy lịch khám</text>
    <text x="54" y="283" fill="#334155" font-size="11.3">• Read-Through Slot Cache (p95 140ms)</text>
    <text x="54" y="302" fill="#334155" font-size="11.3">• Ghi Outbox khi HIS lỗi + Enqueue SMS</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="372" y="192" width="310" height="136" rx="11" fill="#FFFFFF" stroke="#D97706" stroke-width="1.8"/>
    <rect x="372" y="192" width="310" height="32" rx="11" fill="#B45309"/>
    <rect x="372" y="212" width="310" height="12" fill="#B45309"/>
    <text x="386" y="213" fill="#FFFFFF" font-size="12.5" font-weight="700">4. Concurrency &amp; Idempotency</text>
    <text x="386" y="242" fill="#B45309" font-size="10.8" font-family="Consolas, monospace" font-weight="700">booking/lockManager.js, idempotencyManager.js</text>
    <text x="386" y="264" fill="#334155" font-size="11.3">• Kiểm tra X-Idempotency-Key</text>
    <text x="386" y="283" fill="#334155" font-size="11.3">• Redis SET NX PX 3000 + Fencing Token</text>
    <text x="386" y="302" fill="#334155" font-size="11.3">• Lua Atomic Unlock (nhả khóa sớm)</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="704" y="192" width="316" height="136" rx="11" fill="#FFFFFF" stroke="#6D28D9" stroke-width="1.8"/>
    <rect x="704" y="192" width="316" height="32" rx="11" fill="#5B21B6"/>
    <rect x="704" y="212" width="316" height="12" fill="#5B21B6"/>
    <text x="718" y="213" fill="#FFFFFF" font-size="12.5" font-weight="700">5. EHR &amp; Crypto + Audit HMAC</text>
    <text x="718" y="242" fill="#5B21B6" font-size="10.5" font-family="Consolas, monospace" font-weight="700">ehr/*.js, audit/auditService.js, auditVerifier.js</text>
    <text x="718" y="264" fill="#334155" font-size="11.3">• Mã hóa AES-256-GCM + Mask [REDACTED]</text>
    <text x="718" y="283" fill="#334155" font-size="11.3">• Ký Pre-signed URL PDF (TTL 120s)</text>
    <text x="718" y="302" fill="#334155" font-size="11.3">• Chuỗi băm HMAC-SHA256 từ Genesis</text>
  </g>

  <!-- Row 3: ANTI-CORRUPTION LAYER (Hexagonal Ports & Adapters) -->
  <rect x="40" y="366" width="980" height="282" rx="14" fill="#FFF7ED" stroke="#EA580C" stroke-width="2" stroke-dasharray="8 4"/>
  <rect x="58" y="354" width="490" height="24" rx="12" fill="#C2410C"/>
  <text x="74" y="370" fill="#FFFFFF" font-size="11.5" font-weight="700">ANTI-CORRUPTION LAYER (src/core/acl/) – Hexagonal Ports &amp; Adapters (ASR-04)</text>

  <g filter="url(#shadowSm)">
    <rect x="62" y="394" width="294" height="110" rx="10" fill="#FFFFFF" stroke="#EA580C" stroke-width="1.6"/>
    <text x="76" y="418" fill="#9A3412" font-size="13" font-weight="700">HisIntegrationDispatcher</text>
    <text x="76" y="436" fill="#C2410C" font-size="10.5" font-family="Consolas, monospace">acl/hisDispatcher.js</text>
    <text x="76" y="458" fill="#334155" font-size="11.3">• Registry quản lý Adapter động theo</text>
    <text x="76" y="476" fill="#334155" font-size="11.3">  facility_id (Open-Closed Principle)</text>
    <text x="76" y="494" fill="#0F766E" font-size="10.8" font-weight="700">✓ Cắm HIS #4 sửa 0 dòng Core</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="382" y="394" width="294" height="110" rx="10" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.6"/>
    <text x="396" y="418" fill="#0F766E" font-size="13" font-weight="700">CanonicalModelMapper</text>
    <text x="396" y="436" fill="#0D9488" font-size="10.5" font-family="Consolas, monospace">acl/canonicalModel.js</text>
    <text x="396" y="458" fill="#334155" font-size="11.3">• Chuẩn hóa dữ liệu nội bộ &amp; MPI</text>
    <text x="396" y="476" fill="#334155" font-size="11.3">  sang chuẩn quốc tế HL7 FHIR R4</text>
    <text x="396" y="494" fill="#0F766E" font-size="10.8" font-weight="700">✓ Bundle { Patient, Appointment }</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="702" y="394" width="296" height="110" rx="10" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.6"/>
    <text x="716" y="418" fill="#B91C1C" font-size="13" font-weight="700">Per-Facility CircuitBreaker</text>
    <text x="716" y="436" fill="#DC2626" font-size="10.5" font-family="Consolas, monospace">acl/circuitBreaker.js</text>
    <text x="716" y="458" fill="#334155" font-size="11.3">• Máy trạng thái độc lập từng cơ sở:</text>
    <text x="716" y="476" fill="#334155" font-size="11.3">  CLOSED → OPEN (≥3 lỗi) → HALF_OPEN</text>
    <text x="716" y="494" fill="#B91C1C" font-size="10.8" font-weight="700">✓ Timeout Budget 1500ms / Fast-fail</text>
  </g>

  <!-- 4 Pluggable Adapters -->
  ${[
    { x: 62, name: 'DaNangJsonAdapter', sub: 'REST / JSON • UUID' },
    { x: 300, name: 'HueXmlAdapter', sub: 'SOAP 1.1 / XML • HUE-BN' },
    { x: 538, name: 'QuangNamCustomAdapter', sub: 'Custom RPC • int ID' },
    { x: 776, name: 'FhirGenericAdapter (HIS #4)', sub: 'HL7 FHIR R4 • Hội An' }
  ].map((ad, idx) => `
    <g filter="url(#shadowSm)">
      <rect x="${ad.x}" y="538" width="222" height="90" rx="9" fill="${idx === 3 ? '#ECFDF5' : '#FFFFFF'}" stroke="${idx === 3 ? '#059669' : '#9A3412'}" stroke-width="1.8"/>
      <text x="${ad.x + 111}" y="564" text-anchor="middle" fill="${idx === 3 ? '#065F46' : '#9A3412'}" font-size="12" font-weight="700">${ad.name}</text>
      <text x="${ad.x + 111}" y="584" text-anchor="middle" fill="#475569" font-size="11">${ad.sub}</text>
      <rect x="${ad.x + 22}" y="596" width="178" height="20" rx="5" fill="${idx === 3 ? '#D1FAE5' : '#FFEDD5'}"/>
      <text x="${ad.x + 111}" y="610" text-anchor="middle" fill="${idx === 3 ? '#065F46' : '#9A3412'}" font-size="10" font-weight="700">implements BaseHisAdapter</text>
    </g>
  `).join('')}

  <!-- External Data & HIS Column (Right) -->
  ${[
    { y: 44, title: 'Redis 7 Store', sub: 'TCP 6379 • Lock + Fencing', color: '#991B1B', bg: '#FEF2F2' },
    { y: 192, title: 'SQLite 3 WAL DB', sub: 'UNIQUE + EHR + Audit Trigger', color: '#1E3A8A', bg: '#EFF6FF' },
    { y: 340, title: 'Lab Object Bucket', sub: '/data/lab-files/*.enc (AES-GCM)', color: '#0F766E', bg: '#F0FDFA' },
    { y: 492, title: '3+ Hệ thống HIS Cơ sở', sub: 'REST / SOAP XML / RPC / FHIR R4', color: '#9A3412', bg: '#FFF7ED' }
  ].map(ex => `
    <g filter="url(#shadowSm)">
      <rect x="1076" y="${ex.y}" width="282" height="122" rx="12" fill="${ex.bg}" stroke="${ex.color}" stroke-width="2"/>
      <rect x="1076" y="${ex.y}" width="282" height="34" rx="12" fill="${ex.color}"/>
      <rect x="1076" y="${ex.y + 22}" width="282" height="12" fill="${ex.color}"/>
      <text x="1217" y="${ex.y + 22}" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="700">${ex.title}</text>
      <text x="1217" y="${ex.y + 68}" text-anchor="middle" fill="#1E293B" font-size="12" font-weight="600">${ex.sub}</text>
      <text x="1217" y="${ex.y + 96}" text-anchor="middle" fill="#64748B" font-size="11">External / Persistence Dependency</text>
    </g>
  `).join('')}

  <!-- Internal & External Arrows -->
  <line x1="505" y1="100" x2="544" y2="100" stroke="#1E40AF" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="195" y1="158" x2="195" y2="190" stroke="#0F766E" stroke-width="2" marker-end="url(#arrTeal)"/>
  <line x1="860" y1="158" x2="860" y2="190" stroke="#6D28D9" stroke-width="2" marker-end="url(#arrPurple)"/>
  <line x1="350" y1="260" x2="370" y2="260" stroke="#D97706" stroke-width="2" marker-end="url(#arrAmber)"/>
  <line x1="195" y1="328" x2="195" y2="392" stroke="#C2410C" stroke-width="2" marker-end="url(#arrAmber)"/>
  <line x1="356" y1="448" x2="380" y2="448" stroke="#0F766E" stroke-width="2" marker-end="url(#arrTeal)"/>
  <line x1="676" y1="448" x2="700" y2="448" stroke="#DC2626" stroke-width="2" marker-end="url(#arrRed)"/>
  <line x1="850" y1="504" x2="850" y2="536" stroke="#9A3412" stroke-width="2" marker-end="url(#arrAmber)"/>

  <!-- Right-side arrows -->
  <line x1="1020" y1="250" x2="1074" y2="250" stroke="#1E3A8A" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="1020" y1="305" x2="1074" y2="395" stroke="#0F766E" stroke-width="2" marker-end="url(#arrTeal)"/>
  <line x1="998" y1="582" x2="1074" y2="560" stroke="#C2410C" stroke-width="2.2" marker-end="url(#arrAmber)"/>

  <!-- Legend -->
  <rect x="18" y="684" width="1340" height="40" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="709" fill="#0F2942" font-size="12" font-weight="700">ĐIỂM NHẤN KIẾN TRÚC:</text>
  <text x="200" y="709" fill="#334155" font-size="11.5">• Modular Monolith phân ranh giới rõ ràng theo Domain</text>
  <text x="545" y="709" fill="#334155" font-size="11.5">• Hexagonal ACL (BaseHisAdapter) tách biệt hoàn toàn Core với 3+ HIS dị thể</text>
  <text x="1030" y="709" fill="#065F46" font-size="11.5" font-weight="700">✓ Sửa Core = 0 dòng khi thêm HIS #4</text>
</svg>`;
}

// =========================================================================
// DIAGRAM 4: C4 LEVEL 4 - CODE VIEW (UML CLASS & INTERFACE DIAGRAM)
// =========================================================================
function svgC4Code() {
  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <defs>
    <marker id="inhTri" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M 1 1 L 12 7 L 1 13 Z" fill="#FFFFFF" stroke="#0F2942" stroke-width="1.8"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- Package Boundary: src/core/acl/ -->
  <rect x="18" y="14" width="1028" height="656" rx="14" fill="#F8FAFC" stroke="#0F2942" stroke-width="2" stroke-dasharray="8 4"/>
  <rect x="34" y="3" width="465" height="24" rx="12" fill="#0F2942"/>
  <text x="48" y="19" fill="#FFFFFF" font-size="11.5" font-weight="700">PACKAGE: src/core/acl/ (Hexagonal Ports &amp; Adapters + Fault Isolation)</text>

  <!-- Package Boundary: src/core/booking/ (Right) -->
  <rect x="1064" y="14" width="294" height="656" rx="14" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="2" stroke-dasharray="8 4"/>
  <rect x="1078" y="3" width="264" height="24" rx="12" fill="#1D4ED8"/>
  <text x="1090" y="19" fill="#FFFFFF" font-size="11" font-weight="700">PACKAGE: src/core/booking/</text>

  <!-- Class 1: HisIntegrationDispatcher -->
  <g filter="url(#shadowSm)">
    <rect x="38" y="42" width="320" height="196" rx="10" fill="#FFFFFF" stroke="#0F2942" stroke-width="1.8"/>
    <rect x="38" y="42" width="320" height="44" rx="10" fill="#0F2942"/>
    <rect x="38" y="72" width="320" height="14" fill="#0F2942"/>
    <text x="198" y="59" text-anchor="middle" fill="#5EEAD4" font-size="10" font-weight="700">«orchestrator»</text>
    <text x="198" y="77" text-anchor="middle" fill="#FFFFFF" font-size="13.5" font-weight="700">HisIntegrationDispatcher</text>
    <line x1="38" y1="138" x2="358" y2="138" stroke="#CBD5E1" stroke-width="1.2"/>
    <text x="50" y="106" fill="#334155" font-size="11" font-family="Consolas, monospace">- adapters: Map&lt;string, BaseHisAdapter&gt;</text>
    <text x="50" y="126" fill="#334155" font-size="11" font-family="Consolas, monospace">- circuitBreakers: Map&lt;string, CB&gt;</text>
    <text x="50" y="158" fill="#0F2942" font-size="11" font-family="Consolas, monospace" font-weight="700">+ registerAdapter(facId, adapter, opts)</text>
    <text x="50" y="178" fill="#0F2942" font-size="11" font-family="Consolas, monospace" font-weight="700">+ syncAppointment(facId, payload)</text>
    <text x="50" y="198" fill="#334155" font-size="11" font-family="Consolas, monospace">+ getCircuitStatus(facilityId)</text>
    <text x="50" y="218" fill="#334155" font-size="11" font-family="Consolas, monospace">+ getAllCircuitStatuses()</text>
  </g>

  <!-- Class 2: CanonicalModelMapper -->
  <g filter="url(#shadowSm)">
    <rect x="386" y="42" width="302" height="196" rx="10" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
    <rect x="386" y="42" width="302" height="44" rx="10" fill="#0F766E"/>
    <rect x="386" y="72" width="302" height="14" fill="#0F766E"/>
    <text x="537" y="59" text-anchor="middle" fill="#CCFBF1" font-size="10" font-weight="700">«mapper • HL7 FHIR R4»</text>
    <text x="537" y="77" text-anchor="middle" fill="#FFFFFF" font-size="13.5" font-weight="700">CanonicalModelMapper</text>
    <line x1="386" y1="138" x2="688" y2="138" stroke="#CBD5E1" stroke-width="1.2"/>
    <text x="398" y="106" fill="#334155" font-size="11" font-family="Consolas, monospace">+ FHIR_VERSION: "R4 (4.0.1)"</text>
    <text x="398" y="126" fill="#334155" font-size="11" font-family="Consolas, monospace">- mpiTable: MasterPatientIndex</text>
    <text x="398" y="158" fill="#0F766E" font-size="11" font-family="Consolas, monospace" font-weight="700">+ toCanonicalBundle(bookingPayload)</text>
    <text x="398" y="178" fill="#334155" font-size="11" font-family="Consolas, monospace">+ toFhirPatient(patient, mpiMap)</text>
    <text x="398" y="198" fill="#334155" font-size="11" font-family="Consolas, monospace">+ toFhirAppointment(booking)</text>
    <text x="398" y="218" fill="#64748B" font-size="10.5" font-style="italic">Returns { patient, appointment }</text>
  </g>

  <!-- Class 3: CircuitBreaker -->
  <g filter="url(#shadowSm)">
    <rect x="716" y="42" width="310" height="196" rx="10" fill="#FFFFFF" stroke="#B91C1C" stroke-width="1.8"/>
    <rect x="716" y="42" width="310" height="44" rx="10" fill="#991B1B"/>
    <rect x="716" y="72" width="310" height="14" fill="#991B1B"/>
    <text x="871" y="59" text-anchor="middle" fill="#FECACA" font-size="10" font-weight="700">«state machine • per-facility»</text>
    <text x="871" y="77" text-anchor="middle" fill="#FFFFFF" font-size="13.5" font-weight="700">CircuitBreaker</text>
    <line x1="716" y1="146" x2="1026" y2="146" stroke="#CBD5E1" stroke-width="1.2"/>
    <text x="728" y="104" fill="#334155" font-size="10.8" font-family="Consolas, monospace">- state: CLOSED | OPEN | HALF_OPEN</text>
    <text x="728" y="121" fill="#334155" font-size="10.8" font-family="Consolas, monospace">- failureThreshold: number (3)</text>
    <text x="728" y="138" fill="#334155" font-size="10.8" font-family="Consolas, monospace">- timeoutBudgetMs: number (1500)</text>
    <text x="728" y="166" fill="#991B1B" font-size="11" font-family="Consolas, monospace" font-weight="700">+ execute(actionFn): Promise</text>
    <text x="728" y="186" fill="#334155" font-size="11" font-family="Consolas, monospace">+ canAttempt(): boolean</text>
    <text x="728" y="206" fill="#334155" font-size="11" font-family="Consolas, monospace">+ getStatus(): CircuitMetrics</text>
  </g>

  <!-- Abstract Port Interface: BaseHisAdapter -->
  <g filter="url(#shadow)">
    <rect x="278" y="294" width="510" height="142" rx="12" fill="#FFF7ED" stroke="#C2410C" stroke-width="2.2"/>
    <rect x="278" y="294" width="510" height="44" rx="12" fill="#C2410C"/>
    <rect x="278" y="324" width="510" height="14" fill="#C2410C"/>
    <text x="533" y="311" text-anchor="middle" fill="#FFEDD5" font-size="10.5" font-weight="700">«abstract class / Hexagonal Port Interface»</text>
    <text x="533" y="330" text-anchor="middle" fill="#FFFFFF" font-size="14.5" font-weight="800" font-style="italic">BaseHisAdapter (baseAdapter.js)</text>
    <line x1="278" y1="382" x2="788" y2="382" stroke="#FDBA74" stroke-width="1.4"/>
    <text x="294" y="360" fill="#334155" font-size="11.2" font-family="Consolas, monospace"># facilityId: string     # baseUrl: string</text>
    <text x="294" y="375" fill="#64748B" font-size="10.5" font-style="italic">  (Abstract constructor prevents direct instantiation)</text>
    <text x="294" y="404" fill="#9A3412" font-size="11.5" font-family="Consolas, monospace" font-weight="700" font-style="italic">+ syncAppointment(canonicalBundle, timeoutMs = 1500)*</text>
    <text x="294" y="424" fill="#334155" font-size="11.2" font-family="Consolas, monospace">+ checkHealth(timeoutMs = 1000): Promise&lt;boolean&gt;</text>
  </g>

  <!-- 4 Concrete Adapter Subclasses -->
  ${[
    { x: 38, name: 'DaNangJsonAdapter', file: 'daNangJsonAdapter.js', proto: 'POST REST / JSON', idMap: 'MPI -> patient_uuid', res: 'DN-HIS-xxxx', accent: '#1E40AF', bg: '#FFFFFF' },
    { x: 288, name: 'HueXmlAdapter', file: 'hueXmlAdapter.js', proto: 'POST SOAP 1.1 / XML', idMap: 'MPI -> HUE-BN-xxx', res: 'HUE-XML-xxxx', accent: '#B45309', bg: '#FFFFFF' },
    { x: 538, name: 'QuangNamCustomAdapter', file: 'quangNamCustomAdapter.js', proto: 'POST Custom RPC', idMap: 'MPI -> ma_bn_noi_bo', res: 'QN-RPC-xxxx', accent: '#6D28D9', bg: '#FFFFFF' },
    { x: 788, name: 'FhirGenericAdapter', file: 'fhirGenericAdapter.js', proto: 'POST HL7 FHIR R4', idMap: 'Native FHIR Bundle', res: 'HOIAN-FHIR-xxxx', accent: '#059669', bg: '#ECFDF5' }
  ].map((ad) => `
    <g filter="url(#shadowSm)">
      <rect x="${ad.x}" y="502" width="238" height="150" rx="10" fill="${ad.bg}" stroke="${ad.accent}" stroke-width="1.8"/>
      <rect x="${ad.x}" y="502" width="238" height="36" rx="10" fill="${ad.accent}"/>
      <rect x="${ad.x}" y="526" width="238" height="12" fill="${ad.accent}"/>
      <text x="${ad.x + 119}" y="525" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="700">${ad.name}</text>
      <text x="${ad.x + 12}" y="556" fill="#64748B" font-size="10" font-family="Consolas, monospace">${ad.file}</text>
      <line x1="${ad.x}" y1="566" x2="${ad.x + 238}" y2="566" stroke="#E2E8F0" stroke-width="1"/>
      <text x="${ad.x + 12}" y="586" fill="${ad.accent}" font-size="10.8" font-family="Consolas, monospace" font-weight="700">+ syncAppointment()</text>
      <text x="${ad.x + 12}" y="606" fill="#334155" font-size="10.8">• ${ad.proto}</text>
      <text x="${ad.x + 12}" y="624" fill="#334155" font-size="10.8">• ${ad.idMap}</text>
      <text x="${ad.x + 12}" y="642" fill="#0F766E" font-size="10.5" font-weight="700">→ Ref: ${ad.res}</text>
    </g>
  `).join('')}

  <!-- Right Package Classes: BookingService & LockManager -->
  <g filter="url(#shadowSm)">
    <rect x="1082" y="42" width="258" height="256" rx="10" fill="#FFFFFF" stroke="#1D4ED8" stroke-width="1.8"/>
    <rect x="1082" y="42" width="258" height="44" rx="10" fill="#1E40AF"/>
    <rect x="1082" y="72" width="258" height="14" fill="#1E40AF"/>
    <text x="1211" y="59" text-anchor="middle" fill="#BFDBFE" font-size="10" font-weight="700">«domain service»</text>
    <text x="1211" y="77" text-anchor="middle" fill="#FFFFFF" font-size="13.5" font-weight="700">BookingService</text>
    <line x1="1082" y1="152" x2="1340" y2="152" stroke="#CBD5E1" stroke-width="1.2"/>
    <text x="1094" y="106" fill="#334155" font-size="10.8" font-family="Consolas, monospace">- lockManager: LockManager</text>
    <text x="1094" y="124" fill="#334155" font-size="10.8" font-family="Consolas, monospace">- idempotency: IdemMgr</text>
    <text x="1094" y="142" fill="#334155" font-size="10.8" font-family="Consolas, monospace">- slotCache: SlotCache</text>
    <text x="1094" y="174" fill="#1E40AF" font-size="10.8" font-family="Consolas, monospace" font-weight="700">+ createBooking(req, key)</text>
    <text x="1094" y="194" fill="#334155" font-size="10.8" font-family="Consolas, monospace">+ cancelBooking(id, user)</text>
    <text x="1094" y="214" fill="#334155" font-size="10.8" font-family="Consolas, monospace">+ listAvailableSlots(q)</text>
    <rect x="1094" y="232" width="234" height="52" rx="6" fill="#EFF6FF" stroke="#93C5FD"/>
    <text x="1104" y="250" fill="#1E3A8A" font-size="10.2" font-weight="700">Gọi HisIntegrationDispatcher</text>
    <text x="1104" y="268" fill="#334155" font-size="10.2">SAU KHI đã nhả Redis Lock!</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="1082" y="346" width="258" height="306" rx="10" fill="#FFFFFF" stroke="#991B1B" stroke-width="1.8"/>
    <rect x="1082" y="346" width="258" height="44" rx="10" fill="#991B1B"/>
    <rect x="1082" y="376" width="258" height="14" fill="#991B1B"/>
    <text x="1211" y="363" text-anchor="middle" fill="#FECACA" font-size="10" font-weight="700">«concurrency engine»</text>
    <text x="1211" y="381" text-anchor="middle" fill="#FFFFFF" font-size="13.5" font-weight="700">LockManager</text>
    <line x1="1082" y1="472" x2="1340" y2="472" stroke="#CBD5E1" stroke-width="1.2"/>
    <text x="1094" y="410" fill="#334155" font-size="10.5" font-family="Consolas, monospace">- defaultTtlMs: 3000</text>
    <text x="1094" y="428" fill="#334155" font-size="10.5" font-family="Consolas, monospace">- fencingCounter: number</text>
    <text x="1094" y="446" fill="#334155" font-size="10.5" font-family="Consolas, monospace">- redisClient: RedisResp</text>
    <text x="1094" y="464" fill="#334155" font-size="10.5" font-family="Consolas, monospace">- backendMode: REDIS_TCP</text>
    <text x="1094" y="494" fill="#991B1B" font-size="10.8" font-family="Consolas, monospace" font-weight="700">+ acquireLock(k, own, ttl)</text>
    <text x="1094" y="514" fill="#991B1B" font-size="10.8" font-family="Consolas, monospace" font-weight="700">+ releaseLock(k, lockVal)</text>
    <text x="1094" y="534" fill="#334155" font-size="10.5" font-family="Consolas, monospace">+ getLockStats()</text>
    <rect x="1094" y="554" width="234" height="82" rx="6" fill="#FEF2F2" stroke="#FCA5A5"/>
    <text x="1104" y="572" fill="#991B1B" font-size="10.2" font-weight="700">Lua Atomic Unlock Script:</text>
    <text x="1104" y="590" fill="#334155" font-size="9.6" font-family="Consolas, monospace">if get(K1) == ARGV[1]</text>
    <text x="1104" y="606" fill="#334155" font-size="9.6" font-family="Consolas, monospace">  then del(K1) else 0</text>
    <text x="1104" y="624" fill="#64748B" font-size="9.8" font-style="italic">Chống xóa nhầm khóa tiến trình khác</text>
  </g>

  <!-- Relationships -->
  <line x1="358" y1="140" x2="384" y2="140" stroke="#0F766E" stroke-width="2" marker-end="url(#arrTeal)"/>
  <line x1="688" y1="140" x2="714" y2="140" stroke="#B91C1C" stroke-width="2" marker-end="url(#arrRed)"/>
  <line x1="198" y1="238" x2="360" y2="292" stroke="#0F2942" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="871" y1="238" x2="700" y2="292" stroke="#B91C1C" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arrRed)"/>

  <!-- Inheritance Tree from 4 Adapters up to BaseHisAdapter -->
  <line x1="157" y1="502" x2="157" y2="470" stroke="#0F2942" stroke-width="2"/>
  <line x1="407" y1="502" x2="407" y2="470" stroke="#0F2942" stroke-width="2"/>
  <line x1="657" y1="502" x2="657" y2="470" stroke="#0F2942" stroke-width="2"/>
  <line x1="907" y1="502" x2="907" y2="470" stroke="#0F2942" stroke-width="2"/>
  <line x1="157" y1="470" x2="907" y2="470" stroke="#0F2942" stroke-width="2"/>
  <line x1="533" y1="470" x2="533" y2="438" stroke="#0F2942" stroke-width="2" marker-end="url(#inhTri)"/>

  <!-- BookingService -> LockManager -->
  <line x1="1211" y1="298" x2="1211" y2="344" stroke="#991B1B" stroke-width="2" marker-end="url(#arrRed)"/>

  <!-- Legend -->
  <rect x="18" y="684" width="1340" height="40" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="709" fill="#0F2942" font-size="12" font-weight="700">CHÚ GIẢI UML (C4 LEVEL 4):</text>
  <text x="230" y="709" fill="#334155" font-size="11.5">──▷ Kế thừa Port Interface (extends BaseHisAdapter)</text>
  <text x="580" y="709" fill="#334155" font-size="11.5">──▶ Phụ thuộc / Điều phối trực tiếp</text>
  <text x="855" y="709" fill="#065F46" font-size="11.5" font-weight="700">✓ Ánh xạ 1:1 tên lớp &amp; phương thức thật trong src/core/</text>
</svg>`;
}

// =========================================================================
// DIAGRAM 5: DEPLOYMENT VIEW (DOCKER COMPOSE & 3 ISOLATED NETWORKS)
// =========================================================================
function svgDeploymentView() {
  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- Untrusted Client Zone (Left) -->
  <rect x="18" y="20" width="232" height="648" rx="14" fill="#EFF6FF" stroke="#2563EB" stroke-width="2" stroke-dasharray="7 4"/>
  <rect x="30" y="8" width="208" height="24" rx="12" fill="#1D4ED8"/>
  <text x="134" y="24" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="700">UNTRUSTED CLIENT ZONE</text>

  <g filter="url(#shadowSm)">
    <rect x="34" y="180" width="200" height="190" rx="12" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.8"/>
    <rect x="34" y="180" width="200" height="36" rx="12" fill="#1E40AF"/>
    <rect x="34" y="204" width="200" height="12" fill="#1E40AF"/>
    <text x="134" y="203" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="700">MediLink Clients</text>
    <text x="48" y="240" fill="#1D4ED8" font-size="11" font-weight="700">• Web Browser / Portal</text>
    <text x="48" y="264" fill="#334155" font-size="11.5">• Mobile App Bệnh nhân</text>
    <text x="48" y="288" fill="#334155" font-size="11.5">• Interactive Dashboard</text>
    <text x="48" y="312" fill="#334155" font-size="11.5">• Automated Test Runner</text>
    <rect x="48" y="334" width="172" height="22" rx="6" fill="#DBEAFE"/>
    <text x="134" y="349" text-anchor="middle" fill="#1E3A8A" font-size="10.5" font-weight="700">HTTPS/HTTP Port 3000</text>
  </g>

  <!-- Docker Host Server -->
  <rect x="282" y="20" width="1076" height="648" rx="16" fill="#F8FAFC" stroke="#0F2942" stroke-width="2.4"/>
  <rect x="302" y="8" width="540" height="24" rx="12" fill="#0F2942"/>
  <text x="318" y="24" fill="#FFFFFF" font-size="11.5" font-weight="700">DOCKER HOST SERVER (Linux Production / Windows Docker Engine) – docker-compose.yml</text>

  <!-- Network 1: app-net -->
  <rect x="306" y="48" width="332" height="598" rx="12" fill="#F0FDFA" stroke="#0D9488" stroke-width="2" stroke-dasharray="6 4"/>
  <rect x="322" y="36" width="246" height="22" rx="11" fill="#0F766E"/>
  <text x="336" y="51" fill="#FFFFFF" font-size="11" font-weight="700">NETWORK 1: app-net (Bridge)</text>

  <g filter="url(#shadow)">
    <rect x="326" y="82" width="292" height="236" rx="12" fill="#FFFFFF" stroke="#0F2942" stroke-width="2"/>
    <rect x="326" y="82" width="292" height="38" rx="12" fill="#0F2942"/>
    <rect x="326" y="108" width="292" height="12" fill="#0F2942"/>
    <text x="342" y="106" fill="#FFFFFF" font-size="13.5" font-weight="700">Container: medilink-core</text>
    <text x="342" y="140" fill="#0F766E" font-size="11" font-family="Consolas, monospace" font-weight="700">image: node:22-alpine</text>
    <text x="342" y="160" fill="#334155" font-size="11.5">• Entry: src/core/server.js</text>
    <text x="342" y="182" fill="#334155" font-size="11.5">• Exposed: 3000:3000 (duy nhất)</text>
    <text x="342" y="204" fill="#334155" font-size="11.5">• Networks: app-net, data-net, his-net</text>
    <text x="342" y="226" fill="#334155" font-size="11.5">• Mount: medilink_storage:/data</text>
    <rect x="342" y="248" width="260" height="52" rx="8" fill="#F0FDFA" stroke="#99F6E4"/>
    <text x="354" y="268" fill="#0F766E" font-size="11" font-weight="700">Healthcheck: GET /health (10s)</text>
    <text x="354" y="288" fill="#334155" font-size="11">RAM Footprint: &lt; 120 MB</text>
  </g>

  <g filter="url(#shadow)">
    <rect x="326" y="366" width="292" height="252" rx="12" fill="#FFFFFF" stroke="#0D9488" stroke-width="2"/>
    <rect x="326" y="366" width="292" height="38" rx="12" fill="#0F766E"/>
    <rect x="326" y="392" width="292" height="12" fill="#0F766E"/>
    <text x="342" y="390" fill="#FFFFFF" font-size="13.5" font-weight="700">Container: medilink-worker</text>
    <text x="342" y="424" fill="#0F766E" font-size="11" font-family="Consolas, monospace" font-weight="700">image: node:22-alpine</text>
    <text x="342" y="446" fill="#334155" font-size="11.5">• Entry: src/worker/backgroundWorker.js</text>
    <text x="342" y="468" fill="#334155" font-size="11.5">• Ports: KHÔNG lộ cổng ra Host</text>
    <text x="342" y="490" fill="#334155" font-size="11.5">• Outbox Rate-Controlled Sync (+Jitter)</text>
    <text x="342" y="512" fill="#334155" font-size="11.5">• Notification Retry (Exp. Backoff)</text>
    <text x="342" y="534" fill="#334155" font-size="11.5">• Audit HMAC Integrity Sweeper</text>
    <rect x="342" y="556" width="260" height="44" rx="8" fill="#ECFDF5" stroke="#6EE7B7"/>
    <text x="354" y="575" fill="#065F46" font-size="11" font-weight="700">Mount: medilink_storage:/data</text>
    <text x="354" y="592" fill="#334155" font-size="10.8">Networks: app-net, data-net, his-net</text>
  </g>

  <!-- Network 2: data-net (internal: true) -->
  <rect x="664" y="48" width="332" height="598" rx="12" fill="#FEF2F2" stroke="#DC2626" stroke-width="2.2" stroke-dasharray="6 4"/>
  <rect x="676" y="36" width="308" height="22" rx="11" fill="#B91C1C"/>
  <text x="688" y="51" fill="#FFFFFF" font-size="10.8" font-weight="700">NETWORK 2: data-net (internal: true 🔒)</text>

  <g filter="url(#shadowSm)">
    <rect x="684" y="82" width="292" height="214" rx="12" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.8"/>
    <rect x="684" y="82" width="292" height="36" rx="12" fill="#991B1B"/>
    <rect x="684" y="106" width="292" height="12" fill="#991B1B"/>
    <text x="700" y="105" fill="#FFFFFF" font-size="13" font-weight="700">Container: medilink-redis</text>
    <text x="700" y="138" fill="#B91C1C" font-size="11" font-family="Consolas, monospace" font-weight="700">image: redis:7-alpine</text>
    <text x="700" y="160" fill="#334155" font-size="11.5">• Port 6379 (Internal Only)</text>
    <text x="700" y="182" fill="#334155" font-size="11.5">• appendonly yes (AOF everysec)</text>
    <text x="700" y="204" fill="#334155" font-size="11.5">• Distributed Slot Locks (PX 3000)</text>
    <text x="700" y="226" fill="#334155" font-size="11.5">• Monotonic Fencing Counter</text>
    <rect x="700" y="246" width="260" height="34" rx="6" fill="#FEE2E2"/>
    <text x="830" y="267" text-anchor="middle" fill="#991B1B" font-size="10.8" font-weight="700">Không thể truy cập từ Internet!</text>
  </g>

  <g filter="url(#shadowSm)">
    <rect x="684" y="330" width="292" height="288" rx="12" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="1.8"/>
    <rect x="684" y="330" width="292" height="36" rx="12" fill="#1E3A8A"/>
    <rect x="684" y="354" width="292" height="12" fill="#1E3A8A"/>
    <text x="700" y="353" fill="#FFFFFF" font-size="13" font-weight="700">Shared Volume: /data</text>
    <text x="700" y="386" fill="#1E40AF" font-size="11" font-weight="700">medilink_storage (Encrypted Volume)</text>

    <rect x="700" y="404" width="260" height="92" rx="8" fill="#EFF6FF" stroke="#93C5FD"/>
    <text x="714" y="424" fill="#1E3A8A" font-size="12" font-weight="700">medilink.db (SQLite 3 WAL)</text>
    <text x="714" y="444" fill="#334155" font-size="11">• Bookings UNIQUE + Outbox</text>
    <text x="714" y="462" fill="#334155" font-size="11">• Encrypted EHR (AES-256-GCM)</text>
    <text x="714" y="480" fill="#334155" font-size="11">• Append-Only Audit (Trigger+HMAC)</text>

    <rect x="700" y="510" width="260" height="88" rx="8" fill="#F0FDFA" stroke="#5EEAD4"/>
    <text x="714" y="530" fill="#0F766E" font-size="12" font-weight="700">/data/lab-files/*.enc</text>
    <text x="714" y="550" fill="#334155" font-size="11">• Object Storage Bucket cách ly</text>
    <text x="714" y="568" fill="#334155" font-size="11">• PDF xét nghiệm mã hóa nhị phân</text>
    <text x="714" y="586" fill="#334155" font-size="11">• Truy cập qua Pre-signed URL 120s</text>
  </g>

  <!-- Network 3: his-net -->
  <rect x="1020" y="48" width="316" height="598" rx="12" fill="#FFF7ED" stroke="#EA580C" stroke-width="2" stroke-dasharray="6 4"/>
  <rect x="1036" y="36" width="276" height="22" rx="11" fill="#C2410C"/>
  <text x="1048" y="51" fill="#FFFFFF" font-size="11" font-weight="700">NETWORK 3: his-net (Legacy Subnet)</text>

  ${[
    { y: 86, name: 'mock-his-danang', file: 'hisDaNangServer.js', port: 'Port 8001 • REST / JSON', note: '5 phòng khám cụm Đà Nẵng' },
    { y: 274, name: 'mock-his-hue', file: 'hisHueServer.js', port: 'Port 8002 • SOAP 1.1 / XML', note: '4 phòng khám + Chaos Mode Toggle' },
    { y: 462, name: 'mock-his-quangnam', file: 'hisQuangNamServer.js', port: 'Port 8003 • Custom RPC / JSON', note: '3 phòng khám cụm Quảng Nam' }
  ].map(h => `
    <g filter="url(#shadowSm)">
      <rect x="1038" y="${h.y}" width="280" height="154" rx="11" fill="#FFFFFF" stroke="#EA580C" stroke-width="1.8"/>
      <rect x="1038" y="${h.y}" width="280" height="34" rx="11" fill="#9A3412"/>
      <rect x="1038" y="${h.y + 22}" width="280" height="12" fill="#9A3412"/>
      <text x="1054" y="${h.y + 22}" fill="#FFFFFF" font-size="12.5" font-weight="700">Container: ${h.name}</text>
      <text x="1054" y="${h.y + 56}" fill="#C2410C" font-size="11" font-family="Consolas, monospace" font-weight="700">node:22-alpine • ${h.file}</text>
      <rect x="1054" y="${h.y + 68}" width="248" height="26" rx="6" fill="#FFEDD5"/>
      <text x="1178" y="${h.y + 85}" text-anchor="middle" fill="#9A3412" font-size="11" font-weight="700">${h.port}</text>
      <text x="1054" y="${h.y + 118}" fill="#334155" font-size="11.5">• ${h.note}</text>
      <text x="1054" y="${h.y + 138}" fill="#64748B" font-size="10.8">• Auto-fallback port nếu bị chiếm</text>
    </g>
  `).join('')}

  <!-- Arrows -->
  <line x1="234" y1="240" x2="324" y2="200" stroke="#1E40AF" stroke-width="2.4" marker-end="url(#arrNavy)"/>
  <line x1="618" y1="185" x2="682" y2="185" stroke="#DC2626" stroke-width="2" marker-end="url(#arrRed)"/>
  <line x1="618" y1="270" x2="682" y2="430" stroke="#1E3A8A" stroke-width="2" marker-end="url(#arrNavy)"/>
  <line x1="618" y1="490" x2="682" y2="490" stroke="#0D9488" stroke-width="2" stroke-dasharray="6 3" marker-end="url(#arrTeal)"/>

  <!-- Core/Worker to HIS across top/bottom -->
  <path d="M 618 125 L 1036 125" stroke="#C2410C" stroke-width="1.8" fill="none" marker-end="url(#arrAmber)"/>
  <path d="M 618 595 L 1008 595 L 1008 360 L 1036 360" stroke="#0D9488" stroke-width="2" stroke-dasharray="6 3" fill="none" marker-end="url(#arrTeal)"/>

  <!-- Legend -->
  <rect x="18" y="684" width="1340" height="40" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="709" fill="#0F2942" font-size="12" font-weight="700">HẠ TẦNG TRIỂN KHAI:</text>
  <text x="195" y="709" fill="#334155" font-size="11.5">• Tổng 6 Containers siêu nhẹ (&lt; 250 MB RAM) chạy bằng 1 lệnh docker compose up</text>
  <text x="720" y="709" fill="#B91C1C" font-size="11.5" font-weight="700">🔒 data-net internal: true cô lập tuyệt đối Redis, SQLite &amp; Lab Files khỏi Internet</text>
</svg>`;
}

// =========================================================================
// DIAGRAM 5: SEQUENCE 1 - BOOKING CONCURRENCY (ASR-01) & OUTBOX (ASR-02)
// =========================================================================
function svgSeqBooking() {
  const cols = [
    { x: 92, label: 'Bệnh nhân A\n(Đến trước)', color: '#1E40AF' },
    { x: 256, label: 'Bệnh nhân B\n(Cùng lúc +2ms)', color: '#B91C1C' },
    { x: 432, label: 'Core API &\nBookingService', color: '#0F2942' },
    { x: 632, label: 'Redis 7\n(SET NX + Fencing)', color: '#991B1B' },
    { x: 836, label: 'SQLite 3 WAL\n(UNIQUE + Outbox)', color: '#1E3A8A' },
    { x: 1044, label: 'ACL & Circuit\nBreaker (FHIR)', color: '#C2410C' },
    { x: 1252, label: 'Mock HIS &\nAsync Worker', color: '#0F766E' }
  ];

  const arrow = (x1, x2, y, text, color = '#1E3A5F', dashed = false, badge = '') => {
    const dir = x2 > x1 ? 1 : -1;
    const mid = (x1 + x2) / 2;
    const marker = color === '#DC2626' ? 'url(#arrRed)' : color === '#0F766E' ? 'url(#arrTeal)' : color === '#C2410C' ? 'url(#arrAmber)' : 'url(#arrNavy)';
    return `
      <line x1="${x1}" y1="${y}" x2="${x2 - dir * 5}" y2="${y}" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="6 3"' : ''} marker-end="${marker}"/>
      <rect x="${mid - Math.min(text.length * 3.4 + 14, 210)}" y="${y - 20}" width="${Math.min(text.length * 6.8 + 28, 420)}" height="17" rx="4" fill="#FFFFFF" fill-opacity="0.92"/>
      <text x="${mid}" y="${y - 8}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700">${badge ? badge + ' ' : ''}${text}</text>
    `;
  };

  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- Lifelines -->
  ${cols.map(c => `
    <line x1="${c.x}" y1="68" x2="${c.x}" y2="668" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="5 5"/>
    <g filter="url(#shadowSm)">
      <rect x="${c.x - 74}" y="12" width="148" height="54" rx="10" fill="${c.color}"/>
      <text x="${c.x}" y="34" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="700">${c.label.split('\n')[0]}</text>
      <text x="${c.x}" y="52" text-anchor="middle" fill="#E2E8F0" font-size="10.5">${c.label.split('\n')[1]}</text>
    </g>
  `).join('')}

  <!-- Phase 1 Band -->
  <rect x="20" y="82" width="1336" height="162" rx="10" fill="#EFF6FF" fill-opacity="0.55" stroke="#93C5FD" stroke-width="1.4"/>
  <rect x="30" y="74" width="465" height="22" rx="11" fill="#1D4ED8"/>
  <text x="44" y="89" fill="#FFFFFF" font-size="11" font-weight="700">PHA 1 (ASR-01): Tranh chấp đồng thời 50 reqs → Chặn ngay tại tầng Redis Lock</text>

  ${arrow(92, 432, 118, 'POST /api/bookings (DOC_101 @ 08:00, Key=K1)', '#1E40AF', false, '①')}
  ${arrow(256, 432, 146, 'POST /api/bookings (Cùng slot +2ms, Key=K2)', '#DC2626', false, '②')}
  ${arrow(432, 632, 174, 'INCR fencing & SET lock:slot "reqA:41" NX PX 3000 → OK', '#0F766E', false, '③')}
  ${arrow(432, 632, 204, 'SET lock:slot "reqB:42" NX PX 3000 → NULL (Bị chặn)', '#DC2626', false, '④')}
  ${arrow(432, 256, 232, 'HTTP 409 Conflict (Fast-fail < 10ms + gợi ý 08:30)', '#DC2626', true, '⑤')}

  <!-- Phase 2 Band -->
  <rect x="20" y="258" width="1336" height="126" rx="10" fill="#F0FDFA" fill-opacity="0.65" stroke="#5EEAD4" stroke-width="1.4"/>
  <rect x="30" y="250" width="540" height="22" rx="11" fill="#0F766E"/>
  <text x="44" y="265" fill="#FFFFFF" font-size="11" font-weight="700">PHA 2 (ADR-003): Ghi nguyên tử SQLite UNIQUE &amp; Nhả khóa sớm (Không chờ mạng HIS)</text>

  ${arrow(432, 836, 296, 'BEGIN IMMEDIATE; INSERT bookings (UNIQUE active_slot_key, fencing=41); COMMIT', '#1E3A8A', false, '⑥')}
  ${arrow(836, 432, 326, 'Commit thành công (bookingId = BK-9001, Double-booking = 0%)', '#0F766E', true, '⑦')}
  ${arrow(432, 632, 358, 'EVAL Lua Atomic Unlock (chỉ xóa nếu value == "reqA:41") → Released sớm!', '#0F766E', false, '⑧')}

  <!-- Phase 3 Band -->
  <rect x="20" y="398" width="1336" height="146" rx="10" fill="#FFF7ED" fill-opacity="0.7" stroke="#FDBA74" stroke-width="1.4"/>
  <rect x="30" y="390" width="590" height="22" rx="11" fill="#C2410C"/>
  <text x="44" y="405" fill="#FFFFFF" font-size="11" font-weight="700">PHA 3 (ASR-02): Liên thông ACL (HL7 FHIR R4) + Circuit Breaker cách ly sự cố HIS Huế</text>

  ${arrow(432, 1044, 436, 'syncAppointment(MPI + FHIR R4 {Patient, Appointment})', '#C2410C', false, '⑨')}
  ${arrow(1044, 1252, 466, 'POST SOAP/REST (Timeout 1500ms) → 503 / OPEN Circuit (Fast-fail 1.43ms)', '#DC2626', false, '⑩')}
  ${arrow(432, 836, 498, 'INSERT outbox_events(PENDING) + notification_jobs + audit_logs(HMAC)', '#1E3A8A', false, '⑪')}
  ${arrow(432, 92, 528, 'HTTP 201 Created (Trả mã lịch hẹn ngay — p95 = 77.42ms)', '#0F766E', true, '⑫')}

  <!-- Phase 4 Band -->
  <rect x="20" y="558" width="1336" height="106" rx="10" fill="#ECFDF5" fill-opacity="0.75" stroke="#6EE7B7" stroke-width="1.4"/>
  <rect x="30" y="550" width="570" height="22" rx="11" fill="#065F46"/>
  <text x="44" y="565" fill="#FFFFFF" font-size="11" font-weight="700">PHA 4 (ADR-007 Architecture v2): Worker nền tự động đồng bộ bù có Rate-Limit + Jitter</text>

  ${arrow(1252, 836, 598, 'Poll pending outbox_events (Batch = 5) + Sleep Jitter 20..60ms chống Thundering Herd', '#0F766E', true, '⑬')}
  ${arrow(1252, 1044, 636, 'Replay sang HIS Huế (kèm IdempotencyToken) → 200 OK → UPDATE SYNCED (4/4)', '#0F766E', false, '⑭')}

  <!-- Legend -->
  <rect x="18" y="684" width="1340" height="40" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="709" fill="#0F2942" font-size="12" font-weight="700">CHỐT CHẶN 3 LỚP:</text>
  <text x="176" y="709" fill="#1E40AF" font-size="11.5" font-weight="700">1. X-Idempotency-Key</text>
  <text x="342" y="709" fill="#991B1B" font-size="11.5" font-weight="700">→ 2. Redis SET NX PX 3000 + Fencing</text>
  <text x="615" y="709" fill="#0F766E" font-size="11.5" font-weight="700">→ 3. SQLite UNIQUE(active_slot_key)</text>
  <text x="905" y="709" fill="#C2410C" font-size="11.5" font-weight="700">| Kết quả đo: 1 OK / 49 Conflict • p95 = 77.42ms</text>
</svg>`;
}

// =========================================================================
// DIAGRAM 6: SEQUENCE 2 - SECURITY ABAC, CONSENT, AES-256-GCM & AUDIT HMAC
// =========================================================================
function svgSeqSecurity() {
  const cols = [
    { x: 96, label: 'Lễ tân Đà Nẵng\n(FAC_DANANG)', color: '#B91C1C' },
    { x: 282, label: 'Bác sĩ Đà Nẵng\n(FAC_DANANG)', color: '#0F766E' },
    { x: 486, label: 'Auth & ABAC\nMiddleware', color: '#0F2942' },
    { x: 706, label: 'EhrService &\nAES-256-GCM', color: '#5B21B6' },
    { x: 926, label: 'LabStorage\n(Pre-signed URL)', color: '#0369A1' },
    { x: 1124, label: 'AuditService\n(HMAC Chain)', color: '#B45309' },
    { x: 1286, label: 'SQLite WAL\n(Trigger DB)', color: '#1E3A8A' }
  ];

  const arrow = (x1, x2, y, text, color = '#1E3A5F', dashed = false, badge = '') => {
    const dir = x2 > x1 ? 1 : -1;
    const mid = (x1 + x2) / 2;
    const marker = color === '#DC2626' ? 'url(#arrRed)' : color === '#0F766E' ? 'url(#arrTeal)' : color === '#B45309' ? 'url(#arrAmber)' : color === '#5B21B6' ? 'url(#arrPurple)' : 'url(#arrNavy)';
    return `
      <line x1="${x1}" y1="${y}" x2="${x2 - dir * 5}" y2="${y}" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="6 3"' : ''} marker-end="${marker}"/>
      <rect x="${mid - Math.min(text.length * 3.4 + 14, 230)}" y="${y - 20}" width="${Math.min(text.length * 6.8 + 28, 460)}" height="17" rx="4" fill="#FFFFFF" fill-opacity="0.93"/>
      <text x="${mid}" y="${y - 8}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700">${badge ? badge + ' ' : ''}${text}</text>
    `;
  };

  return `<svg viewBox="0 0 1376 736" xmlns="http://www.w3.org/2000/svg">
  ${COMMON_DEFS}
  <rect x="0" y="0" width="1376" height="736" fill="#FFFFFF"/>

  <!-- Lifelines -->
  ${cols.map(c => `
    <line x1="${c.x}" y1="68" x2="${c.x}" y2="668" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="5 5"/>
    <g filter="url(#shadowSm)">
      <rect x="${c.x - 74}" y="12" width="148" height="54" rx="10" fill="${c.color}"/>
      <text x="${c.x}" y="34" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="700">${c.label.split('\n')[0]}</text>
      <text x="${c.x}" y="52" text-anchor="middle" fill="#E2E8F0" font-size="10.5">${c.label.split('\n')[1]}</text>
    </g>
  `).join('')}

  <!-- Scenario A: Cross-facility ABAC Deny -->
  <rect x="20" y="84" width="1336" height="248" rx="12" fill="#FEF2F2" fill-opacity="0.65" stroke="#FCA5A5" stroke-width="1.6"/>
  <rect x="32" y="74" width="585" height="22" rx="11" fill="#B91C1C"/>
  <text x="46" y="89" fill="#FFFFFF" font-size="11" font-weight="700">KỊCH BẢN A (ASR-03): Lễ tân Đà Nẵng cố xem hồ sơ Bệnh nhân Huế (REC-HUE-5544)</text>

  ${arrow(96, 486, 124, 'GET /api/ehr/records/REC-HUE-5544 [JWT: RECEPTIONIST, FAC_DANANG]', '#DC2626', false, '①')}
  ${arrow(486, 1286, 156, 'Verify JWT HS256 → SELECT facility_id FROM medical_records → FAC_HUE', '#1E3A8A', false, '②')}

  <rect x="330" y="172" width="360" height="38" rx="8" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"/>
  <text x="510" y="188" text-anchor="middle" fill="#991B1B" font-size="11" font-weight="700">⛔ VI PHẠM CONTEXTUAL ABAC:</text>
  <text x="510" y="203" text-anchor="middle" fill="#7F1D1D" font-size="10.8">user.facility_id ('FAC_DANANG') ≠ record.facility_id ('FAC_HUE')</text>

  ${arrow(486, 1124, 236, 'logSecurityEvent(ACCESS_DENIED_CROSS_FACILITY_EHR, status=DENIED_403)', '#B45309', false, '③')}
  ${arrow(1124, 1286, 268, 'HMAC → INSERT audit_logs', '#B45309', false, '④')}
  ${arrow(486, 96, 306, 'HTTP 403 Forbidden (Rò rỉ = 0 byte • Thời gian phản hồi: 8.49ms)', '#DC2626', true, '⑤')}

  <!-- Scenario B: Authorized Cross-Facility Doctor with Consent -->
  <rect x="20" y="352" width="1336" height="314" rx="12" fill="#ECFDF5" fill-opacity="0.65" stroke="#6EE7B7" stroke-width="1.6"/>
  <rect x="32" y="342" width="665" height="22" rx="11" fill="#0F766E"/>
  <text x="46" y="357" fill="#FFFFFF" font-size="11" font-weight="700">KỊCH BẢN B (Nghị định 13/2023): Bác sĩ liên cơ sở đọc EHR khi đã có Consent của Bệnh nhân</text>

  ${arrow(282, 486, 394, 'GET /api/ehr/records/REC-HUE-5544 [JWT: DOCTOR, FAC_DANANG]', '#0F766E', false, '⑥')}
  ${arrow(486, 1286, 428, 'SELECT is_active FROM patient_consents (pat_02 → FAC_DANANG) → is_active = 1 ✓', '#1E3A8A', false, '⑦')}
  ${arrow(486, 706, 464, 'getAuthorizedRecord(rawRecord, scope="FULL_CLINICAL")', '#5B21B6', false, '⑧')}

  <rect x="556" y="478" width="300" height="36" rx="8" fill="#F5F3FF" stroke="#7C3AED" stroke-width="1.5"/>
  <text x="706" y="494" text-anchor="middle" fill="#5B21B6" font-size="11" font-weight="700">🔐 Giải mã AES-256-GCM trong RAM</text>
  <text x="706" y="508" text-anchor="middle" fill="#4C1D95" font-size="10.5">(diagnosis_enc, notes_enc, prescription_enc)</text>

  ${arrow(706, 926, 540, 'generatePresignedUrl("lab-hue-5544.pdf", ttl=120s)', '#0369A1', false, '⑨')}
  ${arrow(926, 706, 570, 'Signed URL (?viewer=doc_dn&expires=...&sig=HMAC)', '#0369A1', true, '⑩')}
  ${arrow(706, 1124, 602, 'logSecurityEvent(EHR_SENSITIVE_CLINICAL_READ, SUCCESS) → Audit HMAC', '#B45309', false, '⑪')}
  ${arrow(706, 282, 638, 'HTTP 200 OK (Bệnh án đã giải mã + Pre-signed URL tải PDF xét nghiệm)', '#0F766E', true, '⑫')}

  <!-- Legend -->
  <rect x="18" y="684" width="1340" height="40" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="36" y="709" fill="#0F2942" font-size="12" font-weight="700">PHÒNG THỦ CHIỀU SÂU (NĐ 13/2023):</text>
  <text x="275" y="709" fill="#991B1B" font-size="11.5" font-weight="700">1. JWT + Facility ABAC + Consent</text>
  <text x="515" y="709" fill="#5B21B6" font-size="11.5" font-weight="700">2. AES-256-GCM + Pre-signed URL 120s</text>
  <text x="805" y="709" fill="#B45309" font-size="11.5" font-weight="700">3. SQLite Trigger + HMAC Chain (Catch = 0.119ms)</text>
</svg>`;
}

const DIAGRAMS = [
  {
    file: '01_c4_context.png',
    title: 'Hình 1: C4 Level 1 – System Context View & Trust Boundaries',
    subtitle: 'Tổng quan nền tảng MediLink kết nối 4 nhóm người dùng, 3 cụm HIS dị thể (12 phòng khám) & đối tác thanh toán/nhắn tin',
    badge: 'C4 LEVEL 1 • CONTEXT',
    svg: svgC4Context()
  },
  {
    file: '02_c4_container.png',
    title: 'Hình 2: C4 Level 2 – Container View (Architecture v2)',
    subtitle: 'Ánh xạ 1:1 với docker-compose.yml & src/ • Tách biệt Application Tier, Isolated Data Tier (internal: true) & Legacy HIS',
    badge: 'C4 LEVEL 2 • CONTAINER',
    svg: svgC4Container()
  },
  {
    file: '03_c4_component_acl.png',
    title: 'Hình 3: C4 Level 3 – Component View bên trong medilink-core',
    subtitle: 'Modular Monolith kết hợp Hexagonal Anti-Corruption Layer (HL7 FHIR R4 + Per-Facility CircuitBreaker + Pluggable Adapters)',
    badge: 'C4 LEVEL 3 • COMPONENT',
    svg: svgC4Component()
  },
  {
    file: '04_c4_code_acl.png',
    title: 'Hình 4: C4 Level 4 – Code View (UML Class & Interface Diagram)',
    subtitle: 'Thiết kế chi tiết lớp & giao diện trong src/core/acl/ và src/core/booking/ (BaseHisAdapter, CircuitBreaker, LockManager)',
    badge: 'C4 LEVEL 4 • CODE VIEW',
    svg: svgC4Code()
  },
  {
    file: '05_deployment_view.png',
    title: 'Hình 5: Deployment View – Hạ tầng Docker Compose & 3 Mạng Cách ly',
    subtitle: '6 Containers nhẹ (< 250 MB RAM) phân tách qua app-net, data-net (internal: true) và his-net',
    badge: 'DEPLOYMENT • DOCKER',
    svg: svgDeploymentView()
  },
  {
    file: '06_sequence_booking_concurrency.png',
    title: 'Hình 6: Sequence Diagram 1 – Chống Double-Booking 3 Lớp & Outbox Recovery',
    subtitle: 'Đáp ứng ASR-01 (0% trùng lịch, p95 = 77.42ms) & ASR-02 / ADR-007 (Circuit Breaker + Rate-Controlled Outbox có Jitter)',
    badge: 'SEQUENCE • ASR-01 & 02',
    svg: svgSeqBooking()
  },
  {
    file: '07_sequence_security_audit.png',
    title: 'Hình 7: Sequence Diagram 2 – ABAC, Consent, AES-256-GCM & Audit HMAC',
    subtitle: 'Đáp ứng ASR-03, QAS-05 & Nghị định 13/2023/NĐ-CP • Chặn truy cập chéo 403 (0 byte rò rỉ) & Phát hiện sửa log 0.119ms',
    badge: 'SEQUENCE • SECURITY',
    svg: svgSeqSecurity()
  }
];

function renderAll() {
  const browser = findBrowser();
  console.log(`[Diagram Renderer] Using browser: ${browser}`);

  for (const d of DIAGRAMS) {
    const htmlPath = path.join(TMP_DIR, d.file.replace('.png', '.html'));
    const pngPath = path.join(OUT_DIR, d.file);
    fs.writeFileSync(htmlPath, wrapHtml(d.title, d.subtitle, d.badge, d.svg, 1400, 820), 'utf8');

    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    execFileSync(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=2',
        '--window-size=1400,820',
        `--screenshot=${pngPath}`,
        fileUrl
      ],
      { stdio: 'pipe' }
    );

    const sizeKb = (fs.statSync(pngPath).size / 1024).toFixed(1);
    console.log(`  ✓ Rendered ${d.file} (${sizeKb} KB)`);
  }

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log('[Diagram Renderer] All 6 high-DPI diagrams generated in diagrams/rendered/');
}

if (require.main === module) {
  renderAll();
}

module.exports = { renderAll, DIAGRAMS, OUT_DIR };
