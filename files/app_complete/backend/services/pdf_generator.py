"""
REON ENERGIES PVT LTD — Solar Quotation PDF Generator
======================================================
Public API:
    generate_quotation(data: dict, output_path: str) -> str

Page layout:
    Page 1  : Branded cover image with all customer/project fields overlaid
    Page 2  : Project summary + Commercial offer
    Page 3  : Technical Bill of Materials
    Page 4  : Scope of work + Testing checklist
    Page 5  : Warranty + Payment terms + T&C
    Page 6+ : Client references + Signature block

Dependencies: reportlab, pypdf, pillow
"""

import os
import math
import datetime as dt
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak, HRFlowable,
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader, PdfWriter

# ── Asset paths ───────────────────────────────────────────────────────────────
_HERE      = Path(__file__).resolve().parent
ASSETS_DIR = _HERE.parent.parent / "assets"
LOGO_PATH  = str(ASSETS_DIR / "logo.png")
COVER_PATH = str(ASSETS_DIR / "cover.png")
WATERMARK_PATH = str(ASSETS_DIR / "REON_ENERGIES.png")

DEJAVU_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DEJAVU_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

FONT_R, FONT_B = "Helvetica", "Helvetica-Bold"

# Register Unicode-capable fonts (needed for ₹ symbol)
def _register_fonts():
    global FONT_R, FONT_B
    try:
        pdfmetrics.registerFont(TTFont("DV",  DEJAVU_R))
        pdfmetrics.registerFont(TTFont("DVB", DEJAVU_B))
        pdfmetrics.registerFontFamily("DV", normal="DV", bold="DVB")
        FONT_R, FONT_B = "DV", "DVB"
    except Exception:
        pass  # fallback to Helvetica

_register_fonts()

# ── Brand palette ─────────────────────────────────────────────────────────────
NAVY       = HexColor("#1B2D5B")
ORANGE     = HexColor("#E8611A")
TEAL       = HexColor("#1A8FA0")
LIGHT_GRAY = HexColor("#F4F6FA")
MID_GRAY   = HexColor("#D8DDE8")
TEXT_DARK  = HexColor("#1A1A2E")
TEXT_MID   = HexColor("#4A4A6A")

# Cover overlay background colours (pixel-sampled from cover image)
BG_QUOT  = HexColor("#F1F5EF")   # quotation info box
DK_GREEN = HexColor("#1D3A1D")   # dark green matching form labels

PAGE_W, PAGE_H = A4
MARGIN    = 0.65 * inch
CONTENT_W = PAGE_W - 2 * MARGIN


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — COVER PAGE
# ═══════════════════════════════════════════════════════════════════════════════

def _parse_date(raw: str) -> dt.date:
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d %m %Y"):
        try:
            return dt.datetime.strptime(raw.strip(), fmt).date()
        except ValueError:
            pass
    return dt.date.today()


def _generate_cover(data: dict, out_path: str) -> None:
    """Overlay customer/project/quotation data onto the branded cover image.
    
    The new cover template has 'REPL/26-27/' pre-printed in the Quotation Info box.
    Only the sequence number (last digits, e.g. '110') is written into the blank.
    All other fields (customer name, address, etc.) are overlaid at their positions.
    """
    date_obj   = _parse_date(data.get("date", ""))
    valid_till = date_obj + dt.timedelta(days=30)

    date_dd, date_mm, date_yy = date_obj.strftime("%d"), date_obj.strftime("%m"), date_obj.strftime("%Y")
    till_dd, till_mm, till_yy = valid_till.strftime("%d"), valid_till.strftime("%m"), valid_till.strftime("%Y")

    # Extract just the sequence number (last part after final '/')
    offer_no_full = str(data.get("offer_no", ""))
    seq_no = offer_no_full.rsplit("/", 1)[-1] if "/" in offer_no_full else offer_no_full

    cv = canvas.Canvas(out_path, pagesize=A4)

    # Full-bleed background — new cover template
    cv.drawImage(COVER_PATH, 0, 0, width=PAGE_W, height=PAGE_H,
                 preserveAspectRatio=False)

    # ── Background colour helpers ─────────────────────────────────────────────
    BG_FIELD = HexColor("#F0F5EE")   # matches the light green form field background

    def wo(x, y, w, h, col=BG_FIELD):
        """White-out / erase a rectangle (cover pre-printed text or fill blank)."""
        cv.setFillColor(col)
        cv.rect(x, y, w, h, fill=1, stroke=0)

    # ── Field drawing helper ──────────────────────────────────────────────────
    def put(x, y, text, size=9, bold=True, col=DK_GREEN, max_w=None):
        text = str(text).strip()
        if FONT_R == "Helvetica":
            text = text.replace("₹", "Rs.")
        if not text:
            return
        cv.setFillColor(col)
        fn = FONT_B if bold else FONT_R
        fs = size
        if max_w:
            while cv.stringWidth(text, fn, fs) > max_w and fs > 6.5:
                fs -= 0.4
        cv.setFont(fn, fs)
        cv.drawString(x, y, text)

    # ─────────────────────────────────────────────────────────────────────────
    # COVER COORDINATE MAP — calibrated from visual dot-marker overlay check
    # cover.png: 1024 x 1449 px  →  A4: 595 x 842 pt  (origin = bottom-left)
    # ─────────────────────────────────────────────────────────────────────────

    # ── CUSTOMER DETAILS box (left) ───────────────────────────────────────────
    # Blank dash area starts AFTER the label text — position after colon+space
    put(195, 582, data.get("customer_name", "").upper(),              size=8.5, bold=True,  max_w=150)
    put(145, 563, data.get("address",  data.get("location", "")),     size=7.5, bold=False, max_w=195)
    put(205, 544, data.get("contact_number", ""),                     size=8.5, bold=False, max_w=140)
    put(120, 525, data.get("email", ""),                              size=7.5, bold=False, max_w=215)

    # ── QUOTATION INFO box (lower left) ───────────────────────────────────────
    # "REPL/26-27/" is PRE-PRINTED → write only the sequence number in the blank
    put(203, 460, seq_no,    size=9.5, bold=True,  col=DK_GREEN)

    # Date:  ___ / ___ / 2026   — fill DD and MM in the blank underlines
    put( 60, 441, date_dd,   size=9,   bold=False, col=DK_GREEN)
    put(115, 441, date_mm,   size=9,   bold=False, col=DK_GREEN)
    if date_yy != "2026":
        wo(152, 436, 44, 12)
        put(152, 441, date_yy, size=8.5, col=DK_GREEN)

    # Valid Till:  ___ / ___ / 2026
    put( 60, 424, till_dd,   size=9,   bold=False, col=DK_GREEN)
    put(115, 424, till_mm,   size=9,   bold=False, col=DK_GREEN)
    if till_yy != "2026":
        wo(152, 419, 44, 12)
        put(152, 424, till_yy, size=8.5, col=DK_GREEN)

    # ── PROJECT DETAILS box (right) ───────────────────────────────────────────
    # Right box labels: "Project Type:", "Proposed Capacity:", "Location:", etc.
    # Blank dashes start well after each label — shift x significantly right
    put(380, 582, data.get("project_category", "Residential"),        size=8.5, bold=False, max_w=190)
    cap_val = (str(data.get("capacity", ""))
               .replace("KWp","").replace("kWp","")
               .replace("KW","").replace("kW","").strip())
    put(438, 563, cap_val,                                             size=9,   bold=True,  max_w=50)
    proj_loc = (data.get("project_location")
                or data.get("address")
                or data.get("location", ""))
    put(360, 544, proj_loc,                                            size=7.5, bold=False, max_w=200)
    put(415, 528, data.get("electricity_provider", ""),                size=8,   bold=False, max_w=155)
    put(396, 512, data.get("monthly_bill", ""),                        size=8.5, bold=False, max_w=80)
    put(380, 495, data.get("power_factor", ""),                        size=8.5, bold=False, max_w=70)

    cv.save()



# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — BODY PAGE TEMPLATE (header + watermark + footer)
# ═══════════════════════════════════════════════════════════════════════════════

class _BodyTemplate:
    def __init__(self, offer_no: str):
        self.offer_no = offer_no

    def __call__(self, cv: canvas.Canvas, doc):
        cv.saveState()
        w, h = A4

        # Watermark
        cv.setFillAlpha(0.06)
        ls_w = 5.0 * inch
        cv.drawImage(WATERMARK_PATH, (w - ls_w) / 2, (h - ls_w) / 2,
                     width=ls_w, height=ls_w, preserveAspectRatio=True, mask="auto")
        cv.setFillAlpha(1.0)

        # Navy header bar
        cv.setFillColor(NAVY)
        cv.rect(0, h - 0.74 * inch, w, 0.74 * inch, fill=1, stroke=0)

        # Logo in header
        cv.drawImage(LOGO_PATH, MARGIN - 0.04 * inch, h - 0.70 * inch,
                     width=0.60 * inch, height=0.60 * inch,
                     preserveAspectRatio=True, mask="auto")

        # Company name block
        cv.setFont(FONT_B, 11)
        cv.setFillColor(white)
        cv.drawString(MARGIN + 0.72 * inch, h - 0.288 * inch, "REON ENERGIES PVT LTD")
        cv.setFont(FONT_R, 7.5)
        cv.setFillColor(ORANGE)
        cv.drawString(MARGIN + 0.72 * inch, h - 0.433 * inch,
                      "Solar Power  |  Clean Energy Solutions")
        cv.setFont(FONT_R, 6.8)
        cv.setFillColor(HexColor("#AABBDD"))
        cv.drawString(MARGIN + 0.72 * inch, h - 0.562 * inch,
                      "www.reonenergy.in  |  info@reonenergy.in  |  8436649991")

        # Offer badge (orange, top-right)
        bx = w - 1.40 * inch
        cv.setFillColor(ORANGE)
        cv.rect(bx, h - 0.74 * inch, 1.40 * inch, 0.74 * inch, fill=1, stroke=0)
        cv.setFont(FONT_R, 6.5)
        cv.setFillColor(white)
        cv.drawCentredString(bx + 0.70 * inch, h - 0.195 * inch, "Offer No.")
        cv.setFont(FONT_B, 7.5)
        cv.drawCentredString(bx + 0.70 * inch, h - 0.340 * inch, self.offer_no)
        cv.setFont(FONT_R, 6)
        cv.drawCentredString(bx + 0.70 * inch, h - 0.490 * inch, "Valid for 30 days")

        # Orange separator
        cv.setStrokeColor(ORANGE)
        cv.setLineWidth(2)
        cv.line(0, h - 0.75 * inch, w, h - 0.75 * inch)

        # Footer
        cv.setStrokeColor(MID_GRAY)
        cv.setLineWidth(0.5)
        cv.line(MARGIN, 0.46 * inch, w - MARGIN, 0.46 * inch)
        cv.setFont(FONT_R, 6.5)
        cv.setFillColor(TEXT_MID)
        cv.drawCentredString(
            w / 2, 0.28 * inch,
            "REON ENERGIES PVT LTD  |  Confidential Proposal  |  "
            "Gopalnagar, Singur, Hooghly, West Bengal – 712409  |  8436649991  |  reonenergy.in"
        )
        cv.restoreState()


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — STYLES
# ═══════════════════════════════════════════════════════════════════════════════

