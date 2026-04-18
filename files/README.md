# REON Energies — Solar Quotation Generator Module

A plug-and-play quotation PDF generator for **reonenergy.in**.  
Stack: **Python (ReportLab)** PDF engine · **Node.js + Express** API · **React** frontend · **PostgreSQL** database.

---

## Directory Structure

```
reon-quotation/
├── assets/
│   ├── logo.png          ← REON logo (transparent background)
│   └── cover.png         ← Branded cover image (Solar System Quotation)
│
├── backend/
│   ├── app.js            ← Express router (mount into your existing app)
│   ├── db/
│   │   ├── index.js      ← PostgreSQL pool
│   │   └── schema.sql    ← Run once to create tables
│   ├── routes/
│   │   └── quotations.js ← REST endpoints
│   └── services/
│       ├── pdf_generator.py    ← Core PDF engine (Python)
│       ├── run_pdf_gen.py      ← Bridge: Node → Python
│       └── quotationService.js ← Business logic (DB + PDF)
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── quotations.js   ← API client
│       ├── hooks/
│       │   └── useQuotations.js
│       └── components/
│           ├── QuotationForm.jsx   ← 5-step form
│           ├── QuotationList.jsx   ← Table with search + pagination
│           └── pages/
│               └── QuotationPage.jsx ← Full page (drop into React Router)
│
├── .env.example
├── package.json
└── README.md
```

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Backend API |
| Python | ≥ 3.10 | PDF generation |
| PostgreSQL | ≥ 14 | Database |
| pip packages | — | `reportlab pypdf pillow` |

```bash
# Install Python dependencies
pip install reportlab pypdf pillow

# Install Node dependencies
cd reon-quotation
npm install
```

---

## 2. Database Setup

```bash
# Create the tables (run once)
psql -U postgres -d reonenergy -f backend/db/schema.sql
```

---

## 3. Environment Variables

```bash
cp .env.example .env
# Then edit .env with your actual values
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Postgres host | `localhost` |
| `DB_PORT` | Postgres port | `5432` |
| `DB_NAME` | Database name | `reonenergy` |
| `DB_USER` | DB username | `postgres` |
| `DB_PASSWORD` | DB password | — |
| `PDF_OUTPUT_DIR` | Server path for generated PDFs | `./generated_pdfs` |
| `FRONTEND_URL` | CORS origin | `https://reonenergy.in` |

---

## 4. Backend Integration

### Option A — Mount into your existing Express app

```js
// In your main server.js or app.js
const quotationRouter = require('./reon-quotation/backend/app');
app.use('/api', quotationRouter);
// That's it. Endpoints are now live at /api/quotations
```

### Option B — Run as a standalone microservice

```bash
cd reon-quotation
npm start
# API runs on http://localhost:4000
```

---

## 5. Frontend Integration

### React Router (recommended)

```jsx
// In your App.jsx or router config
import QuotationPage from './reon-quotation/frontend/src/pages/QuotationPage';

// Add to your routes:
<Route path="/quotations" element={<QuotationPage />} />
```

### Set the API base URL

```bash
# In your frontend .env
REACT_APP_API_URL=https://reonenergy.in/api
```

### Use individual components (optional)

```jsx
import QuotationForm from './reon-quotation/frontend/src/components/QuotationForm';
import QuotationList from './reon-quotation/frontend/src/components/QuotationList';
import { useQuotations } from './reon-quotation/frontend/src/hooks/useQuotations';
```

---

## 6. API Reference

### `POST /api/quotations`
Create a new quotation and trigger PDF generation.

