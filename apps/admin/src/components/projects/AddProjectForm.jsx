import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building2, User, Wrench, IndianRupee } from 'lucide-react';
import { API } from '@/lib/legacy-api';

export default function AddProjectForm({ onCancel, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    customer_name: '',
    address: '',
    contact: '',
    email: '',
    installation_date: new Date().toISOString().split('T')[0],
    capacity_kw: '',
    system_type: 'On-Grid',
    scheme_type: 'Subsidy',
    panel_brand: '',
    panel_wattage: '',
    panel_quantity: '',
    inverter_brand: '',
    inverter_capacity: '',
    battery_brand: '',
    battery_capacity: '',
    structure_type: 'Galvanized Iron (GI)',
    installation_team: '',
    total_cost: '',
    subsidy_amount: '',
    net_cost: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        installation_date: initialData.installation_date ? new Date(initialData.installation_date).toISOString().split('T')[0] : '',
      });
    }
  }, [initialData]);

  const token = localStorage.getItem('reon_admin_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate Net Cost
      if (name === 'total_cost' || name === 'subsidy_amount') {
        const total = parseFloat(updated.total_cost || 0);
        const subsidy = parseFloat(updated.subsidy_amount || 0);
        updated.net_cost = Math.max(0, total - subsidy).toString();
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Calculate Warranty End Date (Installation Date + 5 years)
    const instDate = new Date(formData.installation_date);
    const warrantyDate = new Date(instDate);
    warrantyDate.setFullYear(instDate.getFullYear() + 5);
    
    const payload = {
      ...formData,
      capacity_kw: parseFloat(formData.capacity_kw) || 0,
      panel_wattage: parseInt(formData.panel_wattage) || 0,
      panel_quantity: parseInt(formData.panel_quantity) || 0,
      inverter_capacity: parseFloat(formData.inverter_capacity) || 0,
      battery_capacity: parseFloat(formData.battery_capacity) || 0,
      total_cost: parseFloat(formData.total_cost) || 0,
      subsidy_amount: parseFloat(formData.subsidy_amount) || 0,
      net_cost: parseFloat(formData.net_cost) || 0,
      warranty_end_date: warrantyDate.toISOString().split('T')[0]
    };

    try {
      const url = isEditMode ? `${API}/api/projects/${initialData.id}` : `${API}/api/projects`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to save project. Please check the inputs.');
      }
    } catch (err) {
      console.error('Error adding project:', err);
      alert('An error occurred while saving the project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-navy hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-display font-bold text-navy">{isEditMode ? 'Edit Project' : 'Add New Project'}</h2>
            <p className="text-xs text-gray-500 font-medium">Warranty will be auto-calculated to 5 years from installation.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Customer Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="w-5 h-5 text-emerald" />
              <h3 className="font-semibold text-navy">Customer Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Customer Name *</label>
                <input required name="customer_name" value={formData.customer_name} onChange={handleChange} className="input-field text-sm" placeholder="John Doe" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Installation Address *</label>
                <textarea required name="address" value={formData.address} onChange={handleChange} rows="2" className="input-field text-sm resize-none" placeholder="123 Solar Street, City" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Contact Number *</label>
                <input required name="contact" value={formData.contact} onChange={handleChange} className="input-field text-sm" placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field text-sm" placeholder="john@example.com" />
              </div>
            </div>
          </div>

          {/* System Overview */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Building2 className="w-5 h-5 text-emerald" />
              <h3 className="font-semibold text-navy">System Overview</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Installation Date *</label>
                <input required type="date" name="installation_date" value={formData.installation_date} onChange={handleChange} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Capacity (kW) *</label>
                <input required type="number" step="0.1" name="capacity_kw" value={formData.capacity_kw} onChange={handleChange} className="input-field text-sm" placeholder="e.g. 5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">System Type *</label>
                <select name="system_type" value={formData.system_type} onChange={handleChange} className="input-field text-sm bg-white">
                  <option value="On-Grid">On-Grid</option>
                  <option value="Off-Grid">Off-Grid</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Scheme Type *</label>
                <select name="scheme_type" value={formData.scheme_type} onChange={handleChange} className="input-field text-sm bg-white">
                  <option value="Subsidy">Subsidy</option>
                  <option value="Non-Subsidy">Non-Subsidy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Equipment Details */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Wrench className="w-5 h-5 text-emerald" />
              <h3 className="font-semibold text-navy">Equipment Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-navy">Solar Panels</h4>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Brand</label>
                  <input name="panel_brand" value={formData.panel_brand} onChange={handleChange} className="input-field text-sm bg-white" placeholder="e.g. Waaree" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Wattage (W)</label>
                    <input type="number" name="panel_wattage" value={formData.panel_wattage} onChange={handleChange} className="input-field text-sm bg-white" placeholder="540" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Quantity</label>
                    <input type="number" name="panel_quantity" value={formData.panel_quantity} onChange={handleChange} className="input-field text-sm bg-white" placeholder="10" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-navy">Inverter</h4>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Brand</label>
                  <input name="inverter_brand" value={formData.inverter_brand} onChange={handleChange} className="input-field text-sm bg-white" placeholder="e.g. Growatt" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Capacity (kW)</label>
                  <input type="number" step="0.1" name="inverter_capacity" value={formData.inverter_capacity} onChange={handleChange} className="input-field text-sm bg-white" placeholder="5" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-semibold text-navy">Battery (Optional)</h4>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Brand</label>
                  <input name="battery_brand" value={formData.battery_brand} onChange={handleChange} className="input-field text-sm bg-white" placeholder="e.g. Luminous" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Capacity (Ah)</label>
                  <input type="number" name="battery_capacity" value={formData.battery_capacity} onChange={handleChange} className="input-field text-sm bg-white" placeholder="150" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Structure Type</label>
                  <input name="structure_type" value={formData.structure_type} onChange={handleChange} className="input-field text-sm" placeholder="e.g. High Rise GI" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Installation Team</label>
                  <input name="installation_team" value={formData.installation_team} onChange={handleChange} className="input-field text-sm" placeholder="e.g. Team Alpha" />
                </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <IndianRupee className="w-5 h-5 text-emerald" />
              <h3 className="font-semibold text-navy">Financials</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Total Project Cost (₹)</label>
                <input type="number" name="total_cost" value={formData.total_cost} onChange={handleChange} className="input-field text-sm" placeholder="250000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Subsidy Amount (₹)</label>
                <input type="number" name="subsidy_amount" value={formData.subsidy_amount} onChange={handleChange} className="input-field text-sm" placeholder="78000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald mb-1.5 uppercase tracking-wide">Net Cost to Customer (₹)</label>
                <input type="number" name="net_cost" value={formData.net_cost} readOnly className="input-field text-sm bg-emerald/5 border-emerald/20 font-bold text-navy" />
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
