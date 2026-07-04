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

const STEPS = [
  { id: 'details', label: 'Parties & Info' },
  { id: 'items',   label: 'Items & Charges' },
  { id: 'review',  label: 'Review & Generate' },
];

const INIT_COMPANY = {
  name: 'REON ENERGIES PRIVATE LIMITED',
  address: 'Address : Singherbheri, Singur, Hooghly, West Bengal, 712409\ncontact no : 8436649991',
  gstin: '19AAPCR6346E2ZX',
  pan: 'AAPCR6346E',
  email: 'info@reonenergy.in',
  phone: '+91 9876543210',
  bankName: 'Punjab National Bank',
  accountName: 'REON ENERGIES PRIVATE LIMITED',
  accountNumber: '0162202100001274',
  ifsc: 'PUNB0016220',
  branch: 'Singur',
};

const INIT_CUSTOMER = {
  name: '',
  address: '',
  gstin: '',
  state: 'West Bengal',
  email: '',
  phone: '',
};

const HSN_DATA = [
  { hsn: '85414011', desc: 'Solar PV Module (Panel)', rate: 5 },
  { hsn: '85044010', desc: 'Solar Inverter (On-grid/Hybrid)', rate: 5 },
  { hsn: '85076090', desc: 'Solar Battery (Lithium-ion/LFP)', rate: 18 },
  { hsn: '90328990', desc: 'Solar Charge Controller', rate: 18 },
  { hsn: '85176990', desc: 'Data Logger / Monitoring Device', rate: 5 },
  { hsn: '85371000', desc: 'ACDB / DCDB / Junction Box', rate: 18 },
  { hsn: '85446090', desc: 'DC Cable (PV Cable)', rate: 18 },
  { hsn: '854460', desc: 'AC/Earthing Cable', rate: 18 },
  { hsn: '85369090', desc: 'MC4 Connector / Cable Lug / Terminal', rate: 5 }, // Connector is 5, Lug is 18 (we use 18 as general, but can leave up to user)
  { hsn: '85362000', desc: 'MCB / MCCB', rate: 18 },
  { hsn: '85365090', desc: 'Isolator Switch', rate: 18 },
  { hsn: '85361000', desc: 'Fuse', rate: 18 },
  { hsn: '730890', desc: 'Module Mounting Structure (MMS)', rate: 18 },
  { hsn: '7308', desc: 'Strut Channel', rate: 18 },
  { hsn: '73269099', desc: 'Mid/End Clamp', rate: 18 },
  { hsn: '73181500', desc: 'Spring Nut / Fasteners / Anchor Bolts', rate: 18 },
  { hsn: '72159020', desc: 'Earthing Rod (Copper Bonded)', rate: 18 },
  { hsn: '38249900', desc: 'Earthing Chemical Compound', rate: 5 },
  { hsn: '85354010', desc: 'Lightning Arrester', rate: 18 },
  { hsn: '85363000', desc: 'Surge Protection Device (SPD)', rate: 18 },
  { hsn: '39172310', desc: 'PVC Conduit Pipe', rate: 18 },
  { hsn: '39174000', desc: 'PVC Pipe Fittings', rate: 18 },
  { hsn: '85381010', desc: 'Cable Tray', rate: 18 },
  { hsn: '39173900', desc: 'Flexible Conduit', rate: 18 },
  { hsn: '39269099', desc: 'Cable Ties', rate: 18 }
];

const INIT_INVOICE_DETAILS = {
  invoiceNo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15*86400000).toISOString().split('T')[0], // +15 days
  ewayBillNumber: '',
};

/* ── Tiny reusable field component ──────────────────────────────────────── */
function Field({ label, name, value, onChange, type = 'text', required = false,
                 options, hint, half, readOnly, warn, list }) {
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
        <select name={name} value={value} onChange={onChange} style={inputStyle} disabled={readOnly}
                onFocus={e => e.target.style.borderColor = C.teal}
                onBlur={e => e.target.style.borderColor = warn ? C.red : C.border}>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input name={name} value={value} onChange={onChange} type={type} style={inputStyle} placeholder={hint || ''} readOnly={readOnly} list={list}
               onFocus={e => { if (!readOnly) e.target.style.borderColor = C.teal; }}
               onBlur={e => e.target.style.borderColor = warn ? C.red : C.border} />
      )}
      {warn && <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>{warn}</div>}
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{title}</div>
      <div style={{ height: 2, background: C.teal, marginTop: 4, borderRadius: 1 }} />
    </div>
  );
}