def _make_styles() -> dict:
    S = {}
    def mk(name, **kw):
        S[name] = ParagraphStyle(name, **kw)

    mk("title_white",    fontSize=15, leading=20, fontName=FONT_B,
       textColor=white,  alignment=TA_CENTER)
    mk("sub_white",      fontSize=9,  leading=13, fontName=FONT_B,
       textColor=white,  alignment=TA_CENTER)
    mk("section",        fontSize=10.5, leading=14, fontName=FONT_B,
       textColor=TEAL,   spaceBefore=10, spaceAfter=2)
    mk("body",           fontSize=8.5,  leading=12.5, fontName=FONT_R,
       textColor=TEXT_DARK, spaceBefore=2, spaceAfter=2)
    mk("body_b",         fontSize=8.5,  leading=12.5, fontName=FONT_B,
       textColor=TEXT_DARK, spaceBefore=2, spaceAfter=2)
    mk("tbl_hdr",        fontSize=8.5,  leading=11,   fontName=FONT_B,
       textColor=white,  alignment=TA_CENTER)
    mk("tbl_hdr_l",      fontSize=8.5,  leading=11,   fontName=FONT_B,
       textColor=white)
    mk("tbl_cell",       fontSize=8,    leading=11.5, fontName=FONT_R,
       textColor=TEXT_DARK)
    mk("tbl_cell_c",     fontSize=8,    leading=11.5, fontName=FONT_R,
       textColor=TEXT_DARK, alignment=TA_CENTER)
    mk("tbl_cell_b",     fontSize=8,    leading=11.5, fontName=FONT_B,
       textColor=NAVY,   alignment=TA_CENTER)
    mk("tbl_key",        fontSize=8.5,  leading=12.5, fontName=FONT_B,
       textColor=TEAL)
    mk("tbl_val",        fontSize=8.5,  leading=12.5, fontName=FONT_R,
       textColor=TEXT_DARK)
    mk("bullet",         fontSize=8.5,  leading=13,   fontName=FONT_R,
       textColor=TEXT_DARK, leftIndent=14, spaceBefore=1.5, spaceAfter=1.5,
       bulletIndent=3, bulletText="•")
    mk("orange_b",       fontSize=9,    leading=12,   fontName=FONT_B,
       textColor=ORANGE)
    mk("note_head",      fontSize=8.5,  leading=12,   fontName=FONT_B,
       textColor=TEAL)
    mk("payment_item",   fontSize=8.5,  leading=13,   fontName=FONT_R,
       textColor=TEXT_DARK, leftIndent=6)
    mk("sig_hdr",        fontSize=9.5,  leading=13,   fontName=FONT_B,
       textColor=white)
    mk("sig_body",       fontSize=8.5,  leading=12,   fontName=FONT_R,
       textColor=TEXT_MID)
    return S


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — TABLE / LAYOUT HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

