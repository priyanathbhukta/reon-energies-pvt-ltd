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
  capacity:             '3.5 KWp',
  module_technology:    'Mono-Crystalline Bifacial N-Type Topcon Silicon Technology',
  inverter_type:        'String Inverter (On-Grid)',
  brands:               'UTL / ADANI / VIKRAM / LUMINOUS / SOLIS / TATA',
  power_evacuation:     '230 VAC Single Phase',
  project_type:         'Turnkey EPC Project',
  // pricing
  base_price:           '',
  gst_amount:           '',
  total_price:          '',
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
    setForm(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));

    // Auto-calculate GST & total when base_price changes
    if (name === 'base_price') {
      const base = parseFloat(value.replace(/,/g, '')) || 0;
      const gst  = Math.round(base * 0.05);
      const total = base + gst;
      const fmt = n => n.toLocaleString('en-IN');
      setForm(prev => ({
        ...prev,
        base_price: value,
        gst_amount:  fmt(gst),
        total_price: fmt(total),
      }));
    }
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const isValid = () => {
    if (step === 0) return form.customer_name.trim().length > 0;
    if (step === 3) return form.base_price && form.total_price;
    return true;
  };

  const handleSubmit = () => onSubmit && onSubmit(form);

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
            <Field label="System Capacity" name="capacity"
                   value={form.capacity} onChange={update} half
                   options={['1 KWp','1.5 KWp','2 KWp','3 KWp','3.5 KWp',
                             '4 KWp','5 KWp','6 KWp','8 KWp','10 KWp',
                             '15 KWp','20 KWp','25 KWp','30 KWp','40 KWp',
                             '50 KWp','75 KWp','100 KWp','Custom']} />
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
            <Field label="Base Price (₹) *" name="base_price"
                   value={form.base_price} onChange={update} required
                   hint="e.g. 1,60,000  — GST auto-calculated" half />
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
            💡 Base Price is without GST. GST @ 5% is automatically calculated.
            You can override any field manually.
          </div>
        </>
      );

      case 4: return (
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
              <RRow label="Capacity"     value={form.capacity} />
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
            </div>
          </div>

          {/* Validity notice */}
          <div style={{ marginTop:20, padding:'10px 14px', background:C.light,
                        borderLeft:`3px solid ${C.teal}`, borderRadius:4,
                        fontSize:12, color:C.mid }}>
            📅 The quotation will be valid for <strong>30 days</strong> from today's date.
            The offer number will be auto-assigned on generation.
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
