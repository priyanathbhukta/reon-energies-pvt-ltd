import React, { useState, useEffect } from 'react';
import { API } from '@/lib/legacy-api';
import {
  FileText, Search, RefreshCw, FileDown, Trash2, Edit2,
  CheckCircle2, Clock, AlertTriangle, X, Plus, ChevronRight,
  CreditCard, ArrowUpRight, DollarSign, RotateCcw, AlertCircle
} from 'lucide-react';
import { fmt, fmtRs } from './InvoiceForm';

export default function GeneratedDocumentsTab({ onEditInvoice, onEditQuotation }) {
  const [activeSubTab, setActiveSubTab] = useState('invoices'); // 'invoices' | 'quotations'
  const [loading, setLoading] = useState(true);

  // Invoices & Quotations lists
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overpaid'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Customer Payment Management Modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null); // when open, displays customer-wise payment sheet
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Add Payment Modal State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer / NEFT',
    amountReceived: '',
    transactionReference: '',
    bankReference: '',
    remarks: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Payment Reversal Modal State
  const [reversalModal, setReversalModal] = useState({
    isOpen: false,
    payment: null,
    reason: '',
    loading: false,
    error: '',
  });

  // Quotation search inside customer payment modal
  const [modalQuotationSearch, setModalQuotationSearch] = useState('');

  // OTP Delete Modal
  const [otpModal, setOtpModal] = useState({ show: false, doc: null, loading: false, error: '' });
  const [otpInput, setOtpInput] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('reon_admin_token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchAllDocuments = async () => {
    setLoading(true);
    try {
      const [quotesRes, invRes] = await Promise.all([
        fetch(`${API}/api/admin/quotations`, { headers }),
        fetch(`${API}/api/admin/invoices`, { headers })
      ]);
      const quotesData = await quotesRes.json();
      const invData = await invRes.json();

      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  // Fetch payments for selected invoice
  const fetchInvoicePayments = async (invoiceId) => {
    setLoadingPayments(true);
    try {
      const res = await fetch(`${API}/api/admin/invoices/${invoiceId}/payments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setInvoicePayments(data.payments || []);
        if (data.invoice) {
          setSelectedInvoice(prev => ({
            ...prev,
            ...data.invoice,
            total_received: data.invoice.total_received,
            outstanding_amount: data.invoice.outstanding_amount,
            payment_status: data.invoice.payment_status,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch invoice payments', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleOpenCustomerDetails = (inv) => {
    setSelectedInvoice(inv);
    setModalQuotationSearch('');
    setIsAddPaymentOpen(false);
    fetchInvoicePayments(inv.id);
  };

  const handleOpenAddPayment = (inv = null) => {
    const target = inv || selectedInvoice;
    if (inv) {
      setSelectedInvoice(inv);
      fetchInvoicePayments(inv.id);
    }
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer / NEFT',
      amountReceived: target ? (target.outstanding_amount > 0 ? target.outstanding_amount : '') : '',
      transactionReference: '',
      bankReference: '',
      remarks: '',
    });
    setPaymentError('');
    setIsAddPaymentOpen(true);
  };

  const handleSavePayment = async () => {
    if (!selectedInvoice) return;
    const amt = parseFloat(paymentForm.amountReceived);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }
    setSavingPayment(true);
    setPaymentError('');
    try {
      const res = await fetch(`${API}/api/admin/invoices/${selectedInvoice.id}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod,
          amountReceived: amt,
          transactionReference: paymentForm.transactionReference,
          bankReference: paymentForm.bankReference,
          remarks: paymentForm.remarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      // Refresh payments and invoices
      await fetchInvoicePayments(selectedInvoice.id);
      await fetchAllDocuments();
      setIsAddPaymentOpen(false);
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleOpenReversal = (payment) => {
    setReversalModal({
      isOpen: true,
      payment,
      reason: '',
      loading: false,
      error: '',
    });
  };

  const handleConfirmReversal = async () => {
    if (!reversalModal.reason.trim()) {
      setReversalModal(prev => ({ ...prev, error: 'Reversal reason is required.' }));
      return;
    }
    setReversalModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch(`${API}/api/admin/payments/${reversalModal.payment.id}/reverse`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: reversalModal.reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reverse payment');

      setReversalModal({ isOpen: false, payment: null, reason: '', loading: false, error: '' });
      await fetchInvoicePayments(selectedInvoice.id);
      await fetchAllDocuments();
    } catch (err) {
      setReversalModal(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  // OTP Delete Handlers
  const triggerDelete = async (type, id, docNo) => {
    setOtpModal({ show: true, doc: { type, id, docNo }, loading: true, error: '' });
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, { method: 'POST', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');
      setOtpModal(p => ({ ...p, loading: false }));
    } catch (err) {
      setOtpModal(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  const confirmDelete = async () => {
    if (otpInput.length !== 6) return setOtpModal(p => ({ ...p, error: 'Enter 6-digit OTP' }));
    setOtpModal(p => ({ ...p, loading: true, error: '' }));
    try {
      const verifyRes = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers, body: JSON.stringify({ otp: otpInput })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error || 'Invalid OTP');

      const endpoint = otpModal.doc.type === 'Invoice' ? 'invoices' : 'quotations';
      const delRes = await fetch(`${API}/api/admin/${endpoint}/${otpModal.doc.id}`, { method: 'DELETE', headers });
      if (!delRes.ok) throw new Error('Failed to delete document');

      setOtpModal({ show: false, doc: null, loading: false, error: '' });
      setOtpInput('');
      fetchAllDocuments();
    } catch (err) {
      setOtpModal(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  // Status Badge Helper
  const renderPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Partially Paid
          </span>
        );
      case 'overpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="w-3 h-3" /> Overpaid
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            Unpaid
          </span>
        );
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    if (paymentFilter !== 'all' && (inv.payment_status || 'unpaid') !== paymentFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      let custName = '';
      try {
        const details = typeof inv.customer_details === 'string' ? JSON.parse(inv.customer_details) : inv.customer_details;
        custName = details?.name || '';
      } catch (_) {}
      const invNo = (inv.invoice_no || '').toLowerCase();
      const quoteNo = (inv.quotation_no || '').toLowerCase();
      const piNo = (inv.proforma_invoice_no || '').toLowerCase();
      if (!custName.toLowerCase().includes(q) && !invNo.includes(q) && !quoteNo.includes(q) && !piNo.includes(q)) {
        return false;
      }
    }
    if (fromDate || toDate) {
      const d = new Date(inv.created_at).getTime();
      if (fromDate && d < new Date(fromDate).setHours(0, 0, 0, 0)) return false;
      if (toDate && d > new Date(toDate).setHours(23, 59, 59, 999)) return false;
    }
    return true;
  });

  // Filtered Quotations
  const filteredQuotations = quotations.filter(q => {
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const custName = (q.customer_name || '').toLowerCase();
      const offerNo = (q.offer_no || '').toLowerCase();
      const posName = (q.pos_name || '').toLowerCase();
      if (!custName.includes(query) && !offerNo.includes(query) && !posName.includes(query)) {
        return false;
      }
    }
    if (fromDate || toDate) {
      const d = new Date(q.created_at).getTime();
      if (fromDate && d < new Date(fromDate).setHours(0, 0, 0, 0)) return false;
      if (toDate && d > new Date(toDate).setHours(23, 59, 59, 999)) return false;
    }
    return true;
  });

  // Parse customer details object safely
  const getCustomerObj = (inv) => {
    if (!inv) return {};
    try {
      return typeof inv.customer_details === 'string' ? JSON.parse(inv.customer_details) : (inv.customer_details || {});
    } catch (_) {
      return {};
    }
  };

  const getShipToObj = (inv) => {
    if (!inv) return {};
    try {
      return typeof inv.ship_to_details === 'string' ? JSON.parse(inv.ship_to_details) : (inv.ship_to_details || {});
    } catch (_) {
      return {};
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-navy">Generated Documents</h2>
          <p className="text-xs text-gray-500">
            Searchable repository of approved Quotations, Tax Invoices, and Customer Payment Tracking
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'invoices'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Tax Invoices ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('quotations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'quotations'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quotations ({quotations.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeSubTab === 'invoices' ? "Search invoice, customer, quotation, PI..." : "Search quotation, customer, POS..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none w-full"
            />
          </div>

          {activeSubTab === 'invoices' && (
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overpaid">Overpaid</option>
            </select>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-xl p-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-xl p-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
            />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-xs text-red-500 hover:underline ml-1">
                Reset
              </button>
            )}
          </div>
        </div>

        <button
          onClick={fetchAllDocuments}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-xl transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ================= INVOICES SUB-TAB ================= */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Invoice No & Date</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Linked Quotation / PI</th>
                  <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  <th className="py-3.5 px-4 text-right">Received</th>
                  <th className="py-3.5 px-4 text-right">Outstanding</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-gray-400">
                      <div className="inline-block w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs font-medium">Loading invoices...</p>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="font-semibold text-gray-600">No Invoices Found</p>
                      <p className="text-xs text-gray-400 mt-1">Generate invoices via Tax Invoice Generator or Proforma conversion.</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const cust = getCustomerObj(inv);
                    const grandTotal = parseFloat(inv.grand_total) || 0;
                    const totalReceived = parseFloat(inv.total_received) || 0;
                    const outstanding = parseFloat(inv.outstanding_amount ?? (grandTotal - totalReceived));
                    const status = inv.payment_status || (totalReceived >= grandTotal ? 'paid' : totalReceived > 0 ? 'partially_paid' : 'unpaid');
                    const pdfFullUrl = inv.pdf_url?.startsWith('/pdfs/') ? `${API}${inv.pdf_url}` : inv.pdf_url;

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Invoice No & Date */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-navy">{inv.invoice_no}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        {/* Customer Name - INTERACTIVE CLICKABLE */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomerDetails(inv)}
                            className="font-medium text-navy hover:text-teal-600 hover:underline flex items-center gap-1.5 text-left group"
                            title="Click to view full Customer Invoice & Payment Details"
                          >
                            <span>{cust.name || 'Unknown Customer'}</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                          </button>
                          <div className="text-xs text-gray-500">
                            {cust.phone || cust.email || 'No contact specified'}
                          </div>
                        </td>

                        {/* Linked Quotation / Proforma */}
                        <td className="py-3.5 px-4">
                          {inv.quotation_no && (
                            <div className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                              {inv.quotation_no}
                            </div>
                          )}
                          {inv.proforma_invoice_no && (
                            <div className="text-[11px] text-sky-700 font-mono mt-0.5">
                              PI: {inv.proforma_invoice_no}
                            </div>
                          )}
                          {!inv.quotation_no && !inv.proforma_invoice_no && (
                            <span className="text-xs text-gray-400 italic">Direct</span>
                          )}
                        </td>

                        {/* Financial Amounts */}
                        <td className="py-3.5 px-4 text-right font-semibold text-navy">
                          {fmtRs(grandTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                          {fmtRs(totalReceived)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-red-600">
                          {fmtRs(outstanding)}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {renderPaymentBadge(status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pdfFullUrl && (
                              <a
                                href={pdfFullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg transition"
                                title="Download Invoice PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenAddPayment(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                              title="Record a payment against this invoice"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Payment</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Invoice"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerDelete('Invoice', inv.id, inv.invoice_no)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= QUOTATIONS SUB-TAB ================= */}
      {activeSubTab === 'quotations' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Quotation Number</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4">Origin / POS Partner</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-400">
                      <div className="inline-block w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs font-medium">Loading quotations...</p>
                    </td>
                  </tr>
                ) : filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="font-semibold text-gray-600">No Quotations Found</p>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => {
                    const isConverted = q.status === 'converted' || !!q.invoice_id;
                    const pdfFullUrl = q.pdf_url?.startsWith('/pdfs/') ? `${API}${q.pdf_url}` : q.pdf_url;

                    return (
                      <tr key={q.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-navy font-mono">
                          {q.offer_no}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900">{q.customer_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{q.contact_number || q.phone || ''}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4">
                          {q.created_by_type === 'pos' || (q.pos_name && q.pos_name.toLowerCase() !== 'admin') ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              POS: {q.pos_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-navy">
                          {fmtRs(q.total_price || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isConverted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Converted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pdfFullUrl && (
                              <a
                                href={pdfFullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg transition"
                                title="Download Quotation PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </a>
                            )}
                            {q.raw_data && (
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    const raw = typeof q.raw_data === 'string' ? JSON.parse(q.raw_data) : q.raw_data;
                                    onEditQuotation(raw);
                                  } catch (_) {
                                    onEditQuotation(q);
                                  }
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Quotation"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => triggerDelete('Quotation', q.id, q.offer_no)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Quotation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= CUSTOMER-WISE INVOICE & PAYMENT DETAILS MODAL ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 animate-fade-in border border-gray-100 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-navy text-white rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">Customer Invoice & Payment Management</h3>
                  <p className="text-xs text-gray-500">
                    Official ledger and financial tracking for Invoice <strong>{selectedInvoice.invoice_no}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fast Quotation Lookup Search within Customer Sheet */}
            <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Search Quotation:</span>
              <input
                type="text"
                placeholder="Enter quotation number to quickly switch / review..."
                value={modalQuotationSearch}
                onChange={(e) => setModalQuotationSearch(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
              {modalQuotationSearch && (
                <button
                  type="button"
                  onClick={() => {
                    const match = invoices.find(inv => (inv.quotation_no || '').toLowerCase().includes(modalQuotationSearch.toLowerCase()));
                    if (match) {
                      handleOpenCustomerDetails(match);
                    } else {
                      alert(`No invoice found linked to quotation "${modalQuotationSearch}"`);
                    }
                  }}
                  className="px-3 py-1.5 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy/90 transition"
                >
                  Lookup
                </button>
              )}
            </div>

            {/* Customer Details Summary Card */}
            {(() => {
              const cust = getCustomerObj(selectedInvoice);
              const ship = getShipToObj(selectedInvoice);
              const grandTotal = parseFloat(selectedInvoice.grand_total) || 0;
              const totalReceived = parseFloat(selectedInvoice.total_received) || 0;
              const outstanding = parseFloat(selectedInvoice.outstanding_amount ?? (grandTotal - totalReceived));
              const pctPaid = grandTotal > 0 ? Math.min(Math.round((totalReceived / grandTotal) * 100), 100) : 0;

              return (
                <div className="mt-5 space-y-5">
                  {/* Two Column Address Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
                        <span>🏢 Bill To (Customer)</span>
                        <span className="text-[10px] bg-navy/10 text-navy font-semibold px-2 py-0.5 rounded">ID: #{selectedInvoice.id}</span>
                      </div>
                      <div><strong>Name:</strong> {cust.name || 'N/A'}</div>
                      <div><strong>Mobile:</strong> {cust.phone || 'N/A'}</div>
                      <div><strong>Email:</strong> {cust.email || 'N/A'}</div>
                      <div><strong>Address:</strong> {cust.address || 'N/A'}, {cust.state || ''}</div>
                      {cust.gstin && <div><strong>GSTIN:</strong> {cust.gstin}</div>}
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="font-bold text-teal-800 text-sm mb-2 flex items-center gap-2">
                        <span>🚚 Ship To (Delivery Destination)</span>
                        {selectedInvoice.same_as_bill_to !== false && (
                          <span className="text-[10px] bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded">Same as Bill To</span>
                        )}
                      </div>
                      <div><strong>Recipient:</strong> {ship.recipientName || ship.name || cust.name || 'N/A'}</div>
                      <div><strong>Shipping Company:</strong> {ship.name || cust.name || 'N/A'}</div>
                      <div><strong>Address:</strong> {ship.address || cust.address || 'N/A'}, {ship.state || cust.state || ''} {ship.pinCode ? `- ${ship.pinCode}` : ''}</div>
                      {ship.gstin && <div><strong>Ship GSTIN:</strong> {ship.gstin}</div>}
                      <div className="pt-1 text-gray-500">
                        Linked Quote: <strong>{selectedInvoice.quotation_no || 'None'}</strong> | Proforma: <strong>{selectedInvoice.proforma_invoice_no || 'None'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                      <div className="text-xs font-semibold text-blue-700">Original Invoice Amount</div>
                      <div className="text-xl font-bold text-navy mt-1">{fmtRs(grandTotal)}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Fixed grand total with GST</div>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-xs font-semibold text-emerald-700">Total Payments Received</div>
                      <div className="text-xl font-bold text-emerald-700 mt-1">{fmtRs(totalReceived)}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{invoicePayments.filter(p => p.status === 'confirmed').length} confirmed transaction(s)</div>
                    </div>

                    <div className={`p-4 rounded-xl border ${outstanding <= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/70 border-red-200'}`}>
                      <div className={`text-xs font-semibold ${outstanding <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {outstanding < 0 ? 'Overpaid Balance' : 'Outstanding Balance'}
                      </div>
                      <div className={`text-xl font-bold ${outstanding <= 0 ? 'text-emerald-700' : 'text-red-600'} mt-1`}>
                        {fmtRs(Math.abs(outstanding))}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Status: <strong>{selectedInvoice.payment_status?.toUpperCase() || 'UNPAID'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-600">Payment Clearance Progress</span>
                      <span className="text-navy">{pctPaid}% Paid</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          pctPaid >= 100 ? 'bg-emerald-500' : pctPaid > 0 ? 'bg-amber-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${pctPaid}%` }}
                      />
                    </div>
                  </div>

                  {/* Add Payment Action Header */}
                  <div className="flex items-center justify-between pt-2">
                    <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                      <span>Payment History & Audit Ledger</span>
                      <span className="text-xs font-normal text-gray-500">({invoicePayments.length} entries)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleOpenAddPayment(selectedInvoice)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Record New Payment</span>
                    </button>
                  </div>

                  {/* Payment History Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase text-[10.5px]">
                        <tr>
                          <th className="py-2.5 px-3">Receipt Ref</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3">Txn / Bank Ref</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingPayments ? (
                          <tr><td colSpan="7" className="text-center py-6 text-gray-400">Loading ledger...</td></tr>
                        ) : invoicePayments.length === 0 ? (
                          <tr><td colSpan="7" className="text-center py-8 text-gray-400 font-medium">No payments recorded yet. Click &ldquo;+ Record New Payment&rdquo; above.</td></tr>
                        ) : (
                          invoicePayments.map((p) => {
                            const isReversed = p.status === 'reversed';
                            return (
                              <tr key={p.id} className={isReversed ? 'bg-red-50/40 text-gray-400' : 'hover:bg-gray-50/60'}>
                                <td className="py-2.5 px-3 font-mono font-medium">
                                  <span className={isReversed ? 'line-through' : 'text-navy font-semibold'}>{p.payment_reference}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-2.5 px-3 font-medium">
                                  {p.payment_method}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-bold ${isReversed ? 'line-through text-gray-400' : 'text-emerald-700'}`}>
                                  {fmtRs(p.amount_received)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-mono text-[11px]">{p.transaction_reference || p.bank_reference || '-'}</div>
                                  {p.remarks && <div className="text-[10px] text-gray-500 italic">{p.remarks}</div>}
                                </td>
                                <td className="py-2.5 px-3">
                                  {isReversed ? (
                                    <div>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Reversed</span>
                                      {p.reversal_reason && <div className="text-[10px] text-red-600 mt-0.5 italic">Reason: {p.reversal_reason}</div>}
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Confirmed</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {!isReversed && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReversal(p)}
                                      className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 font-semibold hover:underline"
                                      title="Reverse / Cancel this payment"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reverse</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD PAYMENT MODAL ================= */}
      {isAddPaymentOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy">Record Customer Payment</h3>
                  <p className="text-xs text-gray-500">Invoice: {selectedInvoice.invoice_no}</p>
                </div>
              </div>
              <button onClick={() => setIsAddPaymentOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Quotation Context */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <strong className="text-navy">{getCustomerObj(selectedInvoice).name || 'N/A'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quotation No:</span>
                <strong className="text-teal-700">{selectedInvoice.quotation_no || 'None'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Outstanding:</span>
                <strong className="text-red-600 font-bold">{fmtRs(selectedInvoice.outstanding_amount ?? selectedInvoice.grand_total)}</strong>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="IMPS">IMPS</option>
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50000.00"
                  value={paymentForm.amountReceived}
                  onChange={(e) => setPaymentForm(p => ({ ...p, amountReceived: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 font-bold text-sm"
                />
                {/* Overpayment Warning */}
                {parseFloat(paymentForm.amountReceived) > parseFloat(selectedInvoice.outstanding_amount ?? selectedInvoice.grand_total) && (
                  <div className="mt-1.5 p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-[11px] flex gap-1.5 items-center">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: Amount exceeds outstanding balance. Invoice will be marked Overpaid.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Transaction Ref / UTR / Cheque No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR19283748291"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm(p => ({ ...p, transactionReference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Bank Reference / UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PNB Singur A/C or 8436649991m@pnb"
                  value={paymentForm.bankReference}
                  onChange={(e) => setPaymentForm(p => ({ ...p, bankReference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks / Audit Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Advance payment cleared via NEFT..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm(p => ({ ...p, remarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {paymentError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                ⚠ {paymentError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setIsAddPaymentOpen(false)}
                disabled={savingPayment}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-60"
              >
                {savingPayment ? 'Recording...' : 'Confirm & Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REVERSAL MODAL ================= */}
      {reversalModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in border border-gray-100">
            <div className="flex items-center gap-2 text-red-600 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold">Reverse Payment</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              You are about to reverse payment receipt <strong>{reversalModal.payment?.payment_reference}</strong> of{' '}
              <strong>{fmtRs(reversalModal.payment?.amount_received)}</strong>.
            </p>
            <p className="text-[11px] text-gray-500 mb-3">
              The invoice balance will be adjusted accordingly. Please provide a mandatory reason for this reversal:
            </p>
            <textarea
              rows={3}
              placeholder="Mandatory reversal reason (e.g. Cheque bounced, duplicate entry)..."
              value={reversalModal.reason}
              onChange={(e) => setReversalModal(p => ({ ...p, reason: e.target.value }))}
              className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 mb-2"
            />
            {reversalModal.error && (
              <p className="text-xs text-red-500 mb-3">{reversalModal.error}</p>
            )}
            <div className="flex justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setReversalModal({ isOpen: false, payment: null, reason: '', loading: false, error: '' })}
                disabled={reversalModal.loading}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={reversalModal.loading}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-60"
              >
                {reversalModal.loading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OTP DELETE MODAL ================= */}
      {otpModal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-navy mb-2">Delete {otpModal.doc?.type}</h3>
            <p className="text-sm text-gray-500 mb-4">
              An OTP has been sent to <b>support@reonenergy.in</b>. Please enter it below to confirm deletion of{' '}
              <b className="text-navy">{otpModal.doc?.docNo}</b>.
            </p>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otpInput}
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.5em] text-lg font-bold py-3 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none mb-2"
            />
            {otpModal.error && <p className="text-xs text-red-500 font-medium text-center mb-4">{otpModal.error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setOtpModal({ show: false, doc: null, loading: false, error: '' }); setOtpInput(''); }}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={otpModal.loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-70"
              >
                {otpModal.loading ? 'Verifying...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
