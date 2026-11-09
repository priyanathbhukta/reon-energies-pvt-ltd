import React, { useState, useEffect, useRef } from 'react';
import { API } from '@/lib/legacy-api';
import { downloadPdfFile } from '@/lib/download';

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
  upiId: '8436649991m@pnb',
};

const INIT_CUSTOMER = {
  name: '',
  address: '',
  gstin: '',
  state: 'West Bengal',
  email: '',
  phone: '',
};

const INIT_SHIP_TO = {
  name: '',
  recipientName: '',
  address: '',
  gstin: '',
  state: 'West Bengal',
  pinCode: '',
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
  { hsn: '85369090', desc: 'MC4 Connector / Cable Lug / Terminal', rate: 5 },
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
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // +15 days
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], // +30 days
  ewayBillNumber: '',
};

/* ── Standard Indian/Financial number formatting: 1,000.00, 100,000.00, 1,000,000.00 ── */
export const fmt = n => {
  const val = parseFloat(n);
  if (isNaN(val) || val === 0) return '0.00';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtRs = n => `₹ ${fmt(n)}`;

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
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, fontSize: 12.5, padding: '6px 0' }}>
      <div style={{ width: '42%', color: C.teal, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: bold ? C.navy : C.text, fontWeight: bold ? 700 : 400 }}>{value}</div>
    </div>
  );
}

