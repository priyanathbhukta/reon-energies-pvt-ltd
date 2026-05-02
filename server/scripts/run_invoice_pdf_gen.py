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
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage, KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.pdfgen import canvas
except ImportError:
    print("Error: Missing reportlab. Run: pip install reportlab", file=sys.stderr)
    sys.exit(1)

def num_to_words(n):
    # A simple implementation for converting integer amount to words (Indian numbering system)
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

class InvoicePDFTemplate(SimpleDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=110, bottomMargin=40, **kw)
        
def draw_watermark_and_header(canvas_obj, doc):
    canvas_obj.saveState()
    
    # Draw Watermark
    canvas_obj.setFont("Helvetica-Bold", 40)
    canvas_obj.setFillColor(colors.lightgrey, alpha=0.2)
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
        
    if os.path.exists(logo_path):
        # Increased logo size (width=110, height=70) and shifted slightly lower to fit
        canvas_obj.drawImage(logo_path, 30, A4[1] - 90, width=110, height=70, preserveAspectRatio=True, mask='auto', anchor='sw')
        
        # Add company name next to it, increased font size
        canvas_obj.setFont("Helvetica-Bold", 22)
        canvas_obj.setFillColor(colors.HexColor("#1B2D5B")) # REON Navy
        canvas_obj.drawString(150, A4[1] - 55, "REON ENERGIES PRIVATE LIMITED")

    canvas_obj.restoreState()

