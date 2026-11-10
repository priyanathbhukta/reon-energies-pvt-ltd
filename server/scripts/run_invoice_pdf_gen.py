#!/usr/bin/env python3
"""
REON ENERGIES PVT LTD - Proforma Invoice & Tax Invoice PDF Generator
Generates high-precision, standard accounting A4 invoices with:
- Top-left official REON logo
- 8-column items table: Sl. No., Description, HSN / SSN, Qty, Per, Rate, GST, Invoice Value
- Centered table headers (horizontal & vertical)
- Bill To / Ship To without "Same as Bill To" text in PDF
- Strict INR currency formatting (₹1,000.00, ₹100,000.00, ₹1,000,000.00)
- State-based automatic GST logic:
    * West Bengal: CGST = Rate/2, SGST = Rate/2, IGST = 0%
    * Other States (Assam, Bihar, etc.): IGST = Rate, CGST = 0%, SGST = 0%
- Dynamic GST Summary Table & Financial Summary
- Zero POS name / operator information in customer-facing PDF
- Bank details with QR_REON & UPI ID: 8436649991m@pnb
- System-generated bill signed attached caption & Authorized Signatory
"""

import json
import os
import sys
import re
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
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    print("Error: Missing reportlab. Run: pip install reportlab", file=sys.stderr)
    sys.exit(1)

# ── Font Registration for Unicode & Indian Rupee (₹) Symbol ─────────────────
font_dir = os.path.join(os.path.dirname(__file__), 'fonts')
bundled_reg = os.path.join(font_dir, 'DejaVuSans.ttf')
bundled_bold = os.path.join(font_dir, 'DejaVuSans-Bold.ttf')

_FONT_CHOICES = [
    # 1. Bundled DejaVu fonts in server/scripts/fonts (100% reliable on every OS & Render)
    (bundled_reg, bundled_bold),
    # 2. Linux / Render system fonts
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/freefont/FreeSans.ttf", "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"),
    ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    # 3. Windows system fonts (Arial, Segoe UI)
    ("C:\\Windows\\Fonts\\arial.ttf", "C:\\Windows\\Fonts\\arialbd.ttf"),
    ("C:\\Windows\\Fonts\\segoeui.ttf", "C:\\Windows\\Fonts\\segoeuib.ttf"),
    # 4. Mac fonts
    ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ("/Library/Fonts/Arial.ttf", "/Library/Fonts/Arial Bold.ttf")
]

FN_REG = "Helvetica"
FN_BOLD = "Helvetica-Bold"
RUPEE_PREFIX = "₹"

def _register_fonts():
    global FN_REG, FN_BOLD, RUPEE_PREFIX
    for r_path, b_path in _FONT_CHOICES:
        if os.path.exists(r_path) and os.path.exists(b_path):
            try:
                pdfmetrics.registerFont(TTFont("ReonFont", r_path))
                pdfmetrics.registerFont(TTFont("ReonFont-Bold", b_path))
                pdfmetrics.registerFontFamily("ReonFont", normal="ReonFont", bold="ReonFont-Bold")
                FN_REG = "ReonFont"
                FN_BOLD = "ReonFont-Bold"
                RUPEE_PREFIX = "₹"
                return True
            except Exception as e:
                print(f"Font registration notice for {r_path}: {e}", file=sys.stderr)
                continue
    # Fallback if no TTF font found
    RUPEE_PREFIX = "Rs. "
    return False

_register_fonts()

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
        
    return "INR " + " ".join(words) + " Rupees Only"

def format_inr(v, symbol=True):
    """
    Format numeric value using standard comma grouping with exact 2 decimal places:
    ₹1,000.00
    ₹10,000.00
    ₹100,000.00
    ₹1,000,000.00
    ₹10,000,000.00
    """
    try:
        val = float(v or 0)
    except (ValueError, TypeError):
        val = 0.0
    s = f"{val:,.2f}"
    return f"{RUPEE_PREFIX}{s}" if symbol else s

