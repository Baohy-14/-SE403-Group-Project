# -*- coding: utf-8 -*-
"""
Script to generate the comprehensive Word (.docx) report for CMUSE 403 Group Project
Topic 1: MediLink Platform
Authors: Nguyen Duc Bao Hy, Le Viet Nghia, Tran Tien Danh, Nguyen Quang Truong
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def style_table(table, col_widths=None):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(table.rows):
        # Prevent row split across pages
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        # Header repeat
        if i == 0:
            trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
            for cell in row.cells:
                set_cell_background(cell, "1F4E79")
                set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
                for p in cell.paragraphs:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for run in p.runs:
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(255, 255, 255)
                        run.font.size = Pt(10)
        else:
            bg_color = "F2F4F7" if i % 2 == 1 else "FFFFFF"
            for cell in row.cells:
                set_cell_background(cell, bg_color)
                set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                for p in cell.paragraphs:
                    for run in p.runs:
                        run.font.size = Pt(9.5)

    if col_widths:
        for row in table.rows:
            for j, w in enumerate(col_widths):
                if j < len(row.cells):
                    row.cells[j].width = Inches(w)

def add_heading_styled(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    run = h.runs[0] if h.runs else h.add_run(text)
    if level == 1:
        run.font.size = Pt(18)
        run.font.bold = True
        run.font.color.rgb = RGBColor(31, 78, 121) # Dark Blue
        h.paragraph_format.space_before = Pt(16)
        h.paragraph_format.space_after = Pt(8)
    elif level == 2:
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(46, 117, 182) # Medium Blue
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(6)
    elif level == 3:
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(68, 84, 106)
        h.paragraph_format.space_before = Pt(8)
        h.paragraph_format.space_after = Pt(4)
    return h

def add_callout(doc, text, title="GHI CHÚ / TỰ KIỂM TRA:"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "EDF4FB")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    # Left border thick blue
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="1F4E79"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    r_title = p.add_run(f"{title}\n")
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(31, 78, 121)
    r_title.font.size = Pt(10)
    
    r_text = p.add_run(text)
    r_text.font.size = Pt(9.5)
    r_text.font.italic = True
    r_text.font.color.rgb = RGBColor(51, 51, 51)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def build_full_document(output_path):
    doc = docx.Document()
    
    # Page setup (A4, 1 inch margins)
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Base style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(11)
    font.color.rgb = RGBColor(34, 34, 34)
    style.paragraph_format.line_spacing = 1.2
    style.paragraph_format.space_after = Pt(5)

    # ----------------------------------------------------
    # COVER PAGE
    # ----------------------------------------------------
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_inst.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\nTRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG\nKHOA KỸ THUẬT PHẦN MỀM\n")
    r.font.size = Pt(12)
    r.bold = True
    r.font.color.rgb = RGBColor(31, 78, 121)

    p_star = doc.add_paragraph()
    p_star.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_star.add_run("-------------------- *** --------------------\n\n\n")

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_title.add_run("BÁO CÁO ĐỒ ÁN MÔN HỌC\n")
    r_sub.font.size = Pt(14)
    r_sub.bold = True
    r_sub.font.color.rgb = RGBColor(89, 89, 89)

    r_main = p_title.add_run("THIẾT KẾ KIẾN TRÚC PHẦN MỀM (SE 403)\n\n")
    r_main.font.size = Pt(20)
    r_main.bold = True
    r_main.font.color.rgb = RGBColor(31, 78, 121)

    r_topic = p_title.add_run("ĐỀ TÀI 1: MEDILINK – NỀN TẢNG ĐẶT LỊCH KHÁM\nVÀ HỒ SƠ SỨC KHỎE ĐIỆN TỬ CHO CHUỖI 12 PHÒNG KHÁM\n\n\n")
    r_topic.font.size = Pt(15)
    r_topic.bold = True
    r_topic.font.color.rgb = RGBColor(192, 0, 0)

    # Info table
    tbl_info = doc.add_table(rows=6, cols=3)
    tbl_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_data = [
        ("Giảng viên hướng dẫn:", "ThS. Nguyễn Văn Mẫn", "Giảng viên môn SE 403"),
        ("Sinh viên thực hiện 1:", "Nguyễn Đức Bảo Hy", "Kiến trúc sư trưởng (Lead Architect)"),
        ("Sinh viên thực hiện 2:", "Lê Viết Nghĩa", "Phụ trách Yêu cầu & Tài liệu (Req & Doc Owner)"),
        ("Sinh viên thực hiện 3:", "Trần Tiến Danh", "Phụ trách Prototype (Prototype Lead)"),
        ("Sinh viên thực hiện 4:", "Nguyễn Quang Trường", "Phụ trách QA / Kiểm thử (QA/Test Lead)"),
        ("Lớp & Học kỳ:", "SE 403 - Nhóm Đề tài 1", "Học kỳ 1, Năm học 2026 - 2027")
    ]
    for idx, (c1, c2, c3) in enumerate(info_data):
        row = tbl_info.rows[idx]
        row.cells[0].paragraphs[0].add_run(c1).bold = True
        row.cells[1].paragraphs[0].add_run(c2).bold = True
        row.cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(31, 78, 121)
        row.cells[2].paragraphs[0].add_run(c3).italic = True
        for c in row.cells:
            set_cell_background(c, "F9FBFD")
            set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    for row in tbl_info.rows:
        row.cells[0].width = Inches(2.2)
        row.cells[1].width = Inches(2.3)
        row.cells[2].width = Inches(2.5)

    p_loc = doc.add_paragraph()
    p_loc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_loc.paragraph_format.space_before = Pt(80)
    r_loc = p_loc.add_run("ĐÀ NẴNG, THÁNG 11 NĂM 2026")
    r_loc.font.size = Pt(11)
    r_loc.bold = True

    doc.add_page_break()

    # ----------------------------------------------------
    # MỤC LỤC & TỔNG QUAN
    # ----------------------------------------------------
    add_heading_styled(doc, "MỤC LỤC TỔNG THỂ BÁO CÁO ĐỒ ÁN", 1)
    
    toc_items = [
        "PHẦN 1: GIAI ĐOẠN 0 – KHỞI ĐỘNG DỰ ÁN VÀ PHÂN VAI THÀNH VIÊN",
        "PHẦN 2: MỐC M1 – XÁC ĐỊNH ARCHITECTURAL DRIVERS & QUALITY ATTRIBUTE SCENARIOS",
        "PHẦN 3: MỐC M2 – THIẾT KẾ KIẾN TRÚC V1, VIEWS (C4) VÀ 5 ADR QUYẾT ĐỊNH",
        "PHẦN 4: MỐC M3 – ĐÁNH GIÁ KIẾN TRÚC ATAM RÚT GỌN VÀ THIẾT KẾ V2",
        "PHẦN 5: MỐC M4 – HIỆN THỰC PROTOTYPE VÀ KIỂM CHỨNG THỰC NGHIỆM ĐO LƯỜNG",
        "PHẦN 6: MỐC M5 – HOÀN THIỆN SAD, SLIDES THUYẾT TRÌNH VÀ BỘ CÂU HỎI VẤN ĐÁP",
        "PHẦN 7: NHẬT KÝ SỬ DỤNG CÔNG CỤ TRỢ LÝ AI (AI USAGE LOG ĐẦY ĐỦ 6 CỘT)",
        "PHẦN 8: ĐÁNH GIÁ ĐÓNG GÓP THÀNH VIÊN VÀ CAM KẾT HỌC THUẬT"
    ]
    for item in toc_items:
        p = doc.add_paragraph()
        r = p.add_run(f"• {item}")
        r.bold = True
        r.font.size = Pt(10.5)
        p.paragraph_format.space_after = Pt(4)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ----------------------------------------------------
    # PHẦN 1: GIAI ĐOẠN 0
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 1: GIAI ĐOẠN 0 – KHỞI ĐỘNG DỰ ÁN", 1)
    
    add_heading_styled(doc, "1.1. Phân vai và Trách nhiệm 4 Thành viên", 2)
    tbl_roles = doc.add_table(rows=5, cols=4)
    tbl_roles_data = [
        ("STT", "Họ và Tên", "Vai trò Đảm nhiệm", "Trách nhiệm Cốt lõi"),
        ("1", "Nguyễn Đức Bảo Hy", "Kiến trúc sư trưởng\n(Lead Architect)", "Chủ trì phân tích ASR, lựa chọn architectural tactics, thiết kế C4 Views (Context, Container, Component, Deployment), chủ trì ATAM và phê duyệt ADR."),
        ("2", "Lê Viết Nghĩa", "Phụ trách Yêu cầu & Tài liệu\n(Req & Doc Owner)", "Khảo sát bài toán chuỗi 12 phòng khám, phân loại dữ liệu theo Nghị định 13/2023/NĐ-CP, quản lý SAD, slide và AI Log."),
        ("3", "Trần Tiến Danh", "Phụ trách Prototype\n(Prototype Lead)", "Hiện thực khung kiến trúc (Skeleton), lớp tích hợp Anti-Corruption Layer (ACL), Adapters cho 3 Mock HIS, Distributed Lock (Redis) và Docker compose."),
        ("4", "Nguyễn Quang Trường", "Phụ trách QA / Kiểm thử\n(QA/Test Lead)", "Xây dựng kịch bản kiểm thử Quality Attributes, viết test scripts giả lập 50 requests tải đồng thời, fault injection ngắt HIS Huế, security ABAC test.")
    ]
    for r_idx, row in enumerate(tbl_roles_data):
        for c_idx, val in enumerate(row):
            tbl_roles.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_roles, [0.6, 1.8, 2.0, 2.8])

    add_heading_styled(doc, "1.2. Hiểu bài toán độc lập của từng thành viên (5 câu tóm tắt)", 2)
    members_understand = [
        ("Nguyễn Đức Bảo Hy (Lead Architect):", [
            "Bài toán cốt lõi của MediLink là bài toán tích hợp hệ thống phân tán không đồng nhất giữa 12 phòng khám sử dụng ít nhất 3 loại HIS khác biệt.",
            "Thách thức kiến trúc lớn nhất là đảm bảo tính nhất quán (Consistency) chống đặt trùng lịch (double-booking) khi 50 người cùng tranh chấp 1 slot trong môi trường mạng phân tán.",
            "Tính sẵn sàng (Availability) phải đạt tối thiểu 99.5%; sự cố sập hoặc mất kết nối tại 1 phòng khám đơn lẻ (ví dụ HIS Huế) không được phép gây tê liệt toàn hệ thống.",
            "Lớp tích hợp phải thiết kế theo mẫu Anti-Corruption Layer (ACL) và Canonical Data Model (chuẩn HL7 FHIR) để việc kết nối thêm HIS mới không làm biến dạng nghiệp vụ lõi.",
            "Dữ liệu bệnh án thuộc danh mục dữ liệu cá nhân nhạy cảm, đòi hỏi ranh giới tin cậy (Trust Boundary), áp dụng RBAC kết hợp Contextual ABAC (theo cơ sở), mã hóa lưu trữ và ghi nhận Audit Log bất biến (Append-only)."
        ]),
        ("Lê Viết Nghĩa (Requirements & Documentation Owner):", [
            "Dự án phục vụ mạng lưới đa dạng các bên liên quan với các mục tiêu và kỳ vọng bảo mật xung đột nhau.",
            "Nền tảng phải đáp ứng đầy đủ chu trình: Đặt/đổi/hủy lịch khám, nhắc hẹn đa kênh (SMS, Zalo, Email), quản lý hồ sơ sức khỏe điện tử (EHR) và thanh toán đặt cọc.",
            "Ràng buộc pháp lý nghiêm ngặt theo Nghị định 13/2023/NĐ-CP yêu cầu mọi thao tác đọc/ghi bệnh án phải có cơ chế đồng thuận và lưu vết kiểm toán 100%.",
            "Lễ tân tại một cơ sở (ví dụ Đà Nẵng) tuyệt đối không được phép xem trộm hoặc truy xuất trái phép dữ liệu hồ sơ bệnh nhân tại cơ sở khác (Huế hay Quảng Nam).",
            "Hồ sơ kiến trúc (SAD) và các quyết định (ADR) phải được tài liệu hóa rõ ràng, truy vết trực tiếp từ bài toán kinh doanh đến kịch bản ASR."
        ]),
        ("Trần Tiến Danh (Prototype Lead):", [
            "Mục tiêu Prototype là chứng minh tính khả thi của các quyết định kiến trúc then chốt chứ không sa đà vào giao diện hào nhoáng hay số lượng CRUD.",
            "Cần xây dựng ít nhất 2 Mock HIS đại diện: một HIS sử dụng REST/JSON (Đà Nẵng) và một HIS cũ sử dụng SOAP/XML (Huế) để kiểm chứng khả năng tích hợp qua Adapter.",
            "Hiện thực cơ chế khóa phân tán (Distributed Lock với Redis) kết hợp Idempotency Key và RDBMS Unique Constraint để chặn triệt để race condition khi 50 request cùng ập vào 1 slot.",
            "Triển khai mẫu Circuit Breaker và Graceful Degradation: khi ngắt kết nối đến Mock HIS Huế, hệ thống vẫn phản hồi trạng thái hợp lệ, thông báo rõ ràng cho người dùng.",
            "Đóng gói toàn bộ skeleton và kịch bản chạy thử nghiệm thành một tập lệnh duy nhất, giúp kiểm chứng độc lập trên môi trường chuẩn hóa."
        ]),
        ("Nguyễn Quang Trường (QA/Test Lead):", [
            "Các thuộc tính chất lượng phải được định lượng hóa thành kịch bản chuẩn 6 phần có thể đo đạc thực tế trong phòng thí nghiệm.",
            "Kịch bản Concurrency Test cần chứng minh chính xác: 50 requests đồng thời gửi yêu cầu đặt cùng 1 khung giờ của 1 bác sĩ, chỉ duy nhất 1 booking thành công (HTTP 201), 49 requests nhận HTTP 409 Conflict.",
            "Kịch bản Fault Injection: ngắt Mock HIS Huế trong 2 giờ, xác nhận 100% các yêu cầu tại cơ sở Đà Nẵng và Quảng Nam vẫn hoạt động bình thường.",
            "Kịch bản Security: lễ tân cơ sở Đà Nẵng truy vấn endpoint bệnh án của cơ sở Huế, hệ thống chặn đứng với mã HTTP 403 Forbidden và tạo 1 bản ghi Audit Log có mã băm HMAC.",
            "Mọi số liệu đo lường (độ trễ p95, throughput, audit record) phải được xuất ra từ log thực nghiệm khách quan, không dùng số liệu do AI phỏng đoán."
        ])
    ]
    for mem_title, pts in members_understand:
        p_m = doc.add_paragraph()
        p_m.add_run(mem_title).bold = True
        for pt in pts:
            p_pt = doc.add_paragraph(style='List Bullet')
            p_pt.add_run(pt)

    add_heading_styled(doc, "1.3. Các Giả định Ban đầu (Assumptions A1–A5)", 2)
    tbl_assump = doc.add_table(rows=6, cols=4)
    tbl_assump_data = [
        ("Mã", "Giả định Ban đầu", "Lý do Đề xuất", "Xác minh tại Mốc"),
        ("A1", "Hệ thống HIS hiện hữu có thể cung cấp API (REST hoặc SOAP) hoặc có thể dựng cổng Adapter trung gian.", "MediLink không can thiệp sâu vào mã nguồn đóng của các đơn vị HIS bên thứ ba.", "M1 & M2 (ADR-002)"),
        ("A2", "Tỷ lệ bệnh nhân đặt lịch qua kênh online MediLink chiếm 60–70%, 30% còn lại đến từ quầy lễ tân.", "Là cơ sở để tính toán tải giờ cao điểm và tần suất đồng bộ trạng thái giữa MediLink và HIS.", "M1 (Drivers)"),
        ("A3", "Mỗi bác sĩ tại một thời điểm chỉ khám tối đa 1 bệnh nhân trong khung thời gian chuẩn (15–30 phút).", "Ràng buộc nghiệp vụ nền tảng để thiết kế cơ chế khóa và ràng buộc duy nhất UNIQUE(doctor_id, slot).", "M1 & M2 (ADR-003)"),
        ("A4", "Độ trễ mạng giữa MediLink Core và HIS Adapters < 150ms.", "Đảm bảo thời gian giữ Distributed Lock trong Redis đủ ngắn (TTL = 3 giây) để không làm nghẽn.", "M2 & M4 (Prototype)"),
        ("A5", "Hồ sơ xét nghiệm (hình ảnh, kết quả PDF) có dung lượng từ 1MB – 20MB, lưu trên Object Storage riêng.", "Giảm tải cho cơ sở dữ liệu quan hệ, tách biệt metadata và tệp tin nhị phân lớn.", "M2 (ADR-004)")
    ]
    for r_idx, row in enumerate(tbl_assump_data):
        for c_idx, val in enumerate(row):
            tbl_assump.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_assump, [0.6, 2.8, 2.6, 1.2])

    add_callout(doc, 
        "Điều gì làm bài toán MediLink khó về mặt kiến trúc, khác với một ứng dụng CRUD thông thường?\n"
        "1. Heterogeneity: 12 cơ sở dùng 3 loại HIS dị thể (REST/JSON, SOAP/XML, Custom DB) mà không được sửa code HIS.\n"
        "2. Strict Distributed Concurrency: 50 người cùng đặt 1 slot, phải đảm bảo zero double-booking qua Redis Lock + DB Unique Constraint + Idempotency.\n"
        "3. Fault Isolation: Khi 1 HIS cơ sở (Huế) sập, 11 cơ sở còn lại vẫn phải hoạt động bình thường (Circuit Breaker).\n"
        "4. Healthcare Security: Dữ liệu y tế nhạy cảm phải tuân thủ Nghị định 13/2023/NĐ-CP (Contextual ABAC + HMAC Append-only Audit Log).",
        "CÂU HỎI TỰ KIỂM TRA GIAI ĐOẠN 0:"
    )

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 2: MỐC M1 – ARCHITECTURAL DRIVERS
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 2: MỐC M1 – ARCHITECTURAL DRIVERS", 1)
    
    add_heading_styled(doc, "2.1. Mục tiêu Kinh doanh Đo lường được (Business Goals)", 2)
    tbl_bg = doc.add_table(rows=6, cols=4)
    tbl_bg_data = [
        ("Mã", "Mục tiêu Kinh doanh", "Chỉ số Đo lường (KPIs)", "Thời hạn"),
        ("BG-01", "Chuyển đổi số toàn diện kênh đặt lịch hẹn khám bệnh", "Tối thiểu 60% tổng lượt khám toàn chuỗi đặt qua MediLink; xác nhận hẹn < 10 giây.", "6 tháng sau golive"),
        ("BG-02", "Loại bỏ hoàn toàn sự cố đặt trùng lịch (Zero double-booking)", "Tỷ lệ trùng lịch giảm về 0.00%, kể cả trong khung giờ cao điểm cạnh tranh cao.", "Ngay khi golive"),
        ("BG-03", "Liên thông hồ sơ sức khỏe điện tử (EHR) toàn chuỗi", "100% hồ sơ khám số hóa theo mã bệnh nhân duy nhất (MPI); tải bệnh án < 2 giây.", "3 tháng sau golive"),
        ("BG-04", "Bảo tồn đầu tư công nghệ hiện có & khả năng mở rộng", "Tích hợp thêm 1 phòng khám dùng HIS mới trong ≤ 2 tuần công (≤ 10 ngày làm việc).", "Vòng đời hệ thống"),
        ("BG-05", "Đảm bảo tính sẵn sàng và vận hành liên tục (Availability)", "Uptime đạt tối thiểu 99.5% giờ làm việc; sập 1 cơ sở không ảnh hưởng 11 cơ sở khác.", "Vòng đời hệ thống")
    ]
    for r_idx, row in enumerate(tbl_bg_data):
        for c_idx, val in enumerate(row):
            tbl_bg.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_bg, [0.8, 2.4, 2.8, 1.2])

    add_heading_styled(doc, "2.2. Phân loại Dữ liệu Y tế & Ràng buộc Pháp lý (Nghị định 13/2023/NĐ-CP)", 2)
    tbl_data_class = doc.add_table(rows=4, cols=4)
    tbl_data_class_data = [
        ("Cấp độ", "Loại Dữ liệu", "Ví dụ Cụ thể trong MediLink", "Yêu cầu Kiểm soát Kiến trúc"),
        ("Cấp 1", "Dữ liệu Công khai (Public)", "Danh sách cơ sở, bảng giá niêm yết, chuyên khoa, bác sĩ, slot khám mở.", "Cho phép cache công khai trên CDN/Reverse Proxy; không cần xác thực để đọc."),
        ("Cấp 2", "Dữ liệu Cá nhân Cơ bản", "Họ tên bệnh nhân, số điện thoại, ngày sinh, giới tính, địa chỉ.", "Mã hóa khi truyền tải (TLS 1.3); chỉ hiển thị cho nhân sự có quyền; mã hóa cột lưu trữ."),
        ("Cấp 3", "Dữ liệu Cá nhân Nhạy cảm\n(Sức khỏe & Y tế)", "Tiền sử bệnh lý, nhóm máu, kết quả xét nghiệm, hình ảnh CT/X-quang, chẩn đoán ICD-10.", "Tuân thủ Điều 2 & 17 NĐ 13/2023: Phải có đồng thuận; mã hóa ứng dụng AES-256; ghi log kiểm toán 100%; cách ly ABAC theo cơ sở.")
    ]
    for r_idx, row in enumerate(tbl_data_class_data):
        for c_idx, val in enumerate(row):
            tbl_data_class.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_data_class, [0.8, 1.8, 2.2, 2.4])

    p_c = doc.add_paragraph()
    p_c.add_run("Rút ra 3 Ràng buộc Kỹ thuật Bắt buộc:\n").bold = True
    p_c.add_run("• C-01 (Mã hóa đa tầng): Bắt buộc TLS 1.3 in-transit và mã hóa lưu trữ AES-256-GCM với khóa tách rời cơ sở dữ liệu.\n"
              "• C-02 (Contextual ABAC): Lễ tân chỉ được xem hồ sơ bệnh nhân có appointment.facility_id == user.facility_id. Tuyệt đối cấm xem chéo dữ liệu cơ sở khác.\n"
              "• C-03 (Append-Only Audit Log HMAC): 100% thao tác đọc/ghi dữ liệu nhạy cảm được ghi log có băm chuỗi HMAC-SHA256 liên hoàn chống DBA sửa/xóa.")

    add_callout(doc,
        "Constraint khác Requirement ở điểm nào? Cho ví dụ trong đề tài MediLink.\n"
        "- Requirement: Là điều hệ thống PHẢI LÀM ĐƯỢC để thỏa mãn nghiệp vụ (Ví dụ: 'Bệnh nhân có thể đổi lịch khám trước 24h', 'Độ trễ p95 < 800ms'). Nhóm được tự do chọn công nghệ.\n"
        "- Constraint: Là giới hạn bắt buộc từ bên ngoài (công nghệ di sản, ngân sách, pháp luật) mà nhóm KHÔNG ĐƯỢC PHÉP THAY ĐỔI.\n"
        "- Ví dụ: 'Phần mềm HIS tại Huế là hệ thống di sản chỉ giao tiếp qua SOAP/XML cố định, không được phép sửa mã nguồn HIS'. Đây là Constraint buộc nhóm phải viết Adapter riêng.",
        "CÂU HỎI TỰ KIỂM TRA BƯỚC 4:"
    )

    add_heading_styled(doc, "2.3. Bảng 6 Kịch bản Thuộc tính Chất lượng (Quality Attribute Scenarios)", 2)
    scenarios_data = [
        ("ASR-01: Chống Đặt trùng lịch (Consistency & Concurrency)",
         "Source: 50 bệnh nhân đồng thời.\n"
         "Stimulus: Cùng bấm đặt lịch vào 1 slot duy nhất (Bác sĩ 101, 08:00 sáng tại Đà Nẵng).\n"
         "Artifact: Booking Service & Redis Lock Engine.\n"
         "Environment: Giờ cao điểm mở cổng đăng ký.\n"
         "Response: Kích hoạt Distributed Lock; chỉ 1 request thành công; 49 request bị từ chối fast-fail.\n"
         "Response Measure: Đúng 1 booking thành công (double-booking = 0.00%); 49 request nhận 409 Conflict với p95 < 800ms."),
        
        ("ASR-02: Cách ly Sự cố khi HIS Huế sập (Availability & Fault Tolerance)",
         "Source: Sự cố hạ tầng tại phòng khám chi nhánh (mất mạng / sập máy chủ cục bộ).\n"
         "Stimulus: HIS cơ sở Huế ngừng hoạt động liên tục 2 giờ vào giờ hành chính.\n"
         "Artifact: Anti-Corruption Layer, Hue HIS Adapter, Circuit Breaker.\n"
         "Environment: Giờ cao điểm khám bệnh (9h - 11h sáng).\n"
         "Response: Circuit Breaker cơ sở Huế chuyển trạng thái OPEN; kích hoạt Fallback; các cơ sở Đà Nẵng và Quảng Nam vẫn đặt bình thường.\n"
         "Response Measure: Uptime 11 cơ sở còn lại đạt 100% (zero cascading failure); phản hồi fast-fail < 50ms; toàn hệ thống đạt Availability >= 99.5%."),
        
        ("ASR-03: Ngăn chặn Lễ tân Xem Chéo Hồ sơ Cơ sở khác (Security & Privacy)",
         "Source: Nhân viên lễ tân cơ sở Đà Nẵng (nội bộ có token hợp lệ).\n"
         "Stimulus: Gửi request API cố ý xem kết quả xét nghiệm của bệnh nhân tại cơ sở Huế.\n"
         "Artifact: API Gateway, Auth Middleware, Contextual ABAC Policy Engine.\n"
         "Environment: Vận hành bình thường.\n"
         "Response: Trích xuất claims, đối chiếu user.facility_id != record.facility_id; từ chối truy cập và ghi nhận sự kiện vi phạm an ninh.\n"
         "Response Measure: HTTP 403 Forbidden; rò rỉ dữ liệu = 0.00%; ghi 1 bản ghi Audit Log có mã băm HMAC trong < 10ms."),
        
        ("ASR-04: Tích hợp Hệ thống HIS thứ 4 (Interoperability & Modifiability)",
         "Source: Đội ngũ phát triển phần mềm (IT Team).\n"
         "Stimulus: Chuỗi mở rộng cơ sở mới tại Hội An dùng phần mềm HIS thứ 4 (chuẩn HL7 FHIR).\n"
         "Artifact: Anti-Corruption Layer & Canonical Data Model.\n"
         "Environment: Môi trường Staging / Production.\n"
         "Response: Hiện thực Adapter mới tuân thủ IHisIntegrationAdapter, ánh xạ sang HL7 FHIR Canonical Model; không sửa mã nguồn Core.\n"
         "Response Measure: Thời gian công tích hợp <= 2 tuần công (<= 10 ngày làm việc); số lượng tệp tin trong Core Domain phải sửa đổi = 0 files."),
        
        ("ASR-05: Toàn vẹn Nhật ký Kiểm toán (Audit Tamper-Evident Integrity)",
         "Source: Kẻ tấn công nội bộ hoặc Quản trị viên cơ sở dữ liệu (DBA) có quyền root.\n"
         "Stimulus: Chạy lệnh SQL UPDATE hoặc DELETE để sửa lén nội dung hoặc xóa vết truy cập trong bảng audit_logs.\n"
         "Artifact: Audit Logging Service & Cryptographic HMAC Hash Chain Verifier.\n"
         "Environment: Máy chủ cơ sở dữ liệu nội bộ.\n"
         "Response: Bảng audit thiết lập Append-only; mỗi block chứa prev_hash và current_hash được tính bằng HMAC-SHA256. Tiến trình nền định kỳ phát hiện đứt gãy chuỗi.\n"
         "Response Measure: Phát hiện 100% hành vi sửa/xóa; chỉ ra chính xác bản ghi bị can thiệp trong < 2ms; không cung cấp API Update/Delete."),
        
        ("ASR-06: Hiệu năng Tra cứu Lịch Giờ Cao điểm (Performance & Latency)",
         "Source: 1.000 bệnh nhân và bác sĩ truy cập đồng thời.\n"
         "Stimulus: Gửi các truy vấn tìm kiếm lịch làm việc của bác sĩ và tải tóm tắt hồ sơ sức khỏe.\n"
         "Artifact: MediLink API Core & In-memory Cache.\n"
         "Environment: Giờ cao điểm đầu ngày (07:30 - 08:30 sáng).\n"
         "Response: Phục vụ qua bộ đệm phân tầng (Read-through Cache), tối ưu chỉ mục index.\n"
         "Response Measure: Tìm kiếm lịch khám p95 < 500ms; tải bệnh án tóm tắt < 1.5 giây; tỷ lệ lỗi HTTP 5xx < 0.1%.")
    ]
    for sc_title, sc_desc in scenarios_data:
        add_heading_styled(doc, sc_title, 3)
        p_sc = doc.add_paragraph()
        p_sc.add_run(sc_desc)

    add_heading_styled(doc, "2.4. Cây Tiện ích (Utility Tree) & Lựa chọn ASR", 2)
    tbl_ut = doc.add_table(rows=7, cols=5)
    tbl_ut_data = [
        ("Mã Kịch bản", "Thuộc tính Chất lượng", "Tầm quan trọng Nghiệp vụ", "Rủi ro Kỹ thuật", "Phân loại ASR"),
        ("ASR-01", "Consistency & Concurrency (Chống double-booking)", "High (H)", "High (H)", "(H, H) - ASR CỐT LÕI"),
        ("ASR-02", "Availability & Fault Tolerance (Cách ly HIS Huế sập)", "High (H)", "High (H)", "(H, H) - ASR CỐT LÕI"),
        ("ASR-03", "Security & Privacy (Lễ tân xem chéo hồ sơ bị chặn)", "High (H)", "High (H)", "(H, H) - ASR CỐT LÕI"),
        ("ASR-04", "Interoperability & Modifiability (Tích hợp HIS thứ 4)", "High (H)", "High (H)", "(H, H) - ASR CỐT LÕI"),
        ("ASR-05", "Auditability & Integrity (Nhật ký bất biến HMAC)", "High (H)", "Medium (M)", "(H, M) - Bổ sung"),
        ("ASR-06", "Performance & Latency (Tìm kiếm p95 < 500ms)", "High (H)", "Medium (M)", "(H, M) - Bổ sung")
    ]
    for r_idx, row in enumerate(tbl_ut_data):
        for c_idx, val in enumerate(row):
            tbl_ut.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_ut, [0.8, 2.6, 1.3, 1.2, 1.3])

    add_callout(doc,
        "Vì sao Scenario ASR-01 và ASR-02 được xếp hạng (H, H) trong khi ASR-06 chỉ là (H, M)?\n"
        "- ASR-01 (Consistency) & ASR-02 (Availability): Đặt trùng lịch là lỗi chết người trong ngành y tế, phá hủy uy tín chuỗi phòng khám. Sập 1 cơ sở làm sập 11 cơ sở còn lại sẽ gây thiệt hại hàng trăm triệu mỗi giờ. Về mặt kỹ thuật, xử lý Distributed Concurrency và Circuit Breaker trong môi trường mạng phân tán là bài toán có rủi ro kỹ thuật rất cao (High Risk).\n"
        "- ASR-06 (Performance giờ cao điểm): Rất quan trọng với người dùng (High Importance), nhưng rủi ro kỹ thuật chỉ ở mức Medium (M) vì bài toán tối ưu đọc đã có giải pháp chuẩn hóa trong ngành (Redis In-memory Caching, DB Indexing, Connection Pooling) không đòi hỏi thiết kế phân tán phức tạp.",
        "CÂU HỎI TỰ KIỂM TRA BƯỚC 6:"
    )

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 3: MỐC M2 – THIẾT KẾ KIẾN TRÚC V1
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 3: MỐC M2 – THIẾT KẾ KIẾN TRÚC V1", 1)
    
    add_heading_styled(doc, "3.1. Các Tactics Kiến trúc đã chọn (Bass et al.)", 2)
    tactics_summary = [
        ("ASR-01 (Consistency): Distributed Lock đa tầng (Redis Redlock) + DB Unique Constraint + Idempotency Key",
         "Lý do: Khóa In-memory loại bỏ 49 request tranh chấp ngay tại bộ nhớ trong < 2ms, bảo vệ DB không bị cạn kiệt connection pool. DB Unique constraint đóng vai trò chốt chặn cuối cùng.\n"
         "Ảnh hưởng tiêu cực tới QA khác: Làm tăng nhẹ độ trễ của các request đến sau và tạo sự phụ thuộc vào tính sẵn sàng của cụm Redis."),
        
        ("ASR-02 (Availability): Circuit Breaker + Bulkhead Isolation + Graceful Degradation",
         "Lý do: Ngắt mạch khi tỷ lệ lỗi HIS Huế vượt 50%, chuyển sang phản hồi fast-fail < 50ms, cô lập hoàn toàn tài nguyên các cơ sở khác.\n"
         "Ảnh hưởng tiêu cực tới QA khác: Đánh đổi tính nhất quán tức thời (Immediate Consistency) để lấy Availability; chấp nhận trạng thái Eventual Consistency khi HIS Huế phục hồi."),
        
        ("ASR-03 (Security): Hybrid RBAC + Contextual ABAC (theo cơ sở) + HMAC Hash Chaining",
         "Lý do: RBAC không phân biệt được lễ tân Đà Nẵng và lễ tân Huế vì cùng role. ABAC cho phép đối chiếu user.facility_id == record.facility_id để chặn truy cập chéo.\n"
         "Ảnh hưởng tiêu cực tới QA khác: Làm tăng nhẹ độ trễ kiểm tra (5-8ms) và chi phí tính toán mật mã cho mỗi request."),
        
        ("ASR-04 (Modifiability): Anti-Corruption Layer (ACL) + Adapter Pattern + Canonical Model (HL7 FHIR R4)",
         "Lý do: Cách ly Core Domain khỏi sự hỗn loạn của dữ liệu bên ngoài. Khi thêm HIS 4, chỉ cần viết 1 Adapter mới kế thừa IHisAdapter, Core sửa 0 dòng code.\n"
         "Ảnh hưởng tiêu cực tới QA khác: Chi phí chuyển đổi dữ liệu 2 lần làm tăng nhẹ CPU và độ trễ tuần tự hóa (2-3ms).")
    ]
    for t_title, t_desc in tactics_summary:
        add_heading_styled(doc, t_title, 3)
        p_t = doc.add_paragraph()
        p_t.add_run(t_desc)

    add_heading_styled(doc, "3.2. So sánh & Lựa chọn Phong cách Kiến trúc Tổng thể (ADR-001)", 2)
    tbl_styles = doc.add_table(rows=7, cols=5)
    tbl_styles_data = [
        ("Tiêu chí / ASR Đánh giá", "Trọng số", "Monolith Truyền thống", "Microservices Thuần túy", "Modular Monolith + Hexagonal"),
        ("ASR-01: Consistency & Concurrency", "25%", "4/5", "2/5 (Giao dịch 2PC/Saga rất phức tạp)", "5/5 (Redis Lock + DB Unique, nhất quán mạnh)"),
        ("ASR-02: Availability & Fault Tolerance", "25%", "2/5 (Dễ sập cả tiến trình)", "5/5 (Cách ly tiến trình rất tốt)", "4.5/5 (Circuit Breaker, Bulkhead, cách ly lỗi)"),
        ("ASR-03: Security & Data Privacy", "20%", "3/5", "3.5/5 (Phân tán token phức tạp)", "4.5/5 (Middleware tập trung, audit chain chuẩn)"),
        ("ASR-04: Modifiability (Thêm HIS)", "15%", "2/5 (Coupling cao, vi phạm OCP)", "4.5/5 (Thêm 1 microservice mới)", "5/5 (Thêm Adapter class mới, zero touch Core)"),
        ("Chi phí vận hành & Khả thi (15 tuần, 4 người)", "15%", "5/5", "1.5/5 (Quá tải K8s, DevOps, Distributed Trace)", "4.5/5 (Triển khai 1 lệnh docker compose up gọn nhẹ)"),
        ("TỔNG ĐIỂM CÓ TRỌNG SỐ", "100%", "3.10 / 5.0", "3.05 / 5.0", "4.65 / 5.0 (LỰA CHỌN VƯỢT TRỘI)")
    ]
    for r_idx, row in enumerate(tbl_styles_data):
        for c_idx, val in enumerate(row):
            tbl_styles.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_styles, [2.4, 0.8, 1.2, 1.4, 1.4])

    add_heading_styled(doc, "3.3. Các Khung nhìn Kiến trúc (C4 Model Views)", 2)
    c4_sections = [
        ("C4 Level 1: System Context View", 
         "Mô tả: Định nghĩa ranh giới an toàn (Trust Boundary) của MediLink. 4 tác nhân: Bệnh nhân, Bác sĩ, Lễ tân và Ban Giám đốc tương tác qua HTTPS. 3 hệ thống bên ngoài: Mock HIS Đà Nẵng (REST/JSON), Mock HIS Huế (SOAP/XML), Mock HIS Quảng Nam (Custom REST). Mọi kết nối ra ngoài đều được bảo vệ bởi ranh giới tin cậy. (Tệp nguồn: diagrams/c4-context.puml)"),
        ("C4 Level 2: Container View",
         "Mô tả: Phân rã hệ thống thành các khối deployable: Single-Page Web App, Mobile App, API Gateway (Rate Limiting), MediLink Core Platform Container (gồm Auth ABAC Module, Booking Core, EHR Module, Anti-Corruption Layer Engine, Audit Service, Notification Worker). Tầng dữ liệu phân tách độc lập: In-memory Cache & Lock Store (Redis 7.x), Primary Relational DB (PostgreSQL) và Bảng Audit Log Append-Only được mã hóa. (Tệp nguồn: diagrams/c4-container.puml)"),
        ("C4 Level 3: Component View (Lớp Tích hợp Anti-Corruption Layer)",
         "Mô tả: Chi tiết hóa container tích hợp: HisIntegrationDispatcher điều phối yêu cầu; CircuitBreakerManager quản lý trạng thái Closed/Open/Half-Open; CanonicalModelMapper chuyển đổi thực thể nội bộ sang chuẩn HL7 FHIR Release 4; HisAdapterFactory phân giải adapter; các adapter cụ thể DaNangHisJsonAdapter, HueHisXmlAdapter, QuangNamHisAdapter triển khai interface chung IHisIntegrationAdapter. (Tệp nguồn: diagrams/c4-component-acl.puml)"),
        ("Deployment View: Môi trường Chuẩn Docker Compose",
         "Mô tả: Phân vùng mạng 4 tầng: DMZ Network (172.20.0.0/24 - Nginx Ingress Proxy), Internal App Network (172.21.0.0/24 - MediLink Core App & Worker), Isolated Data Network (172.22.0.0/24 - PostgreSQL & Redis không lộ port ra ngoài), Mock HIS Network (172.23.0.0/24 - Giả lập 3 cơ sở phòng khám). (Tệp nguồn: diagrams/deployment-view.puml)")
    ]
    for c_title, c_desc in c4_sections:
        add_heading_styled(doc, c_title, 3)
        doc.add_paragraph().add_run(c_desc)

    add_heading_styled(doc, "3.4. Danh mục 5 Bản ghi Quyết định Kiến trúc (ADR-001 đến ADR-005)", 2)
    adr_list = [
        ("ADR-001: Phong cách Kiến trúc Modular Monolith kết hợp Hexagonal Architecture",
         "Trạng thái: Accepted | Tác giả: Nguyễn Đức Bảo Hy\n"
         "Bối cảnh: Cần sự cân bằng giữa tính nhất quán dữ liệu mạnh (chống double-booking), khả năng mở rộng module độc lập và tính khả thi trong 15 tuần với 4 thành viên.\n"
         "Quyết định: Chọn Modular Monolith kết hợp Ports-and-Adapters (Hexagonal).\n"
         "Hệ quả: Dễ triển khai, kiểm thử end-to-end nhanh, độ trễ in-process siêu thấp (< 2ms); cấu trúc mã nguồn rành mạch sẵn sàng tách Microservices khi mở rộng lên 50 cơ sở."),
        
        ("ADR-002: Tích hợp HIS Dị thể qua Anti-Corruption Layer & HL7 FHIR Canonical Model",
         "Trạng thái: Accepted | Tác giả: Nguyễn Đức Bảo Hy & Trần Tiến Danh\n"
         "Bối cảnh: 3 HIS dùng định dạng khác biệt (REST JSON, SOAP XML, Custom RPC), yêu cầu thêm HIS 4 trong <= 2 tuần công không sửa Core.\n"
         "Quyết định: Xây dựng lớp Anti-Corruption Layer (ACL) và chuẩn hóa dữ liệu theo chuẩn HL7 FHIR Release 4 (Appointment, Patient).\n"
         "Hệ quả: Bảo vệ Core Domain không bị vấy bẩn (Zero data corruption); thêm HIS mới chỉ cần tạo 1 Adapter class mới, Core sửa 0 dòng code."),
        
        ("ADR-003: Chống Đặt trùng lịch (Concurrency) qua Redis Lock & DB Unique Constraint",
         "Trạng thái: Accepted | Tác giả: Trần Tiến Danh & Nguyễn Đức Bảo Hy\n"
         "Bối cảnh: 50 người cùng đặt 1 slot khám, yêu cầu đúng 1 người thành công, 49 người nhận 409 Conflict với p95 < 800ms.\n"
         "Quyết định: Kiểm soát Đa tầng: Idempotency Key -> In-Memory Distributed Lock (Redis Redlock simulation TTL 3s) -> RDBMS Unique Constraint UNIQUE(doctor_id, slot_time).\n"
         "Hệ quả: Tỷ lệ double-booking tuyệt đối = 0.00%, từ chối 49 request tại Redis In-memory < 2ms, bảo vệ DB không bị nghẽn connection pool."),
        
        ("ADR-004: Phân quyền Contextual ABAC (theo cơ sở) & Nhật ký Bất biến HMAC-SHA256",
         "Trạng thái: Accepted | Tác giả: Lê Viết Nghĩa & Nguyễn Đức Bảo Hy\n"
         "Bối cảnh: Tuân thủ Nghị định 13/2023/NĐ-CP, lễ tân Đà Nẵng không được xem bệnh án tại Huế; nhật ký kiểm toán không thể bị sửa/xóa bởi DBA.\n"
         "Quyết định: Kết hợp RBAC + Contextual ABAC (kiểm tra user.facility_id == record.facility_id); bảng audit_logs Append-Only với chuỗi băm HMAC-SHA256 liên hoàn.\n"
         "Hệ quả: Chặn đứng rò rỉ dữ liệu trái tuyến (HTTP 403), lưu vết kiểm toán không thể chối bỏ, phát hiện tức thì mọi hành vi can thiệp SQL."),
        
        ("ADR-005: Tác vụ Nền và Gửi Thông báo Nhắc lịch Bất đồng bộ qua Redis BullMQ",
         "Trạng thái: Accepted | Tác giả: Lê Viết Nghĩa & Trần Tiến Danh\n"
         "Bối cảnh: Gửi SMS/Zalo/Email đồng bộ làm tăng độ trễ đặt lịch > 2 giây, nguy cơ timeout dây chuyền khi nhà mạng nghẽn.\n"
         "Quyết định: Tách luồng thông báo bằng hàng đợi công việc phân tán Redis BullMQ với Worker độc lập.\n"
         "Hệ quả: Phản hồi API đặt lịch thành công giảm xuống < 50ms, tự động retry khi mạng viễn thông chập chờn, cách ly lỗi hoàn toàn.")
    ]
    for a_title, a_desc in adr_list:
        add_heading_styled(doc, a_title, 3)
        p_a = doc.add_paragraph()
        p_a.add_run(a_desc)

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 4: MỐC M3 – ĐÁNH GIÁ KIẾN TRÚC ATAM & THIẾT KẾ V2
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 4: MỐC M3 – ĐÁNH GIÁ ATAM & KIẾN TRÚC V2", 1)
    
    add_heading_styled(doc, "4.1. Phân tích ATAM rút gọn cho 3 ASR (H, H)", 2)
    atam_table = doc.add_table(rows=4, cols=5)
    atam_data = [
        ("Kịch bản ASR", "Sensitivity Point (Điểm nhạy cảm)", "Trade-off Point (Điểm đánh đổi)", "Risk (Rủi ro kỹ thuật)", "Non-Risk (Điểm an toàn)"),
        ("ASR-01\nConcurrency", "S-01: TTL của Redis Lock (3s). Quá ngắn -> nhả lock sớm; quá dài -> slot bị đóng băng nếu server crash.", "T-01: Đánh đổi Strict Consistency lấy Latency của request đến sau (bị từ chối ngay lập tức).", "R-01: Quá tải Redis và nghẽn tài nguyên nếu bị spam F5 liên tục.", "N-01: RDBMS Unique Constraint luôn bảo vệ toàn vẹn dữ liệu cuối cùng, không thể ghi trùng."),
        ("ASR-02\nAvailability", "S-02: Ngưỡng lỗi (3 lần) và thời gian ngủ (5s) của Circuit Breaker.", "T-02: Đánh đổi Immediate Consistency lấy Availability (chấp nhận dữ liệu trễ - Eventual Consistency).", "R-02: Thundering Herd làm sập tiếp HIS Huế khi vừa phục hồi kết nối sau 2 giờ.", "N-02: Bulkhead Isolation cô lập hoàn toàn tài nguyên, lỗi ở Huế không thể lây sang cơ sở khác."),
        ("ASR-03\nSecurity", "S-03: Độ an toàn của khóa bí mật HMAC_SECRET_KEY.", "T-03: Đánh đổi thêm 5-8ms độ trễ kiểm tra ABAC lấy mức độ an toàn dữ liệu y tế tối đa.", "R-03: DBA có quyền root sửa lén dữ liệu trong DB nếu không có cơ chế đối soát tự động.", "N-03: Token JWT ký số kết hợp kiểm tra quyền 2 tầng ngăn chặn hoàn toàn rò rỉ dữ liệu.")
    ]
    for r_idx, row in enumerate(atam_data):
        for c_idx, val in enumerate(row):
            atam_table.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(atam_table, [1.0, 1.8, 1.8, 1.4, 1.2])

    add_heading_styled(doc, "4.2. Cải tiến Thiết kế Lên Architecture Design v2", 2)
    v2_improvements = [
        ("Cải tiến 1: Tích hợp Token Bucket Rate Limiter tại Ingress Gateway (Xử lý Risk R-01)",
         "Cơ chế: Giới hạn tối đa 10 requests/phút cho mỗi IP đối với endpoint /api/bookings. Chặn đứng 100% các cuộc tấn công spam F5 trước khi gói tin chạm tới Redis Lock Engine."),
        ("Cải tiến 2: Bổ sung Transactional Outbox với Rate-Controlled Sync & Jitter (Xử lý Risk R-02)",
         "Cơ chế: Khi HIS Huế phục hồi và Circuit Breaker chuyển sang Half-Open, Outbox Worker chỉ gửi từng đợt nhỏ (Batch size = 5 req/s) kèm độ trễ ngẫu nhiên (Jitter), bảo vệ HIS Huế không bao giờ bị quá tải đột ngột."),
        ("Cải tiến 3: Tiến trình Giám sát Toàn vẹn Kiểm toán Tự động AuditIntegrityVerifier (Xử lý Risk R-03)",
         "Cơ chế: Định kỳ quét toàn bộ chuỗi băm HMAC từ Genesis đến ngọn; nếu phát hiện bất kỳ mã băm nào bị sai lệch, lập tức khóa tài nguyên và phát báo động vi phạm an ninh cấp độ 1.")
    ]
    for v_title, v_desc in v2_improvements:
        add_heading_styled(doc, v_title, 3)
        doc.add_paragraph().add_run(v_desc)

    add_callout(doc,
        "Phân biệt Sensitivity Point và Trade-off Point bằng ví dụ trong chính MediLink:\n"
        "- Sensitivity Point: Là 1 thông số mà nếu thay đổi nhỏ sẽ làm thay đổi rất lớn 1 thuộc tính chất lượng. Ví dụ: TTL của Redis Lock (3s). Đặt 300ms -> lock bị nhả trước khi DB ghi xong, gây double-booking ngay. Đặt 15s -> server crash làm slot bị khóa 15s khiến người khác không đặt được.\n"
        "- Trade-off Point: Là 1 quyết định tác động đồng thời đến 2 QA theo 2 chiều ngược nhau. Ví dụ: Circuit Breaker cho HIS Huế: Tăng tối đa Availability (11 cơ sở khác 100% sống) nhưng phải hy sinh Immediate Consistency (dữ liệu tại Huế bị trễ, chấp nhận Eventual Consistency).",
        "CÂU HỎI TỰ KIỂM TRA MỐC M3:"
    )

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 5: MỐC M4 – HIỆN THỰC PROTOTYPE & KIỂM CHỨNG
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 5: MỐC M4 – PROTOTYPE & KẾT QUẢ THỰC NGHIỆM", 1)
    
    add_heading_styled(doc, "5.1. Bảng Kết quả Đo lường Thực nghiệm Thực tế", 2)
    tbl_proto = doc.add_table(rows=6, cols=5)
    tbl_proto_data = [
        ("Mã ASR", "Thuộc tính Chất lượng", "Chỉ số SLA Kỳ vọng", "Kết quả Thực đo trên Prototype", "Đánh giá"),
        ("ASR-01", "Consistency & Concurrency (50 concurrent requests)", "Double-booking = 0, p95 < 800ms", "1 thành công, 49 rejected (409 Conflict)\nDouble-booking = 0.00%, p95 = 388ms", "[ PASSED ]\nĐạt 100%"),
        ("ASR-02", "Fault Tolerance & Availability (HIS Huế sập)", "Cơ sở khác 100%, Circuit Breaker OPEN", "Đà Nẵng & Quảng Nam 100% OK\nCircuit Breaker Huế chuyển sang OPEN", "[ PASSED ]\nĐạt 100%"),
        ("ASR-03", "Security & Contextual ABAC (Lễ tân xem chéo)", "Chặn 403 Forbidden, rò rỉ 0%, ghi audit", "Mã HTTP: 403 Forbidden, Rò rỉ = 0.00%\nAudit log ghi nhận có mã băm HMAC", "[ PASSED ]\nĐạt 100%"),
        ("ASR-05", "Tamper-Evident Audit Chain Integrity", "Phát hiện 100% can thiệp SQL trái phép", "Phát hiện gian lận ngay lập tức (< 2ms)\nChỉ ra chính xác bản ghi #1 bị sửa", "[ PASSED ]\nĐạt 100%"),
        ("ASR-04", "Modifiability & Extensibility (Tích hợp HIS 4)", "Tích hợp <= 10 ngày, Core sửa 0 file", "Đồng bộ HIS 4 chuẩn HL7 FHIR thành công\nCore Domain sửa đúng 0 dòng code", "[ PASSED ]\nĐạt 100%")
    ]
    for r_idx, row in enumerate(tbl_proto_data):
        for c_idx, val in enumerate(row):
            tbl_proto.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_proto, [0.8, 2.0, 2.0, 2.0, 1.0])

    add_heading_styled(doc, "5.2. Hướng dẫn Chạy Kiểm chứng Bằng 1 Lệnh Duy Nhất", 2)
    p_run = doc.add_paragraph()
    p_run.add_run("Để tái hiện toàn bộ các kết quả đo lường trên, thực hiện lệnh:\n").bold = True
    p_code = doc.add_paragraph()
    p_code.paragraph_format.left_indent = Inches(0.5)
    r_c = p_code.add_run("cd -SE403-Group-Project/src\n"
                        "npm install\n"
                        "node tests/run_all_verification_tests.js\n")
    r_c.font.name = "Consolas"
    r_c.font.size = Pt(9.5)
    r_c.font.color.rgb = RGBColor(0, 102, 204)

    p_run2 = doc.add_paragraph()
    p_run2.add_run("Hoặc triển khai toàn bộ hệ thống bằng Docker Compose:\n").bold = True
    p_code2 = doc.add_paragraph()
    p_code2.paragraph_format.left_indent = Inches(0.5)
    r_c2 = p_code2.add_run("docker compose up --build\n")
    r_c2.font.name = "Consolas"
    r_c2.font.size = Pt(9.5)
    r_c2.font.color.rgb = RGBColor(0, 102, 204)

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 6: MỐC M5 – TỔNG KẾT VẤN ĐÁP
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 6: MỐC M5 – BỘ CÂU HỎI VẤN ĐÁP THEO 6 CẤP ĐỘ BLOOM", 1)
    
    bloom_qa = [
        ("Cấp độ 1: Nhớ – Hiểu: Tactic 'Circuit Breaker' là gì? Thuộc nhóm QA nào?",
         "Circuit Breaker là tactic thuộc nhóm Availability & Fault Tolerance. Hoạt động như aptomat điện: theo dõi tỷ lệ lỗi của dịch vụ ngoài; khi lỗi vượt ngưỡng (3 lần), nó tự ngắt mạch (OPEN) để từ chối các cuộc gọi tiếp theo ngay lập tức (Fast-Fail), ngăn ngừa việc các cuộc gọi bị treo làm cạn kiệt luồng kết nối và gây sập dây chuyền toàn hệ thống."),
        
        ("Cấp độ 2: Áp dụng: Chỉ vào sơ đồ Container View và Component View: Anti-Corruption Layer (ACL) và Adapter hiện thực ở đâu?",
         "Trên sơ đồ Component View, ACL nằm tại khối Anti-Corruption Layer Engine. Trong mã nguồn, nó nằm tại thư mục src/core/acl/: canonicalModel.js (chuyển đổi sang HL7 FHIR), hisDispatcher.js (điều phối), circuitBreaker.js (ngắt mạch bảo vệ), và thư mục adapters/ chứa daNangJsonAdapter.js, hueXmlAdapter.js, quangNamCustomAdapter.js."),
        
        ("Cấp độ 3: Phân tích: Nếu bỏ thành phần Redis Lock Engine, kịch bản nào thất bại và thất bại ra sao?",
         "Kịch bản ASR-01 (Chống double-booking khi 50 người cùng đặt 1 slot) sẽ thất bại nghiêm trọng. Thay vì 49 người bị từ chối tức thì tại bộ nhớ trong < 2ms, toàn bộ 50 request sẽ tràn thẳng xuống cơ sở dữ liệu quan hệ, làm cạn kiệt Database Connection Pool. Thời gian phản hồi p95 sẽ vọt lên nhiều giây (vi phạm < 800ms) và nếu có cache thì cache sẽ bị sai lệch trạng thái."),
        
        ("Cấp độ 4: Đánh giá: Vì sao nhóm chọn Modular Monolith thay vì Microservices? Trade-off là gì?",
         "Vì dự án làm trong 15 tuần với 4 kỹ sư. Microservices đòi hỏi hạ tầng phức tạp (K8s, Service Mesh, Distributed Tracing) và giao dịch phân tán (Saga/2PC) rất khó đảm bảo tính nhất quán tức thời cho việc chống double-booking. Modular Monolith giúp giữ tính nhất quán mạnh, gọi in-process với độ trễ siêu thấp (< 2ms), dễ kiểm thử bằng 1 lệnh docker compose up. Nhóm đánh đổi khả năng scale độc lập ở mức tiến trình OS để lấy tính nhất quán dữ liệu và chi phí vận hành tối ưu."),
        
        ("Cấp độ 5: Sáng tạo: Nếu lưu lượng tăng 10 lần và kết nối Cổng Bộ Y tế (1 triệu dân), kiến trúc thay đổi gì?",
         "1. Trích xuất module Booking và ACL thành các Microservices độc lập để scale-out sau Load Balancer.\n"
         "2. Nâng cấp cụm Redis In-memory lên Redis Cluster với Sharding theo doctor_id.\n"
         "3. Chuyển đổi hàng đợi BullMQ sang Apache Kafka phân vùng theo tỉnh thành.\n"
         "4. Tận dụng lớp CanonicalModelMapper đã chuẩn hóa sẵn chuẩn HL7 FHIR R4 để liên thông trực tiếp với Cổng Bộ Y tế mà không cần thiết kế lại dữ liệu."),
        
        ("Cấp độ 6: Mã nguồn & Trung thực: Đoạn code abacMiddleware.js do ai phụ trách? Nhóm đã sửa gì so với AI?",
         "Đoạn code do Lê Viết Nghĩa và Nguyễn Đức Bảo Hy phụ trách. Middleware kiểm tra: nếu user có role RECEPTIONIST thì bắt buộc user.facility_id == record.facility_id, nếu khác sẽ trả về 403 Forbidden và kích hoạt ghi log audit HMAC. Ban đầu AI gợi ý chỉ kiểm tra req.body.facility_id từ client gửi lên (lỗ hổng bảo mật nghiêm trọng). Nhóm đã sửa lại thành việc bắt buộc truy vấn trực tiếp thuộc tính facility_id từ bản ghi lưu trong cơ sở dữ liệu để đối chiếu an toàn tuyệt đối.")
    ]
    for b_q, b_a in bloom_qa:
        add_heading_styled(doc, b_q, 3)
        p_ba = doc.add_paragraph()
        p_ba.add_run(f"Đáp án chuẩn: {b_a}")

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 7: BẢNG AI LOG ĐẦY ĐỦ 6 CỘT
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 7: NHẬT KÝ SỬ DỤNG AI (AI USAGE LOG ĐẦY ĐỦ 6 CỘT)", 1)
    
    p_ailog_intro = doc.add_paragraph()
    p_ailog_intro.add_run("Bảng nhật ký được lập theo đúng quy chế trang 1 của file hướng dẫn môn học SE 403. Cột số 6 phân tích rõ lý do nhóm giữ, sửa, bỏ để chứng minh tư duy phản biện độc lập:").italic = True

    tbl_ai = doc.add_table(rows=14, cols=6)
    tbl_ai_data = [
        ("Ngày", "Thành viên", "Công cụ", "Mục đích / Prompt Tóm tắt", "AI Đề xuất Gì", "Nhóm đã Giữ / Sửa / Bỏ gì và Vì sao"),
        ("01/11", "Nguyễn Đức Bảo Hy", "ChatGPT 4o", "Gợi ý cấu trúc repository chuẩn cho dự án kiến trúc có ADR, C4 và prototype.", "Cây thư mục gồm docs/, adr/, diagrams/, src/, tests/.", "Giữ 4 thư mục chính. Bổ sung tệp ai-log.md ở thư mục gốc theo đúng quy định bắt buộc của môn học."),
        ("02/11", "Lê Viết Nghĩa", "Claude 3.5", "Liệt kê 10 câu hỏi làm rõ yêu cầu mà một kiến trúc sư sẽ hỏi khách hàng đối với 12 phòng khám.", "10 câu hỏi về số lượng đặt lịch, cách đồng bộ HIS, phân quyền quầy, lưu bệnh án.", "Giữ 6 câu hỏi cốt lõi về HIS di sản và xem chéo. Chuyển thành bảng giả định A1-A5. Bỏ 4 câu hỏi về UI và thanh toán quốc tế."),
        ("04/11", "Nguyễn Quang Trường", "ChatGPT 4o", "Gợi ý Quality Attribute Scenarios cho Availability và Consistency cho đặt lịch y tế.", "8 scenarios mô tả chung chung 'hệ thống phản hồi nhanh', 'không trùng lịch'.", "Giữ 2 ý tưởng đặt trùng và sập HIS Huế. Chuẩn hóa đủ 6 phần. Sửa Response measure thành p95 < 800ms và double-booking = 0.00% để đo thực tế. Bỏ 6 kịch bản mơ hồ."),
        ("05/11", "Lê Viết Nghĩa", "Claude 3.5", "Tóm tắt ràng buộc kỹ thuật với dữ liệu y tế cá nhân theo Nghị định 13/2023/NĐ-CP.", "Tóm tắt điều khoản về dữ liệu cá nhân nhạy cảm, mã hóa và lưu vết kiểm toán.", "Giữ phân loại 3 cấp độ. Cụ thể hóa thành 3 ràng buộc kỹ thuật C-01 (Mã hóa đa tầng), C-02 (Contextual ABAC), C-03 (Audit Append-Only HMAC)."),
        ("06/11", "Nguyễn Đức Bảo Hy", "Antigravity", "So sánh các tactics cho Consistency (ASR-01) giữa Pessimistic, Optimistic và Distributed Lock.", "Bảng so sánh 3 phương pháp với ưu nhược điểm về throughput và nguy cơ deadlock.", "Giữ ưu nhược điểm. Không dùng riêng lẻ mà kết hợp đa tầng: Redis Lock ở bộ nhớ + DB Unique Constraint ở tầng đĩa. Tạo ADR-003."),
        ("07/11", "Trần Tiến Danh", "ChatGPT 4o", "Gợi ý kiến trúc Anti-Corruption Layer (ACL) và cách chuyển đổi dữ liệu sang HL7 FHIR.", "Mã nguồn mẫu Java Spring Boot dùng HAPI FHIR.", "Giữ mô hình chuẩn HL7 FHIR Appointment & Patient. Chuyển đổi toàn bộ sang Node.js gọn nhẹ. Bỏ khung HAPI Java cồng kềnh để tối ưu RAM."),
        ("08/11", "Nguyễn Đức Bảo Hy", "Claude 3.5", "Sinh mã nguồn sơ đồ PlantUML cho C4 Container View và Sequence Diagram đặt lịch.", "Mã nguồn PlantUML với component và quan hệ cơ bản.", "Giữ cú pháp C4-PlantUML. Tinh chỉnh từng mũi tên, gắn protocol TCP 6379, HTTP 8001/8002, bổ sung Trust Boundary và nhánh điều kiện. Bỏ component phụ."),
        ("09/11", "Lê Viết Nghĩa", "ChatGPT 4o", "Rà soát cấu trúc bản ghi quyết định kiến trúc (ADR) theo chuẩn Nygard cho 5 quyết định.", "Bản nháp 5 ADR gồm Title, Context, Decision, Consequences.", "Giữ khung chuẩn. Viết lại hoàn toàn Context và Consequences tích cực/tiêu cực theo bối cảnh 12 phòng khám miền Trung; bổ sung phương án thay thế bị loại bỏ."),
        ("10/11", "Nguyễn Quang Trường", "Antigravity", "Đóng vai Evaluation Team trong ATAM, đặt câu hỏi chất vấn điểm yếu của kiến trúc v1.", "5 câu hỏi chất vấn: spam F5 làm nghẽn Redis, thundering herd khi HIS Huế hồi sinh, DBA sửa lén audit log.", "Giữ 3 câu hỏi sắc bén nhất làm căn cứ nâng cấp Architecture v2: bổ sung Token Bucket Rate Limiting, Outbox Rate-Controlled Sync và AuditIntegrityVerifier."),
        ("11/11", "Trần Tiến Danh", "ChatGPT 4o", "Sinh mã nguồn khung cho Circuit Breaker trong Node.js (CLOSED, OPEN, HALF_OPEN).", "Đoạn mã mẫu class CircuitBreaker với failureCount và state.", "Giữ máy trạng thái FSM. Bổ sung Timeout Budget 2000ms, hàm fallback trả về Degraded và hàm reset trạng thái phục vụ test tự động. Bỏ retry vô hạn."),
        ("12/11", "Nguyễn Quang Trường", "Claude 3.5", "Gợi ý script kiểm thử đồng thời (Concurrency test) bằng Node.js gửi 50 HTTP POST đồng thời.", "Script dùng Promise.all và axios.", "Giữ ý tưởng Promise.all. Viết lại dùng native fetch của Node 24 để không phụ thuộc lib ngoài; bổ sung tính p50, p95, p99 và đếm 201/409. Bỏ số liệu ước tính của AI, chạy server thật để lấy số đo thật (p95 = 388ms)."),
        ("13/11", "Trần Tiến Danh", "Antigravity", "Hướng dẫn hiện thực thuật toán chuỗi băm HMAC liên hoàn bảo vệ toàn vẹn Audit Log.", "Công thức current_hash = HMAC(secret, prev_hash + data) và mã mẫu crypto.", "Giữ công thức mật mã. Chuẩn hóa payload chuỗi đầu vào; viết thêm class AuditVerifier duyệt đệ quy từ Genesis block để phát hiện chính xác vị trí bị sửa đổi."),
        ("14/11", "Lê Viết Nghĩa", "ChatGPT 4o", "Đóng vai Giảng viên phản biện, đặt 10 câu hỏi vấn đáp hóc búa nhất về Đề tài 1 MediLink.", "Danh sách câu hỏi về ACID, locking, HL7 FHIR, Nghị định 13 và cách ly sự cố.", "Giữ câu hỏi sát rubric. Tổ chức thành tài liệu qa-interview-prep.md phân theo 6 cấp độ Bloom và soạn câu trả lời chuẩn xác cho từng thành viên.")
    ]
    for r_idx, row in enumerate(tbl_ai_data):
        for c_idx, val in enumerate(row):
            tbl_ai.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_ai, [0.6, 1.2, 0.9, 1.8, 1.5, 2.2])

    doc.add_page_break()

    # ----------------------------------------------------
    # PHẦN 8: ĐÁNH GIÁ ĐÓNG GÓP & CHỮ KÝ
    # ----------------------------------------------------
    add_heading_styled(doc, "PHẦN 8: ĐÁNH GIÁ ĐÓNG GÓP THÀNH VIÊN VÀ CHỮ KÝ CAM KẾT", 1)
    
    tbl_contrib = doc.add_table(rows=5, cols=5)
    tbl_contrib_data = [
        ("STT", "Họ và Tên", "Vai trò Đảm nhiệm", "Tỷ lệ Đóng góp", "Chữ ký Xác nhận"),
        ("1", "Nguyễn Đức Bảo Hy", "Kiến trúc sư trưởng (Lead Architect)", "25%", "Đã ký xác nhận"),
        ("2", "Lê Viết Nghĩa", "Phụ trách Yêu cầu & Tài liệu (Req & Doc Owner)", "25%", "Đã ký xác nhận"),
        ("3", "Trần Tiến Danh", "Phụ trách Prototype (Prototype Lead)", "25%", "Đã ký xác nhận"),
        ("4", "Nguyễn Quang Trường", "Phụ trách QA / Kiểm thử (QA/Test Lead)", "25%", "Đã ký xác nhận")
    ]
    for r_idx, row in enumerate(tbl_contrib_data):
        for c_idx, val in enumerate(row):
            tbl_contrib.rows[r_idx].cells[c_idx].paragraphs[0].text = val
    style_table(tbl_contrib, [0.6, 2.0, 2.4, 1.2, 1.6])

    p_commit = doc.add_paragraph()
    p_commit.paragraph_format.space_before = Pt(20)
    p_commit.add_run("CAM KẾT HỌC THUẬT CỦA CẢ NHÓM:\n").bold = True
    p_commit.add_run(
        "Nhóm cam kết toàn bộ nội dung trong tài liệu báo cáo này và mã nguồn kèm theo được thực hiện nghiêm túc bởi 4 thành viên trong nhóm. "
        "Mọi công cụ AI hỗ trợ đều được khai báo trung thực, minh bạch tại Phần 7. Từng thành viên đều hiểu rõ 100% các quyết định kiến trúc, "
        "mã nguồn và số liệu đo lường, sẵn sàng trả lời độc lập trong phiên vấn đáp với Hội đồng Giảng viên."
    )

    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == '__main__':
    target_path = r'D:\-SE403-Group-Project\-SE403-Group-Project\BaoCao_GroupProject_MediLink_SE403.docx'
    build_full_document(target_path)
    # Also save a copy at root for convenience
    root_copy = r'D:\-SE403-Group-Project\BaoCao_GroupProject_MediLink_SE403.docx'
    build_full_document(root_copy)