_BASE_TS = [
    ("GRID",          (0,0), (-1,-1), 0.35, MID_GRAY),
    ("TOPPADDING",    (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("LEFTPADDING",   (0,0), (-1,-1), 8),
    ("RIGHTPADDING",  (0,0), (-1,-1), 8),
    ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
]


def _sec(title: str, S: dict) -> list:
    return [
        Paragraph(title, S["section"]),
        HRFlowable(width=CONTENT_W, thickness=1.5, color=TEAL, spaceAfter=6),
    ]


def _navy_tbl(headers, rows, cw, S, center_cols=(), bold_col=None) -> Table:
    hdr = [Paragraph(h, S["tbl_hdr"]) for h in headers]
    body_rows = []
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            if i == bold_col:
                sty = S["tbl_cell_b"]
            elif i in center_cols:
                sty = S["tbl_cell_c"]
            else:
                sty = S["tbl_cell"]
            cells.append(Paragraph(str(cell), sty))
        body_rows.append(cells)
    ts = TableStyle(_BASE_TS + [
        ("BACKGROUND",     (0,0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_GRAY]),
    ])
    return Table([hdr] + body_rows, colWidths=cw, style=ts, repeatRows=1)


def _info2(title: str, rows: list, S: dict) -> Table:
    """Two-column key/value block with navy spanning header."""
    hdr = Paragraph(
        f'<font color="white"><b>{title}</b></font>',
        ParagraphStyle("ih", fontSize=9, fontName=FONT_B,
                       alignment=TA_CENTER, textColor=white)
    )
    data_rows = [[hdr, ""]]
    for k, v in rows:
        data_rows.append([Paragraph(k, S["tbl_key"]),
                          Paragraph(str(v), S["tbl_val"])])
    cw = [CONTENT_W * 0.37, CONTENT_W * 0.63]
    ts = TableStyle(_BASE_TS + [
        ("BACKGROUND",     (0,0), (-1, 0), NAVY),
        ("SPAN",           (0,0), (-1, 0)),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_GRAY]),
    ])
    t = Table(data_rows, colWidths=cw)
    t.setStyle(ts)
    return t


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — BODY PAGE BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def _page_summary(data: dict, S: dict) -> list:
    elems = []

    # ── Title banner ──────────────────────────────────────────────────────────
    banner = Table(
        [[Paragraph("SOLAR POWER PLANT PROPOSAL", S["title_white"])],
         [Paragraph(f'Prepared for:  <b>{data["customer_name"].upper()}</b>',
                    S["sub_white"])]],
        colWidths=[CONTENT_W]
    )
    banner.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("BACKGROUND",    (0,1), (-1,1), ORANGE),
        ("TOPPADDING",    (0,0), (-1,-1), 9),
        ("BOTTOMPADDING", (0,0), (-1,-1), 9),
    ]))
    elems += [banner, Spacer(1, 10)]
    elems += _sec("Project Summary", S)

    # Dates
    date_obj   = _parse_date(data.get("date", ""))
    valid_till = date_obj + dt.timedelta(days=30)

    offer_rows = [
        ("Offer No.",  data["offer_no"]),
        ("Issue Date", date_obj.strftime("%d-%m-%Y")),
        ("Valid Till", valid_till.strftime("%d-%m-%Y") + "  (30 days from issue)"),
    ]
    site_rows = [
        ("Customer Name",       data["customer_name"].upper()),
        ("Address",             data.get("address", data.get("location", ""))),
        ("Contact Number",      data.get("contact_number", "")),
        ("Email ID",            data.get("email", "")),
        ("State",               data.get("state", "West Bengal")),
        ("Roof / Ground Type",  data.get("roof_type", "")),
        ("Project Category",    data.get("project_category", "Residential")),
        ("Electricity Provider",data.get("electricity_provider", "")),
        ("Monthly Bill",        ("Rs. " if FONT_R == "Helvetica" else "₹ ") + str(data.get("monthly_bill", ""))),
        ("Power Factor",        data.get("power_factor", "")),
    ]
    pv_rows = [
        ("System Capacity",     data.get("capacity",          "3.5 KWp")),
        ("Module Technology",   data.get("module_technology",
                                         "Mono-Crystalline Bifacial N-Type Topcon")),
        ("Inverter Type",       data.get("inverter_type",     "String Inverter (On-Grid)")),
        ("Panel & Inverter Brand", data.get("brands",
                                            "UTL / ADANI / VIKRAM / LUMINOUS / SOLIS / TATA")),
        ("Power Evacuation",    data.get("power_evacuation",  "230 VAC Single Phase")),
        ("Project Type",        data.get("project_type",      "Turnkey EPC Project")),
    ]

    elems += [_info2("Offer Details",                offer_rows, S), Spacer(1,6),
              _info2("Customer & Site Specification", site_rows,  S), Spacer(1,6),
              _info2("Solar PV System Specification", pv_rows,    S), Spacer(1,10)]

    # ── Commercial offer ──────────────────────────────────────────────────────
    elems += _sec("Commercial Offer", S)

    desc_txt = (
        f"Design, Engineering, Procurement, Construction, Erection, Installation, "
        f"Commissioning &amp; Testing for <b>{data.get('capacity','3.5 KWp')}</b> "
        f"Solar Power Plant — {data.get('project_category','Residential')} "
        f"(Turnkey EPC)"
    )
    comm_hdr  = ["Description", "Qty", "Base Price", "GST @ 5%"]
    sym = "Rs. " if FONT_R == "Helvetica" else "₹ "
    comm_data = [[Paragraph(desc_txt, S["tbl_cell"]),
                  Paragraph("1 Set",   S["tbl_cell_c"]),
                  Paragraph(sym + str(data.get("base_price", "1,60,000")), S["tbl_cell_c"]),
                  Paragraph(sym + str(data.get("gst_amount",  "8,000")),   S["tbl_cell_c"])]]
    cw = [CONTENT_W*0.52, CONTENT_W*0.12, CONTENT_W*0.20, CONTENT_W*0.16]

    ts = TableStyle(_BASE_TS + [
        ("BACKGROUND",     (0,0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_GRAY]),
    ])
    hdr_row = [Paragraph(h, S["tbl_hdr"]) for h in comm_hdr]
    comm_tbl = Table([hdr_row] + comm_data, colWidths=cw, style=ts)
    elems.append(comm_tbl)

    # Total bar
    tot_txt = data.get("total_price","1,68,000")
    if FONT_R == "Helvetica":
        tot_txt = tot_txt.replace("₹", "Rs.")

    total_para = Paragraph(
        f'<font color="white"><b>  Total Price Including GST:  '
        f'Rs. {tot_txt} /-</b></font>' if FONT_R == "Helvetica" else f'<font color="white"><b>  Total Price Including GST:  ₹ {tot_txt} /-</b></font>',
        ParagraphStyle("tot", fontSize=10.5, fontName=FONT_B,
                       alignment=TA_RIGHT, textColor=white, rightIndent=6)
    )
    total_tbl = Table([[total_para]], colWidths=[CONTENT_W])
    total_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), ORANGE),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
    ]))
    elems.append(total_tbl)
    elems.append(Spacer(1, 15))

    # ── Payment Information ───────────────────────────────────────────────────
    elems += _sec("Payment Information", S)
    
    sym = "Rs. " if FONT_R == "Helvetica" else "₹ "
    if data.get("payment_mode") == "EMI / Loan":
        pay_rows = [
            ("Payment Mode", "EMI / Loan"),
            ("Down Payment", f"{sym}{data.get('down_payment', '0')} /-"),
            ("Total Loan Amount", f"{sym}{data.get('loan_amount', '0')} /-"),
            ("Interest Rate", f"{data.get('interest_rate', '0')}% p.a."),
            ("Tenure", f"{data.get('tenure', '0')} Months"),
            ("Calculated Monthly EMI", f"{sym}{data.get('emi_amount', '0')} /-"),
        ]
        elems += [_info2("Financial Details", pay_rows, S), Spacer(1,10)]
    else:
        pay_rows = [
            ("Payment Mode", "Cash"),
        ]
        elems += [_info2("Financial Details", pay_rows, S), Spacer(1,10)]

    return elems