def is_west_bengal(state_str, gstin=""):
    """
    Determine if customer's Bill To state is West Bengal.
    State code 19 in GSTIN indicates West Bengal.
    Normalized string comparison against West Bengal, WB, etc.
    """
    if gstin and str(gstin).strip().startswith("19"):
        return True
    if not state_str:
        return True # Default to West Bengal if not provided
    s = "".join(c for c in str(state_str).lower() if c.isalnum())
    return s in ["westbengal", "wb", "paschimbanga", "westbengal712409"]

def sanitize_customer_text(text):
    """
    Remove any POS references or internal notes from customer-facing text.
    """
    if not text:
        return ""
    cleaned = re.sub(r'\s*\((?:POS|pos)[^)]*\)', '', str(text))
    cleaned = re.sub(r'\s*\(Direct\)', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bPOS\s*Partner:?[^\n,]*', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

class InvoicePDFTemplate(SimpleDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(
            filename,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=35,
            **kw
        )

def draw_watermark(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont(FN_BOLD, 36)
    canvas_obj.setFillColor(colors.lightgrey, alpha=0.10)
    canvas_obj.translate(A4[0]/2, A4[1]/2)
    canvas_obj.rotate(45)
    canvas_obj.drawCentredString(0, 0, "REON ENERGIES PRIVATE LIMITED")
    canvas_obj.rotate(-45)
    canvas_obj.translate(-A4[0]/2, -A4[1]/2)
    canvas_obj.restoreState()

def get_signature_image(data):
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
            return RLImage(sig_path, width=110, height=45)
        except Exception as e:
            print(f"Warning: Could not load signature image: {e}", file=sys.stderr)
    return None

def get_logo_image():
    """
    Search for official REON logo asset.
    """
    candidates = [
        os.path.join(os.path.dirname(__file__), 'reon_logo.png'),
        os.path.join(os.path.dirname(__file__), 'REON_ENERGIES.png'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'admin', 'public', 'reon_logo.png'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'web', 'public', 'logo_latest.png'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'web', 'public', 'logo_final_cropped.png'),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                # 447 x 209 aspect ratio -> width=105, height=49
                return RLImage(p, width=105, height=49)
            except Exception as e:
                print(f"Warning: Failed to load logo {p}: {e}", file=sys.stderr)
    return None

def safe_float(val, default=0.0):
    try:
        if val is None or val == '':
            return default
        return float(val)
    except (ValueError, TypeError):
        return default

def get_qr_image():
    """
    Search for official REON UPI QR code image asset.
    """
    candidates = [
        os.path.join(os.path.dirname(__file__), 'qr_reon.png'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'admin', 'public', 'qr_reon.png'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'pos', 'public', 'qr_reon.png'),
        os.path.join(os.path.dirname(__file__), '..', 'public', 'qr_reon.png'),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return RLImage(p, width=65, height=65)
            except Exception as e:
                print(f"Warning: Failed to load QR code {p}: {e}", file=sys.stderr)
    return None

def generate_pdf(output_path, data):
    styles = getSampleStyleSheet()
    
    styleN = ParagraphStyle('DocNormal', parent=styles['Normal'], fontName=FN_REG, fontSize=8.5, leading=11.5, textColor=colors.HexColor("#1A1A2E"))
    styleBold = ParagraphStyle('DocBold', parent=styleN, fontName=FN_BOLD)
    styleRight = ParagraphStyle('DocRight', parent=styleN, alignment=TA_RIGHT)
    styleCenter = ParagraphStyle('DocCenter', parent=styleN, alignment=TA_CENTER)
    
    # Header styles
    styleDocTitle = ParagraphStyle(
        'DocTitle',
        parent=styleN,
        fontName=FN_BOLD,
        fontSize=18,
        leading=22,
        alignment=TA_RIGHT,
        textColor=colors.HexColor("#1B2D5B")
    )
    
    # Table Column Header Style - Vertically & Horizontally Centered
    styleTblHeader = ParagraphStyle(
        'TblHeader',
        parent=styleN,
        fontName=FN_BOLD,
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.white
    )

    doc = InvoicePDFTemplate(output_path)
    story = []
    
    doc_type = str(data.get('documentType', '')).strip().upper()
    if doc_type == 'TAX INVOICE':
        is_proforma = False
    elif doc_type == 'PROFORMA INVOICE':
        is_proforma = True
    else:
        is_proforma = bool(data.get('isProforma') or data.get('is_proforma'))
        if str(data.get('isProforma')).lower() == 'false' or str(data.get('is_proforma')).lower() == 'false':
            is_proforma = False

    doc_title = "PROFORMA INVOICE" if is_proforma else "TAX INVOICE" 
    
    c_details = data.get('companyDetails', {})
    cust_details = data.get('customerDetails', {})
    ship_details = data.get('shipToDetails') or {}
    same_as_bill_to = data.get('sameAsBillTo', True)
    if same_as_bill_to or not ship_details:
        ship_details = cust_details

    i_details = data.get('invoiceDetails', {})
    
    # Resolve Bill To State for GST Calculation (Ignore Ship To)
    bill_to_state = cust_details.get('state', 'West Bengal')
    bill_to_gstin = cust_details.get('gstin', '')
    intra_state = is_west_bengal(bill_to_state, bill_to_gstin)

    # Document reference values
    if not is_proforma:
        invoice_no = i_details.get('invoiceNo') or data.get('invoiceNo') or ''
        if not invoice_no and i_details.get('proformaInvoiceNo'):
            invoice_no = i_details.get('proformaInvoiceNo')
    else:
        invoice_no = i_details.get('proformaInvoiceNo') or i_details.get('invoiceNo') or data.get('proformaInvoiceNo') or ''
    if not invoice_no:
        invoice_no = i_details.get('invoiceNo', '')
        
    date_label = "Date" if is_proforma else "Invoice Date"
    date_val = i_details.get('invoiceDate', '')
    
    validity_or_due_label = "Valid Until" if is_proforma else "Due Date"
    validity_or_due_val = (i_details.get('validUntil') or i_details.get('dueDate', '')) if is_proforma else i_details.get('dueDate', '')

    quotation_ref = data.get('quotationNo') or data.get('quotation_no') or ''
    proforma_ref = data.get('proformaInvoiceNo') or data.get('proforma_invoice_no') or ''
    eway_bill = i_details.get('ewayBillNumber', '')

    # ── 1. Top Header Block: Logo, Company & Document Meta ──────────────────
    logo_img = get_logo_image()
    company_info_html = (
        f"<b><font size=10 color='#1B2D5B'>REON ENERGIES PRIVATE LIMITED</font></b><br/>"
        f"<font size=7.5 color='#374151'>"
        f"Singherbheri, Singur, Hooghly, West Bengal, 712409<br/>"
        f"<b>Contact:</b> 8436649991 | <b>Email:</b> info@reonenergy.in<br/>"
        f"<b>Website:</b> www.reonenergy.in<br/>"
        f"<b>GSTIN:</b> {c_details.get('gstin', '19AAPCR6346E2ZX')}<br/>"
        f"<b>CIN:</b> {c_details.get('cin', 'U43219WR2026PTC292640')}"
        f"</font>"
    )

    if logo_img:
        company_cell_table = Table(
            [[logo_img, Paragraph(company_info_html, styleN)]],
            colWidths=[110, 165]
        )
        company_cell_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))
        company_left_block = company_cell_table
    else:
        company_left_block = Paragraph(company_info_html, styleN)

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

    right_meta_block = [
        Paragraph(doc_title, styleDocTitle),
        Spacer(1, 4),
        Paragraph("<br/>".join(right_info_lines), styleRight)
    ]

    top_row_table = Table(
        [[company_left_block, right_meta_block]],
        colWidths=[280, 255]
    )
    top_row_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(top_row_table)
    story.append(Spacer(1, 10))

    # ── 2. BILL TO | SHIP TO (Without 'Same as Bill To' text) ────────────────
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
    ship_state_str = ship_details.get('state', '')
    if ship_details.get('pincode'):
        ship_state_str = f"{ship_state_str} - {ship_details.get('pincode')}" if ship_state_str else ship_details.get('pincode')
    if ship_state_str:
        ship_lines.append(f"<b>State:</b> {ship_state_str}")

    cust_gstin_line = f"<b>GSTIN:</b> {cust_details.get('gstin')}<br/>" if cust_details.get('gstin') else ""

    address_table_data = [
        [
            Paragraph("<b>BILL TO:</b>", styleBold),
            Paragraph("<b>SHIP TO:</b>", styleBold)
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
    t_address = Table(address_table_data, colWidths=[267.5, 267.5])
    t_address.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F3F4F6")),
    ]))
    story.append(t_address)
    story.append(Spacer(1, 10))

    # ── 3. Product / Service Table (8 Columns with Centered Headers) ─────────
    # Columns: Sl. No., Description, HSN / SSN, Qty, Per, Rate, GST, Invoice Value
    # Col Widths sum = 30 + 175 + 60 + 32 + 38 + 65 + 45 + 90 = 535 pt
    col_widths = [30, 175, 60, 32, 38, 65, 45, 90]
    
    header_row = [
        Paragraph("Sl. No.", styleTblHeader),
        Paragraph("Description", styleTblHeader),
        Paragraph("HSN / SSN", styleTblHeader),
        Paragraph("Qty", styleTblHeader),
        Paragraph("Per", styleTblHeader),
        Paragraph("Rate", styleTblHeader),
        Paragraph("GST", styleTblHeader),
        Paragraph("Invoice Value", styleTblHeader),
    ]
    items_table_data = [header_row]

    items = data.get('items', [])
    tot_taxable = 0.0
    tot_cgst = 0.0
    tot_sgst = 0.0
    tot_igst = 0.0

    # Rate-wise GST aggregation dictionary
    gst_rate_summary = {}

    for idx, item in enumerate(items):
        item_qty = safe_float(item.get('quantity'), 0.0)
        item_rate = safe_float(item.get('rate'), 0.0)
        item_taxable = item_qty * item_rate
        tot_taxable += item_taxable

        tax_pct = safe_float(item.get('tax'), 0.0)
        unit_str = str(item.get('unit') or item.get('per') or 'PCS').strip().upper()
        if unit_str == 'MTR2':
            unit_str = 'MTR²'

        # State-based GST calculation
        if intra_state:
            # West Bengal -> CGST + SGST (half and half), IGST = 0
            cgst_rate = tax_pct / 2.0
            sgst_rate = tax_pct / 2.0
            igst_rate = 0.0
            cgst_amt = item_taxable * (cgst_rate / 100.0)
            sgst_amt = item_taxable * (sgst_rate / 100.0)
            igst_amt = 0.0
        else:
            # Other state -> IGST = full tax_pct, CGST = 0, SGST = 0
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_rate = tax_pct
            cgst_amt = 0.0
            sgst_amt = 0.0
            igst_amt = item_taxable * (igst_rate / 100.0)

        tot_cgst += cgst_amt
        tot_sgst += sgst_amt
        tot_igst += igst_amt

        # Group for GST Summary
        if tax_pct not in gst_rate_summary:
            gst_rate_summary[tax_pct] = {'taxable': 0.0, 'cgst': 0.0, 'sgst': 0.0, 'igst': 0.0}
        gst_rate_summary[tax_pct]['taxable'] += item_taxable
        gst_rate_summary[tax_pct]['cgst'] += cgst_amt
        gst_rate_summary[tax_pct]['sgst'] += sgst_amt
        gst_rate_summary[tax_pct]['igst'] += igst_amt

        item_invoice_value = item_taxable

        # Sanitize item description to remove any POS operator text
        raw_name = sanitize_customer_text(item.get('name', ''))
        raw_desc = sanitize_customer_text(item.get('description', ''))
        desc_text = f"<b>{raw_name}</b>"
        if raw_desc:
            desc_text += f"<br/><font size=7 color='#4B5563'>{raw_desc}</font>"

        desc_p = Paragraph(desc_text, styleN)
        hsn_p = Paragraph(str(item.get('hsn', '') or '-'), styleCenter)

        items_table_data.append([
            str(idx + 1),
            desc_p,
            hsn_p,
            f"{item_qty:g}",
            unit_str,
            format_inr(item_rate),
            f"{tax_pct:g}%",
            format_inr(item_invoice_value)
        ])

    # Loading / Forwarding charges if any
    loading_charge = safe_float((data.get('charges') or {}).get('loadingCharges'), 0.0)
    if loading_charge > 0:
        items_table_data.append([
            "",
            Paragraph("<b>Loading & Forwarding Charges</b>", styleN),
            "", "", "", "", "",
            format_inr(loading_charge)
        ])

    # Subtotal Row in Product Table
    subtotal_with_loading = tot_taxable + loading_charge
    items_table_data.append([
        "",
        Paragraph("<b>Total Taxable Value</b>", styleBold),
        "", "", "", "", "",
        format_inr(subtotal_with_loading)
    ])

    t_items = Table(items_table_data, colWidths=col_widths, repeatRows=1)
    t_items.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('FONTNAME', (0,0), (-1,-1), FN_REG),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1B2D5B")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), FN_BOLD),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        # Alignment: Description: Left, HSN/Qty/Per/GST: Center, Rate/Invoice Value: Right
        ('ALIGN', (0,1), (0,-1), 'CENTER'),
        ('ALIGN', (1,1), (1,-1), 'LEFT'),
        ('ALIGN', (2,1), (2,-1), 'CENTER'),
        ('ALIGN', (3,1), (3,-1), 'CENTER'),
        ('ALIGN', (4,1), (4,-1), 'CENTER'),
        ('ALIGN', (5,1), (5,-1), 'RIGHT'),
        ('ALIGN', (6,1), (6,-1), 'CENTER'),
        ('ALIGN', (7,1), (7,-1), 'RIGHT'),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#F3F4F6")),
        ('FONTNAME', (0,-1), (-1,-1), FN_BOLD),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor("#1B2D5B")),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 10))

    # ── 4. GST Summary Table & Financial Summary Block (Side by Side) ───────
    # GST Summary Table:
    gst_summary_data = [
        [
            Paragraph("<b>GST Component</b>", styleBold),
            Paragraph("<b>Rate</b>", ParagraphStyle('H1', parent=styleBold, alignment=TA_CENTER)),
            Paragraph("<b>Amount</b>", ParagraphStyle('H2', parent=styleBold, alignment=TA_RIGHT)),
        ]
    ]

    sorted_rates = sorted(gst_rate_summary.keys())
    if not sorted_rates:
        sorted_rates = [18.0]

    if intra_state:
        gst_summary_data.append(["IGST", "0%", format_inr(0)])
        for r in sorted_rates:
            c_amt = gst_rate_summary.get(r, {}).get('cgst', 0.0)
            s_amt = gst_rate_summary.get(r, {}).get('sgst', 0.0)
            gst_summary_data.append([f"CGST ({r/2:g}%)", f"{r/2:g}%", format_inr(c_amt)])
            gst_summary_data.append([f"SGST ({r/2:g}%)", f"{r/2:g}%", format_inr(s_amt)])
    else:
        for r in sorted_rates:
            i_amt = gst_rate_summary.get(r, {}).get('igst', 0.0)
            gst_summary_data.append([f"IGST ({r:g}%)", f"{r:g}%", format_inr(i_amt)])
        gst_summary_data.append(["CGST", "0%", format_inr(0)])
        gst_summary_data.append(["SGST", "0%", format_inr(0)])

    total_tax_amt = tot_cgst + tot_sgst + tot_igst
    gst_summary_data.append([
        Paragraph("<b>Total Tax</b>", styleBold),
        "",
        format_inr(total_tax_amt)
    ])

    t_gst_summary = Table(gst_summary_data, colWidths=[115, 65, 95])
    t_gst_summary.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('FONTNAME', (0,0), (-1,-1), FN_REG),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F3F4F6")),
        ('FONTNAME', (0,0), (-1,0), FN_BOLD),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,1), (0,-1), 'LEFT'),
        ('ALIGN', (1,1), (1,-1), 'CENTER'),
        ('ALIGN', (2,1), (2,-1), 'RIGHT'),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#EBF9FB")),
        ('FONTNAME', (0,-1), (-1,-1), FN_BOLD),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))

    # Financial Summary Table
    grand_total = round(tot_taxable + total_tax_amt + loading_charge)
    fin_summary_data = [
        ["Subtotal", format_inr(tot_taxable)],
        ["Discount", format_inr(0)],
        ["Taxable Value", format_inr(tot_taxable)],
    ]
    if intra_state:
        fin_summary_data.append(["CGST", format_inr(tot_cgst)])
        fin_summary_data.append(["SGST", format_inr(tot_sgst)])
        fin_summary_data.append(["IGST (0%)", format_inr(0)])
    else:
        fin_summary_data.append(["IGST", format_inr(tot_igst)])
        fin_summary_data.append(["CGST (0%)", format_inr(0)])
        fin_summary_data.append(["SGST (0%)", format_inr(0)])

    if loading_charge > 0:
        fin_summary_data.append(["Loading / Forwarding", format_inr(loading_charge)])

    fin_summary_data.append([
        Paragraph("<b>Grand Total</b>", ParagraphStyle('GT', parent=styleBold, fontSize=9.5, textColor=colors.HexColor("#1B2D5B"))),
        Paragraph(f"<b>{format_inr(grand_total)}</b>", ParagraphStyle('GTR', parent=styleBold, fontSize=9.5, alignment=TA_RIGHT, textColor=colors.HexColor("#1B2D5B")))
    ])

    t_fin_summary = Table(fin_summary_data, colWidths=[130, 110])
    t_fin_summary.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('FONTNAME', (0,0), (-1,-1), FN_REG),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#FEF3C7")),
        ('FONTNAME', (0,-1), (-1,-1), FN_BOLD),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))

    # Place GST Summary and Financial Summary side by side
    combined_summary_table = Table(
        [[
            Table([[Paragraph("<b>GST SUMMARY</b>", styleBold)], [t_gst_summary]], colWidths=[275]),
            Table([[Paragraph("<b>FINANCIAL SUMMARY</b>", styleBold)], [t_fin_summary]], colWidths=[250])
        ]],
        colWidths=[280, 255]
    )
    combined_summary_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(combined_summary_table)
    story.append(Spacer(1, 10))

    # Amount in words
    amount_words = num_to_words(grand_total)
    story.append(Paragraph(f"<b>Amount in Words:</b> {amount_words}", styleN))
    story.append(Spacer(1, 12))

    # ── 5. Bank Details, QR & Signatory Section ─────────────────────────────
    qr_img = get_qr_image()

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
            [[
                bank_details_p,
                Table([[qr_img], [Paragraph("<font size=6 color='#4B5563'>Scan to Pay (UPI)</font>", styleCenter)]], colWidths=[70])
            ]],
            colWidths=[195, 70]
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
        sig_cell_elements.append(Spacer(1, 30))

    # Required caption and signatory label
    sig_cell_elements.append(Paragraph("<font size=7 color='#4B5563'>System-generated bill signed attached</font>", styleRight))
    sig_cell_elements.append(Paragraph("<b>Authorised Signatory</b>", styleRight))

    bank_data = [
        [
            bank_box,
            Paragraph("<b>Terms & Conditions:</b><br/>"
                      "1. Payment is due as per agreed milestone terms.<br/>"
                      "2. Goods once sold will be serviced as per standard warranty terms.<br/>"
                      "3. Subject to Singur, Hooghly jurisdiction.", styleN)
        ],
        [
            Paragraph("<br/><br/><b>Customer's Seal and Signature</b>", styleN),
            sig_cell_elements
        ]
    ]
    t_bank = Table(bank_data, colWidths=[267.5, 267.5])
    t_bank.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1B2D5B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('VALIGN', (0,0), (-1,0), 'TOP'),
        ('VALIGN', (0,1), (-1,1), 'BOTTOM'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    story.append(KeepTogether(t_bank))
    
    # Build Document with subtle watermark
    doc.build(story, onFirstPage=draw_watermark, onLaterPages=draw_watermark)
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
