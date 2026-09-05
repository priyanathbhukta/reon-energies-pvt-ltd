// frontend/src/components/QuotationForm.jsx
import React, { useState, useEffect } from 'react';
import { API } from '@/lib/legacy-api';


/* ── Colour tokens matching the REON brand ──────────────────────────────── */
const C = {
  navy:   '#1B2D5B',
  orange: '#E8611A',
  teal:   '#1A8FA0',
  light:  '#F4F6FA',
  border: '#D8DDE8',
  text:   '#1A1A2E',
  mid:    '#4A4A6A',
  green:  '#1D6B1D',
  red:    '#C0392B',
};

/* ── Step definitions ────────────────────────────────────────────────────── */
const STEPS = [
  { id: 'customer',  label: 'Customer' },
  { id: 'project',   label: 'Project' },
  { id: 'system',    label: 'PV System' },
  { id: 'pricing',   label: 'Pricing' },
  { id: 'payment',   label: 'Payment' },
  { id: 'review',    label: 'Review & Generate' },
];

/* ── Initial form state ───────────────────────────────────────────────────── */
const INIT = {
  // customer
  customer_name:        '',
  address:              '',
  contact_number:       '',
  email:                '',
  state:                'West Bengal',
  // project
  project_category:     'Residential',
  roof_type:            'Sheet Roof / Grounded RCC with GI',
  project_location:     '',
  electricity_provider: 'WBSEDCL',
  monthly_bill:         '',
  power_factor:         '',
  // system
  system_capacity_kw:   '',
  panel_watt:           '590',     // watt per panel (changeable)
  module_technology:    'Mono-Crystalline Bifacial N-Type Topcon Silicon Technology',
  inverter_type:        'String Inverter (On-Grid)',
  brands:               'UTL / ADANI / VIKRAM / LUMINOUS / SOLIS / TATA',
  inverter_brand:       'UTL / VIKRAM / LUMINOUS / HAVELLS',
  battery_brand:        '',
  battery_voltage:      'N/A',
  power_evacuation:     '230 VAC Single Phase',
  project_type:         'Turnkey EPC Project',
  // pricing (auto-calculated, read-only display)
  rate_per_watt:        '',
  // payment
  payment_mode:         'Cash',
  emi_down_payment:     '',
  emi_roi:              '12',
  emi_tenure:           '60',
  // quotation
  quotation_no_seq:     '',
};

/* ── Tiny reusable field component ──────────────────────────────────────── */
function Field({ label, name, value, onChange, type = 'text', required = false,
                 options, hint, half, readOnly, warn }) {
  const inputStyle = {
    width: '100%', padding: '9px 12px', border: `1.5px solid ${warn ? C.red : C.border}`,
    borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit',
    background: readOnly ? C.light : 'white', color: C.text, boxSizing: 'border-box',
    transition: 'border-color .15s', cursor: readOnly ? 'default' : 'text',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: C.teal, display: 'block', marginBottom: 4 };

  return (
    <div style={{ flex: half ? '0 0 calc(50% - 6px)' : '1 1 100%', minWidth: 0 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: C.orange }}> *</span>}</label>
      {options ? (
        <select name={name} value={value} onChange={onChange} style={inputStyle}
                disabled={readOnly}
                onFocus={e => e.target.style.borderColor = C.teal}
                onBlur={e => e.target.style.borderColor = warn ? C.red : C.border}>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input name={name} value={value} onChange={onChange}
               type={type} style={inputStyle} placeholder={hint || ''}
               readOnly={readOnly}
               onFocus={e => { if (!readOnly) e.target.style.borderColor = C.teal; }}
               onBlur={e => e.target.style.borderColor = warn ? C.red : C.border} />
      )}
      {warn && <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>{warn}</div>}
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHead({ title }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{title}</div>
      <div style={{ height: 2, background: C.teal, marginTop: 4, borderRadius: 1 }} />
    </div>
  );
}

