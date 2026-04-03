import { useState, useEffect, useCallback } from 'react'
import { API } from '../../../api'
import {
  Calculator, Zap, Sun, DollarSign, Users, MapPin,
  Download, FileText, RefreshCw, CheckCircle, AlertCircle,
  ChevronDown, Loader
} from 'lucide-react'

const ELECTRICITY_RATES = { domestic: 8, commercial: 12.5 }

function calcSolar({ monthly_bill, installation_area, panel_size, panel_power, electricity_rate }) {
  const rate = Number(electricity_rate) || 8
  const mb = Number(monthly_bill) || 0
  const ia = Number(installation_area) || 0
  const ps = Number(panel_size) || 0
  const pp = Number(panel_power) || 1

  const raw_sys = mb / (30 * rate)
  const raw_panels = (raw_sys * 1000) / pp
  const eff_area = ps * 1.1
  const max_panels = ia / (eff_area || 1)
  const final_panels = Math.floor(Math.min(raw_panels, max_panels))
  const final_sys = (final_panels * pp) / 1000
  const monthly_gen = final_sys * 4 * 30
  const monthly_savings = monthly_gen * rate
  return {
    system_size: parseFloat(final_sys.toFixed(3)),
    panels: final_panels,
    area_required: parseFloat((final_panels * eff_area).toFixed(2)),
    monthly_generation: parseFloat(monthly_gen.toFixed(2)),
    monthly_savings: parseFloat(monthly_savings.toFixed(2)),
  }
}

