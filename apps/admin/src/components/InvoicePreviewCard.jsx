import React from 'react';

const C = {
  navy: '#1B2D5B',
  teal: '#008080',
  orange: '#E8611A',
  light: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1A1A2E',
  mid: '#64748B',
  red: '#DC2626',
};

export const fmtRs = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function isWestBengal(stateStr, gstin = '') {
  if (gstin && String(gstin).trim().startsWith('19')) return true;
  if (!stateStr) return true;
  const s = String(stateStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  return s === 'westbengal' || s === 'wb' || s === 'paschimbanga' || s.startsWith('westbengal');
}

export function numToWordsINR(n) {
  if (n === 0) return 'INR Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function getWords(num) {
    let res = [];
    if (num >= 100) {
      res.push(units[Math.floor(num / 100)] + ' Hundred');
      num %= 100;
    }
    if (num >= 20) {
      res.push(tens[Math.floor(num / 10)]);
      if (num % 10 > 0) res.push(units[num % 10]);
    } else if (num > 0) {
      res.push(units[num]);
    }
    return res.join(' ');
  }

  let num = Math.round(Math.abs(n));
  let parts = [];

  const cr = Math.floor(num / 10000000);
  let rem = num % 10000000;
  if (cr > 0) parts.push(getWords(cr) + ' Crore');

  const lk = Math.floor(rem / 100000);
  rem %= 100000;
  if (lk > 0) parts.push(getWords(lk) + ' Lakh');

  const th = Math.floor(rem / 1000);
  rem %= 1000;
  if (th > 0) parts.push(getWords(th) + ' Thousand');

  if (rem > 0) parts.push(getWords(rem));

  return 'INR ' + parts.join(' ') + ' Rupees Only';
}

