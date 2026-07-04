import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, User, MapPin, Phone, Mail, Building2, Calendar, ShieldCheck, Wrench, IndianRupee, Clock, CheckCircle2, Plus, AlertCircle, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { API } from '@/lib/legacy-api';
import ServiceModal from './ServiceModal';
import OtpVerifyModal from './OtpVerifyModal';

export default function ProjectDetail({ projectId, onBack, onEdit, onDeleted }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [otpModal, setOtpModal] = useState({ isOpen: false, action: null }); // action: 'edit' or 'delete'
  const printRef = useRef();

  const token = localStorage.getItem('reon_admin_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchProjectDetails = async () => {
    try {
      const res = await fetch(`${API}/api/projects/${projectId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleExportPDF = () => {
    setIsExporting(true);
    const element = printRef.current;
    
    // Temporarily hide elements not needed in PDF
    const excludeElements = element.querySelectorAll('.no-print');
    excludeElements.forEach(el => el.style.display = 'none');
    
    const opt = {
      margin:       10,
      filename:     `${project.customer_name.replace(/\s+/g, '_')}_Project_Summary.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      excludeElements.forEach(el => el.style.display = '');
      setIsExporting(false);
    });
  };

  const handleActionRequest = async (action) => {
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, { method: 'POST', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');
      
      setOtpModal({ isOpen: true, action });
    } catch (err) {
      alert(err.message || 'Failed to request OTP');
    }
  };

  const executeAction = async () => {
    const { action } = otpModal;
    setOtpModal({ isOpen: false, action: null });
    
    if (action === 'edit') {
      onEdit(project);
    } else if (action === 'delete') {
      try {
        const res = await fetch(`${API}/api/projects/${projectId}`, { method: 'DELETE', headers });
        if (res.ok) {
          onDeleted();
        } else {
          alert('Failed to delete project');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-emerald/30 border-t-emerald rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm font-medium mt-3">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-gray-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>Project not found.</p>
        <button onClick={onBack} className="text-emerald font-semibold mt-4">Go Back</button>
      </div>
    );
  }

  const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // Warranty calculation
  const instDate = new Date(project.installation_date);
  const endDate = new Date(project.warranty_end_date);
  const now = new Date();
  
  const totalDays = Math.ceil((endDate - instDate) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((now - instDate) / (1000 * 60 * 60 * 24));
  let remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  
  // Cap at 0 and max days
  remainingDays = Math.max(0, remainingDays);
  const percentRemaining = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
  
  let warrantyColor = 'text-emerald-600';
  let warrantyBg = 'bg-emerald-500';
  if (remainingDays === 0) {
    warrantyColor = 'text-red-500';
    warrantyBg = 'bg-red-500';
  } else if (remainingDays < 90) {
    warrantyColor = 'text-yellow-600';
    warrantyBg = 'bg-yellow-500';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex items-center justify-between no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-navy font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleActionRequest('edit')}
            className="flex items-center gap-2 bg-emerald/10 text-emerald text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald/20 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button 
            onClick={() => handleActionRequest('delete')}
            className="flex items-center gap-2 bg-red-50 text-red-500 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-70"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Main Content Grid (Printable Area) */}
      <div className="bg-white" ref={printRef}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-1">
        
        {/* Left Column (Info) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer & Overview Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-navy">{project.customer_name}</h1>
                <p className="text-emerald font-semibold flex items-center gap-1.5 mt-1">
                  <Building2 className="w-4 h-4" /> {project.capacity_kw} kW {project.system_type} System
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${project.scheme_type === 'Subsidy' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {project.scheme_type}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{project.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">{project.contact}</span>
                </div>
                {project.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">{project.email}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-bold">Installation Date</p>
                    <p className="text-navy font-semibold">{formatDate(project.installation_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-bold">Installation Team</p>
                    <p className="text-navy font-semibold">{project.installation_team || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-navy flex items-center gap-2 mb-5">
              <Wrench className="w-5 h-5 text-emerald" /> System Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold mb-1">Panels</p>
                <p className="text-sm font-bold text-navy break-words">{project.panel_brand || '—'}</p>
                <p className="text-xs text-gray-600">{project.panel_quantity}x {project.panel_wattage}W</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold mb-1">Inverter</p>
                <p className="text-sm font-bold text-navy break-words">{project.inverter_brand || '—'}</p>
                <p className="text-xs text-gray-600">{project.inverter_capacity} kW</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold mb-1">Battery</p>
                <p className="text-sm font-bold text-navy break-words">{project.battery_brand || 'N/A'}</p>
                <p className="text-xs text-gray-600">{project.battery_capacity ? `${project.battery_capacity} Ah` : '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold mb-1">Structure</p>
                <p className="text-sm font-bold text-navy break-words">{project.structure_type || '—'}</p>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-navy flex items-center gap-2 mb-5">
              <IndianRupee className="w-5 h-5 text-emerald" /> Financial Overview
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 font-bold mb-1">Total Cost</p>
                <p className="text-xl font-bold text-navy">{formatCurrency(project.total_cost)}</p>
              </div>
              <div className="text-xl font-bold text-gray-400">-</div>
              <div>
                <p className="text-xs text-gray-500 font-bold mb-1">Subsidy Amount</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(project.subsidy_amount)}</p>
              </div>
              <div className="text-xl font-bold text-gray-300">=</div>
              <div className="bg-emerald/10 px-4 py-2 rounded-xl">
                <p className="text-xs text-emerald-700 font-bold uppercase mb-1">Net Cost</p>
                <p className="text-2xl font-bold text-emerald">{formatCurrency(project.net_cost)}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Warranty & Services) */}
        <div className="space-y-6">
          
          {/* Warranty Tracker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldCheck className="w-32 h-32" />
            </div>
            <h3 className="font-semibold text-navy flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald" /> Warranty Status
            </h3>
            
            <div className="mb-4">
              <div className="flex items-end justify-between mb-2">
                <p className={`text-3xl font-display font-bold ${warrantyColor}`}>{remainingDays}</p>
                <p className="text-sm font-medium text-gray-500 mb-1">days remaining</p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${warrantyBg}`} 
                  style={{ width: `${percentRemaining}%` }} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="font-semibold">Start</p>
                <p>{formatDate(project.installation_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">End</p>
                <p className="font-bold text-navy">{formatDate(project.warranty_end_date)}</p>
              </div>
            </div>
          </div>

          {/* Service History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-navy flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald" /> Service Timeline
              </h3>
              <button 
                onClick={() => { setEditingService(null); setShowServiceModal(true); }}
                className="no-print p-1.5 bg-emerald/10 text-emerald hover:bg-emerald/20 rounded-lg transition-colors"
                title="Add Service Record"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {project.services && project.services.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  {project.services.map((svc, idx) => (
                    <div key={svc.id} className="relative flex items-start gap-4">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-emerald z-10 mt-1">
                        {svc.status === 'Closed' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-3 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => { setEditingService(svc); setShowServiceModal(true); }}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-navy">{formatDate(svc.service_date)}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${svc.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {svc.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-1">{svc.issue_description}</p>
                        <p className="text-xs text-gray-500 mb-2">{svc.action_taken}</p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                          <span>Tech: {svc.technician_name}</span>
                          {svc.next_service_date && <span>Next: {formatDate(svc.next_service_date)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                  <Wrench className="w-8 h-8 mb-2 opacity-20" />
                  <p>No service records yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      </div>

      {showServiceModal && (
        <ServiceModal 
          projectId={projectId} 
          serviceData={editingService}
          onClose={() => setShowServiceModal(false)}
          onSuccess={() => {
            setShowServiceModal(false);
            fetchProjectDetails();
          }}
        />
      )}

      <OtpVerifyModal 
        isOpen={otpModal.isOpen} 
        onClose={() => setOtpModal({ isOpen: false, action: null })}
        onVerified={executeAction}
        actionText={otpModal.action === 'edit' ? 'editing project' : 'deletion of project'}
        itemRef={project.customer_name}
      />
    </div>
  );
}
