// frontend/src/components/QuotationForm.jsx
import React, { useState } from 'react';

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
};

/* ── Step definitions ────────────────────────────────────────────────────── */
const STEPS = [
  { id: 'customer',   label: 'Customer Details' },
  { id: 'project',    label: 'Project Details' },
  { id: 'system',     label: 'PV System' },
  { id: 'pricing',    label: 'Pricing' },
  { id: 'payment',    label: 'Payment Mode' },
  { id: 'review',     label: 'Review & Generate' },
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
  capacity_kw:          '45',
  panel_watt:           '550',
  rate_per_watt:        '',
  module_technology:    'Mono-Crystalline Bifacial N-Type Topcon Silicon Technology',
  inverter_type:        'String Inverter (On-Grid)',
  brands:               'UTL / ADANI / VIKRAM / LUMINOUS / SOLIS / TATA',
  power_evacuation:     '230 VAC Single Phase',
  project_type:         'Turnkey EPC Project',
  // pricing
  base_price:           '',
  gst_amount:           '',
  total_price:          '',
  // payment
  payment_mode:         'Cash',
  down_payment:         '',
  loan_amount:          '',
  interest_rate:        '',
  tenure:               '',
  // offer
  offer_no_manual:      '',
};

/* ── Tiny reusable field component ──────────────────────────────────────── */
function Field({ label, name, value, onChange, type='text', required=false,
                 options, hint, half }) {
  const inputStyle = {
    width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`,
    borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit',
    background: 'white', color: C.text, boxSizing: 'border-box',
    transition: 'border-color .15s',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: C.teal,
                        display: 'block', marginBottom: 4 };

  return (
    <div style={{ flex: half ? '0 0 calc(50% - 6px)' : '1 1 100%', minWidth: 0 }}>
      <label style={labelStyle}>{label}{required && <span style={{color:C.orange}}> *</span>}</label>
      {options ? (
        <select name={name} value={value} onChange={onChange} style={inputStyle}
                onFocus={e=>e.target.style.borderColor=C.teal}
                onBlur={e=>e.target.style.borderColor=C.border}>
          {options.map(o =>
            <option key={o.value||o} value={o.value||o}>{o.label||o}</option>
          )}
        </select>
      ) : (
        <input name={name} value={value} onChange={onChange}
               type={type} style={inputStyle} placeholder={hint||''}
               onFocus={e=>e.target.style.borderColor=C.teal}
               onBlur={e=>e.target.style.borderColor=C.border} />
      )}
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
function RRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`,
                  fontSize: 12.5, padding: '6px 0' }}>
      <div style={{ width:'40%', color: C.teal, fontWeight:600 }}>{label}</div>
      <div style={{ flex:1, color: C.text }}>{value}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════════════════ */
