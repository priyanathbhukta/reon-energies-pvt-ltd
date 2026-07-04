'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Zap,
  Home,
  IndianRupee,
  FileText,
  Loader2,
  Save,
  Navigation,
} from 'lucide-react';
import api from '@/lib/api';

interface InputFieldProps {
  label: string;
  icon: any;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  maxLength?: number;
  required?: boolean;
}

const InputField = ({
  label, icon: Icon, type = 'text', value, onChange, placeholder, maxLength, required,
}: InputFieldProps) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full h-11 rounded-xl bg-secondary/50 border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
      />
    </div>
  </div>
);

const STATE_DISTRICT_MAP: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Kakinada', 'Anantapur', 'Kadapa', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Ziro', 'Pasighat', 'Bomdila', 'Tezu'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Nagaon', 'Tezpur', 'Tinsukia', 'Bongaigaon'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Ara', 'Begusarai', 'Katihar', 'Munger'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
  'Goa': ['North Goa', 'South Goa', 'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Chamba', 'Hamirpur', 'Una'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Dumka'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Davanagere', 'Bellary', 'Shivamogga', 'Tumakuru', 'Udupi'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Kannur', 'Kottayam', 'Kasaragod', 'Idukki', 'Pathanamthitta', 'Wayanad', 'Malappuram'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Navi Mumbai', 'Kolhapur'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal', 'Senapati', 'Ukhrul'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Baghmara'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Berhampur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Pathankot', 'Moga'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Bikaner', 'Ajmer', 'Bhilsara', 'Alwar', 'Sikar', 'Sri Ganganagar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Geyzing', 'Mangan'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Tirunelveli'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar'],
  'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailasahar', 'Belonia'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Haldwani', 'Rudrapur', 'Roorkee', 'Kashipur', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Hooghly', 'Darjeeling', 'Siliguri', 'Asansol', 'Durgapur', 'Kharagpur', 'Malda', 'Baharampur', 'Jalpaiguri', 'Kalyani'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Samba'],
  'Ladakh': ['Leh', 'Kargil'],
  'Andaman & Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Daman', 'Diu', 'Silvassa'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    mobile: '',
    email: '',
    address: '',
    state: '',
    district: '',
    pincode: '',
    electricityBillAmount: '',
    roofType: '',
    propertyType: '',
    estimatedKw: '',
    priority: 'medium',
    notes: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) { setError('Customer name is required'); return; }
    if (formData.mobile.length !== 10) { setError('Valid 10-digit mobile number is required'); return; }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/leads', {
        customerName: formData.customerName,
        mobile: formData.mobile,
        email: formData.email,
        address: formData.address,
        state: formData.state,
        district: formData.district,
        pincode: formData.pincode,
        electricityBillAmount: formData.electricityBillAmount ? parseFloat(formData.electricityBillAmount) : null,
        estimatedKw: formData.estimatedKw ? parseFloat(formData.estimatedKw) : null,
        roofType: formData.roofType || null,
        propertyType: formData.propertyType || null,
        priority: formData.priority,
        notes: formData.notes,
      });
      router.push('/dashboard/leads');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('Location:', pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error('Location error:', err)
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/leads"
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Add New Lead</h1>
          <p className="text-sm text-muted-foreground">Enter customer details to create a new solar lead</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        {/* Customer Info */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-500" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Customer Name" icon={User} value={formData.customerName} onChange={(val) => updateField('customerName', val)} placeholder="Full name" required />
            <InputField label="Mobile Number" icon={Phone} type="tel" value={formData.mobile} onChange={(val) => updateField('mobile', val)} placeholder="10-digit number" maxLength={10} required />
            <InputField label="Email" icon={Mail} type="email" value={formData.email} onChange={(val) => updateField('email', val)} placeholder="customer@email.com" />
          </div>
        </div>

        <hr className="border-border" />

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Location Details
            </h3>
            <button
              onClick={handleGetLocation}
              className="text-xs font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              Capture GPS
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <InputField label="Address" icon={MapPin} value={formData.address} onChange={(val) => updateField('address', val)} placeholder="Full address" />
            </div>
            {/* State Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                State
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={formData.state}
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    updateField('state', selectedState);
                    updateField('district', ''); // Reset district when state changes
                  }}
                  className="w-full h-11 rounded-xl bg-secondary/50 border border-border pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="">Select State</option>
                  {Object.keys(STATE_DISTRICT_MAP).sort().map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* District Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                District
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={formData.district}
                  onChange={(e) => updateField('district', e.target.value)}
                  disabled={!formData.state}
                  className="w-full h-11 rounded-xl bg-secondary/50 border border-border pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select District</option>
                  {formData.state &&
                    (STATE_DISTRICT_MAP[formData.state] || []).sort().map((districtName) => (
                      <option key={districtName} value={districtName}>
                        {districtName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <InputField label="Pincode" icon={MapPin} value={formData.pincode} onChange={(val) => updateField('pincode', val)} placeholder="700001" maxLength={6} />
          </div>
        </div>

        <hr className="border-border" />

        {/* Solar Details */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            Solar Requirements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Monthly Electricity Bill" icon={IndianRupee} type="number" value={formData.electricityBillAmount} onChange={(val) => updateField('electricityBillAmount', val)} placeholder="e.g. 5000" />
            <InputField label="Estimated kW Requirement" icon={Zap} type="number" value={formData.estimatedKw} onChange={(val) => updateField('estimatedKw', val)} placeholder="e.g. 5" />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Roof Type</label>
              <select
                value={formData.roofType}
                onChange={(e) => updateField('roofType', e.target.value)}
                className="w-full h-11 rounded-xl bg-secondary/50 border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="">Select roof type</option>
                <option value="flat">Flat / RCC</option>
                <option value="sloped">Sloped</option>
                <option value="metal_sheet">Metal Sheet</option>
                <option value="rcc">RCC Slab</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Property Type</label>
              <select
                value={formData.propertyType}
                onChange={(e) => updateField('propertyType', e.target.value)}
                className="w-full h-11 rounded-xl bg-secondary/50 border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="">Select property type</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="institutional">Institutional</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Priority & Notes */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Additional Details
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <div className="flex items-center gap-2">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    onClick={() => updateField('priority', p)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                      formData.priority === p
                        ? p === 'high'
                          ? 'bg-red-500/10 text-red-500 ring-1 ring-red-500/30'
                          : p === 'medium'
                            ? 'bg-solar-500/10 text-solar-600 dark:text-solar-400 ring-1 ring-solar-500/30'
                            : 'bg-muted text-foreground ring-1 ring-border'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                placeholder="Any additional notes about this lead..."
                className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-destructive" /> {error}
          </motion.p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/leads"
            className="h-10 px-5 rounded-xl border border-border text-foreground font-medium text-sm flex items-center hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm flex items-center gap-2 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Lead
          </button>
        </div>
      </div>
    </motion.div>
  );
}