export default function InvoicePreviewCard({
  isProforma = false,
  companyDetails = {},
  customerDetails = {},
  shipToDetails = {},
  sameAsBillTo = true,
  invoiceDetails = {},
  items = [],
  charges = {},
  selectedQuotation = null,
  proformaRef = '',
  currentDocNo = '',
  signatureUrl = null,
  cardRef = null,
}) {
  const intraState = isWestBengal(customerDetails.state, customerDetails.gstin);

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

  const gstSummary = getGstSummary();
  const grandTotal = getGrandTotal();
  const subtotal = getSubtotal();
  const loadingCharges = parseFloat(charges.loadingCharges) || 0;

  const docTitle = isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  const resolvedDocNo = currentDocNo || invoiceDetails.invoiceNo || (isProforma ? invoiceDetails.proformaInvoiceNo : '') || 'REON';
  const quotNo = selectedQuotation?.offer_no || selectedQuotation?.quotation_no || invoiceDetails.quotationNo || invoiceDetails.quotation_no;

  const effectiveShipName = sameAsBillTo ? customerDetails.name : (shipToDetails.name || customerDetails.name);
  const effectiveShipRecipient = sameAsBillTo ? customerDetails.name : (shipToDetails.recipientName || shipToDetails.name || customerDetails.name);
  const effectiveShipAddress = sameAsBillTo ? customerDetails.address : (shipToDetails.address || customerDetails.address);
  const effectiveShipPhone = (sameAsBillTo ? customerDetails.phone : (shipToDetails.phone || customerDetails.phone)) || '-';
  const effectiveShipGstin = sameAsBillTo ? (customerDetails?.gstin || '') : (shipToDetails?.gstin?.trim() || '');
  const effectiveShipState = sameAsBillTo ? customerDetails.state : (shipToDetails.state || customerDetails.state);
  const effectiveShipPin = sameAsBillTo ? (customerDetails.pinCode || customerDetails.pincode) : (shipToDetails.pinCode || shipToDetails.pincode || customerDetails.pinCode);

  return (
    <div
      ref={cardRef}
      id="reon-invoice-preview-card"
      style={{
        background: 'white',
        border: `1.5px solid ${C.navy}`,
        borderRadius: 8,
        padding: 24,
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        fontSize: 12,
        color: C.text,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.4,
      }}
    >
      {/* Top Header: Logo + Company Info on Left, Document Title & Meta on Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${C.navy}`, paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src="/reon_logo.png" alt="REON ENERGIES" crossOrigin="anonymous" style={{ width: 105, height: 'auto', maxHeight: 50, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>REON ENERGIES PRIVATE LIMITED</div>
            <div style={{ fontSize: 10.5, color: '#4B5563', lineHeight: 1.4 }}>
              Singherbheri, Singur, Hooghly, West Bengal, 712409<br/>
              <b>Contact:</b> 8436649991 | <b>Email:</b> info@reonenergy.in<br/>
              <b>Website:</b> www.reonenergy.in<br/>
              <b>GSTIN:</b> {companyDetails.gstin || '19AAPCR6346E2ZX'} | <b>CIN:</b> {companyDetails.cin || 'U43219WR2026PTC292640'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.navy, letterSpacing: '0.04em' }}>
            {docTitle}
          </div>
          <div style={{ fontSize: 11, color: C.text, marginTop: 4, lineHeight: 1.5 }}>
            <b>{docTitle} No:</b> {resolvedDocNo}<br/>
            <b>{isProforma ? 'Date' : 'Invoice Date'}:</b> {invoiceDetails.invoiceDate || new Date().toISOString().split('T')[0]}<br/>
            {isProforma && invoiceDetails.validUntil && (
              <><b>Valid Until:</b> {invoiceDetails.validUntil}<br/></>
            )}
            {!isProforma && invoiceDetails.dueDate && (
              <><b>Due Date:</b> {invoiceDetails.dueDate}<br/></>
            )}
            {quotNo && (
              <><b>Quotation Ref:</b> {quotNo}<br/></>
            )}
            {!isProforma && proformaRef && (
              <><b>Proforma Ref:</b> {proformaRef}<br/></>
            )}
            {invoiceDetails.ewayBillNumber && (
              <><b>E-way Bill:</b> {invoiceDetails.ewayBillNumber}<br/></>
            )}
          </div>
        </div>
      </div>

      {/* BILL TO | SHIP TO (Clean layout matching PDF) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 16, background: '#FAFAFA' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 6 }}>
            BILL TO:
          </div>
          <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4 }}>
            <b>{customerDetails.name || 'N/A'}</b><br/>
            {customerDetails.address || '-'}<br/>
            <b>Phone:</b> {customerDetails.phone || '-'}<br/>
            <b>Email:</b> {customerDetails.email || '-'}<br/>
            {customerDetails.gstin && <><b>GSTIN:</b> {customerDetails.gstin}<br/></>}
            <b>State:</b> {customerDetails.state || 'West Bengal'}{customerDetails.pinCode ? ` - ${customerDetails.pinCode}` : ''}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 6 }}>
            SHIP TO:
          </div>
          <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4 }}>
            <b>{effectiveShipName || 'N/A'}</b><br/>
            {effectiveShipRecipient && effectiveShipRecipient !== effectiveShipName && (
              <>Attn: {effectiveShipRecipient}<br/></>
            )}
            {effectiveShipAddress || '-'}<br/>
            <b>Phone:</b> {effectiveShipPhone}<br/>
            {effectiveShipGstin && (
              <><b>GSTIN:</b> {effectiveShipGstin}<br/></>
            )}
            <b>State:</b> {effectiveShipState || 'West Bengal'}{effectiveShipPin ? ` - ${effectiveShipPin}` : ''}
          </div>
        </div>
      </div>

      {/* 8-Column Product Table with Centered Headers & Exact Labels (HSN / SAC, Taxable Value) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.2px solid ${C.navy}`, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: C.navy, color: 'white' }}>
            <th style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '5%' }}>Sl. No.</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '32%' }}>Description</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '12%' }}>HSN / SAC</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '7%' }}>Qty</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '8%' }}>Per</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '12%' }}>Rate</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '8%' }}>GST</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10.5, border: '1px solid #374151', width: '16%' }}>Taxable Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const calc = calcItem(item);
            const unitLabel = (item.unit === 'OTHER' && item.customUnit ? item.customUnit : (item.unit || item.per || 'PCS')).toUpperCase();
            return (
              <tr key={item.id || idx} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? 'white' : '#F9FAFB' }}>
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
                <td style={{ padding: '7px 8px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>{fmtRs(calc.taxable)}</td>
              </tr>
            );
          })}
          {loadingCharges > 0 && (
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#FFFBEB' }}>
              <td style={{ padding: 7, textAlign: 'center' }}></td>
              <td style={{ padding: 7, textAlign: 'left', fontWeight: 600 }} colSpan={6}>Loading / Forwarding Charges</td>
              <td style={{ padding: 7, textAlign: 'right', fontWeight: 600 }}>{fmtRs(loadingCharges)}</td>
            </tr>
          )}
          <tr style={{ background: '#F3F4F6', fontWeight: 800 }}>
            <td style={{ padding: '8px 4px' }}></td>
            <td style={{ padding: '8px 8px', textAlign: 'left' }} colSpan={6}>Total Taxable Value</td>
            <td style={{ padding: '8px 8px', textAlign: 'right', color: C.navy }}>{fmtRs(subtotal + loadingCharges)}</td>
          </tr>
        </tbody>
      </table>

      {/* GST SUMMARY & INVOICE SUMMARY Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* GST Summary Table */}
        <div style={{ border: `1px solid ${C.navy}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ background: '#F3F4F6', padding: '6px 10px', fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}` }}>
            GST SUMMARY ({intraState ? 'INTRA-STATE: WEST BENGAL' : 'INTER-STATE SUPPLY'})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '5px 8px', textAlign: 'left' }}>GST Particulars</th>
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

        {/* INVOICE SUMMARY Table */}
        <div style={{ border: `1px solid ${C.navy}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ background: '#F3F4F6', padding: '6px 10px', fontSize: 11, fontWeight: 800, color: C.navy, borderBottom: `1px solid ${C.border}` }}>
            INVOICE SUMMARY
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '5px 8px' }}>Basic Value</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(subtotal)}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '5px 8px' }}>(-)Discount</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '5px 8px' }}>Net Taxable Value</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(subtotal)}</td>
              </tr>
              {intraState ? (
                <>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px' }}>Add: CGST</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getCgstTotal())}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px' }}>Add: SGST</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getSgstTotal())}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px' }}>IGST (0%)</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px' }}>Add: IGST</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(getIgstTotal())}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px' }}>CGST (0%)</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 8px' }}>SGST (0%)</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(0)}</td>
                  </tr>
                </>
              )}
              {loadingCharges > 0 && (
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '5px 8px' }}>Loading / Forwarding</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtRs(loadingCharges)}</td>
                </tr>
              )}
              <tr style={{ background: '#FEF3C7', fontWeight: 900, fontSize: 12.5 }}>
                <td style={{ padding: '8px 8px', color: C.navy }}>Total Invoice Value</td>
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

      {/* Bank Details, Terms & Conditions, and Signatory Box (Matching PDF 100%) */}
      <div style={{ border: `1px solid ${C.navy}`, borderRadius: 6, overflow: 'hidden' }}>
        {/* Top Section: Bank Details on Left, Terms on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: 10, borderRight: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 10.5, lineHeight: 1.4, color: C.text, flex: 1 }}>
              <b>Company&apos;s Bank Details:</b><br/>
              Account Name: <b>REON ENERGIES PRIVATE LIMITED</b><br/>
              Bank Name: Punjab National Bank<br/>
              A/c No.: <b>0162202100001274</b><br/>
              Branch &amp; IFSC Code: Singur &amp; <b>PUNB0016220</b><br/>
              UPI ID: <b>8436649991m@pnb</b>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img src="/qr_reon.png" alt="REON UPI QR" crossOrigin="anonymous" style={{ width: 65, height: 65, objectFit: 'contain' }} />
              <div style={{ fontSize: 8.5, color: '#4B5563', marginTop: 2 }}>Scan to Pay (UPI)</div>
            </div>
          </div>

          <div style={{ padding: 10, fontSize: 10, lineHeight: 1.45, color: '#374151', background: '#FAFAFA' }}>
            <b>Terms &amp; Conditions:</b><br/>
            1. Payment is due as per agreed milestone terms.<br/>
            2. Goods once sold will be serviced as per standard warranty terms.<br/>
            3. Subject to Singur, Hooghly jurisdiction.
          </div>
        </div>

        {/* Bottom Section: Customer's Seal & Signature on Left, REON Signatory on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: '#FAFAFA' }}>
          <div style={{ padding: 10, borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.navy }}>Customer&apos;s Seal and Signature</div>
          </div>

          <div style={{ padding: 10, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 11, color: C.navy, fontWeight: 700 }}>For REON ENERGIES PRIVATE LIMITED</div>
            {signatureUrl ? (
              <img src={signatureUrl} alt="Signature" crossOrigin="anonymous" style={{ maxHeight: 38, margin: '6px 0' }} />
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