export default function QuotationForm({ onSubmit, loading, error }) {
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState(INIT);
  const [touched, setTouched] = useState({});

  const update = e => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    setForm(prev => {
      const nextForm = { ...prev, [name]: value };
      const fmt = n => n.toLocaleString('en-IN');
      
      if (name === 'capacity_kw' || name === 'rate_per_watt') {
        const kw = parseFloat(nextForm.capacity_kw) || 0;
        const rate = parseFloat(nextForm.rate_per_watt) || 0;
        if (kw > 0 && rate > 0) {
          const base = kw * 1000 * rate;
          const gst = Math.round(base * 0.05);
          const total = base + gst;
          nextForm.base_price = fmt(base);
          nextForm.gst_amount = fmt(gst);
          nextForm.total_price = fmt(total);
        }
      }

      // Auto-calculate GST & total when base_price changes manually
      if (name === 'base_price') {
        const base = parseFloat(value.replace(/,/g, '')) || 0;
        const gst  = Math.round(base * 0.05);
        const total = base + gst;
        nextForm.base_price = value;
        nextForm.gst_amount = fmt(gst);
        nextForm.total_price = fmt(total);
      }

      // Auto-calculate loan amount if down_payment changes
      if (name === 'down_payment') {
        const total = parseFloat(String(nextForm.total_price).replace(/,/g, '')) || 0;
        const dp = parseFloat(value) || 0;
        if (total > dp) {
          nextForm.loan_amount = Math.round(total - dp).toString();
        }
      }

      return nextForm;
    });
  };

  const calcEmi = (loan, rate, tenure) => {
    const p = parseFloat(loan) || 0;
    const r = (parseFloat(rate) || 0) / 12 / 100;
    const n = parseInt(tenure) || 0;
    if (p <= 0 || n <= 0) return { emi: 0, total_interest: 0, total_emi_paid: 0 };
    if (r <= 0) {
      const emi = p / n;
      return { emi: Math.round(emi), total_interest: 0, total_emi_paid: Math.round(p) };
    }
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total_paid = emi * n;
    return {
      emi: Math.round(emi),
      total_interest: Math.round(total_paid - p),
      total_emi_paid: Math.round(total_paid)
    };
  };

  const emiData = calcEmi(form.loan_amount, form.interest_rate, form.tenure);

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const isValid = () => {
    if (step === 0) return form.customer_name.trim().length > 0;
    if (step === 3) return form.base_price && form.total_price;
    return true;
  };

  const handleSubmit = () => {
    if (onSubmit) {
      const panelW = parseInt(form.panel_watt) || 550;
      const seq    = form.offer_no_manual.trim();
      // Build full offer number: REPL/26-27/NNN  (only if sequence entered)
      const fullOfferNo = seq ? `REPL/26-27/${seq}` : null;
      onSubmit({
        ...form,
        ...emiData,
        capacity:        form.capacity_kw ? `${form.capacity_kw} KWp` : '',
        panel_watt:      panelW,
        panel_spec:      `${panelW}Wp Mono-Crystalline Bifacial N-Type Topcon`,
        offer_no_manual: fullOfferNo,
      });
    }
  };


  /* ── Pill progress bar ───────────────────────────────────────────────────── */
  const ProgressBar = () => (
    <div style={{ display:'flex', gap:4, marginBottom:24 }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ flex:1, cursor:'pointer' }}
             onClick={() => i < step && setStep(i)}>
          <div style={{
            height: 4, borderRadius: 4,
            background: i <= step ? C.orange : C.border,
            transition: 'background .3s',
          }} />
          <div style={{
            fontSize: 10, marginTop: 4, textAlign:'center', fontWeight: 600,
            color: i === step ? C.navy : i < step ? C.teal : C.mid,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  /* ── Step panels ─────────────────────────────────────────────────────────── */
  const stepContent = () => {
    switch (step) {
      case 0: return (
        <>
          <SectionHead title="Customer Details" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
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
                   options={['West Bengal','Odisha','Jharkhand','Bihar',
                             'Assam','Other']} />
          </div>
        </>
      );

      case 1: return (
        <>
          <SectionHead title="Project Details" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            <Field label="Project Category" name="project_category"
                   value={form.project_category} onChange={update} half
                   options={['Residential','Commercial','Industrial','Agricultural']} />
            <Field label="Roof / Ground Type" name="roof_type"
                   value={form.roof_type} onChange={update} half
                   options={['Sheet Roof / Grounded RCC with GI',
                             'RCC Flat Roof','Metal Roof','Ground Mount',
                             'Carport / Shade Structure','Other']} />
            <Field label="Project Location" name="project_location"
                   value={form.project_location} onChange={update}
                   hint="Site address (if different from customer address)" />
            <Field label="Electricity Provider (DISCOM)" name="electricity_provider"
                   value={form.electricity_provider} onChange={update} half
                   options={['WBSEDCL','CESC','DVC','BSPHCL','JUSNL','Other']} />
            <Field label="Monthly Electricity Bill (₹)" name="monthly_bill"
                   value={form.monthly_bill} onChange={update} half hint="e.g. 3,500" />
            <Field label="Power Factor" name="power_factor"
                   value={form.power_factor} onChange={update} half hint="e.g. 0.95" />
          </div>
        </>
      );

      case 2: return (
        <>
          <SectionHead title="Solar PV System Specification" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            <Field label="System Capacity (kW) *" name="capacity_kw" type="number"
                   value={form.capacity_kw} onChange={update} half
                   hint="e.g. 45" required />
            <Field label="Panel Wattage (Wp) *" name="panel_watt" type="number"
                   value={form.panel_watt} onChange={update} half
                   hint="e.g. 550" required />
            {/* Auto-calculated panel count */}
            {form.capacity_kw && form.panel_watt && (
              <div style={{ flex:'1 1 100%', padding:'8px 14px',
                            background:'#EAF7F0', border:'1.5px solid #1D6B1D',
                            borderRadius:7, fontSize:12.5, color:'#1D3A1D', fontWeight:600 }}>
                📐 Panels Required: <strong>
                  {Math.ceil(parseFloat(form.capacity_kw)*1000 / (parseInt(form.panel_watt)||550))}
                </strong> Nos.&nbsp;&nbsp;
                ({form.capacity_kw} kW × 1000 / {form.panel_watt}Wp)
              </div>
            )}
            <Field label="Module Technology" name="module_technology"
                   value={form.module_technology} onChange={update} half
                   options={['Mono-Crystalline Bifacial N-Type Topcon Silicon Technology',
                             'Mono PERC','Poly-Crystalline','HJT (Heterojunction)',
                             'Bifacial Mono PERC']} />
            <Field label="Inverter Type" name="inverter_type"
                   value={form.inverter_type} onChange={update} half
                   options={['String Inverter (On-Grid)','Micro Inverter',
                             'Hybrid Inverter (On-Grid + Battery)',
                             'Off-Grid Inverter','Central Inverter']} />
            <Field label="Panel & Inverter Brands" name="brands"
                   value={form.brands} onChange={update}
                   hint="e.g. UTL / ADANI / VIKRAM" />
            <Field label="Power Evacuation" name="power_evacuation"
                   value={form.power_evacuation} onChange={update} half
                   options={['230 VAC Single Phase','415 VAC Three Phase',
                             '11kV HT','33kV HT']} />
            <Field label="Project Type" name="project_type"
                   value={form.project_type} onChange={update} half
                   options={['Turnkey EPC Project','Supply & Install',
                             'Supply Only','Civil & Structural Only']} />
          </div>
        </>
      );

      case 3: return (
        <>
          <SectionHead title="Pricing" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            <Field label="Rate per Watt (₹)" name="rate_per_watt" type="number"
                   value={form.rate_per_watt || ''} onChange={update}
                   hint="e.g. 45" half />
            <Field label="System Capacity (Watts)" name="capacity_watts"
                   value={form.capacity_kw ? (parseFloat(form.capacity_kw) * 1000).toLocaleString('en-IN') : '0'} 
                   onChange={()=>{}}
                   hint="Auto from capacity" half />
            <Field label="Base Price (₹) *" name="base_price"
                   value={form.base_price} onChange={update} required
                   hint="Auto-calculated or override" half />
            <Field label="GST Amount @ 5% (₹)" name="gst_amount"
                   value={form.gst_amount} onChange={update}
                   hint="Auto-filled from Base Price" half />
            <Field label="Total Price Incl. GST (₹) *" name="total_price"
                   value={form.total_price} onChange={update} required
                   hint="Auto-filled from Base Price" half />
          </div>

          {/* Pricing note */}
          <div style={{ marginTop:16, padding:'10px 14px',
                        background:'#FFF7F0', borderLeft:`3px solid ${C.orange}`,
                        borderRadius: 4, fontSize:12, color: C.mid }}>
            💡 Base Price is calculated as (Capacity in W × Rate). GST @ 5% is automatically calculated.
            You can override Base Price manually at any time.
          </div>
        </>
      );

      case 4: return (
        <>
          <SectionHead title="Payment Mode" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            <Field label="Payment Mode" name="payment_mode"
                   value={form.payment_mode} onChange={update} half
                   options={['Cash', 'EMI / Loan']} />
          </div>

          {form.payment_mode === 'EMI / Loan' && (
            <div style={{ marginTop:16, padding:14, background:C.light, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.navy, marginBottom:12 }}>EMI Configuration</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                <Field label="Down Payment (₹) *" name="down_payment" type="number"
                       value={form.down_payment} onChange={update} half required />
                <Field label="Loan Amount (₹) *" name="loan_amount" type="number"
                       value={form.loan_amount} onChange={update} half required />
                <Field label="Rate of Interest (% p.a.)" name="interest_rate" type="number" step="0.1"
                       value={form.interest_rate} onChange={update} half />
                <Field label="Tenure (Months) *" name="tenure" type="number"
                       value={form.tenure} onChange={update} half required />
              </div>

              {form.loan_amount && form.tenure && (
                <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  <div style={{ background:'white', padding:10, borderRadius:6, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:11, color:C.mid }}>Monthly EMI</div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.orange }}>₹ {emiData.emi.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background:'white', padding:10, borderRadius:6, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:11, color:C.mid }}>Total Interest</div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.teal }}>₹ {emiData.total_interest.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background:'white', padding:10, borderRadius:6, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:11, color:C.mid }}>Total Amount Payable</div>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text }}>₹ {(parseFloat(form.down_payment || 0) + emiData.total_emi_paid).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      );

      case 5: return (
        <>
          <SectionHead title="Review & Confirm" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Left column */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.navy,
                            marginBottom:6, textTransform:'uppercase',
                            letterSpacing:'.5px' }}>Customer</div>
              <RRow label="Name"         value={form.customer_name} />
              <RRow label="Address"      value={form.address} />
              <RRow label="Contact"      value={form.contact_number} />
              <RRow label="Email"        value={form.email} />
              <RRow label="State"        value={form.state} />

              <div style={{ fontSize:11, fontWeight:700, color:C.navy,
                            marginTop:14, marginBottom:6, textTransform:'uppercase',
                            letterSpacing:'.5px' }}>Project</div>
              <RRow label="Category"     value={form.project_category} />
              <RRow label="Roof Type"    value={form.roof_type} />
              <RRow label="DISCOM"       value={form.electricity_provider} />
              <RRow label="Monthly Bill" value={form.monthly_bill ? '₹ '+form.monthly_bill : ''} />
              <RRow label="Power Factor" value={form.power_factor} />
            </div>

            {/* Right column */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.navy,
                            marginBottom:6, textTransform:'uppercase',
                            letterSpacing:'.5px' }}>PV System</div>
              <RRow label="Capacity"     value={form.capacity_kw ? `${form.capacity_kw} KWp` : ''} />
              <RRow label="Panel Watt"   value={form.panel_watt ? `${form.panel_watt} Wp` : ''} />
              <RRow label="Panels Reqd." value={
                form.capacity_kw && form.panel_watt
                  ? `${Math.ceil(parseFloat(form.capacity_kw)*1000/(parseInt(form.panel_watt)||550))} Nos.`
                  : ''
              } />
              <RRow label="Technology"   value={form.module_technology} />
              <RRow label="Inverter"     value={form.inverter_type} />
              <RRow label="Brands"       value={form.brands} />
              <RRow label="Evacuation"   value={form.power_evacuation} />

              <div style={{ fontSize:11, fontWeight:700, color:C.navy,
                            marginTop:14, marginBottom:6, textTransform:'uppercase',
                            letterSpacing:'.5px' }}>Pricing</div>
              <RRow label="Base Price"   value={form.base_price ? '₹ '+form.base_price : ''} />
              <RRow label="GST @ 5%"    value={form.gst_amount  ? '₹ '+form.gst_amount  : ''} />

              {/* Total highlighted */}
              <div style={{ background:C.orange, borderRadius:6, padding:'10px 14px',
                            marginTop:10, display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'white', fontWeight:700, fontSize:13 }}>
                  Total (incl. GST)
                </span>
                <span style={{ color:'white', fontWeight:700, fontSize:14 }}>
                  ₹ {form.total_price}
                </span>
              </div>
              
              <div style={{ fontSize:11, fontWeight:700, color:C.navy,
                            marginTop:14, marginBottom:6, textTransform:'uppercase',
                            letterSpacing:'.5px' }}>Payment Mode</div>
              <RRow label="Mode"         value={form.payment_mode} />
              {form.payment_mode === 'EMI / Loan' && (
                <>
                  <RRow label="Down Payment" value={`₹ ${parseFloat(form.down_payment || 0).toLocaleString('en-IN')}`} />
                  <RRow label="Loan Amount"  value={`₹ ${parseFloat(form.loan_amount || 0).toLocaleString('en-IN')}`} />
                  <RRow label="Interest"     value={`${form.interest_rate || 0}% p.a.`} />
                  <RRow label="Tenure"       value={`${form.tenure} Months`} />
                  <RRow label="Monthly EMI"  value={`₹ ${emiData.emi.toLocaleString('en-IN')}`} />
                </>
              )}
            </div>
          </div>

          {/* Validity notice */}
          <div style={{ marginTop:20, padding:'10px 14px', background:C.light,
                        borderLeft:`3px solid ${C.teal}`, borderRadius:4,
                        fontSize:12, color:C.mid }}>
            📅 The quotation will be valid for <strong>30 days</strong> from today's date.
          </div>

          {/* Offer Number — sequence digits only */}
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.teal, marginBottom:6 }}>
              📋 Quotation Sequence Number
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              {/* Fixed prefix label */}
              <div style={{ padding:'9px 12px', background:C.light, border:`1.5px solid ${C.border}`,
                            borderRadius:7, fontSize:13, fontWeight:700, color:C.navy,
                            whiteSpace:'nowrap', userSelect:'none' }}>
                REPL/26-27/
              </div>
              <input
                name="offer_no_manual"
                value={form.offer_no_manual}
                onChange={update}
                placeholder="e.g. 110"
                maxLength={6}
                style={{ width:100, padding:'9px 12px', border:`1.5px solid ${C.border}`,
                          borderRadius:7, fontSize:15, fontFamily:'monospace',
                          background:'white', color:C.text, outline:'none',
                          fontWeight:700, letterSpacing:2, textAlign:'center' }}
                onFocus={e=>e.target.style.borderColor=C.teal}
                onBlur={e=>e.target.style.borderColor=C.border}
              />
              {form.offer_no_manual && (
                <div style={{ background:C.navy, color:'white', padding:'8px 16px',
                              borderRadius:7, fontWeight:700, fontSize:13, whiteSpace:'nowrap',
                              letterSpacing:1 }}>
                  ✅ REPL/26-27/{form.offer_no_manual}
                </div>
              )}
            </div>
            <div style={{ fontSize:11, color:C.mid, marginTop:5 }}>
              💡 Enter only the last digits (e.g. <strong>110</strong>). The full number <strong>REPL/26-27/110</strong> will be printed on the cover page. Leave blank to auto-assign.
            </div>
          </div>

        </>
      );

      default: return null;
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily:'system-ui, sans-serif', color:C.text,
                  maxWidth:780, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ background:C.navy, borderRadius:10, padding:'14px 20px',
                    marginBottom:24, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ background:C.orange, borderRadius:6,
                      padding:'4px 12px', fontWeight:700, color:'white', fontSize:14 }}>
          REON
        </div>
        <div>
          <div style={{ color:'white', fontWeight:700, fontSize:15 }}>
            Solar Quotation Generator
          </div>
          <div style={{ color:'#AABBDD', fontSize:11 }}>
            Fill all steps — PDF is auto-generated with your REON branding
          </div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar />

      {/* Card */}
      <div style={{ background:'white', border:`1.5px solid ${C.border}`,
                    borderRadius:12, padding:'24px 28px', minHeight:320 }}>
        {stepContent()}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop:12, padding:'10px 14px', background:'#FEE',
                      border:'1px solid #F99', borderRadius:6, color:'#c00',
                      fontSize:12.5 }}>
          ⚠ {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between',
                    marginTop:18, gap:10 }}>
        <button onClick={back} disabled={step === 0 || loading}
                style={{ padding:'10px 24px', border:`1.5px solid ${C.border}`,
                          borderRadius:8, background:'white', color:C.text,
                          fontWeight:600, fontSize:13, cursor:'pointer',
                          opacity: step === 0 ? 0.4 : 1 }}>
          ← Back
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={next} disabled={!isValid()}
                  style={{ padding:'10px 28px', border:'none', borderRadius:8,
                            background: isValid() ? C.navy : C.border,
                            color:'white', fontWeight:700, fontSize:13,
                            cursor: isValid() ? 'pointer' : 'not-allowed',
                            transition: 'background .2s' }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading || !isValid()}
                  style={{ padding:'10px 32px', border:'none', borderRadius:8,
                            background: C.orange, color:'white',
                            fontWeight:700, fontSize:13, cursor:'pointer',
                            opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Generating…' : '📄 Generate Quotation PDF'}
          </button>
        )}
      </div>
    </div>
  );
}