/* ── Review row ──────────────────────────────────────────────────────────── */
function RRow({ label, value, bold }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, fontSize: 12.5, padding: '6px 0' }}>
      <div style={{ width: '42%', color: C.teal, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: bold ? C.navy : C.text, fontWeight: bold ? 700 : 400 }}>{value}</div>
    </div>
  );
}

/* ── Info card for pricing ────────────────────────────────────────────────── */
function PriceCard({ label, value, accent }) {
  return (
    <div style={{
      flex: '1 1 calc(50% - 6px)', minWidth: 0,
      background: accent ? C.navy : C.light,
      border: `1.5px solid ${accent ? C.navy : C.border}`,
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: accent ? '#AABBDD' : C.mid, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: accent ? 16 : 14, fontWeight: 700, color: accent ? 'white' : C.text }}>{value}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════════════════ */
export default function QuotationForm({ editData, onClearEdit }) {
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState(INIT);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [successUrl, setSuccessUrl] = useState(null);
  const [financeSim, setFinanceSim] = useState(null);
  const [financialYear, setFinancialYear] = useState('26-27');
  const [seqLoading, setSeqLoading] = useState(false);

  const fetchNextSeq = async () => {
    setSeqLoading(true);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const res = await fetch(`${API}/api/admin/quotations/next-number`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nextSeq) {
          setForm(prev => ({ ...prev, quotation_no_seq: data.nextSeq }));
        }
        if (data.financialYear) {
          setFinancialYear(data.financialYear);
        }
      }
    } catch (err) {
      console.error('Failed to fetch next quotation number', err);
    } finally {
      setSeqLoading(false);
    }
  };

  // ─── Derived pricing values ────────────────────────────────────────────────
  const kW       = parseFloat(form.system_capacity_kw) || 0;
  const rate     = parseFloat(form.rate_per_watt) || 0;
  const baseNum  = kW > 0 && rate > 0 ? kW * 1000 * rate : 0;
  const gstNum   = Math.round(baseNum * 0.05);
  const totalNum = baseNum + gstNum;

  const fmt = n => (isNaN(n) || n === 0) ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtRs = n => `₹ ${fmt(n)}`;

  // Panel count
  const panelWatt  = parseFloat(form.panel_watt) || 590;
  const panelCount = kW > 0 ? Math.ceil((kW * 1000) / panelWatt) : 0;

  // ─── EMI simulation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (editData) {
      setForm({ ...INIT, ...editData });
      setStep(0);
      setSuccessUrl(null);
      setError(null);
    } else {
      setForm(INIT);
      setStep(0);
      setSuccessUrl(null);
      setError(null);
      fetchNextSeq();
    }
  }, [editData]);

  useEffect(() => {
    if (form.payment_mode !== 'EMI / Loan') { setFinanceSim(null); return; }

    const dp    = parseFloat(form.emi_down_payment) || 0;
    const loan  = totalNum - dp;
    const r     = (parseFloat(form.emi_roi) || 0) / 12 / 100;
    const n     = parseInt(form.emi_tenure) || 0;

    if (loan <= 0 || n <= 0) { setFinanceSim(null); return; }

    let emi = 0;
    if (r > 0) {
      emi = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    } else {
      emi = loan / n;
    }
    const totalPayable  = emi * n + dp;
    const totalInterest = emi * n - loan;

    setFinanceSim({ downPayment: dp, loanAmount: loan, interestRate: parseFloat(form.emi_roi) || 0, tenure: n, emiAmount: emi, totalInterest, totalPayable });
  }, [form.payment_mode, form.emi_down_payment, form.emi_roi, form.emi_tenure, totalNum]);

  const update = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const seqWarn = () => {
    const v = form.quotation_no_seq;
    if (!v) return '';
    if (!/^\d{3}$/.test(v)) return 'Must be exactly 3 digits (e.g. 001, 042, 110)';
    return '';
  };

  const isValid = () => {
    if (step === 0) return form.customer_name.trim().length > 0;
    if (step === 2) return form.system_capacity_kw.trim().length > 0 && kW > 0;
    if (step === 3) return baseNum > 0;   // capacity + rate must yield a price
    if (step === 4) {
      if (form.payment_mode === 'EMI / Loan') return financeSim !== null;
      return true;
    }
    if (step === 5) return Boolean(form.quotation_no_seq);
    return true;
  };

  const offerNo = `REPL/${financialYear}/${form.quotation_no_seq || 'NNN'}`;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessUrl(null);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const payload = {
        ...form,
        capacity:          `${form.system_capacity_kw} kWp`,
        panel_count:       panelCount,
        panel_watt:        panelWatt,
        offer_no:          offerNo,
        offerNo:           offerNo,
        base_price:        fmt(baseNum),
        gst_amount:        fmt(gstNum),
        total_price:       fmt(totalNum),
        totalCost:         fmt(totalNum),
        financeParameters: form.payment_mode === 'EMI / Loan' && financeSim ? financeSim : null,
      };

      const response = await fetch(`${API}/api/admin/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate quotation');
      if (data.success && data.pdfUrl) {
        setSuccessUrl(data.pdfUrl);
      } else {
        throw new Error('No PDF URL returned in response');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Pill progress bar ───────────────────────────────────────────────────── */
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ flex: 1, cursor: i < step ? 'pointer' : 'default' }}
             onClick={() => i < step && setStep(i)}>
          <div style={{
            height: 4, borderRadius: 4,
            background: i < step ? C.teal : i === step ? C.orange : C.border,
            transition: 'background .3s',
          }} />
          <div style={{
            fontSize: 9.5, marginTop: 4, textAlign: 'center', fontWeight: 600,
            color: i === step ? C.navy : i < step ? C.teal : C.mid,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  /* ── Step panels ─────────────────────────────────────────────────────────── */
  const stepContent = () => {
    switch (step) {

      /* ── STEP 0: Customer ─────────────────────────────────────────────── */
      case 0: return (
        <>
          <SectionHead title="Customer Details" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Field label="Customer Name" name="customer_name" value={form.customer_name}
                   onChange={update} required hint="Full name or company name" />
            <Field label="Address" name="address" value={form.address}
                   onChange={update} hint="Full postal address" />
            <Field label="Contact Number" name="contact_number" value={form.contact_number}
                   onChange={update} type="tel" hint="Mobile / landline" half />
            <Field label="Email ID" name="email" value={form.email}
                   onChange={update} type="email" hint="customer@email.com" half />
            <Field label="State" name="state" value={form.state}
                   onChange={update} half
                   options={['West Bengal', 'Odisha', 'Jharkhand', 'Bihar', 'Assam', 'Other']} />
          </div>
        </>
      );

      /* ── STEP 1: Project ──────────────────────────────────────────────── */
      case 1: return (
        <>
          <SectionHead title="Project Details" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Field label="Project Category" name="project_category"
                   value={form.project_category} onChange={update} half
                   options={['Residential', 'Commercial', 'Industrial', 'Agricultural']} />
            <Field label="Roof / Ground Type" name="roof_type"
                   value={form.roof_type} onChange={update} half
                   options={['Sheet Roof / Grounded RCC with GI', 'RCC Flat Roof', 'Metal Roof',
                             'Ground Mount', 'Carport / Shade Structure', 'Other']} />
            <Field label="Project Location" name="project_location"
                   value={form.project_location} onChange={update}
                   hint="Site address (if different from customer address)" />
            <Field label="Electricity Provider (DISCOM)" name="electricity_provider"
                   value={form.electricity_provider} onChange={update} half
                   options={['WBSEDCL', 'CESC', 'DVC', 'BSPHCL', 'JUSNL', 'Other']} />
            <Field label="Monthly Electricity Bill (₹)" name="monthly_bill"
                   value={form.monthly_bill} onChange={update} half hint="e.g. 3,500" />
            <Field label="Power Factor" name="power_factor"
                   value={form.power_factor} onChange={update} half hint="e.g. 0.95" />
          </div>
        </>
      );

      /* ── STEP 2: PV System ────────────────────────────────────────────── */
      case 2: return (
        <>
          <SectionHead title="Solar PV System Specification" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Field label="System Capacity (kW) *" name="system_capacity_kw" type="number"
                   value={form.system_capacity_kw} onChange={update} half required hint="e.g. 5" />
            <Field label="Panel Wattage (Wp)" name="panel_watt" type="number"
                   value={form.panel_watt} onChange={update} half hint="e.g. 590" />
            <Field label="Module Technology" name="module_technology"
                   value={form.module_technology} onChange={update} half
                   options={['Mono-Crystalline Bifacial N-Type Topcon Silicon Technology',
                             'Mono PERC', 'Poly-Crystalline', 'HJT (Heterojunction)',
                             'Bifacial Mono PERC']} />
            <Field label="Inverter Type" name="inverter_type"
                   value={form.inverter_type} onChange={update} half
                   options={['String Inverter (On-Grid)', 'Micro Inverter',
                             'Hybrid Inverter (On-Grid + Battery)', 'Off-Grid Inverter', 'Central Inverter']} />
            <Field label="Panel Brand" name="brands"
                   value={form.brands} onChange={update} half hint="e.g. UTL / ADANI / VIKRAM" />
            <Field label="Inverter Brand" name="inverter_brand"
                   value={form.inverter_brand} onChange={update} half hint="e.g. SOLIS / LUMINOUS" />
            <Field label="Battery Brand" name="battery_brand"
                   value={form.battery_brand} onChange={update} half hint="e.g. EXIDE / OKAYA (Leave blank if none)" />
            <Field label="Battery Voltage" name="battery_voltage"
                   value={form.battery_voltage} onChange={update} half
                   options={['N/A', '12V', '24V', '48V']} />
            <Field label="Power Evacuation" name="power_evacuation"
                   value={form.power_evacuation} onChange={update} half
                   options={['230 VAC Single Phase', '415 VAC Three Phase', '11kV HT', '33kV HT']} />
            <Field label="Project Type" name="project_type"
                   value={form.project_type} onChange={update} half
                   options={['Turnkey EPC Project', 'Supply & Install', 'Supply Only', 'Civil & Structural Only']} />
          </div>
          {panelCount > 0 && (
            <div style={{
              marginTop: 14, padding: '10px 14px', background: '#EBF9FB',
              border: `1.5px solid ${C.teal}`, borderRadius: 8, fontSize: 12.5,
            }}>
              <span style={{ color: C.mid }}>Calculated Panels: </span>
              <b style={{ color: C.navy }}>
                {panelCount} Nos. × {panelWatt}Wp
                = {(panelCount * panelWatt / 1000).toFixed(2)} kWp
              </b>
              <span style={{ color: C.mid, marginLeft: 8 }}>(target: {kW} kW)</span>
            </div>
          )}
        </>
      );

      /* ── STEP 3: Pricing ──────────────────────────────────────────────── */
      case 3: return (
        <>
          <SectionHead title="Pricing Calculation" />

          {/* Rate input */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <Field label="Rate per Watt (₹) *" name="rate_per_watt" type="number"
                   value={form.rate_per_watt} onChange={update}
                   hint="e.g. 45  — Base price auto-calculates" half required />
            <div style={{ flex: '0 0 calc(50% - 6px)', display: 'flex', alignItems: 'center' }}>
              <div style={{
                fontSize: 11.5, color: C.mid, background: C.light,
                border: `1px dashed ${C.border}`, borderRadius: 7, padding: '9px 12px',
                width: '100%', boxSizing: 'border-box',
              }}>
                Formula: <b style={{ color: C.navy }}>{kW} kW × 1000 × ₹{rate || '—'}/W = Base Price</b>
              </div>
            </div>
          </div>

          {/* Price breakdown cards */}
          {baseNum > 0 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <PriceCard label={`Base Price  (${kW}kW × 1000W × ₹${rate}/W)`} value={fmtRs(baseNum)} />
                <PriceCard label="GST @ 5%"                                      value={fmtRs(gstNum)} />
              </div>
              <div style={{
                background: C.orange, borderRadius: 8, padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Total Price (Incl. GST)</span>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 17 }}>{fmtRs(totalNum)}</span>
              </div>
            </>
          ) : (
            <div style={{
              padding: '28px 20px', textAlign: 'center', background: C.light,
              borderRadius: 8, color: C.mid, fontSize: 13,
            }}>
              ⚡ Enter System Capacity (Step 3) and Rate per Watt above to auto-calculate pricing.
            </div>
          )}
        </>
      );

      /* ── STEP 4: Payment Mode ─────────────────────────────────────────── */
      case 4: return (
        <>
          <SectionHead title="Payment Mode" />

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {['Cash', 'EMI / Loan'].map(mode => (
              <button key={mode}
                      onClick={() => setForm(p => ({ ...p, payment_mode: mode }))}
                      style={{
                        flex: 1, padding: '14px 10px', border: '2px solid',
                        borderColor: form.payment_mode === mode ? C.navy : C.border,
                        borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                        background: form.payment_mode === mode ? C.navy : 'white',
                        color: form.payment_mode === mode ? 'white' : C.mid,
                        transition: 'all .2s',
                      }}>
                {mode === 'Cash' ? '💵 Cash Payment' : '📊 EMI / Loan'}
              </button>
            ))}
          </div>

          {form.payment_mode === 'Cash' && (
            <div style={{
              padding: '20px', background: '#F0FFF4', border: `1.5px solid #68D391`,
              borderRadius: 8, textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 700, color: C.green, fontSize: 14 }}>Full Cash Payment</div>
              <div style={{ color: C.mid, fontSize: 12, marginTop: 4 }}>
                Total amount payable: <b style={{ color: C.navy }}>{fmtRs(totalNum)}</b>
              </div>
              <div style={{ color: C.mid, fontSize: 11.5, marginTop: 8 }}>
                Proceed to generate your quotation PDF. No EMI calculations required.
              </div>
            </div>
          )}

          {form.payment_mode === 'EMI / Loan' && (
            <div style={{ background: C.light, padding: '18px', borderRadius: 10, border: `1.5px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 14 }}>
                📊 EMI / Loan Configuration
              </div>

              {/* Total to finance */}
              <div style={{
                background: C.navy, borderRadius: 7, padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', marginBottom: 14,
              }}>
                <span style={{ color: '#AABBDD', fontSize: 12 }}>Total Project Cost (Incl. GST)</span>
                <b style={{ color: 'white', fontSize: 14 }}>{fmtRs(totalNum)}</b>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Field label="Down Payment (₹)" name="emi_down_payment" type="number" half
                       value={form.emi_down_payment} onChange={update} hint="Amount paid upfront" />
                <div style={{ flex: '0 0 calc(50% - 6px)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 4 }}>Loan Amount (₹)</div>
                  <div style={{
                    padding: '9px 12px', background: '#EBF9FB', border: `1.5px solid ${C.teal}`,
                    borderRadius: 7, fontSize: 13, color: C.navy, fontWeight: 700,
                  }}>
                    {totalNum > 0 && (parseFloat(form.emi_down_payment) || 0) >= 0
                      ? fmtRs(Math.max(0, totalNum - (parseFloat(form.emi_down_payment) || 0)))
                      : '—'}
                  </div>
                </div>
                <Field label="Rate of Interest (% p.a.)" name="emi_roi" type="number" half
                       value={form.emi_roi} onChange={update} hint="e.g. 12" />
                <Field label="Tenure (Months)" name="emi_tenure" type="number" half
                       value={form.emi_tenure} onChange={update} hint="e.g. 60" />
              </div>

              {financeSim && (
                <div style={{ marginTop: 16, borderTop: `2px dashed ${C.border}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 10 }}>
                    📈 EMI Calculation Results
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { l: 'Down Payment',        v: fmtRs(financeSim.downPayment),    hi: false },
                      { l: 'Loan Amount',          v: fmtRs(financeSim.loanAmount),    hi: false },
                      { l: 'Rate of Interest',     v: `${financeSim.interestRate}% p.a.`, hi: false },
                      { l: 'Tenure',               v: `${financeSim.tenure} Months`,   hi: false },
                      { l: '📅 Monthly EMI',       v: fmtRs(financeSim.emiAmount),     hi: true  },
                      { l: '💰 Total Interest',    v: fmtRs(financeSim.totalInterest), hi: false },
                      { l: '🧾 Total Payable',     v: fmtRs(financeSim.totalPayable),  hi: true  },
                    ].map(({ l, v, hi }) => (
                      <div key={l} style={{
                        padding: '10px 12px', borderRadius: 7,
                        background: hi ? C.navy : 'white',
                        border: `1.5px solid ${hi ? C.navy : C.border}`,
                      }}>
                        <div style={{ fontSize: 10.5, color: hi ? '#AABBDD' : C.mid, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: hi ? 15 : 13, fontWeight: 700, color: hi ? 'white' : C.text }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!financeSim && totalNum > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: C.mid, textAlign: 'center' }}>
                  Enter down payment, rate of interest and tenure to calculate EMI.
                </div>
              )}
            </div>
          )}
        </>
      );

      /* ── STEP 5: Review & Generate ────────────────────────────────────── */
      case 5: return (
        <>
          <SectionHead title="Quotation Numbering" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: '0 0 calc(50% - 6px)', minWidth: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.teal, display: 'block', marginBottom: 4 }}>
                Quotation Sequence No (Auto-Generated)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  name="quotation_no_seq"
                  value={form.quotation_no_seq}
                  onChange={update}
                  type="text"
                  style={{
                    flex: 1, padding: '9px 12px', border: `1.5px solid ${C.border}`,
                    borderRadius: 7, fontSize: 13, outline: 'none', background: C.light,
                    color: C.navy, fontWeight: 600
                  }}
                  placeholder="Auto-fetching..."
                />
                <button
                  type="button"
                  onClick={fetchNextSeq}
                  disabled={seqLoading}
                  style={{
                    padding: '9px 14px', background: C.teal, color: 'white', border: 'none',
                    borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {seqLoading ? '...' : 'Refresh'}
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: C.teal, marginTop: 4 }}>
                ✓ Auto-checked from database for FY {financialYear}
              </div>
            </div>
            <div style={{ flex: '0 0 calc(50% - 6px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                padding: '9px 14px', background: Boolean(form.quotation_no_seq) ? '#EBF9FB' : C.light,
                border: `1.5px solid ${Boolean(form.quotation_no_seq) ? C.teal : C.border}`,
                borderRadius: 7, fontSize: 14, fontWeight: 700,
                color: Boolean(form.quotation_no_seq) ? C.navy : C.mid,
              }}>
                {offerNo}
              </div>
              <div style={{ fontSize: 10.5, color: C.mid, marginTop: 3 }}>
                PDF will be saved as: <b>{offerNo.replace(/\//g, '-')}.pdf</b>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: C.border, margin: '20px 0' }} />
          <SectionHead title="Review Summary" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>CUSTOMER</div>
              <RRow label="Name"       value={form.customer_name} />
              <RRow label="Address"    value={form.address} />
              <RRow label="Contact"    value={form.contact_number} />

              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginTop: 12, marginBottom: 6 }}>SYSTEM</div>
              <RRow label="Capacity"   value={`${form.system_capacity_kw} kW`} bold />
              <RRow label="Panels"     value={`${panelCount} Nos. × ${panelWatt}Wp`} />
              <RRow label="Inverter"   value={form.inverter_type} />
              <RRow label="Invr. Brand" value={form.inverter_brand} />
              {(form.battery_brand || (form.battery_voltage && form.battery_voltage !== 'N/A')) && (
                 <RRow label="Battery" value={`${form.battery_brand} ${form.battery_voltage !== 'N/A' ? `(${form.battery_voltage})` : ''}`} />
              )}
              <RRow label="DISCOM"     value={form.electricity_provider} />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>PRICING</div>
              <RRow label="Rate/Watt"  value={`₹ ${form.rate_per_watt}/W`} />
              <RRow label="Base Price" value={`₹ ${fmt(baseNum)}`} />
              <RRow label="GST @ 5%"  value={`₹ ${fmt(gstNum)}`} />
              <div style={{
                background: C.orange, borderRadius: 6, padding: '10px 14px', marginTop: 8,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>Total (incl. GST)</span>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{fmtRs(totalNum)}</span>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginTop: 12, marginBottom: 6 }}>PAYMENT</div>
              <RRow label="Mode"       value={form.payment_mode} bold />
              {financeSim && (
                <>
                  <RRow label="Loan Amount"   value={fmtRs(financeSim.loanAmount)} />
                  <RRow label="Monthly EMI"   value={fmtRs(financeSim.emiAmount)} bold />
                  <RRow label="Total Interest" value={fmtRs(financeSim.totalInterest)} />
                  <RRow label="Total Payable" value={fmtRs(financeSim.totalPayable)} bold />
                </>
              )}
            </div>
          </div>
        </>
      );

      default: return null;
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: C.text, maxWidth: 820, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        background: C.navy, borderRadius: 10, padding: '14px 20px',
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ background: C.orange, borderRadius: 6, padding: '4px 12px', fontWeight: 700, color: 'white', fontSize: 14 }}>
          REON
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{editData ? 'Edit Solar Quotation' : 'Dynamic Solar Quotation Builder'}</div>
          <div style={{ color: '#AABBDD', fontSize: 11 }}>
            Auto-pricing engine · EMI calculator · PDF generator
          </div>
        </div>
        {editData && (
          <button onClick={onClearEdit} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Cancel Edit</button>
        )}
      </div>

      {/* Progress */}
      <ProgressBar />

      {/* Card */}
      <div style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '24px 28px', minHeight: 320 }}>
        {stepContent()}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEE', border: '1px solid #F99', borderRadius: 6, color: '#c00', fontSize: 12.5 }}>
          ⚠ {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 10 }}>
        {successUrl ? (
          <>
            <button onClick={() => { setStep(0); setForm(INIT); setFinanceSim(null); setSuccessUrl(null); }}
                    style={{ padding: '10px 24px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Create Another
            </button>
            <a href={successUrl} target="_blank" rel="noreferrer"
               download
               style={{ padding: '10px 32px', border: 'none', borderRadius: 8, background: C.green, color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-block' }}>
              ⬇ Download PDF
            </a>
          </>
        ) : (
          <>
            <button onClick={back} disabled={step === 0 || loading}
                    style={{ padding: '10px 24px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: step === 0 ? 0.4 : 1 }}>
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={next} disabled={!isValid()}
                      style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: isValid() ? C.navy : C.border, color: 'white', fontWeight: 700, fontSize: 13, cursor: isValid() ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !isValid()}
                      style={{ padding: '10px 32px', border: 'none', borderRadius: 8, background: C.orange, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? '⏳ Generating…' : '📄 Generate Quotation PDF'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
