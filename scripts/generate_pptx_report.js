/**
 * Zero-Dependency Microsoft PowerPoint (.pptx / ECMA-376 OpenXML) Generator
 * Builds `Slide_BaoCao_MediLink_SE403.pptx` (20 Widescreen 16:9 slides) with:
 * - Modern MediLink Healthcare Enterprise Theme (Navy #0F2942 + Teal #0D9488)
 * - 6 Dedicated High-DPI Architecture Diagram Showcase Slides
 * - Rich Structured Report Annotations (Chú thích báo cáo ①②③④ + Điểm ăn điểm vấn đáp)
 * - Full PowerPoint Speaker Notes on every slide
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DIAGRAM_DIR = path.join(ROOT, 'diagrams', 'rendered');

// ==================== PURE NODE.JS PKZIP WRITER ====================
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compressed = zlib.deflateRawSync(rawBuf, { level: 6 });
    const crc = crc32(rawBuf);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(rawBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    localParts.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(rawBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }
  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralBuf, eocd]);
}

// ==================== DRAWINGML HELPERS (16:9 = 13.333" x 7.5") ====================
const EMU_PER_INCH = 914400;
const in2emu = (inches) => Math.round(inches * EMU_PER_INCH);

const C = {
  navy: '0F2942',
  navyMid: '163E63',
  teal: '0D9488',
  tealDark: '0F766E',
  tealLight: 'F0FDFA',
  blue: '1D4ED8',
  blueLight: 'EFF6FF',
  red: 'B91C1C',
  redLight: 'FEF2F2',
  amber: 'B45309',
  amberLight: 'FFFBEB',
  purple: '6D28D9',
  purpleLight: 'F5F3FF',
  green: '059669',
  greenLight: 'ECFDF5',
  slateBg: 'F8FAFC',
  border: 'CBD5E1',
  text: '1E293B',
  muted: '64748B',
  white: 'FFFFFF'
};

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let shapeIdCounter = 10;
function nextId() {
  shapeIdCounter += 1;
  return shapeIdCounter;
}

function spRect({ x, y, w, h, fill, border, borderPt = 1, radius = 0, shadow = false }) {
  const id = nextId();
  const prst = radius > 0 ? 'roundRect' : 'rect';
  const avLst = radius > 0 ? `<a:avLst><a:gd name="adj" fmla="val ${Math.round(radius * 10000)}"/></a:avLst>` : '<a:avLst/>';
  const fillXml = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
  const lnXml = border
    ? `<a:ln w="${Math.round(borderPt * 12700)}"><a:solidFill><a:srgbClr val="${border}"/></a:solidFill></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';
  const effXml = shadow
    ? '<a:effectLst><a:outerShdw blurRad="50800" dist="25400" dir="5400000" algn="ctr"><a:srgbClr val="0F172A"><a:alpha val="14000"/></a:srgbClr></a:outerShdw></a:effectLst>'
    : '';
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${in2emu(x)}" y="${in2emu(y)}"/><a:ext cx="${in2emu(w)}" cy="${in2emu(h)}"/></a:xfrm>
      <a:prstGeom prst="${prst}">${avLst}</a:prstGeom>
      ${fillXml}${lnXml}${effXml}
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="vi-VN"/></a:p></p:txBody>
  </p:sp>`;
}

function spText({ x, y, w, h, lines, fill = null, border = null, borderPt = 1, radius = 0, valign = 't', pad = [0.06, 0.1, 0.06, 0.1] }) {
  const id = nextId();
  const prst = radius > 0 ? 'roundRect' : 'rect';
  const avLst = radius > 0 ? `<a:avLst><a:gd name="adj" fmla="val ${Math.round(radius * 10000)}"/></a:avLst>` : '<a:avLst/>';
  const fillXml = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
  const lnXml = border
    ? `<a:ln w="${Math.round(borderPt * 12700)}"><a:solidFill><a:srgbClr val="${border}"/></a:solidFill></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';

  const pXml = lines
    .map((line) => {
      const l = typeof line === 'string' ? { text: line } : line;
      const align = l.align || 'l';
      const spcBef = l.spaceBefore ? `<a:spcBef><a:spcPts val="${l.spaceBefore * 100}"/></a:spcBef>` : '';
      const spcAft = l.spaceAfter !== undefined ? `<a:spcAft><a:spcPts val="${l.spaceAfter * 100}"/></a:spcAft>` : '<a:spcAft><a:spcPts val="300"/></a:spcAft>';
      const lnSpc = l.lineSpacing ? `<a:lnSpc><a:spcPct val="${Math.round(l.lineSpacing * 100000)}"/></a:lnSpc>` : '';

      const runs = l.runs || [{ text: l.text || '', bold: l.bold, italic: l.italic, size: l.size, color: l.color, font: l.font }];
      const rXml = runs
        .map((r) => {
          const sz = Math.round((r.size || 12) * 100);
          const clr = r.color || C.text;
          const b = r.bold ? ' b="1"' : '';
          const it = r.italic ? ' i="1"' : '';
          const fnt = r.font || 'Segoe UI';
          return `<a:r><a:rPr lang="vi-VN" sz="${sz}"${b}${it} dirty="0"><a:solidFill><a:srgbClr val="${clr}"/></a:solidFill><a:latin typeface="${fnt}"/><a:cs typeface="${fnt}"/></a:rPr><a:t>${esc(r.text)}</a:t></a:r>`;
        })
        .join('');
      return `<a:p><a:pPr algn="${align}">${lnSpc}${spcBef}${spcAft}</a:pPr>${rXml}</a:p>`;
    })
    .join('');

  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${in2emu(x)}" y="${in2emu(y)}"/><a:ext cx="${in2emu(w)}" cy="${in2emu(h)}"/></a:xfrm>
      <a:prstGeom prst="${prst}">${avLst}</a:prstGeom>
      ${fillXml}${lnXml}
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="square" anchor="${valign}" tIns="${in2emu(pad[0])}" rIns="${in2emu(pad[1])}" bIns="${in2emu(pad[2])}" lIns="${in2emu(pad[3])}"/>
      <a:lstStyle/>
      ${pXml}
    </p:txBody>
  </p:sp>`;
}

function spPicture({ x, y, w, h, relId, name }) {
  const id = nextId();
  return `<p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${id}" name="${esc(name)}"/>
      <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${relId}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm><a:off x="${in2emu(x)}" y="${in2emu(y)}"/><a:ext cx="${in2emu(w)}" cy="${in2emu(h)}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </p:spPr>
  </p:pic>`;
}

function spTable({ x, y, w, h, colWidths, rows, fontSize = 10.5 }) {
  const id = nextId();
  const gridCols = colWidths.map((cw) => `<a:gridCol w="${in2emu(cw)}"/>`).join('');
  const rowH = in2emu(h / rows.length);

  const trXml = rows
    .map((row, rIdx) => {
      const isHeader = rIdx === 0;
      const bg = isHeader ? C.navy : rIdx % 2 === 1 ? C.white : 'F1F5F9';
      const fg = isHeader ? C.white : C.text;
      const tcs = row
        .map((cell) => {
          const text = typeof cell === 'string' ? cell : cell.text;
          const bold = isHeader || (typeof cell === 'object' && cell.bold);
          const color = typeof cell === 'object' && cell.color ? cell.color : fg;
          return `<a:tc>
            <a:txBody>
              <a:bodyPr anchor="ctr" lIns="70000" rIns="70000" tIns="45000" bIns="45000"/>
              <a:lstStyle/>
              <a:p><a:pPr algn="${isHeader ? 'ctr' : 'l'}"/><a:r><a:rPr lang="vi-VN" sz="${Math.round(fontSize * 100)}"${bold ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Segoe UI"/></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr>
              <a:lnL w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnL>
              <a:lnR w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnR>
              <a:lnT w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnT>
              <a:lnB w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnB>
              <a:solidFill><a:srgbClr val="${bg}"/></a:solidFill>
            </a:tcPr>
          </a:tc>`;
        })
        .join('');
      return `<a:tr h="${rowH}">${tcs}</a:tr>`;
    })
    .join('');

  return `<p:graphicFrame>
    <p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table ${id}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>
    <p:xfrm><a:off x="${in2emu(x)}" y="${in2emu(y)}"/><a:ext cx="${in2emu(w)}" cy="${in2emu(h)}"/></p:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
      <a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${gridCols}</a:tblGrid>${trXml}</a:tbl>
    </a:graphicData></a:graphic>
  </p:graphicFrame>`;
}

// ==================== SLIDE CHROME (HEADER & FOOTER) ====================
function chromeShapes({ slideNum, totalSlides, tag, title, presenter }) {
  return [
    // Background light slate
    spRect({ x: 0, y: 0, w: 13.333, h: 7.5, fill: C.slateBg }),
    // Top Header Bar
    spRect({ x: 0, y: 0, w: 13.333, h: 0.78, fill: C.navy }),
    // Teal accent strip under header
    spRect({ x: 0, y: 0.78, w: 13.333, h: 0.05, fill: C.teal }),
    // Tag pill
    spText({
      x: 0.35, y: 0.14, w: 2.35, h: 0.24, fill: C.teal, radius: 0.5, valign: 'ctr', pad: [0.01, 0.06, 0.01, 0.06],
      lines: [{ text: tag, size: 8.5, bold: true, color: C.white, align: 'ctr', spaceAfter: 0 }]
    }),
    // Title
    spText({
      x: 0.35, y: 0.38, w: 9.8, h: 0.36, valign: 'ctr', pad: [0, 0, 0, 0],
      lines: [{ text: title, size: 17.5, bold: true, color: C.white, spaceAfter: 0 }]
    }),
    // Presenter badge on right
    spText({
      x: 10.2, y: 0.2, w: 2.8, h: 0.38, fill: C.navyMid, border: '2B6CB0', borderPt: 0.8, radius: 0.25, valign: 'ctr', pad: [0.02, 0.08, 0.02, 0.08],
      lines: [{ text: presenter, size: 9.5, bold: true, color: 'E2E8F0', align: 'ctr', spaceAfter: 0 }]
    }),
    // Bottom footer bar
    spRect({ x: 0, y: 7.16, w: 13.333, h: 0.34, fill: C.white, border: 'E2E8F0', borderPt: 0.5 }),
    spText({
      x: 0.35, y: 7.19, w: 9.0, h: 0.28, valign: 'ctr', pad: [0, 0, 0, 0],
      lines: [{ text: 'SE 403 – Thiết kế Kiến trúc Phần mềm | Đề tài 1: MediLink (Chuỗi 12 Phòng khám)', size: 9, color: C.muted, spaceAfter: 0 }]
    }),
    spText({
      x: 11.4, y: 7.19, w: 1.6, h: 0.28, valign: 'ctr', pad: [0, 0, 0, 0],
      lines: [{ text: `Trang ${slideNum} / ${totalSlides}`, size: 9.5, bold: true, color: C.navy, align: 'r', spaceAfter: 0 }]
    })
  ];
}

// ==================== ARCHITECTURE DIAGRAM SHOWCASE TEMPLATE ====================
function buildDiagramSlide({ slideNum, totalSlides, tag, title, presenter, imageFile, annotations, techSummary, notes }) {
  const shapes = chromeShapes({ slideNum, totalSlides, tag, title, presenter });

  // Left white card framing the high-DPI diagram (exact 1400:820 ratio = 8.42 x 4.93)
  shapes.push(spRect({ x: 0.32, y: 0.96, w: 8.58, h: 5.14, fill: C.white, border: C.border, borderPt: 1.2, radius: 0.03, shadow: true }));
  shapes.push(spPicture({ x: 0.40, y: 1.06, w: 8.42, h: 4.93, relId: 'rId2', name: imageFile }));

  // Bottom formal technical summary bar under diagram (clean, academic)
  shapes.push(spRect({ x: 0.32, y: 6.22, w: 8.58, h: 0.80, fill: 'F0FDFA', border: C.teal, borderPt: 1.2, radius: 0.06 }));
  shapes.push(spText({
    x: 0.44, y: 6.27, w: 8.34, h: 0.70, valign: 'ctr', pad: [0.02, 0.04, 0.02, 0.04],
    lines: [
      { runs: [{ text: 'TÓM TẮT KỸ THUẬT: ', bold: true, size: 10.5, color: C.tealDark }, { text: techSummary, size: 10.2, color: C.text }], spaceAfter: 0, lineSpacing: 1.15 }
    ]
  }));

  // Right Annotation Panel
  shapes.push(spRect({ x: 9.06, y: 0.96, w: 3.96, h: 6.06, fill: C.white, border: C.teal, borderPt: 1.5, radius: 0.03, shadow: true }));
  shapes.push(spRect({ x: 9.06, y: 0.96, w: 3.96, h: 0.44, fill: C.teal }));
  shapes.push(spText({
    x: 9.16, y: 1.00, w: 3.76, h: 0.36, valign: 'ctr', pad: [0, 0.04, 0, 0.04],
    lines: [{ text: 'PHÂN TÍCH & CHÚ THÍCH KIẾN TRÚC', size: 11, bold: true, color: C.white, align: 'ctr', spaceAfter: 0 }]
  }));

  const cardH = 1.28;
  const gap = 0.09;
  annotations.forEach((ann, idx) => {
    const cy = 1.50 + idx * (cardH + gap);
    shapes.push(spRect({ x: 9.20, y: cy, w: 3.68, h: cardH, fill: ann.bg || C.slateBg, border: ann.color || C.navy, borderPt: 1.0, radius: 0.06 }));
    shapes.push(spRect({ x: 9.20, y: cy, w: 0.10, h: cardH, fill: ann.color || C.navy }));
    shapes.push(spText({
      x: 9.36, y: cy + 0.05, w: 3.46, h: cardH - 0.10, valign: 't', pad: [0.02, 0.04, 0.02, 0.04],
      lines: [
        { text: `${ann.badge} ${ann.heading}`, size: 10.5, bold: true, color: ann.color || C.navy, spaceAfter: 2 },
        { text: ann.body, size: 9.5, color: C.text, spaceAfter: 0, lineSpacing: 1.12 }
      ]
    }));
  });

  return { shapes, imageFile, notes };
}

// ==================== BUILD ALL 21 SLIDES ====================
function createAllSlides() {
  const TOTAL = 21;
  const slides = [];

  // SLIDE 1: COVER
  slides.push({
    notes: 'Xin chào Thầy TS. Nguyễn Đức Mận. Nhóm Đề tài 1 xin trình bày Đồ án Thiết kế Kiến trúc Phần mềm SE 403: Nền tảng Đặt lịch khám và Hồ sơ Sức khỏe Điện tử MediLink cho chuỗi 12 phòng khám.',
    shapes: [
      spRect({ x: 0, y: 0, w: 13.333, h: 7.5, fill: C.navy }),
      spRect({ x: 0, y: 0, w: 0.35, h: 7.5, fill: C.teal }),
      spRect({ x: 9.2, y: 0, w: 4.133, h: 7.5, fill: C.navyMid }),
      // Top school info
      spText({
        x: 0.8, y: 0.55, w: 8.2, h: 0.7,
        lines: [
          { text: 'MÔN HỌC: SE 403 – THIẾT KẾ KIẾN TRÚC PHẦN MỀM (SOFTWARE ARCHITECTURE & DESIGN)', size: 11, bold: true, color: '5EEAD4', spaceAfter: 4 },
          { text: 'BÁO CÁO BẢO VỆ ĐỒ ÁN NHÓM CUỐI KỲ (M0 → M5 • ARCHITECTURE V2)', size: 10, color: 'CBD5E1', spaceAfter: 0 }
        ]
      }),
      // Main Title
      spText({
        x: 0.8, y: 1.45, w: 8.1, h: 2.3,
        lines: [
          { text: 'MEDILINK', size: 46, bold: true, color: C.white, spaceAfter: 6 },
          { text: 'Nền tảng Đặt lịch khám & Hồ sơ Sức khỏe Điện tử (EHR)', size: 22, bold: true, color: '99F6E4', spaceAfter: 6 },
          { text: 'Kiến trúc Liên chuỗi 12 Phòng khám — Chống Double-Booking, Tích hợp 3 HIS Dị thể & Tuân thủ Nghị định 13/2023/NĐ-CP', size: 13.5, color: 'E2E8F0', lineSpacing: 1.25 }
        ]
      }),
      // Highlights chips
      ...[
        { x: 0.8, t: '0.00% Double-Booking', s: 'p95 = 77.42ms' },
        { x: 3.45, t: '3+ HIS Dị thể', s: 'HL7 FHIR R4 ACL' },
        { x: 6.1, t: '6/6 Test PASS', s: 'NĐ 13/2023 + HMAC' }
      ].map((c) => [
        spRect({ x: c.x, y: 4.25, w: 2.4, h: 0.92, fill: '163E63', border: C.teal, borderPt: 1.2, radius: 0.1 }),
        spText({
          x: c.x + 0.1, y: 4.33, w: 2.2, h: 0.76, valign: 'ctr',
          lines: [
            { text: c.t, size: 12.5, bold: true, color: '5EEAD4', align: 'ctr', spaceAfter: 2 },
            { text: c.s, size: 10.5, color: C.white, align: 'ctr', spaceAfter: 0 }
          ]
        })
      ]).flat(),
      // Right panel: Team & Instructor
      spText({
        x: 9.55, y: 0.85, w: 3.45, h: 5.8,
        lines: [
          { text: 'GIẢNG VIÊN HƯỚNG DẪN', size: 10, bold: true, color: '5EEAD4', spaceAfter: 4 },
          { text: 'TS. Nguyễn Đức Mận', size: 16, bold: true, color: C.white, spaceAfter: 18 },
          { text: 'NHÓM THỰC HIỆN (ĐỀ TÀI 1)', size: 10, bold: true, color: '5EEAD4', spaceAfter: 8 },
          { text: '1. Lê Viết Nghĩa', size: 13, bold: true, color: C.white, spaceAfter: 1 },
          { text: '   Req & Doc Owner (Slide 1–4)', size: 10, color: 'CBD5E1', spaceAfter: 10 },
          { text: '2. Nguyễn Đức Bảo Hy', size: 13, bold: true, color: C.white, spaceAfter: 1 },
          { text: '   Lead Architect (Slide 5–15)', size: 10, color: 'CBD5E1', spaceAfter: 10 },
          { text: '3. Trần Tiến Danh', size: 13, bold: true, color: C.white, spaceAfter: 1 },
          { text: '   Prototype Lead (Slide 16–17 + Demo)', size: 10, color: 'CBD5E1', spaceAfter: 10 },
          { text: '4. Nguyễn Quang Trường', size: 13, bold: true, color: C.white, spaceAfter: 1 },
          { text: '   QA / Test Lead (Slide 18–21)', size: 10, color: 'CBD5E1', spaceAfter: 22 },
          { text: 'Đà Nẵng • Tháng 11 / 2026', size: 11, italic: true, color: '94A3B8', spaceAfter: 0 }
        ]
      }),
      spText({
        x: 0.8, y: 6.45, w: 8.0, h: 0.5,
        lines: [{ text: 'Chuỗi 12 Phòng khám • Đủ 4 tầng C4 (Context, Container, Component, Code) • Deployment & Sequence Views', size: 10.5, color: '94A3B8' }]
      })
    ]
  });

  // SLIDE 2: BỐI CẢNH BÀI TOÁN
  slides.push({
    notes: 'Phần 1 do Lê Viết Nghĩa trình bày. MediLink không phải bài toán CRUD đặt lịch đơn giản: chuỗi có 12 phòng khám phân tán qua 3 cụm HIS di sản không thể sửa DB, tỷ lệ trùng lịch 4.5%, rủi ro sập dây chuyền khi đứt mạng chi nhánh và ràng buộc pháp lý chặt của Nghị định 13/2023.',
    shapes: [
      ...chromeShapes({ slideNum: 2, totalSlides: TOTAL, tag: 'PHẦN 1 • BỐI CẢNH', title: 'Bối cảnh Chuỗi 12 Phòng khám & Vì sao Không phải CRUD Thông thường', presenter: 'Lê Viết Nghĩa • Req Owner' }),
      ...[
        { x: 0.4, color: C.red, bg: C.redLight, icon: '01', head: 'Trùng lịch ~4.5% (Double-Booking)', body: '12 phòng khám (120 bác sĩ, 1.920 slot/ngày) đặt lịch qua điện thoại & Excel rời rạc. Giờ cao điểm 8h sáng nhiều bệnh nhân tranh 1 khung giờ gây xung đột lịch và mất uy tín.' },
        { x: 3.65, color: C.amber, bg: C.amberLight, icon: '02', head: '3 Hệ thống HIS Di sản Dị thể', body: 'Đà Nẵng (5 cơ sở): REST/JSON + UUID.\nHuế (4 cơ sở): SOAP 1.1/XML + HUE-BN-xxx.\nQuảng Nam (3 cơ sở): Custom RPC + int ID.\nRàng buộc cứng: KHÔNG ĐƯỢC sửa CSDL HIS.' },
        { x: 6.9, color: C.blue, bg: C.blueLight, icon: '03', head: 'Đứt mạng Chi nhánh Kéo Treo Toàn chuỗi', body: 'Chi nhánh Huế thường mất kết nối 1–2 giờ. Nếu gọi đồng bộ trực tiếp không cách ly, luồng chờ mạng sẽ làm cạn thread pool và kéo sập luôn Đà Nẵng & Quảng Nam.' },
        { x: 10.15, color: C.purple, bg: C.purpleLight, icon: '04', head: 'Nghị định 13/2023/NĐ-CP', body: 'Hồ sơ bệnh án, đơn thuốc, kết quả xét nghiệm là Dữ liệu cá nhân nhạy cảm (Điều 2). Bắt buộc có sự đồng ý (Consent), mã hóa tại chỗ, phân quyền cơ sở & Audit chống chối bỏ.' }
      ].map((c) => [
        spRect({ x: c.x, y: 1.15, w: 2.95, h: 4.45, fill: C.white, border: c.color, borderPt: 1.5, radius: 0.04, shadow: true }),
        spRect({ x: c.x, y: 1.15, w: 2.95, h: 0.55, fill: c.color }),
        spText({ x: c.x + 0.12, y: 1.22, w: 2.71, h: 0.42, valign: 'ctr', lines: [{ text: `THÁCH THỨC ${c.icon}`, size: 12, bold: true, color: C.white, align: 'ctr', spaceAfter: 0 }] }),
        spText({
          x: c.x + 0.16, y: 1.85, w: 2.63, h: 3.55,
          lines: [
            { text: c.head, size: 13.5, bold: true, color: c.color, spaceAfter: 10 },
            { text: c.body, size: 11.2, color: C.text, lineSpacing: 1.25 }
          ]
        })
      ]).flat(),
      spRect({ x: 0.4, y: 5.85, w: 12.7, h: 1.05, fill: C.navy, radius: 0.05 }),
      spText({
        x: 0.6, y: 5.95, w: 12.3, h: 0.85, valign: 'ctr',
        lines: [
          { runs: [{ text: 'KẾT LUẬN BÀI TOÁN KIẾN TRÚC: ', bold: true, size: 12.5, color: '5EEAD4' }, { text: 'MediLink đòi hỏi các quyết định kiến trúc có kiểm chứng cho Tính nhất quán mạnh (Consistency), Cô lập lỗi (Availability), Bảo mật chiều sâu (Security) và Khả năng cắm thêm HIS mới (Interoperability).', size: 12, color: C.white }], lineSpacing: 1.2 }
        ]
      })
    ]
  });

  // SLIDE 3: BUSINESS GOALS & STAKEHOLDERS
  slides.push({
    notes: 'Các mục tiêu kinh doanh đều được định lượng thành KPI đo được và ánh xạ trực tiếp sang Quality Attribute Scenarios. Điểm khó nhất là hóa giải xung đột giữa tốc độ truy xuất bệnh án của Bác sĩ với yêu cầu bảo mật chặt chẽ của Pháp chế.',
    shapes: [
      ...chromeShapes({ slideNum: 3, totalSlides: TOTAL, tag: 'PHẦN 1 • MỤC TIÊU', title: 'Business Goals & Hóa giải Xung đột Stakeholders', presenter: 'Lê Viết Nghĩa • Req Owner' }),
      spText({ x: 0.4, y: 0.98, w: 6.2, h: 0.35, lines: [{ text: '4 MỤC TIÊU KINH DOANH ĐỊNH LƯỢNG (KPIs)', size: 12.5, bold: true, color: C.navy }] }),
      spTable({
        x: 0.4, y: 1.38, w: 12.53, h: 2.75, colWidths: [1.1, 3.3, 3.6, 4.53], fontSize: 10.5,
        rows: [
          ['Mã BG', 'Mục tiêu Kinh doanh', 'Chỉ tiêu Định lượng (KPI)', 'Thuộc tính Chất lượng (QA) tương ứng'],
          ['BG-01', 'Loại bỏ hoàn toàn trùng lịch khám', 'Double-booking = 0.00%; phản hồi p95 ≤ 500 ms', 'Consistency & Concurrency (ASR-01, ADR-003)'],
          ['BG-02', 'Vận hành liên tục giờ cao điểm', 'Availability ≥ 99.5% (≤ 2.1h/tháng); 1 HIS sập không ảnh hưởng 11 cơ sở', 'Availability & Fault Isolation (ASR-02, ADR-007)'],
          ['BG-03', 'Bảo vệ tuyệt đối dữ liệu sức khỏe', '0 sự cố rò rỉ dữ liệu chéo cơ sở; Audit Log không thể chối bỏ', 'Security & Compliance NĐ 13 (ASR-03, ADR-004/006)'],
          ['BG-04', 'Mở rộng nhanh chuỗi phòng khám', 'Tích hợp HIS thứ 4 ≤ 10 ngày công; sửa 0 dòng mã nguồn Core', 'Interoperability & Modifiability (ASR-04, ADR-002)']
        ]
      }),
      spText({ x: 0.4, y: 4.35, w: 12.5, h: 0.35, lines: [{ text: 'HÓA GIẢI 3 XUNG ĐỘT STAKEHOLDERS CỐT LÕI', size: 12.5, bold: true, color: C.navy }] }),
      ...[
        { x: 0.4, title: 'Bác sĩ  ↔  Pháp chế (NĐ 13)', conflict: 'Bác sĩ cần xem nhanh EHR liên cơ sở vs. Luật cấm lộ bệnh án nếu chưa có sự đồng ý.', resolve: 'Giải pháp: Patient Consent 1-chạm + Giải mã AES-256-GCM trong RAM (< 10ms) + Pre-signed URL 120s.' },
        { x: 4.68, title: 'Bệnh nhân  ↔  HIS Di sản Chậm', conflict: 'Bệnh nhân muốn xác nhận đặt lịch tức thì vs. HIS SOAP Huế có thể chậm/treo 2 giờ.', resolve: 'Giải pháp: Nhả khóa Redis sớm + Circuit Breaker 1500ms + Transactional Outbox đồng bộ bù nền.' },
        { x: 8.96, title: 'Ban Giám đốc  ↔  Đội ngũ 4 SV', conflict: 'Cần mở rộng nhiều HIS & cô lập lỗi vs. Ngân sách/nhân lực vận hành hệ thống nhỏ gọn.', resolve: 'Giải pháp: Modular Monolith + Hexagonal ACL + 1 Background Worker (< 250 MB RAM).' }
      ].map((s) => [
        spRect({ x: s.x, y: 4.75, w: 3.98, h: 2.18, fill: C.white, border: C.teal, borderPt: 1.3, radius: 0.05, shadow: true }),
        spText({
          x: s.x + 0.14, y: 4.84, w: 3.7, h: 2.0,
          lines: [
            { text: s.title, size: 12, bold: true, color: C.tealDark, spaceAfter: 6 },
            { runs: [{ text: 'Xung đột: ', bold: true, size: 10, color: C.red }, { text: s.conflict, size: 10, color: C.text }], spaceAfter: 6, lineSpacing: 1.15 },
            { runs: [{ text: 'Hóa giải: ', bold: true, size: 10, color: C.green }, { text: s.resolve, size: 10, color: C.text }], spaceAfter: 0, lineSpacing: 1.15 }
          ]
        })
      ]).flat()
    ]
  });

  // SLIDE 4: NGHỊ ĐỊNH 13/2023 & 5 CONSTRAINTS
  slides.push({
    notes: 'Theo Điều 2 Nghị định 13/2023/NĐ-CP, dữ liệu tình trạng sức khỏe là dữ liệu cá nhân nhạy cảm. Nhóm đã chuyển hóa thành 5 ràng buộc kỹ thuật bắt buộc C-01 đến C-05 và cài đặt trực tiếp trong mã nguồn.',
    shapes: [
      ...chromeShapes({ slideNum: 4, totalSlides: TOTAL, tag: 'PHẦN 1 • PHÁP LÝ NĐ 13', title: 'Phân loại Dữ liệu & 5 Ràng buộc Kỹ thuật từ Nghị định 13/2023/NĐ-CP', presenter: 'Lê Viết Nghĩa • Req Owner' }),
      spTable({
        x: 0.4, y: 1.05, w: 12.53, h: 1.95, colWidths: [2.5, 4.3, 5.73], fontSize: 10.5,
        rows: [
          ['Cấp độ Dữ liệu', 'Ví dụ Cụ thể trong MediLink', 'Yêu cầu Bảo vệ Bắt buộc'],
          [{ text: 'Cấp 1: Công khai', bold: true, color: C.green }, 'Danh sách 12 phòng khám, chuyên khoa, khung giờ trống', 'Cho phép cache công khai (SlotReadCache TTL 30s)'],
          [{ text: 'Cấp 2: Cá nhân cơ bản', bold: true, color: C.amber }, 'Họ tên, SĐT, mã lịch hẹn, trạng thái check-in', 'Truyền qua TLS 1.3; lễ tân chỉ xem đúng facility_id của mình'],
          [{ text: 'Cấp 3: Nhạy cảm sức khỏe', bold: true, color: C.red }, 'Chẩn đoán, ghi chú lâm sàng, đơn thuốc, file PDF xét nghiệm', 'Mã hóa AES-256-GCM tại chỗ, bắt buộc Consent, che [REDACTED], Audit HMAC']
        ]
      }),
      spText({ x: 0.4, y: 3.18, w: 12.5, h: 0.35, lines: [{ text: '5 RÀNG BUỘC KIẾN TRÚC BẮT BUỘC (C-01 → C-05) ĐÃ HIỆN THỰC TRONG CODE', size: 12, bold: true, color: C.navy }] }),
      ...[
        { x: 0.4, y: 3.6, w: 6.1, code: 'C-01', name: 'Quản lý Sự đồng ý (Explicit Patient Consent)', desc: 'Bảng patient_consents lưu quyền chia sẻ liên cơ sở; bệnh nhân bật/tắt bất cứ lúc nào. Không có Consent → chặn 403.' },
        { x: 6.83, y: 3.6, w: 6.1, code: 'C-02', name: 'Mã hóa Cấp trường AES-256-GCM Tách khóa', desc: 'diagnosis_enc, clinical_notes_enc, prescription_enc lưu dạng enc:v1:iv:tag:cipher. Khóa tách riêng qua biến môi trường.' },
        { x: 0.4, y: 4.82, w: 6.1, code: 'C-03', name: 'Contextual ABAC + Masking [REDACTED]', desc: 'Lấy facility_id từ JWT đã ký (cấm tin client). Lễ tân khác cơ sở → 403; lễ tân cùng cơ sở chỉ xem hành chính.' },
        { x: 6.83, y: 4.82, w: 6.1, code: 'C-04', name: 'Audit Log Bất biến (Trigger + HMAC-SHA256)', desc: 'SQLite Trigger cấm UPDATE/DELETE. Mỗi dòng băm liên hoàn với dòng trước → AuditVerifier phát hiện DBA sửa log trong 0.119ms.' },
        { x: 0.4, y: 6.04, w: 12.53, code: 'C-05', name: 'Object Storage Cô lập + Pre-signed URL (TTL 120s)', desc: 'File PDF xét nghiệm lưu mã hóa nhị phân ngoài DB (/data/lab-files/*.enc), chỉ tải qua đường dẫn ký HMAC ngắn hạn 120 giây (ADR-006).' }
      ].map((c) => [
        spRect({ x: c.x, y: c.y, w: c.w, h: 1.02, fill: C.white, border: C.border, borderPt: 1, radius: 0.06, shadow: true }),
        spRect({ x: c.x, y: c.y, w: 0.85, h: 1.02, fill: C.navy }),
        spText({ x: c.x, y: c.y, w: 0.85, h: 1.02, valign: 'ctr', lines: [{ text: c.code, size: 13, bold: true, color: '5EEAD4', align: 'ctr', spaceAfter: 0 }] }),
        spText({
          x: c.x + 0.96, y: c.y + 0.06, w: c.w - 1.08, h: 0.9, valign: 'ctr',
          lines: [
            { text: c.name, size: 11.5, bold: true, color: C.navy, spaceAfter: 3 },
            { text: c.desc, size: 10, color: C.text, spaceAfter: 0, lineSpacing: 1.15 }
          ]
        })
      ]).flat()
    ]
  });

  // SLIDE 5: UTILITY TREE & 4 ASR (H, H)
  slides.push({
    notes: 'Phần 2 do Nguyễn Đức Bảo Hy trình bày. Từ quy mô thực tế 120 bác sĩ, 1.920 slot/ngày và 420 giờ làm việc/tháng, nhóm xây dựng Utility Tree và chọn ra 4 ASR hạng (H, H) làm xương sống thiết kế.',
    shapes: [
      ...chromeShapes({ slideNum: 5, totalSlides: TOTAL, tag: 'PHẦN 2 • DRIVERS', title: 'Cơ sở Định lượng & 4 Yêu cầu Kiến trúc Cốt lõi (ASR hạng H, H)', presenter: 'Nguyễn Đức Bảo Hy • Architect' }),
      // Top formula strip
      spRect({ x: 0.4, y: 1.0, w: 12.53, h: 0.82, fill: C.tealLight, border: C.teal, borderPt: 1.2, radius: 0.06 }),
      spText({
        x: 0.56, y: 1.06, w: 12.2, h: 0.7, valign: 'ctr',
        lines: [
          { runs: [{ text: 'CƠ SỞ TÍNH TOÁN SLA: ', bold: true, size: 11.5, color: C.tealDark }, { text: '12 phòng khám × 10 bác sĩ = 120 bác sĩ (1.920 slot/ngày)  |  420 giờ khám/tháng → Availability ≥ 99.5% chỉ cho phép gián đoạn tối đa 2.1 giờ/tháng → 1 HIS sập 2h không được kéo treo toàn chuỗi!', size: 11, color: C.text }] }
        ]
      }),
      ...[
        { x: 0.4, y: 2.02, color: C.blue, code: 'ASR-01 • (H, H)', qa: 'Consistency & Concurrency', stim: '50 bệnh nhân đặt đồng thời cùng 1 bác sĩ & 1 khung giờ (08:00).', meas: 'Đúng 1 request 201 Created, 49 request 409 Conflict; Double-booking = 0.00%; p95 ≤ 500ms.', tac: 'Idempotency Key + Redis SET NX PX 3000 + Fencing + SQLite UNIQUE.' },
        { x: 6.78, y: 2.02, color: C.amber, code: 'ASR-02 • (H, H)', qa: 'Availability & Fault Isolation', stim: 'HIS SOAP Huế sập hoàn toàn 2 giờ trong khung giờ cao điểm.', meas: 'Đà Nẵng & Quảng Nam đạt 100% thành công; Huế Fast-fail vào Outbox ≤ 50ms; phục hồi đủ 100%.', tac: 'Per-Facility Circuit Breaker (1500ms) + Transactional Outbox + Jitter.' },
        { x: 0.4, y: 4.58, color: C.red, code: 'ASR-03 • (H, H)', qa: 'Security & Privacy (NĐ 13)', stim: 'Lễ tân Đà Nẵng gọi API truy xuất hồ sơ bệnh án thuộc Huế (REC-HUE-5544).', meas: 'Chặn HTTP 403 trong ≤ 50ms; 0 byte dữ liệu nhạy cảm rò rỉ; ghi Audit Log HMAC 100%.', tac: 'JWT HS256 + Contextual ABAC + Consent + AES-256-GCM + SQLite Trigger.' },
        { x: 6.78, y: 4.58, color: C.green, code: 'ASR-04 • (H, H)', qa: 'Interoperability & Modifiability', stim: 'Chuỗi mở rộng phòng khám #13 dùng phần mềm HIS thứ 4 chuẩn HL7 FHIR R4.', meas: 'Thời gian tích hợp ≤ 10 ngày công; sửa 0 dòng mã nguồn Booking/EHR Core.', tac: 'Hexagonal Anti-Corruption Layer + Canonical Model HL7 FHIR R4 + Registry.' }
      ].map((a) => [
        spRect({ x: a.x, y: a.y, w: 6.15, h: 2.34, fill: C.white, border: a.color, borderPt: 1.5, radius: 0.05, shadow: true }),
        spRect({ x: a.x, y: a.y, w: 6.15, h: 0.44, fill: a.color }),
        spText({ x: a.x + 0.14, y: a.y + 0.04, w: 5.87, h: 0.36, valign: 'ctr', lines: [{ text: `${a.code}  |  ${a.qa}`, size: 12, bold: true, color: C.white, spaceAfter: 0 }] }),
        spText({
          x: a.x + 0.16, y: a.y + 0.52, w: 5.83, h: 1.74,
          lines: [
            { runs: [{ text: '• Stimulus: ', bold: true, size: 10.5, color: C.navy }, { text: a.stim, size: 10.5, color: C.text }], spaceAfter: 5 },
            { runs: [{ text: '• Measure: ', bold: true, size: 10.5, color: a.color }, { text: a.meas, size: 10.5, color: C.text }], spaceAfter: 5 },
            { runs: [{ text: '• Tactics: ', bold: true, size: 10.5, color: C.tealDark }, { text: a.tac, size: 10.5, color: C.text }], spaceAfter: 0 }
          ]
        })
      ]).flat()
    ]
  });

  // SLIDE 6: BIỆN LUẬN PHONG CÁCH KIẾN TRÚC (ADR-001)
  slides.push({
    notes: 'Ở ADR-001, nhóm chấm điểm có trọng số 3 phương án. Microservices tách từng HIS bị loại vì đội ngũ 4 người không nên gánh Distributed Transaction và Ops phức tạp. Modular Monolith kết hợp Hexagonal ACL và tách riêng 1 Background Worker đạt 4.81/5.',
    shapes: [
      ...chromeShapes({ slideNum: 6, totalSlides: TOTAL, tag: 'PHẦN 2 • ADR-001', title: 'Biện luận Phong cách Kiến trúc Tổng thể (Weighted Scoring Matrix)', presenter: 'Nguyễn Đức Bảo Hy • Architect' }),
      spTable({
        x: 0.4, y: 1.05, w: 12.53, h: 3.45, colWidths: [3.2, 1.1, 2.6, 2.7, 2.93], fontSize: 10.5,
        rows: [
          ['Tiêu chí Đánh giá', 'Trọng số', 'PA 1: Layered Monolith', 'PA 2: Microservices (Tách HIS)', 'PA 3: Modular Monolith + Worker (CHỌN)'],
          ['Consistency & ACID (ASR-01)', '25%', '4.0 (Dễ ACID)', '2.5 (Saga phức tạp)', { text: '5.0 (ACID + Redis Lock gọn nhẹ)', bold: true, color: C.green }],
          ['Fault Isolation (ASR-02)', '25%', '1.5 (HIS treo kéo sập app)', '4.5 (Cô lập process)', { text: '4.8 (Circuit Breaker + Worker tách)', bold: true, color: C.green }],
          ['Interoperability HIS (ASR-04)', '20%', '2.0 (Coupling chặt)', '4.5 (Tách service)', { text: '5.0 (Hexagonal ACL + FHIR R4)', bold: true, color: C.green }],
          ['Bảo mật & Audit (ASR-03)', '15%', '3.5 (Tập trung)', '3.0 (Mạng nội bộ nhiều hop)', { text: '4.7 (ABAC tập trung + data-net)', bold: true, color: C.green }],
          ['Vận hành đội 4 người / RAM', '15%', '4.8 (Rất nhẹ)', '1.8 (Quá tải DevOps/RAM)', { text: '4.6 (< 250 MB RAM, 1 docker up)', bold: true, color: C.green }],
          ['TỔNG ĐIỂM CÓ TRỌNG SỐ', '100%', '2.98 / 5.00 (Loại)', '3.38 / 5.00 (Over-engineer)', { text: '4.81 / 5.00 ★ QUYẾT ĐỊNH CHỌN', bold: true, color: C.green }]
        ]
      }),
      spRect({ x: 0.4, y: 4.78, w: 12.53, h: 2.1, fill: C.white, border: C.navy, borderPt: 1.4, radius: 0.05, shadow: true }),
      spRect({ x: 0.4, y: 4.78, w: 12.53, h: 0.42, fill: C.navy }),
      spText({ x: 0.56, y: 4.82, w: 12.2, h: 0.34, valign: 'ctr', lines: [{ text: 'TẠI SAO TRÁNH BẪY "VẼ MỖI HIS THÀNH 1 MICROSERVICE"?', size: 11.5, bold: true, color: '5EEAD4', spaceAfter: 0 }] }),
      spText({
        x: 0.56, y: 5.28, w: 12.2, h: 1.5,
        lines: [
          { runs: [{ text: '1. Cô lập lỗi không nhất thiết phải tách thành 5 microservices: ', bold: true, size: 11, color: C.navy }, { text: 'Mỗi Adapter HIS trong ACL được bọc bởi Per-Facility CircuitBreaker + Timeout 1500ms, kết hợp medilink-worker chạy process riêng để xử lý Outbox & SMS.', size: 11, color: C.text }], spaceAfter: 6 },
          { runs: [{ text: '2. Tối ưu cho đội ngũ 4 kỹ sư: ', bold: true, size: 11, color: C.navy }, { text: 'Tránh chi phí Distributed Transaction/Service Mesh, dễ debug, toàn bộ 6 containers chỉ tốn < 250 MB RAM.', size: 11, color: C.text }], spaceAfter: 6 },
          { runs: [{ text: '3. Sẵn sàng tiến hóa (Evolutionary Architecture): ', bold: true, size: 11, color: C.navy }, { text: 'Nhờ ranh giới module rõ ràng trong src/core/acl/, khi tải tăng 10x (120 phòng khám) có thể tách ACL thành microservice độc lập mà không viết lại Core.', size: 11, color: C.text }], spaceAfter: 0 }
        ]
      })
    ]
  });

  // SLIDE 7: KIẾN TRÚC 1/7 - C4 LEVEL 1 CONTEXT
  slides.push(buildDiagramSlide({
    slideNum: 7, totalSlides: TOTAL,
    tag: 'C4 LEVEL 1 • CONTEXT',
    title: 'Sơ đồ Ngữ cảnh Hệ thống (System Context View) & 3 Vùng Tin cậy',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '01_c4_context.png',
    techSummary: 'Phân tách 3 vùng Trust Boundary (Public Zone, Legacy HIS Zone, Third-Party Zone); mọi giao tiếp vượt ranh giới đều được bảo vệ bởi TLS 1.3 + JWT HS256, ACL chuẩn HL7 FHIR R4 và Webhook HMAC.',
    notes: 'Sơ đồ C4 Level 1 mô tả bức tranh tổng thể của MediLink với 3 ranh giới tin cậy (Trust Boundaries). Phía trên là 4 nhóm người dùng truy cập qua mạng công cộng không tin cậy, bắt buộc đi qua TLS 1.3 + JWT. Ở giữa là MediLink Central Platform tuân thủ NĐ 13/2023. Phía dưới là 3 cụm HIS di sản không sửa được DB cùng 2 đối tác thanh toán và SMS/Zalo.',
    annotations: [
      { badge: '①', heading: 'Trust Boundary 1 – Public Zone', color: C.blue, bg: C.blueLight, body: '4 nhóm tác nhân (Bệnh nhân, Bác sĩ, Lễ tân, Ban Giám đốc) truy cập từ Internet/Wi-Fi. Mọi request bắt buộc qua HTTPS + JWT HS256 + Rate Limiter.' },
      { badge: '②', heading: 'Trusted MediLink Platform', color: C.tealDark, bg: C.tealLight, body: 'Trung tâm điều phối đặt lịch chống trùng 3 lớp, lưu EHR mã hóa AES-256-GCM, phân quyền ABAC + Consent và ghi Audit HMAC bất biến.' },
      { badge: '③', heading: 'Trust Boundary 2 – 3 Cụm HIS Dị thể', color: C.amber, bg: C.amberLight, body: 'Đà Nẵng (REST/UUID), Huế (SOAP XML/HUE-BN), Quảng Nam (Custom RPC/int). Cô lập hoàn toàn qua lớp ACL chuẩn HL7 FHIR R4.' },
      { badge: '④', heading: 'Trust Boundary 3 – Đối tác Bên thứ 3', color: C.purple, bg: C.purpleLight, body: 'Thanh toán cọc (VNPay/MoMo) xác thực Webhook HMAC; gửi SMS/Zalo ZNS chạy bất đồng bộ qua Worker để không chặn đặt lịch.' }
    ]
  }));

  // SLIDE 8: KIẾN TRÚC 2/7 - C4 LEVEL 2 CONTAINER
  slides.push(buildDiagramSlide({
    slideNum: 8, totalSlides: TOTAL,
    tag: 'C4 LEVEL 2 • CONTAINER',
    title: 'Sơ đồ Container View (Architecture v2) – Ánh xạ 1:1 với mã nguồn',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '02_c4_container.png',
    techSummary: 'Tách biệt medilink-core (API đồng bộ, p95 = 77.42ms) với medilink-worker (Outbox/SMS/Audit bất đồng bộ); tầng dữ liệu (Redis, SQLite WAL, Lab Object Storage) nằm trong mạng nội bộ data-net (internal: true).',
    notes: 'Sơ đồ C4 Level 2 ánh xạ 1:1 với docker-compose.yml và thư mục src/. Application Zone tách rõ medilink-core (xử lý đồng bộ nhanh) và medilink-worker (chạy 3 tiến trình nền: Outbox có Jitter, Notification Backoff, Audit Integrity). Persistence Zone nằm trong mạng internal: true gồm Redis 7 (Lock + Fencing), SQLite WAL (ACID + Trigger) và Object Storage mã hóa cho PDF xét nghiệm.',
    annotations: [
      { badge: '①', heading: 'Tách Core API & Background Worker', color: C.navy, bg: C.slateBg, body: 'medilink-core phục vụ API đồng bộ (p95 = 77ms); medilink-worker chạy tiến trình độc lập xử lý Outbox, SMS Retry & quét Audit HMAC.' },
      { badge: '②', heading: 'data-net (internal: true) Cô lập Tuyệt đối', color: C.red, bg: C.redLight, body: 'Redis 7 (TCP 6379), SQLite WAL và Lab Object Bucket nằm hoàn toàn trong mạng nội bộ không có route ra Internet (Zero External Exposure).' },
      { badge: '③', heading: 'Phân tách Lưu trữ Theo Đặc thù Dữ liệu', color: C.tealDark, bg: C.tealLight, body: 'Redis giữ khóa TTL 3s + Fencing Token; SQLite giữ giao dịch ACID + EHR mã hóa; Object Storage giữ file PDF nhị phân (Pre-signed URL 120s).' },
      { badge: '④', heading: 'Giao tiếp Đồng bộ vs Bất đồng bộ', color: C.amber, bg: C.amberLight, body: 'Nét liền = Sync trong Request (< 150ms); Nét đứt = Async Poll/Retry qua Outbox & Queue giúp cô lập lỗi khi HIS Huế hoặc SMS gặp sự cố.' }
    ]
  }));

  // SLIDE 9: KIẾN TRÚC 3/7 - C4 LEVEL 3 COMPONENT & ACL
  slides.push(buildDiagramSlide({
    slideNum: 9, totalSlides: TOTAL,
    tag: 'C4 LEVEL 3 • COMPONENT',
    title: 'Sơ đồ Component View bên trong medilink-core & Hexagonal ACL',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '03_c4_component_acl.png',
    techSummary: 'Modular Monolith phân tách 5 nhóm thành phần nghiệp vụ và khối Anti-Corruption Layer theo mẫu Hexagonal Ports & Adapters; chuẩn hóa HL7 FHIR R4 giúp tích hợp HIS #4 mà không sửa mã nguồn Core (0 dòng).',
    notes: 'Đi sâu vào bên trong container medilink-core: mọi request đi qua HTTP Router & Token Bucket Rate Limiter, sau đó qua JWT & Contextual ABAC Guard. Lớp nghiệp vụ tách rõ Booking, Concurrency Engine và EHR/Crypto/Audit. Đặc biệt, khối Anti-Corruption Layer áp dụng mẫu Hexagonal Ports & Adapters: chuẩn hóa qua HL7 FHIR R4 (CanonicalModelMapper), bọc Per-Facility CircuitBreaker và điều phối động qua HisIntegrationDispatcher.',
    annotations: [
      { badge: '①', heading: 'Gateway + Rate Limiter & ABAC Guard', color: C.blue, bg: C.blueLight, body: 'Token Bucket chặn spam F5 giữ khóa (Risk R-01). ABAC đối chiếu facility_id từ JWT + kiểm tra bảng patient_consents trước khi chạm EHR.' },
      { badge: '②', heading: 'Booking & Concurrency Engine', color: C.tealDark, bg: C.tealLight, body: 'Tách biệt logic nghiệp vụ đặt lịch (slotCache, Outbox) với cơ chế chống trùng (Idempotency Key + Redis Lock + Lua Atomic Unlock).' },
      { badge: '③', heading: 'Canonical Model HL7 FHIR R4 (ADR-002)', color: C.amber, bg: C.amberLight, body: 'Ánh xạ dữ liệu nội bộ & bảng MPI sang chuẩn y tế quốc tế {Patient, Appointment}, giảm độ phức tạp tích hợp từ O(N×M) xuống O(N).' },
      { badge: '④', heading: 'Open-Closed Principle (ASR-04)', color: C.green, bg: C.greenLight, body: '4 Adapters (Đà Nẵng, Huế, Quảng Nam, Hội An FHIR) cùng triển khai BaseHisAdapter. Thêm HIS #4 chỉ cần đăng ký vào Registry — sửa 0 dòng Core.' }
    ]
  }));

  // SLIDE 10: KIẾN TRÚC 4/7 - C4 LEVEL 4 CODE VIEW (UML CLASS DIAGRAM)
  slides.push(buildDiagramSlide({
    slideNum: 10, totalSlides: TOTAL,
    tag: 'C4 LEVEL 4 • CODE VIEW',
    title: 'Sơ đồ Mức Mã nguồn (Code View – UML Class Diagram ACL & Locking)',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '04_c4_code_acl.png',
    techSummary: 'Thiết kế hướng đối tượng ánh xạ 1:1 với src/core/acl/ và src/core/booking/: lớp trừu tượng BaseHisAdapter định nghĩa hợp đồng Port chuẩn cho 4 Adapter kế thừa, tách rời hoàn toàn khỏi BookingService & LockManager.',
    notes: 'Sơ đồ C4 Level 4 đi sâu xuống mức lớp (UML Class Diagram) của 2 gói trọng yếu nhất trong mã nguồn. Bên trái là gói src/core/acl/: HisIntegrationDispatcher quản lý Registry động, gọi CanonicalModelMapper tạo HL7 FHIR R4 Bundle và bọc thực thi trong CircuitBreaker riêng từng cơ sở. Bốn lớp Adapter cụ thể kế thừa lớp trừu tượng BaseHisAdapter. Bên phải là BookingService kết hợp LockManager dùng Lua Atomic Unlock.',
    annotations: [
      { badge: '①', heading: 'Port Trừu tượng BaseHisAdapter', color: C.amber, bg: C.amberLight, body: 'Lớp trừu tượng trong baseAdapter.js ép mọi Adapter phải hiện thực syncAppointment(canonicalBundle, timeoutMs = 1500) và checkHealth().' },
      { badge: '②', heading: '4 Concrete Adapters Độc lập Giao thức', color: C.green, bg: C.greenLight, body: 'DaNangJsonAdapter, HueXmlAdapter, QuangNamCustomAdapter và FhirGenericAdapter (HIS #4 Hội An) che giấu hoàn toàn khác biệt REST/SOAP/RPC.' },
      { badge: '③', heading: 'CircuitBreaker Finite State Machine', color: C.red, bg: C.redLight, body: 'Quản lý vòng đời CLOSED → OPEN (≥3 lỗi) → HALF_OPEN theo từng facilityId với Timeout Budget 1500ms và cơ chế Fast-fail khi mạch mở.' },
      { badge: '④', heading: 'LockManager & Lua Atomic Unlock', color: C.blue, bg: C.blueLight, body: 'Cấp khóa Redis SET NX PX 3000 kèm Monotonic Fencing Token; nhả khóa bằng Lua Script kiểm tra chính xác chủ sở hữu trước khi xóa.' }
    ]
  }));

  // SLIDE 11: KIẾN TRÚC 5/7 - DEPLOYMENT VIEW
  slides.push(buildDiagramSlide({
    slideNum: 11, totalSlides: TOTAL,
    tag: 'DEPLOYMENT • DOCKER',
    title: 'Sơ đồ Triển khai Hạ tầng (Deployment View – Docker Compose)',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '05_deployment_view.png',
    techSummary: 'Đóng gói 6 Containers nhẹ (tổng RAM < 250 MB) trên 3 mạng Docker tách biệt (app-net, data-net internal: true, his-net); chỉ duy nhất cổng 3000 của medilink-core tiếp nhận lưu lượng từ bên ngoài.',
    notes: 'Sơ đồ Deployment View khớp 100% với file docker-compose.yml của nhóm. Toàn hệ thống đóng gói thành 6 container nhẹ (node:22-alpine và redis:7-alpine) phân tách trên 3 mạng Docker độc lập: app-net, data-net (internal: true) và his-net. Dữ liệu SQLite WAL và file PDF mã hóa dùng chung Persistent Volume /data.',
    annotations: [
      { badge: '①', heading: 'Single Ingress Point (Port 3000)', color: C.navy, bg: C.slateBg, body: 'Duy nhất medilink-core mở cổng 3000 tiếp nhận lưu lượng từ Client. Worker, Redis và toàn bộ DB không mở cổng ra host.' },
      { badge: '②', heading: '3 Mạng Docker Cách ly Lớp Mạng', color: C.red, bg: C.redLight, body: 'app-net (Ứng dụng), data-net với internal: true (Cô lập tuyệt đối tầng dữ liệu khỏi Internet), và his-net (Mạng riêng kết nối 3 cụm HIS).' },
      { badge: '③', heading: 'Shared Encrypted Volume (/data)', color: C.tealDark, bg: C.tealLight, body: 'medilink-core và medilink-worker mount chung /data chứa medilink.db (SQLite chế độ WAL hỗ trợ đọc/ghi đồng thời) và /data/lab-files/*.enc.' },
      { badge: '④', heading: 'Khả năng Vận hành & Chaos Testing', color: C.amber, bg: C.amberLight, body: '3 container Mock HIS (8001/8002/8003) có sẵn Chaos Mode trên HIS Huế để kiểm thử ngắt mạch & tự phục hồi độc lập.' }
    ]
  }));

  // SLIDE 12: KIẾN TRÚC 6/7 - SEQUENCE 1 CONCURRENCY & OUTBOX
  slides.push(buildDiagramSlide({
    slideNum: 12, totalSlides: TOTAL,
    tag: 'SEQUENCE 1 • ASR-01 & 02',
    title: 'Luồng Đặt lịch Chống Double-Booking 3 Lớp & Phục hồi Outbox',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '06_sequence_booking_concurrency.png',
    techSummary: 'Chốt chặn 3 lớp (Idempotency Key → Redis Lock + Fencing → SQLite UNIQUE) kết hợp nhả khóa sớm trước khi gọi mạng HIS; đạt 0.00% trùng lịch (p95 = 77.42ms) và phục hồi Outbox 4/4 khi HIS Huế hoạt động trở lại.',
    notes: 'Sequence Diagram 1 trình bày 4 pha của quy trình đặt lịch. Pha 1: Bệnh nhân A và B gửi đồng thời cách nhau 2ms; A lấy được Redis Lock kèm Fencing Token 41, B nhận 409 Conflict ngay dưới 10ms. Pha 2: Ghi ACID vào SQLite với ràng buộc UNIQUE(active_slot_key) và nhả khóa Redis ngay bằng Lua Script trước khi gọi mạng HIS. Pha 3: Gọi HIS qua Circuit Breaker; nếu HIS Huế lỗi, ghi vào outbox_events và trả 201 cho bệnh nhân. Pha 4: Worker nền tự đồng bộ bù theo batch 5 kèm Jitter ngẫu nhiên chống Thundering Herd.',
    annotations: [
      { badge: '①', heading: 'Phòng thủ 3 Lớp (ADR-003)', color: C.blue, bg: C.blueLight, body: 'Lớp 1: X-Idempotency-Key chống double-click. Lớp 2: Redis SET NX PX 3000 + Fencing Token chặn tranh chấp < 10ms. Lớp 3: SQLite UNIQUE.' },
      { badge: '②', heading: 'Nhả khóa Sớm Bằng Lua Atomic Unlock', color: C.tealDark, bg: C.tealLight, body: 'Ngay sau khi SQLite COMMIT thành công (Bước ⑧), khóa được nhả lập tức — không bao giờ giữ khóa trong lúc chờ mạng HIS.' },
      { badge: '③', heading: 'Circuit Breaker + Outbox (ASR-02)', color: C.amber, bg: C.amberLight, body: 'HIS Huế lỗi ≥ 3 lần → Mạch chuyển OPEN, các request sau Fast-fail trong 1.43ms vào outbox_events, bệnh nhân vẫn nhận 201 Created.' },
      { badge: '④', heading: 'Rate-Controlled Replay (+ Jitter)', color: C.green, bg: C.greenLight, body: 'Khi HIS Huế hồi phục, Worker đồng bộ từng đợt (Batch=5) kèm Random Jitter 20–60ms chống bão request (ADR-007 Architecture v2).' }
    ]
  }));

  // SLIDE 13: KIẾN TRÚC 7/7 - SEQUENCE 2 SECURITY & AUDIT
  slides.push(buildDiagramSlide({
    slideNum: 13, totalSlides: TOTAL,
    tag: 'SEQUENCE 2 • SECURITY',
    title: 'Luồng Bảo mật ABAC, Patient Consent, AES-256-GCM & Audit HMAC',
    presenter: 'Nguyễn Đức Bảo Hy • Architect',
    imageFile: '07_sequence_security_audit.png',
    techSummary: 'Tuân thủ Nghị định 13/2023/NĐ-CP: chặn truy cập chéo cơ sở trong 8.49ms (0 byte rò rỉ), giải mã AES-256-GCM trong RAM khi có Consent, cấp Pre-signed URL 120s cho PDF và kiểm định toàn vẹn chuỗi Audit HMAC trong 0.119ms.',
    notes: 'Sequence Diagram 2 thể hiện 2 kịch bản bảo mật cốt lõi. Kịch bản A: Lễ tân Đà Nẵng dùng JWT hợp lệ cố đọc bệnh án REC-HUE-5544; ABAC phát hiện facility_id không khớp, ghi Audit Log băm HMAC-SHA256 và trả 403 trong 8.49ms với 0 byte rò rỉ. Kịch bản B: Bác sĩ Đà Nẵng đọc cùng hồ sơ sau khi bệnh nhân bật Consent; hệ thống giải mã AES-256-GCM trong RAM, sinh Pre-signed URL 120s cho file PDF xét nghiệm và ghi vết đọc thành công.',
    annotations: [
      { badge: '①', heading: 'Kịch bản A – Chặn Chéo Cơ sở (ASR-03)', color: C.red, bg: C.redLight, body: 'ABAC đọc facility_id trực tiếp từ chữ ký JWT (không tin header client). Lễ tân ĐN xem hồ sơ Huế → Chặn 403 trong 8.49ms, 0 byte rò rỉ.' },
      { badge: '②', heading: 'Kịch bản B – Consent Liên cơ sở (NĐ 13)', color: C.tealDark, bg: C.tealLight, body: 'Bác sĩ ĐN chỉ được xem hồ sơ Huế khi bảng patient_consents có is_active = 1. Nếu bệnh nhân thu hồi Consent → lập tức bị chặn 403.' },
      { badge: '③', heading: 'Mã hóa AES-256-GCM & Pre-signed URL', color: C.purple, bg: C.purpleLight, body: 'Dữ liệu lâm sàng chỉ giải mã trong RAM khi hợp lệ. File PDF xét nghiệm tải qua Pre-signed URL ký HMAC tự hủy sau 120 giây (ADR-006).' },
      { badge: '④', heading: 'Audit Log Bất biến (Trigger + HMAC)', color: C.amber, bg: C.amberLight, body: 'Mọi truy cập (403 & 200) nối chuỗi băm HMAC-SHA256. SQLite Trigger chặn UPDATE/DELETE; nếu DBA sửa trực tiếp file DB → bắt trong 0.119ms.' }
    ]
  }));

  // SLIDE 14: ATAM EVALUATION & V1 -> V2
  slides.push({
    notes: 'Qua đánh giá ATAM rút gọn ở M3, nhóm không dừng ở thiết kế ban đầu mà phát hiện 3 rủi ro kiến trúc thực sự (R-01, R-02, R-03) và nâng cấp toàn diện lên Architecture v2 với ADR-007.',
    shapes: [
      ...chromeShapes({ slideNum: 14, totalSlides: TOTAL, tag: 'PHẦN 2 • ATAM V1 → V2', title: 'Đánh giá Kiến trúc ATAM & Tiến hóa lên Architecture v2 (ADR-007)', presenter: 'Nguyễn Đức Bảo Hy • Architect' }),
      spTable({
        x: 0.4, y: 1.05, w: 12.53, h: 4.35, colWidths: [1.1, 3.1, 3.85, 4.48], fontSize: 10.2,
        rows: [
          ['Mã Rủi ro', 'Điểm yếu phát hiện ở Architecture v1', 'Hậu quả nếu không khắc phục', 'Giải pháp nâng cấp lên Architecture v2'],
          [{ text: 'Risk R-01', bold: true, color: C.red }, 'Giữ Redis Lock xuyên suốt lúc gọi mạng HIS + Chưa có Rate Limiter chống spam F5', 'HIS chậm 1.5s làm nghẽn slot; attacker spam giữ khóa liên tục gây DoS cục bộ', { text: 'Nhả khóa sớm ngay sau SQLite COMMIT + Fencing Token + TokenBucketRateLimiter', bold: true, color: C.tealDark }],
          [{ text: 'Risk R-02', bold: true, color: C.amber }, 'Đồng bộ lại toàn bộ hàng đợi ngay lập tức khi HIS Huế vừa phục hồi', 'Hiệu ứng Thundering Herd (hàng trăm request dồn 1 lúc) làm HIS Huế sập trở lại', { text: 'Chuyển ADR-002 sang Partially Superseded; ban hành ADR-007: Transactional Outbox + Batch=5 + Random Jitter', bold: true, color: C.tealDark }],
          [{ text: 'Risk R-03', bold: true, color: C.purple }, 'Lễ tân cùng cơ sở xem được trường lâm sàng & DBA có thể sửa trực tiếp bảng Audit', 'Vi phạm nguyên tắc tối thiểu hóa dữ liệu (NĐ 13) và mất tính chống chối bỏ pháp lý', { text: 'Masking [REDACTED] cho lễ tân + bảng patient_consents + SQLite Trigger cấm UPDATE/DELETE + AuditIntegrityWorker', bold: true, color: C.tealDark }]
        ]
      }),
      spRect({ x: 0.4, y: 5.65, w: 12.53, h: 1.25, fill: C.tealLight, border: C.teal, borderPt: 1.4, radius: 0.05 }),
      spText({
        x: 0.6, y: 5.75, w: 12.13, h: 1.05, valign: 'ctr',
        lines: [
          { text: 'TRADE-OFF ĐÃ CHẤP NHẬN Ở ARCHITECTURE V2:', size: 11.5, bold: true, color: C.tealDark, spaceAfter: 4 },
          { text: '• Chấp nhận Eventual Consistency ngắn hạn (vài giây đến vài phút) giữa MediLink Core và HIS cơ sở bị đứt mạng để đổi lấy Availability ≥ 99.5% và bảo vệ HIS di sản khỏi sập dây chuyền khi phục hồi.', size: 10.8, color: C.text, spaceAfter: 3 },
          { text: '• Chấp nhận tăng nhẹ độ trễ đọc EHR (~2–4ms) cho giải mã AES-256-GCM & kiểm tra Consent để đạt tuân thủ 100% Nghị định 13/2023/NĐ-CP.', size: 10.8, color: C.text, spaceAfter: 0 }
        ]
      })
    ]
  });

  // SLIDE 15: TỔNG HỢP 7 ADRs
  slides.push({
    notes: 'Toàn bộ 7 quyết định kiến trúc đều được ghi nhận đầy đủ theo chuẩn ADR (Context, Decision, Alternatives, Consequences) trong thư mục adr/0001 đến 0007.',
    shapes: [
      ...chromeShapes({ slideNum: 15, totalSlides: TOTAL, tag: 'PHẦN 2 • 7 ADRs', title: 'Tổng hợp 7 Bản ghi Quyết định Kiến trúc (ADR-001 → ADR-007)', presenter: 'Nguyễn Đức Bảo Hy • Architect' }),
      spTable({
        x: 0.4, y: 1.05, w: 12.53, h: 5.85, colWidths: [1.25, 3.1, 4.4, 1.55, 2.23], fontSize: 10,
        rows: [
          ['Mã ADR', 'Quyết định Kiến trúc', 'Cơ chế Hiện thực Chính', 'Trạng thái', 'Đáp ứng QA / Luật'],
          [{ text: 'ADR-001', bold: true, color: C.navy }, 'Phong cách Kiến trúc Tổng thể', 'Modular Monolith + Hexagonal ACL + Background Worker tách rời', 'Accepted', 'Cân bằng 4 ASR & Ops'],
          [{ text: 'ADR-002', bold: true, color: C.navy }, 'Tích hợp 3 HIS Dị thể (ACL)', 'Canonical Model HL7 FHIR R4 (Patient+MPI, Appointment) + Circuit Breaker', { text: 'Partially Superseded', color: C.amber, bold: true }, 'ASR-04 (Sửa 0 dòng Core)'],
          [{ text: 'ADR-003', bold: true, color: C.navy }, 'Chống Double-Booking 3 Lớp', 'Idempotency Key → Redis SET NX PX 3000 + Fencing → SQLite UNIQUE', 'Accepted', 'ASR-01 (0% trùng lịch)'],
          [{ text: 'ADR-004', bold: true, color: C.navy }, 'Bảo mật ABAC & Audit Bất biến', 'JWT HS256 + Facility ABAC + AES-256-GCM + SQLite Trigger + HMAC Chain', 'Accepted', 'ASR-03, QAS-05, NĐ 13'],
          [{ text: 'ADR-005', bold: true, color: C.navy }, 'Hàng đợi Thông báo Bất đồng bộ', 'Notification Queue bền vững + Exponential Backoff Worker (SMS/Zalo)', 'Accepted', 'QAS-08 (Không chặn đặt lịch)'],
          [{ text: 'ADR-006', bold: true, color: C.navy }, 'Lưu trữ File Xét nghiệm PDF', 'Encrypted Object Storage (/data/lab-files/*.enc) + Pre-signed URL 120s', 'Accepted', 'C-05, NĐ 13/2023'],
          [{ text: 'ADR-007', bold: true, color: C.tealDark }, 'Phục hồi HIS Có Điều tiết (v2)', 'Transactional Outbox Pattern + Batch=5 + Random Jitter chống Thundering Herd', { text: 'Accepted (v2)', color: C.green, bold: true }, 'ASR-02 (Hồi phục 4/4)']
        ]
      })
    ]
  });

  // SLIDE 16: ÁNH XẠ 1:1 KIẾN TRÚC -> MÃ NGUỒN
  slides.push({
    notes: 'Phần 3 do Trần Tiến Danh trình bày. Điểm mạnh của nhóm là kiến trúc trên giấy ánh xạ 1:1 hoàn toàn với mã nguồn Node.js 22 chuẩn (zero external heavy frameworks), 100% thành viên đọc hiểu từng dòng.',
    shapes: [
      ...chromeShapes({ slideNum: 16, totalSlides: TOTAL, tag: 'PHẦN 3 • PROTOTYPE', title: 'Ánh xạ 1:1 từ Sơ đồ Kiến trúc C4 sang Mã nguồn Prototype (src/)', presenter: 'Trần Tiến Danh • Prototype Lead' }),
      // Left code tree box
      spRect({ x: 0.4, y: 1.05, w: 5.5, h: 5.85, fill: '0F172A', border: C.teal, borderPt: 1.5, radius: 0.04 }),
      spText({
        x: 0.56, y: 1.15, w: 5.18, h: 5.65,
        lines: [
          { text: '📁 src/ (Node.js 22 LTS • Zero-Bloat)', size: 12, bold: true, color: '5EEAD4', font: 'Consolas', spaceAfter: 6 },
          { text: '├── core/                  # Container: medilink-core', size: 10, color: 'E2E8F0', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── server.js          # Entry + Auto-fallback port', size: 9.8, color: 'CBD5E1', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── gateway/           # httpApp.js, rateLimiter.js', size: 9.8, color: 'CBD5E1', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── auth/              # jwtService, abacMiddleware', size: 9.8, color: '93C5FD', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── booking/           # bookingService, lockManager,', size: 9.8, color: '93C5FD', font: 'Consolas', spaceAfter: 3 },
          { text: '│   │                      # idempotencyManager, slotCache', size: 9.8, color: '93C5FD', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── ehr/               # ehrService, encryptionService,', size: 9.8, color: 'C4B5FD', font: 'Consolas', spaceAfter: 3 },
          { text: '│   │                      # labStorageService (Pre-signed)', size: 9.8, color: 'C4B5FD', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── audit/             # auditService, auditVerifier', size: 9.8, color: 'FCD34D', font: 'Consolas', spaceAfter: 3 },
          { text: '│   ├── acl/               # hisDispatcher, canonicalModel,', size: 9.8, color: 'FDBA74', font: 'Consolas', spaceAfter: 3 },
          { text: '│   │   ├── circuitBreaker.js', size: 9.8, color: 'FDBA74', font: 'Consolas', spaceAfter: 3 },
          { text: '│   │   └── adapters/      # DaNang, Hue, QNam, FhirGeneric', size: 9.8, color: '6EE7B7', font: 'Consolas', spaceAfter: 3 },
          { text: '│   └── demo/              # Interactive 4-Tab Dashboard', size: 9.8, color: '5EEAD4', font: 'Consolas', spaceAfter: 5 },
          { text: '├── worker/                # Container: medilink-worker', size: 10, color: 'E2E8F0', font: 'Consolas', spaceAfter: 3 },
          { text: '│   └── backgroundWorker.js# Outbox+Jitter, Notif, Audit', size: 9.8, color: '6EE7B7', font: 'Consolas', spaceAfter: 5 },
          { text: '├── mock-his/              # 3 Mock HIS (8001, 8002, 8003)', size: 10, color: 'FDBA74', font: 'Consolas', spaceAfter: 5 },
          { text: '└── tests/                 # 6 Automated Verification Suites', size: 10, color: 'FDE047', font: 'Consolas', spaceAfter: 0 }
        ]
      }),
      // Right mapping cards
      ...[
        { y: 1.05, color: C.blue, h: 1.32, title: 'C4 Component → Module Thực thi', body: 'Mỗi hộp trong sơ đồ C4 Level 3 tương ứng chính xác 1 thư mục con trong src/core/. Không có mã giả hay sơ đồ "vẽ cho có".' },
        { y: 2.52, color: C.tealDark, h: 1.32, title: 'Node.js 22 Native Stack (node:sqlite, node:crypto)', body: 'Dùng trực tiếp SQLite 3 WAL native, AES-256-GCM native & HMAC-SHA256 native → khởi động < 1 giây, không lệ thuộc thư viện nặng.' },
        { y: 3.99, color: C.amber, h: 1.32, title: '3 Mock HIS Chuẩn Giao thức Thật', body: 'HIS Đà Nẵng chạy REST JSON; HIS Huế parse SOAP 1.1 XML Envelope thật + nút Chaos Mode; HIS Quảng Nam chạy Custom RPC.' },
        { y: 5.46, color: C.green, h: 1.44, title: '1 Lệnh Khởi chạy Toàn Hệ thống', body: 'Chạy `node src/start-all.js` hoặc `docker compose up` tự khởi động Core API, Worker, 3 Mock HIS và mở Interactive Dashboard tại /demo.' }
      ].map((m) => [
        spRect({ x: 6.15, y: m.y, w: 6.78, h: m.h, fill: C.white, border: m.color, borderPt: 1.4, radius: 0.05, shadow: true }),
        spRect({ x: 6.15, y: m.y, w: 0.14, h: m.h, fill: m.color }),
        spText({
          x: 6.42, y: m.y + 0.08, w: 6.38, h: m.h - 0.16, valign: 'ctr',
          lines: [
            { text: m.title, size: 12.5, bold: true, color: m.color, spaceAfter: 4 },
            { text: m.body, size: 10.8, color: C.text, spaceAfter: 0, lineSpacing: 1.18 }
          ]
        })
      ]).flat()
    ]
  });

  // SLIDE 17: KỊCH BẢN LIVE DEMO 4 TAB
  slides.push({
    notes: 'Sau slide này, Trần Tiến Danh sẽ chuyển sang trình duyệt mở Dashboard tại http://localhost:3000/demo và trình diễn trực tiếp 4 Tab tương ứng 4 kịch bản kiểm chứng trong 4 phút.',
    shapes: [
      ...chromeShapes({ slideNum: 17, totalSlides: TOTAL, tag: 'PHẦN 3 • LIVE DEMO', title: 'Kịch bản Demo Trực quan trên Dashboard 4 Tab', presenter: 'Trần Tiến Danh • Prototype Lead' }),
      ...[
        { x: 0.4, y: 1.1, color: C.blue, tab: 'TAB 1 • ASR-01', title: 'Đua 50 Request Đặt 1 Slot', steps: ['1. Bấm "Bắn 50 Request song song" vào BS Đà Nẵng @ 08:00.', '2. Quan sát kết quả realtime: Đúng 1 HTTP 201 Created, 49 HTTP 409 Conflict.', '3. Kiểm tra Idempotency Replay & p95 < 100ms.'] },
        { x: 6.78, y: 1.1, color: C.red, tab: 'TAB 2 • ASR-03 & NĐ 13', title: 'ABAC, Consent & Mã hóa EHR', steps: ['1. Chọn Lễ tân ĐN truy xuất REC-HUE-5544 → Bị chặn 403 (0 byte rò rỉ).', '2. Chọn Bác sĩ ĐN (chưa Consent) → Chặn 403. Bật nút gạt Consent → 200 OK!', '3. Giải mã AES-256-GCM trong RAM + Tải PDF qua Pre-signed URL 120s.'] },
        { x: 0.4, y: 4.15, color: C.amber, tab: 'TAB 3 • ASR-02 & ADR-007', title: 'Chaos Mode: Ngắt HIS Huế', steps: ['1. Bật công tắc "Ngắt kết nối HIS Huế" → Đặt lịch Huế.', '2. Mạch Huế nhảy sang OPEN (Fast-fail 1.43ms), ghi vào Outbox; ĐN/QN vẫn 100% OK.', '3. Khôi phục HIS Huế → Bấm chạy Outbox Worker → Đồng bộ bù thành công!'] },
        { x: 6.78, y: 4.15, color: C.purple, tab: 'TAB 4 • QAS-05 & C-04', title: 'Kiểm định Chuỗi Audit HMAC', steps: ['1. Xem chuỗi Audit Log liên hoàn (prev_hash → current_hash).', '2. Bấm "Giả lập Hacker/DBA sửa trái phép dòng Log #1" trong DB.', '3. Chạy AuditVerifier → Bắt sống dòng #1 bị sửa chỉ trong 0.119ms!'] }
      ].map((t) => [
        spRect({ x: t.x, y: t.y, w: 6.15, h: 2.75, fill: C.white, border: t.color, borderPt: 1.6, radius: 0.05, shadow: true }),
        spRect({ x: t.x, y: t.y, w: 6.15, h: 0.48, fill: t.color }),
        spText({ x: t.x + 0.16, y: t.y + 0.06, w: 5.83, h: 0.36, valign: 'ctr', lines: [{ text: `${t.tab}  —  ${t.title}`, size: 12.5, bold: true, color: C.white, spaceAfter: 0 }] }),
        spText({
          x: t.x + 0.18, y: t.y + 0.60, w: 5.79, h: 2.02,
          lines: t.steps.map((st) => ({ text: st, size: 11, color: C.text, spaceAfter: 8, lineSpacing: 1.18 }))
        })
      ]).flat()
    ]
  });

  // SLIDE 18: KẾT QUẢ ĐO LƯỜNG THỰC NGHIỆM (6/6 PASS)
  slides.push({
    notes: 'Phần 4 do Nguyễn Quang Trường trình bày. Tất cả 6 kịch bản đều chạy tự động qua run_all_verification_tests.js và lưu JSON minh chứng thật. Mọi chỉ số đều vượt xa ngưỡng SLA cam kết.',
    shapes: [
      ...chromeShapes({ slideNum: 18, totalSlides: TOTAL, tag: 'PHẦN 4 • KIỂM CHỨNG', title: 'Kết quả Đo lường Thực nghiệm trên Phần cứng Nhóm (6/6 PASS)', presenter: 'Nguyễn Quang Trường • QA Lead' }),
      spRect({ x: 0.4, y: 0.98, w: 12.53, h: 0.56, fill: C.navyMid, radius: 0.05 }),
      spText({
        x: 0.56, y: 1.03, w: 12.2, h: 0.46, valign: 'ctr',
        lines: [{ text: 'Môi trường đo (latest_verification_report.json): Intel Core i5-12500H (16 logical cores), 7.63 GB RAM, Windows 11, Node.js v24.11.0', size: 10.5, bold: true, color: '99F6E4', align: 'ctr', spaceAfter: 0 }]
      }),
      spTable({
        x: 0.4, y: 1.68, w: 12.53, h: 4.35, colWidths: [1.7, 3.05, 3.35, 3.23, 1.2], fontSize: 10.2,
        rows: [
          ['Kịch bản', 'Thuộc tính Kiểm chứng', 'Ngưỡng SLA Cam kết', 'Số liệu Thực đo', 'Kết quả'],
          [{ text: 'ASR-01 / QAS-07', bold: true, color: C.navy }, 'Consistency & Idempotency (50 reqs)', '1 OK, 49 Conflict, p95 ≤ 500ms', { text: '1 OK, 49 Conflict, p95 = 77.42ms', bold: true, color: C.green }, { text: 'PASS ✓', bold: true, color: C.green }],
          [{ text: 'ASR-02 / ADR-007', bold: true, color: C.navy }, 'Availability & Outbox Recovery (Huế)', 'CB OPEN, Fast-fail < 50ms, ĐN/QN 100%', { text: 'CB=OPEN (1.43ms), Outbox 4/4', bold: true, color: C.green }, { text: 'PASS ✓', bold: true, color: C.green }],
          [{ text: 'ASR-03 / NĐ 13', bold: true, color: C.navy }, 'ABAC, Consent, AES-256-GCM, PDF', 'Chặn chéo 403 ≤ 50ms, 0 byte rò rỉ', { text: 'HTTP 403 (8.49ms), AES-GCM ✓', bold: true, color: C.green }, { text: 'PASS ✓', bold: true, color: C.green }],
          [{ text: 'QAS-05 / C-04', bold: true, color: C.navy }, 'Audit Append-Only Trigger & HMAC', 'Chặn SQL UPDATE/DELETE, bắt DBA sửa', { text: 'Trigger Blocked, Catch = 0.119ms', bold: true, color: C.green }, { text: 'PASS ✓', bold: true, color: C.green }],
          [{ text: 'ASR-04', bold: true, color: C.navy }, 'Interoperability HIS #4 (FHIR R4)', 'Cắm HIS Hội An sửa Core = 0 dòng', { text: 'Synced (HOIAN-FHIR-0428), 0 dòng', bold: true, color: C.green }, { text: 'PASS ✓', bold: true, color: C.green }],
          [{ text: 'QAS-06 / QAS-08', bold: true, color: C.navy }, 'Performance (200 Reads) & Async SMS', 'p95 < 300ms, SMS Retry = SENT', { text: '1,299 req/s, p95 = 140.77ms, SENT', bold: true, color: C.green }, { text: 'PASS ✓', bold: true, color: C.green }]
        ]
      }),
      spRect({ x: 0.4, y: 6.18, w: 12.53, h: 0.78, fill: C.greenLight, border: C.green, borderPt: 1.2, radius: 0.06 }),
      spText({
        x: 0.58, y: 6.24, w: 12.17, h: 0.66, valign: 'ctr',
        lines: [{ runs: [{ text: 'CÂU CHUYỆN TỐI ƯU THỰC TẾ: ', bold: true, size: 11, color: C.green }, { text: 'Trên máy i3 cũ ban đầu, QAS-06 (200 reads) bị p95 = 301.93ms (vượt 300ms). Nhóm thêm SlotReadCache (Read-Through TTL 30s) → kéo giảm xuống 258.50ms (và 140.77ms trên i5)!', size: 10.5, color: C.text }], spaceAfter: 0 }]
      })
    ]
  });

  // SLIDE 19: MINH BẠCH SỬ DỤNG AI
  slides.push({
    notes: 'Nhóm tuân thủ nghiêm ngặt quy tắc minh bạch sử dụng AI (ai-log.md) với quy tắc 3 câu hỏi và sẵn sàng giải trình những đề xuất của AI mà nhóm đã bác bỏ hoặc chỉnh sửa.',
    shapes: [
      ...chromeShapes({ slideNum: 19, totalSlides: TOTAL, tag: 'PHẦN 4 • AI TRANSPARENCY', title: 'Minh bạch Sử dụng AI (ai-log.md) – Quy tắc 3 Câu hỏi & Phản biện', presenter: 'Nguyễn Quang Trường • QA Lead' }),
      spRect({ x: 0.4, y: 1.05, w: 12.53, h: 1.15, fill: C.navy, radius: 0.05 }),
      spText({
        x: 0.6, y: 1.13, w: 12.13, h: 0.98, valign: 'ctr',
        lines: [
          { text: 'QUY TẮC "3 CÂU HỎI" TRƯỚC KHI CHẤP NHẬN MỌI GỢI Ý TỪ AI:', size: 11.5, bold: true, color: '5EEAD4', spaceAfter: 4 },
          { text: '1. Đề xuất này có phù hợp quy mô 12 phòng khám & đội ngũ 4 người không?   2. Có vi phạm NĐ 13/2023 hoặc tạo lỗ hổng bảo mật không?   3. Cả 4 thành viên có giải thích và bảo vệ được trước hội đồng không?', size: 10.8, color: C.white, spaceAfter: 0 }
        ]
      }),
      spTable({
        x: 0.4, y: 2.42, w: 12.53, h: 4.45, colWidths: [2.4, 3.6, 3.5, 3.03], fontSize: 10.2,
        rows: [
          ['Hạng mục', 'Gợi ý ban đầu của AI', 'Phản biện & Lý do Nhóm Bác bỏ / Sửa', 'Quyết định Cuối cùng của Nhóm'],
          [{ text: 'Kiến trúc Tổng thể', bold: true, color: C.navy }, 'Tách thành 6–7 Microservices riêng (Booking, EHR, từng HIS Service...)', 'Over-engineering với đội 4 SV, phát sinh Saga phức tạp & tốn RAM vận hành', { text: 'Modular Monolith + Hexagonal ACL + 1 Worker (ADR-001)', bold: true, color: C.green }],
          [{ text: 'Cơ chế Khóa Slot', bold: true, color: C.navy }, 'Giữ Redis Lock cho đến khi gọi xong API sang HIS phòng khám rồi mới nhả', 'Rủi ro Risk R-01: HIS treo 1.5s sẽ giữ khóa gây nghẽn toàn bộ hệ thống', { text: 'Nhả khóa sớm bằng Lua ngay sau SQLite COMMIT + Fencing Token', bold: true, color: C.green }],
          [{ text: 'Phân quyền ABAC', bold: true, color: C.navy }, 'Lấy facility_id từ HTTP Header / Body do client gửi lên để kiểm tra nhanh', 'Lỗ hổng IDOR nghiêm trọng: kẻ tấn công dễ dàng sửa Header giả mạo cơ sở', { text: 'Bắt buộc trích facility_id từ payload JWT đã xác thực chữ ký HS256', bold: true, color: C.green }],
          [{ text: 'Phục hồi HIS Huế', bold: true, color: C.navy }, 'Dùng vòng lặp retry đồng bộ hoặc xả toàn bộ hàng đợi khi HIS sống lại', 'Gây hiệu ứng Thundering Herd đánh sập lại HIS di sản ngay khi vừa lên', { text: 'ADR-007: Transactional Outbox + Batch=5 + Random Jitter', bold: true, color: C.green }]
        ]
      })
    ]
  });

  // SLIDE 20: BÀI HỌC KINH NGHIỆM & MỞ RỘNG 10X
  slides.push({
    notes: 'Cuối cùng, nhóm rút ra 3 bài học xương máu và vạch rõ lộ trình tiến hóa kiến trúc khi chuỗi mở rộng gấp 10 lần lên 120 phòng khám mà không phải đập đi xây lại.',
    shapes: [
      ...chromeShapes({ slideNum: 20, totalSlides: TOTAL, tag: 'PHẦN 4 • ROADMAP 10X', title: 'Bài học Kinh nghiệm & Lộ trình Mở rộng Khi Tải Tăng 10 Lần', presenter: 'Nguyễn Quang Trường • QA Lead' }),
      // Left: Lessons Learned
      spRect({ x: 0.4, y: 1.08, w: 6.0, h: 5.82, fill: C.white, border: C.navy, borderPt: 1.4, radius: 0.04, shadow: true }),
      spRect({ x: 0.4, y: 1.08, w: 6.0, h: 0.48, fill: C.navy }),
      spText({ x: 0.56, y: 1.14, w: 5.68, h: 0.36, valign: 'ctr', lines: [{ text: '📘 BÀI HỌC KINH NGHIỆM (NẾU LÀM LẠI TỪ ĐẦU)', size: 12, bold: true, color: '5EEAD4', spaceAfter: 0 }] }),
      spText({
        x: 0.58, y: 1.72, w: 5.64, h: 5.0,
        lines: [
          { text: '1. Thiết kế cơ chế Phục hồi (Recovery) ngay từ M2', size: 12, bold: true, color: C.navy, spaceAfter: 4 },
          { text: 'Không chỉ thiết kế cho lúc hệ thống sập (Circuit Breaker), mà phải nghĩ ngay tới lúc hệ thống sống lại (Outbox + Jitter) để tránh Thundering Herd.', size: 10.8, color: C.text, spaceAfter: 14, lineSpacing: 1.2 },
          { text: '2. Đo thực nghiệm sớm để phát hiện điểm nghẽn thật', size: 12, bold: true, color: C.navy, spaceAfter: 4 },
          { text: 'Nhờ chạy tải 200 concurrent reads trên phần cứng thật, nhóm phát hiện độ trễ 301.93ms và bổ sung SlotReadCache kịp thời thay vì đoán mò.', size: 10.8, color: C.text, spaceAfter: 14, lineSpacing: 1.2 },
          { text: '3. Đưa Contract Testing vào cho lớp ACL ngay từ đầu', size: 12, bold: true, color: C.navy, spaceAfter: 4 },
          { text: 'Kiểm thử hợp đồng (Contract Tests) giữa Canonical HL7 FHIR R4 và các Adapter giúp tự tin thêm HIS #4, #5 mà không lo phá vỡ các cụm cũ.', size: 10.8, color: C.text, spaceAfter: 0, lineSpacing: 1.2 }
        ]
      }),
      // Right: Scale 10x Roadmap
      spRect({ x: 6.68, y: 1.08, w: 6.25, h: 5.82, fill: C.white, border: C.teal, borderPt: 1.4, radius: 0.04, shadow: true }),
      spRect({ x: 6.68, y: 1.08, w: 6.25, h: 0.48, fill: C.teal }),
      spText({ x: 6.84, y: 1.14, w: 5.93, h: 0.36, valign: 'ctr', lines: [{ text: '🚀 LỘ TRÌNH MỞ RỘNG 10X (120 PHÒNG KHÁM / 19.200 SLOT)', size: 12, bold: true, color: C.white, spaceAfter: 0 }] }),
      ...[
        { y: 1.74, step: 'BƯỚC 1 • TẦNG DỮ LIỆU', desc: 'Nâng cấp SQLite WAL sang PostgreSQL Primary + Read Replicas (phân vùng bảng audit_logs theo tháng) & MinIO/S3 cho Lab PDF.' },
        { y: 3.04, step: 'BƯỚC 2 • KHÓA PHÂN TÁN & CACHE', desc: 'Chuyển Redis đơn sang cụm Redis Sentinel / Cluster HA để loại bỏ Single Point of Failure cho khóa đặt lịch & Slot Cache.' },
        { y: 4.34, step: 'BƯỚC 3 • TÁCH DỊCH VỤ ACL & WORKER', desc: 'Tách module src/core/acl/ thành Integration Service riêng sau Message Broker (RabbitMQ/Kafka) để scale ngang theo từng cụm HIS.' },
        { y: 5.64, step: 'BƯỚC 4 • QUẢN TRỊ KHÓA & OBSERVABILITY', desc: 'Tích hợp KMS/HashiCorp Vault xoay vòng khóa AES-256 tự động + OpenTelemetry giám sát Circuit Breaker toàn chuỗi.' }
      ].map((r) => [
        spRect({ x: 6.88, y: r.y, w: 5.85, h: 1.12, fill: C.tealLight, border: '99F6E4', borderPt: 1, radius: 0.06 }),
        spText({
          x: 7.02, y: r.y + 0.06, w: 5.57, h: 1.0, valign: 'ctr',
          lines: [
            { text: r.step, size: 11, bold: true, color: C.tealDark, spaceAfter: 3 },
            { text: r.desc, size: 10.2, color: C.text, spaceAfter: 0, lineSpacing: 1.15 }
          ]
        })
      ]).flat()
    ]
  });

  // SLIDE 21: TỔNG KẾT & CẢM ƠN
  slides.push({
    notes: 'Cảm ơn Thầy TS. Nguyễn Đức Mận đã lắng nghe. Cả 4 thành viên xin tiếp nhận câu hỏi và góp ý từ Thầy.',
    shapes: [
      spRect({ x: 0, y: 0, w: 13.333, h: 7.5, fill: C.navy }),
      spRect({ x: 0, y: 0, w: 13.333, h: 0.18, fill: C.teal }),
      spRect({ x: 0, y: 7.32, w: 13.333, h: 0.18, fill: C.teal }),
      spText({
        x: 1.0, y: 1.1, w: 11.333, h: 1.4,
        lines: [
          { text: 'CẢM ƠN THẦY ĐÃ LẮNG NGHE!', size: 36, bold: true, color: C.white, align: 'ctr', spaceAfter: 8 },
          { text: 'NHÓM ĐỀ TÀI 1 – MEDILINK | TỔNG KẾT ĐỒ ÁN KIẾN TRÚC PHẦN MỀM', size: 15, bold: true, color: '5EEAD4', align: 'ctr', spaceAfter: 0 }
        ]
      }),
      ...[
        { x: 0.85, n: '100%', t: 'Đồng bộ Tài liệu – Sơ đồ\nADR – Code – Số đo thật' },
        { x: 3.95, n: '6 / 6', t: 'Kịch bản Kiểm chứng\nAutomated Verification PASS' },
        { x: 7.05, n: '7 ADRs', t: 'Quyết định Kiến trúc\nTiến hóa ATAM v1 → v2' },
        { x: 10.15, n: '0%', t: 'Double-Booking &\n0 byte Rò rỉ Chéo cơ sở' }
      ].map((k) => [
        spRect({ x: k.x, y: 2.95, w: 2.35, h: 1.85, fill: C.navyMid, border: C.teal, borderPt: 1.4, radius: 0.08 }),
        spText({
          x: k.x + 0.1, y: 3.12, w: 2.15, h: 1.55, valign: 'ctr',
          lines: [
            { text: k.n, size: 28, bold: true, color: '5EEAD4', align: 'ctr', spaceAfter: 8 },
            { text: k.t, size: 10.5, color: 'E2E8F0', align: 'ctr', spaceAfter: 0, lineSpacing: 1.2 }
          ]
        })
      ]).flat(),
      spText({
        x: 1.0, y: 5.4, w: 11.333, h: 1.2,
        lines: [
          { text: 'Trần Tiến Danh  •  Lê Viết Nghĩa  •  Nguyễn Đức Bảo Hy  •  Nguyễn Quang Trường', size: 14, bold: true, color: C.white, align: 'ctr', spaceAfter: 8 },
          { text: 'SE 403 – Thiết kế Kiến trúc Phần mềm | GVHD: TS. Nguyễn Đức Mận (@ManNguyen)', size: 11.5, color: '94A3B8', align: 'ctr', spaceAfter: 0 }
        ]
      })
    ]
  });

  return slides;
}

// ==================== OPENXML PPTX PACKAGING ====================
function buildSlideXml(shapes) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${shapes.join('\n      ')}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function buildNotesXml(noteText) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="vi-VN" sz="1200"/><a:t>${esc(noteText || '')}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
}

function generatePptx() {
  const slides = createAllSlides();
  const entries = [];
  const overrides = [
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>'
  ];

  const presRels = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>'
  ];
  const sldIdLst = [];
  let mediaCount = 0;

  slides.forEach((s, idx) => {
    const n = idx + 1;
    const relIdPres = `rId${n + 2}`;
    presRels.push(`<Relationship Id="${relIdPres}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/>`);
    sldIdLst.push(`<p:sldId id="${256 + n}" r:id="${relIdPres}"/>`);

    overrides.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
    overrides.push(`<Override PartName="/ppt/notesSlides/notesSlide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`);

    entries.push({ name: `ppt/slides/slide${n}.xml`, data: buildSlideXml(s.shapes) });
    entries.push({ name: `ppt/notesSlides/notesSlide${n}.xml`, data: buildNotesXml(s.notes) });

    const slideRels = [
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>',
      `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/>`
    ];
    if (s.imageFile) {
      mediaCount += 1;
      const imgPath = path.join(DIAGRAM_DIR, s.imageFile);
      const imgBuf = fs.readFileSync(imgPath);
      const mediaName = `image${mediaCount}.png`;
      entries.push({ name: `ppt/media/${mediaName}`, data: imgBuf });
      slideRels.push(`<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/>`);
    }

    entries.push({
      name: `ppt/slides/_rels/slide${n}.xml.rels`,
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideRels.join('')}</Relationships>`
    });
    entries.push({
      name: `ppt/notesSlides/_rels/notesSlide${n}.xml.rels`,
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${n}.xml"/></Relationships>`
    });
  });

  // Boilerplate OpenXML parts
  entries.push({
    name: '[Content_Types].xml',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${overrides.join('')}</Types>`
  });
  entries.push({
    name: '_rels/.rels',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`
  });
  entries.push({
    name: 'ppt/presentation.xml',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${sldIdLst.join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`
  });
  entries.push({
    name: 'ppt/_rels/presentation.xml.rels',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels.join('')}</Relationships>`
  });
  entries.push({
    name: 'ppt/slideMasters/slideMaster1.xml',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`
  });
  entries.push({
    name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`
  });
  entries.push({
    name: 'ppt/slideLayouts/slideLayout1.xml',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld></p:sldLayout>`
  });
  entries.push({
    name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`
  });
  entries.push({
    name: 'ppt/notesMasters/notesMaster1.xml',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:notesMaster>`
  });
  entries.push({
    name: 'ppt/notesMasters/_rels/notesMaster1.xml.rels',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`
  });
  entries.push({
    name: 'ppt/theme/theme1.xml',
    data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MediLink"><a:themeElements><a:clrScheme name="MediLink"><a:dk1><a:srgbClr val="0F2942"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1E293B"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="0D9488"/></a:accent1><a:accent2><a:srgbClr val="1D4ED8"/></a:accent2><a:accent3><a:srgbClr val="B45309"/></a:accent3><a:accent4><a:srgbClr val="B91C1C"/></a:accent4><a:accent5><a:srgbClr val="6D28D9"/></a:accent5><a:accent6><a:srgbClr val="059669"/></a:accent6><a:hlink><a:srgbClr val="1D4ED8"/></a:hlink><a:folHlink><a:srgbClr val="6D28D9"/></a:folHlink></a:clrScheme><a:fontScheme name="MediLink"><a:majorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="MediLink"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`
  });

  const zipBuf = buildZipBuffer(entries);
  const outPath = path.join(ROOT, 'Slide_BaoCao_MediLink_SE403.pptx');
  fs.writeFileSync(outPath, zipBuf);
  console.log(`[Generated PowerPoint] ${outPath} (${slides.length} slides, ${mediaCount} high-DPI diagrams, ${(zipBuf.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  generatePptx();
}

module.exports = generatePptx;
