'use client';

import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency } from '@/lib/utils';
import {
  Target,
  Users,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Zap,
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  Star,
  Palette,
  Award,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 42000, leads: 18 },
  { month: 'Feb', revenue: 58000, leads: 24 },
  { month: 'Mar', revenue: 75000, leads: 31 },
  { month: 'Apr', revenue: 63000, leads: 27 },
  { month: 'May', revenue: 89000, leads: 35 },
  { month: 'Jun', revenue: 95000, leads: 42 },
  { month: 'Jul', revenue: 112000, leads: 48 },
];

const leadFunnelData = [
  { name: 'New', value: 45, color: '#1DBF73' },
  { name: 'Contacted', value: 32, color: '#30CB87' },
  { name: 'Site Visit', value: 18, color: '#F9A825' },
  { name: 'Quotation', value: 12, color: '#FFCA28' },
  { name: 'Converted', value: 8, color: '#1A66CE' },
];

const conversionData = [
  { month: 'Jan', rate: 14 },
  { month: 'Feb', rate: 18 },
  { month: 'Mar', rate: 22 },
  { month: 'Apr', rate: 19 },
  { month: 'May', rate: 25 },
  { month: 'Jun', rate: 28 },
  { month: 'Jul', rate: 32 },
];

const recentLeads = [
  { id: 1, name: 'Rajesh Kumar', mobile: '9876543210', stage: 'Site Visit Scheduled', kw: '5 kW', date: '2 hours ago' },
  { id: 2, name: 'Priya Sharma', mobile: '9123456780', stage: 'New', kw: '3 kW', date: '4 hours ago' },
  { id: 3, name: 'Amit Patel', mobile: '9988776655', stage: 'Quotation Sent', kw: '10 kW', date: '6 hours ago' },
  { id: 4, name: 'Sunita Devi', mobile: '9876501234', stage: 'Contacted', kw: '4 kW', date: '1 day ago' },
  { id: 5, name: 'Vikram Singh', mobile: '9112233445', stage: 'Converted', kw: '8 kW', date: '2 days ago' },
];