function calcEMI(total_cost, months = 60, rate = 8.5) {
  const p = Number(total_cost)
  const r = rate / 100 / 12
  if (!p || !months) return null
  const emi = r === 0 ? p / months : (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  return {
    monthly_emi: Math.round(emi),
    months,
    interest_rate: rate,
    total_payable: Math.round(emi * months),
    total_interest: Math.round(emi * months - p),
  }
}

const fmt = (n) => Number(n || 0).toLocaleString('en-IN')

const Field = ({ label, children, span = 1 }) => (
  <div className={`${span === 2 ? 'sm:col-span-2' : ''}`}>
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
    {children}
  </div>
)

const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none text-navy placeholder-gray-400 transition-all'
const sel = `${inp} cursor-pointer`

export default function CreateQuotation() {
  const token = localStorage.getItem('reon_admin_token')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [form, setForm] = useState({
    customer_name: '', address: '', electricity_provider: '',
    monthly_bill: '', load_kw: '', power_factor: '0.9',
    installation_area: '', panel_size: '17.5', panel_power: '540',
    payment_mode: 'Cash', installation_type: 'domestic',
    electricity_rate: '8', cost_per_kw: '',
    emi_months: '60', emi_interest_rate: '8.5',
  })

  const [calcs, setCalcs] = useState(null)
  const [emiCalc, setEmiCalc] = useState(null)
  const [status, setStatus] = useState(null) // null | 'loading' | { success, id } | { error }
  const [generatedId, setGeneratedId] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-fill electricity rate when installation type changes
  useEffect(() => {
    set('electricity_rate', String(ELECTRICITY_RATES[form.installation_type] || 8))
  }, [form.installation_type])

  // Real-time calculations
  useEffect(() => {
    if (form.monthly_bill && form.installation_area && form.panel_size && form.panel_power) {
      const c = calcSolar(form)
      setCalcs(c)
      if (form.payment_mode === 'EMI' && form.cost_per_kw) {
        const total = c.system_size * Number(form.cost_per_kw)
        setEmiCalc(calcEMI(total, Number(form.emi_months), Number(form.emi_interest_rate)))
      } else setEmiCalc(null)
    } else {
      setCalcs(null)
      setEmiCalc(null)
    }
  }, [form])

  const handleGenerate = async () => {
    if (!form.customer_name || !form.monthly_bill) {
      setStatus({ error: 'Customer name and monthly bill are required.' })
      return
    }
    setStatus('loading')
    try {
      const res = await fetch(`${API}/api/quotation/generate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          ...form,
          monthly_bill: Number(form.monthly_bill),
          installation_area: Number(form.installation_area),
          panel_size: Number(form.panel_size),
          panel_power: Number(form.panel_power),
          electricity_rate: Number(form.electricity_rate),
          cost_per_kw: form.cost_per_kw ? Number(form.cost_per_kw) : null,
          emi_months: Number(form.emi_months),
          emi_interest_rate: Number(form.emi_interest_rate),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setGeneratedId(data.quotation.id)
      setStatus({ success: true, id: data.quotation.id })
    } catch (err) {
      setStatus({ error: err.message })
    }
  }

  const download = (type) => {
    const id = generatedId
    if (!id) return
    const url = `${API}/api/quotation/${id}/${type}?token=${token}`
    // Use fetch with auth header for download
    fetch(`${API}/api/quotation/${id}/${type}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `REON_Quotation_${id}.${type}`
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  const reset = () => {
    setGeneratedId(null)
    setStatus(null)
    setCalcs(null)
    setEmiCalc(null)
    setForm({
      customer_name: '', address: '', electricity_provider: '',
      monthly_bill: '', load_kw: '', power_factor: '0.9',
      installation_area: '', panel_size: '17.5', panel_power: '540',
      payment_mode: 'Cash', installation_type: 'domestic',
      electricity_rate: '8', cost_per_kw: '',
      emi_months: '60', emi_interest_rate: '8.5',
    })
  }

  return (
    <div className="space-y-5">
      {/* Success Banner */}
      {status?.success && (
        <div className="flex items-center justify-between bg-emerald/10 border border-emerald/30 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald" />
            <div>
              <p className="font-semibold text-emerald-700">Quotation #{generatedId} generated!</p>
              <p className="text-xs text-gray-500 mt-0.5">Download PDF or DOCX below</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => download('pdf')}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-600 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => download('docx')}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-3.5 h-3.5" /> DOCX
            </button>
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>
      )}

      {status?.error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{status.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── LEFT: Form ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-display font-bold text-navy">Customer Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Customer Name *">
                <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                  placeholder="e.g. Ramesh Kumar" className={inp} />
              </Field>
              <Field label="Electricity Provider">
                <input value={form.electricity_provider} onChange={e => set('electricity_provider', e.target.value)}
                  placeholder="e.g. WBSEDCL, BESCOM" className={inp} />
              </Field>
              <Field label="Address" span={2}>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Full address" className={inp} />
              </Field>
              <Field label="Installation Type">
                <select value={form.installation_type} onChange={e => set('installation_type', e.target.value)} className={sel}>
                  <option value="domestic">Domestic (₹8/unit)</option>
                  <option value="commercial">Commercial (₹12.5/unit)</option>
                </select>
              </Field>
              <Field label="Electricity Rate (₹/unit)">
                <input type="number" value={form.electricity_rate} onChange={e => set('electricity_rate', e.target.value)}
                  step="0.5" min="1" className={inp} />
              </Field>
              <Field label="Monthly Bill (₹) *">
                <input type="number" value={form.monthly_bill} onChange={e => set('monthly_bill', e.target.value)}
                  placeholder="e.g. 3500" className={inp} />
              </Field>
              <Field label="Payment Mode">
                <select value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)} className={sel}>
                  <option value="Cash">Cash</option>
                  <option value="EMI">EMI / Loan</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-solar/20 rounded-xl flex items-center justify-center">
                <Sun className="w-4 h-4 text-solar-700" />
              </div>
              <h3 className="font-display font-bold text-navy">Technical Specifications</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Installation Area (sqft) *">
                <input type="number" value={form.installation_area} onChange={e => set('installation_area', e.target.value)}
                  placeholder="e.g. 500" className={inp} />
              </Field>
              <Field label="Panel Size (sqft)">
                <input type="number" value={form.panel_size} onChange={e => set('panel_size', e.target.value)}
                  step="0.5" className={inp} />
              </Field>
              <Field label="Panel Power (W)">
                <select value={form.panel_power} onChange={e => set('panel_power', e.target.value)} className={sel}>
                  <option value="400">400W</option>
                  <option value="440">440W</option>
                  <option value="500">500W</option>
                  <option value="540">540W</option>
                  <option value="550">550W</option>
                  <option value="600">600W</option>
                  <option value="650">650W</option>
                </select>
              </Field>
              <Field label="Load (kW/kVA)">
                <input type="number" value={form.load_kw} onChange={e => set('load_kw', e.target.value)}
                  placeholder="Optional" step="0.1" className={inp} />
              </Field>
              <Field label="Power Factor">
                <input type="number" value={form.power_factor} onChange={e => set('power_factor', e.target.value)}
                  step="0.01" min="0" max="1" className={inp} />
              </Field>
              <Field label="Cost per kW (₹)">
                <input type="number" value={form.cost_per_kw} onChange={e => set('cost_per_kw', e.target.value)}
                  placeholder="e.g. 50000" className={inp} />
              </Field>
            </div>
          </div>

          {/* EMI Options */}
          {form.payment_mode === 'EMI' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-display font-bold text-navy">EMI Configuration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Loan Tenure (months)">
                  <select value={form.emi_months} onChange={e => set('emi_months', e.target.value)} className={sel}>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="48">48 months</option>
                    <option value="60">60 months</option>
                    <option value="84">84 months</option>
                    <option value="120">120 months</option>
                  </select>
                </Field>
                <Field label="Annual Interest Rate (%)">
                  <input type="number" value={form.emi_interest_rate} onChange={e => set('emi_interest_rate', e.target.value)}
                    step="0.1" min="0" className={inp} />
                </Field>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={status === 'loading'}
              className="flex items-center gap-2 bg-emerald text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-emerald disabled:opacity-60 disabled:cursor-not-allowed">
              {status === 'loading'
                ? <><Loader className="w-4 h-4 animate-spin" /> Generating...</>
                : <><Zap className="w-4 h-4" /> Generate Quotation</>}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Live Calculations Preview ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald/10 rounded-xl flex items-center justify-center">
                <Calculator className="w-4 h-4 text-emerald" />
              </div>
              <h3 className="font-display font-bold text-navy">Live Calculations</h3>
            </div>

            {!calcs ? (
              <div className="text-center py-8 text-gray-400">
                <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Fill Monthly Bill, Area,<br/>Panel Size &amp; Panel Power</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'System Size', value: `${calcs.system_size} kW`, color: 'text-emerald', bg: 'bg-emerald/5' },
                  { label: 'No. of Panels', value: `${calcs.panels}`, color: 'text-navy', bg: 'bg-navy/5' },
                  { label: 'Area Required', value: `${calcs.area_required} sqft`, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Monthly Generation', value: `${calcs.monthly_generation} units`, color: 'text-solar-700', bg: 'bg-solar/10' },
                  { label: 'Monthly Savings', value: `₹ ${fmt(calcs.monthly_savings)}`, color: 'text-emerald', bg: 'bg-emerald/10' },
                  { label: 'Annual Savings', value: `₹ ${fmt(calcs.monthly_savings * 12)}`, color: 'text-emerald', bg: 'bg-emerald/5' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`flex items-center justify-between ${bg} rounded-xl px-3.5 py-2.5`}>
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}

                {form.cost_per_kw && (
                  <div className="flex items-center justify-between bg-purple-50 rounded-xl px-3.5 py-2.5">
                    <span className="text-xs font-medium text-gray-500">Total Cost</span>
                    <span className="text-sm font-bold text-purple-700">
                      ₹ {fmt(calcs.system_size * Number(form.cost_per_kw))}
                    </span>
                  </div>
                )}

                {form.cost_per_kw && calcs.monthly_savings > 0 && (
                  <div className="mt-1 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center">
                      Payback period ≈{' '}
                      <span className="font-bold text-emerald">
                        {((calcs.system_size * Number(form.cost_per_kw)) / calcs.monthly_savings / 12).toFixed(1)} years
                      </span>
                    </p>
                  </div>
                )}

                {emiCalc && (
                  <div className="mt-1 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">EMI Breakdown</p>
                    {[
                      { label: 'Monthly EMI', value: `₹ ${fmt(emiCalc.monthly_emi)}` },
                      { label: 'Total Payable', value: `₹ ${fmt(emiCalc.total_payable)}` },
                      { label: 'Total Interest', value: `₹ ${fmt(emiCalc.total_interest)}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between bg-purple-50 rounded-xl px-3.5 py-2">
                        <span className="text-xs font-medium text-gray-500">{label}</span>
                        <span className="text-sm font-bold text-purple-700">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