def _page_bom(data: dict, S: dict) -> list:
    elems = [PageBreak()]
    elems += _sec("Products & System Description", S)
    elems.append(Paragraph(
        "A Solar PV power plant converts solar irradiation into electrical energy. "
        "The system comprises the following major components:", S["body"]))
    elems.append(Spacer(1, 7))
    elems += _sec("Technical Bill of Materials (BOM)", S)

    hdrs = ["SL", "Item", "Specification", "Qty", "Make / Brand"]
    cw   = [CONTENT_W*0.05, CONTENT_W*0.17, CONTENT_W*0.30,
            CONTENT_W*0.13, CONTENT_W*0.35]
    rows = [[str(i+1), r["item"], r["spec"], r["qty"], r["brand"]]
            for i, r in enumerate(data.get("bom", _DEFAULT_BOM))]
    elems.append(_navy_tbl(hdrs, rows, cw, S, center_cols=[0, 3]))
    return elems


def _page_scope(data: dict, S: dict) -> list:
    elems = [PageBreak()]

    elems += _sec("Scope of Work", S)
    for item in data.get("scope_of_work", _DEFAULT_SCOPE):
        elems.append(Paragraph(item, S["bullet"]))
    elems.append(Spacer(1, 8))

    elems += _sec("Notes", S)
    for item in data.get("notes", _DEFAULT_NOTES):
        elems.append(Paragraph(item, S["bullet"]))
    elems.append(Spacer(1, 8))

    elems += _sec("Project Execution", S)
    elems.append(Paragraph(
        "The project shall be executed by highly experienced engineers and qualified contractors:",
        S["body"]))
    elems.append(Spacer(1, 3))
    for item in data.get("execution_items", _DEFAULT_EXECUTION):
        elems.append(Paragraph(item, S["bullet"]))
    elems.append(Spacer(1, 10))

    elems += _sec("Pre-Commissioning Testing Checklist", S)
    hdrs = ["SL", "Activity / Test", "Factory", "Site", "Comm."]
    cw   = [CONTENT_W*0.06, CONTENT_W*0.53,
            CONTENT_W*0.14, CONTENT_W*0.14, CONTENT_W*0.13]
    rows = [[str(i+1), act, "", "", ""]
            for i, act in enumerate(data.get("testing_checklist", _DEFAULT_CHECKLIST))]
    elems.append(_navy_tbl(hdrs, rows, cw, S, center_cols=[0, 2, 3, 4]))
    return elems


def _page_warranty(data: dict, S: dict) -> list:
    elems = [PageBreak()]

    # ── Warranty ──────────────────────────────────────────────────────────────
    elems += _sec("Warranty Details", S)
    warranty = data.get("warranty", _DEFAULT_WARRANTY)
    hdrs = ["SL", "Component", "Warranty Period"]
    cw   = [CONTENT_W*0.07, CONTENT_W*0.68, CONTENT_W*0.25]
    rows = [[str(i+1), w["item"], w["period"]] for i, w in enumerate(warranty)]
    elems.append(_navy_tbl(hdrs, rows, cw, S, center_cols=[0, 2], bold_col=2))
    elems.append(Spacer(1, 9))

    # ── Delivery ──────────────────────────────────────────────────────────────
    elems += _sec("Delivery & Completion Schedule", S)
    for item in data.get("delivery", _DEFAULT_DELIVERY):
        elems.append(Paragraph(item, S["bullet"]))
    elems.append(Spacer(1, 8))

    # ── Payment ───────────────────────────────────────────────────────────────
    elems += _sec("Payment Terms", S)
    for i, item in enumerate(data.get("payment_terms", _DEFAULT_PAYMENT), 1):
        elems.append(Paragraph(
            f'<font color="#E8611A"><b>{i}.</b></font>  {item}',
            S["payment_item"]))
        elems.append(Spacer(1, 2))
    elems.append(Spacer(1, 8))

    # ── Validity ──────────────────────────────────────────────────────────────
    elems += _sec("Validity of Offer", S)
    elems.append(Paragraph(
        "This proposal is valid for <b>30 days</b> from the date of issue.",
        S["orange_b"]))
    elems.append(Spacer(1, 8))

    # ── Terms & Conditions ────────────────────────────────────────────────────
    elems += _sec("General Terms & Conditions", S)
    for tc in data.get("terms", _DEFAULT_TERMS):
        elems.append(Paragraph(tc["title"], S["note_head"]))
        elems.append(Paragraph(tc["content"], S["body"]))
        elems.append(Spacer(1, 4))
    elems.append(Spacer(1, 8))

    # ── Assumptions ───────────────────────────────────────────────────────────
    elems += _sec("Assumptions & Customer Scope", S)
    for item in data.get("assumptions", _DEFAULT_ASSUMPTIONS):
        elems.append(Paragraph(item, S["bullet"]))
    return elems


