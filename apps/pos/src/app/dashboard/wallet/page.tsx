'use client';

import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  TrendingUp,
  Clock,
  Download,
  CreditCard,
  ChevronRight,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';

const walletData = {
  balance: 42850,
  totalEarned: 284500,
  totalWithdrawn: 241650,
  pendingPayout: 15000,
};

const transactions = [
  { id: '1', type: 'credit', amount: 12500, description: 'Commission — Rajesh Kumar (5 kW)', date: '2026-05-22', referenceType: 'commission' },
  { id: '2', type: 'debit', amount: 25000, description: 'Payout — Bank Transfer', date: '2026-05-20', referenceType: 'payout' },
  { id: '3', type: 'credit', amount: 8000, description: 'Commission — Priya Sharma (3 kW)', date: '2026-05-18', referenceType: 'commission' },
  { id: '4', type: 'credit', amount: 5000, description: 'Bonus — Monthly Top Performer', date: '2026-05-15', referenceType: 'bonus' },
  { id: '5', type: 'credit', amount: 18000, description: 'Commission — Amit Patel (10 kW)', date: '2026-05-12', referenceType: 'commission' },
  { id: '6', type: 'debit', amount: 30000, description: 'Payout — Bank Transfer', date: '2026-05-10', referenceType: 'payout' },
  { id: '7', type: 'credit', amount: 6500, description: 'Commission — Sunita Devi (4 kW)', date: '2026-05-08', referenceType: 'commission' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function WalletPage() {
  const isNewPartner = true; // Mocked

  if (isNewPartner) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-dashed border-border">
          <WalletIcon className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          Your Wallet is Empty
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Start referring leads to earn commissions. Once your referred leads are converted into successful solar projects, your earnings will appear here.
        </p>
        <Link
          href="/dashboard/leads/new"
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm flex items-center gap-2 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <TrendingUp className="w-4 h-4" />
          Earn Your First Commission
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your commissions and payouts</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25">
          <Banknote className="w-4 h-4" />
          Request Payout
        </button>
      </motion.div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Balance', value: walletData.balance, icon: WalletIcon, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', highlight: true },
          { label: 'Total Earned', value: walletData.totalEarned, icon: TrendingUp, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
          { label: 'Total Withdrawn', value: walletData.totalWithdrawn, icon: ArrowUpRight, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
          { label: 'Pending Payout', value: walletData.pendingPayout, icon: Clock, color: 'from-solar-500 to-solar-600', shadow: 'shadow-solar-500/20' },
        ].map((card) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            className={cn(
              'relative bg-card rounded-xl border border-border p-5 overflow-hidden',
              card.highlight && 'ring-1 ring-emerald-500/20'
            )}
          >
            <div className={cn('absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br rounded-full opacity-5 blur-xl', card.color)} />
            <div className="relative">
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-3', card.color, card.shadow)}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground font-display">
                {formatCurrency(card.value)}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transactions */}
      <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">Transaction History</h3>
            <p className="text-sm text-muted-foreground">Your recent wallet activity</p>
          </div>
          <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="divide-y divide-border">
          {transactions.map((txn, i) => (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    txn.type === 'credit'
                      ? 'bg-emerald-500/10'
                      : 'bg-red-500/10'
                  )}
                >
                  {txn.type === 'credit' ? (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{txn.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(txn.date)}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide',
                        txn.referenceType === 'commission' && 'bg-blue-500/10 text-blue-500',
                        txn.referenceType === 'payout' && 'bg-purple-500/10 text-purple-500',
                        txn.referenceType === 'bonus' && 'bg-solar-500/10 text-solar-600 dark:text-solar-400'
                      )}
                    >
                      {txn.referenceType}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  'text-sm font-semibold',
                  txn.type === 'credit' ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {txn.type === 'credit' ? '+' : '-'}
                {formatCurrency(txn.amount)}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
