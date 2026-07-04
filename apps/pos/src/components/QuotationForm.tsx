'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

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
  // pricing
  rate_per_watt:        '',
  // payment
  payment_mode:         'Cash',
  emi_down_payment:     '',
  emi_roi:              '12',
  emi_tenure:           '60',
  // quotation
  quotation_no_seq:     '',
};

/* ── Reusable field component ──────────────────────────────────────── */
function Field({ label, name, value, onChange, type = 'text', required = false,
                 options, hint, half, readOnly, warn }: any) {
  const inputStyle: React.CSSProperties = {
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
          {options.map((o: any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
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
function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{title}</div>
      <div style={{ height: 2, background: C.teal, marginTop: 4, borderRadius: 1 }} />
    </div>
  );
}

/* ── Review row ──────────────────────────────────────────────────────────── */
function RRow({ label, value, bold }: any) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, fontSize: 12.5, padding: '6px 0' }}>
      <div style={{ width: '42%', color: C.teal, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: bold ? C.navy : C.text, fontWeight: bold ? 700 : 400 }}>{value}</div>
    </div>
  );
}

/* ── Info card for pricing ────────────────────────────────────────────────── */
function PriceCard({ label, value, accent }: any) {
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

interface QuotationFormProps {
  editData?: any;
  onClearEdit?: () => void;
}

export default function QuotationForm({ editData, onClearEdit }: QuotationFormProps) {
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState<any>(INIT);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [financeSim, setFinanceSim] = useState<any>(null);

  // ─── Derived pricing values ────────────────────────────────────────────────
  const kW       = parseFloat(form.system_capacity_kw) || 0;
  const rate     = parseFloat(form.rate_per_watt) || 0;
  const baseNum  = kW > 0 && rate > 0 ? kW * 1000 * rate : 0;
  const gstNum   = Math.round(baseNum * 0.05);
  const totalNum = baseNum + gstNum;

  const fmt = (n: any) => (isNaN(n) || n === 0) ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtRs = (n: any) => `₹ ${fmt(n)}`;

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

  const update = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
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
    if (step === 5) return /^\d{3}$/.test(form.quotation_no_seq);
    return true;
  };

  const offerNo = `REPL/26-27/${form.quotation_no_seq || 'NNN'}`;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessUrl(null);
    try {
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

      const response = await api.post('/quotations', payload);
      const data = response.data;
      if (data.success && data.pdfUrl) {
        setSuccessUrl(data.pdfUrl);
      } else {
        throw new Error('No PDF URL returned in response');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
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
                   onChange={update} hint="e.g. 9876543210" half />
            <Field label="Email Address" name="email" value={form.email}
                   onChange={update} hint="customer@email.com" half />
            <Field label="Installation State" name="state" value={form.state}
                   onChange={update} hint="e.g. West Bengal" half />
          </div>
        </>
      );

      /* ── STEP 1: Project ──────────────────────────────────────────────── */
      case 1: return (
        <>
          <SectionHead title="Solar Project Scope" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Field label="Project Category" name="project_category" value={form.project_category}
                   onChange={update} required half
                   options={['Residential', 'Commercial', 'Industrial', 'Agricultural']} />
            <Field label="Type of Roof" name="roof_type" value={form.roof_type}
                   onChange={update} required half
                   options={[
                     'Sheet Roof / Grounded RCC with GI',
                     'Flat RCC Slab',
                     'Sloped Tile Roof',
                     'Elevated Super Structure',
                     'Ground Mounted',
                   ]} />
            <Field label="Project Location Type" name="project_location" value={form.project_location}
                   onChange={update} hint="e.g. Rooftop, Grounded Area" half />
            <Field label="Electricity Provider (DISCOM)" name="electricity_provider" value={form.electricity_provider}
                   onChange={update} required half
                   options={['WBSEDCL', 'CESC', 'MSEDCL', 'TNEB', 'UPPCL', 'BESCOM', 'Other']} />
            <Field label="Average Monthly Bill" name="monthly_bill" type="number"
                   value={form.monthly_bill} onChange={update} hint="e.g. 5000" half />
            <Field label="Target Power Factor" name="power_factor" type="text"
                   value={form.power_factor} onChange={update} hint="e.g. 0.95 or N/A" half />
          </div>
        </>
      );

      /* ── STEP 2: PV System ────────────────────────────────────────────── */
      case 2: return (
        <>
          <SectionHead title="Technical Specifications" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Field label="System Capacity (kW) *" name="system_capacity_kw" type="number"
                   value={form.system_capacity_kw} onChange={update} required half hint="e.g. 5" />
            <Field label="Solar Panel Rating (Wp) *" name="panel_watt" type="number"
                   value={form.panel_watt} onChange={update} required half hint="e.g. 590" />
            <Field label="Solar Module Technology" name="module_technology" value={form.module_technology}
                   onChange={update} required
                   options={[
                     'Mono-Crystalline Bifacial N-Type Topcon Silicon Technology',
                     'Mono-Crystalline Monofacial Topcon Technology',
                     'Polycrystalline Silicon Cells',
                     'Thin Film PV Modules',
                   ]} />
            <Field label="Solar Inverter Class" name="inverter_type" value={form.inverter_type}
                   onChange={update} required half
                   options={[
                     'String Inverter (On-Grid)',
                     'Hybrid Inverter (On-Grid + Off-Grid)',
                     'Micro Inverter System',
                     'Off-Grid Inverter',
                   ]} />
            <Field label="Power Evacuation Grid" name="power_evacuation" value={form.power_evacuation}
                   onChange={update} required half
                   options={['230 VAC Single Phase', '415 VAC Three Phase']} />
            <Field label="Project Execution Mode" name="project_type" value={form.project_type}
                   onChange={update} required half
                   options={['Turnkey EPC Project', 'Supply Only (No Erection)', 'Erection Only']} />
            <Field label="Inverter Brand Preference" name="inverter_brand" value={form.inverter_brand}
                   onChange={update} half hint="e.g. Solis / Growatt / Sungrow" />
            <Field label="Approved Solar Brands" name="brands" value={form.brands}
                   onChange={update} hint="e.g. Adani, Waaree, Vikram, Tata" />
            
            <div style={{ height: 1, width: '100%', background: C.border, margin: '8px 0' }} />
            
            <Field label="Battery Brand (If Hybrid/Off-grid)" name="battery_brand" value={form.battery_brand}
                   onChange={update} half hint="e.g. Luminous, Okaya, N/A" />
            <Field label="Battery Voltage/Ah Rating" name="battery_voltage" value={form.battery_voltage}
                   onChange={update} half hint="e.g. 48V 150Ah or N/A" />
          </div>
        </>
      );

      /* ── STEP 3: Pricing ──────────────────────────────────────────────── */
      case 3: return (
        <>
          <SectionHead title="Pricing & Calculations" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <Field label="Rate per Watt (₹/W) *" name="rate_per_watt" type="number"
                   value={form.rate_per_watt} onChange={update} required hint="e.g. 52" />
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <PriceCard label="Base Price (excl. GST)" value={kW > 0 && rate > 0 ? fmtRs(baseNum) : '—'} />
            <PriceCard label="GST Amount (5%)" value={kW > 0 && rate > 0 ? fmtRs(gstNum) : '—'} />
            <PriceCard label="Estimated Panels Required" value={panelCount > 0 ? `${panelCount} Nos. (${panelWatt}Wp)` : '—'} />
            <PriceCard label="Total Price (incl. GST)" value={kW > 0 && rate > 0 ? fmtRs(totalNum) : '—'} accent />
          </div>
        </>
      );

      /* ── STEP 4: Payment ──────────────────────────────────────────────── */
      case 4: return (
        <>
          <SectionHead title="Payment Terms & EMI Simulator" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <Field label="Payment Mode" name="payment_mode" value={form.payment_mode}
                   onChange={update} required half
                   options={['Cash', 'Bank Transfer (NEFT/RTGS)', 'Cheque', 'EMI / Loan']} />
          </div>

          {form.payment_mode === 'EMI / Loan' && (
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Field label="Loan Down Payment (₹)" name="emi_down_payment" type="number" half
                       value={form.emi_down_payment} onChange={update} hint="e.g. 50000" />
                <div style={{ flex: '0 0 calc(50% - 6px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: C.mid, fontWeight: 600, marginBottom: 4 }}>Financed Loan Amount</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
                    {totalNum > 0
                      ? fmtRs(totalNum - (parseFloat(form.emi_down_payment) || 0))
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
            <Field label="3-Digit Sequence Number *" name="quotation_no_seq" type="text"
                   value={form.quotation_no_seq} onChange={update}
                   hint="e.g. 001, 042, 110" required half
                   warn={seqWarn()} />
            <div style={{ flex: '0 0 calc(50% - 6px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                padding: '9px 14px', background: /^\d{3}$/.test(form.quotation_no_seq) ? '#EBF9FB' : C.light,
                border: `1.5px solid ${/^\d{3}$/.test(form.quotation_no_seq) ? C.teal : C.border}`,
                borderRadius: 7, fontSize: 14, fontWeight: 700,
                color: /^\d{3}$/.test(form.quotation_no_seq) ? C.navy : C.mid,
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
      <div style={{ display: 'flex', justifyContents: 'space-between', marginTop: 18, gap: 10 }}>
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
