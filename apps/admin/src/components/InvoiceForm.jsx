import React, { useState, useEffect, useRef } from 'react';
import { API, parseJsonSafely } from '@/lib/legacy-api';
import { downloadPdfFile } from '@/lib/download';
import { Search, X, CheckCircle, FileText } from 'lucide-react';

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

export const SUPPORTED_UNITS = [
  'PCS', 'MTR', 'FT', 'SET', 'NOS', 'KG', 'WATT', 'KW', 'KWP', 'MTR²', 'OTHER'
];

export function isWestBengal(stateStr, gstin = '') {
  if (gstin && String(gstin).trim().startsWith('19')) return true;
  if (!stateStr) return true;
  const s = String(stateStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  return s === 'westbengal' || s === 'wb' || s === 'paschimbanga' || s.startsWith('westbengal');
}

const INIT_COMPANY = {
  name: 'REON ENERGIES PRIVATE LIMITED',
  address: 'Singherbheri, Singur, Hooghly, West Bengal, 712409\ncontact no : 8436649991',
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
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  ewayBillNumber: '',
};

/* ── Financial Number Formatting: ₹1,000.00, ₹100,000.00, ₹1,000,000.00 ── */
export const fmt = n => {
  const val = parseFloat(n);
  if (isNaN(val) || val === 0) return '0.00';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtRs = n => `₹${fmt(n)}`;

export function numToWordsINR(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'INR Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function getWords(val) {
    const res = [];
    if (val >= 100) {
      res.push(units[Math.floor(val / 100)]);
      res.push('Hundred');
      val %= 100;
    }
    if (val >= 20) {
      res.push(tens[Math.floor(val / 10)]);
      if (val % 10 > 0) res.push(units[val % 10]);
    } else if (val > 0) {
      res.push(units[val]);
    }
    return res.join(' ');
  }

  let rem = n;
  const parts = [];
  if (rem >= 10000000) {
    parts.push(getWords(Math.floor(rem / 10000000)) + ' Crore');
    rem %= 10000000;
  }
  if (rem >= 100000) {
    parts.push(getWords(Math.floor(rem / 100000)) + ' Lakh');
    rem %= 100000;
  }
  if (rem >= 1000) {
    parts.push(getWords(Math.floor(rem / 1000)) + ' Thousand');
    rem %= 1000;
  }
  if (rem > 0) {
    parts.push(getWords(rem));
  }
  return 'INR ' + parts.join(' ') + ' Rupees Only';
}

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

export default function InvoiceForm({ editData, onClearEdit, preselectedQuotation, onGenerated, isProforma = false }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successUrl, setSuccessUrl] = useState(null);
  const [generatedDocNo, setGeneratedDocNo] = useState('');
  const [createdDocId, setCreatedDocId] = useState(null);
  const [converting, setConverting] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState(null);

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
  const fileInputRef = useRef(null);

  // Live Preview DOM Reference & Export States
  const livePreviewRef = useRef(null);
  const [exportingLivePdf, setExportingLivePdf] = useState(false);

  const [invoiceDetails, setInvoiceDetails] = useState({
    ...INIT_INVOICE_DETAILS,
    invoiceDate: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState([
    { id: 1, name: '', description: '', hsn: '', quantity: 1, unit: 'PCS', customUnit: '', rate: 0, tax: 18 }
  ]);
  const [charges, setCharges] = useState({ loadingCharges: 0 });
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quotationSearch, setQuotationSearch] = useState('');
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Dynamic state-based GST detection: West Bengal vs Inter-State
  const intraState = isWestBengal(customerDetails.state, customerDetails.gstin);

  // Filter quotations by customer name, quotation number (offer_no), or phone
  const filteredQuotations = quotations.filter(q => {
    if (!quotationSearch.trim()) return true;
    const term = quotationSearch.toLowerCase().trim();
    const offerNo = (q.offer_no || '').toLowerCase();
    const custName = (q.customer_name || '').toLowerCase();
    const phone = (q.customer_phone || q.contact_number || q.phone || '').toLowerCase();
    return offerNo.includes(term) || custName.includes(term) || phone.includes(term);
  });

  // Load existing signature if available
  useEffect(() => {
    const fetchSignature = async () => {
      try {
        const token = localStorage.getItem('reon_admin_token');
        const res = await fetch(`${API}/api/admin/signature`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await parseJsonSafely(res);
          if (data?.signature?.signature_image_url) {
            setSignatureUrl(data.signature.signature_image_url);
          }
        }
      } catch (e) {
        console.warn('Could not load signature', e);
      }
    };
    fetchSignature();
  }, []);

  // Upload new signature handler
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const token = localStorage.getItem('reon_admin_token');
      const formData = new FormData();
      formData.append('signature', file);
      formData.append('signerName', 'Authorised Signatory');
      formData.append('signerTitle', 'Authorised Signatory');

      const res = await fetch(`${API}/api/admin/signature/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await parseJsonSafely(res);
      if (!res.ok) throw new Error(data.error || 'Failed to upload signature');
      if (data?.signature?.signature_image_url) {
        setSignatureUrl(data.signature.signature_image_url);
      }
    } catch (err) {
      alert(`Signature upload failed: ${err.message}`);
    } finally {
      setUploadingSig(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!window.confirm('Remove saved signature?')) return;
    try {
      const token = localStorage.getItem('reon_admin_token');
      await fetch(`${API}/api/admin/signature`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSignatureUrl(null);
    } catch (e) {
      console.warn('Failed to delete signature', e);
    }
  };

  // Synchronize Ship To with Bill To when sameAsBillTo is checked
  useEffect(() => {
    if (sameAsBillTo) {
      setShipToDetails({
        name: customerDetails.name,
        recipientName: customerDetails.name,
        address: customerDetails.address,
        gstin: customerDetails.gstin,
        state: customerDetails.state,
        pinCode: customerDetails.pinCode || '',
      });
    }
  }, [sameAsBillTo, customerDetails]);

  // Load Quotations for linking
  useEffect(() => {
    const fetchQuotations = async () => {
      setLoadingQuotes(true);
      try {
        const token = localStorage.getItem('reon_admin_token');
        const res = await fetch(`${API}/api/admin/quotations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await parseJsonSafely(res);
          setQuotations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load quotations', err);
      } finally {
        setLoadingQuotes(false);
      }
    };
    fetchQuotations();
  }, []);

  // Auto-fetch next invoice number
  const fetchNextDocNo = async () => {
    try {
      const token = localStorage.getItem('reon_admin_token');
      const endpoint = isProforma ? '/api/admin/proforma-invoices/next-number' : '/api/admin/invoices/next-number';
      const res = await fetch(`${API}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await parseJsonSafely(res);
        const nextNo = data.nextProformaInvoiceNo || data.nextInvoiceNo;
        if (nextNo) {
          setInvoiceDetails(prev => ({
            ...prev,
            invoiceNo: nextNo,
            proformaInvoiceNo: isProforma ? nextNo : undefined,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not auto-fetch next document number', e);
    }
  };

  // Populate from Quotation (NEVER inject POS operator name into customer-facing document)
  const populateFromQuotation = (quote) => {
    if (!quote) return;
    setSelectedQuotation(quote);

    const raw = typeof quote.raw_data === 'string' ? JSON.parse(quote.raw_data) : (quote.raw_data || {});
    const custState = raw.state || quote.state || customerDetails.state || 'West Bengal';

    setCustomerDetails(prev => ({
      ...prev,
      name: quote.customer_name || raw.customerName || prev.name,
      address: quote.customer_address || raw.address || prev.address,
      phone: quote.customer_phone || raw.contactNo || prev.phone,
      email: quote.customer_email || raw.email || prev.email,
      gstin: raw.gstin || prev.gstin || '',
      state: custState,
    }));

    if (sameAsBillTo) {
      setShipToDetails(prev => ({
        ...prev,
        name: quote.customer_name || prev.name,
        recipientName: quote.customer_name || prev.recipientName,
        address: quote.customer_address || prev.address,
        state: custState,
      }));
    }

    const sysKw = parseFloat(quote.system_kw) || parseFloat(raw.systemCapacityKw) || 3;
    const panelBrand = raw.panelBrand || 'Tier 1 TopCon Bi-facial Solar Panels';
    const invBrand = raw.inverterBrand || 'High-Efficiency Grid-Tied Inverter';

    const cleanQuoteNo = quote.offer_no || quote.quotation_no || '';
    const quotePrice = parseFloat(quote.total_price) || 0;
    const baseRate = quotePrice > 0 ? quotePrice / 1.18 : sysKw * 48000;

    setItems([
      {
        id: Date.now(),
        name: `Complete ${sysKw} kW Solar Rooftop Power Plant`,
        description: `Includes ${panelBrand}, ${invBrand}, MMS, ACDB/DCDB, Cabling & Net Metering. Originating Quote: ${cleanQuoteNo}`,
        hsn: '85414011',
        quantity: 1,
        unit: 'SET',
        customUnit: '',
        rate: Math.round(baseRate),
        tax: 18,
      }
    ]);
  };

  useEffect(() => {
    if (preselectedQuotation) {
      populateFromQuotation(preselectedQuotation);
    }
  }, [preselectedQuotation]);

  // Load edit data
  useEffect(() => {
    if (editData) {
      try {
        setCompanyDetails(editData.company_details || INIT_COMPANY);
        setCustomerDetails(editData.customer_details || INIT_CUSTOMER);
        setShipToDetails(editData.ship_to_details || editData.customer_details || INIT_SHIP_TO);
        setSameAsBillTo(editData.same_as_bill_to !== false);
        setInvoiceDetails({
          ...INIT_INVOICE_DETAILS,
          ...(editData.invoice_details || {}),
          invoiceNo: isProforma ? (editData.proforma_invoice_no || editData.invoice_no) : editData.invoice_no,
          validUntil: editData.valid_until || editData.invoice_details?.validUntil || INIT_INVOICE_DETAILS.validUntil,
        });

        const parsedItems = (editData.items || []).map(i => ({
          ...i,
          unit: i.unit || i.per || 'PCS',
          customUnit: '',
        }));
        setItems(parsedItems.length > 0 ? parsedItems : [{ id: 1, name: '', description: '', hsn: '', quantity: 1, unit: 'PCS', customUnit: '', rate: 0, tax: 18 }]);
        setCharges(editData.charges || { loadingCharges: 0 });

        if (editData.quotation_id || editData.quotation_no) {
          setSelectedQuotation({
            id: editData.quotation_id,
            offer_no: editData.quotation_no,
            partner_id: editData.partner_id,
          });
        }
      } catch (e) {
        console.error('Error loading editData', e);
      }
    } else {
      fetchNextDocNo();
    }
  }, [editData, isProforma]);

  // Precise State-based Calculations
  const calcItem = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxable = qty * rate;
    const taxRate = parseFloat(item.tax) || 0;

    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

    if (intraState) {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmt = taxable * (cgstRate / 100);
      sgstAmt = taxable * (sgstRate / 100);
    } else {
      igstRate = taxRate;
      igstAmt = taxable * (igstRate / 100);
    }

    const taxAmt = cgstAmt + sgstAmt + igstAmt;
    return {
      taxable,
      taxRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmt,
      sgstAmt,
      igstAmt,
      taxAmt,
      invoiceValue: taxable,
      finalWithTax: taxable + taxAmt,
    };
  };

  const getSubtotal = () => items.reduce((sum, item) => sum + calcItem(item).taxable, 0);
  const getCgstTotal = () => items.reduce((sum, item) => sum + calcItem(item).cgstAmt, 0);
  const getSgstTotal = () => items.reduce((sum, item) => sum + calcItem(item).sgstAmt, 0);
  const getIgstTotal = () => items.reduce((sum, item) => sum + calcItem(item).igstAmt, 0);
  const getTotalTax = () => getCgstTotal() + getSgstTotal() + getIgstTotal();
  const getGrandTotal = () => {
    const base = getSubtotal() + getTotalTax();
    const lc = parseFloat(charges.loadingCharges) || 0;
    return Math.round(base + lc);
  };

  // Group items by GST rate for the dynamic summary
  const getGstSummary = () => {
    const summary = {};
    items.forEach(item => {
      const calc = calcItem(item);
      const r = calc.taxRate;
      if (!summary[r]) {
        summary[r] = { rate: r, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      summary[r].taxable += calc.taxable;
      summary[r].cgst += calc.cgstAmt;
      summary[r].sgst += calc.sgstAmt;
      summary[r].igst += calc.igstAmt;
    });
    return Object.values(summary).sort((a, b) => a.rate - b.rate);
  };

  const updateObj = (setter) => (e) => setter(p => ({ ...p, [e.target.name]: e.target.value }));
  
  const addItem = () => setItems(p => [
    ...p,
    { id: Date.now(), name: '', description: '', hsn: '', quantity: 1, unit: 'PCS', customUnit: '', rate: 0, tax: 18 }
  ]);
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
      
      // Normalized items with unit
      const normalizedItems = items.map(i => ({
        ...i,
        unit: (i.unit === 'OTHER' && i.customUnit ? i.customUnit : (i.unit || 'PCS')).toUpperCase(),
      }));

      const payload = {
        companyDetails,
        customerDetails,
        shipToDetails: sameAsBillTo ? customerDetails : shipToDetails,
        sameAsBillTo,
        invoiceDetails,
        items: normalizedItems,
        charges,
        subtotal: getSubtotal(),
        cgstTotal: getCgstTotal(),
        sgstTotal: getSgstTotal(),
        igstTotal: getIgstTotal(),
        grandTotal: getGrandTotal(),
        validUntil: invoiceDetails.validUntil,
        quotation_id: selectedQuotation?.id || null,
        quotation_no: selectedQuotation?.offer_no || null,
        partner_id: selectedQuotation?.partner_id || null,
        authorizedSignatureUrl: signatureUrl || null,
      };

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
      const data = await parseJsonSafely(response);
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
      const data = await parseJsonSafely(res);
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

  /* ── Export Exact Live Preview Card to PDF via Client DOM Canvas ── */
  const handleDownloadLivePreviewPdf = async () => {
    if (!livePreviewRef.current) return;
    try {
      setExportingLivePdf(true);
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const element = livePreviewRef.current;
      const docPrefix = isProforma && !conversionSuccess ? 'Proforma_Invoice' : 'Tax_Invoice';
      const docNumber = (generatedDocNo || invoiceDetails.invoiceNo || 'REON').replace(/[^a-zA-Z0-9_-]/g, '_');

      const opt = {
        margin: [6, 6, 6, 6],
        filename: `${docPrefix}_${docNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Failed to export live preview to PDF:', err);
      window.print();
    } finally {
      setExportingLivePdf(false);
    }
  };

  /* ── Print / Save as PDF via native browser dialog ── */
  const handlePrintPreview = () => {
    if (!livePreviewRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const docTitle = `${isProforma && !conversionSuccess ? 'Proforma Invoice' : 'Tax Invoice'} - ${generatedDocNo || invoiceDetails.invoiceNo || 'REON'}`;
    const previewHtml = livePreviewRef.current.outerHTML;
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: white; color: #1A1A2E; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { box-sizing: border-box; }
            table { border-collapse: collapse; }
          </style>
        </head>
        <body>
          ${previewHtml}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 1500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {STEPS.map((s, i) => (
        <div key={s.id} onClick={() => i <= step && setStep(i)}
             style={{
               flex: 1, padding: '9px 12px', borderRadius: 8, cursor: i <= step ? 'pointer' : 'default',
               background: i === step ? C.navy : i < step ? C.teal : '#E8EDF5',
               color: i <= step ? 'white' : C.mid, fontSize: 12, fontWeight: 700,
               display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s'
             }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
          }}>{i < step ? '✓' : i + 1}</span>
          {s.label}
        </div>
      ))}
    </div>
  );

  const stepContent = () => {
    switch (step) {
      case 0: return (
        <>
          {/* Quotation Link Picker with Live Search */}
          <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0369A1' }}>
                <FileText size={16} />
                <span>{isProforma ? '⚡ Populate from Quotation' : '⚡ Populate from Quotation & Lead Conversion Link'}</span>
              </div>
              {selectedQuotation && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuotation(null);
                    setQuotationSearch('');
                  }}
                  style={{ fontSize: 11.5, color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={13} />
                  <span>Clear Selection</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: '#0C4A6E', marginBottom: 10 }}>
              {isProforma
                ? 'Search by customer name or quotation number to automatically populate customer details, line items, and quantities.'
                : 'Search by customer name or quotation number to automatically link this invoice and mark the originating POS lead as Converted.'}
            </p>

            {/* Selected Quotation Card */}
            {selectedQuotation && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                background: 'white', border: '1.5px solid #0284C7', borderRadius: 8,
                padding: '9px 12px', marginBottom: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="#0284C7" />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.navy }}>
                      {selectedQuotation.offer_no} — {selectedQuotation.customer_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Quotation Value: <strong style={{ color: C.navy }}>{fmtRs(selectedQuotation.total_price || 0)}</strong>
                      {selectedQuotation.status === 'converted' && (
                        <span style={{ marginLeft: 8, color: '#059669', fontWeight: 700 }}>[Converted]</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuotation(null);
                    setQuotationSearch('');
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', cursor: 'pointer'
                  }}
                >
                  Change Quotation
                </button>
              </div>
            )}

            {/* Search Bar + Select Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Search Bar Input */}
              <div style={{ position: 'relative', width: '100%' }}>
                <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#0284C7', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  placeholder="Search quotation by customer name or quotation number (e.g. Soumen, Q-2026, 854)..."
                  value={quotationSearch}
                  onChange={(e) => setQuotationSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 30px 8px 32px',
                    borderRadius: 7,
                    border: '1.5px solid #7DD3FC',
                    fontSize: 12.5,
                    background: 'white',
                    color: C.text,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {quotationSearch && (
                  <button
                    type="button"
                    onClick={() => setQuotationSearch('')}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: 2
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Matching Quotations Dropdown */}
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 7, border: '1px solid #7DD3FC',
                    fontSize: 12.5, background: 'white', color: C.text, outline: 'none'
                  }}
                  value={selectedQuotation?.id || ''}
                  onChange={(e) => {
                    const q = quotations.find(item => String(item.id) === e.target.value);
                    if (q) {
                      populateFromQuotation(q);
                      setQuotationSearch('');
                    }
                  }}
                >
                  <option value="">
                    {loadingQuotes
                      ? 'Loading quotations...'
                      : quotationSearch
                        ? `-- ${filteredQuotations.length} matching quotation(s) for "${quotationSearch}" --`
                        : `-- Choose an approved quotation (${quotations.length} available) --`}
                  </option>
                  {filteredQuotations.map(q => {
                    const isConverted = q.status === 'converted' || q.lead_status === 'Converted' || !!q.invoice_no;
                    return (
                      <option key={q.id} value={q.id}>
                        {q.offer_no} — {q.customer_name} ({fmtRs(q.total_price || 0)}) {isConverted ? ' [Converted]' : ' [Pending]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Instant Search Results Dropdown List when user is typing */}
              {quotationSearch.trim().length > 0 && (
                <div style={{
                  background: 'white', border: '1px solid #BAE6FD', borderRadius: 8,
                  maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                  {filteredQuotations.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                      No quotations found matching &ldquo;<strong>{quotationSearch}</strong>&rdquo;
                    </div>
                  ) : (
                    filteredQuotations.map(q => {
                      const isConverted = q.status === 'converted' || q.lead_status === 'Converted' || !!q.invoice_no;
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            populateFromQuotation(q);
                            setQuotationSearch('');
                          }}
                          style={{
                            padding: '8px 12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'background 0.15s', fontSize: 12
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F0F9FF'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div>
                            <strong style={{ color: C.navy }}>{q.offer_no}</strong>
                            <span style={{ margin: '0 6px', color: '#94A3B8' }}>·</span>
                            <span style={{ fontWeight: 600, color: C.text }}>{q.customer_name}</span>
                            {(q.customer_phone || q.contact_number) && (
                              <span style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>
                                ({q.customer_phone || q.contact_number})
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, color: '#0369A1' }}>{fmtRs(q.total_price || 0)}</span>
                            <span style={{
                              marginLeft: 8, fontSize: 10.5, padding: '2px 6px', borderRadius: 4,
                              background: isConverted ? '#D1FAE5' : '#FEF3C7',
                              color: isConverted ? '#065F46' : '#92400E',
                              fontWeight: 700
                            }}>
                              {isConverted ? 'Converted' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <SectionHead title="Customer Billing Information (Bill To)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Field label="Customer / Company Name" name="name" value={customerDetails.name} onChange={updateObj(setCustomerDetails)} required half />
            <Field label="Customer GSTIN" name="gstin" value={customerDetails.gstin} onChange={updateObj(setCustomerDetails)} hint="e.g. 19AAPCR6346E2ZX" half />
            <Field label="Contact Phone" name="phone" value={customerDetails.phone} onChange={updateObj(setCustomerDetails)} half />
            <Field label="Email Address" name="email" value={customerDetails.email} onChange={updateObj(setCustomerDetails)} half />
            <Field label="Billing Address" name="address" value={customerDetails.address} onChange={updateObj(setCustomerDetails)} />
            <Field
              label="Bill To State (determines GST: West Bengal = CGST+SGST, Other = IGST)"
              name="state"
              value={customerDetails.state}
              onChange={updateObj(setCustomerDetails)}
              options={[
                'West Bengal', 'Assam', 'Bihar', 'Odisha', 'Jharkhand', 'Delhi',
                'Maharashtra', 'Uttar Pradesh', 'Gujarat', 'Karnataka', 'Tamil Nadu',
                'Rajasthan', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Kerala', 'Andhra Pradesh', 'Telangana'
              ]}
              required
              half
            />
          </div>

          {/* Dynamic GST Category Indicator */}
          <div style={{
            marginTop: 10, marginBottom: 20, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: intraState ? '#ECFDF5' : '#EFF6FF',
            border: `1.5px solid ${intraState ? '#A7F3D0' : '#BFDBFE'}`,
            color: intraState ? '#065F46' : '#1E40AF',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>{intraState ? '📍 Intra-State Supply (West Bengal):' : '🌐 Inter-State Supply (Outside West Bengal):'}</span>
            <span>
              {intraState
                ? 'CGST (Half) + SGST (Half) applies · IGST is 0%'
                : `IGST (Full Rate) applies · CGST is 0% · SGST is 0% (${customerDetails.state || 'Other State'})`}
            </span>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionHead title="Shipping Information (Ship To)" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: C.teal, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sameAsBillTo}
                  onChange={(e) => setSameAsBillTo(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: C.teal }}
                />
                <span>Same as Bill To</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field
                label="Shipping Company / Name"
                name="name"
                value={sameAsBillTo ? customerDetails.name : shipToDetails.name}
                onChange={updateObj(setShipToDetails)}
                readOnly={sameAsBillTo}
                half
              />
              <Field
                label="Recipient / Attention Name"
                name="recipientName"
                value={sameAsBillTo ? customerDetails.name : shipToDetails.recipientName}
                onChange={updateObj(setShipToDetails)}
                readOnly={sameAsBillTo}
                half
              />
              <Field
                label="Shipping Address"
                name="address"
                value={sameAsBillTo ? customerDetails.address : shipToDetails.address}
                onChange={updateObj(setShipToDetails)}
                readOnly={sameAsBillTo}
              />
              <Field
                label="Shipping State"
                name="state"
                value={sameAsBillTo ? customerDetails.state : shipToDetails.state}
                onChange={updateObj(setShipToDetails)}
                readOnly={sameAsBillTo}
                half
              />
              <Field
                label="Shipping PIN Code"
                name="pinCode"
                value={sameAsBillTo ? (customerDetails.pinCode || '') : (shipToDetails.pinCode || '')}
                onChange={updateObj(setShipToDetails)}
                readOnly={sameAsBillTo}
                half
              />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <SectionHead title="Document Metadata & Validity" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label={`${isProforma ? 'Proforma Invoice' : 'Tax Invoice'} Number`} name="invoiceNo" value={invoiceDetails.invoiceNo} onChange={updateObj(setInvoiceDetails)} required half />
              <Field label="Document Date" name="invoiceDate" type="date" value={invoiceDetails.invoiceDate} onChange={updateObj(setInvoiceDetails)} required half />
              {isProforma ? (
                <Field label="Valid Until (Bank Clearance Validity)" name="validUntil" type="date" value={invoiceDetails.validUntil} onChange={updateObj(setInvoiceDetails)} half />
              ) : (
                <Field label="Due Date" name="dueDate" type="date" value={invoiceDetails.dueDate} onChange={updateObj(setInvoiceDetails)} half />
              )}
              <Field label="E-way Bill Number (optional)" name="ewayBillNumber" value={invoiceDetails.ewayBillNumber} onChange={updateObj(setInvoiceDetails)} half />
            </div>
          </div>

          {/* Authorized Signature Section */}
          <div style={{ marginTop: 24, padding: 14, background: C.light, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Company Authorized Signature</div>
                <div style={{ fontSize: 11, color: C.mid }}>Appears on customer PDF with "System-generated bill signed attached" caption</div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleSignatureUpload} accept="image/png,image/jpeg,image/jpg" style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingSig}
                style={{ padding: '6px 14px', background: C.teal, color: 'white', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {uploadingSig ? 'Uploading...' : signatureUrl ? 'Replace Signature' : 'Upload Signature'}
              </button>
            </div>
            {signatureUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, background: 'white', padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <img src={signatureUrl} alt="Signature Preview" style={{ maxHeight: 42, maxWidth: 120, objectFit: 'contain' }} />
                <div style={{ flex: 1, fontSize: 11, color: C.mid }}>
                  <b>Authorised Signatory</b> · Active signature embedded in generated PDF
                </div>
                <button type="button" onClick={handleRemoveSignature} style={{ color: C.red, background: 'none', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            )}
          </div>
        </>
      );
      case 1: return (
        <>
          <SectionHead title="Line Items & Rates" />
          <datalist id="hsn-codes">
            {HSN_DATA.map((h, i) => (
              <option key={i} value={h.hsn}>{h.desc} ({h.rate}%)</option>
            ))}
          </datalist>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((item, idx) => {
              const calc = calcItem(item);
              const isOtherUnit = item.unit === 'OTHER';
              return (
                <div key={item.id} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>ITEM {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} style={{ color: C.red, fontSize: 11, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: '1 1 30%', minWidth: 200 }}>
                      <Field label="Item Name *" name="name" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
                    </div>
                    <div style={{ flex: '1 1 18%', minWidth: 120 }}>
                      <Field label="HSN / SSN Code" name="hsn" value={item.hsn} list="hsn-codes" onChange={e => {
                        const val = e.target.value;
                        updateItem(item.id, 'hsn', val);
                        const match = HSN_DATA.find(h => h.hsn === val);
                        if (match) updateItem(item.id, 'tax', match.rate);
                      }} />
                    </div>
                    <div style={{ flex: '1 1 10%', minWidth: 65 }}>
                      <Field label="Qty" name="quantity" type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                    </div>
                    <div style={{ flex: isOtherUnit ? '1 1 18%' : '1 1 12%', minWidth: 90 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: C.teal, display: 'block', marginBottom: 4 }}>Per (Unit)</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <select
                          value={item.unit || 'PCS'}
                          onChange={e => updateItem(item.id, 'unit', e.target.value)}
                          style={{
                            width: '100%', padding: '9px 8px', border: `1.5px solid ${C.border}`,
                            borderRadius: 7, fontSize: 13, background: 'white', color: C.text
                          }}
                        >
                          {SUPPORTED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {isOtherUnit && (
                          <input
                            type="text"
                            placeholder="Unit"
                            value={item.customUnit || ''}
                            onChange={e => updateItem(item.id, 'customUnit', e.target.value.toUpperCase())}
                            style={{
                              width: 65, padding: '9px 6px', border: `1.5px solid ${C.teal}`,
                              borderRadius: 7, fontSize: 12, textTransform: 'uppercase'
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div style={{ flex: '1 1 14%', minWidth: 90 }}>
                      <Field label="Rate (₹)" name="rate" type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} />
                    </div>
                    <div style={{ flex: '1 1 10%', minWidth: 65 }}>
                      <Field label="GST %" name="tax" options={[0, 5, 12, 18, 28]} value={item.tax} onChange={e => updateItem(item.id, 'tax', e.target.value)} />
                    </div>
                  </div>

                  {/* Item Description (optional) */}
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Item specification or technical description (optional)"
                      value={item.description || ''}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: 12, border: `1px solid ${C.border}`,
                        borderRadius: 6, color: C.text, boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Real-time Line Calculation Breakdown */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 10, fontSize: 12, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                    <span style={{ color: C.mid }}>Taxable: <b style={{ color: C.navy }}>{fmtRs(calc.taxable)}</b></span>
                    {intraState ? (
                      <>
                        <span style={{ color: C.mid }}>CGST ({calc.cgstRate}%): <b style={{ color: C.teal }}>{fmtRs(calc.cgstAmt)}</b></span>
                        <span style={{ color: C.mid }}>SGST ({calc.sgstRate}%): <b style={{ color: C.teal }}>{fmtRs(calc.sgstAmt)}</b></span>
                      </>
                    ) : (
                      <span style={{ color: C.mid }}>IGST ({calc.igstRate}%): <b style={{ color: '#2563EB' }}>{fmtRs(calc.igstAmt)}</b></span>
                    )}
                    <span style={{ color: C.navy, fontWeight: 700 }}>Invoice Value: <b style={{ color: C.orange }}>{fmtRs(calc.invoiceValue)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addItem}
            style={{
              marginTop: 14, padding: '9px 18px', border: `1.5px dashed ${C.teal}`,
              background: '#EBF9FB', color: C.teal, fontWeight: 700, borderRadius: 8,
              cursor: 'pointer', fontSize: 12.5
            }}
          >
            + Add Another Item
          </button>
          
          <div style={{ marginTop: 24 }}>
            <SectionHead title="Additional Charges" />
            <Field label="Loading / Forwarding Charges (₹)" name="loadingCharges" type="number" half value={charges.loadingCharges} onChange={updateObj(setCharges)} />
          </div>
        </>
      );
      case 2: {
        const gstSummary = getGstSummary();
        const grandTotal = getGrandTotal();
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <SectionHead title={`${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'} LIVE PREVIEW`} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownloadLivePreviewPdf}
                  disabled={exportingLivePdf}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    background: C.teal, color: 'white', borderRadius: 6, border: 'none',
                    fontSize: 12, fontWeight: 700, cursor: exportingLivePdf ? 'wait' : 'pointer'
                  }}
                  title="Download exact visual preview as PDF"
                >
                  {exportingLivePdf ? '⏳ Exporting…' : '📄 Save Live Preview as PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintPreview}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    background: 'white', color: C.navy, border: `1px solid ${C.navy}`,
                    borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                  title="Print or Save via browser"
                >
                  🖨 Print
                </button>
              </div>
            </div>

            {/* A4 Paper Style Preview Container */}
            <div
              ref={livePreviewRef}
              id="reon-invoice-preview-card"
              style={{
                background: 'white', border: `1.5px solid ${C.navy}`, borderRadius: 8,
                padding: 24, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', fontSize: 12
              }}
            >
              {/* Header: Logo + Company Info on Left, Document Title & Meta on Right */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${C.navy}`, paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <img src="/reon_logo.png" alt="REON ENERGIES" style={{ width: 105, height: 'auto', maxHeight: 50, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>REON ENERGIES PRIVATE LIMITED</div>
                    <div style={{ fontSize: 10.5, color: '#4B5563', lineHeight: 1.4 }}>
                      Singherbheri, Singur, Hooghly, West Bengal, 712409<br/>
                      <b>Contact:</b> 8436649991 | <b>Email:</b> info@reonenergy.in<br/>
                      <b>GSTIN:</b> {companyDetails.gstin}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.navy, letterSpacing: '0.04em' }}>
                    {isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
                  </div>
                  <div style={{ fontSize: 11, color: C.text, marginTop: 4, lineHeight: 1.5 }}>
                    <b>{isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'} No:</b> {invoiceDetails.invoiceNo}<br/>
                    <b>Date:</b> {invoiceDetails.invoiceDate}<br/>
                    {isProforma && invoiceDetails.validUntil && (
                      <><b>Valid Until:</b> {invoiceDetails.validUntil}<br/></>
                    )}
                    {selectedQuotation?.offer_no && (
                      <><b>Quotation Ref:</b> {selectedQuotation.offer_no}<br/></>
                    )}
                  </div>
                </div>
              </div>

              {/* BILL TO | SHIP TO (NO "Same as Bill To" text) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 16, background: '#FAFAFA' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 6 }}>
                    BILL TO:
                  </div>
                  <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4 }}>
                    <b>{customerDetails.name}</b><br/>
                    {customerDetails.address}<br/>
                    <b>Phone:</b> {customerDetails.phone || '-'}<br/>
                    <b>Email:</b> {customerDetails.email || '-'}<br/>
                    {customerDetails.gstin && <><b>GSTIN:</b> {customerDetails.gstin}<br/></>}
                    <b>State:</b> {customerDetails.state}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 6 }}>
                    SHIP TO:
                  </div>
                  <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4 }}>
                    <b>{sameAsBillTo ? customerDetails.name : (shipToDetails.name || customerDetails.name)}</b><br/>
                    {sameAsBillTo ? customerDetails.address : (shipToDetails.address || customerDetails.address)}<br/>
                    <b>Phone:</b> {(sameAsBillTo ? customerDetails.phone : shipToDetails.phone) || '-'}<br/>
                    {(sameAsBillTo ? customerDetails.gstin : shipToDetails.gstin) && (
                      <><b>GSTIN:</b> {sameAsBillTo ? customerDetails.gstin : shipToDetails.gstin}<br/></>
                    )}
                    <b>State:</b> {sameAsBillTo ? customerDetails.state : (shipToDetails.state || customerDetails.state)}
                  </div>
                </div>
              </div>

              {/* 8-Column Product Table with Centered Headers */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.navy}`, marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: C.navy, color: 'white' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '5%' }}>Sl. No.</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '32%' }}>Description</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '12%' }}>HSN / SSN</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '7%' }}>Qty</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '8%' }}>Per</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '12%' }}>Rate</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '8%' }}>GST</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '16%' }}>Invoice Value</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const calc = calcItem(item);
                    const unitLabel = (item.unit === 'OTHER' && item.customUnit ? item.customUnit : (item.unit || 'PCS')).toUpperCase();
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? 'white' : '#F9FAFB' }}>
                        <td style={{ padding: '7px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${C.border}` }}>{idx + 1}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'left', verticalAlign: 'top', borderRight: `1px solid ${C.border}` }}>
                          <b>{item.name}</b>
                          {item.description && <div style={{ fontSize: 9.5, color: '#4B5563', marginTop: 2 }}>{item.description}</div>}
                        </td>
                        <td style={{ padding: '7px 6px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${C.border}` }}>{item.hsn || '-'}</td>
                        <td style={{ padding: '7px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${C.border}` }}>{item.quantity}</td>
                        <td style={{ padding: '7px 6px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${C.border}`, fontWeight: 600 }}>{unitLabel}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', verticalAlign: 'middle', borderRight: `1px solid ${C.border}` }}>{fmtRs(item.rate)}</td>
                        <td style={{ padding: '7px 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${C.border}` }}>{item.tax}%</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>{fmtRs(calc.invoiceValue)}</td>
                      </tr>
                    );
                  })}
                  {charges.loadingCharges > 0 && (
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#FFFBEB' }}>
                      <td style={{ padding: 7, textAlign: 'center' }}></td>
                      <td style={{ padding: 7, textAlign: 'left', fontWeight: 600 }} colSpan={6}>Loading / Forwarding Charges</td>
                      <td style={{ padding: 7, textAlign: 'right', fontWeight: 600 }}>{fmtRs(charges.loadingCharges)}</td>
                    </tr>
                  )}
                  <tr style={{ background: '#F3F4F6', fontWeight: 800 }}>
                    <td style={{ padding: '8px 4px' }}></td>
                    <td style={{ padding: '8px 8px', textAlign: 'left' }} colSpan={6}>Total Taxable Value</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: C.navy }}>{fmtRs(getSubtotal() + (parseFloat(charges.loadingCharges) || 0))}</td>
                  </tr>
                </tbody>
              </table>

              {/* GST Summary & Financial Summary Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* GST Summary Table */}
                <div style={{ border: `1px solid ${C.navy}`, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ background: '#F3F4F6', padding: '6px 10px', fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}` }}>
                    GST SUMMARY ({intraState ? 'INTRA-STATE: WEST BENGAL' : 'INTER-STATE SUPPLY'})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${C.border}` }}>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>GST Component</th>
                        <th style={{ padding: '5px 6px', textAlign: 'center' }}>Rate</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intraState ? (
                        <>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '5px 8px' }}>IGST</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>0%</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                          </tr>
                          {gstSummary.map(g => (
                            <React.Fragment key={g.rate}>
                              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '5px 8px' }}>CGST ({g.rate / 2}%)</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center' }}>{g.rate / 2}%</td>
                                <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(g.cgst)}</td>
                              </tr>
                              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '5px 8px' }}>SGST ({g.rate / 2}%)</td>
                                <td style={{ padding: '5px 6px', textAlign: 'center' }}>{g.rate / 2}%</td>
                                <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(g.sgst)}</td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </>
                      ) : (
                        <>
                          {gstSummary.map(g => (
                            <tr key={g.rate} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: '5px 8px' }}>IGST ({g.rate}%)</td>
                              <td style={{ padding: '5px 6px', textAlign: 'center' }}>{g.rate}%</td>
                              <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(g.igst)}</td>
                            </tr>
                          ))}
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '5px 8px' }}>CGST</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>0%</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                          </tr>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '5px 8px' }}>SGST</td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>0%</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                          </tr>
                        </>
                      )}
                      <tr style={{ background: '#EBF9FB', fontWeight: 800 }}>
                        <td style={{ padding: '6px 8px' }} colSpan={2}>Total Tax</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: C.teal }}>{fmtRs(getTotalTax())}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Table */}
                <div style={{ border: `1px solid ${C.navy}`, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ background: '#F3F4F6', padding: '6px 10px', fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}` }}>
                    FINANCIAL SUMMARY
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <tbody>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '5px 8px' }}>Subtotal</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getSubtotal())}</td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '5px 8px' }}>Discount</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '5px 8px' }}>Taxable Value</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getSubtotal())}</td>
                      </tr>
                      {intraState ? (
                        <>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '5px 8px' }}>CGST</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getCgstTotal())}</td>
                          </tr>
                          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '5px 8px' }}>SGST</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getSgstTotal())}</td>
                          </tr>
                        </>
                      ) : (
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '5px 8px' }}>IGST</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getIgstTotal())}</td>
                        </tr>
                      )}
                      {charges.loadingCharges > 0 && (
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '5px 8px' }}>Loading / Forwarding</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(charges.loadingCharges)}</td>
                        </tr>
                      )}
                      <tr style={{ background: '#FEF3C7', fontWeight: 900, fontSize: 13 }}>
                        <td style={{ padding: '8px 8px', color: C.navy }}>Grand Total</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', color: C.navy }}>{fmtRs(grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Amount in Words */}
              <div style={{ padding: '8px 12px', background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, marginBottom: 16 }}>
                <b>Amount in Words:</b> {numToWordsINR(grandTotal)}
              </div>

              {/* Bank Details & Signature Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, background: '#FAFAFA' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img src="/qr_reon.png" alt="REON UPI QR" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                  <div style={{ fontSize: 10.5, lineHeight: 1.4, color: C.text }}>
                    <b>Company Bank Details:</b><br/>
                    A/c Name: <b>REON ENERGIES PRIVATE LIMITED</b><br/>
                    Bank: Punjab National Bank<br/>
                    A/c No: <b>0162202100001274</b> | IFSC: <b>PUNB0016220</b><br/>
                    UPI ID: <b>8436649991m@pnb</b>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 11, color: C.navy, fontWeight: 700 }}>For REON ENERGIES PRIVATE LIMITED</div>
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature" style={{ maxHeight: 38, margin: '6px 0' }} />
                  ) : (
                    <div style={{ height: 38 }} />
                  )}
                  <div style={{ fontSize: 9.5, color: '#4B5563' }}>System-generated bill signed attached</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.navy }}>Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: C.text, maxWidth: 900, margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{
        background: isProforma ? '#0369A1' : C.navy,
        borderRadius: 10, padding: '14px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ background: C.orange, borderRadius: 6, padding: '4px 12px', fontWeight: 800, color: 'white', fontSize: 13, letterSpacing: '0.05em' }}>
          REON
        </div>
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

      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEE', border: '1px solid #F99', borderRadius: 6, color: '#c00', fontSize: 12.5 }}>
          ⚠ {error}
        </div>
      )}

      {/* Success Notification & Download / CTA buttons */}
      {successUrl && (
        <div style={{ marginTop: 16, padding: 18, background: '#EFF6FF', border: '1.5px solid #3B82F6', borderRadius: 10 }}>
          <div style={{ color: '#1E3A8A', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
            🎉 {conversionSuccess ? 'TAX INVOICE' : (isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE')} Generated Successfully!
          </div>
          {conversionSuccess && (
            <div style={{ color: '#065F46', fontSize: 12.5, fontWeight: 600, marginBottom: 10, background: '#D1FAE5', padding: '8px 12px', borderRadius: 6 }}>
              ✅ Successfully turned into TAX INVOICE: <strong>{conversionSuccess.invoiceNo}</strong>. Originating Quotation & Lead marked as Converted!
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => {
                const pdfName = (generatedDocNo || 'Invoice').replace(/\//g, '_') + '.pdf';
                const bustCacheUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}regen=true&v=${Date.now()}`;
                downloadPdfFile(bustCacheUrl, pdfName);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                background: '#2563EB', color: 'white', fontWeight: 700, borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13
              }}
            >
              ⬇ Download Official PDF ({generatedDocNo})
            </button>

            <button
              onClick={handleDownloadLivePreviewPdf}
              disabled={exportingLivePdf}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                background: C.teal, color: 'white', fontWeight: 700, borderRadius: 8,
                border: 'none', cursor: exportingLivePdf ? 'wait' : 'pointer', fontSize: 13
              }}
            >
              {exportingLivePdf ? '⏳ Generating…' : '📄 Download Exact Live PDF'}
            </button>

            <button
              onClick={handlePrintPreview}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                background: 'white', color: C.navy, border: `1px solid ${C.navy}`,
                fontWeight: 700, borderRadius: 8, cursor: 'pointer', fontSize: 13
              }}
            >
              🖨 Print / Save
            </button>

            {/* Turn into Original Tax Invoice CTA */}
            {isProforma && !conversionSuccess && createdDocId && (
              <button
                onClick={handleConvertToOriginalInvoice}
                disabled={converting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                  background: C.orange, color: 'white', fontWeight: 800, borderRadius: 8,
                  border: 'none', cursor: converting ? 'wait' : 'pointer', fontSize: 13,
                  boxShadow: '0 2px 6px rgba(232,97,26,0.3)'
                }}
              >
                {converting ? '⏳ Turning into Tax Invoice…' : '⚡ Turn into Original TAX INVOICE'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ padding: '9px 18px', border: `1px solid ${C.border}`, borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.mid }}
          >
            ← Previous
          </button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!isValid()}
            style={{
              padding: '9px 22px', borderRadius: 7, background: isValid() ? C.teal : '#CBD5E1',
              color: 'white', border: 'none', cursor: isValid() ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 700
            }}
          >
            Next Step →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !isValid()}
            style={{
              padding: '10px 26px', borderRadius: 7,
              background: loading ? '#94A3B8' : (isProforma ? '#0284C7' : C.navy),
              color: 'white', border: 'none',
              cursor: loading ? 'wait' : 'pointer', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {loading ? '⏳ Processing…' : (editData ? `💾 Save Changes to ${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}` : `📄 Generate ${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'} PDF`)}
          </button>
        )}
      </div>
    </div>
  );
}
