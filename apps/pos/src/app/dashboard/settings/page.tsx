'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { User, Store, Shield, MapPin, Loader2, Save, CheckCircle2, FileText, Upload, Landmark, IdCard, FileCheck, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SettingsPage() {
  const { user, partner, checkAuth, logout } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPwd: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '', email: '', mobile: '',
    shopName: '', gstNumber: '', address: '', district: '', state: '', pincode: '',
    panNumber: '', aadhaarNumber: '',
    accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', branchName: ''
  });

  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (user || partner) {
      setFormData(prev => ({
        ...prev,
        fullName: user?.fullName || '',
        email: user?.email || '',
        mobile: user?.mobile || '',
        shopName: partner?.shopName || ''
      }));
      fetchFullProfile();
    }
  }, [user, partner]);

  const fetchFullProfile = async () => {
    try {
      const res = await api.get('/pos/profile');
      if (res.data.partner) {
        setFormData(prev => ({
          ...prev,
          shopName: res.data.partner.shop_name || prev.shopName,
          gstNumber: res.data.partner.gst_number || '',
          address: res.data.partner.address || '',
          district: res.data.partner.district || '',
          state: res.data.partner.state || '',
          pincode: res.data.partner.pincode || '',
          panNumber: res.data.partner.pan_number || '',
          aadhaarNumber: res.data.partner.aadhaar_number || '',
        }));

        if (res.data.partner.bankDetails) {
          setFormData(prev => ({
            ...prev,
            accountHolderName: res.data.partner.bankDetails.account_holder_name || '',
            accountNumber: res.data.partner.bankDetails.account_number || '',
            ifscCode: res.data.partner.bankDetails.ifsc_code || '',
            bankName: res.data.partner.bankDetails.bank_name || '',
            branchName: res.data.partner.bankDetails.branch_name || ''
          }));
        }

        if (res.data.partner.documents) {
          setDocuments(res.data.partner.documents);
        }
      }
    } catch (err) {
      console.error('Failed to fetch full profile:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let requestedData = {};
      let ticketType = '';

      if (activeTab === 'personal' || activeTab === 'business') {
        ticketType = 'profile_update';
        requestedData = {
          fullName: formData.fullName,
          email: formData.email,
          shopName: formData.shopName,
          gstNumber: formData.gstNumber,
          address: formData.address,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode
        };
      } else if (activeTab === 'documents') {
        ticketType = 'bank_kyc_update';
        requestedData = {
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          bankName: formData.bankName,
          branchName: formData.branchName,
          panNumber: formData.panNumber,
          aadhaarNumber: formData.aadhaarNumber
        };
      }
      
      await api.post('/pos/tickets', {
        ticketType,
        requestedData
      });
      
      toast.success('Update request submitted! An admin will review it shortly.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) { toast.error('Current password is required'); return; }
    if (passwordForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwordForm.newPassword)) {
      toast.error('Password must contain uppercase, lowercase, and a number'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/pos-change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully! Please log in again.');
      setTimeout(() => { logout(); router.push('/login'); }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('document', file);
    fd.append('documentType', docType);

    const loadId = toast.loading(`Uploading ${docType.toUpperCase()} document...`);
    try {
      await api.post('/pos/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully', { id: loadId });
      fetchFullProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload document', { id: loadId });
    }
  };

  const getDocStatus = (type: string) => documents.find(d => d.document_type === type);

  const tabs = [
    { id: 'personal', label: 'Personal Details', icon: User },
    { id: 'business', label: 'Business Details', icon: Store },
    { id: 'documents', label: 'Documents & Bank', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information, business details, and secure documents.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-transparent'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-sm"
        >
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground font-display">Personal Details</h2>
                <p className="text-sm text-muted-foreground">Update your basic profile information.</p>
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-3xl font-bold text-emerald-600 border border-emerald-500/20">
                  {formData.fullName.charAt(0) || 'U'}
                </div>
                <div>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors">
                    Change Avatar
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <input name="mobile" disabled value={formData.mobile} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground font-display">Business Details</h2>
                <p className="text-sm text-muted-foreground">Manage your shop location and registration details.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Shop / Business Name</label>
                  <input name="shopName" value={formData.shopName} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">GST Number (Optional)</label>
                  <input name="gstNumber" value={formData.gstNumber} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                
                <div className="pt-4 pb-2 md:col-span-2 border-b border-border">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" /> Location Details</h3>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Full Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">State</label>
                  <input name="state" value={formData.state} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">District</label>
                  <input name="district" value={formData.district} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Pincode</label>
                  <input name="pincode" maxLength={6} value={formData.pincode} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-foreground font-display">Documents & KYC</h2>
                <p className="text-sm text-muted-foreground">Upload your PAN and Aadhaar securely. Required for payouts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PAN Document */}
                <div className="space-y-3 bg-secondary/20 p-5 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><IdCard className="w-4 h-4 text-blue-500" /> PAN Card</h3>
                    {getDocStatus('pan') && <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><FileCheck className="w-3 h-3"/> Uploaded</span>}
                  </div>
                  <input placeholder="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm uppercase" />
                  <div className="relative">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'pan')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button className="w-full flex items-center justify-center gap-2 bg-background border border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors">
                      <Upload className="w-4 h-4" /> {getDocStatus('pan') ? 'Replace PAN Document' : 'Upload PAN Document'}
                    </button>
                  </div>
                </div>

                {/* Aadhaar Document */}
                <div className="space-y-3 bg-secondary/20 p-5 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><IdCard className="w-4 h-4 text-orange-500" /> Aadhaar Card</h3>
                    {getDocStatus('aadhaar') && <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><FileCheck className="w-3 h-3"/> Uploaded</span>}
                  </div>
                  <input placeholder="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm tracking-widest" />
                  <div className="relative">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'aadhaar')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button className="w-full flex items-center justify-center gap-2 bg-background border border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors">
                      <Upload className="w-4 h-4" /> {getDocStatus('aadhaar') ? 'Replace Aadhaar Document' : 'Upload Aadhaar Document'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2"><Landmark className="w-5 h-5 text-emerald-500"/> Bank Details</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-6">Where should we send your commission payouts?</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Account Holder Name</label>
                    <input name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Account Number</label>
                    <input name="accountNumber" type="password" value={formData.accountNumber} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm font-mono tracking-wider" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">IFSC Code</label>
                    <input name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm uppercase font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Bank Name</label>
                    <input name="bankName" value={formData.bankName} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Branch Name</label>
                    <input name="branchName" value={formData.branchName} onChange={handleChange} className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                </div>

                {/* Bank Passbook Upload */}
                <div className="space-y-3 bg-secondary/20 p-5 rounded-xl border border-border max-w-md">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> Passbook / Cancelled Cheque</h3>
                    {getDocStatus('bank') && <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><FileCheck className="w-3 h-3"/> Uploaded</span>}
                  </div>
                  <div className="relative mt-2">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'bank')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button className="w-full flex items-center justify-center gap-2 bg-background border border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors">
                      <Upload className="w-4 h-4" /> {getDocStatus('bank') ? 'Replace Bank Document' : 'Upload Passbook / Cheque'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground font-display">Security Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your password and account security.</p>
              </div>

              {/* Login method badge */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Password-Based Login
                  </h3>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1 max-w-md">
                    Your account is secured with a password. Change it below if needed. After changing, you will be logged out of all devices.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-sm shrink-0">
                  Active
                </span>
              </div>

              {/* Change Password form */}
              <div className="border border-border rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-base font-semibold text-foreground">Change Password</h3>
                </div>

                {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
                  const labels = { currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm New Password' };
                  const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'newPwd' : 'confirm';
                  return (
                    <div key={field} className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground" htmlFor={`sec-${field}`}>{labels[field]}</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          id={`sec-${field}`}
                          type={showPasswords[showKey] ? 'text' : 'password'}
                          value={passwordForm[field]}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder={field === 'currentPassword' ? 'Enter current password' : field === 'newPassword' ? 'Min. 8 chars, uppercase, number' : 'Re-enter new password'}
                          className="w-full h-12 rounded-xl bg-secondary/30 border border-border pl-11 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [showKey]: !prev[showKey] }))}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPasswords[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  id="change-password-submit"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'security' && (
            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
