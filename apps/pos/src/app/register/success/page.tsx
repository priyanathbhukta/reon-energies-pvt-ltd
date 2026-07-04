'use client';

import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  CheckCircle2,
  Zap,
  FileText,
  CreditCard,
  Camera,
  Banknote,
  Clock,
  Phone,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { useState, Suspense } from 'react';

const requiredDocs = [
  {
    icon: FileText,
    title: 'Aadhaar Card',
    desc: 'Original + self-attested photocopy',
    color: 'from-blue-500/10 to-blue-600/10 border-blue-500/20',
    iconColor: 'text-blue-500',
  },
  {
    icon: CreditCard,
    title: 'PAN Card',
    desc: 'Original + photocopy',
    color: 'from-purple-500/10 to-purple-600/10 border-purple-500/20',
    iconColor: 'text-purple-500',
  },
  {
    icon: Banknote,
    title: 'Cancelled Cheque / Bank Passbook',
    desc: 'First page showing your account number & IFSC',
    color: 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Camera,
    title: 'Shop Photograph',
    desc: 'Recent exterior photo of your shop / business premises',
    color: 'from-solar-500/10 to-solar-600/10 border-solar-500/20',
    iconColor: 'text-solar-600 dark:text-solar-400',
  },
];

const nextSteps = [
  { step: '01', title: 'Confirmation Call', desc: 'Our team will call you within 24–48 hours to schedule your onboarding appointment.' },
  { step: '02', title: 'Onboarding Visit', desc: 'Bring your documents to the appointment. Our agent will verify your details in person.' },
  { step: '03', title: 'Account Activated', desc: 'Once verified, your POS partner account will be activated and you can start earning.' },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('code') || '';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold font-display text-foreground">REON Energies</span>
          </div>

          <h1 className="text-3xl font-bold text-foreground font-display mb-3">
            Registration Submitted! 🎉
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            Your POS Partner application has been received. Our team will contact you within{' '}
            <span className="text-foreground font-semibold">24–48 hours</span> to schedule
            your onboarding appointment.
          </p>

          {/* Referral Code */}
          {referralCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3 mt-5 shadow-sm"
            >
              <div className="text-left">
                <p className="text-xs text-muted-foreground font-medium">Your Referral Code</p>
                <p className="text-lg font-bold text-emerald-500 font-mono tracking-widest">{referralCode}</p>
              </div>
              <button
                id="copy-referral-code"
                onClick={handleCopy}
                className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                title="Copy referral code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-6 mb-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            What Happens Next
          </h2>
          <div className="space-y-4">
            {nextSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{step.step}</span>
                  </div>
                  {i < nextSteps.length - 1 && (
                    <div className="w-px h-full bg-border mt-2 min-h-[16px]" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Required documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Documents to Bring to Onboarding
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requiredDocs.map((doc, i) => (
              <motion.div
                key={doc.title}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className={`flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br border ${doc.color}`}
              >
                <div className={`w-9 h-9 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0 ${doc.iconColor}`}>
                  <doc.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{doc.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link
            href="/login"
            id="success-go-to-login"
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl"
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="tel:+918800000000"
            id="success-call-support"
            className="flex-1 h-12 rounded-xl border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-secondary/60 transition-colors"
          >
            <Phone className="w-4 h-4 text-emerald-500" />
            Call Support
          </a>
        </motion.div>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