const stageColors: Record<string, string> = {
  'New': 'bg-emerald-500/10 text-emerald-500',
  'Contacted': 'bg-blue-500/10 text-blue-500',
  'Site Visit Scheduled': 'bg-solar-500/10 text-solar-700 dark:text-solar-400',
  'Quotation Sent': 'bg-purple-500/10 text-purple-500',
  'Negotiation': 'bg-orange-500/10 text-orange-500',
  'Converted': 'bg-emerald-600/10 text-emerald-600',
  'Lost': 'bg-red-500/10 text-red-500',
};

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

  const totalLeads = 0;
  const totalCommission = 0;
  const isNewPartner = totalLeads === 0;

  const stats = [
    {
      label: 'Total Leads',
      value: isNewPartner ? '0' : '156',
      change: isNewPartner ? 'No activity yet' : '+12%',
      trend: isNewPartner ? 'neutral' : 'up',
      icon: Target,
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Converted',
      value: isNewPartner ? '0' : '28',
      change: isNewPartner ? 'No activity yet' : '+8%',
      trend: isNewPartner ? 'neutral' : 'up',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
    },
    {
      label: 'Conversion Rate',
      value: isNewPartner ? '0%' : '17.9%',
      change: isNewPartner ? 'No activity yet' : '+2.3%',
      trend: isNewPartner ? 'neutral' : 'up',
      icon: TrendingUp,
      color: 'from-solar-500 to-solar-600',
      shadow: 'shadow-solar-500/20',
    },
    {
      label: 'Commission Earned',
      value: isNewPartner ? formatCurrency(0) : formatCurrency(284500),
      change: isNewPartner ? 'No activity yet' : '+15%',
      trend: isNewPartner ? 'neutral' : 'up',
      icon: Wallet,
      color: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/20',
    },
  ];

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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Partner'} 👋
          </h1>
          {isNewPartner ? (
            <div className="mt-1">
              <p className="text-foreground font-medium">
                You have successfully joined the REON POS Partner Network.
              </p>
              <p className="text-muted-foreground">
                Start by submitting your first solar lead to begin earning commissions.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening with your solar business today
            </p>
          )}
        </div>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
        >
          <Plus className="w-4 h-4" />
          Add New Lead
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className="group relative bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            {/* Background glow */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${stat.color} rounded-full opacity-5 group-hover:opacity-10 transition-opacity blur-2xl`} />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center ${stat.shadow} shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    stat.trend === 'up'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : stat.trend === 'neutral'
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground font-display">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {isNewPartner && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Partner Summary */}
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Partner Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Partner ID</span>
                <span className="font-medium text-foreground">{partner?.id || 'REON-POS-2026-00125'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-emerald-500 bg-emerald-500/10 px-2 rounded-full">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Joined On</span>
                <span className="font-medium text-foreground">10-Jun-2026</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Level</span>
                <span className="font-medium text-solar-500 flex items-center gap-1">
                  <Award className="w-4 h-4" /> Bronze Partner
                </span>
              </div>
            </div>
          </motion.div>

          {/* Profile Completion */}
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-foreground">Profile Completion</h3>
              <span className="text-emerald-500 font-bold">60%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mb-4">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Name</div>
              <div className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mobile</div>
              <div className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Email</div>
              <div className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Address</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Circle className="w-4 h-4" /> PAN Card</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Circle className="w-4 h-4" /> Bank Details</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Circle className="w-4 h-4" /> GST Number</div>
            </div>
            <Link href="/dashboard/settings" className="w-full py-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg font-medium transition-colors text-sm text-center block">
              Complete Profile
            </Link>
          </motion.div>

          {/* Monthly Target */}
          <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Monthly Target</h3>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Leads Submitted</p>
                <p className="text-2xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
              </div>
              <span className="text-sm font-medium text-muted-foreground">0%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-4">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-card rounded-xl border border-border p-5"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">Monthly commission earnings</p>
            </div>
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
              <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-background text-foreground shadow-sm">
                Monthly
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">
                Yearly
              </button>
            </div>
          </div>
          {totalCommission === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 bg-secondary/20 rounded-xl border border-dashed border-border">
              <Wallet className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
              <p className="text-foreground font-medium">No commission earnings available yet.</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">Your earnings and performance trends will appear here after successful project conversions.</p>
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1DBF73" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1DBF73" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1DBF73"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    dot={{ fill: '#1DBF73', stroke: '#fff', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#1DBF73', stroke: '#fff', strokeWidth: 2, r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Lead Funnel */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border p-5"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Lead Funnel</h3>
            <p className="text-sm text-muted-foreground">Current pipeline overview</p>
          </div>
          {totalLeads === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center p-4 bg-secondary/20 rounded-xl border border-dashed border-border mb-2">
              <Target className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No leads available yet.</p>
            </div>
          ) : (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadFunnelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {leadFunnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {leadFunnelData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Second Row: Conversion Trend + Recent Leads */}
      {!isNewPartner && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversion Trend */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-xl border border-border p-5"
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Conversion Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly conversion rate %</p>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Conversion Rate']}
                  />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {conversionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === conversionData.length - 1 ? '#1DBF73' : 'hsl(var(--border))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Leads */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Recent Leads</h3>
                <p className="text-sm text-muted-foreground">Your latest lead submissions</p>
              </div>
              <Link
                href="/dashboard/leads"
                className="text-sm text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-1 transition-colors"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentLeads.map((lead, i) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/10 to-solar-500/10 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {lead.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-emerald-500 transition-colors">
                        {lead.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{lead.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-xs text-muted-foreground font-medium">
                      {lead.kw}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        stageColors[lead.stage] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lead.stage}
                    </span>
                    <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {lead.date}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-base font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Lead', icon: Plus, href: '/dashboard/leads/new', color: 'from-emerald-500 to-emerald-600' },
            { label: 'View Analytics', icon: BarChart3, href: '/dashboard/analytics', color: 'from-blue-500 to-blue-600' },
            { label: 'Marketing Studio', icon: Palette, href: '/dashboard/marketing', color: 'from-purple-500 to-purple-600' },
            { label: 'My Wallet', icon: Wallet, href: '/dashboard/wallet', color: 'from-solar-500 to-solar-600' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-emerald-500 transition-colors">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
