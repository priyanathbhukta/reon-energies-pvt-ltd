'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Phone,
  MapPin,
  Zap,
  Eye,
  Edit,
  Download,
  ArrowUpDown,
  LayoutGrid,
  List,
  Target,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';

type LeadStage = 'new' | 'contacted' | 'site_visit_scheduled' | 'quotation_sent' | 'negotiation' | 'converted' | 'lost';

interface Lead {
  id: string;
  customerName: string;
  mobile: string;
  address: string;
  estimatedKw: number;
  electricityBillAmount: number;
  stage: LeadStage;
  priority: 'low' | 'medium' | 'high';
  source: string;
  createdAt: string;
}

const stageConfig: Record<LeadStage, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  contacted: { label: 'Contacted', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  site_visit_scheduled: { label: 'Site Visit', color: 'text-solar-600 dark:text-solar-400', bgColor: 'bg-solar-500/10' },
  quotation_sent: { label: 'Quotation Sent', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  negotiation: { label: 'Negotiation', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  converted: { label: 'Converted', color: 'text-emerald-600', bgColor: 'bg-emerald-600/10' },
  lost: { label: 'Lost', color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  medium: { label: 'Medium', color: 'text-solar-500', dot: 'bg-solar-500' },
  high: { label: 'High', color: 'text-red-500', dot: 'bg-red-500' },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/leads');
      setLeads(response.data.leads || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.mobile || '').includes(searchQuery);
    const matchesStage = selectedStage === 'all' || lead.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  const stageCount = (stage: string) =>
    leads.filter((l) => l.stage === stage).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-dashed border-border">
          <Target className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          No Leads Yet
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Start building your solar pipeline by adding your first lead. Track their progress from new to converted.
        </p>
        <Link
          href="/dashboard/leads/new"
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm flex items-center gap-2 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Your First Lead
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your solar leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-2 hover:bg-accent transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href="/dashboard/leads/new"
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm flex items-center gap-2 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedStage('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
            selectedStage === 'all'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          All ({leads.length})
        </button>
        {Object.entries(stageConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedStage(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              selectedStage === key
                ? `${config.bgColor} ${config.color}`
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {config.label} ({stageCount(key)})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-lg bg-secondary/50 border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <div className="flex items-center bg-secondary/50 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'kanban'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads(filteredLeads.map((l) => l.id));
                        } else {
                          setSelectedLeads([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-border accent-emerald-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Stage <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Est. kW
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, i) => {
                  const stage = stageConfig[lead.stage] || { label: lead.stage, color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
                  const priority = priorityConfig[lead.priority] || { label: lead.priority, color: 'text-gray-500', dot: 'bg-gray-500' };
                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads([...selectedLeads, lead.id]);
                            } else {
                              setSelectedLeads(selectedLeads.filter((id) => id !== lead.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-border accent-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/10 to-solar-500/10 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                            {(lead.customerName || 'UN').split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {lead.customerName}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Phone className="w-3 h-3" />
                              {lead.mobile}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{lead.address || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', stage.bgColor, stage.color)}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm text-foreground">
                          <Zap className="w-3.5 h-3.5 text-solar-500" />
                          {lead.estimatedKw || 0} kW
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
                          <span className={cn('text-xs font-medium', priority.color)}>
                            {priority.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3" />
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No leads found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filteredLeads.length} of {leads.length} leads
            </p>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground">
                Previous
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-foreground text-background">
                1
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(stageConfig).map(([key, config]) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === key);
            return (
              <div
                key={key}
                className="flex-shrink-0 w-72 bg-muted/30 rounded-xl border border-border"
              >
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', config.color.replace('text-', 'bg-'))} />
                      <span className="text-sm font-semibold text-foreground">
                        {config.label}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="block p-3 bg-card rounded-lg border border-border hover:shadow-md transition-all group"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {lead.customerName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Phone className="w-3 h-3" />
                        {lead.mobile}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3 text-solar-500" />
                          {lead.estimatedKw || 0} kW
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn('w-1.5 h-1.5 rounded-full', (priorityConfig[lead.priority] || priorityConfig.medium).dot)} />
                          <span className={cn('text-[10px] font-medium', (priorityConfig[lead.priority] || priorityConfig.medium).color)}>
                            {(priorityConfig[lead.priority] || priorityConfig.medium).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No leads
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