**Request body:**
```json
{
  "customer_name":        "PRIYANATH BHUKTA",
  "address":              "147 Gopalnagar, Singur, Hooghly, West Bengal",
  "contact_number":       "8436649991",
  "email":                "customer@email.com",
  "state":                "West Bengal",
  "project_category":     "Residential",
  "roof_type":            "Sheet Roof / Grounded RCC with GI",
  "electricity_provider": "WBSEDCL",
  "monthly_bill":         "2,500",
  "power_factor":         "0.95",
  "capacity":             "3.5 KWp",
  "module_technology":    "Mono-Crystalline Bifacial N-Type Topcon Silicon Technology",
  "inverter_type":        "String Inverter (On-Grid)",
  "brands":               "UTL / ADANI / VIKRAM / LUMINOUS",
  "power_evacuation":     "230 VAC Single Phase",
  "project_type":         "Turnkey EPC Project",
  "base_price":           "1,60,000",
  "gst_amount":           "8,000",
  "total_price":          "1,68,000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "offer_no": "REPV/26-27/101",
    "valid_till": "2026-05-05",
    ...
  }
}
```

### `GET /api/quotations`
List all quotations. Query params: `page`, `limit`, `search`, `status`.

### `GET /api/quotations/:id`
Get a single quotation by ID.

### `GET /api/quotations/:id/download`
Stream the generated PDF to the browser.

### `PATCH /api/quotations/:id`
Update quotation fields.

### `POST /api/quotations/:id/regenerate`
Regenerate the PDF (useful after editing).

### `DELETE /api/quotations/:id`
Delete quotation record and its PDF file.

---

## 7. PDF Pages

| Page | Content |
|------|---------|
| 1 | Branded cover image with all customer fields filled in |
| 2 | Project summary + Commercial offer with total |
| 3 | Technical Bill of Materials (12 items) |
| 4 | Scope of work + Testing checklist |
| 5 | Warranty + Payment terms + T&C + Assumptions |
| 6+ | Client references + Signature block |

**Features:**
- REON logo watermark on every body page (7% opacity)
- Auto-computed valid-till = issue date + 30 days
- Auto-incrementing offer number (REPV/26-27/101, 102, 103…)
- ₹ symbol rendered correctly using DejaVu Unicode fonts
- Long text auto-shrinks to fit cover page fields
- A4 portrait, 300 DPI quality

---

## 8. Offer Number Format

```
REPV / 26-27 / 101
 ↑      ↑      ↑
prefix fiscal  auto-increment
       year    (stored in DB)
```

The counter is stored in the `quotation_counter` table and increments atomically per prefix. To start a new fiscal year, insert a new row:

```sql
INSERT INTO quotation_counter (prefix, last_seq) VALUES ('REPV/27-28', 100);
```

---

## 9. Customisation

### Change default BOM / scope / warranty
Edit the `_DEFAULT_*` lists at the bottom of `backend/services/pdf_generator.py`.

### Pass a custom BOM per quotation
Include `custom_bom` in the API payload:
```json
{
  "custom_bom": [
    { "item": "PV MODULES", "spec": "440Wp Mono PERC", "qty": "10 Nos.", "brand": "TATA" },
    ...
  ]
}
```

### Change brand colours
Edit the colour constants at the top of `pdf_generator.py`:
```python
NAVY   = HexColor("#1B2D5B")
ORANGE = HexColor("#E8611A")
TEAL   = HexColor("#1A8FA0")
```

### Replace assets
Drop new files into `/assets/`:
- `logo.png` — REON logo, transparent background, any size
- `cover.png` — Cover page image, 1024×1536 px recommended

If you replace `cover.png` with a different layout, update the field coordinate
constants in `_generate_cover()` inside `pdf_generator.py`.

---

## 10. Troubleshooting

| Problem | Fix |
|---------|-----|
| `₹` shows as black box | Ensure DejaVu fonts are installed: `apt install fonts-dejavu` |
| PDF not generated | Check `PDF_OUTPUT_DIR` is writable by the Node process |
| `python3` not found | Set full path in `quotationService.js` `execFile` call |
| Cover fields misaligned | Run `python3 backend/services/pdf_generator.py` in test mode and adjust x/y constants |
| CORS errors | Set `FRONTEND_URL` in `.env` to your exact frontend origin |
