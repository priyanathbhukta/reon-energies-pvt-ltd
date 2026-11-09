'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') : ''
import {
    Users, UserCheck, UserPlus, TrendingUp, IndianRupee,
    LogOut, RefreshCw, Search, Trash2,
    BarChart3, Phone, Mail, MapPin,
    ArrowUpRight, ArrowDownRight, Filter,
    LayoutGrid, MessageSquare, Image, FileText,
    Plus, X, Save, Edit2, Star, Calculator, ClipboardList, FileDown,
    Briefcase, FolderOpen, Building2, ChevronDown, Building, FileCheck
} from 'lucide-react'
import QuotationForm from './QuotationForm'
import InvoiceForm from './InvoiceForm'
import ProjectsTab from './projects/ProjectsTab'
import ProformaInvoiceTab from './ProformaInvoiceTab'
import GeneratedDocumentsTab from './GeneratedDocumentsTab'

const STATUS_CONFIG = {
    new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
    contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
    converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700' },
    lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
}

const TABS = [
    { id: 'enquiries', label: 'Enquiries', icon: Users },
    { id: 'pos_partners', label: 'POS Partners', icon: UserPlus },
    { id: 'leads', label: 'POS Leads', icon: TrendingUp },
    { id: 'projects', label: 'Projects', icon: Building2 },
    { id: 'schemes', label: 'Schemes', icon: FileText },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'directors', label: 'Directors', icon: Briefcase },
    { id: 'quotation', label: 'Quotation Generator', icon: Calculator },
    { id: 'proforma_invoice', label: 'Proforma Invoice', icon: FileCheck },
    { id: 'invoice', label: 'Tax Invoice Generator', icon: FileDown },
    { id: 'documents', label: 'Generated Documents', icon: FolderOpen },
]

