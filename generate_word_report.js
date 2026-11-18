/**
 * Zero-Dependency Microsoft Word (.docx / ECMA-376 OpenXML) Report Generator
 * Compiles the complete MediLink SE 403 Architecture Portfolio (Stage 0, M1, M2, M3, M4,
 * 7 ADRs, M5 Q&A Prep, AI Usage Log, and Contribution Sign-off) into
 * `BaoCao_GroupProject_MediLink_SE403.docx` using pure Node.js 22 (`fs`, `zlib`, `path`).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ==================== PURE NODE.JS PKZIP WRITER ====================
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compressed = zlib.deflateRawSync(rawBuf, { level: 9 });
    const crc = crc32(rawBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(8, 8); // Deflate compression
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

// ==================== OPENXML HELPERS ====================
function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripMdLinks(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' — ');
}

function renderInlineRuns(text, baseOpts = {}) {
  const cleaned = stripMdLinks(text);
  // Tokenize **bold** and `code`
  const tokens = cleaned.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens
    .map((tok) => {
      let bold = Boolean(baseOpts.bold);
      let italic = Boolean(baseOpts.italic);
      let color = baseOpts.color || '222222';
      let sizeHalfPt = baseOpts.sizeHalfPt || 22; // 11pt
      let font = baseOpts.font || 'Times New Roman';
      let content = tok;
      let shading = '';

      if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
        bold = true;
        content = tok.slice(2, -2);
      } else if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
        font = 'Consolas';
        sizeHalfPt = Math.max(18, sizeHalfPt - 2);
        color = baseOpts.color === 'FFFFFF' ? 'FFFFFF' : '1F4E79';
        if (baseOpts.color !== 'FFFFFF') {
          shading = '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>';
        }
        content = tok.slice(1, -1);
      }

      return `<w:r>
        <w:rPr>
          <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
          ${bold ? '<w:b/>' : ''}
          ${italic ? '<w:i/>' : ''}
          <w:color w:val="${color}"/>
          <w:sz w:val="${sizeHalfPt}"/>
          <w:szCs w:val="${sizeHalfPt}"/>
          ${shading}
        </w:rPr>
        <w:t xml:space="preserve">${xmlEscape(content)}</w:t>
      </w:r>`;
    })
    .join('');
}

function wParagraph(text, opts = {}) {
  const align = opts.align || 'both';
  const before = opts.before ?? 60;
  const after = opts.after ?? 100;
  const line = opts.line ?? 276; // 1.15x
  const keepNext = opts.keepNext ? '<w:keepNext/>' : '';
  const leftIndent = opts.leftIndent ? `<w:ind w:left="${opts.leftIndent}"/>` : '';
  const pStyle = opts.pStyle ? `<w:pStyle w:val="${opts.pStyle}"/>` : '';
  const bottomBorder = opts.bottomBorder
    ? `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="${opts.bottomBorder}"/></w:pBdr>`
    : '';

  return `<w:p>
    <w:pPr>
      ${pStyle}
      <w:jc w:val="${align}"/>
      <w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>
      ${leftIndent}
      ${keepNext}
      ${bottomBorder}
    </w:pPr>
    ${renderInlineRuns(text, opts)}
  </w:p>`;
}

function wPageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function wCallout(lines) {
  const innerParas = lines
    .map((line, idx) =>
      wParagraph(line, {
        sizeHalfPt: 20,
        italic: idx > 0,
        bold: idx === 0,
        color: idx === 0 ? '1F4E79' : '2D3748',
        before: 40,
        after: 60
      })
    )
    .join('');

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9360" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="none"/>
        <w:left w:val="single" w:sz="24" w:space="0" w:color="1F4E79"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="9360" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="EDF4FB"/>
          <w:tcMar>
            <w:top w:w="120" w:type="dxa"/>
            <w:bottom w:w="120" w:type="dxa"/>
            <w:left w:w="180" w:type="dxa"/>
            <w:right w:w="160" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        ${innerParas}
      </w:tc>
    </w:tr>
  </w:tbl><w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>`;
}

function wCodeBlock(codeLines, lang = '') {
  const paras = codeLines
    .map(
      (ln) => `<w:p>
        <w:pPr><w:spacing w:before="0" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>
            <w:color w:val="1E293B"/>
            <w:sz w:val="17"/>
            <w:szCs w:val="17"/>
          </w:rPr>
          <w:t xml:space="preserve">${xmlEscape(ln || ' ')}</w:t>
        </w:r>
      </w:p>`
    )
    .join('');

  const headerPara = lang
    ? `<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/><w:color w:val="475569"/><w:sz w:val="16"/></w:rPr><w:t>[${xmlEscape(lang.toUpperCase())}]</w:t></w:r></w:p>`
    : '';

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9360" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="18" w:space="0" w:color="475569"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="9360" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          <w:tcMar>
            <w:top w:w="100" w:type="dxa"/>
            <w:bottom w:w="100" w:type="dxa"/>
            <w:left w:w="140" w:type="dxa"/>
            <w:right w:w="140" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        ${headerPara}
        ${paras}
      </w:tc>
    </w:tr>
  </w:tbl><w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>`;
}

function wTable(rows) {
  if (!rows || rows.length === 0) return '';
  const colCount = rows[0].length;
  const totalWidthDxa = 9360;
  const colWidth = Math.floor(totalWidthDxa / colCount);

  const trXml = rows
    .map((cells, rIdx) => {
      const isHeader = rIdx === 0;
      const bgFill = isHeader ? '1F4E79' : rIdx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
      const tcXml = Array.from({ length: colCount }, (_, cIdx) => {
        const val = cells[cIdx] ?? '';
        return `<w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidth}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bgFill}"/>
            <w:vAlign w:val="center"/>
            <w:tcMar>
              <w:top w:w="90" w:type="dxa"/>
              <w:bottom w:w="90" w:type="dxa"/>
              <w:left w:w="110" w:type="dxa"/>
              <w:right w:w="110" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          ${wParagraph(val, {
            align: isHeader ? 'center' : 'left',
            bold: isHeader,
            color: isHeader ? 'FFFFFF' : '1E293B',
            sizeHalfPt: isHeader ? 19 : 18,
            before: 20,
            after: 20,
            line: 240
          })}
        </w:tc>`;
      }).join('');

      return `<w:tr>
        <w:trPr>
          <w:cantSplit/>
          ${isHeader ? '<w:tblHeader/>' : ''}
        </w:trPr>
        ${tcXml}
      </w:tr>`;
    })
    .join('');

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${totalWidthDxa}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:bottom w:val="single" w:sz="8" w:space="0" w:color="1F4E79"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>
    </w:tblPr>
    ${trXml}
  </w:tbl><w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>`;
}

// ==================== MARKDOWN TO WORDPROCESSINGML CONVERTER ====================
function renderMarkdownSection(mdContent, majorTitle) {
  const out = [];
  out.push(
    wParagraph(majorTitle, {
      pStyle: 'Heading1',
      bold: true,
      color: '1F4E79',
      sizeHalfPt: 32,
      before: 240,
      after: 140,
      keepNext: true,
      bottomBorder: '1F4E79',
      align: 'left'
    })
  );

  const lines = mdContent.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip top H1 of markdown file since majorTitle already rendered
    if (trimmed.startsWith('# ')) {
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      i += 1;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing ```
      out.push(wCodeBlock(codeLines, lang));
      continue;
    }

    // Markdown table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowLine = lines[i].trim();
        const cells = rowLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        // Skip separator line |:---|:---|
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) {
          tableRows.push(cells);
        }
        i += 1;
      }
      out.push(wTable(tableRows));
      continue;
    }

    // Blockquote / Self-check callout
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const qText = lines[i].trim().replace(/^>\s?/, '');
        if (qText) quoteLines.push(qText);
        i += 1;
      }
      if (quoteLines.length > 0) out.push(wCallout(quoteLines));
      continue;
    }

    // Headings H2, H3, H4
    if (trimmed.startsWith('## ')) {
      out.push(
        wParagraph(trimmed.slice(3), {
          pStyle: 'Heading2',
          bold: true,
          color: '1F4E79',
          sizeHalfPt: 26,
          before: 200,
          after: 90,
          keepNext: true,
          align: 'left'
        })
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      out.push(
        wParagraph(trimmed.slice(4), {
          pStyle: 'Heading3',
          bold: true,
          color: '2B6CB0',
          sizeHalfPt: 23,
          before: 150,
          after: 70,
          keepNext: true,
          align: 'left'
        })
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      out.push(
        wParagraph(trimmed.slice(5), {
          bold: true,
          italic: true,
          color: '334155',
          sizeHalfPt: 22,
          before: 110,
          after: 50,
          keepNext: true,
          align: 'left'
        })
      );
      i += 1;
      continue;
    }

    // Bullet or numbered list
    if (/^[-*]\s+/.test(trimmed)) {
      const bulletText = `• ${trimmed.replace(/^[-*]\s+/, '')}`;
      out.push(wParagraph(bulletText, { leftIndent: 360, before: 30, after: 55, sizeHalfPt: 21 }));
      i += 1;
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      out.push(wParagraph(trimmed, { leftIndent: 360, before: 30, after: 55, sizeHalfPt: 21 }));
      i += 1;
      continue;
    }

    if (trimmed === '') {
      i += 1;
      continue;
    }

    // Standard paragraph
    out.push(wParagraph(trimmed, { before: 40, after: 80, sizeHalfPt: 22 }));
    i += 1;
  }

  return out.join('\n');
}

function buildCoverPageXml() {
  const coverInfoRows = [
    ['Thông tin Đồ án', 'Chi tiết', 'Vai trò / Ghi chú'],
    ['Giảng viên hướng dẫn:', 'TS. Nguyễn Đức Mận', 'Giảng viên môn SE 403 (@ManNguyen)'],
    ['Sinh viên thực hiện 1:', 'Trần Tiến Danh', 'Phụ trách Prototype (Prototype Lead)'],
    ['Sinh viên thực hiện 2:', 'Lê Viết Nghĩa', 'Phụ trách Yêu cầu & Tài liệu (Req & Doc Owner)'],
    ['Sinh viên thực hiện 3:', 'Nguyễn Đức Bảo Hy', 'Kiến trúc sư trưởng (Lead Architect)'],
    ['Sinh viên thực hiện 4:', 'Nguyễn Quang Trường', 'Phụ trách QA / Kiểm thử (QA/Test Lead)'],
    ['Lớp & Học kỳ:', 'SE 403 – Nhóm Đề tài 1', 'Học kỳ 1, Năm học 2026 – 2027']
  ];

  return [
    wParagraph('BỘ GIÁO DỤC VÀ ĐÀO TẠO', { align: 'center', bold: true, color: '1F4E79', sizeHalfPt: 24, before: 0, after: 40 }),
    wParagraph('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG', { align: 'center', bold: true, color: '1F4E79', sizeHalfPt: 24, before: 0, after: 40 }),
    wParagraph('KHOA KỸ THUẬT PHẦN MỀM', { align: 'center', bold: true, color: '2B6CB0', sizeHalfPt: 24, before: 0, after: 120 }),
    wParagraph('-------------------- *** --------------------', { align: 'center', bold: true, color: '64748B', sizeHalfPt: 22, before: 0, after: 420 }),
    wParagraph('BÁO CÁO TỔNG HỢP ĐỒ ÁN MÔN HỌC (SAD & VERIFICATION)', { align: 'center', bold: true, color: '475569', sizeHalfPt: 26, before: 120, after: 100 }),
    wParagraph('THIẾT KẾ KIẾN TRÚC PHẦN MỀM (SE 403)', { align: 'center', bold: true, color: '1F4E79', sizeHalfPt: 38, before: 40, after: 200 }),
    wParagraph('ĐỀ TÀI 1: MEDILINK – NỀN TẢNG ĐẶT LỊCH KHÁM VÀ HỒ SƠ SỨC KHỎE ĐIỆN TỬ CHO CHUỖI 12 PHÒNG KHÁM', {
      align: 'center',
      bold: true,
      color: 'B91C1C',
      sizeHalfPt: 28,
      before: 60,
      after: 420
    }),
    wTable(coverInfoRows),
    wParagraph('ĐÀ NẴNG, THÁNG 11 NĂM 2026', { align: 'center', bold: true, color: '1F4E79', sizeHalfPt: 24, before: 720, after: 0 }),
    wPageBreak()
  ].join('\n');
}

function generateWordReport() {
  const rootDir = __dirname;

  const sections = [
    {
      title: 'PHẦN 1: GIAI ĐOẠN 0 – KHỞI ĐỘNG DỰ ÁN, PHÂN VAI & GIẢ ĐỊNH KIẾN TRÚC',
      file: path.join(rootDir, 'docs', 'stage-0.md')
    },
    {
      title: 'PHẦN 2: MỐC M1 – ARCHITECTURAL DRIVERS, NGHỊ ĐỊNH 13/2023 & UTILITY TREE',
      file: path.join(rootDir, 'docs', 'm1-architectural-drivers.md')
    },
    {
      title: 'PHẦN 3: MỐC M2 – THIẾT KẾ KIẾN TRÚC, TACTICS, C4 VIEWS & ADRs',
      file: path.join(rootDir, 'docs', 'm2-architecture-design.md')
    },
    {
      title: 'PHẦN 4: TOÀN VĂN 7 BẢN GHI QUYẾT ĐỊNH KIẾN TRÚC (ADR-001 ĐẾN ADR-007)',
      files: [
        path.join(rootDir, 'adr', '0001-architectural-style.md'),
        path.join(rootDir, 'adr', '0002-his-integration-acl-canonical-model.md'),
        path.join(rootDir, 'adr', '0003-concurrency-distributed-locking-idempotency.md'),
        path.join(rootDir, 'adr', '0004-security-rbac-facility-scope-immutable-audit.md'),
        path.join(rootDir, 'adr', '0005-asynchronous-notification-queue.md'),
        path.join(rootDir, 'adr', '0006-lab-result-object-storage-presigned-url.md'),
        path.join(rootDir, 'adr', '0007-v2-outbox-rate-controlled-recovery.md')
      ]
    },
    {
      title: 'PHẦN 5: MỐC M3 – ĐÁNH GIÁ KIẾN TRÚC ATAM RÚT GỌN & ARCHITECTURE DESIGN V2',
      file: path.join(rootDir, 'docs', 'm3-architecture-evaluation.md')
    },
    {
      title: 'PHẦN 6: MỐC M4 – HIỆN THỰC PROTOTYPE & BÁO CÁO SỐ LIỆU ĐO THỰC NGHIỆM',
      file: path.join(rootDir, 'docs', 'm4-prototype-verification.md')
    },
    {
      title: 'PHẦN 7: MỐC M5 – TỔNG KẾT SAD, BÀI HỌC KINH NGHIỆM & CẨM NANG VẤN ĐÁP 6 CẤP ĐỘ',
      files: [
        path.join(rootDir, 'docs', 'SAD.md'),
        path.join(rootDir, 'docs', 'qa-interview-prep.md')
      ]
    },
    {
      title: 'PHẦN 8: NHẬT KÝ SỬ DỤNG AI (AI USAGE LOG 6 CỘT) & ĐÁNH GIÁ ĐÓNG GÓP',
      file: path.join(rootDir, 'ai-log.md')
    }
  ];

  const bodyParts = [buildCoverPageXml()];

  sections.forEach((sec, idx) => {
    let combinedMd = '';
    if (sec.files) {
      combinedMd = sec.files
        .map((f) => {
          const raw = fs.readFileSync(f, 'utf8');
          const firstLine = raw.split('\n')[0].replace(/^#\s+/, '').trim();
          return `## ${firstLine}\n\n${raw}`;
        })
        .join('\n\n---\n\n');
    } else {
      combinedMd = fs.readFileSync(sec.file, 'utf8');
    }

    bodyParts.push(renderMarkdownSection(combinedMd, sec.title));
    if (idx < sections.length - 1) {
      bodyParts.push(wPageBreak());
    }
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1260" w:right="1260" w:bottom="1260" w:left="1260" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="2"/></w:pPr>
  </w:style>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const zipBuf = buildZipBuffer([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: docRelsXml }
  ]);

  const outPath = path.join(rootDir, 'BaoCao_GroupProject_MediLink_SE403.docx');
  fs.writeFileSync(outPath, zipBuf);
  console.log(`[Generated Word Report] ${outPath} (${(zipBuf.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  generateWordReport();
}

module.exports = generateWordReport;
