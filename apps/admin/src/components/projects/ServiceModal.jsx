import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { API } from '@/lib/legacy-api';

export default function ServiceModal({ projectId, serviceData, onClose, onSuccess }) {
  const isNew = !serviceData;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(serviceData || {
    service_date: new Date().toISOString().split('T')[0],
    issue_description: '',
    action_taken: '',
    technician_name: '',
    next_service_date: '',
    status: 'Open'
  });

  const token = localStorage.getItem('reon_admin_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...formData };
    if (!payload.next_service_date) delete payload.next_service_date; // Handle empty date

    const url = isNew 
      ? `${API}/api/projects/${projectId}/services`
      : `${API}/api/projects/services/${serviceData.id}`;
      
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to save service record.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this service record?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/projects/services/${serviceData.id}`, {
        method: 'DELETE',
        headers
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to delete.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
          <h3 className="text-lg font-display font-bold text-navy">
            {isNew ? 'Add Service Record' : 'Edit Service Record'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date of Service *</label>
                <input required type="date" name="service_date" value={formData.service_date ? formData.service_date.split('T')[0] : ''} onChange={handleChange} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status *</label>
                <select name="status" value={formData.status} onChange={handleChange} className="input-field text-sm bg-white">
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Issue Reported *</label>
              <textarea required name="issue_description" value={formData.issue_description} onChange={handleChange} rows="2" className="input-field text-sm resize-none" placeholder="e.g. Inverter showing fault code 402" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Action Taken *</label>
              <textarea required name="action_taken" value={formData.action_taken} onChange={handleChange} rows="2" className="input-field text-sm resize-none" placeholder="e.g. Reset inverter and updated firmware" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Technician Name *</label>
                <input required name="technician_name" value={formData.technician_name} onChange={handleChange} className="input-field text-sm" placeholder="e.g. John Smith" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Next Service Due (Optional)</label>
                <input type="date" name="next_service_date" value={formData.next_service_date ? formData.next_service_date.split('T')[0] : ''} onChange={handleChange} className="input-field text-sm" />
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50 mt-auto">
            {!isNew ? (
              <button type="button" onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Record">
                <Trash2 className="w-5 h-5" />
              </button>
            ) : <div></div>}
            
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
