'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { 
  Users, Share2, Copy, Check, QrCode, Link as LinkIcon, 
  Gift, ArrowRight, UserPlus, Trophy, Mail, Plus
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const isNewPartner = true; // Mocked

  if (isNewPartner) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-dashed border-border">
          <Gift className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          Referrals Locked
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Start referring other businesses after you add your first lead. Build your pipeline first to unlock the partner referral program!
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

  const { user, partner } = useAuthStore();
  const [copied, setCopied] = useState(false);
  
  // In a real app, this would come from the backend API
  const referralCode = partner?.referralCode || 'REON-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const referralLink = `https://pos.reonenergy.in/register?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const text = encodeURIComponent(`Join REON Energies as a POS Partner and start earning today! Use my referral code: ${referralCode}`);
    const url = encodeURIComponent(referralLink);
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=Join REON Energies&body=${text} ${url}`;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          Refer & Earn
        </h1>
        <p className="text-muted-foreground mt-1">
          Invite other businesses to become REON POS Partners and earn bonus commissions!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Referral Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-solar-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-6 border border-emerald-500/30">
              <Gift className="w-4 h-4" />
              Partner Rewards Program
            </div>
            
            <h2 className="text-3xl font-bold font-display mb-3">Earn ₹1,000 for every successful referral!</h2>
            <p className="text-navy-200 mb-8 max-w-lg">
              Share your unique link with shop owners and business contacts. When they register and successfully close their first solar lead, you'll instantly receive ₹1,000 in your wallet.
            </p>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full bg-navy-950/50 rounded-lg px-4 py-3 font-mono text-sm text-emerald-400 border border-white/10 truncate">
                {referralLink}
              </div>
              <button 
                onClick={handleCopy}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm text-navy-200 font-medium mr-2">Share via:</span>
              <button onClick={() => handleShare('whatsapp')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium transition-colors">
                WhatsApp
              </button>
              <button onClick={() => handleShare('twitter')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium transition-colors">
                Twitter
              </button>
              <button onClick={() => handleShare('email')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 border border-white/10 text-white text-sm font-medium transition-colors">
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Column */}
        <div className="space-y-4">
          {[
            { label: 'Total Referrals', value: '12', icon: Users, color: 'blue' },
            { label: 'Successful Conversions', value: '3', icon: Trophy, color: 'emerald' },
            { label: 'Total Earnings', value: '₹3,000', icon: Gift, color: 'solar' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-8 shadow-sm"
      >
        <h3 className="text-xl font-bold text-foreground mb-6">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 relative">
              <Share2 className="w-7 h-7 text-emerald-500" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">1</div>
            </div>
            <h4 className="font-semibold text-foreground mb-2">Share your link</h4>
            <p className="text-sm text-muted-foreground">Send your unique referral link to other businesses and shop owners.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative">
            <div className="hidden md:block absolute top-8 -left-1/2 w-full h-[2px] bg-gradient-to-r from-emerald-500/20 to-emerald-500 border-t-2 border-dashed border-emerald-500/30" />
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 relative z-10 bg-card">
              <UserPlus className="w-7 h-7 text-blue-500" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">2</div>
            </div>
            <h4 className="font-semibold text-foreground mb-2">They Register</h4>
            <p className="text-sm text-muted-foreground">Your friend registers as a POS Partner using your referral code.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative">
            <div className="hidden md:block absolute top-8 -left-1/2 w-full h-[2px] bg-gradient-to-r from-blue-500/20 to-solar-500 border-t-2 border-dashed border-solar-500/30" />
            <div className="w-16 h-16 rounded-full bg-solar-500/10 flex items-center justify-center mb-4 relative z-10 bg-card">
              <Gift className="w-7 h-7 text-solar-500" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-solar-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">3</div>
            </div>
            <h4 className="font-semibold text-foreground mb-2">You Earn Reward</h4>
            <p className="text-sm text-muted-foreground">Once they successfully close their first lead, ₹1,000 is credited to your wallet!</p>
          </div>
        </div>
      </motion.div>

      {/* Referral History */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">Recent Referrals</h3>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 rounded-tl-lg">Partner Name</th>
                <th className="px-6 py-3">Date Joined</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">Rahul Electronics</td>
                <td className="px-6 py-4 text-muted-foreground">May 20, 2026</td>
                <td className="px-6 py-4"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-500">Converted</span></td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">+₹1,000</td>
              </tr>
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">Sharma Hardware</td>
                <td className="px-6 py-4 text-muted-foreground">May 22, 2026</td>
                <td className="px-6 py-4"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500">Registered</span></td>
                <td className="px-6 py-4 text-right font-semibold text-muted-foreground">Pending</td>
              </tr>
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">Tech Vision Store</td>
                <td className="px-6 py-4 text-muted-foreground">May 23, 2026</td>
                <td className="px-6 py-4"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-600">Invited</span></td>
                <td className="px-6 py-4 text-right font-semibold text-muted-foreground">Pending</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
