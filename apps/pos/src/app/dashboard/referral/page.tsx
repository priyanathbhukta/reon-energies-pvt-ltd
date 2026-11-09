'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { 
  Users, Share2, Copy, Check, QrCode, Link as LinkIcon, 
  Gift, ArrowRight, UserPlus, Trophy, Mail, Plus, Store,
  Building2, CheckCircle2, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface ReferredPartner {
  id: string;
  shopName: string;
  ownerName: string;
  location: string;
  status: string;
  dateJoined: string;
  reward: string;
  isConverted: boolean;
}

interface ReferralStats {
  totalReferrals: number;
  successfulConversions: number;
  totalEarnings: number;
}

export default function ReferralsPage() {
  const { user, partner } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState(partner?.referralCode || 'REON-PARTNER');
  const [referralLink, setReferralLink] = useState(`https://pos.reonenergy.in/register?ref=${partner?.referralCode || 'REON-PARTNER'}`);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    successfulConversions: 0,
    totalEarnings: 0,
  });
  const [referredPartners, setReferredPartners] = useState<ReferredPartner[]>([]);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/pos/referrals');
      if (res.data?.success) {
        if (res.data.referralCode) {
          setReferralCode(res.data.referralCode);
        }
        if (res.data.referralLink) {
          setReferralLink(res.data.referralLink);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.referredPartners) {
          setReferredPartners(res.data.referredPartners);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load referral data from API, using store fallback:', err);
      if (partner?.referralCode) {
        setReferralCode(partner.referralCode);
        setReferralLink(`https://pos.reonenergy.in/register?ref=${partner.referralCode}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Partner referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const text = encodeURIComponent(
      `Join REON Energies as an Authorized POS Partner! Set up your solar dealership and start earning high commissions. Register using my partner referral code: ${referralCode}`
    );
    const url = encodeURIComponent(referralLink);
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=Join REON Energies as a POS Partner&body=${text} ${url}`;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Title & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
              POS Partner Referral Program
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              B2B Partner Network
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Refer another business, electrical shop, or hardware store to register as an authorized REON POS Partner.
          </p>
        </div>
        <button
          onClick={fetchReferralData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-accent/50 transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Note Clarifying B2B vs Customer Leads */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs sm:text-sm flex items-start gap-3">
        <Store className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
        <div>
          <span className="font-semibold">B2B Partner Expansion: </span>
          This referral program is designed exclusively to invite <strong>new POS Partners / Dealerships</strong> to join the REON Energies network. 
          Customer solar leads are tracked automatically via the <em>Quotations</em> and <em>Leads</em> sections.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/50"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-5 border border-emerald-500/30">
              <Gift className="w-4 h-4" />
              Partner-to-Partner Rewards
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
              Earn ₹1,000 for each new POS store you onboard!
            </h2>
            <p className="text-slate-300 mb-6 text-sm sm:text-base max-w-lg leading-relaxed">
              Share your partner link or code with fellow retail businesses. Once their POS dealership is verified and activates their first lead, ₹1,000 is directly credited to your partner wallet.
            </p>
            
            {/* Referral Link & Code Box */}
            <div className="space-y-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full bg-slate-950/60 rounded-lg px-3.5 py-2.5 font-mono text-xs sm:text-sm text-emerald-400 border border-white/10 truncate">
                  {referralLink}
                </div>
                <button 
                  onClick={handleCopy}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-md shadow-emerald-500/20"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <span>Your Referral Code:</span>
                <span className="font-bold text-white bg-white/15 px-2.5 py-1 rounded border border-white/20">
                  {referralCode}
                </span>
              </div>
            </div>
            
            {/* Share Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-300 font-medium mr-1">Share via:</span>
              <button 
                onClick={() => handleShare('whatsapp')} 
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold transition-colors shadow"
              >
                WhatsApp
              </button>
              <button 
                onClick={() => handleShare('twitter')} 
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-xs font-semibold transition-colors shadow"
              >
                Twitter
              </button>
              <button 
                onClick={() => handleShare('email')} 
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-white/10 text-white text-xs font-semibold transition-colors shadow"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats & Scan Column */}
        <div className="space-y-4">
          {/* QR Code Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col items-center text-center"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Scan to Register Partner
            </span>
            <div className="w-36 h-36 relative bg-white p-2 rounded-xl border border-border shadow-inner flex items-center justify-center">
              <Image 
                src="/qr_reon.png" 
                alt="Register POS Partner QR" 
                width={130} 
                height={130} 
                className="object-contain"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 max-w-[200px]">
              Let fellow shop owners scan directly with their mobile camera to register.
            </p>
          </motion.div>

          {/* 3 Metric Cards */}
          {[
            { label: 'Referred POS Partners', value: stats.totalReferrals, icon: Users, color: 'blue' },
            { label: 'Active / Converted Deals', value: stats.successfulConversions, icon: Trophy, color: 'emerald' },
            { label: 'Total Referral Bonus', value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`, icon: Gift, color: 'purple' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold font-display text-foreground">
                  {isLoading ? '...' : stat.value}
                </p>
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
        className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm"
      >
        <h3 className="text-lg font-bold text-foreground mb-6">How Partner Referral Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 relative">
              <Share2 className="w-6 h-6 text-emerald-500" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-background">1</div>
            </div>
            <h4 className="font-semibold text-foreground text-sm mb-1">Share Your Partner Link</h4>
            <p className="text-xs text-muted-foreground">Send your referral link or code to hardware stores, electrical shops, or local entrepreneurs.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 relative">
              <UserPlus className="w-6 h-6 text-blue-500" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-background">2</div>
            </div>
            <h4 className="font-semibold text-foreground text-sm mb-1">They Register As POS</h4>
            <p className="text-xs text-muted-foreground">The new business signs up as a REON POS Partner with your referral code attached automatically.</p>
          </div>
          
          <div className="flex flex-col items-center text-center relative">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 relative">
              <Gift className="w-6 h-6 text-amber-500" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-background">3</div>
            </div>
            <h4 className="font-semibold text-foreground text-sm mb-1">Bonus Credited To Wallet</h4>
            <p className="text-xs text-muted-foreground">When their dealership profile is approved and active, a ₹1,000 cash bonus is credited to your wallet!</p>
          </div>
        </div>
      </motion.div>

      {/* Referred POS Partners Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <div className="p-5 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-foreground">Referred POS Partners</h3>
            <p className="text-xs text-muted-foreground">Businesses registered under your referral code</p>
          </div>
          <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">
            {referredPartners.length} {referredPartners.length === 1 ? 'partner' : 'partners'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px] border-b border-border">
              <tr>
                <th className="px-5 py-3">Store / Partner Name</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Date Registered</th>
                <th className="px-5 py-3 text-center">Dealership Status</th>
                <th className="px-5 py-3 text-right">Referral Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-1" />
                    Loading referred partners...
                  </td>
                </tr>
              ) : referredPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <Store className="w-8 h-8 mx-auto text-muted-foreground opacity-40 mb-2" />
                    <p className="font-medium text-foreground">No partners referred yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Share your link above with other retail shop owners to start earning ₹1,000 per store!
                    </p>
                  </td>
                </tr>
              ) : (
                referredPartners.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{item.shopName}</div>
                      <div className="text-[11px] text-muted-foreground">{item.ownerName}</div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {item.location}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {formatDate(item.dateJoined)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                        item.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {item.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Active Partner
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            Pending Verification
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold font-mono">
                      <span className={item.isConverted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                        {item.reward}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
