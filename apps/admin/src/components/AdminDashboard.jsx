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
    Briefcase, FolderOpen, Building2
} from 'lucide-react'
import QuotationForm from './QuotationForm'
import InvoiceForm from './InvoiceForm'
import ProjectsTab from './projects/ProjectsTab'

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
                fetch(`${API}/api/pos/partners?limit=100`, { headers, cache: 'no-store' }),
                fetch(`${API}/api/leads?limit=100`, { headers, cache: 'no-store' }),
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
                    <div className="max-w-6xl mx-auto">
                        {activeTab === 'enquiries' && <EnquiriesTab {...{ filtered, filter, setFilter, searchTerm, setSearchTerm, expandedRow, setExpandedRow, updateStatus, deleteEnquiry, formatDate, formatCurrency }} />}
                        {activeTab === 'pos_partners' && <PosPartnersTab partners={posPartners} onRefresh={fetchAll} headers={headers} formatDate={formatDate} />}
                        {activeTab === 'leads' && <LeadsTab leads={leads} onRefresh={fetchAll} headers={headers} formatDate={formatDate} />}
                        {activeTab === 'projects' && <ProjectsTab />}
                        {activeTab === 'schemes' && <SchemesTab schemes={schemes} onEdit={(s) => setEditModal({ type: 'schemes', data: s, isNew: false })} onAdd={() => setEditModal({ type: 'schemes', data: { icon: '☀️', badge: '', name: '', tagline: '', eligibility: [''], subsidy_breakdown: [{ label: '', value: '' }], reon_help: [''], total_subsidy: '', accent: 'from-emerald-700 to-emerald-600', featured: false, sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('schemes', id)} />}
                        {activeTab === 'testimonials' && <TestimonialsTab testimonials={testimonials} onEdit={(t) => setEditModal({ type: 'testimonials', data: t, isNew: false })} onAdd={() => setEditModal({ type: 'testimonials', data: { name: '', role: '', rating: 5, review: '', avatar_initials: '', avatar_color: 'bg-emerald', date_label: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('testimonials', id)} />}
                        {activeTab === 'gallery' && <GalleryTab gallery={gallery} onEdit={(g) => setEditModal({ type: 'gallery', data: g, isNew: false })} onAdd={() => setEditModal({ type: 'gallery', data: { image_url: '', alt_text: '', label: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('gallery', id)} />}
                        {activeTab === 'directors' && <DirectorsTab directors={directors} onEdit={(d) => setEditModal({ type: 'directors', data: d, isNew: false })} onAdd={() => setEditModal({ type: 'directors', data: { name: '', role: '', description: '', image_url: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('directors', id)} />}
                        {activeTab === 'quotation' && <QuotationTab editData={editQuotationData} onClearEdit={() => setEditQuotationData(null)} />}
                        {activeTab === 'invoice' && <InvoiceTab editData={editInvoiceData} onClearEdit={() => setEditInvoiceData(null)} />}
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

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-display font-bold text-navy">POS Partners</h2>
                <p className="text-sm text-gray-400">Manage your Point of Sales partners ({partners.length})</p>
            </div>
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
                        {partners.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-12 text-gray-400">No POS Partners found</td></tr>
                        ) : partners.map((p) => (
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
                                <td className="py-3.5 px-5 text-right space-x-2">
                                    <button onClick={() => handleViewDetails(p.id)} className="text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100">View Details</button>
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
function InvoiceTab({ editData, onClearEdit }) {
    return (
        <div className="space-y-5">
            <InvoiceForm editData={editData} onClearEdit={onClearEdit} />
        </div>
    )
}

// ========== ENQUIRIES TAB ==========
function EnquiriesTab({ filtered, filter, setFilter, searchTerm, setSearchTerm, expandedRow, setExpandedRow, updateStatus, deleteEnquiry, formatDate, formatCurrency }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-display font-bold text-navy">Customer Enquiries</h2>
                        <p className="text-sm text-gray-400">{filtered.length} found</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none w-48 transition-all" />
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

// ========== GENERATED DOCUMENTS TAB ==========
function GeneratedDocumentsTab({ onEditInvoice, onEditQuotation }) {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [otpModal, setOtpModal] = useState({ show: false, doc: null, loading: false, error: '' })
    const [otpInput, setOtpInput] = useState('')

    const token = localStorage.getItem('reon_admin_token')
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

    const fetchDocuments = async () => {
        setLoading(true)
        try {
            const [quotesRes, invRes] = await Promise.all([
                fetch(`${API}/api/admin/quotations`, { headers }),
                fetch(`${API}/api/admin/invoices`, { headers })
            ])
            const quotes = await quotesRes.json()
            const invoices = await invRes.json()

            const formattedQuotes = (Array.isArray(quotes) ? quotes : []).map(q => {
                let rawData = q;
                if (q.raw_data) {
                    try {
                        rawData = typeof q.raw_data === 'string' ? JSON.parse(q.raw_data) : q.raw_data;
                    } catch (e) {}
                }
                return {
                    id: q.id,
                    type: 'Quotation',
                    customerName: q.customer_name || 'Unknown',
                    refNo: q.offer_no,
                    date: new Date(q.created_at),
                    pdfUrl: q.pdf_url,
                    raw: rawData,
                    hasRaw: !!q.raw_data
                };
            })

            const formattedInvoices = (Array.isArray(invoices) ? invoices : []).map(inv => {
                let customerName = 'Unknown'
                try {
                    const details = typeof inv.customer_details === 'string' ? JSON.parse(inv.customer_details) : inv.customer_details
                    if (details?.name) customerName = details.name
                } catch (e) {}

                return {
                    id: inv.id,
                    type: 'Invoice',
                    customerName,
                    refNo: inv.invoice_no,
                    date: new Date(inv.created_at),
                    pdfUrl: inv.pdf_url,
                    raw: inv
                }
            })

            const combined = [...formattedQuotes, ...formattedInvoices].sort((a, b) => b.date - a.date)
            setDocuments(combined)
        } catch (err) {
            console.error("Failed to fetch documents", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const triggerDelete = async (doc) => {
        setOtpModal({ show: true, doc, loading: true, error: '' })
        try {
            const res = await fetch(`${API}/api/auth/send-otp`, { method: 'POST', headers })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Failed to send OTP')
            setOtpModal(p => ({ ...p, loading: false }))
        } catch (err) {
            setOtpModal(p => ({ ...p, loading: false, error: err.message }))
        }
    }

    const confirmDelete = async () => {
        if (otpInput.length !== 6) return setOtpModal(p => ({ ...p, error: 'Enter 6-digit OTP' }))
        setOtpModal(p => ({ ...p, loading: true, error: '' }))
        try {
            // Verify OTP
            const verifyRes = await fetch(`${API}/api/auth/verify-otp`, {
                method: 'POST', headers, body: JSON.stringify({ otp: otpInput })
            })
            const verifyData = await verifyRes.json()
            if (!verifyData.success) throw new Error(verifyData.error || 'Invalid OTP')

            // Delete doc
            const endpoint = otpModal.doc.type === 'Invoice' ? 'invoices' : 'quotations'
            const delRes = await fetch(`${API}/api/admin/${endpoint}/${otpModal.doc.id}`, { method: 'DELETE', headers })
            if (!delRes.ok) throw new Error('Failed to delete')

            setOtpModal({ show: false, doc: null, loading: false, error: '' })
            setOtpInput('')
            fetchDocuments()
        } catch (err) {
            setOtpModal(p => ({ ...p, loading: false, error: err.message }))
        }
    }

    if (loading && documents.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center mt-6">
                <div className="w-8 h-8 border-3 border-emerald/30 border-t-emerald rounded-full animate-spin mb-3" />
                <p className="text-gray-500 font-medium">Loading documents...</p>
            </div>
        )
    }

    const quotes = documents.filter(d => d.type === 'Quotation')
    const invoices = documents.filter(d => d.type === 'Invoice')

    const renderTable = (items, type) => (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-display font-bold text-navy">{type}s <span className="text-gray-400 text-sm font-normal ml-2">({items.length})</span></h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-4">Details</th>
                            <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="2" className="text-center py-8 text-gray-400 font-medium">No {type}s found.</td></tr>
                        ) : items.map(doc => (
                            <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-3 px-4">
                                    <p className="font-semibold text-navy mb-0.5">{doc.customerName}_{doc.type}</p>
                                    <p className="text-xs text-gray-500 flex gap-2">
                                        <span>{doc.refNo}</span> • <span>{doc.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    </p>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {doc.pdfUrl ? (
                                            <a href={doc.pdfUrl.startsWith('/pdfs/') ? `${API}${doc.pdfUrl}` : doc.pdfUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-emerald hover:bg-emerald/10 rounded-lg transition-colors" title="View PDF">
                                                <FileDown className="w-4 h-4" />
                                            </a>
                                        ) : (
                                            <span className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded font-semibold mr-1" title="Render Ephemeral Disk Wiped Old PDFs">Missing</span>
                                        )}
                                        {type === 'Quotation' && doc.hasRaw && (
                                            <button onClick={() => onEditQuotation(doc.raw)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {type === 'Invoice' && (
                                            <button onClick={() => onEditInvoice(doc.raw)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => triggerDelete(doc)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )

    return (
        <div className="mt-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {renderTable(quotes, 'Quotation')}
                {renderTable(invoices, 'Invoice')}
            </div>

            {/* OTP Modal */}
            {otpModal.show && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-navy mb-2">Delete Document</h3>
                        <p className="text-sm text-gray-500 mb-4">An OTP has been sent to <b>support@reonenergy.in</b>. Please enter it below to confirm deletion of <b className="text-navy">{otpModal.doc?.refNo}</b>.</p>
                        
                        <input 
                            type="text" 
                            maxLength={6} 
                            placeholder="Enter 6-digit OTP" 
                            value={otpInput} 
                            onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full text-center tracking-[0.5em] text-lg font-bold py-3 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none mb-2"
                        />
                        {otpModal.error && <p className="text-xs text-red-500 font-medium text-center mb-4">{otpModal.error}</p>}
                        
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setOtpModal({ show: false }); setOtpInput(''); }} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={confirmDelete} disabled={otpModal.loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-70">
                                {otpModal.loading ? 'Verifying...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ========== POS LEADS TAB ==========
function LeadsTab({ leads, onRefresh, headers, formatDate }) {
    const [stageFilter, setStageFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const STAGE_CONFIG = {
        new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
        contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
        site_visit_scheduled: { label: 'Site Visit', color: 'bg-purple-100 text-purple-700' },
        quotation_sent: { label: 'Quotation Sent', color: 'bg-indigo-100 text-indigo-700' },
        negotiation: { label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
        converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700' },
        lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
    };

    const PRIORITY_CONFIG = {
        low: 'bg-gray-100 text-gray-600',
        medium: 'bg-blue-50 text-blue-600',
        high: 'bg-orange-50 text-orange-600',
        urgent: 'bg-red-50 text-red-600',
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

    const filteredLeads = leads.filter(l => {
        if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (l.customerName || '').toLowerCase().includes(term) ||
                   (l.mobile || '').includes(term) ||
                   (l.partnerShopName || '').toLowerCase().includes(term);
        }
        return true;
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-display font-bold text-navy">POS Leads</h2>
                    <p className="text-sm text-gray-400">Leads submitted by POS partners ({leads.length} total)</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                    >
                        <option value="all">All Stages</option>
                        {Object.entries(STAGE_CONFIG).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                    <button onClick={onRefresh} className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                            <th className="text-left py-3 px-5">Customer</th>
                            <th className="text-left py-3 px-3">Contact</th>
                            <th className="text-left py-3 px-3">POS Partner</th>
                            <th className="text-left py-3 px-3">Stage</th>
                            <th className="text-left py-3 px-3">Priority</th>
                            <th className="text-left py-3 px-3">Est. kW</th>
                            <th className="text-left py-3 px-3">Date</th>
                            <th className="text-right py-3 px-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.length === 0 ? (
                            <tr><td colSpan="8" className="text-center py-12 text-gray-400">No leads found</td></tr>
                        ) : filteredLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-3.5 px-5">
                                    <p className="font-semibold text-navy">{lead.customerName}</p>
                                    <p className="text-xs text-gray-400">{lead.address || lead.district || '—'}</p>
                                </td>
                                <td className="py-3.5 px-3">
                                    <p className="text-gray-600">{lead.mobile}</p>
                                    <p className="text-xs text-gray-400">{lead.email || '—'}</p>
                                </td>
                                <td className="py-3.5 px-3">
                                    <p className="text-gray-700 font-medium">{lead.partnerShopName || '—'}</p>
                                    <p className="text-xs text-gray-400">{lead.source || 'pos_partner'}</p>
                                </td>
                                <td className="py-3.5 px-3">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_CONFIG[lead.stage]?.color || 'bg-gray-100 text-gray-600'}`}>
                                        {STAGE_CONFIG[lead.stage]?.label || lead.stage}
                                    </span>
                                </td>
                                <td className="py-3.5 px-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[lead.priority] || 'bg-gray-100 text-gray-600'}`}>
                                        {(lead.priority || 'medium').toUpperCase()}
                                    </span>
                                </td>
                                <td className="py-3.5 px-3 text-gray-600 font-medium">
                                    {lead.estimatedKw ? `${lead.estimatedKw} kW` : '—'}
                                </td>
                                <td className="py-3.5 px-3 text-gray-400 text-xs">
                                    {formatDate(lead.createdAt)}
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                    <select
                                        value={lead.stage}
                                        onChange={(e) => handleStageUpdate(lead.id, e.target.value)}
                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 bg-white"
                                    >
                                        {Object.entries(STAGE_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