def generate_pdf(output_path, data):
    styles = getSampleStyleSheet()
    
    styleN = styles["Normal"]
    styleN.fontSize = 9
    
    styleH = styles["Heading1"]
    styleH.alignment = TA_CENTER
    styleH.textColor = colors.HexColor("#1e3a8a") # navy
    styleH.fontSize = 16
    
    styleBold = ParagraphStyle('Bold', parent=styleN, fontName='Helvetica-Bold')
    styleRight = ParagraphStyle('Right', parent=styleN, alignment=TA_RIGHT)
    styleCenter = ParagraphStyle('Center', parent=styleN, alignment=TA_CENTER)
    
    doc = InvoicePDFTemplate(output_path)
    story = []
    
    # Header
    story.append(Paragraph("TAX INVOICE", styleH))
    story.append(Spacer(1, 10))
    
    c_details = data.get('companyDetails', {})
    cust_details = data.get('customerDetails', {})
    i_details = data.get('invoiceDetails', {})
    
    # Bill To / Ship To / Invoice Details Table
    # Replaced company details parsing to include the fixed values just in case they aren't provided by frontend properly
    header_data = [
        [
            Paragraph(f"<b>REON ENERGIES PRIVATE LIMITED</b><br/>"
                      f"Address : Singherbheri, Singur, Hooghly, West Bengal, 712409<br/>"
                      f"<b>Contact no:</b> 8436649991 | <b>Email:</b> info@reonenergy.in | <b>Website:</b> www.reonenergy.in<br/>"
                      f"<b>GSTIN:</b> {c_details.get('gstin', '')}", styleN),
            Paragraph(f"<b>Invoice No:</b> {i_details.get('invoiceNo', '')}<br/>"
                      f"<b>Invoice Date:</b> {i_details.get('invoiceDate', '')}<br/>"
                      f"<b>Due Date:</b> {i_details.get('dueDate', '')}<br/>"
                      f"<b>E-way Bill:</b> {i_details.get('ewayBillNumber', '')}", styleN)
        ],
        [
            Paragraph("<b>Bill To:</b>", styleBold),
            Paragraph("<b>Ship To:</b>", styleBold)
        ],
        [
            Paragraph(f"<b>{cust_details.get('name', '')}</b><br/>{cust_details.get('address', '')}<br/><b>Phone:</b> {cust_details.get('phone', '')}<br/><b>Email:</b> {cust_details.get('email', '')}<br/><b>GSTIN:</b> {cust_details.get('gstin', '')}<br/><b>State:</b> {cust_details.get('state', '')}", styleN),
            Paragraph(f"<b>{cust_details.get('name', '')}</b><br/>{cust_details.get('address', '')}<br/><b>Phone:</b> {cust_details.get('phone', '')}<br/><b>Email:</b> {cust_details.get('email', '')}<br/><b>State:</b> {cust_details.get('state', '')}", styleN)
        ]
    ]
    
    t_header = Table(header_data, colWidths=[doc.width/2.0]*2)
    t_header.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.grey),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.grey),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#f3f4f6")),
        ('SPAN', (0,0), (0,0)), # Just explicit noting
    ]))
    story.append(t_header)
    story.append(Spacer(1, 15))
    
    # Items Table
    items = data.get('items', [])
    items_table_data = [
        ["S.No", "Description", "HSN", "Qty", "Rate", "Tax", "CGST", "SGST", "Amount"]
    ]
    
    def amt(v): return f"{float(v or 0):.2f}"
    
    for idx, item in enumerate(items):
        item_total = float(item.get('quantity', 0)) * float(item.get('rate', 0))
        tax_pct = float(item.get('tax', 0))
        cgst_amt = item_total * (tax_pct/2 / 100)
        sgst_amt = item_total * (tax_pct/2 / 100)
        final_amt = item_total + cgst_amt + sgst_amt
        
        desc_p = Paragraph(f"<b>{item.get('name', '')}</b><br/><font size=8 color=gray>{item.get('description', '')}</font>", styleN)
        hsn_p = Paragraph(str(item.get('hsn', '')), styleN)
        
        items_table_data.append([
            str(idx+1),
            desc_p,
            hsn_p,
            f"{item.get('quantity', 0)} {item.get('unit', '')}".strip(),
            amt(item.get('rate', 0)),
            f"{item.get('tax', 0)}%",
            amt(cgst_amt),
            amt(sgst_amt),
            amt(final_amt)
        ])
    
    # Add Loading Charges if any
    loading_charge = float(data.get('charges', {}).get('loadingCharges', 0))
    if loading_charge > 0:
        items_table_data.append(["", "Loading & Forwarding Charges", "", "", "", "", "", "", amt(loading_charge)])
    
    # Totals Row
    subtotal = float(data.get('subtotal', 0))
    cgstTotal = float(data.get('cgstTotal', 0))
    sgstTotal = float(data.get('sgstTotal', 0))
    grandTotal = float(data.get('grandTotal', 0))
    
    items_table_data.append([
        "", "Total", "", "", "", "",
        amt(cgstTotal), amt(sgstTotal), amt(grandTotal)
    ])
    
    t_items = Table(items_table_data, colWidths=[25, 145, 60, 35, 55, 35, 55, 55, 70])
    t_items.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.grey),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#10b981")), # Emerald green header
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (2,1), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (1,-1), 'LEFT'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.grey),
    ]))
    
    story.append(t_items)
    story.append(Spacer(1, 10))

    # ---- HSN / SAC Summary Table ----
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
            ["HSN/SAC", "Taxable\nValue", "CGST", "", "SGST/UTGST", "", "Total\nTax Amount"],
            ["", "", "Rate", "Amount", "Rate", "Amount", ""]
        ]
        
        tot_taxable = 0
        tot_cgst = 0
        tot_sgst = 0
        
        for k, data in hsn_summary.items():
            taxable = data['taxable']
            tax_pct = data['tax_pct']
            cgst_amt = taxable * (tax_pct/2 / 100)
            sgst_amt = taxable * (tax_pct/2 / 100)
            total_tax_amt = cgst_amt + sgst_amt
            
            hsn_table_data.append([
                data['hsn'],
                amt(taxable),
                f"{tax_pct/2}%" if tax_pct > 0 else "0%",
                amt(cgst_amt),
                f"{tax_pct/2}%" if tax_pct > 0 else "0%",
                amt(sgst_amt),
                amt(total_tax_amt)
            ])
            tot_taxable += taxable
            tot_cgst += cgst_amt
            tot_sgst += sgst_amt
            
        hsn_table_data.append([
            Paragraph("<b>Total</b>", ParagraphStyle('R', parent=styleN, alignment=TA_RIGHT)),
            amt(tot_taxable),
            "",
            amt(tot_cgst),
            "",
            amt(tot_sgst),
            amt(tot_cgst + tot_sgst)
        ])
        
        t_hsn = Table(hsn_table_data, colWidths=[90, 80, 50, 70, 60, 70, 90])
        t_hsn.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.grey),
            ('INNERGRID', (0,0), (-1,-1), 1, colors.grey),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
            ('ALIGN', (0,0), (0,0), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('SPAN', (0,0), (0,1)),
            ('SPAN', (1,0), (1,1)),
            ('SPAN', (2,0), (3,0)),
            ('SPAN', (4,0), (5,0)),
            ('SPAN', (6,0), (6,1)),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ]))
        story.append(t_hsn)
        story.append(Spacer(1, 10))
    # ---------------------------------
    
    # Amount in words
    amount_words = num_to_words(grandTotal)
    story.append(Paragraph(f"<b>Amount in Words:</b> {amount_words}", styleN))
    story.append(Spacer(1, 20))
    
    # Footer Section (Bank Details & Terms)
    bank_data = [
        [
            Paragraph("<b>Company's Bank Details:</b><br/>"
                      f"Bank Name: Punjab National Bank<br/>"
                      f"A/c No.: 0162202100001274<br/>"
                      f"Branch & IFS Code: Singur & PUNB0016220", styleN),
            Paragraph("<b>Declaration:</b><br/>We declare that this invoice shows the actual price of the "
                      "goods described and that all particulars are true and correct.", styleN)
        ],
        [
            Paragraph("<br/><br/><br/><b>Customer's Seal and Signature</b>", styleN),
            Paragraph(f"For <b>REON ENERGIES PRIVATE LIMITED</b><br/><br/><br/><br/><br/><b>Authorised Signatory</b>", styleRight)
        ]
    ]
    t_bank = Table(bank_data, colWidths=[doc.width/2.0]*2)
    t_bank.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.grey),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.grey),
        ('VALIGN', (0,0), (-1,0), 'TOP'),
        ('VALIGN', (0,1), (-1,1), 'BOTTOM'),
        ('ALIGN', (1,1), (1,1), 'RIGHT'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    # Use KeepTogether so Bank Details & Signature don't break across pages
    story.append(KeepTogether(t_bank))
    
    # Generate
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
