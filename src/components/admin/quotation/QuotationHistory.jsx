import { useState, useEffect } from 'react'
import { API } from '../../../api'
import {
  Search, Download, Trash2, Eye, X, Filter,
  FileText, Loader, ChevronRight, Calendar,
  Users, Zap, IndianRupee, AlertCircle
} from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('en-IN')
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function Badge({ label, color }) {
  const colors = {
    domestic: 'bg-sky-100 text-sky-700',
    commercial: 'bg-purple-100 text-purple-700',
    Cash: 'bg-emerald/10 text-emerald-700',
    EMI: 'bg-solar/20 text-solar-700',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colors[label] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

function DetailModal({ quotation, onClose, onDownload }) {
  const emi = quotation.emi_details
    ? (typeof quotation.emi_details === 'string' ? JSON.parse(quotation.emi_details) : quotation.emi_details)
    : null

  const Row = ({ label, value }) => (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-navy text-right">{value || '—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mb-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-display font-bold text-navy text-lg">Quotation #{quotation.id}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(quotation.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer</p>
            <Row label="Name" value={quotation.customer_name} />
            <Row label="Address" value={quotation.address} />
            <Row label="Electricity Provider" value={quotation.electricity_provider} />
            <Row label="Monthly Bill" value={`₹ ${fmt(quotation.monthly_bill)}`} />
            <Row label="Type" value={<Badge label={quotation.installation_type} />} />
            <Row label="Payment" value={<Badge label={quotation.payment_mode} />} />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System</p>
            <Row label="System Size" value={`${quotation.system_size} kW`} />
            <Row label="Panels" value={`${quotation.panels}`} />
            <Row label="Panel Power" value={quotation.panel_power ? `${quotation.panel_power} W` : null} />
            <Row label="Area Required" value={`${quotation.area_required} sqft`} />
            <Row label="Monthly Generation" value={`${quotation.monthly_generation} units`} />
            <Row label="Monthly Savings" value={`₹ ${fmt(quotation.monthly_savings)}`} />
            <Row label="Annual Savings" value={`₹ ${fmt(Number(quotation.monthly_savings) * 12)}`} />
            {quotation.total_cost && <Row label="Total Cost" value={`₹ ${fmt(quotation.total_cost)}`} />}
          </div>

          {emi && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">EMI</p>
              <Row label="Monthly EMI" value={`₹ ${fmt(emi.monthly_emi)}`} />
              <Row label="Tenure" value={`${emi.months} months`} />
              <Row label="Interest Rate" value={`${emi.interest_rate}% p.a.`} />
              <Row label="Total Payable" value={`₹ ${fmt(emi.total_payable)}`} />
              <Row label="Total Interest" value={`₹ ${fmt(emi.total_interest)}`} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            Close
          </button>
          <button onClick={() => onDownload('pdf', quotation.id)}
            className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => onDownload('docx', quotation.id)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" /> DOCX
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuotationHistory() {
  const token = localStorage.getItem('reon_admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)

  const fetchQuotations = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)

      const res = await fetch(`${API}/api/quotation/list?${params}`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setQuotations(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuotations() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchQuotations()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quotation permanently?')) return
    try {
      await fetch(`${API}/api/quotation/${id}`, { method: 'DELETE', headers })
      setQuotations(q => q.filter(x => x.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleDownload = async (type, id) => {
    try {
      const res = await fetch(`${API}/api/quotation/${id}/${type}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `REON_Quotation_${id}.${type}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      alert('Download failed: ' + err.message)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFromDate('')
    setToDate('')
    setTimeout(fetchQuotations, 50)
  }

  // Summary stats
  const totalSavings = quotations.reduce((s, q) => s + Number(q.monthly_savings || 0), 0)
  const totalCapacity = quotations.reduce((s, q) => s + Number(q.system_size || 0), 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileText, label: 'Total Quotations', value: quotations.length, bg: 'bg-navy/5', color: 'text-navy' },
          { icon: Zap, label: 'Total Capacity', value: `${totalCapacity.toFixed(2)} kW`, bg: 'bg-solar/10', color: 'text-solar-700' },
          { icon: IndianRupee, label: 'Monthly Savings', value: `₹ ${fmt(Math.round(totalSavings))}`, bg: 'bg-emerald/10', color: 'text-emerald' },
        ].map(({ icon: Icon, label, value, bg, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-navy">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer name..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-emerald focus:outline-none text-gray-600" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-emerald focus:outline-none text-gray-600" />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="flex items-center gap-1.5 bg-emerald text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            {(search || fromDate || toDate) && (
              <button type="button" onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-display font-bold text-navy">Quotation History</h3>
          <p className="text-xs text-gray-400 mt-0.5">{quotations.length} records</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 text-emerald animate-spin" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No quotations found</p>
            <p className="text-xs mt-1">Generate your first quotation from the Create tab</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  <th className="text-left py-3 px-5">#</th>
                  <th className="text-left py-3 px-3">Customer</th>
                  <th className="text-left py-3 px-3 hidden lg:table-cell">System</th>
                  <th className="text-left py-3 px-3 hidden md:table-cell">Savings/mo</th>
                  <th className="text-left py-3 px-3 hidden sm:table-cell">Type</th>
                  <th className="text-left py-3 px-3 hidden xl:table-cell">Cost</th>
                  <th className="text-left py-3 px-3 hidden sm:table-cell">Date</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(q => (
                  <tr key={q.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelected(q)}>
                    <td className="py-3.5 px-5">
                      <span className="text-xs font-bold text-gray-400">#{q.id}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-navy">{q.customer_name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{q.address}</p>
                    </td>
                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <p className="font-medium text-navy">{q.system_size} kW</p>
                      <p className="text-xs text-gray-400">{q.panels} panels</p>
                    </td>
                    <td className="py-3.5 px-3 hidden md:table-cell">
                      <span className="font-semibold text-emerald">₹ {fmt(q.monthly_savings)}</span>
                    </td>
                    <td className="py-3.5 px-3 hidden sm:table-cell">
                      <Badge label={q.installation_type} />
                    </td>
                    <td className="py-3.5 px-3 hidden xl:table-cell text-navy font-medium">
                      {q.total_cost ? `₹ ${fmt(q.total_cost)}` : '—'}
                    </td>
                    <td className="py-3.5 px-3 hidden sm:table-cell text-xs text-gray-400">
                      {fmtDate(q.created_at)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(q)}
                          className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownload('pdf', q.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Download PDF">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownload('docx', q.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download DOCX">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(q.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          quotation={selected}
          onClose={() => setSelected(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}