export default function AdminDashboard() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('enquiries')
    const [stats, setStats] = useState(null)
    const [enquiries, setEnquiries] = useState([])
    const [schemes, setSchemes] = useState([])
    const [testimonials, setTestimonials] = useState([])
    const [gallery, setGallery] = useState([])
    const [directors, setDirectors] = useState([])
    const [posPartners, setPosPartners] = useState([])
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRow, setExpandedRow] = useState(null)
    const [editModal, setEditModal] = useState(null) // { type, data, isNew }
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [editInvoiceData, setEditInvoiceData] = useState(null)
    const [editQuotationData, setEditQuotationData] = useState(null)
    const [preselectedQuotation, setPreselectedQuotation] = useState(null)
    const [enqFromDate, setEnqFromDate] = useState('')
    const [enqToDate, setEnqToDate] = useState('')
    const [enqSearchHistory, setEnqSearchHistory] = useState(() => {
        try {
            const val = localStorage.getItem('reon_search_history_enquiries');
            return val ? JSON.parse(val) : [];
        } catch (_) { return []; }
    });

    const addToEnqHistory = (term) => {
        if (!term.trim()) return;
        setEnqSearchHistory(prev => {
            const next = [term, ...prev.filter(t => t !== term)].slice(0, 5);
            localStorage.setItem('reon_search_history_enquiries', JSON.stringify(next));
            return next;
        });
    };

    const token = localStorage.getItem('reon_admin_token')
    const adminUser = JSON.parse(localStorage.getItem('reon_admin_user') || '{}')
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

    useEffect(() => {
        if (!token) { router.push('/login'); return }
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [statsRes, enquiriesRes, schemesRes, testimonialsRes, galleryRes, directorsRes, partnersRes, leadsRes] = await Promise.all([
                fetch(`${API}/api/dashboard/stats`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/enquiries`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/content/schemes`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/content/testimonials`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/content/gallery`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/content/directors`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/pos/partners?limit=250`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/leads?limit=1000`, { headers, cache: 'no-store' }),
            ])
            if (statsRes.status === 401) { localStorage.removeItem('reon_admin_token'); router.push('/login'); return }
            
            const statsData = await statsRes.json();
            setStats(statsData);

            const enquiriesData = await enquiriesRes.json();
            setEnquiries(Array.isArray(enquiriesData) ? enquiriesData : []);

            const schemesData = await schemesRes.json();
            setSchemes(Array.isArray(schemesData) ? schemesData : []);

            const testimonialsData = await testimonialsRes.json();
            setTestimonials(Array.isArray(testimonialsData) ? testimonialsData : []);

            const galleryData = await galleryRes.json();
            setGallery(Array.isArray(galleryData) ? galleryData : []);

            const directorsData = await directorsRes.json();
            setDirectors(Array.isArray(directorsData) ? directorsData : []);

            const partnersData = await partnersRes.json()
            setPosPartners(partnersData.partners || [])

            const leadsData = await leadsRes.json()
            setLeads(leadsData.leads || [])
        } catch (err) { console.error('Fetch error:', err) }
        finally { setLoading(false) }
    }

    const updateStatus = async (id, status) => {
        await fetch(`${API}/api/enquiries/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) })
        fetchAll()
    }

    const deleteEnquiry = async (id) => {
        if (!window.confirm('Delete this enquiry?')) return
        await fetch(`${API}/api/enquiries/${id}`, { method: 'DELETE', headers })
        fetchAll()
    }

    const handleLogout = () => {
        localStorage.removeItem('reon_admin_token')
        localStorage.removeItem('reon_admin_user')
        router.push('/login')
    }

    // Content CRUD helpers
    const saveContent = async (type, data, isNew) => {
        const url = isNew ? `${API}/api/content/${type}` : `${API}/api/content/${type}/${data.id}`
        const method = isNew ? 'POST' : 'PUT'
        await fetch(url, { method, headers, body: JSON.stringify(data) })
        setEditModal(null)
        fetchAll()
    }

    const deleteContent = async (type, id) => {
        if (!window.confirm('Delete this item?')) return
        await fetch(`${API}/api/content/${type}/${id}`, { method: 'DELETE', headers })
        fetchAll()
    }

    const filtered = enquiries.filter(e => {
        const matchesFilter = filter === 'all' || e.status === filter
        const matchesSearch = searchTerm === '' ||
            e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.phone.includes(searchTerm) ||
            (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))

        // Date range filter
        if (enqFromDate || enqToDate) {
            const recordTime = new Date(e.created_at).getTime();
            if (enqFromDate) {
                const start = new Date(enqFromDate).setHours(0, 0, 0, 0);
                if (recordTime < start) return false;
            }
            if (enqToDate) {
                const end = new Date(enqToDate).setHours(23, 59, 59, 999);
                if (recordTime > end) return false;
            }
        }
        return matchesFilter && matchesSearch
    })

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-emerald/30 border-t-emerald rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm font-medium">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    const statCards = [
        { icon: Users, label: 'Total Leads', value: stats?.totalLeads || 0, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
        { icon: UserPlus, label: 'Potential', value: stats?.potentialCustomers || 0, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
        { icon: UserCheck, label: 'Converted', value: stats?.converted || 0, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        { icon: IndianRupee, label: 'Revenue', value: formatCurrency(stats?.estimatedRevenue), iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
        { icon: TrendingUp, label: 'Growth', value: `${stats?.growthPercentage || 0}%`, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', isGrowth: true },
    ]

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm p-1 bg-white">
                            <img src="/admin-logo.jpg" alt="REON Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-base font-display font-bold text-navy leading-tight">REON Admin</h1>
                            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Dashboard</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 lg:hidden">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-emerald text-white shadow-sm'
                                    : 'text-gray-600 hover:text-navy hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon className={`w-4.5 h-4.5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                                {tab.label}
                            </div>
                            {(tab.id !== 'quotation' && tab.id !== 'invoice' && tab.id !== 'documents') && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {tab.id === 'enquiries' ? enquiries.length : tab.id === 'pos_partners' ? posPartners.length : tab.id === 'leads' ? leads.length : tab.id === 'schemes' ? schemes.length : tab.id === 'testimonials' ? testimonials.length : tab.id === 'directors' ? directors.length : gallery.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                                <span className="text-sm font-bold text-navy">{adminUser.username?.[0]?.toUpperCase()}</span>
                            </div>
                            <div className="truncate w-24">
                                <p className="text-xs font-semibold text-navy truncate">{adminUser.username}</p>
                                <p className="text-[10px] text-emerald font-medium">Administrator</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 py-2.5 rounded-xl transition-colors">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
                {/* Header */}
                <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-lg lg:hidden">
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-display font-bold text-navy capitalize">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h2>
                    </div>
                    <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-emerald hover:bg-emerald/5 rounded-lg transition-colors border border-gray-100 shadow-sm" title="Refresh Data">
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {/* Stats Cards */}
                    {activeTab === 'enquiries' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                            {statCards.map((card) => (
                                <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                                            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                                        </div>
                                        {card.isGrowth && (
                                            <span className={`flex items-center gap-0.5 text-xs font-bold ${(stats?.growthPercentage || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {(stats?.growthPercentage || 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold text-navy">{card.value}</p>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">{card.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab Content */}
                    <div className="w-full max-w-[1440px] mx-auto">
                        {activeTab === 'enquiries' && <EnquiriesTab {...{ filtered, filter, setFilter, searchTerm, setSearchTerm, expandedRow, setExpandedRow, updateStatus, deleteEnquiry, formatDate, formatCurrency, enqFromDate, setEnqFromDate, enqToDate, setEnqToDate, enqSearchHistory, setEnqSearchHistory, addToEnqHistory }} />}
                        {activeTab === 'pos_partners' && <PosPartnersTab partners={posPartners} onRefresh={fetchAll} headers={headers} formatDate={formatDate} />}
                        {activeTab === 'leads' && (
                            <LeadsTab
                                leads={leads}
                                posPartners={posPartners}
                                onRefresh={fetchAll}
                                headers={headers}
                                formatDate={formatDate}
                                onSelectQuotationForInvoice={(quote) => {
                                    setPreselectedQuotation(quote);
                                    setActiveTab('invoice');
                                }}
                            />
                        )}
                        {activeTab === 'projects' && <ProjectsTab />}
                        {activeTab === 'schemes' && <SchemesTab schemes={schemes} onEdit={(s) => setEditModal({ type: 'schemes', data: s, isNew: false })} onAdd={() => setEditModal({ type: 'schemes', data: { icon: '☀️', badge: '', name: '', tagline: '', eligibility: [''], subsidy_breakdown: [{ label: '', value: '' }], reon_help: [''], total_subsidy: '', accent: 'from-emerald-700 to-emerald-600', featured: false, sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('schemes', id)} />}
                        {activeTab === 'testimonials' && <TestimonialsTab testimonials={testimonials} onEdit={(t) => setEditModal({ type: 'testimonials', data: t, isNew: false })} onAdd={() => setEditModal({ type: 'testimonials', data: { name: '', role: '', rating: 5, review: '', avatar_initials: '', avatar_color: 'bg-emerald', date_label: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('testimonials', id)} />}
                        {activeTab === 'gallery' && <GalleryTab gallery={gallery} onEdit={(g) => setEditModal({ type: 'gallery', data: g, isNew: false })} onAdd={() => setEditModal({ type: 'gallery', data: { image_url: '', alt_text: '', label: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('gallery', id)} />}
                        {activeTab === 'directors' && <DirectorsTab directors={directors} onEdit={(d) => setEditModal({ type: 'directors', data: d, isNew: false })} onAdd={() => setEditModal({ type: 'directors', data: { name: '', role: '', description: '', image_url: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('directors', id)} />}
                        {activeTab === 'quotation' && <QuotationTab editData={editQuotationData} onClearEdit={() => setEditQuotationData(null)} />}
                        {activeTab === 'proforma_invoice' && <ProformaInvoiceTab onNavigateToInvoice={() => setActiveTab('invoice')} />}
                        {activeTab === 'invoice' && <InvoiceTab editData={editInvoiceData} onClearEdit={() => setEditInvoiceData(null)} preselectedQuotation={preselectedQuotation} />}
                        {activeTab === 'documents' && <GeneratedDocumentsTab onEditInvoice={(data) => { setEditInvoiceData(data); setActiveTab('invoice'); }} onEditQuotation={(data) => { setEditQuotationData(data); setActiveTab('quotation'); }} />}
                    </div>
                </main>
            </div>

            {/* Edit Modal */}
            {editModal && (
                <EditModal
                    modal={editModal}
                    onClose={() => setEditModal(null)}
                    onSave={(data) => saveContent(editModal.type, data, editModal.isNew)}
                />
            )}
        </div>
    )
}

// ========== POS PARTNERS TAB ==========
function PosPartnersTab({ partners, onRefresh, headers, formatDate }) {
    const [selectedPartnerId, setSelectedPartnerId] = useState(null);
    const [partnerDetails, setPartnerDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchHistory, setSearchHistory] = useState(() => {
        try {
            const val = localStorage.getItem('reon_search_history_partners');
            return val ? JSON.parse(val) : [];
        } catch (_) { return []; }
    });

    const addToHistory = (term) => {
        if (!term.trim()) return;
        setSearchHistory(prev => {
            const next = [term, ...prev.filter(t => t !== term)].slice(0, 5);
            localStorage.setItem('reon_search_history_partners', JSON.stringify(next));
            return next;
        });
    };

    const handleAction = async (id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this partner?`)) return;
        try {
            await fetch(`${API}/api/pos/partners/${id}/${action}`, {
                method: 'PATCH',
                headers,
                body: action === 'reject' ? JSON.stringify({ reason: 'Admin rejected application' }) : null
            });
            onRefresh();
            if (selectedPartnerId === id) handleViewDetails(id); // refresh details if open
        } catch (err) {
            alert(`Failed to ${action} partner`);
        }
    };

    const handleViewDetails = async (id) => {
        setSelectedPartnerId(id);
        setLoadingDetails(true);
        try {
            const res = await fetch(`${API}/api/pos/partners/${id}/details`, { headers, cache: 'no-store' });
            const data = await res.json();
            if(data.success) {
                setPartnerDetails(data.partner);
            } else {
                alert(data.error || 'Failed to load details');
                setSelectedPartnerId(null);
            }
        } catch(err) {
            alert('Error loading details');
            setSelectedPartnerId(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleEditClick = async (p) => {
        setSelectedPartnerId(p.id);
        setLoadingDetails(true);
        try {
            const res = await fetch(`${API}/api/pos/partners/${p.id}/details`, { headers, cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                setPartnerDetails(data.partner);
                setEditForm(data.partner);
                setIsEditing(true);
            } else {
                alert(data.error || 'Failed to load details');
            }
        } catch(err) {
            alert('Error loading details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('Are you sure you want to delete this POS partner? This will disable their account.')) return;
        try {
            const res = await fetch(`${API}/api/pos/admin/partners/${id}`, {
                method: 'DELETE',
                headers
            });
            const data = await res.json();
            if (data.success) {
                alert('POS Partner deleted successfully');
                onRefresh();
            } else {
                alert(data.error || 'Failed to delete partner');
            }
        } catch (err) {
            alert('Error deleting partner');
        }
    };

    const handleSaveEdit = async () => {
        try {
            const res = await fetch(`${API}/api/pos/admin/partners/${partnerDetails.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    fullName: editForm.full_name,
                    shopName: editForm.shop_name,
                    mobile: editForm.mobile,
                    email: editForm.email,
                    address: editForm.address,
                    district: editForm.district,
                    state: editForm.state,
                    pincode: editForm.pincode
                })
            });
            const data = await res.json();
            if (data.success) {
                setIsEditing(false);
                handleViewDetails(partnerDetails.id);
                onRefresh();
            } else {
                alert(data.error || 'Failed to update partner');
            }
        } catch (err) {
            alert('Error updating partner');
        }
    };

    const closeDetails = () => {
        setSelectedPartnerId(null);
        setPartnerDetails(null);
        setIsEditing(false);
    };

    const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

    const filteredPartners = partners.filter(p => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesSearch = (p.fullName || '').toLowerCase().includes(term) ||
                                 (p.shopName || '').toLowerCase().includes(term) ||
                                 (p.mobile || '').includes(term) ||
                                 (p.email || '').toLowerCase().includes(term);
            if (!matchesSearch) return false;
        }

        if (fromDate || toDate) {
            const recordTime = new Date(p.createdAt).getTime();
            if (fromDate) {
                const start = new Date(fromDate).setHours(0, 0, 0, 0);
                if (recordTime < start) return false;
            }
            if (toDate) {
                const end = new Date(toDate).setHours(23, 59, 59, 999);
                if (recordTime > end) return false;
            }
        }
        return true;
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-display font-bold text-navy">POS Partners</h2>
                    <p className="text-sm text-gray-400">Manage your Point of Sales partners ({partners.length})</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search partners..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onBlur={() => addToHistory(searchTerm)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addToHistory(searchTerm); }}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none w-48 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="border border-gray-200 rounded-xl p-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-gray-400 text-xs">to</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="border border-gray-200 rounded-xl p-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                        />
                        {(fromDate || toDate) && (
                            <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-xs text-red-500 hover:underline">Reset</button>
                        )}
                    </div>
                </div>
            </div>
            {searchHistory.length > 0 && (
                <div className="px-5 py-2 border-b border-gray-50 flex items-center gap-1.5 flex-wrap bg-gray-50/50">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Recent Searches:</span>
                    {searchHistory.map((h, i) => (
                        <button key={i} onClick={() => setSearchTerm(h)} className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                            {h}
                        </button>
                    ))}
                    <button onClick={() => { setSearchHistory([]); localStorage.removeItem('reon_search_history_partners'); }} className="text-[10px] text-red-500 hover:underline">Clear</button>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-5">Partner</th>
                            <th className="text-left py-3 px-3">Contact</th>
                            <th className="text-left py-3 px-3">Location</th>
                            <th className="text-left py-3 px-3">Status</th>
                            <th className="text-left py-3 px-3">Date</th>
                            <th className="text-right py-3 px-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPartners.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-12 text-gray-400">No POS Partners found</td></tr>
                        ) : filteredPartners.map((p) => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-3.5 px-5">
                                    <p className="font-semibold text-navy">{p.fullName}</p>
                                    <p className="text-xs text-gray-400">{p.shopName || 'No Shop Name'}</p>
                                </td>
                                <td className="py-3.5 px-3">
                                    <p className="text-gray-600">{p.mobile}</p>
                                    <p className="text-xs text-gray-400">{p.email}</p>
                                </td>
                                <td className="py-3.5 px-3">
                                    <p className="text-gray-600">{p.district}</p>
                                    <p className="text-xs text-gray-400">{p.state}</p>
                                </td>
                                <td className="py-3.5 px-3">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        p.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {p.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="py-3.5 px-3 text-gray-400 text-xs">
                                    {formatDate(p.createdAt)}
                                </td>
                                <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                                    <button onClick={() => handleViewDetails(p.id)} className="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-100">View</button>
                                    <button onClick={() => handleEditClick(p)} className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100">Edit</button>
                                    <button onClick={() => handleDeleteClick(p.id)} className="text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Partner Details Modal */}
            {selectedPartnerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {loadingDetails || !partnerDetails ? (
                            <div className="p-10 flex justify-center items-center h-64">
                                <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                    <div>
                                        <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                                            {partnerDetails.full_name} 
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                partnerDetails.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                partnerDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>{partnerDetails.status}</span>
                                        </h3>
                                        <p className="text-sm text-gray-500">{partnerDetails.shop_name} • Joined {formatDate(partnerDetails.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {partnerDetails.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleAction(partnerDetails.id, 'approve')} className="text-xs font-semibold bg-emerald text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600">Approve</button>
                                                <button onClick={() => handleAction(partnerDetails.id, 'reject')} className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Reject</button>
                                            </>
                                        )}
                                        {partnerDetails.status === 'approved' && (
                                            <button onClick={() => handleAction(partnerDetails.id, 'suspend')} className="text-xs font-semibold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-100">Suspend</button>
                                        )}
                                        {!isEditing ? (
                                            <button onClick={() => { setIsEditing(true); setEditForm({...partnerDetails}); }} className="text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100">Edit Details</button>
                                        ) : (
                                            <button onClick={handleSaveEdit} className="text-xs font-semibold bg-emerald text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600">Save</button>
                                        )}
                                        <button onClick={closeDetails} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-6">
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">Full Name</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">Shop Name</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.shop_name || ''} onChange={e => setEditForm({...editForm, shop_name: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">Mobile</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.mobile || ''} onChange={e => setEditForm({...editForm, mobile: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">Email</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-xs text-gray-500 font-medium">Address</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">District</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.district || ''} onChange={e => setEditForm({...editForm, district: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">State</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.state || ''} onChange={e => setEditForm({...editForm, state: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500 font-medium">Pincode</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" value={editForm.pincode || ''} onChange={e => setEditForm({...editForm, pincode: e.target.value})} />
                                            </div>
                                        </div>
                                    ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        
                                        {/* Column 1: Info & Performance */}
                                        <div className="space-y-6">
                                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">Performance</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[10px] text-emerald-600 font-medium">Total Leads Generated</p>
                                                        <p className="text-xl font-bold text-emerald-900">{partnerDetails.stats?.total_leads || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-emerald-600 font-medium">Total Earnings</p>
                                                        <p className="text-xl font-bold text-emerald-900">{formatCurrency(partnerDetails.stats?.total_earnings)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-emerald-600 font-medium">Current Wallet Balance</p>
                                                        <p className="text-lg font-bold text-emerald-700">{formatCurrency(partnerDetails.stats?.wallet_balance)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-navy border-b pb-2 mb-3">Contact & Location</h4>
                                                <div className="space-y-2 text-sm">
                                                    <p><span className="text-gray-400 text-xs">Mobile:</span> <span className="font-medium">{partnerDetails.mobile}</span></p>
                                                    <p><span className="text-gray-400 text-xs">Email:</span> <span className="font-medium">{partnerDetails.email}</span></p>
                                                    <p><span className="text-gray-400 text-xs">Address:</span> <span className="font-medium">{partnerDetails.address}</span></p>
                                                    <p><span className="text-gray-400 text-xs">District/State:</span> <span className="font-medium">{partnerDetails.district}, {partnerDetails.state} {partnerDetails.pincode}</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: KYC & Bank */}
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-sm font-bold text-navy border-b pb-2 mb-3">KYC Details</h4>
                                                <div className="space-y-2 text-sm">
                                                    <p><span className="text-gray-400 text-xs block">PAN Number</span> <span className="font-mono font-medium uppercase tracking-wider">{partnerDetails.pan_number || 'Not provided'}</span></p>
                                                    <p><span className="text-gray-400 text-xs block">Aadhaar Number</span> <span className="font-mono font-medium tracking-widest">{partnerDetails.aadhaar_number || 'Not provided'}</span></p>
                                                    <p><span className="text-gray-400 text-xs block">GST Number</span> <span className="font-mono font-medium uppercase tracking-wider">{partnerDetails.gst_number || 'Not provided'}</span></p>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-navy border-b pb-2 mb-3">Bank Details</h4>
                                                {partnerDetails.bankDetails ? (
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2 text-sm">
                                                        <p><span className="text-gray-400 text-xs block">Account Name</span> <span className="font-medium">{partnerDetails.bankDetails.account_holder_name}</span></p>
                                                        <p><span className="text-gray-400 text-xs block">Account Number</span> <span className="font-mono font-medium tracking-wider">{partnerDetails.bankDetails.account_number}</span></p>
                                                        <p><span className="text-gray-400 text-xs block">IFSC Code</span> <span className="font-mono font-medium uppercase">{partnerDetails.bankDetails.ifsc_code}</span></p>
                                                        <p><span className="text-gray-400 text-xs block">Bank & Branch</span> <span className="font-medium">{partnerDetails.bankDetails.bank_name}, {partnerDetails.bankDetails.branch_name}</span></p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No bank details provided yet.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 3: Documents */}
                                        <div className="space-y-6">
                                            <h4 className="text-sm font-bold text-navy border-b pb-2 mb-3">Uploaded Documents</h4>
                                            {partnerDetails.documents && partnerDetails.documents.length > 0 ? (
                                                <div className="space-y-3">
                                                    {partnerDetails.documents.map(doc => (
                                                        <div key={doc.id} className="flex flex-col p-3 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors bg-white">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-bold uppercase tracking-wider text-navy">{doc.document_type}</span>
                                                                <span className="text-[10px] text-gray-400">{formatDate(doc.created_at)}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 truncate mb-3" title={doc.document_name}>{doc.document_name}</p>
                                                            <button 
                                                                onClick={() => window.open(`${API}/api/pos/documents/${doc.document_url.split('/').pop()}?token=${localStorage.getItem('reon_admin_token')}`, '_blank')}
                                                                className="text-xs font-semibold bg-gray-50 text-gray-700 py-1.5 rounded hover:bg-gray-100 border border-gray-200 w-full text-center"
                                                            >
                                                                View Secure Document
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic flex flex-col items-center justify-center p-6 border border-dashed rounded-xl border-gray-200">
                                                    <FileText className="w-6 h-6 mb-2 opacity-20" />
                                                    No documents uploaded
                                                </p>
                                            )}
                                        </div>

                                    </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ========== QUOTATION TAB ==========
function QuotationTab({ editData, onClearEdit }) {
    return (
        <div className="space-y-5">
            <QuotationForm editData={editData} onClearEdit={onClearEdit} />
        </div>
    )
}

// ========== INVOICE TAB ==========
function InvoiceTab({ editData, onClearEdit, preselectedQuotation }) {
    return (
        <div className="space-y-5">
            <InvoiceForm editData={editData} onClearEdit={onClearEdit} preselectedQuotation={preselectedQuotation} />
        </div>
    )
}

// ========== ENQUIRIES TAB ==========
function EnquiriesTab({ filtered, filter, setFilter, searchTerm, setSearchTerm, expandedRow, setExpandedRow, updateStatus, deleteEnquiry, formatDate, formatCurrency, enqFromDate, setEnqFromDate, enqToDate, setEnqToDate, enqSearchHistory, setEnqSearchHistory, addToEnqHistory }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-display font-bold text-navy">Customer Enquiries</h2>
                        <p className="text-sm text-gray-400">{filtered.length} found</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search..." value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onBlur={() => addToEnqHistory(searchTerm)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addToEnqHistory(searchTerm); }}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none w-48 transition-all" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={enqFromDate}
                                onChange={(e) => setEnqFromDate(e.target.value)}
                                className="border border-gray-200 rounded-xl p-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-gray-400 text-xs">to</span>
                            <input
                                type="date"
                                value={enqToDate}
                                onChange={(e) => setEnqToDate(e.target.value)}
                                className="border border-gray-200 rounded-xl p-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                            />
                            {(enqFromDate || enqToDate) && (
                                <button onClick={() => { setEnqFromDate(''); setEnqToDate(''); }} className="text-xs text-red-500 hover:underline">Reset</button>
                            )}
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select value={filter} onChange={(e) => setFilter(e.target.value)}
                                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl appearance-none bg-white focus:border-emerald focus:outline-none cursor-pointer">
                                <option value="all">All</option>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>
                    </div>
                </div>
                {enqSearchHistory?.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap border-t border-gray-50 pt-2">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Recent Searches:</span>
                        {enqSearchHistory.map((h, i) => (
                            <button key={i} onClick={() => setSearchTerm(h)} className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                                {h}
                            </button>
                        ))}
                        <button onClick={() => { setEnqSearchHistory([]); localStorage.removeItem('reon_search_history_enquiries'); }} className="text-[10px] text-red-500 hover:underline">Clear</button>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-5">Customer</th>
                            <th className="text-left py-3 px-3 hidden md:table-cell">Contact</th>
                            <th className="text-left py-3 px-3 hidden lg:table-cell">Type</th>
                            <th className="text-left py-3 px-3 hidden lg:table-cell">Payment</th>
                            <th className="text-left py-3 px-3 hidden xl:table-cell">Bill</th>
                            <th className="text-left py-3 px-3">Status</th>
                            <th className="text-left py-3 px-3 hidden sm:table-cell">Date</th>
                            <th className="text-right py-3 px-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="8" className="text-center py-12 text-gray-400">
                                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="font-medium">No enquiries found</p>
                            </td></tr>
                        ) : filtered.map((enq) => (
                            <tr key={enq.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                onClick={() => setExpandedRow(expandedRow === enq.id ? null : enq.id)}>
                                <td className="py-3.5 px-5">
                                    <p className="font-semibold text-navy">{enq.name}</p>
                                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{enq.address}</p>
                                </td>
                                <td className="py-3.5 px-3 hidden md:table-cell">
                                    <span className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" />{enq.phone}</span>
                                    {enq.email && <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail className="w-3 h-3" />{enq.email}</span>}
                                </td>
                                <td className="py-3.5 px-3 hidden lg:table-cell">
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${enq.installation_type === 'Commercial' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>{enq.installation_type}</span>
                                </td>
                                <td className="py-3.5 px-3 hidden lg:table-cell text-gray-600">{enq.payment_method}</td>
                                <td className="py-3.5 px-3 hidden xl:table-cell font-medium text-navy">{enq.monthly_bill ? formatCurrency(enq.monthly_bill) : '—'}</td>
                                <td className="py-3.5 px-3">
                                    <select value={enq.status} onChange={(e) => { e.stopPropagation(); updateStatus(enq.id, e.target.value) }} onClick={(e) => e.stopPropagation()}
                                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-emerald/20 focus:outline-none ${STATUS_CONFIG[enq.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="converted">Converted</option>
                                        <option value="lost">Lost</option>
                                    </select>
                                </td>
                                <td className="py-3.5 px-3 hidden sm:table-cell text-gray-400 text-xs">{formatDate(enq.created_at)}</td>
                                <td className="py-3.5 px-5 text-right">
                                    <button onClick={(e) => { e.stopPropagation(); deleteEnquiry(enq.id) }} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {filtered.map((enq) => expandedRow === enq.id && (
                            <tr key={`d-${enq.id}`} className="bg-gray-50/80">
                                <td colSpan="8" className="px-5 py-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                                        <div><p className="text-xs text-gray-400 font-medium mb-1">Floors</p><p className="text-navy font-semibold">{enq.floors || '—'}</p></div>
                                        <div><p className="text-xs text-gray-400 font-medium mb-1">Monthly Bill</p><p className="text-navy font-semibold">{enq.monthly_bill ? formatCurrency(enq.monthly_bill) : '—'}</p></div>
                                        <div><p className="text-xs text-gray-400 font-medium mb-1">Payment</p><p className="text-navy font-semibold">{enq.payment_method}</p></div>
                                        <div><p className="text-xs text-gray-400 font-medium mb-1">Type</p><p className="text-navy font-semibold">{enq.installation_type}</p></div>
                                        <div><p className="text-xs text-gray-400 font-medium mb-1">Electricity Provider</p><p className="text-navy font-semibold">{enq.electricity_provider || '—'}</p></div>
                                        <div className="col-span-2 sm:col-span-5">
                                            <p className="text-xs text-gray-400 font-medium mb-1">Utilities</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(enq.utilities?.length > 0) ? enq.utilities.map(u => (
                                                    <span key={u} className="text-xs bg-emerald/10 text-emerald-700 px-2.5 py-1 rounded-full font-medium capitalize">{u.replace(/_/g, ' ')}</span>
                                                )) : <span className="text-gray-400 text-xs">None</span>}
                                            </div>
                                        </div>
                                        {enq.message && <div className="col-span-2 sm:col-span-5"><p className="text-xs text-gray-400 font-medium mb-1">Message</p><p className="text-gray-600">{enq.message}</p></div>}
                                        <div className="col-span-2 sm:col-span-5"><p className="text-xs text-gray-400 font-medium mb-1">Address</p><p className="text-gray-600 flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />{enq.address}</p></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ========== SCHEMES TAB ==========
function SchemesTab({ schemes, onEdit, onAdd, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-display font-bold text-navy">Manage Schemes</h2>
                    <p className="text-sm text-gray-400">{schemes.length} schemes</p>
                </div>
                <button onClick={onAdd} className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                    <Plus className="w-4 h-4" /> Add Scheme
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-5">Scheme</th>
                            <th className="text-left py-3 px-3 hidden md:table-cell">Badge</th>
                            <th className="text-left py-3 px-3 hidden lg:table-cell">Subsidy</th>
                            <th className="text-left py-3 px-3 hidden sm:table-cell">Featured</th>
                            <th className="text-left py-3 px-3">Order</th>
                            <th className="text-right py-3 px-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schemes.map(s => (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{s.icon}</span>
                                        <div>
                                            <p className="font-semibold text-navy">{s.name}</p>
                                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{s.tagline}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3.5 px-3 hidden md:table-cell"><span className="text-xs bg-navy/10 text-navy px-2 py-1 rounded-full font-medium">{s.badge}</span></td>
                                <td className="py-3.5 px-3 hidden lg:table-cell font-medium text-navy">{s.total_subsidy}</td>
                                <td className="py-3.5 px-3 hidden sm:table-cell">{s.featured ? <span className="text-xs bg-solar/20 text-solar-700 px-2 py-1 rounded-full font-bold">⭐ Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                                <td className="py-3.5 px-3 text-gray-500">{s.sort_order}</td>
                                <td className="py-3.5 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => onEdit(s)} className="p-1.5 text-gray-400 hover:text-emerald hover:bg-emerald/5 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => onDelete(s.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ========== TESTIMONIALS TAB ==========
function TestimonialsTab({ testimonials, onEdit, onAdd, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-display font-bold text-navy">Manage Testimonials</h2>
                    <p className="text-sm text-gray-400">{testimonials.length} testimonials</p>
                </div>
                <button onClick={onAdd} className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                    <Plus className="w-4 h-4" /> Add Testimonial
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-5">Customer</th>
                            <th className="text-left py-3 px-3 hidden md:table-cell">Review</th>
                            <th className="text-left py-3 px-3">Rating</th>
                            <th className="text-left py-3 px-3 hidden sm:table-cell">Date</th>
                            <th className="text-right py-3 px-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {testimonials.map(t => (
                            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-9 h-9 ${t.avatar_color || 'bg-emerald'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>{t.avatar_initials}</div>
                                        <div>
                                            <p className="font-semibold text-navy">{t.name}</p>
                                            <p className="text-xs text-gray-400">{t.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3.5 px-3 hidden md:table-cell"><p className="text-gray-500 text-xs truncate max-w-[250px]">{t.review}</p></td>
                                <td className="py-3.5 px-3">
                                    <div className="flex">{[...Array(t.rating || 5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-solar fill-solar" />)}</div>
                                </td>
                                <td className="py-3.5 px-3 hidden sm:table-cell text-gray-400 text-xs">{t.date_label}</td>
                                <td className="py-3.5 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => onEdit(t)} className="p-1.5 text-gray-400 hover:text-emerald hover:bg-emerald/5 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => onDelete(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ========== GALLERY TAB ==========
function GalleryTab({ gallery, onEdit, onAdd, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-display font-bold text-navy">Manage Gallery</h2>
                    <p className="text-sm text-gray-400">{gallery.length} images</p>
                </div>
                <button onClick={onAdd} className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                    <Plus className="w-4 h-4" /> Add Image
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-5">
                {gallery.map(img => (
                    <div key={img.id} className="group relative rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <img src={img.image_url} alt={img.alt_text} className="w-full h-36 object-cover" loading="lazy" />
                        <div className="p-3">
                            <p className="text-sm font-semibold text-navy truncate">{img.label}</p>
                            <p className="text-xs text-gray-400">Order: {img.sort_order}</p>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(img)} className="p-1.5 bg-white/90 rounded-lg text-gray-600 hover:text-emerald shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => onDelete(img.id)} className="p-1.5 bg-white/90 rounded-lg text-gray-600 hover:text-red-500 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ========== DIRECTORS TAB ==========
function DirectorsTab({ directors, onEdit, onAdd, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-display font-bold text-navy">Manage Directors</h2>
                    <p className="text-sm text-gray-400">{directors.length} directors</p>
                </div>
                <button onClick={onAdd} className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                    <Plus className="w-4 h-4" /> Add Director
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-5">Director</th>
                            <th className="text-left py-3 px-3 hidden md:table-cell">Description</th>
                            <th className="text-left py-3 px-3">Order</th>
                            <th className="text-right py-3 px-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {directors.map(d => (
                            <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                                            {d.image_url ? (
                                                <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-emerald flex items-center justify-center text-white font-bold">{d.name?.[0] || 'D'}</div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-navy">{d.name}</p>
                                            <p className="text-xs text-gray-400">{d.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3.5 px-3 hidden md:table-cell"><p className="text-gray-500 text-xs truncate max-w-[300px]">{d.description}</p></td>
                                <td className="py-3.5 px-3 text-gray-500">{d.sort_order}</td>
                                <td className="py-3.5 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => onEdit(d)} className="p-1.5 text-gray-400 hover:text-emerald hover:bg-emerald/5 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => onDelete(d.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ========== EDIT MODAL ==========
function EditModal({ modal, onClose, onSave }) {
    const [form, setForm] = useState(modal.data)
    const { type, isNew } = modal

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const handleArrayField = (key, idx, val) => {
        const arr = [...(form[key] || [])]
        arr[idx] = val
        set(key, arr)
    }
    const addArrayItem = (key) => set(key, [...(form[key] || []), ''])
    const removeArrayItem = (key, idx) => set(key, (form[key] || []).filter((_, i) => i !== idx))

    const handleSubsidyField = (idx, field, val) => {
        const arr = [...(form.subsidy_breakdown || [])]
        arr[idx] = { ...arr[idx], [field]: val }
        set('subsidy_breakdown', arr)
    }
    const addSubsidy = () => set('subsidy_breakdown', [...(form.subsidy_breakdown || []), { label: '', value: '' }])
    const removeSubsidy = (idx) => set('subsidy_breakdown', (form.subsidy_breakdown || []).filter((_, i) => i !== idx))

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-10 animate-fade-in">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="text-lg font-display font-bold text-navy">
                        {isNew ? 'Add' : 'Edit'} {type === 'schemes' ? 'Scheme' : type === 'testimonials' ? 'Testimonial' : type === 'directors' ? 'Director' : 'Gallery Image'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {type === 'schemes' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Icon (emoji)</label>
                                    <input value={form.icon || ''} onChange={e => set('icon', e.target.value)} className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Badge</label>
                                    <input value={form.badge || ''} onChange={e => set('badge', e.target.value)} className="input-field text-sm" placeholder="e.g. Central Govt." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                                <input value={form.name || ''} onChange={e => set('name', e.target.value)} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Tagline</label>
                                <input value={form.tagline || ''} onChange={e => set('tagline', e.target.value)} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Total Subsidy</label>
                                <input value={form.total_subsidy || ''} onChange={e => set('total_subsidy', e.target.value)} className="input-field text-sm" placeholder="e.g. Up to ₹78,000" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Sort Order</label>
                                    <input type="number" value={form.sort_order || 0} onChange={e => set('sort_order', parseInt(e.target.value))} className="input-field text-sm" />
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input type="checkbox" checked={form.featured || false} onChange={e => set('featured', e.target.checked)} id="featured" className="w-4 h-4 accent-emerald" />
                                    <label htmlFor="featured" className="text-sm font-medium text-navy">Featured</label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Eligibility</label>
                                {(form.eligibility || []).map((e, i) => (
                                    <div key={i} className="flex gap-2 mb-1.5">
                                        <input value={e} onChange={ev => handleArrayField('eligibility', i, ev.target.value)} className="input-field text-sm flex-1" />
                                        <button onClick={() => removeArrayItem('eligibility', i)} className="p-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <button onClick={() => addArrayItem('eligibility')} className="text-xs text-emerald font-semibold hover:underline">+ Add eligibility</button>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Subsidy Breakdown</label>
                                {(form.subsidy_breakdown || []).map((s, i) => (
                                    <div key={i} className="flex gap-2 mb-1.5">
                                        <input value={s.label} onChange={ev => handleSubsidyField(i, 'label', ev.target.value)} className="input-field text-sm flex-1" placeholder="Label" />
                                        <input value={s.value} onChange={ev => handleSubsidyField(i, 'value', ev.target.value)} className="input-field text-sm flex-1" placeholder="Value" />
                                        <button onClick={() => removeSubsidy(i)} className="p-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <button onClick={addSubsidy} className="text-xs text-emerald font-semibold hover:underline">+ Add subsidy tier</button>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">REON Help</label>
                                {(form.reon_help || []).map((h, i) => (
                                    <div key={i} className="flex gap-2 mb-1.5">
                                        <input value={h} onChange={ev => handleArrayField('reon_help', i, ev.target.value)} className="input-field text-sm flex-1" />
                                        <button onClick={() => removeArrayItem('reon_help', i)} className="p-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <button onClick={() => addArrayItem('reon_help')} className="text-xs text-emerald font-semibold hover:underline">+ Add help item</button>
                            </div>
                        </>
                    )}

                    {type === 'testimonials' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                                    <input value={form.name || ''} onChange={e => set('name', e.target.value)} className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                                    <input value={form.role || ''} onChange={e => set('role', e.target.value)} className="input-field text-sm" placeholder="e.g. Homeowner, Kolkata" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Review *</label>
                                <textarea value={form.review || ''} onChange={e => set('review', e.target.value)} rows={3} className="input-field text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Rating</label>
                                    <select value={form.rating || 5} onChange={e => set('rating', parseInt(e.target.value))} className="input-field text-sm">
                                        {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Initials</label>
                                    <input value={form.avatar_initials || ''} onChange={e => set('avatar_initials', e.target.value)} className="input-field text-sm" placeholder="e.g. SM" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
                                    <select value={form.avatar_color || 'bg-emerald'} onChange={e => set('avatar_color', e.target.value)} className="input-field text-sm">
                                        <option value="bg-emerald">Green</option>
                                        <option value="bg-solar">Orange</option>
                                        <option value="bg-navy">Navy</option>
                                        <option value="bg-blue-500">Blue</option>
                                        <option value="bg-purple-500">Purple</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Date Label</label>
                                    <input value={form.date_label || ''} onChange={e => set('date_label', e.target.value)} className="input-field text-sm" placeholder="e.g. March 2025" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Sort Order</label>
                                    <input type="number" value={form.sort_order || 0} onChange={e => set('sort_order', parseInt(e.target.value))} className="input-field text-sm" />
                                </div>
                            </div>
                        </>
                    )}

                    {type === 'gallery' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL *</label>
                                <input value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} className="input-field text-sm" placeholder="https://..." />
                            </div>
                            {form.image_url && (
                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                    <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Label</label>
                                <input value={form.label || ''} onChange={e => set('label', e.target.value)} className="input-field text-sm" placeholder="e.g. Residential Installation" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Alt Text</label>
                                <input value={form.alt_text || ''} onChange={e => set('alt_text', e.target.value)} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Sort Order</label>
                                <input type="number" value={form.sort_order || 0} onChange={e => set('sort_order', parseInt(e.target.value))} className="input-field text-sm" />
                            </div>
                        </>
                    )}

                    {type === 'directors' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                                    <input value={form.name || ''} onChange={e => set('name', e.target.value)} className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Role *</label>
                                    <input value={form.role || ''} onChange={e => set('role', e.target.value)} className="input-field text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                                <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} className="input-field text-sm resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
                                <input value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} className="input-field text-sm" placeholder="https://..." />
                            </div>
                            {form.image_url && (
                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                    <img src={form.image_url} alt="Preview" className="w-32 h-32 object-cover" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Sort Order</label>
                                <input type="number" value={form.sort_order || 0} onChange={e => set('sort_order', parseInt(e.target.value))} className="input-field text-sm" />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                    <button onClick={() => onSave(form)} className="flex items-center gap-2 bg-emerald text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm">
                        <Save className="w-4 h-4" />
                        {isNew ? 'Create' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ========== POS LEADS TAB ==========
function LeadsTab({ leads, posPartners, onRefresh, headers, formatDate, onSelectQuotationForInvoice }) {
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'pos_wise'
    const [selectedPartnerId, setSelectedPartnerId] = useState('all');
    const [stageFilter, setStageFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'converted'
    const [searchTerm, setSearchTerm] = useState('');
    const [quotationSearch, setQuotationSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchHistory, setSearchHistory] = useState(() => {
        try {
            const val = localStorage.getItem('reon_search_history_leads');
            return val ? JSON.parse(val) : [];
        } catch (_) { return []; }
    });

    const addToHistory = (term) => {
        if (!term.trim()) return;
        setSearchHistory(prev => {
            const next = [term, ...prev.filter(t => t !== term)].slice(0, 5);
            localStorage.setItem('reon_search_history_leads', JSON.stringify(next));
            return next;
        });
    };

    const STAGE_CONFIG = {
        contacted: { label: '1. Contacted', color: 'bg-blue-100 text-blue-700' },
        quotation_sent: { label: '2. Quotation sent', color: 'bg-indigo-100 text-indigo-700' },
        converted: { label: '3. Converted (Payment Credited)', color: 'bg-emerald-100 text-emerald-800' },
        site_visit: { label: '4. Site Visit', color: 'bg-amber-100 text-amber-800' },
        site_visit_scheduled: { label: '4. Site Visit', color: 'bg-amber-100 text-amber-800' },
        negotiation: { label: '5. Negotiation', color: 'bg-orange-100 text-orange-800' },
        material_request: { label: '6. Request sent to Material team', color: 'bg-purple-100 text-purple-700' },
        completed: { label: '7. Completed', color: 'bg-teal-100 text-teal-800' },
    };

    const handleStageUpdate = async (leadId, newStage) => {
        try {
            await fetch(`${API}/api/leads/${leadId}/stage`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ stage: newStage, notes: `Stage updated to ${newStage} by admin` })
            });
            onRefresh();
        } catch (err) {
            alert('Failed to update lead stage');
        }
    };

    // Helper: Identify whether a lead originated from Admin (Direct) or a POS Partner
    const isLeadAdmin = (lead) => {
        const pName = (lead.posName || '').toLowerCase().trim();
        const pShop = (lead.partnerShopName || '').toLowerCase().trim();
        const pId = (lead.posId || '').toLowerCase().trim();
        return pName === 'admin' || pShop === 'admin' || pId === 'admin' ||
               (!lead.partnerId && !lead.posId && (!lead.partnerShopName || pShop === 'admin') && (!lead.posName || pName === 'admin'));
    };

    const getLeadShopName = (lead) => {
        if (isLeadAdmin(lead)) return 'REON Head Office';
        return lead.partnerShopName || lead.posName || 'POS Partner';
    };

    const getLeadPosId = (lead) => {
        if (isLeadAdmin(lead)) return 'HQ-DIRECT';
        return lead.posId || lead.partnerReferralCode || '';
    };

    const getLeadOwner = (lead) => {
        if (isLeadAdmin(lead)) return 'Admin Direct';
        return lead.partnerOwnerName || '';
    };

    // Calculate aggregated metrics
    const totalLeadsCount = leads.length;
    const convertedLeadsCount = leads.filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo).length;
    const pendingLeadsCount = totalLeadsCount - convertedLeadsCount;
    const conversionPercentage = totalLeadsCount > 0 ? ((convertedLeadsCount / totalLeadsCount) * 100).toFixed(1) : 0;
    const totalQuotationValue = leads.reduce((sum, l) => sum + (parseFloat(l.quotationAmount) || 0), 0);
    const convertedBusinessValue = leads
        .filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo)
        .reduce((sum, l) => sum + (parseFloat(l.invoiceAmount) || 0), 0);

    const adminLeadsCount = leads.filter(isLeadAdmin).length;
    const posPartnerLeadsCount = totalLeadsCount - adminLeadsCount;

    // Build active partner map for dropdown filter
    const activePartnerMap = new Map();
    leads.forEach(l => {
        if (!isLeadAdmin(l)) {
            const key = (l.partnerShopName || l.posName || '').trim();
            if (key) {
                if (!activePartnerMap.has(key)) {
                    activePartnerMap.set(key, {
                        shopName: key,
                        posId: l.posId || '',
                        partnerId: l.partnerId || '',
                        ownerName: l.partnerOwnerName || '',
                        quoteCount: 0
                    });
                }
                activePartnerMap.get(key).quoteCount++;
            }
        }
    });
    const activePartnersList = Array.from(activePartnerMap.values()).sort((a, b) => b.quoteCount - a.quoteCount);
    const otherPartnersList = (posPartners || []).filter(p => !activePartnerMap.has(p.shop_name));

    // Multi-filtering logic
    const filteredLeads = leads.filter(l => {
        const isAdmin = isLeadAdmin(l);

        // POS Partner / Source filter
        if (selectedPartnerId !== 'all') {
            if (selectedPartnerId === 'admin') {
                if (!isAdmin) return false;
            } else if (selectedPartnerId === 'all_pos') {
                if (isAdmin) return false;
            } else {
                const target = selectedPartnerId.toLowerCase().trim();
                const lShop = (l.partnerShopName || l.posName || '').toLowerCase().trim();
                const lId = (l.partnerId || '').toLowerCase().trim();
                const lPosId = (l.posId || '').toLowerCase().trim();
                if (lShop !== target && lId !== target && lPosId !== target) {
                    return false;
                }
            }
        }

        // Lead Status filter (Pending / Converted)
        const isConverted = l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo;
        if (statusFilter === 'pending' && isConverted) return false;
        if (statusFilter === 'converted' && !isConverted) return false;

        // Stage filter
        if (stageFilter !== 'all' && l.stage !== stageFilter) return false;

        // Quotation Number filter
        if (quotationSearch.trim()) {
            const qTerm = quotationSearch.trim().toLowerCase();
            const qNum = (l.quotationNumber || l.quotationNo || '').toLowerCase();
            if (!qNum.includes(qTerm)) return false;
        }

        // Customer & text search filter
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            const matchesCustomer = (l.customerName || '').toLowerCase().includes(term) ||
                                    (l.mobile || '').includes(term) ||
                                    (l.partnerShopName || '').toLowerCase().includes(term) ||
                                    (l.posName || '').toLowerCase().includes(term) ||
                                    (l.address || '').toLowerCase().includes(term) ||
                                    (l.posId || '').toLowerCase().includes(term);
            if (!matchesCustomer) return false;
        }

        // Date range filter
        if (fromDate || toDate) {
            const recordTime = new Date(l.createdAt || l.quotationDate).getTime();
            if (fromDate) {
                const start = new Date(fromDate).setHours(0, 0, 0, 0);
                if (recordTime < start) return false;
            }
            if (toDate) {
                const end = new Date(toDate).setHours(23, 59, 59, 999);
                if (recordTime > end) return false;
            }
        }
        return true;
    });

    // POS-Wise Aggregated Performance
    const adminLeads = leads.filter(isLeadAdmin);
    const adminConvertedLeads = adminLeads.filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo);
    const adminQuoteVal = adminLeads.reduce((sum, l) => sum + (parseFloat(l.quotationAmount) || 0), 0);
    const adminBizVal = adminConvertedLeads.reduce((sum, l) => sum + (parseFloat(l.invoiceAmount) || 0), 0);
    const adminConvRate = adminLeads.length > 0 ? ((adminConvertedLeads.length / adminLeads.length) * 100).toFixed(1) : 0;

    const hqPerformanceRow = {
        id: 'hq-admin-direct',
        shopName: 'REON Head Office',
        posId: 'HQ-DIRECT',
        ownerName: 'Admin Direct Quotations',
        totalLeads: adminLeads.length,
        pendingLeads: adminLeads.length - adminConvertedLeads.length,
        convertedLeads: adminConvertedLeads.length,
        conversionRate: adminConvRate,
        totalQuotationValue: adminQuoteVal,
        convertedBusinessValue: adminBizVal,
        isHq: true,
    };

    // Combine registered posPartners with any partner found in leads
    const partnerIdMap = new Map();
    (posPartners || []).forEach(p => {
        partnerIdMap.set(p.shop_name?.toLowerCase(), p);
    });

    const partnerRows = [];
    const processedShops = new Set();

    // First process partners from posPartners list
    (posPartners || []).forEach(p => {
        const pShopLower = p.shop_name?.toLowerCase();
        processedShops.add(pShopLower);
        const partnerLeads = leads.filter(l => {
            if (isLeadAdmin(l)) return false;
            return (l.partnerId && l.partnerId === p.id) ||
                   (l.partnerShopName && l.partnerShopName.toLowerCase() === pShopLower) ||
                   (l.posName && l.posName.toLowerCase() === pShopLower) ||
                   (l.posId && l.posId === p.referral_code);
        });
        const total = partnerLeads.length;
        const converted = partnerLeads.filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo).length;
        const pending = total - converted;
        const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
        const quoteValue = partnerLeads.reduce((sum, l) => sum + (parseFloat(l.quotationAmount) || 0), 0);
        const bizValue = partnerLeads
            .filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo)
            .reduce((sum, l) => sum + (parseFloat(l.invoiceAmount) || 0), 0);

        partnerRows.push({
            id: p.id,
            shopName: p.shop_name,
            posId: p.referral_code || p.id?.slice(0, 8),
            ownerName: p.full_name || 'POS Partner',
            totalLeads: total,
            pendingLeads: pending,
            convertedLeads: converted,
            conversionRate: rate,
            totalQuotationValue: quoteValue,
            convertedBusinessValue: bizValue,
            isHq: false,
        });
    });

    // Also include any active partner from leads not yet processed
    activePartnersList.forEach(ap => {
        if (!processedShops.has(ap.shopName.toLowerCase())) {
            const partnerLeads = leads.filter(l => {
                if (isLeadAdmin(l)) return false;
                const lShop = (l.partnerShopName || l.posName || '').toLowerCase();
                return lShop === ap.shopName.toLowerCase();
            });
            const total = partnerLeads.length;
            const converted = partnerLeads.filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo).length;
            const pending = total - converted;
            const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
            const quoteValue = partnerLeads.reduce((sum, l) => sum + (parseFloat(l.quotationAmount) || 0), 0);
            const bizValue = partnerLeads
                .filter(l => l.stage === 'converted' || l.leadStatus === 'Converted' || !!l.invoiceNumber || !!l.invoiceNo)
                .reduce((sum, l) => sum + (parseFloat(l.invoiceAmount) || 0), 0);

            partnerRows.push({
                id: ap.partnerId || ap.shopName,
                shopName: ap.shopName,
                posId: ap.posId || 'POS',
                ownerName: ap.ownerName || 'POS Partner',
                totalLeads: total,
                pendingLeads: pending,
                convertedLeads: converted,
                conversionRate: rate,
                totalQuotationValue: quoteValue,
                convertedBusinessValue: bizValue,
                isHq: false,
            });
        }
    });

    // Sort partners: active ones with totalLeads > 0 first
    partnerRows.sort((a, b) => b.totalLeads - a.totalLeads);

    const posWisePerformance = [hqPerformanceRow, ...partnerRows];

    return (
        <div className="space-y-5">
            {/* 1. Global Lead Statistics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Leads</p>
                    <p className="text-2xl font-bold font-display text-gray-900 mt-1">{totalLeadsCount}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{posPartnerLeadsCount} POS • {adminLeadsCount} Admin Direct</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Pending Leads</p>
                    <p className="text-2xl font-bold font-display text-blue-600 mt-1">{pendingLeadsCount}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Awaiting conversion</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Converted Leads</p>
                    <p className="text-2xl font-bold font-display text-emerald-700 mt-1">{convertedLeadsCount}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Invoiced by admin</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Conversion %</p>
                    <p className="text-2xl font-bold font-display text-amber-600 mt-1">{conversionPercentage}%</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">(Converted / Total) × 100</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Quotation Value</p>
                    <p className="text-lg font-bold font-display text-purple-700 mt-1 truncate">
                        ₹ {Number(totalQuotationValue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Total quotes generated</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Converted Value</p>
                    <p className="text-lg font-bold font-display text-emerald-800 mt-1 truncate">
                        ₹ {Number(convertedBusinessValue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Invoiced business volume</p>
                </div>
            </div>

            {/* 2. Sub-views Navigation */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-2 shadow-sm flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => { setViewMode('all'); setStatusFilter('all'); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === 'all' && statusFilter === 'all'
                                ? 'bg-navy text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        📋 All Leads & Quotations ({leads.length})
                    </button>
                    <button
                        onClick={() => { setViewMode('all'); setStatusFilter('pending'); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === 'all' && statusFilter === 'pending'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        ⏳ Awaiting Conversion ({pendingLeadsCount})
                    </button>
                    <button
                        onClick={() => { setViewMode('all'); setStatusFilter('converted'); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === 'all' && statusFilter === 'converted'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        ✅ Converted ({convertedLeadsCount})
                    </button>
                    <button
                        onClick={() => setViewMode('pos_wise')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === 'pos_wise'
                                ? 'bg-navy text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        🏬 POS-Wise Performance
                    </button>
                </div>
                <button
                    onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh Data
                </button>
            </div>

            {/* 3. Centralized Lead Table Container */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                {/* Filters Bar */}
                <div className="p-4 border-b border-gray-200/80 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap flex-1">
                            {/* Customer Search */}
                            <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search customer, phone, location..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onBlur={() => addToHistory(searchTerm)}
                                    className="w-full pl-9 pr-3 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm"
                                />
                            </div>

                            {/* Quotation Number Search */}
                            <div className="relative min-w-[170px]">
                                <input
                                    type="text"
                                    placeholder="Quote # (e.g. REPL/...)"
                                    value={quotationSearch}
                                    onChange={(e) => setQuotationSearch(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm"
                                />
                            </div>

                            {/* POS Partner / Source Filter */}
                            <div className="relative">
                                <select
                                    value={selectedPartnerId}
                                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                                    className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded-xl hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm cursor-pointer min-w-[180px]"
                                >
                                    <option value="all" className="text-gray-900 bg-white font-semibold py-1">
                                        All Sources ({leads.length} Leads)
                                    </option>
                                    <option value="admin" className="text-gray-900 bg-white font-medium py-1">
                                        🏢 REON Head Office (Admin Direct) ({adminLeadsCount})
                                    </option>
                                    <option value="all_pos" className="text-gray-900 bg-white font-medium py-1">
                                        🏬 All POS Partners Combined ({posPartnerLeadsCount})
                                    </option>
                                    {activePartnersList.length > 0 && (
                                        <optgroup label="Active POS Partners (With Quotes)" className="font-bold text-gray-800 bg-gray-100">
                                            {activePartnersList.map(p => (
                                                <option key={p.shopName} value={p.shopName} className="text-gray-900 bg-white font-normal py-1">
                                                    {p.shopName} ({p.posId || 'POS'}) • {p.quoteCount} quote{p.quoteCount > 1 ? 's' : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {otherPartnersList.length > 0 && (
                                        <optgroup label="Other Registered Partners" className="font-bold text-gray-600 bg-gray-50">
                                            {otherPartnersList.map(p => (
                                                <option key={p.id} value={p.shop_name} className="text-gray-900 bg-white font-normal py-1">
                                                    {p.shop_name} ({p.referral_code || p.id?.slice(0, 8)})
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                            </div>

                            {/* Lead Status Filter */}
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded-xl hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm cursor-pointer"
                                >
                                    <option value="all" className="text-gray-900 bg-white font-semibold py-1">All Conversion Status</option>
                                    <option value="pending" className="text-gray-900 bg-white font-medium py-1">⏳ Pending Invoices ({pendingLeadsCount})</option>
                                    <option value="converted" className="text-gray-900 bg-white font-medium py-1">✅ Converted Invoices ({convertedLeadsCount})</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                            </div>

                            {/* Stage Filter */}
                            <div className="relative">
                                <select
                                    value={stageFilter}
                                    onChange={(e) => setStageFilter(e.target.value)}
                                    className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded-xl hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm cursor-pointer"
                                >
                                    <option value="all" className="text-gray-900 bg-white font-semibold py-1">All Pipeline Stages</option>
                                    {Object.entries(STAGE_CONFIG).map(([key, val]) => (
                                        <option key={key} value={key} className="text-gray-900 bg-white font-normal py-1">{val.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-gray-600">Date:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                            />
                            <span className="text-gray-400 text-xs font-medium">to</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                            />
                            {(fromDate || toDate || selectedPartnerId !== 'all' || quotationSearch || searchTerm || stageFilter !== 'all' || statusFilter !== 'all') && (
                                <button
                                    onClick={() => { setFromDate(''); setToDate(''); setSelectedPartnerId('all'); setQuotationSearch(''); setSearchTerm(''); setStageFilter('all'); setStatusFilter('all'); }}
                                    className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-semibold px-2.5 py-1.5 rounded-xl border border-red-200 transition-colors cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Table Views */}
                {viewMode === 'pos_wise' ? (
                    /* POS-Wise Performance Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-bold bg-gray-50/90 select-none">
                                    <th className="text-left py-3.5 px-4 min-w-[210px]">POS Partner / Source</th>
                                    <th className="text-left py-3.5 px-3 min-w-[130px]">POS ID / Code</th>
                                    <th className="text-center py-3.5 px-3 min-w-[90px]">Total Leads</th>
                                    <th className="text-center py-3.5 px-3 min-w-[90px]">Pending</th>
                                    <th className="text-center py-3.5 px-3 min-w-[90px]">Converted</th>
                                    <th className="text-center py-3.5 px-3 min-w-[110px]">Conversion Rate</th>
                                    <th className="text-right py-3.5 px-4 min-w-[130px]">Quotation Value</th>
                                    <th className="text-right py-3.5 px-4 min-w-[140px]">Converted Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posWisePerformance.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-12 text-gray-400">No POS Partners found</td></tr>
                                ) : posWisePerformance.map((p) => (
                                    <tr key={p.id} className={`border-b border-gray-100 transition-colors ${p.isHq ? 'bg-slate-50/70 hover:bg-slate-100/70 font-medium' : 'hover:bg-gray-50/70'}`}>
                                        <td className="py-3.5 px-4 align-middle">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                    p.isHq ? 'bg-slate-200 text-slate-800 border border-slate-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {p.isHq ? 'HQ' : 'POS'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-xs truncate">{p.shopName}</p>
                                                    <p className="text-[11px] text-gray-500 truncate">{p.ownerName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3 align-middle font-mono text-xs font-semibold text-gray-700">
                                            {p.posId}
                                        </td>
                                        <td className="py-3.5 px-3 align-middle text-center font-bold text-gray-900">
                                            {p.totalLeads}
                                        </td>
                                        <td className="py-3.5 px-3 align-middle text-center text-blue-600 font-semibold">
                                            {p.pendingLeads}
                                        </td>
                                        <td className="py-3.5 px-3 align-middle text-center text-emerald-700 font-semibold">
                                            {p.convertedLeads}
                                        </td>
                                        <td className="py-3.5 px-3 align-middle text-center">
                                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs border border-amber-200">
                                                {p.conversionRate}%
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 align-middle text-right font-mono font-medium text-purple-700">
                                            ₹ {Number(p.totalQuotationValue || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-4 align-middle text-right font-mono font-bold text-emerald-700">
                                            ₹ {Number(p.convertedBusinessValue || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* All Leads & Quotations Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-bold bg-gray-50/90 select-none">
                                    <th className="text-left py-3.5 px-4 min-w-[200px]">Customer</th>
                                    <th className="text-left py-3.5 px-3 min-w-[150px]">Contact</th>
                                    <th className="text-left py-3.5 px-3 min-w-[210px]">POS Partner / Source</th>
                                    <th className="text-left py-3.5 px-3 min-w-[160px]">Quotation No & Date</th>
                                    <th className="text-right py-3.5 px-3 min-w-[120px]">Quote Amount</th>
                                    <th className="text-center py-3.5 px-3 min-w-[110px]">Lead Status</th>
                                    <th className="text-left py-3.5 px-3 min-w-[150px]">Linked Invoice</th>
                                    <th className="text-right py-3.5 px-4 min-w-[200px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-12 text-gray-400">No matching leads or quotations found</td></tr>
                                ) : filteredLeads.map((lead) => {
                                    const isConverted = lead.stage === 'converted' || lead.leadStatus === 'Converted' || !!lead.invoiceNumber || !!lead.invoiceNo;
                                    const quoteNo = lead.quotationNumber || lead.quotationNo;
                                    const invoiceNo = lead.invoiceNumber || lead.invoiceNo;
                                    const quoteAmt = parseFloat(lead.quotationAmount) || 0;
                                    const isAdminLead = isLeadAdmin(lead);
                                    const shopName = getLeadShopName(lead);
                                    const posId = getLeadPosId(lead);
                                    const ownerName = getLeadOwner(lead);

                                    return (
                                        <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                                            {/* 1. Customer */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <p className="font-semibold text-gray-900 text-sm leading-snug">{lead.customerName}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[220px] mt-0.5" title={lead.address || lead.district || ''}>
                                                    {lead.address || lead.district || '—'}
                                                </p>
                                            </td>

                                            {/* 2. Contact */}
                                            <td className="py-3.5 px-3 align-middle">
                                                <p className="text-gray-900 font-mono text-xs font-semibold">{lead.mobile || '—'}</p>
                                                <p className="text-[11px] text-gray-500 truncate max-w-[160px] mt-0.5" title={lead.email || ''}>
                                                    {lead.email || '—'}
                                                </p>
                                            </td>

                                            {/* 3. POS Partner / Source */}
                                            <td className="py-3.5 px-3 align-middle">
                                                {isAdminLead ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs flex-shrink-0">
                                                            HQ
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 text-xs truncate">REON Head Office</p>
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mt-0.5">
                                                                Admin Direct
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                                                            POS
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 text-xs truncate" title={shopName}>
                                                                {shopName}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                {posId && (
                                                                    <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                                        {posId}
                                                                    </span>
                                                                )}
                                                                {ownerName && (
                                                                    <span className="text-[10px] text-gray-500 truncate max-w-[120px]" title={ownerName}>
                                                                        {ownerName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* 4. Quotation No & Date */}
                                            <td className="py-3.5 px-3 align-middle">
                                                {quoteNo ? (
                                                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                                        {quoteNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                                <p className="text-[11px] text-gray-500 mt-1 font-medium">{formatDate(lead.quotationDate || lead.createdAt)}</p>
                                            </td>

                                            {/* 5. Quote Amount */}
                                            <td className="py-3.5 px-3 align-middle text-right">
                                                <p className="font-mono text-xs font-bold text-gray-900 whitespace-nowrap">
                                                    {quoteAmt > 0 ? `₹ ${quoteAmt.toLocaleString('en-IN')}` : '—'}
                                                </p>
                                                {lead.estimatedKw > 0 && (
                                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                                        {lead.estimatedKw} kW
                                                    </p>
                                                )}
                                            </td>

                                            {/* 6. Lead Status */}
                                            <td className="py-3.5 px-3 align-middle text-center">
                                                {isConverted ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                                        Converted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        Pending
                                                    </span>
                                                )}
                                            </td>

                                            {/* 7. Linked Invoice */}
                                            <td className="py-3.5 px-3 align-middle">
                                                {invoiceNo ? (
                                                    <div>
                                                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                                            {invoiceNo}
                                                        </span>
                                                        {lead.convertedAt && (
                                                            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{formatDate(lead.convertedAt)}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Not converted</span>
                                                )}
                                            </td>

                                            {/* 8. Actions */}
                                            <td className="py-3.5 px-4 align-middle text-right">
                                                <div className="inline-flex items-center justify-end gap-2">
                                                    {!isConverted && quoteNo && onSelectQuotationForInvoice && (
                                                        <button
                                                            onClick={() => onSelectQuotationForInvoice({
                                                                id: lead.quotationId,
                                                                offer_no: quoteNo,
                                                                customer_name: lead.customerName,
                                                                total_price: quoteAmt,
                                                                pos_name: shopName,
                                                                raw_data: {
                                                                    address: lead.address,
                                                                    mobile: lead.mobile,
                                                                    email: lead.email,
                                                                    system_capacity_kw: lead.estimatedKw,
                                                                }
                                                            })}
                                                            className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                                                            title="Generate invoice to convert this quotation"
                                                        >
                                                            Create Invoice
                                                        </button>
                                                    )}
                                                    <div className="relative">
                                                        <select
                                                            value={lead.stage}
                                                            onChange={(e) => handleStageUpdate(lead.id, e.target.value)}
                                                            className="appearance-none pl-2 pr-6 py-1 text-[11px] font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm cursor-pointer"
                                                        >
                                                            {Object.entries(STAGE_CONFIG).map(([key, val]) => (
                                                                <option key={key} value={key} className="text-gray-900 bg-white font-normal py-0.5">
                                                                    {val.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="w-3 h-3 text-gray-500 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
