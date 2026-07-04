'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import {
  User,
  Store,
  ClipboardCheck,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Loader2,
  Building2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  FileText,
  CreditCard,
  Camera,
  Banknote,
  Info,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu',
  'Lakshadweep','Puducherry',
];

const steps = [
  { label: 'Personal Info', icon: User, description: 'Your identity & credentials' },
  { label: 'Business Details', icon: Store, description: 'Shop & location information' },
  { label: 'Review & Submit', icon: ClipboardCheck, description: 'Confirm and register' },
];

// ── Reusable Input Component ─────────────────────────────────
function InputField({
  label, id, icon: Icon, type = 'text', value, onChange, placeholder, maxLength, required = false,
  suffix, disabled = false, hint,
}: {
  label: string; id: string; icon: any; type?: string; value: string;
  onChange: (value: string) => void; placeholder: string; maxLength?: number;
  required?: boolean; suffix?: React.ReactNode; disabled?: boolean; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          id={id}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`w-full h-12 rounded-xl border border-border pl-11 ${suffix ? 'pr-12' : 'pr-4'} text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${disabled ? 'bg-secondary/50 cursor-not-allowed text-muted-foreground' : 'bg-secondary/40'}`}
        />
        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Password Strength Indicator ──────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ['bg-destructive', 'bg-orange-500', 'bg-solar-500', 'bg-emerald-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-xs flex items-center gap-1 transition-colors ${
                c.ok ? 'text-emerald-500' : 'text-muted-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.ok ? 'bg-emerald-500' : 'bg-border'}`} />
              {c.label}
            </span>
          ))}
        </div>
        {strength > 0 && (
          <span className={`text-xs font-semibold ${colors[strength - 1].replace('bg-', 'text-')}`}>
            {labels[strength - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Compliance Modal ─────────────────────────────────────────
function ComplianceModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const documents = [
    { icon: FileText, label: 'Aadhaar Card', note: 'Original + self-attested photocopy' },
    { icon: CreditCard, label: 'PAN Card', note: 'Original + photocopy' },
    { icon: Banknote, label: 'Cancelled Cheque or Bank Passbook', note: 'First page showing account details' },
    { icon: Camera, label: 'Shop Photograph', note: 'Recent photo of your shop / business premises' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25 }}
          className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-solar-500/10 border-b border-border px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Info className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-display">
                  Documents Required at Onboarding
                </h3>
              </div>
              <p className="text-sm text-muted-foreground ml-10">
                Your online registration is complete! Please bring the following documents in person.
              </p>
            </div>
            <button
              id="compliance-modal-close"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Document list */}
          <div className="px-6 py-5">
            <div className="space-y-3 mb-6">
              {documents.map((doc) => (
                <div key={doc.label} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-secondary/40 border border-border/50">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <doc.icon className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{doc.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.note}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Notice */}
            <div className="flex items-start gap-2.5 bg-solar-500/8 border border-solar-500/20 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-solar-600 dark:text-solar-400 shrink-0 mt-0.5" />
              <p className="text-xs text-solar-700 dark:text-solar-300 leading-relaxed">
                Our team will contact you on your registered mobile number within{' '}
                <strong>24–48 hours</strong> to schedule your onboarding appointment.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                id="compliance-modal-back"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-secondary/60 transition-colors"
              >
                Go Back
              </button>
              <button
                id="compliance-modal-confirm"
                onClick={onConfirm}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Understood, Submit
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Register Page ───────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1 — Personal
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 2 — Business
    shopName: '',
    gstNumber: '',
    address: '',
    state: '',
    district: '',
    pincode: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // ── Validation per step ──────────────────────────────────
  const validateStep = (): string => {
    switch (currentStep) {
      case 0:
        if (!formData.fullName.trim()) return 'Full name is required';
        if (!/^\d{10}$/.test(formData.mobile)) return 'Enter a valid 10-digit mobile number';
        if (!formData.email.includes('@') || !formData.email.includes('.'))
          return 'Enter a valid email address';
        if (formData.password.length < 8) return 'Password must be at least 8 characters';
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password))
          return 'Password must contain uppercase, lowercase, and a number';
        if (formData.password !== formData.confirmPassword)
          return 'Passwords do not match';
        break;
      case 1:
        if (!formData.shopName.trim()) return 'Shop / Business name is required';
        if (!formData.address.trim()) return 'Address is required';
        if (!formData.state.trim()) return 'State is required';
        if (!formData.district.trim()) return 'District is required';
        break;
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setError('');
  };

  // Show compliance modal before final submit
  const handleReviewSubmit = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setShowComplianceModal(true);
  };

  // Called after user confirms compliance modal
  const handleFinalSubmit = async () => {
    setShowComplianceModal(false);
    setError('');

    try {
      const result = await register({
        fullName: formData.fullName.trim(),
        mobile: formData.mobile,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        shopName: formData.shopName.trim(),
        gstNumber: formData.gstNumber.trim() || undefined,
        address: formData.address.trim(),
        state: formData.state,
        district: formData.district.trim(),
        pincode: formData.pincode.trim() || undefined,
      });

      router.push(`/register/success?code=${result?.referralCode || ''}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  // ── Step 1 — Personal Info ───────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-4">
      <InputField
        label="Full Name" id="reg-fullname" icon={User} required
        value={formData.fullName}
        onChange={(v) => updateField('fullName', v)}
        placeholder="As per your Aadhaar card"
      />
      <InputField
        label="Mobile Number" id="reg-mobile" icon={Phone} type="tel" required
        value={formData.mobile}
        onChange={(v) => updateField('mobile', v.replace(/\D/g, ''))}
        placeholder="10-digit number"
        maxLength={10}
        hint="This will be your login username"
      />
      <InputField
        label="Email Address" id="reg-email" icon={Mail} type="email" required
        value={formData.email}
        onChange={(v) => updateField('email', v)}
        placeholder="you@example.com"
      />

      {/* Password */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="reg-password">
          Password <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Create a strong password"
            className="w-full h-12 rounded-xl bg-secondary/40 border border-border pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrength password={formData.password} />
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="reg-confirm-password">
          Confirm Password <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            id="reg-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            placeholder="Re-enter your password"
            className={`w-full h-12 rounded-xl bg-secondary/40 border pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
              formData.confirmPassword && formData.confirmPassword !== formData.password
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border focus:border-emerald-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {formData.confirmPassword && formData.confirmPassword !== formData.password && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-destructive" />
            Passwords do not match
          </p>
        )}
      </div>
    </div>
  );

  // ── Step 2 — Business Details ────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      <InputField
        label="Shop / Business Name" id="reg-shopname" icon={Store} required
        value={formData.shopName}
        onChange={(v) => updateField('shopName', v)}
        placeholder="Your business name"
      />
      <InputField
        label="GST Number (Optional)" id="reg-gst" icon={Building2}
        value={formData.gstNumber}
        onChange={(v) => updateField('gstNumber', v.toUpperCase())}
        placeholder="22AAAAA0000A1Z5"
        maxLength={15}
        hint="Leave blank if not registered under GST"
      />
      <InputField
        label="Full Address" id="reg-address" icon={MapPin} required
        value={formData.address}
        onChange={(v) => updateField('address', v)}
        placeholder="Shop address / business premises"
      />

      <div className="grid grid-cols-2 gap-3">
        {/* State dropdown */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="reg-state">
            State <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              id="reg-state"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="w-full h-12 rounded-xl bg-secondary/40 border border-border pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <InputField
          label="District" id="reg-district" icon={MapPin} required
          value={formData.district}
          onChange={(v) => updateField('district', v)}
          placeholder="e.g. Kolkata"
        />
      </div>

      <InputField
        label="Pincode" id="reg-pincode" icon={MapPin}
        value={formData.pincode}
        onChange={(v) => updateField('pincode', v.replace(/\D/g, ''))}
        placeholder="6-digit pincode"
        maxLength={6}
      />
    </div>
  );

  // ── Step 3 — Review & Submit ─────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-5">
      {/* Summary cards */}
      {[
        {
          title: 'Personal Information',
          icon: User,
          rows: [
            { label: 'Full Name', value: formData.fullName },
            { label: 'Mobile', value: formData.mobile },
            { label: 'Email', value: formData.email },
            { label: 'Password', value: '••••••••' },
          ],
          step: 0,
        },
        {
          title: 'Business Details',
          icon: Store,
          rows: [
            { label: 'Shop Name', value: formData.shopName },
            { label: 'GST Number', value: formData.gstNumber || 'Not provided' },
            { label: 'Address', value: formData.address },
            { label: 'Location', value: `${formData.district}, ${formData.state}${formData.pincode ? ' – ' + formData.pincode : ''}` },
          ],
          step: 1,
        },
      ].map((section) => (
        <div key={section.title} className="bg-secondary/30 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
            <div className="flex items-center gap-2.5">
              <section.icon className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            </div>
            <button
              onClick={() => { setCurrentStep(section.step); setError(''); }}
              className="text-xs text-emerald-500 hover:text-emerald-600 font-medium transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {section.rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground text-right max-w-[200px] truncate">{row.value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* KYC Notice */}
      <div className="bg-gradient-to-br from-emerald-500/5 to-solar-500/5 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              📋 KYC & Bank Details — Physical Submission
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To protect your sensitive data, Aadhaar, PAN, and bank details are <strong>not collected online</strong>.
              You will submit them in person during your onboarding appointment. Our team will contact you
              within <strong>24–48 hours</strong> to schedule this.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const stepContent = [renderStep0, renderStep1, renderStep2];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Compliance Modal */}
      {showComplianceModal && (
        <ComplianceModal
          onConfirm={handleFinalSubmit}
          onClose={() => setShowComplianceModal(false)}
        />
      )}

      <div className="min-h-screen bg-background flex">
        {/* ── Left branding panel ── */}
        <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy to-navy-900">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-32 right-10 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: '1.5s' }}
            />
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12">
            <Link href="/" className="flex items-center gap-3 mb-12">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-display">REON</h1>
                <p className="text-emerald-400 text-xs font-medium tracking-widest uppercase">Energies</p>
              </div>
            </Link>

            <h2 className="text-3xl font-bold text-white font-display mb-4 leading-tight">
              Become a<br />
              <span className="bg-gradient-to-r from-emerald-400 to-solar-400 bg-clip-text text-transparent">
                POS Partner
              </span>
            </h2>

            <p className="text-navy-200 text-base mb-10 max-w-sm leading-relaxed">
              Join REON&apos;s growing solar network. Earn commissions on every successful lead conversion.
              Zero investment required.
            </p>

            <div className="space-y-4">
              {[
                { icon: Zap, text: 'Instant commission credits to your wallet' },
                { icon: Lock, text: 'Fully secure — no sensitive data stored online' },
                { icon: Building2, text: 'Dedicated territory allocation' },
                { icon: Check, text: 'Easy bank payouts with full transparency' },
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-sm text-navy-100">{benefit.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-lg py-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold font-display text-foreground">REON Energies</span>
            </div>

            <h2 className="text-2xl font-bold text-foreground font-display mb-1">
              POS Partner Registration
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Step {currentStep + 1} of {steps.length} — {steps[currentStep].label}
            </p>

            {/* Step Indicators */}
            <div className="flex items-center mb-8">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        i < currentStep
                          ? 'bg-emerald-500 text-white'
                          : i === currentStep
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {i < currentStep ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground mt-1.5 hidden sm:block text-center leading-tight max-w-[70px]">
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div className="h-0.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: i < currentStep ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                {stepContent[currentStep]()}
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive mt-4"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-6">
              {currentStep > 0 && (
                <button
                  id="reg-back"
                  onClick={handleBack}
                  className="h-12 px-6 rounded-xl border border-border text-foreground font-medium text-sm flex items-center gap-2 hover:bg-secondary/60 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                id={isLastStep ? 'reg-submit' : 'reg-next'}
                onClick={isLastStep ? handleReviewSubmit : handleNext}
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : isLastStep ? (
                  <>
                    <Check className="w-4 h-4" />
                    Submit Registration
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-muted-foreground text-center mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-500 font-semibold hover:text-emerald-600 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