def _page_clients(data: dict, S: dict) -> list:
    elems = [PageBreak()]
    elems += _sec("Major Clients of Reon Energies Pvt Ltd", S)
    elems.append(Paragraph(
        "We have successfully executed solar projects for leading organisations "
        "across West Bengal and India.", S["body"]))
    elems.append(Spacer(1, 7))
    elems += _sec("Recent On-Grid Projects in Nearby Locations", S)

    clients = data.get("clients", _DEFAULT_CLIENTS)
    hdrs = ["SL", "Project Details", "Capacity"]
    cw   = [CONTENT_W*0.07, CONTENT_W*0.75, CONTENT_W*0.18]
    rows = [[str(i+1), cl["name"], cl["capacity"]]
            for i, cl in enumerate(clients)]
    elems.append(_navy_tbl(hdrs, rows, cw, S, center_cols=[0, 2], bold_col=2))
    elems.append(Spacer(1, 10))

    elems += _sec("Company Information", S)
    company_rows = [
        ("Bank Name", "Punjab National Bank"),
        ("Account Name", "REON ENERGIES PRIVATE LIMITED"),
        ("A/C No.", "0162202100001274"),
        ("IFSC Code", "PUNB0016220"),
        ("Branch", "Singur, Hooghly, 712409"),
        ("GST Registration No.", "19AAPCR6346E1ZY"),
        ("Email", "info@reonenergy.in"),
        ("Phone", "8436649991"),
        ("Website", "reonenergy.in"),
    ]
    elems += [_info2("Bank, GST & Contact Details", company_rows, S), Spacer(1, 15)]

    # ── Signature block ───────────────────────────────────────────────────────
    sig = Table(
        [[Paragraph("<b>For: REON ENERGIES PVT LTD</b>", S["sig_hdr"]),
          Paragraph(f"<b>For: {data['customer_name'].upper()}</b>", S["sig_hdr"])],
         [Paragraph("<br/><br/><br/>Authorised Signatory", S["sig_body"]),
          Paragraph("<br/><br/><br/>Customer Acceptance",  S["sig_body"])]],
        colWidths=[CONTENT_W / 2, CONTENT_W / 2]
    )
    sig.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1, 0), NAVY),
        ("GRID",          (0,0), (-1,-1), 0.5, MID_GRAY),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 14),
    ]))
    elems.append(sig)
    return elems


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

def generate_quotation(data: dict, output_path: str) -> str:
    """
    Generate a complete REON solar quotation PDF.

    Parameters
    ----------
    data        : dict — customer/project fields (see DEFAULT_QUOTATION_DATA)
    output_path : str  — destination .pdf path

    Returns
    -------
    str — absolute path of the generated PDF
    """
    merged = {**DEFAULT_QUOTATION_DATA, **data}

    # Always recompute BOM from actual capacity + panel_watt unless caller supplied a custom bom
    if "bom" not in data:
        merged["bom"] = _build_bom(merged)

    # Strip rupee symbols if using Helvetica (doesn't support unicode rupee)
    if FONT_R == "Helvetica":
        def replace_rupee(obj):
            if isinstance(obj, str):
                return obj.replace("₹", "Rs.")
            elif isinstance(obj, list):
                return [replace_rupee(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: replace_rupee(v) for k, v in obj.items()}
            return obj
        merged = replace_rupee(merged)

    S    = _make_styles()
    tmpl = _BodyTemplate(merged["offer_no"])
    doc  = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=0.88 * inch, bottomMargin=0.60 * inch,
    )
    story = (
        _page_summary(merged, S) +
        _page_bom(merged, S) +
        _page_scope(merged, S) +
        _page_warranty(merged, S) +
        _page_clients(merged, S)
    )
    doc.build(story, onFirstPage=tmpl, onLaterPages=tmpl)

    return os.path.abspath(output_path)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — DEFAULT / MASTER DATA
# ═══════════════════════════════════════════════════════════════════════════════

def _calc_panel_qty(capacity_str: str, panel_wp: int = 550) -> str:
    """Calculate number of panels from capacity string (e.g. '45 KWp') and panel wattage."""
    import re
    m = re.search(r'([\d.]+)', str(capacity_str))
    if not m:
        return "As per Design"
    kw = float(m.group(1))
    count = math.ceil(kw * 1000 / panel_wp)
    return f"{count} Nos."