function RRow({ label, value, bold }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, fontSize: 12.5, padding: '6px 0' }}>
      <div style={{ width: '42%', color: C.teal, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: bold ? C.navy : C.text, fontWeight: bold ? 700 : 400 }}>{value}</div>
    </div>
  );
}

export default function InvoiceForm({ editData, onClearEdit }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successUrl, setSuccessUrl] = useState(null);

  const [companyDetails, setCompanyDetails] = useState(INIT_COMPANY);
  const [customerDetails, setCustomerDetails] = useState(INIT_CUSTOMER);
  const [invoiceDetails, setInvoiceDetails] = useState({ ...INIT_INVOICE_DETAILS, invoiceNo: `INV/26-27/001` });
  
  const [items, setItems] = useState([{ id: 1, name: '', description: '', hsn: '', quantity: 1, unit: 'Nos', rate: 0, tax: 18 }]);
  const [charges, setCharges] = useState({ loadingCharges: 0 });

  useEffect(() => {
    if (editData) {
        try {
            const parsedCompany = typeof editData.company_details === 'string' ? JSON.parse(editData.company_details) : editData.company_details;
            const parsedCustomer = typeof editData.customer_details === 'string' ? JSON.parse(editData.customer_details) : editData.customer_details;
            const parsedInvoice = typeof editData.invoice_details === 'string' ? JSON.parse(editData.invoice_details) : editData.invoice_details;
            const parsedItems = typeof editData.items === 'string' ? JSON.parse(editData.items) : editData.items;

            setCompanyDetails(parsedCompany || INIT_COMPANY);
            setCustomerDetails(parsedCustomer || INIT_CUSTOMER);
            setInvoiceDetails(parsedInvoice || { ...INIT_INVOICE_DETAILS, invoiceNo: `INV/26-27/001` });
            setItems(parsedItems || [{ id: 1, name: '', description: '', hsn: '', quantity: 1, unit: 'Nos', rate: 0, tax: 18 }]);
            setStep(0);
            setSuccessUrl(null);
        } catch(e) {
            console.error('Error loading editData', e);
        }
    }
  }, [editData]);

  const fmt = n => (isNaN(n) || n === 0) ? '0.00' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const fmtRs = n => `₹ ${fmt(n)}`;

  // Calculations
  const calcItem = (item) => {
    const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    const taxAmt = total * ((parseFloat(item.tax) || 0) / 100);
    return { total, taxAmt, final: total + taxAmt };
  };

  const getSubtotal = () => items.reduce((sum, item) => sum + calcItem(item).total, 0);
  const getTaxTotal = () => items.reduce((sum, item) => sum + calcItem(item).taxAmt, 0);
  const getGrandTotal = () => {
    const base = getSubtotal() + getTaxTotal();
    const lc = parseFloat(charges.loadingCharges) || 0;
    return Math.round(base + lc);
  };

  const updateObj = (setter) => (e) => setter(p => ({ ...p, [e.target.name]: e.target.value }));
  
  const addItem = () => setItems(p => [...p, { id: Date.now(), name: '', description: '', hsn: '', quantity: 1, unit: 'Nos', rate: 0, tax: 18 }]);
  const removeItem = (id) => setItems(p => p.filter(i => i.id !== id));
  const updateItem = (id, field, val) => setItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i));

  const isValid = () => {
    if (step === 0) return customerDetails.name.trim().length > 0 && invoiceDetails.invoiceNo.trim().length > 0;
    if (step === 1) return items.some(i => i.name.trim().length > 0 && parseFloat(i.rate) > 0);
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const payload = {
        companyDetails,
        customerDetails,
        invoiceDetails,
        items,
        charges,
        subtotal: getSubtotal(),
        cgstTotal: getTaxTotal() / 2,
        sgstTotal: getTaxTotal() / 2,
        grandTotal: getGrandTotal(),
      };

      const response = await fetch(`${API}/api/admin/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate invoice');
      if (data.success && data.pdfUrl) {
        setSuccessUrl(data.pdfUrl);
      } else {
        throw new Error('No PDF URL returned');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ flex: 1, cursor: i < step ? 'pointer' : 'default' }} onClick={() => i < step && setStep(i)}>
          <div style={{ height: 4, borderRadius: 4, background: i < step ? C.teal : i === step ? C.orange : C.border, transition: 'background .3s' }} />
          <div style={{ fontSize: 9.5, marginTop: 4, textAlign: 'center', fontWeight: 600, color: i === step ? C.navy : i < step ? C.teal : C.mid }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  const stepContent = () => {
    switch (step) {
      case 0: return (
        <>
          <SectionHead title="Invoice Details" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <Field label="Invoice No *" name="invoiceNo" value={invoiceDetails.invoiceNo} onChange={updateObj(setInvoiceDetails)} half required />
            <Field label="Invoice Date" name="invoiceDate" value={invoiceDetails.invoiceDate} onChange={updateObj(setInvoiceDetails)} type="date" half />
            <Field label="Due Date" name="dueDate" value={invoiceDetails.dueDate} onChange={updateObj(setInvoiceDetails)} type="date" half />
            <Field label="E-way Bill No" name="ewayBillNumber" value={invoiceDetails.ewayBillNumber} onChange={updateObj(setInvoiceDetails)} half />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <SectionHead title="Customer (Bill To) *" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Customer Name" name="name" value={customerDetails.name} onChange={updateObj(setCustomerDetails)} required />
                <Field label="Address" name="address" value={customerDetails.address} onChange={updateObj(setCustomerDetails)} />
                <div style={{ display: 'flex', gap: 12 }}>
                  <Field label="Mobile Number" name="phone" value={customerDetails.phone} onChange={updateObj(setCustomerDetails)} half />
                  <Field label="Email Address" type="email" name="email" value={customerDetails.email} onChange={updateObj(setCustomerDetails)} half />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Field label="GSTIN" name="gstin" value={customerDetails.gstin} onChange={updateObj(setCustomerDetails)} half />
                  <Field label="State" name="state" value={customerDetails.state} onChange={updateObj(setCustomerDetails)} half />
                </div>
              </div>
            </div>
            <div>
              <SectionHead title="Company (Issuer - Fixed)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Legal Name" name="name" value={companyDetails.name} readOnly />
                <Field label="Address" name="address" value={companyDetails.address} readOnly />
                <div style={{ display: 'flex', gap: 12 }}>
                  <Field label="GSTIN" name="gstin" value={companyDetails.gstin} readOnly half />
                  <Field label="PAN" name="pan" value={companyDetails.pan} readOnly half />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Field label="A/C No" name="accountNumber" value={companyDetails.accountNumber} readOnly half />
                  <Field label="IFSC Code" name="ifsc" value={companyDetails.ifsc} readOnly half />
                </div>
                <Field label="Bank Name" name="bankName" value={`${companyDetails.bankName} - ${companyDetails.branch}`} readOnly />
              </div>
            </div>
          </div>
        </>
      );
      case 1: return (
        <>
          <SectionHead title="Line Items" />
          <datalist id="hsn-codes">
            {HSN_DATA.map((h, i) => (
              <option key={i} value={h.hsn}>{h.desc} ({h.rate}%)</option>
            ))}
          </datalist>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, idx) => (
              <div key={item.id} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.navy }}>ITEM {idx + 1}</span>
                  {items.length > 1 && <button onClick={() => removeItem(item.id)} style={{ color: C.red, fontSize: 11, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: '1 1 30%', minWidth: 200 }}><Field label="Item Name *" name="name" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} /></div>
                  <div style={{ flex: '1 1 20%', minWidth: 120 }}>
                    <Field label="HSN Code" name="hsn" value={item.hsn} list="hsn-codes" onChange={e => {
                      const val = e.target.value;
                      updateItem(item.id, 'hsn', val);
                      // Auto-fill GST rate if matching HSN
                      const match = HSN_DATA.find(h => h.hsn === val);
                      if (match) updateItem(item.id, 'tax', match.rate);
                    }} />
                  </div>
                  <div style={{ flex: '1 1 10%', minWidth: 60 }}><Field label="Qty" name="quantity" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} /></div>
                  <div style={{ flex: '1 1 10%', minWidth: 80 }}><Field label="Unit" name="unit" options={['Nos', 'Pieces', 'Set', 'Lot', 'Meters', 'Foot', 'Inch', 'Sq.ft', 'Kgs', 'kW', 'Watts', 'Rolls']} value={item.unit || 'Nos'} onChange={e => updateItem(item.id, 'unit', e.target.value)} /></div>
                  <div style={{ flex: '1 1 15%', minWidth: 80 }}><Field label="Rate (₹)" name="rate" type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} /></div>
                  <div style={{ flex: '1 1 10%', minWidth: 60 }}><Field label="Tax %" name="tax" options={[0, 5, 12, 18, 28]} value={item.tax} onChange={e => updateItem(item.id, 'tax', e.target.value)} /></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: C.mid, marginRight: 10 }}>Total: <b style={{ color: C.navy }}>{fmtRs(calcItem(item).total)}</b></span>
                  <span style={{ color: C.mid }}>Tax: <b style={{ color: C.teal }}>{fmtRs(calcItem(item).taxAmt)}</b></span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addItem} style={{ marginTop: 12, padding: '8px 16px', border: `1.5px dashed ${C.teal}`, background: '#EBF9FB', color: C.teal, fontWeight: 600, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Add Another Item</button>
          
          <div style={{ marginTop: 24 }}>
            <SectionHead title="Additional Charges" />
            <Field label="Loading / Forwarding Charges (₹)" name="loadingCharges" type="number" half value={charges.loadingCharges} onChange={updateObj(setCharges)} />
          </div>
        </>
      );
      case 2: return (
        <>
          <SectionHead title="Invoice Summary" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>INVOICE TO</div>
              <RRow label="Customer" value={customerDetails.name} bold />
              <RRow label="GSTIN" value={customerDetails.gstin} />
              <RRow label="Inv No" value={invoiceDetails.invoiceNo} bold />
              <RRow label="Date" value={invoiceDetails.invoiceDate} />
              <RRow label="Items Count" value={items.length} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>CALCULATIONS</div>
              <RRow label="Subtotal" value={fmtRs(getSubtotal())} />
              <RRow label="CGST" value={fmtRs(getTaxTotal()/2)} />
              <RRow label="SGST" value={fmtRs(getTaxTotal()/2)} />
              {charges.loadingCharges > 0 && <RRow label="Loading" value={fmtRs(charges.loadingCharges)} />}
              <div style={{ background: C.orange, borderRadius: 6, padding: '10px 14px', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>Grand Total</span>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{fmtRs(getGrandTotal())}</span>
              </div>
            </div>
          </div>
        </>
      );
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: C.text, maxWidth: 820, margin: '0 auto' }}>
      <div style={{ background: C.navy, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: C.orange, borderRadius: 6, padding: '4px 12px', fontWeight: 700, color: 'white', fontSize: 14 }}>REON</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{editData ? 'Edit Tax Invoice' : 'Tax Invoice Generator'}</div>
          <div style={{ color: '#AABBDD', fontSize: 11 }}>Professional GST output · PDF watermarks · Multi-page</div>
        </div>
        {editData && (
          <button onClick={onClearEdit} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Cancel Edit</button>
        )}
      </div>
      <ProgressBar />
      <div style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '24px 28px', minHeight: 320 }}>
        {stepContent()}
      </div>
      {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEE', border: '1px solid #F99', borderRadius: 6, color: '#c00', fontSize: 12.5 }}>⚠ {error}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 10 }}>
        {successUrl ? (
          <>
            <button onClick={() => { setStep(0); setSuccessUrl(null); }} style={{ padding: '10px 24px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Create Another</button>
            <a href={successUrl} target="_blank" rel="noreferrer" download style={{ padding: '10px 32px', border: 'none', borderRadius: 8, background: C.green, color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-block' }}>⬇ Download PDF</a>
          </>
        ) : (
          <>
            <button onClick={() => setStep(Math.max(step-1, 0))} disabled={step === 0 || loading} style={{ padding: '10px 24px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: step === 0 ? 0.4 : 1 }}>← Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(Math.min(step+1, STEPS.length-1))} disabled={!isValid()} style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: isValid() ? C.navy : C.border, color: 'white', fontWeight: 700, fontSize: 13, cursor: isValid() ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !isValid()} style={{ padding: '10px 32px', border: 'none', borderRadius: 8, background: C.orange, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? '⏳ Generating…' : '📄 Generate Invoice PDF'}</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
