import io
import csv
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_harvest_excel(
    report_title: str,
    subtitle: str,
    records: List[Dict[str, Any]]
) -> bytes:
    """Generates a professional Excel (.xlsx) spreadsheet for financial audit."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Harvest Report"
    
    # Title Styling
    ws.merge_cells("A1:K1")
    title_cell = ws["A1"]
    title_cell.value = f"GARTECH VENDO – {report_title.upper()}"
    title_cell.font = Font(name="Calibri", size=16, bold=True, color="1E3A8A")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    
    ws.merge_cells("A2:K2")
    sub_cell = ws["A2"]
    sub_cell.value = f"{subtitle} | Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    sub_cell.font = Font(name="Calibri", size=10, italic=True, color="4B5563")
    sub_cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Headers
    headers = [
        "TXN Ref", "Harvest Date", "VLAN", "Vendo Name", "Partner Name",
        "Harvester", "Gross Harvest (₱)", "Partner Share (₱)", 
        "Staff Incentive (₱)", "GARTECH Net (₱)", "Status"
    ]
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    
    ws.row_dimensions[4].height = 25
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )
    
    # Data Rows
    row_idx = 5
    total_gross = Decimal("0.00")
    total_partner = Decimal("0.00")
    total_staff = Decimal("0.00")
    total_net = Decimal("0.00")
    
    for r in records:
        gross = Decimal(str(r.get("gross_harvest", 0)))
        partner = Decimal(str(r.get("partner_share", 0)))
        staff = Decimal(str(r.get("staff_incentive", 0)))
        net = Decimal(str(r.get("gartech_net", 0)))
        
        total_gross += gross
        total_partner += partner
        total_staff += staff
        total_net += net
        
        row_vals = [
            r.get("transaction_ref", ""),
            str(r.get("harvest_date", "")),
            r.get("vlan_id", ""),
            r.get("vendo_name", ""),
            r.get("partner_name", ""),
            r.get("harvester_name", ""),
            float(gross),
            float(partner),
            float(staff),
            float(net),
            r.get("status", "")
        ]
        
        ws.row_dimensions[row_idx].height = 20
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = thin_border
            if col_idx in [7, 8, 9, 10]:
                cell.number_format = "₱#,##0.00"
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_idx in [2, 3, 11]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
                
        row_idx += 1
        
    # Totals Row
    ws.row_dimensions[row_idx].height = 24
    total_cell = ws.cell(row=row_idx, column=1, value="GRAND TOTAL")
    total_cell.font = Font(name="Calibri", size=11, bold=True, color="1E3A8A")
    total_cell.alignment = Alignment(horizontal="left", vertical="center")
    
    total_fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
    for c in range(1, 12):
        ws.cell(row=row_idx, column=c).fill = total_fill
        ws.cell(row=row_idx, column=c).font = Font(name="Calibri", size=11, bold=True)
        ws.cell(row=row_idx, column=c).border = thin_border
        
    ws.cell(row=row_idx, column=7, value=float(total_gross)).number_format = "₱#,##0.00"
    ws.cell(row=row_idx, column=8, value=float(total_partner)).number_format = "₱#,##0.00"
    ws.cell(row=row_idx, column=9, value=float(total_staff)).number_format = "₱#,##0.00"
    ws.cell(row=row_idx, column=10, value=float(total_net)).number_format = "₱#,##0.00"

    # Column Auto-fit
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len and cell.row > 2:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
        
    stream = io.BytesIO()
    wb.save(stream)
    return stream.getvalue()

def generate_harvest_pdf(
    report_title: str,
    subtitle: str,
    records: List[Dict[str, Any]]
) -> bytes:
    """Generates an executive PDF report using ReportLab with clean styling."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1E3A8A"),
        alignment=1 # Center
    )
    sub_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4B5563"),
        alignment=1
    )
    th_style = ParagraphStyle(
        'Th',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1
    )
    td_style = ParagraphStyle(
        'Td',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1F2937")
    )
    td_num_style = ParagraphStyle(
        'TdNum',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1F2937"),
        alignment=2 # Right
    )
    td_total_style = ParagraphStyle(
        'TdTotal',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E3A8A"),
        alignment=2
    )
    
    elements = [
        Paragraph(f"GARTECH VENDO – {report_title.upper()}", title_style),
        Spacer(1, 4),
        Paragraph(f"{subtitle} | Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", sub_style),
        Spacer(1, 16)
    ]
    
    table_data = [[
        Paragraph("TXN Ref", th_style),
        Paragraph("Date", th_style),
        Paragraph("VLAN", th_style),
        Paragraph("Vendo Name", th_style),
        Paragraph("Partner", th_style),
        Paragraph("Harvester", th_style),
        Paragraph("Gross (₱)", th_style),
        Paragraph("Partner (₱)", th_style),
        Paragraph("Staff (₱)", th_style),
        Paragraph("GARTECH (₱)", th_style),
        Paragraph("Status", th_style)
    ]]
    
    total_gross = Decimal("0.00")
    total_partner = Decimal("0.00")
    total_staff = Decimal("0.00")
    total_net = Decimal("0.00")
    
    for r in records:
        gross = Decimal(str(r.get("gross_harvest", 0)))
        partner = Decimal(str(r.get("partner_share", 0)))
        staff = Decimal(str(r.get("staff_incentive", 0)))
        net = Decimal(str(r.get("gartech_net", 0)))
        
        total_gross += gross
        total_partner += partner
        total_staff += staff
        total_net += net
        
        table_data.append([
            Paragraph(r.get("transaction_ref", "")[-14:], td_style),
            Paragraph(str(r.get("harvest_date", "")), td_style),
            Paragraph(str(r.get("vlan_id", "")), td_style),
            Paragraph(str(r.get("vendo_name", "")[:18]), td_style),
            Paragraph(str(r.get("partner_name", "")[:16]), td_style),
            Paragraph(str(r.get("harvester_name", "")[:14]), td_style),
            Paragraph(f"{gross:,.2f}", td_num_style),
            Paragraph(f"{partner:,.2f}", td_num_style),
            Paragraph(f"{staff:,.2f}", td_num_style),
            Paragraph(f"{net:,.2f}", td_num_style),
            Paragraph(str(r.get("status", "")), td_style)
        ])
        
    table_data.append([
        Paragraph("<b>TOTALS</b>", td_style),
        Paragraph("", td_style),
        Paragraph("", td_style),
        Paragraph("", td_style),
        Paragraph("", td_style),
        Paragraph("", td_style),
        Paragraph(f"₱{total_gross:,.2f}", td_total_style),
        Paragraph(f"₱{total_partner:,.2f}", td_total_style),
        Paragraph(f"₱{total_staff:,.2f}", td_total_style),
        Paragraph(f"₱{total_net:,.2f}", td_total_style),
        Paragraph("", td_style)
    ])
    
    t = Table(table_data, colWidths=[70, 50, 35, 95, 85, 75, 65, 65, 60, 65, 55])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#F9FAFB")]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#F3F4F6")),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor("#1E3A8A")),
    ]))
    
    elements.append(t)
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