def _build_bom(data: dict) -> list:
    """Build BOM dynamically from project data."""
    capacity   = data.get("capacity", "45 KWp")
    panel_wp   = int(data.get("panel_watt", 550))
    panel_spec = data.get("panel_spec", f"{panel_wp}Wp Mono-Crystalline Bifacial N-Type Topcon")
    panel_qty  = _calc_panel_qty(capacity, panel_wp)

    # Determine inverter qty/spec from capacity
    import re
    m = re.search(r'([\d.]+)', str(capacity))
    kw = float(m.group(1)) if m else 45.0
    if kw <= 5:
        inv_spec = "On-Grid, 1-Phase, Efficiency >98%, IP65"
        inv_qty  = "1 No."
    elif kw <= 15:
        inv_spec = "On-Grid, 3-Phase, Efficiency >98%, IP65"
        inv_qty  = "1 No."
    elif kw <= 30:
        inv_spec = "On-Grid, 3-Phase, Efficiency >98%, IP65"
        inv_qty  = "2 Nos."
    elif kw <= 50:
        inv_spec = "On-Grid, 3-Phase, Efficiency >98%, IP65"
        inv_qty  = f"{math.ceil(kw/25)} Nos."
    else:
        inv_spec = "On-Grid, 3-Phase, Efficiency >98%, IP65"
        inv_qty  = f"{math.ceil(kw/50)} Nos."

    acdb_qty = "1 Set" if kw <= 10 else f"{math.ceil(kw/25)} Sets"
    dcdb_qty = "1 Set" if kw <= 10 else f"{math.ceil(kw/25)} Sets"

    return [
        {"item": "PV MODULES",                "spec": panel_spec,                                    "qty": panel_qty,     "brand": "UTL / ADANI / VIKRAM / LUMINOUS"},
        {"item": "STRING INVERTER",           "spec": inv_spec,                                      "qty": inv_qty,       "brand": "UTL / VIKRAM / SOLIS / HAVELLS"},
        {"item": "MODULE MOUNTING STRUCTURE", "spec": "Hot-Dip Galvanised GI, Rooftop / Ground",   "qty": "As per Design", "brand": "AFTR Market / Fabricated"},
        {"item": "SOLAR DC CABLE",            "spec": "4 Sq.mm, UV-Protected, TÜV Certified",      "qty": "As per Design", "brand": "Apar Industries / Polycab / KEI"},
        {"item": "AC CABLE",                  "spec": "1.1kV UV-Protected Aluminium Armoured",     "qty": "As per Design", "brand": "Apar Industries / Polycab / KEI"},
        {"item": "MC4 CONNECTORS",            "spec": "UV-Protected, IP67, DC Rated",              "qty": "As required",   "brand": "MC4 / Elmex / Phonix / Havells"},
        {"item": "ACDB",                      "spec": "IP55, MCB Protection, Type-II SPD",         "qty": acdb_qty,      "brand": "Apar Industries / Polycab / KEI"},
        {"item": "DCDB",                      "spec": "IP55, String Fuses, SPD Type-II",           "qty": dcdb_qty,      "brand": "Apar Industries / Polycab / KEI"},
        {"item": "EARTHING KIT",              "spec": "6 ft Copper Bonded Rod + GI Strip",         "qty": "As required",   "brand": "True Power Ltd / ETP Earthing"},
        {"item": "EARTHING CABLE",            "spec": "2.5 Sq.mm Copper, Single Core",             "qty": "As required",   "brand": "Reputed Make"},
        {"item": "LIGHTNING ARRESTOR",        "spec": "ESE Type, Class I+II Protection",           "qty": "As required",   "brand": "True Power / Nitro / ETP LPS"},
        {"item": "CABLE TRAY & ACCESSORIES",  "spec": "GI Perforated Tray, ISI Mark",              "qty": "As required",   "brand": "TATA / JINDAL / SHYAM / JSW"},
    ]


# Static default BOM (for reference; _build_bom() is used at runtime)
_DEFAULT_BOM = _build_bom({"capacity": "45 KWp", "panel_watt": 550})

