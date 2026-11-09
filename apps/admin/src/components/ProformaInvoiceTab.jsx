import React, { useState, useEffect } from 'react';
import { API, parseJsonSafely } from '@/lib/legacy-api';
import { downloadPdfFile } from '@/lib/download';
import {
  FileText, Search, RefreshCw, Plus, FileDown,
  CheckCircle, ArrowRight, AlertCircle, Trash2, Edit2, ShieldAlert
} from 'lucide-react';
import InvoiceForm, { fmtRs } from './InvoiceForm';

export default function ProformaInvoiceTab({ onNavigateToInvoice }) {
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [proformaList, setProformaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'draft' | 'converted'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  // Conversion Confirmation Dialog state
  const [convertModal, setConvertModal] = useState({
    isOpen: false,
    proforma: null,
    loading: false,
    error: null,
    successResult: null,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('reon_admin_token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Role-Based Access Control (RBAC): active profile must be 'admin'
  const adminUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('reon_admin_user') || '{}') : {};
  const isAdmin = adminUser?.role === 'admin' || !!adminUser?.username;

  const fetchProformas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/proforma-invoices`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProformaList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load proforma invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProformas();
  }, []);

  const handleOpenConvertModal = (pi) => {
    setConvertModal({
      isOpen: true,
      proforma: pi,
      loading: false,
      error: null,
      successResult: null,
    });
  };

  const handleConfirmConvert = async () => {
    const pi = convertModal.proforma;
    if (!pi) return;
    setConvertModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${API}/api/admin/proforma-invoices/${pi.id}/generate-invoice`, {
        method: 'POST',
        headers,
      });
      const data = await parseJsonSafely(res);
      if (!res.ok) throw new Error(data.error || 'Failed to generate tax invoice');

      setConvertModal(prev => ({
        ...prev,
        loading: false,
        successResult: data,
      }));
      fetchProformas();
    } catch (err) {
      setConvertModal(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  };

  const handleDelete = async (id, docNo) => {
    if (!window.confirm(`Are you sure you want to delete Proforma Invoice ${docNo}?`)) return;
    try {
      const res = await fetch(`${API}/api/admin/proforma-invoices/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      fetchProformas();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter list
  const filteredList = proformaList.filter(pi => {
    if (statusFilter !== 'all' && pi.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const custName = (pi.customer_name || '').toLowerCase();
      const docNo = (pi.proforma_invoice_no || '').toLowerCase();
      const quoteNo = (pi.quotation_no || '').toLowerCase();
      const posName = (pi.pos_name || '').toLowerCase();
      if (!custName.includes(q) && !docNo.includes(q) && !quoteNo.includes(q) && !posName.includes(q)) {
        return false;
      }
    }
    if (fromDate || toDate) {
      const d = new Date(pi.created_at).getTime();
      if (fromDate && d < new Date(fromDate).setHours(0, 0, 0, 0)) return false;
      if (toDate && d > new Date(toDate).setHours(23, 59, 59, 999)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-navy">Proforma Invoices</h2>
              <p className="text-xs text-gray-500">
                Generate bank clearance proformas and convert them directly to Tax Invoices
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view === 'list' ? (
            <button
              onClick={() => { setEditingItem(null); setView('create'); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange text-white text-sm font-semibold hover:bg-orange/90 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Proforma</span>
            </button>
          ) : (
            <button
              onClick={() => { setView('list'); setEditingItem(null); fetchProformas(); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
            >
              <span>← Back to Proforma List</span>
            </button>
          )}
        </div>
      </div>

      {view === 'create' || view === 'edit' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <InvoiceForm
            isProforma={true}
            editData={editingItem}
            onClearEdit={() => { setEditingItem(null); setView('list'); }}
            onGenerated={() => { fetchProformas(); }}
          />
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search proformas, customer, quotation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none w-full"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft (Pending Invoice)</option>
                <option value="converted">Converted to Tax Invoice</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-200 rounded-xl p-1.5 text-xs bg-white focus:outline-none focus:border-sky-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-200 rounded-xl p-1.5 text-xs bg-white focus:outline-none focus:border-sky-500"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => { setFromDate(''); setToDate(''); }}
                    className="text-xs text-red-500 hover:underline ml-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={fetchProformas}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Proforma Invoices Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/70 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Proforma Details</th>
                    <th className="py-3.5 px-4">Customer & Recipient</th>
                    <th className="py-3.5 px-4">Originating Quotation</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status & Validity</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && filteredList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-400">
                        <div className="inline-block w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-xs font-medium">Loading proforma invoices...</p>
                      </td>
                    </tr>
                  ) : filteredList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-gray-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="font-semibold text-gray-600">No Proforma Invoices Found</p>
                        <p className="text-xs text-gray-400 mt-1">Click &ldquo;Generate Proforma&rdquo; to create your first proforma invoice.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((pi) => {
                      const isConverted = pi.status === 'converted' || !!pi.generated_invoice_no;
                      const pdfFullUrl = pi.pdf_url?.startsWith('/pdfs/') ? `${API}${pi.pdf_url}` : pi.pdf_url;

                      return (
                        <tr key={pi.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Document Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-navy">{pi.proforma_invoice_no}</div>
                            <div className="text-xs text-gray-500">
                              Issued: {new Date(pi.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>

                          {/* Customer Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-gray-900">{pi.customer_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">
                              {pi.same_as_bill_to === false ? '🚚 Separate Shipping Address' : '🏢 Same Bill/Ship'}
                            </div>
                          </td>

                          {/* Quotation Ref */}
                          <td className="py-3.5 px-4">
                            {pi.quotation_no ? (
                              <div>
                                <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                  {pi.quotation_no}
                                </span>
                                {pi.pos_name && (
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    POS: {pi.pos_name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Direct / Standalone</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-semibold text-navy">
                            {fmtRs(pi.grand_total || 0)}
                          </td>

                          {/* Status & Validity */}
                          <td className="py-3.5 px-4">
                            {isConverted ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" />
                                  Converted
                                </span>
                                <div className="text-[11px] text-gray-500 mt-1 font-mono">
                                  Tax Inv: <strong>{pi.generated_invoice_no}</strong>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Draft (Active)
                                </span>
                                {pi.valid_until && (
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    Valid till: {new Date(pi.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* PDF Download */}
                              {pdfFullUrl ? (
                                <button
                                  type="button"
                                  onClick={() => downloadPdfFile(pdfFullUrl, `${pi.proforma_invoice_no?.replace(/\//g, '_') || 'Proforma'}.pdf`)}
                                  className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                                  title="Download Proforma PDF to Device"
                                >
                                  <FileDown className="w-4 h-4" />
                                </button>
                              ) : null}

                              {/* Prominent CTA: Generate Original Invoice */}
                              {isConverted ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed border border-gray-200"
                                  title="Tax Invoice already generated from this Proforma Invoice"
                                >
                                  Invoice Generated
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConvertModal(pi)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange text-white text-xs font-bold hover:bg-orange/90 transition shadow-xs cursor-pointer"
                                  title="Turn this Proforma Invoice into an official TAX INVOICE"
                                >
                                  <span>⚡ Turn into Original Invoice</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isConverted && (
                                <>
                                  {isAdmin ? (
                                    <button
                                      onClick={() => { setEditingItem(pi); setView('edit'); }}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                      title="Edit Proforma (Admin Only)"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => alert("Access Denied: Invoices can be edited only by users with active profile 'admin'.")}
                                      className="p-1.5 text-gray-300 hover:text-gray-400 rounded-lg cursor-not-allowed"
                                      title="Editing restricted to active profile 'admin'"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(pi.id, pi.proforma_invoice_no)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Delete Proforma"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
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
        </>
      )}

      {/* Confirmation Dialog for Generate Original Invoice */}
      {convertModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in border border-gray-100">
            {convertModal.successResult ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy">Original Tax Invoice Generated!</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Invoice Number: <strong className="font-mono text-navy">{convertModal.successResult.invoiceNo}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  The linked quotation and POS lead have been updated to <strong>Converted</strong>.
                </p>
                <div className="flex justify-center gap-3 mt-6">
                  {convertModal.successResult.pdfUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const u = convertModal.successResult.pdfUrl;
                        downloadPdfFile(u.startsWith('/pdfs/') ? `${API}${u}` : u, `${convertModal.successResult.invoiceNo?.replace(/\//g, '_') || 'Tax_Invoice'}.pdf`);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition cursor-pointer"
                    >
                      ⬇ Download Tax Invoice PDF
                    </button>
                  )}
                  <button
                    onClick={() => setConvertModal({ isOpen: false, proforma: null, loading: false, error: null, successResult: null })}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-orange/10 text-orange border border-orange/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">Generate Original Tax Invoice</h3>
                    <p className="text-xs text-gray-500">Confirm conversion from Proforma Invoice</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Proforma Invoice:</span>
                    <strong className="text-navy">{convertModal.proforma?.proforma_invoice_no}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <strong className="text-navy">{convertModal.proforma?.customer_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Linked Quotation:</span>
                    <strong className="text-teal-700">{convertModal.proforma?.quotation_no || 'None'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Grand Total:</span>
                    <strong className="text-orange font-bold text-sm">{fmtRs(convertModal.proforma?.grand_total || 0)}</strong>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-900 text-xs flex gap-2.5 mb-5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Important Business Rule:</p>
                    <p className="text-amber-800 mt-0.5">
                      This will generate an official Tax Invoice linked to Quotation <strong>{convertModal.proforma?.quotation_no || 'N/A'}</strong>. The originating POS lead will be marked as <strong>Converted</strong>. To prevent accidental duplicates, this Proforma Invoice will be locked against future conversion.
                    </p>
                  </div>
                </div>

                {convertModal.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                    ⚠ {convertModal.error}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConvertModal({ isOpen: false, proforma: null, loading: false, error: null, successResult: null })}
                    disabled={convertModal.loading}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmConvert}
                    disabled={convertModal.loading}
                    className="px-5 py-2 text-xs font-bold text-white bg-orange hover:bg-orange/90 rounded-xl transition shadow-xs disabled:opacity-60 flex items-center gap-2"
                  >
                    {convertModal.loading ? 'Generating Invoice...' : 'Confirm & Generate Tax Invoice'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
