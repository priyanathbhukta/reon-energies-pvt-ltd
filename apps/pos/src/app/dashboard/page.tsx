'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Target,
  Users,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  FileText,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Building2,
  CheckCircle2,
  Timer
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface DashboardStats {
  totalLeads: number;
  pendingLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalQuotationValue: number;
  convertedBusinessValue: number;
}

interface LeadRecord {
  id: string;
  customerName: string;
  contactNumber: string;
  email: string | null;
  address: string | null;
  quotationNumber: string | null;
  quotationDate: string | null;
  quotationAmount: number;
  leadStatus: string;
  invoiceNumber: string | null;
  conversionDate: string | null;
  invoiceAmount: number;
  createdAt: string;
  stage: string;
}

const LEAD_STAGES = [
  { key: 'contacted', label: '1. Contacted', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  { key: 'quotation_sent', label: '2. Quotation sent', color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' },
  { key: 'converted', label: '3. Converted (Payment Credited)', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' },
  { key: 'site_visit', label: '4. Site Visit', color: 'text-amber-700 bg-amber-500/10 border-amber-500/20' },
  { key: 'negotiation', label: '5. Negotiation', color: 'text-orange-700 bg-orange-500/10 border-orange-500/20' },
  { key: 'material_request', label: '6. Request to Material Team', color: 'text-purple-700 bg-purple-500/10 border-purple-500/20' },
  { key: 'completed', label: '7. Completed', color: 'text-teal-700 bg-teal-500/10 border-teal-500/20' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user, partner } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    pendingLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalQuotationValue: 0,
    convertedBusinessValue: 0,
  });
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      setUpdatingLeadId(leadId);
      const res = await api.patch(`/leads/${leadId}/stage`, { stage: newStage });
      if (res.data?.success) {
        setLeads((prev) =>
          prev.map((l) => {
            if (l.id === leadId) {
              const isConverted = newStage === 'converted' || newStage === 'completed';
              return {
                ...l,
                stage: newStage,
                leadStatus: isConverted ? 'Converted' : l.leadStatus === 'Converted' ? 'Converted' : 'Pending',
                conversionDate: isConverted && !l.conversionDate ? new Date().toISOString() : l.conversionDate,
              };
            }
            return l;
          })
        );
        fetchDashboardData(false);
      }
    } catch (err: any) {
      console.error('Failed to update stage:', err);
      alert(err.response?.data?.error || 'Failed to update lead stage');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/pos/dashboard-stats');
      if (response.data.success) {
        setStats(response.data.stats || {
          totalLeads: 0,
          pendingLeads: 0,
          convertedLeads: 0,
          conversionRate: 0,
          totalQuotationValue: 0,
          convertedBusinessValue: 0,
        });
        setLeads(response.data.leads || []);
      }
    } catch (err: any) {
      console.error('Failed to load POS dashboard stats:', err);
      setError(err.response?.data?.error || 'Unable to connect to dashboard statistics service.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (lead.customerName || '').toLowerCase().includes(query) ||
      (lead.contactNumber || '').includes(query) ||
      (lead.quotationNumber || '').toLowerCase().includes(query) ||
      (lead.invoiceNumber || '').toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      (lead.leadStatus || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'converted') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Converted
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
          Cancelled
        </span>
      );
    }
    if (s === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Timer className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
              Welcome back, {partner?.shopName || user?.fullName?.split(' ')[0] || 'Partner'} 👋
            </h1>
            {partner?.referralCode && (
              <span className="text-xs font-mono font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-md border border-primary/20">
                {partner.referralCode}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time solar lead tracking, quotation volume, and customer conversion performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-accent/50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/quotations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Generate Quotation
          </Link>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* 6 Key Statistics Cards (Directly from Database) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Total Leads Generated */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-4.5 hover:shadow-md transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {isLoading ? '...' : stats.totalLeads}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Quotations generated</p>
        </motion.div>

        {/* 2. Pending Leads */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-4.5 hover:shadow-md transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Pending Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400">
            {isLoading ? '...' : stats.pendingLeads}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Awaiting admin invoice</p>
        </motion.div>

        {/* 3. Converted Leads */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-4.5 hover:shadow-md transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Converted Leads</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {isLoading ? '...' : stats.convertedLeads}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Invoiced by admin</p>
        </motion.div>

        {/* 4. Conversion Rate */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-4.5 hover:shadow-md transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
            {isLoading ? '...' : `${stats.conversionRate}%`}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">(Converted / Total) × 100</p>
        </motion.div>

        {/* 5. Total Quotation Value */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-4.5 hover:shadow-md transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Quote Value</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-display text-purple-600 dark:text-purple-400 truncate">
            {isLoading ? '...' : formatCurrency(stats.totalQuotationValue)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Total quotation pipeline</p>
        </motion.div>

        {/* 6. Converted Business Value */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-4.5 hover:shadow-md transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Converted Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 truncate">
            {isLoading ? '...' : formatCurrency(stats.convertedBusinessValue)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Total invoiced business</p>
        </motion.div>
      </div>

      {/* Detailed Leads & Quotations Table */}
      <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Lead Tracking & Quotation Performance
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every generated quotation automatically maps to a lead and converts upon admin invoice generation.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customer, quotation, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-emerald-500 w-52 sm:w-64"
              />
            </div>
            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses ({leads.length})</option>
              <option value="pending">Pending ({stats.pendingLeads})</option>
              <option value="converted">Converted ({stats.convertedLeads})</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border text-[11px]">
              <tr>
                <th className="py-3 px-4">Lead ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Number</th>
                <th className="py-3 px-4">Quotation Number</th>
                <th className="py-3 px-4">Quotation Date</th>
                <th className="py-3 px-4 text-right">Quotation Amount</th>
                <th className="py-3 px-4">Lead Stage (POS Action)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Admin Invoice</th>
                <th className="py-3 px-4">Conversion Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                    Loading lead and quotation records...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground opacity-40 mb-2" />
                    {leads.length === 0 ? (
                      <div>
                        <p className="font-medium text-foreground">No leads or quotations generated yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click &quot;Generate Quotation&quot; to create your first quotation. It will immediately appear here!
                        </p>
                      </div>
                    ) : (
                      'No matching records found for your filter criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-accent/40 transition-colors">
                    {/* Lead ID */}
                    <td className="py-3 px-4 font-mono text-muted-foreground" title={lead.id}>
                      {lead.id ? `${lead.id.slice(0, 8)}...` : '—'}
                    </td>
                    {/* Customer Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{lead.customerName || 'N/A'}</div>
                      {lead.address && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{lead.address}</div>
                      )}
                    </td>
                    {/* Contact Number */}
                    <td className="py-3 px-4 text-foreground font-mono">
                      {lead.contactNumber || '—'}
                    </td>
                    {/* Quotation Number */}
                    <td className="py-3 px-4">
                      {lead.quotationNumber ? (
                        <span className="font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px] border border-primary/20">
                          {lead.quotationNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {/* Quotation Date */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {lead.quotationDate ? formatDate(lead.quotationDate) : '—'}
                    </td>
                    {/* Quotation Amount */}
                    <td className="py-3 px-4 text-right font-semibold text-foreground font-mono">
                      {formatCurrency(lead.quotationAmount)}
                    </td>
                    {/* Lead Stage (POS Editable) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={
                            lead.stage === 'site_visit_scheduled' ? 'site_visit' :
                            lead.stage === 'request_sent_to_material_team' ? 'material_request' :
                            (lead.stage || (lead.leadStatus === 'Converted' ? 'converted' : 'quotation_sent'))
                          }
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          disabled={updatingLeadId === lead.id}
                          className="text-[11px] font-medium bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                        >
                          {LEAD_STAGES.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                        {updatingLeadId === lead.id && (
                          <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" />
                        )}
                      </div>
                    </td>
                    {/* Lead Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(lead.leadStatus)}
                    </td>
                    {/* Invoice Number */}
                    <td className="py-3 px-4">
                      {lead.invoiceNumber ? (
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20 inline-block w-fit">
                            {lead.invoiceNumber}
                          </span>
                          {lead.invoiceAmount > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {formatCurrency(lead.invoiceAmount)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Awaiting Admin</span>
                      )}
                    </td>
                    {/* Conversion Date */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {lead.conversionDate ? (
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatDate(lead.conversionDate)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
