import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { API } from '@/lib/legacy-api';

export default function OtpVerifyModal({ isOpen, onClose, onVerified, actionText, itemRef }) {
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('reon_admin_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (otpInput.length !== 6) {
      setError('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const verifyRes = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', 
        headers, 
        body: JSON.stringify({ otp: otpInput })
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Invalid OTP');
      }
      
      // Verification successful
      setOtpInput('');
      onVerified();
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-navy flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" /> Verify Action
          </h3>
          <button onClick={() => { setOtpInput(''); setError(''); onClose(); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4 text-center">
            An OTP has been sent to <b>support@reonenergy.in</b>. Please enter it below to confirm {actionText} 
            {itemRef && <span className="font-bold text-navy"> {itemRef}</span>}.
          </p>
          <input
            type="text"
            maxLength={6}
            value={otpInput}
            onChange={(e) => {
              setOtpInput(e.target.value.replace(/[^0-9]/g, ''));
              setError('');
            }}
            placeholder="Enter 6-digit OTP"
            className="w-full text-center text-xl tracking-widest font-bold py-3 border border-gray-200 rounded-xl focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none mb-4"
          />
          {error && <p className="text-xs text-red-500 font-medium text-center mb-4">{error}</p>}
          <div className="flex gap-3">
            <button 
              onClick={() => { setOtpInput(''); setError(''); onClose(); }} 
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleVerify} 
              disabled={loading} 
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald hover:bg-emerald-600 rounded-xl transition-colors disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
