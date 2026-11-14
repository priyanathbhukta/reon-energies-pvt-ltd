import React, { useRef } from 'react';
import { X, FileDown, Printer } from 'lucide-react';
import InvoicePreviewCard from './InvoicePreviewCard';
import { downloadPdfFile } from '../lib/download';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function InvoicePreviewModal({ isOpen, onClose, invoice, isProforma = false }) {
  const cardRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const parseObj = (val, fallback = {}) => {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (_) {
      return fallback;
    }
  };

  const companyDetails = parseObj(invoice.company_details, invoice.companyDetails);
  const customerDetails = parseObj(invoice.customer_details, invoice.customerDetails);
  const shipToDetails = parseObj(invoice.ship_to_details, invoice.shipToDetails);
  const invoiceDetails = parseObj(invoice.invoice_details, invoice.invoiceDetails);
  const items = parseObj(invoice.items, []);
  const charges = parseObj(invoice.charges, {});

  const effectiveIsProforma = isProforma || Boolean(invoice.proforma_invoice_no && !invoice.invoice_no);
  const docNo = invoice.invoice_no || invoice.proforma_invoice_no || invoiceDetails.invoiceNo || invoiceDetails.proformaInvoiceNo || 'REON';
  const pdfUrl = invoice.pdf_url?.startsWith('/pdfs/') ? `${API}${invoice.pdf_url}` : invoice.pdf_url;

  const handleDownload = () => {
    const filename = `${docNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (pdfUrl) {
      const bustCacheUrl = `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}regen=true&v=${Date.now()}`;
      downloadPdfFile(bustCacheUrl, filename);
    } else {
      const endpoint = effectiveIsProforma ? 'PI' : 'INV';
      const fallbackUrl = `${API}/pdfs/${endpoint}-${docNo.replace(/\//g, '-')}.pdf?regen=true&v=${Date.now()}`;
      downloadPdfFile(fallbackUrl, filename);
    }
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const docTitle = `${effectiveIsProforma ? 'Proforma Invoice' : 'Tax Invoice'} - ${docNo}`;
    const previewHtml = cardRef.current.outerHTML;
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-100 my-6 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div>
            <h3 className="text-base font-bold text-navy flex items-center gap-2">
              <span>{effectiveIsProforma ? 'Proforma Invoice' : 'Tax Invoice'} Preview</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-navy/10 text-navy font-semibold">{docNo}</span>
            </h3>
            <p className="text-xs text-gray-500">Live preview matching generated accounting PDF</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Download Invoice PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-navy border border-navy/30 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-100/50">
          <InvoicePreviewCard
            cardRef={cardRef}
            isProforma={effectiveIsProforma}
            companyDetails={companyDetails}
            customerDetails={customerDetails}
            shipToDetails={shipToDetails}
            sameAsBillTo={invoice.same_as_bill_to !== false}
            invoiceDetails={{
              ...invoiceDetails,
              invoiceNo: docNo,
              invoiceDate: invoice.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : invoiceDetails.invoiceDate,
            }}
            items={items}
            charges={charges}
            currentDocNo={docNo}
            proformaRef={invoice.proforma_invoice_no}
            selectedQuotation={invoice.quotation_no ? { offer_no: invoice.quotation_no } : null}
            signatureUrl={invoice.authorized_signature_url}
          />
        </div>
      </div>
    </div>
  );
}