export default function InvoiceForm({ editData, onClearEdit, preselectedQuotation, isProforma = false, onGenerated }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successUrl, setSuccessUrl] = useState(null);
  const [generatedDocNo, setGeneratedDocNo] = useState('');
  const [createdDocId, setCreatedDocId] = useState(null);
  const [converting, setConverting] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState(null);

  // Role-Based Access Control (RBAC): Invoices editable by active profile 'admin' only
  const adminUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('reon_admin_user') || '{}') : {};
  const isAdmin = adminUser?.role === 'admin' || !!adminUser?.username;

  const [companyDetails, setCompanyDetails] = useState(INIT_COMPANY);
  const [customerDetails, setCustomerDetails] = useState(INIT_CUSTOMER);
  
  // SHIP TO state & Same as Bill To toggle
  const [sameAsBillTo, setSameAsBillTo] = useState(true);
  const [shipToDetails, setShipToDetails] = useState(INIT_SHIP_TO);

  // Authorized Signature state
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const sigFileInputRef = useRef(null);

  const [invoiceDetails, setInvoiceDetails] = useState({
    ...INIT_INVOICE_DETAILS,
    invoiceNo: isProforma ? 'PI/26-27/001' : 'INV/26-27/001'
  });
  
  const [items, setItems] = useState([{ id: 1, name: '', description: '', hsn: '', quantity: 1, unit: 'Nos', rate: 0, tax: 18 }]);
  const [charges, setCharges] = useState({ loadingCharges: 0 });
  const [invLoading, setInvLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Fetch active signature on mount
  useEffect(() => {
    const fetchSignature = async () => {
      try {
        const token = localStorage.getItem('reon_admin_token');
        const res = await fetch(`${API}/api/admin/signature`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.signature?.signature_image_url) {
            setSignatureUrl(data.signature.signature_image_url);
          }
        }
      } catch (e) {
        console.error('Failed to load active signature', e);
      }
    };
    fetchSignature();
  }, []);

  // Handle Signature Upload
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const formData = new FormData();
      formData.append('signature', file);
      formData.append('signerName', 'REON ENERGIES PVT LTD');
      formData.append('signerTitle', 'Authorized Signatory');

      const res = await fetch(`${API}/api/admin/signature/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.signatureUrl) {
        setSignatureUrl(data.signatureUrl);
      } else {
        alert(data.error || 'Failed to upload signature');
      }
    } catch (err) {
      alert('Error uploading signature: ' + err.message);
    } finally {
      setUploadingSig(false);
    }
  };

  const handleRemoveSignature = async () => {
    try {
      const token = localStorage.getItem('reon_admin_token');
      await fetch(`${API}/api/admin/signature`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSignatureUrl(null);
    } catch (e) {
      console.error('Failed to remove signature', e);
    }
  };

  const fetchQuotations = async () => {
    setLoadingQuotes(true);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const res = await fetch(`${API}/api/admin/quotations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setQuotations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations for linking', err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchNextDocNo = async () => {
    setInvLoading(true);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const endpoint = isProforma ? '/api/admin/proforma-invoices/next-number' : '/api/admin/invoices/next-number';
      const res = await fetch(`${API}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const nextNo = isProforma ? data.nextProformaNo : data.nextInvoiceNo;
        if (nextNo) {
          setInvoiceDetails(prev => ({ ...prev, invoiceNo: nextNo }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch next document number', err);
    } finally {
      setInvLoading(false);
    }
  };

  const handleSelectQuotation = (quoteId) => {
    if (!quoteId) {
      setSelectedQuotation(null);
      return;
    }
    const quote = quotations.find(q => String(q.id) === String(quoteId));
    if (!quote) return;
    setSelectedQuotation(quote);

    let raw = {};
    try {
      raw = typeof quote.raw_data === 'string' ? JSON.parse(quote.raw_data) : (quote.raw_data || {});
    } catch (_) {}

    const custName = quote.customer_name || customerDetails.name;
    const custAddr = raw.address || customerDetails.address;
    const custPhone = raw.contact_number || raw.contactNumber || raw.mobile || raw.phone || customerDetails.phone;
    const custEmail = raw.email || customerDetails.email;
    const custState = raw.state || customerDetails.state;

    setCustomerDetails(prev => ({
      ...prev,
      name: custName,
      address: custAddr,
      email: custEmail,
      phone: custPhone,
      state: custState,
    }));

    if (sameAsBillTo) {
      setShipToDetails({
        name: custName,
        recipientName: custName,
        address: custAddr,
        gstin: '',
        state: custState,
        pinCode: '',
      });
    }

    const kw = raw.system_capacity_kw || raw.capacity || raw.solar_capacity || raw.kw;
    const panelBrand = raw.panel_brand || 'Mono PERC Solar PV Modules';
    const invBrand = raw.inverter_brand || 'Solar Grid-tied Inverter';

    // Populate suggested items with quotation details
    setItems([
      {
        id: 1,
        name: kw ? `${kw} kW Complete Rooftop Solar Power System` : 'Complete Rooftop Solar Power System',
        description: `Includes ${panelBrand}, ${invBrand}, MMS, ACDB/DCDB, Cabling & Net Metering Installation. Originating Quote: ${quote.offer_no} (${quote.pos_name || 'Direct'})`,
        hsn: '85414011',
        quantity: 1,
        unit: 'Set',
        rate: Math.round((parseFloat(quote.total_price) || 0) / 1.18),
        tax: 18,
      }
    ]);
  };

  // Sync Ship To with Bill To whenever sameAsBillTo is true and customer details change
  useEffect(() => {
    if (sameAsBillTo) {
      setShipToDetails(prev => ({
        ...prev,
        name: customerDetails.name,
        recipientName: customerDetails.name,
        address: customerDetails.address,
        gstin: customerDetails.gstin,
        state: customerDetails.state,
      }));
    }
  }, [sameAsBillTo, customerDetails]);

  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    if (preselectedQuotation) {
      handleSelectQuotation(preselectedQuotation.id);
    }
  }, [preselectedQuotation, quotations]);

  useEffect(() => {
    if (editData) {
      try {
        const parsedCompany = typeof editData.company_details === 'string' ? JSON.parse(editData.company_details) : editData.company_details;
        const parsedCustomer = typeof editData.customer_details === 'string' ? JSON.parse(editData.customer_details) : editData.customer_details;
        const parsedShipTo = typeof editData.ship_to_details === 'string' ? JSON.parse(editData.ship_to_details) : editData.ship_to_details;
        const parsedInvoice = typeof editData.invoice_details === 'string' ? JSON.parse(editData.invoice_details) : editData.invoice_details;
        const parsedItems = typeof editData.items === 'string' ? JSON.parse(editData.items) : editData.items;

        setCompanyDetails(parsedCompany || INIT_COMPANY);
        setCustomerDetails(parsedCustomer || INIT_CUSTOMER);
        if (parsedShipTo) {
          setShipToDetails(parsedShipTo);
          setSameAsBillTo(editData.same_as_bill_to !== false);
        }
        if (editData.authorized_signature_url) {
          setSignatureUrl(editData.authorized_signature_url);
        }
        
        const docNo = editData.proforma_invoice_no || editData.invoice_no || (isProforma ? 'PI/26-27/001' : 'INV/26-27/001');
        setInvoiceDetails(parsedInvoice || {
          ...INIT_INVOICE_DETAILS,
          invoiceNo: docNo,
          validUntil: editData.valid_until || INIT_INVOICE_DETAILS.validUntil
        });
        setItems(parsedItems || [{ id: 1, name: '', description: '', hsn: '', quantity: 1, unit: 'Nos', rate: 0, tax: 18 }]);
        setStep(0);
        setSuccessUrl(null);
        if (editData.quotation_id) {
          setSelectedQuotation({ id: editData.quotation_id, offer_no: editData.quotation_no, pos_name: editData.pos_name });
        }
      } catch (e) {
        console.error('Error loading editData', e);
      }
    } else {
      fetchNextDocNo();
    }
  }, [editData, isProforma]);

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
        shipToDetails: sameAsBillTo ? customerDetails : shipToDetails,
        sameAsBillTo,
        invoiceDetails,
        items,
        charges,
        subtotal: getSubtotal(),
        cgstTotal: getTaxTotal() / 2,
        sgstTotal: getTaxTotal() / 2,
        grandTotal: getGrandTotal(),
        validUntil: invoiceDetails.validUntil,
        quotation_id: selectedQuotation?.id || null,
        quotation_no: selectedQuotation?.offer_no || null,
        partner_id: selectedQuotation?.partner_id || null,
        pos_name: selectedQuotation?.pos_name || null,
        pos_id: selectedQuotation?.pos_id || null,
        authorizedSignatureUrl: signatureUrl || null,
      };

      // RBAC verification if editing an existing invoice
      if (editData && !isAdmin) {
        throw new Error("Access denied: Invoices can be edited only by users with active profile 'admin'.");
      }

      const baseEndpoint = isProforma ? `${API}/api/admin/proforma-invoices` : `${API}/api/admin/invoices`;
      const url = editData ? `${baseEndpoint}/${editData.id}` : baseEndpoint;
      const method = editData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${editData ? 'update' : 'generate'} ${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}`);
      if (data.success && data.pdfUrl) {
        setSuccessUrl(data.pdfUrl.startsWith('/pdfs/') ? `${API}${data.pdfUrl}` : data.pdfUrl);
        setGeneratedDocNo(data.proformaInvoiceNo || data.invoiceNo || invoiceDetails.invoiceNo);
        const docId = data.proformaInvoice?.id || data.invoice?.id || data.id || editData?.id;
        if (docId) setCreatedDocId(docId);
        setConversionSuccess(null);
        if (onGenerated) onGenerated(data);
      } else {
        throw new Error('No PDF URL returned from server');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Turn newly generated Proforma Invoice into an Original Tax Invoice immediately
  const handleConvertToOriginalInvoice = async () => {
    if (!createdDocId) return;
    if (!window.confirm(`Turn Proforma Invoice ${generatedDocNo} into an official TAX INVOICE?`)) return;
    setConverting(true);
    setError(null);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const res = await fetch(`${API}/api/admin/proforma-invoices/${createdDocId}/generate-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to turn into Tax Invoice');

      setConversionSuccess(data);
      const newPdf = data.pdfUrl?.startsWith('/pdfs/') ? `${API}${data.pdfUrl}` : data.pdfUrl;
      setSuccessUrl(newPdf);
      setGeneratedDocNo(data.invoiceNo);
      if (onGenerated) onGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(false);
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
          {/* Document Type Badge & Quotation Selection / Linking Section */}
          <div style={{
            background: isProforma ? '#F0F9FF' : (selectedQuotation ? '#F0FDF4' : '#F8FAFC'),
            border: `1.5px solid ${isProforma ? '#7DD3FC' : (selectedQuotation ? '#86EFAC' : C.border)}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: isProforma ? '#0369A1' : C.navy,
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  letterSpacing: '0.05em'
                }}>
                  {isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
                  🔗 Link Existing Quotation (Auto-Populate & Link)
                </span>
              </div>
              {selectedQuotation && (
                <button
                  type="button"
                  onClick={() => setSelectedQuotation(null)}
                  style={{
                    fontSize: 11, color: '#DC2626', background: 'none', border: 'none',
                    fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  Unlink Quotation
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: C.mid, marginBottom: 12 }}>
              {isProforma
                ? 'Select a quotation to populate items and link this Proforma Invoice for banking / advance payment clearance.'
                : 'Select a quotation to automatically link this invoice and mark the originating POS lead as Converted.'}
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={selectedQuotation?.id || ''}
                onChange={(e) => handleSelectQuotation(e.target.value)}
                style={{
                  flex: 1, padding: '9px 12px', border: `1.5px solid ${C.border}`,
                  borderRadius: 7, fontSize: 13, background: 'white', color: C.text,
                  outline: 'none'
                }}
              >
                <option value="">-- No quotation linked (Stand-alone document) --</option>
                {quotations.map((q) => {
                  const isConverted = q.status === 'converted' || q.invoice_id;
                  return (
                    <option key={q.id} value={q.id}>
                      {q.offer_no} — {q.customer_name} ({fmtRs(q.total_price || 0)}) — POS: {q.pos_name || 'Admin'} {isConverted ? ' [Converted]' : ' [Pending]'}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={fetchQuotations}
                disabled={loadingQuotes}
                style={{
                  padding: '9px 12px', background: C.light, color: C.teal, border: `1px solid ${C.border}`,
                  borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                {loadingQuotes ? '...' : 'Refresh Quotes'}
              </button>
            </div>
            {selectedQuotation && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#15803D', fontWeight: 500, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>✓ Linked: <strong>{selectedQuotation.offer_no}</strong></span>
                <span>POS: <strong>{selectedQuotation.pos_name || 'Admin'}</strong></span>
                <span>Customer: <strong>{selectedQuotation.customer_name}</strong></span>
                <span>Amount: <strong>{fmtRs(selectedQuotation.total_price || 0)}</strong></span>
              </div>
            )}
          </div>

          <SectionHead title={`${isProforma ? 'Proforma' : 'Tax'} Document Details`} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: '0 0 calc(50% - 6px)', minWidth: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.teal, display: 'block', marginBottom: 4 }}>
                {isProforma ? 'Proforma Invoice No' : 'Invoice No'} (Auto-Generated) <span style={{ color: C.orange }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  name="invoiceNo"
                  value={invoiceDetails.invoiceNo}
                  onChange={updateObj(setInvoiceDetails)}
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
                  onClick={fetchNextDocNo}
                  disabled={invLoading}
                  style={{
                    padding: '9px 14px', background: C.teal, color: 'white', border: 'none',
                    borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {invLoading ? '...' : 'Refresh'}
                </button>
              </div>
            </div>
            <Field label={isProforma ? "Proforma Date" : "Invoice Date"} name="invoiceDate" value={invoiceDetails.invoiceDate} onChange={updateObj(setInvoiceDetails)} type="date" half />
            {isProforma ? (
              <Field label="Validity Date (Valid Until)" name="validUntil" value={invoiceDetails.validUntil} onChange={updateObj(setInvoiceDetails)} type="date" half />
            ) : (
              <Field label="Due Date" name="dueDate" value={invoiceDetails.dueDate} onChange={updateObj(setInvoiceDetails)} type="date" half />
            )}
            <Field label="E-way Bill No (Optional)" name="ewayBillNumber" value={invoiceDetails.ewayBillNumber} onChange={updateObj(setInvoiceDetails)} half />
          </div>

          {/* BILL TO & SHIP TO SECTION */}
          <div style={{ background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: '0.03em' }}>
                BILL TO &nbsp;|&nbsp; SHIP TO
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.navy, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sameAsBillTo}
                  onChange={(e) => setSameAsBillTo(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: C.teal, cursor: 'pointer' }}
                />
                <span>Same as Bill To</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* BILL TO */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🏢 Bill To (Customer Details)</span>
                  <span style={{ color: C.orange }}>*</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field label="Customer / Company Name" name="name" value={customerDetails.name} onChange={updateObj(setCustomerDetails)} required />
                  <Field label="Billing Address" name="address" value={customerDetails.address} onChange={updateObj(setCustomerDetails)} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Field label="Mobile Number" name="phone" value={customerDetails.phone} onChange={updateObj(setCustomerDetails)} half />
                    <Field label="Email Address" type="email" name="email" value={customerDetails.email} onChange={updateObj(setCustomerDetails)} half />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Field label="GSTIN" name="gstin" value={customerDetails.gstin} onChange={updateObj(setCustomerDetails)} half />
                    <Field label="State" name="state" value={customerDetails.state} onChange={updateObj(setCustomerDetails)} half />
                  </div>
                </div>
              </div>

              {/* SHIP TO */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🚚 Ship To (Delivery Details)</span>
                  {sameAsBillTo && <span style={{ fontSize: 11, color: C.mid, fontWeight: 400 }}>(Synchronized)</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field
                    label="Shipping Entity / Company Name"
                    name="name"
                    value={sameAsBillTo ? customerDetails.name : shipToDetails.name}
                    onChange={updateObj(setShipToDetails)}
                    readOnly={sameAsBillTo}
                  />
                  <Field
                    label="Recipient Contact Person"
                    name="recipientName"
                    value={sameAsBillTo ? customerDetails.name : shipToDetails.recipientName}
                    onChange={updateObj(setShipToDetails)}
                    readOnly={sameAsBillTo}
                  />
                  <Field
                    label="Shipping Address"
                    name="address"
                    value={sameAsBillTo ? customerDetails.address : shipToDetails.address}
                    onChange={updateObj(setShipToDetails)}
                    readOnly={sameAsBillTo}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Field
                      label="Shipping State"
                      name="state"
                      value={sameAsBillTo ? customerDetails.state : shipToDetails.state}
                      onChange={updateObj(setShipToDetails)}
                      readOnly={sameAsBillTo}
                      half
                    />
                    <Field
                      label="PIN Code"
                      name="pinCode"
                      value={sameAsBillTo ? '' : shipToDetails.pinCode}
                      onChange={updateObj(setShipToDetails)}
                      readOnly={sameAsBillTo}
                      half
                    />
                  </div>
                  <Field
                    label="Shipping GSTIN (if applicable)"
                    name="gstin"
                    value={sameAsBillTo ? customerDetails.gstin : shipToDetails.gstin}
                    onChange={updateObj(setShipToDetails)}
                    readOnly={sameAsBillTo}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COMPANY & SIGNATURE SECTION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
            <div>
              <SectionHead title="Company (Issuer - Fixed)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Legal Name" name="name" value={companyDetails.name} readOnly />
                <Field label="Address" name="address" value={companyDetails.address} readOnly />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Field label="GSTIN" name="gstin" value={companyDetails.gstin} readOnly half />
                  <Field label="PAN" name="pan" value={companyDetails.pan} readOnly half />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Field label="A/C No" name="accountNumber" value={companyDetails.accountNumber} readOnly half />
                  <Field label="IFSC Code" name="ifsc" value={companyDetails.ifsc} readOnly half />
                </div>
                <Field label="Bank Name" name="bankName" value={`${companyDetails.bankName} - ${companyDetails.branch}`} readOnly />
              </div>
            </div>

            {/* AUTHORIZED SIGNATURE CARD */}
            <div>
              <SectionHead title="Authorized Signature" />
              <div style={{
                border: `1.5px dashed ${signatureUrl ? C.teal : C.border}`,
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
                background: signatureUrl ? '#F0FDF4' : C.light,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 180
              }}>
                {signatureUrl ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'white', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 8 }}>
                      <img
                        src={signatureUrl.startsWith('/uploads/') ? `${API}${signatureUrl}` : signatureUrl}
                        alt="Authorized Signature"
                        style={{ maxHeight: 75, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.navy }}>For REON ENERGIES PVT LTD</div>
                    <div style={{ fontSize: 10, color: C.mid, fontStyle: 'italic', marginTop: 2 }}>
                      System-generated bill signed attached
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        style={{ fontSize: 11, color: C.teal, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        style={{ fontSize: 11, color: C.red, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>✍️</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 4 }}>No Signature Attached</div>
                    <p style={{ fontSize: 11, color: C.mid, marginBottom: 12 }}>
                      Upload authorized stamp/signature (PNG, JPG) to attach to this invoice.
                    </p>
                    <button
                      type="button"
                      onClick={() => sigFileInputRef.current?.click()}
                      disabled={uploadingSig}
                      style={{
                        padding: '7px 14px', background: C.teal, color: 'white', border: 'none',
                        borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {uploadingSig ? 'Uploading...' : 'Upload Signature'}
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  ref={sigFileInputRef}
                  onChange={handleSignatureUpload}
                  accept="image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                />
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
                  <div style={{ flex: '1 1 30%', minWidth: 200 }}>
                    <Field label="Item Name *" name="name" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
                  </div>
                  <div style={{ flex: '1 1 20%', minWidth: 120 }}>
                    <Field label="HSN Code" name="hsn" value={item.hsn} list="hsn-codes" onChange={e => {
                      const val = e.target.value;
                      updateItem(item.id, 'hsn', val);
                      const match = HSN_DATA.find(h => h.hsn === val);
                      if (match) updateItem(item.id, 'tax', match.rate);
                    }} />
                  </div>
                  <div style={{ flex: '1 1 10%', minWidth: 60 }}>
                    <Field label="Qty" name="quantity" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                  </div>
                  <div style={{ flex: '1 1 10%', minWidth: 80 }}>
                    <Field label="Unit" name="unit" options={['Nos', 'Pieces', 'Set', 'Lot', 'Meters', 'Foot', 'Inch', 'Sq.ft', 'Kgs', 'kW', 'Watts', 'Rolls']} value={item.unit || 'Nos'} onChange={e => updateItem(item.id, 'unit', e.target.value)} />
                  </div>
                  <div style={{ flex: '1 1 15%', minWidth: 80 }}>
                    <Field label="Rate (₹)" name="rate" type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} />
                  </div>
                  <div style={{ flex: '1 1 10%', minWidth: 60 }}>
                    <Field label="Tax %" name="tax" options={[0, 5, 12, 18, 28]} value={item.tax} onChange={e => updateItem(item.id, 'tax', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: C.mid, marginRight: 16 }}>Taxable: <b style={{ color: C.navy }}>{fmtRs(calcItem(item).total)}</b></span>
                  <span style={{ color: C.mid }}>Tax ({item.tax}%): <b style={{ color: C.teal }}>{fmtRs(calcItem(item).taxAmt)}</b></span>
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
          <SectionHead title={`${isProforma ? 'Proforma' : 'Tax'} Document Summary`} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>DOCUMENT DETAILS</div>
              <RRow label="Customer" value={customerDetails.name} bold />
              <RRow label="Customer GSTIN" value={customerDetails.gstin} />
              <RRow label={isProforma ? "PI No" : "Inv No"} value={invoiceDetails.invoiceNo} bold />
              <RRow label="Date" value={invoiceDetails.invoiceDate} />
              {isProforma && <RRow label="Valid Until" value={invoiceDetails.validUntil} />}
              <RRow label="Ship To" value={sameAsBillTo ? `${customerDetails.name} (Same as Bill To)` : `${shipToDetails.name || customerDetails.name}, ${shipToDetails.address || ''}`} />
              <RRow label="Items Count" value={items.length} />
              {selectedQuotation && <RRow label="Quotation Ref" value={selectedQuotation.offer_no} />}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>FINANCIAL BREAKDOWN</div>
              <RRow label="Subtotal (Taxable)" value={fmtRs(getSubtotal())} />
              <RRow label="CGST" value={fmtRs(getTaxTotal() / 2)} />
              <RRow label="SGST" value={fmtRs(getTaxTotal() / 2)} />
              {charges.loadingCharges > 0 && <RRow label="Loading Charges" value={fmtRs(charges.loadingCharges)} />}
              <div style={{ background: C.orange, borderRadius: 6, padding: '10px 14px', marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>Grand Total</span>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>{fmtRs(getGrandTotal())}</span>
              </div>
            </div>
          </div>
        </>
      );
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: C.text, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ background: isProforma ? '#0369A1' : C.navy, borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: C.orange, borderRadius: 6, padding: '4px 12px', fontWeight: 800, color: 'white', fontSize: 13, letterSpacing: '0.05em' }}>REON</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: '0.05em' }}>
            {isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
            {editData && <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 10, opacity: 0.85 }}>(EDIT MODE)</span>}
          </div>
          <div style={{ color: '#E0F2FE', fontSize: 11, marginTop: 2 }}>
            {isProforma
              ? 'Bank submission · Advance payment clearance · Single-click conversion to TAX INVOICE'
              : 'GST Compliant · Linked POS Conversion · Standard Accounting ReportLab PDF'}
          </div>
        </div>
        {editData && (
          <button onClick={onClearEdit} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Cancel Edit
          </button>
        )}
      </div>
      <ProgressBar />
      <div style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '24px 28px', minHeight: 320 }}>
        {stepContent()}
      </div>
      {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEE', border: '1px solid #F99', borderRadius: 6, color: '#c00', fontSize: 12.5 }}>⚠ {error}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 10 }}>
        {successUrl ? (
          <div style={{ width: '100%' }}>
            {conversionSuccess && (
              <div style={{ marginBottom: 14, padding: '12px 16px', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, color: '#065F46', fontSize: 13, fontWeight: 600 }}>
                ✅ Successfully turned into TAX INVOICE: <strong>{conversionSuccess.invoiceNo}</strong>. Originating Quotation & Lead marked as Converted!
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <button onClick={() => { setStep(0); setSuccessUrl(null); setConversionSuccess(null); }} style={{ padding: '10px 24px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Create Another
              </button>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => downloadPdfFile(successUrl, `${generatedDocNo.replace(/\//g, '_')}.pdf`)}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: C.green, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  ⬇ Download {isProforma && !conversionSuccess ? 'PROFORMA INVOICE' : 'TAX INVOICE'} PDF ({generatedDocNo})
                </button>

                {isProforma && createdDocId && !conversionSuccess && (
                  <button
                    type="button"
                    onClick={handleConvertToOriginalInvoice}
                    disabled={converting}
                    style={{
                      padding: '10px 24px', border: 'none', borderRadius: 8,
                      background: C.orange, color: 'white', fontWeight: 800,
                      fontSize: 13, cursor: 'pointer', display: 'inline-flex',
                      alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(232,97,26,0.3)'
                    }}
                  >
                    {converting ? '⏳ Turning into Tax Invoice…' : '⚡ Turn into Original TAX INVOICE'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0 || loading} style={{ padding: '10px 24px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: step === 0 ? 0.4 : 1 }}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(Math.min(step + 1, STEPS.length - 1))} disabled={!isValid()} style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: isValid() ? (isProforma ? '#0369A1' : C.navy) : C.border, color: 'white', fontWeight: 700, fontSize: 13, cursor: isValid() ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !isValid()} style={{ padding: '10px 32px', border: 'none', borderRadius: 8, background: C.orange, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? '⏳ Processing…' : (editData ? `💾 Save Changes to ${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}` : `📄 Generate ${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'} PDF`)}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
