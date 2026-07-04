'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/auth-store';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Zap,
  Shield,
  BarChart3,
  FileText,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, logout } = useAdminAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('reon_admin_token') : null;
    if (isAuthenticated && token) {
      router.push('/dashboard');
    } else if (isAuthenticated && !token) {
      logout();
    }
  }, [isAuthenticated, router, logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Show cold-start warning after 5 seconds
    const wakeTimer = setTimeout(() => {
      setError('⏳ Server is waking up (free tier cold start). Please wait 30–60 seconds...');
    }, 5000);

    try {
      await login(form.username, form.password);
      clearTimeout(wakeTimer);
      router.push('/dashboard');
    } catch (err: any) {
      clearTimeout(wakeTimer);
      if (err.name === 'AbortError') {
        setError('Connection timed out. The server may be down.');
      } else {
        setError(err.response?.data?.error || err.message || 'Login failed');
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy to-navy-900">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-solar-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-emerald-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
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
                <h1 className="text-2xl font-bold text-white tracking-tight font-display">
                  REON
                </h1>
                <p className="text-emerald-400 text-xs font-medium tracking-widest uppercase">
                  Admin Panel
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4 font-display leading-tight">
              Manage Your
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-solar-400 bg-clip-text text-transparent">
                Solar Empire
              </span>
            </h2>

            <p className="text-navy-200 text-lg mb-10 max-w-md leading-relaxed">
              Complete control over quotations, invoices, projects, POS partners, 
              and business analytics — all in one place.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: FileText, text: 'Quotations & Invoices management' },
                { icon: Shield, text: 'POS Partner approvals & KYC' },
                { icon: BarChart3, text: 'Real-time business analytics' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-navy-100 text-sm">{feature.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom wave */}
        <svg
          className="absolute bottom-0 left-0 right-0 text-navy-900/50"
          viewBox="0 0 1440 120"
          fill="currentColor"
        >
          <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
        </svg>
      </div>

      {/* Right Panel — Login Form */}
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
            <span className="text-xl font-bold font-display text-foreground">REON Admin</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground font-display mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access the admin dashboard
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-destructive rounded-full flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="admin-username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="admin-username"
                  type="text"
                  required
                  placeholder="Enter username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full h-14 rounded-xl bg-secondary/50 border border-border pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-14 rounded-xl bg-secondary/50 border border-border pl-11 pr-12 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !form.username || !form.password}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground/60">
              © 2026 REON Energies Pvt Ltd. Admin Panel.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
