import React, { useState } from 'react';
import { Search, Filter, Plus, FileText, Trash2, Eye } from 'lucide-react';
import { API } from '@/lib/legacy-api';
import OtpVerifyModal from './OtpVerifyModal';

export default function ProjectsList({ projects, loading, onAddClick, onViewClick, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [otpModal, setOtpModal] = useState({ isOpen: false, projectId: null, projectName: '' });

  const token = localStorage.getItem('reon_admin_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const handleDeleteRequest = async (id, name, e) => {
    e.stopPropagation();
    try {
      // Trigger OTP sending
      const res = await fetch(`${API}/api/auth/send-otp`, { method: 'POST', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');
      
      // Open OTP modal
      setOtpModal({ isOpen: true, projectId: id, projectName: name });
    } catch (err) {
      alert(err.message || 'Failed to request OTP');
    }
  };

  const executeDelete = async () => {
    try {
      const res = await fetch(`${API}/api/projects/${otpModal.projectId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setOtpModal({ isOpen: false, projectId: null, projectName: '' });
        onDelete();
      } else {
        alert('Failed to delete project');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = searchTerm === '' || 
      p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contact.includes(searchTerm);
      
    // Simple filter logic based on scheme type for now
    const matchesFilter = statusFilter === 'all' || p.scheme_type.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getWarrantyStatus = (endDate) => {
    if (!endDate) return { label: 'Unknown', color: 'bg-gray-100 text-gray-600' };
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
    if (diffDays < 90) return { label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-navy">Solar Projects</h2>
          <p className="text-sm text-gray-400">{filteredProjects.length} projects found</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none w-full sm:w-48 transition-all" 
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl appearance-none bg-white focus:border-emerald focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="subsidy">Subsidy</option>
              <option value="non-subsidy">Non-Subsidy</option>
            </select>
          </div>

          <button 
            onClick={onAddClick}
            className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> 
            <span className="hidden sm:inline">Add Project</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
              <th className="text-left py-4 px-5">Customer Info</th>
              <th className="text-left py-4 px-4 hidden sm:table-cell">System</th>
              <th className="text-left py-4 px-4 hidden lg:table-cell">Scheme</th>
              <th className="text-left py-4 px-4 hidden md:table-cell">Installation</th>
              <th className="text-left py-4 px-4">Warranty</th>
              <th className="text-right py-4 px-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-12">
                  <div className="w-8 h-8 border-3 border-emerald/30 border-t-emerald rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-400 mt-2">Loading projects...</p>
                </td>
              </tr>
            ) : filteredProjects.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No projects found</p>
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => {
                const wStatus = getWarrantyStatus(p.warranty_end_date);
                return (
                  <tr key={p.id} onClick={() => onViewClick(p.id)} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                    <td className="py-4 px-5">
                      <p className="font-bold text-navy">{p.customer_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.contact}</p>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <p className="font-semibold text-navy">{p.capacity_kw} kW</p>
                      <p className="text-xs text-gray-500">{p.system_type}</p>
                    </td>
                    <td className="py-4 px-4 hidden lg:table-cell">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        p.scheme_type === 'Subsidy' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {p.scheme_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <p className="text-sm text-navy">{formatDate(p.installation_date)}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${wStatus.color}`}>
                        {wStatus.label}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onViewClick(p.id); }}
                          className="p-1.5 text-gray-400 hover:text-emerald hover:bg-emerald/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteRequest(p.id, p.customer_name, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <OtpVerifyModal 
        isOpen={otpModal.isOpen} 
        onClose={() => setOtpModal({ isOpen: false, projectId: null, projectName: '' })}
        onVerified={executeDelete}
        actionText="deletion of project"
        itemRef={otpModal.projectName}
      />
    </div>
  );
}
