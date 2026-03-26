import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Users, UserCheck, UserPlus, TrendingUp, IndianRupee,
    LogOut, RefreshCw, Search, Trash2,
    BarChart3, Zap, Phone, Mail, MapPin,
    ArrowUpRight, ArrowDownRight, Filter,
    LayoutGrid, MessageSquare, Image, FileText,
    Plus, X, Save, Edit2, Star
} from 'lucide-react'

const STATUS_CONFIG = {
    new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
    contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
    converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700' },
    lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
}

const TABS = [
    { id: 'enquiries', label: 'Enquiries', icon: Users },
    { id: 'schemes', label: 'Schemes', icon: FileText },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { id: 'gallery', label: 'Gallery', icon: Image },
]

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('enquiries')
    const [stats, setStats] = useState(null)
    const [enquiries, setEnquiries] = useState([])
    const [schemes, setSchemes] = useState([])
    const [testimonials, setTestimonials] = useState([])
    const [gallery, setGallery] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRow, setExpandedRow] = useState(null)
    const [editModal, setEditModal] = useState(null) // { type, data, isNew }

    const token = localStorage.getItem('reon_admin_token')
    const adminUser = JSON.parse(localStorage.getItem('reon_admin_user') || '{}')
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

    useEffect(() => {
        if (!token) { navigate('/admin/login'); return }
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [statsRes, enquiriesRes, schemesRes, testimonialsRes, galleryRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }),
                fetch('/api/enquiries', { headers }),
                fetch('/api/content/schemes', { headers }),
                fetch('/api/content/testimonials', { headers }),
                fetch('/api/content/gallery', { headers }),
            ])
            if (statsRes.status === 401) { localStorage.removeItem('reon_admin_token'); navigate('/admin/login'); return }
            setStats(await statsRes.json())
            setEnquiries(await enquiriesRes.json())
            setSchemes(await schemesRes.json())
            setTestimonials(await testimonialsRes.json())
            setGallery(await galleryRes.json())
        } catch (err) { console.error('Fetch error:', err) }
        finally { setLoading(false) }
    }

    const updateStatus = async (id, status) => {
        await fetch(`/api/enquiries/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) })
        fetchAll()
    }

    const deleteEnquiry = async (id) => {
        if (!window.confirm('Delete this enquiry?')) return
        await fetch(`/api/enquiries/${id}`, { method: 'DELETE', headers })
        fetchAll()
    }

    const handleLogout = () => {
        localStorage.removeItem('reon_admin_token')
        localStorage.removeItem('reon_admin_user')
        navigate('/admin/login')
    }

    // Content CRUD helpers
    const saveContent = async (type, data, isNew) => {
        const url = isNew ? `/api/content/${type}` : `/api/content/${type}/${data.id}`
        const method = isNew ? 'POST' : 'PUT'
        await fetch(url, { method, headers, body: JSON.stringify(data) })
        setEditModal(null)
        fetchAll()
    }

    const deleteContent = async (type, id) => {
        if (!window.confirm('Delete this item?')) return
        await fetch(`/api/content/${type}/${id}`, { method: 'DELETE', headers })
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald/10 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-emerald" />
                        </div>
                        <div>
                            <h1 className="text-lg font-display font-bold text-navy leading-tight">REON Admin</h1>
                            <p className="text-xs text-gray-400 -mt-0.5">Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-emerald hover:bg-emerald/5 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw className="w-4.5 h-4.5" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-7 h-7 bg-navy/8 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-bold text-navy">{adminUser.username?.[0]?.toUpperCase()}</span>
                            </div>
                            <span className="font-medium">{adminUser.username}</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-lg">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm mb-6 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-emerald text-white shadow-sm'
                                    : 'text-gray-500 hover:text-navy hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                                {tab.id === 'enquiries' ? enquiries.length : tab.id === 'schemes' ? schemes.length : tab.id === 'testimonials' ? testimonials.length : gallery.length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'enquiries' && <EnquiriesTab {...{ filtered, filter, setFilter, searchTerm, setSearchTerm, expandedRow, setExpandedRow, updateStatus, deleteEnquiry, formatDate, formatCurrency }} />}
                {activeTab === 'schemes' && <SchemesTab schemes={schemes} onEdit={(s) => setEditModal({ type: 'schemes', data: s, isNew: false })} onAdd={() => setEditModal({ type: 'schemes', data: { icon: '☀️', badge: '', name: '', tagline: '', eligibility: [''], subsidy_breakdown: [{ label: '', value: '' }], reon_help: [''], total_subsidy: '', accent: 'from-emerald-700 to-emerald-600', featured: false, sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('schemes', id)} />}
                {activeTab === 'testimonials' && <TestimonialsTab testimonials={testimonials} onEdit={(t) => setEditModal({ type: 'testimonials', data: t, isNew: false })} onAdd={() => setEditModal({ type: 'testimonials', data: { name: '', role: '', rating: 5, review: '', avatar_initials: '', avatar_color: 'bg-emerald', date_label: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('testimonials', id)} />}
                {activeTab === 'gallery' && <GalleryTab gallery={gallery} onEdit={(g) => setEditModal({ type: 'gallery', data: g, isNew: false })} onAdd={() => setEditModal({ type: 'gallery', data: { image_url: '', alt_text: '', label: '', sort_order: 0 }, isNew: true })} onDelete={(id) => deleteContent('gallery', id)} />}
            </main>

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
                        {isNew ? 'Add' : 'Edit'} {type === 'schemes' ? 'Scheme' : type === 'testimonials' ? 'Testimonial' : 'Gallery Image'}
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
