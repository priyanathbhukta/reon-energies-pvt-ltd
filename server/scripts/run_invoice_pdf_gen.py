#!/usr/bin/env python3
import json
import os
import sys
import argparse
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import inch, mm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
        Image as RLImage, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.pdfgen import canvas
except ImportError:
    print("Error: Missing reportlab. Run: pip install reportlab", file=sys.stderr)
    sys.exit(1)

def num_to_words(n):
    if n == 0: return "Zero"
    words = []
    
    def get_words(num):
        units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
        res = []
        if num >= 100:
            res.append(units[num // 100])
            res.append("Hundred")
            num %= 100
        if num >= 20:
            res.append(tens[num // 10])
            if num % 10 > 0:
                res.append(units[num % 10])
        elif num > 0:
            res.append(units[num])
        return " ".join(res)
    
    n = int(round(n))
    if n >= 10000000:
        words.append(get_words(n // 10000000) + " Crore")
        n %= 10000000
    if n >= 100000:
        words.append(get_words(n // 100000) + " Lakh")
        n %= 100000
    if n >= 1000:
        words.append(get_words(n // 1000) + " Thousand")
        n %= 1000
    if n > 0:
        words.append(get_words(n))
        
    return " ".join(words) + " Rupees Only"

def format_inr(v):
    """
    Format numeric value using standard comma grouping with exact 2 decimal places:
    1,000.00
    10,000.00
    100,000.00
    1,000,000.00
    10,000,000.00
    """
    try:
        val = float(v or 0)
    except (ValueError, TypeError):
        return "0.00"
    return f"{val:,.2f}"

class InvoicePDFTemplate(SimpleDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=110, bottomMargin=40, **kw)
        
def draw_watermark_and_header(canvas_obj, doc):
    canvas_obj.saveState()
    
    # Draw Watermark
    canvas_obj.setFont("Helvetica-Bold", 38)
    canvas_obj.setFillColor(colors.lightgrey, alpha=0.18)
    canvas_obj.translate(A4[0]/2, A4[1]/2)
    canvas_obj.rotate(45)
    canvas_obj.drawCentredString(0, 0, "REON ENERGIES PRIVATE LIMITED")
    canvas_obj.rotate(-45)
    canvas_obj.translate(-A4[0]/2, -A4[1]/2)
    canvas_obj.setFillColor(colors.black, alpha=1.0)

    # Top Left Logo & Company Name
    logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'logo_latest.png')
    if not os.path.exists(logo_path):
        logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'admin-logo.jpg')
    if not os.path.exists(logo_path):
        logo_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'logo_latest.png')
        
    if os.path.exists(logo_path):
        canvas_obj.drawImage(logo_path, 30, A4[1] - 90, width=110, height=70, preserveAspectRatio=True, mask='auto', anchor='sw')
        canvas_obj.setFont("Helvetica-Bold", 20)
        canvas_obj.setFillColor(colors.HexColor("#1B2D5B")) # REON Navy
        canvas_obj.drawString(150, A4[1] - 55, "REON ENERGIES PRIVATE LIMITED")

    canvas_obj.restoreState()

def get_signature_image(data):
    """
    Search for authorized signature image file on disk.
    Supports authorizedSignaturePath, local upload URLs, or default active signature.
    """
    sig_path = data.get('authorizedSignaturePath')
    if not sig_path and data.get('authorizedSignatureUrl'):
        url = str(data.get('authorizedSignatureUrl'))
        if '/signatures/' in url or '/uploads/' in url:
            parts = url.split('/')
            filename = parts[-1]
            candidate = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'signatures', filename)
            if os.path.exists(candidate):
                sig_path = candidate

    if not sig_path:
        default_candidate = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'signatures', 'active_signature.png')
        if os.path.exists(default_candidate):
            sig_path = default_candidate

    if sig_path and os.path.exists(sig_path):
        try:
            return RLImage(sig_path, width=105, height=42, preserveAspectRatio=True)
        except Exception as e:
            print(f"Warning: Could not load signature image: {e}", file=sys.stderr)
    return None

def generate_pdf(output_path, data):
    styles = getSampleStyleSheet()
    
    styleN = styles["Normal"]
    styleN.fontSize = 8.5
    styleN.leading = 11.5
    
    styleH = styles["Heading1"]
    styleH.alignment = TA_CENTER
    styleH.textColor = colors.HexColor("#1B2D5B") # REON Navy
    styleH.fontSize = 17
    styleH.fontName = 'Helvetica-Bold'
    
    styleBold = ParagraphStyle('Bold', parent=styleN, fontName='Helvetica-Bold')
    styleRight = ParagraphStyle('Right', parent=styleN, alignment=TA_RIGHT)
    styleCenter = ParagraphStyle('Center', parent=styleN, alignment=TA_CENTER)
    
    doc = InvoicePDFTemplate(output_path)
    story = []
    
    is_proforma = bool(
        data.get('isProforma') or 
        data.get('is_proforma') or 
        data.get('documentType') == 'PROFORMA INVOICE'
    )
    doc_title = "PROFORMA INVOICE" if is_proforma else "TAX INVOICE"
    
    # Header Title
    story.append(Paragraph(doc_title, styleH))
    story.append(Spacer(1, 10))
    
    c_details = data.get('companyDetails', {})
    cust_details = data.get('customerDetails', {})
    ship_details = data.get('shipToDetails') or {}
    same_as_bill_to = data.get('sameAsBillTo', True)
    if same_as_bill_to or not ship_details:
        ship_details = cust_details

    i_details = data.get('invoiceDetails', {})
    
    # Document reference rows
    invoice_no = i_details.get('proformaInvoiceNo') if is_proforma else i_details.get('invoiceNo', '')
    if not invoice_no:
        invoice_no = i_details.get('invoiceNo', '')
        
    date_label = "Date" if is_proforma else "Invoice Date"
    date_val = i_details.get('invoiceDate', '')
    
    validity_or_due_label = "Valid Until" if is_proforma else "Due Date"
    validity_or_due_val = (i_details.get('validUntil') or i_details.get('dueDate', '')) if is_proforma else i_details.get('dueDate', '')

    quotation_ref = data.get('quotationNo') or data.get('quotation_no') or ''
    proforma_ref = data.get('proformaInvoiceNo') or data.get('proforma_invoice_no') or ''
    eway_bill = i_details.get('ewayBillNumber', '')

    right_info_lines = [
        f"<b>{doc_title} No:</b> {invoice_no}",
        f"<b>{date_label}:</b> {date_val}",
    ]
    if validity_or_due_val:
        right_info_lines.append(f"<b>{validity_or_due_label}:</b> {validity_or_due_val}")
    if quotation_ref:
        right_info_lines.append(f"<b>Quotation Ref:</b> {quotation_ref}")
    if not is_proforma and proforma_ref:
        right_info_lines.append(f"<b>Proforma Ref:</b> {proforma_ref}")
    if eway_bill:
        right_info_lines.append(f"<b>E-way Bill:</b> {eway_bill}")

    # Build Ship To Address Text
    ship_name = ship_details.get('companyName') or ship_details.get('name', '') or cust_details.get('name', '')
    recipient = ship_details.get('recipientName', '')
    ship_lines = [f"<b>{ship_name}</b>"]
    if recipient and recipient != ship_name:
        ship_lines.append(f"Attn: {recipient}")
    if ship_details.get('address'):
        ship_lines.append(ship_details.get('address'))
    if ship_details.get('phone'):
        ship_lines.append(f"<b>Phone:</b> {ship_details.get('phone')}")
    if ship_details.get('email'):
        ship_lines.append(f"<b>Email:</b> {ship_details.get('email')}")
    if ship_details.get('gstin'):
        ship_lines.append(f"<b>GSTIN:</b> {ship_details.get('gstin')}")
    state_str = ship_details.get('state', '')
    if ship_details.get('pincode'):
        state_str = f"{state_str} - {ship_details.get('pincode')}" if state_str else ship_details.get('pincode')
    if state_str:
        ship_lines.append(f"<b>State:</b> {state_str}")

    cust_gstin_line = f"<b>GSTIN:</b> {cust_details.get('gstin')}<br/>" if cust_details.get('gstin') else ""

    header_data = [
        [
            Paragraph(f"<b>REON ENERGIES PRIVATE LIMITED</b><br/>"
                      f"Address : Singherbheri, Singur, Hooghly, West Bengal, 712409<br/>"
                      f"<b>Contact:</b> 8436649991 | <b>Email:</b> info@reonenergy.in<br/>"
                      f"<b>Website:</b> www.reonenergy.in | <b>GSTIN:</b> {c_details.get('gstin', '19AAPCR6346E2ZX')}", styleN),
            Paragraph("<br/>".join(right_info_lines), styleN)
        ],
        [
            Paragraph("<b>Bill To:</b>", styleBold),
            Paragraph("<b>Ship To:</b>" + (" <font size=7 color='#6B7280'>(Same as Bill To)</font>" if same_as_bill_to else ""), styleBold)
        ],
        [
            Paragraph(f"<b>{cust_details.get('name', '')}</b><br/>"
                      f"{cust_details.get('address', '')}<br/>"
                      f"<b>Phone:</b> {cust_details.get('phone', '')}<br/>"
                      f"<b>Email:</b> {cust_details.get('email', '')}<br/>"
                      f"{cust_gstin_line}"
                      f"<b>State:</b> {cust_details.get('state', '')}", styleN),
            Paragraph("<br/>".join(ship_lines), styleN)
        ]
    ]
    
    t_header = Table(header_data, colWidths=[doc.width/2.0]*2)
    t_header.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5.5),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#F3F4F6")),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 12))
    
    # ── Items Table ──────────────────────────────────────────
    items = data.get('items', [])
    items_table_data = [
        ["S.No", "Description of Goods / Services", "HSN", "Qty", "Rate (₹)", "Tax %", "CGST (₹)", "SGST (₹)", "Amount (₹)"]
    ]
    
    for idx, item in enumerate(items):
        item_qty = float(item.get('quantity', 0))
        item_rate = float(item.get('rate', 0))
        item_total = item_qty * item_rate
        tax_pct = float(item.get('tax', 0))
        cgst_amt = item_total * (tax_pct/2 / 100)
        sgst_amt = item_total * (tax_pct/2 / 100)
        final_amt = item_total + cgst_amt + sgst_amt
        
        desc_text = f"<b>{item.get('name', '')}</b>"
        if item.get('description'):
            desc_text += f"<br/><font size=7.5 color='#4B5563'>{item.get('description')}</font>"
        desc_p = Paragraph(desc_text, styleN)
        hsn_p = Paragraph(str(item.get('hsn', '')), styleCenter)
        
        items_table_data.append([
            str(idx+1),
            desc_p,
            hsn_p,
            f"{item_qty:g} {item.get('unit', 'Nos')}".strip(),
            format_inr(item_rate),
            f"{tax_pct:g}%",
            format_inr(cgst_amt),
            format_inr(sgst_amt),
            format_inr(final_amt)
        ])
    
    # Loading & Forwarding Charges if any
    loading_charge = float(data.get('charges', {}).get('loadingCharges', 0))
    if loading_charge > 0:
        items_table_data.append([
            "",
            Paragraph("<b>Loading & Forwarding Charges</b>", styleN),
            "", "", "", "", "", "",
            format_inr(loading_charge)
        ])
    
    # Totals Row
    cgstTotal = float(data.get('cgstTotal', 0))
    sgstTotal = float(data.get('sgstTotal', 0))
    grandTotal = float(data.get('grandTotal', 0))
    
    items_table_data.append([
        "",
        Paragraph("<b>Total Grand Amount</b>", styleBold),
        "", "", "", "",
        format_inr(cgstTotal),
        format_inr(sgstTotal),
        format_inr(grandTotal)
    ])
    
    # Col widths sum = 25+145+60+35+55+35+55+55+70 = 535 pt (Exactly matching doc.width A4 margins)
    t_items = Table(items_table_data, colWidths=[25, 145, 60, 35, 55, 35, 55, 55, 70], repeatRows=1)
    t_items.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#1B2D5B")), # Complete outer rectangular border
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1B2D5B")), # Professional REON Navy header
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,1), (0,-1), 'CENTER'),
        ('ALIGN', (3,1), (3,-1), 'CENTER'),
        ('ALIGN', (5,1), (5,-1), 'CENTER'),
        ('ALIGN', (4,1), (4,-1), 'RIGHT'),
        ('ALIGN', (6,1), (8,-1), 'RIGHT'),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#F3F4F6")),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor("#1B2D5B")),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 10))

    # ── HSN / SAC Summary Table ──────────────────────────────
    hsn_summary = {}
    for item in items:
        hsn = str(item.get('hsn', ''))
        if not hsn: continue
        tax_pct = float(item.get('tax', 0))
        taxable = float(item.get('quantity', 0)) * float(item.get('rate', 0))
        key = f"{hsn}_{tax_pct}"
        if key not in hsn_summary:
            hsn_summary[key] = {'hsn': hsn, 'taxable': 0, 'tax_pct': tax_pct}
        hsn_summary[key]['taxable'] += taxable

    if hsn_summary:
        hsn_table_data = [
            ["HSN/SAC", "Taxable Value (₹)", "CGST", "", "SGST/UTGST", "", "Total Tax (₹)"],
            ["", "", "Rate", "Amount (₹)", "Rate", "Amount (₹)", ""]
        ]
        
        tot_taxable = 0
        tot_cgst = 0
        tot_sgst = 0
        
        for k, hdata in hsn_summary.items():
            taxable = hdata['taxable']
            tax_pct = hdata['tax_pct']
            cgst_amt = taxable * (tax_pct/2 / 100)
            sgst_amt = taxable * (tax_pct/2 / 100)
            total_tax_amt = cgst_amt + sgst_amt
            
            hsn_table_data.append([
                hdata['hsn'],
                format_inr(taxable),
                f"{tax_pct/2:g}%" if tax_pct > 0 else "0%",
                format_inr(cgst_amt),
                f"{tax_pct/2:g}%" if tax_pct > 0 else "0%",
                format_inr(sgst_amt),
                format_inr(total_tax_amt)
            ])
            tot_taxable += taxable
            tot_cgst += cgst_amt
            tot_sgst += sgst_amt
            
        hsn_table_data.append([
            Paragraph("<b>Total</b>", ParagraphStyle('R', parent=styleN, alignment=TA_RIGHT)),
            format_inr(tot_taxable),
            "",
            format_inr(tot_cgst),
            "",
            format_inr(tot_sgst),
            format_inr(tot_cgst + tot_sgst)
        ])
        
        t_hsn = Table(hsn_table_data, colWidths=[90, 85, 45, 75, 55, 75, 110])
        t_hsn.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
            ('ALIGN', (0,0), (0,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('SPAN', (0,0), (0,1)),
            ('SPAN', (1,0), (1,1)),
            ('SPAN', (2,0), (3,0)),
            ('SPAN', (4,0), (5,0)),
            ('SPAN', (6,0), (6,1)),
            ('BACKGROUND', (0,0), (-1,1), colors.HexColor("#F3F4F6")),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_hsn)
        story.append(Spacer(1, 10))
    
    # Amount in words
    amount_words = num_to_words(grandTotal)
    story.append(Paragraph(f"<b>Amount in Words:</b> {amount_words}", styleN))
    story.append(Spacer(1, 14))
    
    # ── Bank Details, QR & Signatory Section ───────────────────
    qr_img = None
    qr_candidate = os.path.join(os.path.dirname(__file__), 'qr_reon.png')
    if os.path.exists(qr_candidate):
        try:
            qr_img = RLImage(qr_candidate, width=55, height=55, preserveAspectRatio=True)
        except Exception:
            qr_img = None

    bank_details_p = Paragraph(
        "<b>Company's Bank Details:</b><br/>"
        "Account Name: <b>REON ENERGIES PRIVATE LIMITED</b><br/>"
        "Bank Name: Punjab National Bank<br/>"
        "A/c No.: <b>0162202100001274</b><br/>"
        "Branch & IFSC Code: Singur & <b>PUNB0016220</b><br/>"
        "UPI ID: <b>8436649991m@pnb</b>",
        styleN
    )

    if qr_img:
        bank_box = Table(
            [[bank_details_p, Table([[qr_img], [Paragraph("<font size=6 color='#4B5563'>Scan to Pay (UPI)</font>", styleCenter)]], colWidths=[65])]],
            colWidths=[200, 65]
        )
        bank_box.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (1,0), (1,0), 'CENTER'),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))
    else:
        bank_box = bank_details_p

    # Signatory Cell
    sig_img = get_signature_image(data)
    sig_cell_elements = [
        Paragraph("For <b>REON ENERGIES PRIVATE LIMITED</b>", styleRight),
        Spacer(1, 3)
    ]
    if sig_img:
        sig_cell_elements.append(sig_img)
        sig_cell_elements.append(Spacer(1, 2))
    else:
        sig_cell_elements.append(Spacer(1, 32))

    # Exact required caption underneath signature
    sig_cell_elements.append(Paragraph("<font size=7 color='#4B5563'>System-generated bill signed attached</font>", styleRight))
    sig_cell_elements.append(Paragraph("<b>Authorised Signatory</b>", styleRight))

    bank_data = [
        [
            bank_box,
            Paragraph("<b>Declaration:</b><br/>We declare that this invoice shows the actual price of the "
                      "goods described and that all particulars are true and correct.", styleN)
        ],
        [
            Paragraph("<br/><br/><b>Customer's Seal and Signature</b>", styleN),
            sig_cell_elements
        ]
    ]
    t_bank = Table(bank_data, colWidths=[doc.width/2.0]*2)
    t_bank.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('VALIGN', (0,0), (-1,0), 'TOP'),
        ('VALIGN', (0,1), (-1,1), 'BOTTOM'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(KeepTogether(t_bank))
    
    # Build Document
    doc.build(story, onFirstPage=draw_watermark_and_header, onLaterPages=draw_watermark_and_header)
    print(f"Successfully generated PDF at {output_path}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True, help="Path to save the PDF file")
    args = parser.parse_args()

    json_str = os.environ.get('REON_INVOICE_JSON')
    if not json_str:
        print("Error: REON_INVOICE_JSON environment variable not set.", file=sys.stderr)
        sys.exit(1)

    try:
        data = json.loads(json_str)
        generate_pdf(args.output, data)
    except Exception as e:
        print(f"Failed during generation: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