_DEFAULT_SCOPE = [
    "Detailed Solar Power Plant Design & Engineering.",
    "Supply of all equipment including packaging, forwarding, freight & transit insurance.",
    "Project Management for smooth execution within the agreed timeline.",
    "On-site civil works, structural erection and equipment installation.",
    "Electrical works, cable laying, interconnections, earthing & lightning protection.",
    "On-site commissioning and performance testing of the complete system.",
    "Operation & Maintenance training to customer personnel.",
    "MNRE and CEIG approvals processing (included in proposal scope).",
]
_DEFAULT_NOTES = [
    "Design is based on standard codes; subject to scrutiny by the owner at their own cost.",
    "All drawings will be prepared only after receiving the confirmed order and advance payment.",
    "If site conditions differ from standard design assumptions, the final value may change proportionally.",
]
_DEFAULT_EXECUTION = [
    "Preparation of detailed installation and construction documentation.",
    "Civil works, structural erection and installation of all equipment.",
    "Electrical interconnections, earthing & lightning protection system.",
    "Obtaining all required permits, consents and regulatory approvals.",
    "Commissioning, performance testing and handover with documentation.",
]
_DEFAULT_CHECKLIST = [
    "Solar PV Modules — Visual inspection, IV curve & insulation resistance test",
    "String Inverter — Factory acceptance test, grid synchronisation verification",
    "Module Mounting Structure — Dimensional, alignment & torque check",
    "Solar DC Cables & MC4 Connectors — Insulation resistance & polarity test",
    "AC Cables & ACDB — Continuity, polarity & RCD test",
    "DCDB — Fuse rating, SPD operation & isolation test",
    "Earthing System — Earth resistance measurement (target < 1 Ω)",
    "Lightning Protection System — Continuity & bonding verification",
    "Grid Power Evacuation — Sync relay, anti-islanding & protection trip test",
    "Surge Protection Devices (SPD) — Functional & leakage current test",
    "System Performance Ratio — PR > 75% at rated irradiance",
]
_DEFAULT_WARRANTY = [
    {"item": "Solar PV Modules (Product Warranty)",     "period": "12 Years"},
    {"item": "Solar PV Modules (Performance Warranty)", "period": "25 Years"},
    {"item": "String Inverter",                         "period": "5 Years (Extendable to 10 Yrs)"},
    {"item": "Module Mounting Structure",               "period": "5 Years"},
    {"item": "DC & AC Cables",                         "period": "5 Years"},
    {"item": "ACDB / DCDB",                            "period": "1 Year"},
    {"item": "All Other Parts & Workmanship",           "period": "1 Year"},
]
_DEFAULT_DELIVERY = [
    "Material delivery: 1–2 weeks from receipt of Purchase Order and advance payment.",
    "Installation, testing & commissioning: 1–3 weeks from first material delivery at site.",
    "Final handover, O&M training and documentation: within 1 week of commissioning.",
]
_DEFAULT_PAYMENT = [
    "30% of total order value as advance at the time of Purchase Order.",
    "65% of total order value on readiness of material for dispatch.",
    "5% of total order value on successful commissioning and client acceptance.",
]
_DEFAULT_TERMS = [
    {"title": "Approvals:",
     "content": "MNRE and CEIG approvals are included. Any other government or third-party approval is in the client's scope."},
    {"title": "Confidentiality:",
     "content": "All information exchanged between the parties in connection with this proposal shall be maintained strictly confidential."},
    {"title": "Taxes, Duties & Rates:",
     "content": "GST @ 5% applicable on solar system installation as per prevailing government norms. Any future change in taxes/duties shall be payable by the customer."},
    {"title": "Force Majeure:",
     "content": "Neither party shall be liable for delays caused by circumstances beyond reasonable control — acts of God, government orders, or natural calamities."},
    {"title": "Dispute Resolution:",
     "content": "Any dispute shall first be resolved through mutual negotiation; failing which, through arbitration under the Indian Arbitration Act, jurisdiction: Hooghly, West Bengal."},
]
_DEFAULT_ASSUMPTIONS = [
    "Module Mounting Structures designed to suit the customer's specific roof/ground conditions.",
    "Power evacuation at 230V (single phase) or 415V (three phase); tapping point in existing panel is in customer's scope.",
    "Indoor/sheltered space for inverter, control panels and metering equipment is in customer's scope.",
    "Distance between ACDB and existing evacuation point assumed ≤ 50 metres.",
    "Construction power and potable water to be provided by the client at no cost.",
    "Sand, cement and stone chips required for civil/cable-laying works are in customer's scope.",
    "Tree trimming or shadow-removal works (if required for shadow-free area) are in customer's scope.",
    "Panel cleaning is not in REON's scope — customer to clean panels at least twice per week.",
    "This is a turnkey project; unused/surplus materials will be returned to REON inventory on completion.",
]
_DEFAULT_CLIENTS = [
    {"name": "Ramakrishna Mission Shilpapitha, Belgharia",     "capacity": "52 kW"},
    {"name": "Ecos Housing Project, New Town",                 "capacity": "26 kW"},
    {"name": "Metalist Consultant Pvt. Ltd., New Town",        "capacity": "8 kW"},
    {"name": "Electro Steel Castings Limited, Khardha",        "capacity": "35 kW"},
    {"name": "Bankura Medical College & Hospital",             "capacity": "10 kW"},
    {"name": "Times of India Building, Salt Lake Sector-5",    "capacity": "40 kW"},
    {"name": "Agrico Industries, Howrah",                      "capacity": "40 kW"},
    {"name": "Mali Agri Tech Pvt. Ltd., Ranaghat",             "capacity": "80 kW"},
    {"name": "Nicco Park, Salt Lake-5 / New Town",             "capacity": "125 kW"},
    {"name": "M/s Allen Laboratories Limited, Kolkata",        "capacity": "160 kW"},
    {"name": "G. K. Plastics Pvt. Ltd., Bandel",               "capacity": "160 kW"},
    {"name": "Apollo Gleneagles Hospitals, EM Bypass",         "capacity": "325 kW"},
    {"name": "Oscar Equipments Pvt. Ltd., Bishnupur",          "capacity": "500 kW"},
    {"name": "Kamala Industries, Sangur",                      "capacity": "700 kW"},
    {"name": "Century Ply Boards India Ltd.",                  "capacity": "1,500 kW"},
]

DEFAULT_QUOTATION_DATA: dict = {
    "offer_no":              "REPL/26-27/101",
    "date":                  dt.date.today().strftime("%d-%m-%Y"),
    # Customer
    "customer_name":         "",
    "address":               "",
    "location":              "",
    "contact_number":        "",
    "email":                 "",
    "state":                 "West Bengal",
    "roof_type":             "Sheet Roof / Grounded RCC with GI",
    # Project
    "project_category":      "Commercial",
    "project_location":      "",
    "electricity_provider":  "WBSEDCL",
    "monthly_bill":          "",
    "power_factor":          "",
    # System
    "capacity":              "45 KWp",
    "panel_watt":            550,
    "panel_spec":            "550Wp Mono-Crystalline Bifacial N-Type Topcon",
    "module_technology":     "Mono-Crystalline Bifacial N-Type Topcon Silicon Technology",
    "inverter_type":         "String Inverter (On-Grid, 3-Phase)",
    "brands":                "UTL / ADANI / VIKRAM / LUMINOUS / SOLIS / TATA",
    "power_evacuation":      "415 VAC Three Phase",
    "project_type":          "Turnkey EPC Project",
    # Pricing
    "base_price":            "20,00,000",
    "gst_amount":            "1,00,000",
    "total_price":           "21,00,000",
    # Lists (use defaults if not supplied)
    "bom":                   _DEFAULT_BOM,
    "scope_of_work":         _DEFAULT_SCOPE,
    "notes":                 _DEFAULT_NOTES,
    "execution_items":       _DEFAULT_EXECUTION,
    "testing_checklist":     _DEFAULT_CHECKLIST,
    "warranty":              _DEFAULT_WARRANTY,
    "delivery":              _DEFAULT_DELIVERY,
    "payment_terms":         _DEFAULT_PAYMENT,
    "terms":                 _DEFAULT_TERMS,
    "assumptions":           _DEFAULT_ASSUMPTIONS,
    "clients":               _DEFAULT_CLIENTS,
}
