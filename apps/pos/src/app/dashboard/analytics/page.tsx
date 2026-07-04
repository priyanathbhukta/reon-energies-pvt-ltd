'use client';

import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { ArrowUpRight, TrendingUp, Users, Target, Activity, Battery, Zap, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

// Mock data (will be replaced by actual API data in production)
const revenueData = [
  { name: 'Jan', current: 4000, previous: 2400 },
  { name: 'Feb', current: 3000, previous: 1398 },
  { name: 'Mar', current: 2000, previous: 9800 },
  { name: 'Apr', current: 2780, previous: 3908 },
  { name: 'May', current: 1890, previous: 4800 },
  { name: 'Jun', current: 2390, previous: 3800 },
  { name: 'Jul', current: 3490, previous: 4300 },
];

const leadConversionData = [
  { name: 'New Leads', value: 400, color: '#3b82f6' },
  { name: 'Contacted', value: 300, color: '#f59e0b' },
  { name: 'Site Visit', value: 200, color: '#8b5cf6' },
  { name: 'Converted', value: 100, color: '#10b981' },
];

const productSalesData = [
  { name: 'Rooftop Solar', value: 45, color: '#10b981' },
  { name: 'Batteries', value: 25, color: '#f59e0b' },
  { name: 'EV Chargers', value: 20, color: '#3b82f6' },
  { name: 'Maintenance', value: 10, color: '#8b5cf6' },
];

export default function AnalyticsPage() {
  const isNewPartner = true; // Mocked

  if (isNewPartner) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-dashed border-border">
          <Activity className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          No Analytics Yet
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Your performance analytics, revenue trends, and conversion data will appear here once you start submitting leads and earning commissions.
        </p>
        <Link
          href="/dashboard/leads/new"
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm flex items-center gap-2 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Target className="w-4 h-4" />
          Add Your First Lead
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Detailed insights into your solar business performance
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Revenue', value: formatCurrency(1245000), trend: '+14%', icon: DollarSign, color: 'emerald' },
          { title: 'Lead Conversion Rate', value: '25.4%', trend: '+2.1%', icon: Activity, color: 'blue' },
          { title: 'Active Projects', value: '12', trend: '+3', icon: Zap, color: 'solar' },
          { title: 'Target Achievement', value: '84%', trend: '+5%', icon: Target, color: 'purple' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="flex items-center text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                {stat.trend}
              </span>
            </div>
            <h3 className="text-3xl font-bold font-display text-foreground">{stat.value}</h3>
            <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Comparison Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
            <p className="text-sm text-muted-foreground">Current vs Previous Year</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="current" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCurrent)" name="This Year" />
                <Area type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} name="Last Year" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Lead Funnel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Lead Conversion Funnel</h3>
            <p className="text-sm text-muted-foreground">Pipeline health overview</p>
          </div>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadConversionData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                  {leadConversionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Product Sales Pie Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <div className="mb-2">
            <h3 className="text-lg font-semibold">Product Mix</h3>
            <p className="text-sm text-muted-foreground">Sales distribution by category</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productSalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {productSalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {productSalesData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Performance Metrics */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Weekly Targets</h3>
            <p className="text-sm text-muted-foreground">Goal vs Actual progress</p>
          </div>
          
          <div className="space-y-6">
            {[
              { label: 'Leads Generated', actual: 45, target: 50, color: 'bg-blue-500' },
              { label: 'Site Visits', actual: 28, target: 30, color: 'bg-purple-500' },
              { label: 'Quotations Sent', actual: 15, target: 20, color: 'bg-solar-500' },
              { label: 'Deals Closed', actual: 5, target: 5, color: 'bg-emerald-500' },
            ].map((metric, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{metric.label}</span>
                  <span className="text-muted-foreground">
                    {metric.actual} / {metric.target}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (metric.actual / metric.target) * 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                    className={`h-full ${metric.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
