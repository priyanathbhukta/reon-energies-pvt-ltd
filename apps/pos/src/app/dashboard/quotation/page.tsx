'use client';

import React, { useState, useEffect } from 'react';
import QuotationForm from '@/components/QuotationForm';
import api from '@/lib/api';
import { FileText, Download, Calendar, User, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function POSQuotationPage() {
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentQuotes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations?my=true');
      if (Array.isArray(res.data)) {
        setRecentQuotes(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch recent quotations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentQuotes();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-1 sm:px-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Quotation Generator</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage and download customized solar quotations for your customers
          </p>
        </div>
        <button
          onClick={fetchRecentQuotes}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 sm:p-6 shadow-xs">
        <QuotationForm onSuccess={() => fetchRecentQuotes()} />
      </div>

      {/* Recent Quotations History */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Your Generated Quotations</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quotations created by your POS account with permanent PDF access
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground">
            {recentQuotes.length} total
          </span>
        </div>

        {recentQuotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {loading ? 'Loading quotations...' : 'No quotations generated yet. Use the builder above to generate your first quotation!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground text-left">
                  <th className="py-2.5 px-3">Quotation No</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Total Amount</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Date</th>
                  <th className="py-2.5 px-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-foreground text-xs sm:text-sm font-mono block">
                        {q.offer_no}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-medium sm:hidden">
                        ₹ {Number(q.total_price || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-foreground block">
                        {q.customer_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground sm:hidden">
                        {q.created_at ? formatDate(q.created_at) : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell font-semibold text-foreground">
                      ₹ {Number(q.total_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell text-xs text-muted-foreground">
                      {q.created_at ? formatDate(q.created_at) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {q.pdf_url ? (
                        <a
                          href={q.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
