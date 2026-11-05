'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Zap,
  Sun,
} from 'lucide-react';
import Link from 'next/link';

type Step = 'identifier' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend OTP cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Redirect to login after success
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => router.replace('/login'), 3000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  // Mask identifier for display
  const maskedIdentifier = useCallback(() => {
    const val = identifier.trim();
    if (val.includes('@')) {
      const [local, domain] = val.split('@');
      return local.slice(0, 2) + '***@' + domain;
    }
    if (val.length >= 10) {
      return val.slice(0, 2) + '******' + val.slice(-2);
    }
    return val;
  }, [identifier]);

  // ── Step 1: Send OTP ────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your mobile number or email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });

      if (response.data._devOtp) {
        setDevOtp(response.data._devOtp);
      }

      setStep('otp');
      setResendCooldown(30);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to send OTP. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter the OTP sent to your mobile/email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-reset-otp', {
        identifier: identifier.trim(),
        otp,
      });

      setResetToken(response.data.resetToken);
      setStep('reset');
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'OTP verification failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setDevOtp('');

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });

      if (response.data._devOtp) {
        setDevOtp(response.data._devOtp);
      }

      setResendCooldown(30);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Reset Password ─────────────────────────────────
  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        resetToken,
        newPassword,
        confirmPassword,
      });

      setStep('success');
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Password reset failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────
  const steps = [
    { key: 'identifier', label: 'Verify Identity' },
    { key: 'otp', label: 'Enter OTP' },
    { key: 'reset', label: 'New Password' },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy to-navy-900">
        {/* Animated glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-solar-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-48 h-48 bg-emerald-400/5 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '2s' }}
          />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-emerald-500/15"
              initial={{ y: 0, rotate: 0 }}
              animate={{ y: [-20, 20, -20], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
              style={{ top: `${15 + i * 14}%`, left: `${8 + i * 14}%` }}
            >
              <Sun size={22 + i * 7} />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight font-display">REON</h1>
                <p className="text-emerald-400 text-xs font-medium tracking-widest uppercase">Energies</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4 font-display leading-tight">
              Reset Your
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-solar-400 bg-clip-text text-transparent">
                Password
              </span>
            </h2>

            <p className="text-navy-200 text-lg mb-10 max-w-md leading-relaxed">
              Don&apos;t worry — it happens to the best of us. We&apos;ll help you get
              back into your account in no time.
            </p>

            {/* Security assurance */}
            <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-white font-medium text-sm">Secure Password Reset</p>
                <p className="text-navy-300 text-xs mt-0.5">
                  Your account security is our priority. OTP is valid for 5 minutes.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom wave */}
        <svg className="absolute bottom-0 left-0 right-0 text-navy-900/50" viewBox="0 0 1440 120" fill="currentColor">
          <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
        </svg>
      </div>

      {/* ── Right panel — Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold font-display text-foreground">REON Energies</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground font-display mb-2">
              {step === 'success' ? 'All Done!' : 'Reset Password'}
            </h2>
            <p className="text-muted-foreground">
              {step === 'identifier' && 'Enter your registered mobile number or email'}
              {step === 'otp' && `Enter the OTP sent to ${maskedIdentifier()}`}
              {step === 'reset' && 'Create a new secure password'}
              {step === 'success' && 'Your password has been reset successfully'}
            </p>
          </div>

          {/* Step indicator */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      i <= currentStepIndex
                        ? 'bg-emerald-500 text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 rounded transition-all ${
                        i < currentStepIndex ? 'bg-emerald-500' : 'bg-secondary'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Step Content ── */}
          <AnimatePresence mode="wait">
            {/* Step 1: Identifier */}
            {step === 'identifier' && (
              <motion.form
                key="identifier"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSendOtp}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="fp-identifier">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="fp-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError('');
                      }}
                      className="w-full h-13 rounded-xl bg-secondary/50 border border-border pl-11 pr-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="9876543210 or email@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 py-3.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleVerifyOtp}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="fp-otp">
                    One-Time Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="fp-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      className="w-full h-13 rounded-xl bg-secondary/50 border border-border pl-11 pr-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all tracking-[0.3em] text-center font-mono text-lg"
                      placeholder="• • • • • •"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Dev OTP display */}
                {devOtp && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Dev OTP: <strong className="font-mono">{devOtp}</strong>
                    </span>
                  </div>
                )}

                {/* Resend */}
                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend OTP in{' '}
                      <span className="font-medium text-foreground">{resendCooldown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm text-emerald-500 hover:text-emerald-600 font-medium transition-colors"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('identifier');
                      setError('');
                      setOtp('');
                      setDevOtp('');
                    }}
                    className="h-13 px-6 rounded-xl border border-border text-foreground font-medium hover:bg-secondary/50 transition-all flex items-center gap-2 py-3.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-13 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25 py-3.5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify OTP
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 3: New Password */}
            {step === 'reset' && (
              <motion.form
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleResetPassword}
                className="space-y-5"
              >
                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="fp-new-password">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="fp-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full h-13 rounded-xl bg-secondary/50 border border-border pl-11 pr-12 py-3.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="Enter new password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="fp-confirm-password">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="fp-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full h-13 rounded-xl bg-secondary/50 border border-border pl-11 pr-12 py-3.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password hint */}
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long.
                </p>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 py-3.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Resetting Password…
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 font-display">
                  Password Reset Successful!
                </h3>
                <p className="text-muted-foreground mb-6">
                  You can now log in with your new password. Redirecting to login…
                </p>
                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Login */}
          {step !== 'success' && (
            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="text-sm text-emerald-500 font-semibold hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
