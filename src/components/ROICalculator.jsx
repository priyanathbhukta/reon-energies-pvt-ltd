import { useState } from 'react'
import { Calculator, TrendingUp, Zap } from 'lucide-react'

const propertyTypes = ['Home', 'Office', 'Warehouse', 'Shed']

function calcResults(area, consumption, type) {
    const efficiencyMap = { Home: 0.78, Office: 0.82, Warehouse: 0.88, Shed: 0.70 }
    const eff = efficiencyMap[type] || 0.78
    const capacityKW = (area * 0.01 * eff).toFixed(1)
    const annualGeneration = (capacityKW * 1400).toFixed(0) // avg 1400 kWh/kW/year in India
    const monthlySaving = Math.min(consumption * 6.5, annualGeneration / 12 * 6.5).toFixed(0)
    const annualSaving = (monthlySaving * 12).toFixed(0)
    const systemCost = (capacityKW * 55000).toFixed(0)
    const payback = (systemCost / annualSaving).toFixed(1)
    const co2Saved = (annualGeneration * 0.82 / 1000).toFixed(1)
    return { capacityKW, annualGeneration, monthlySaving, annualSaving, systemCost, payback, co2Saved }
}

export default function ROICalculator() {
    const [area, setArea] = useState('')
    const [consumption, setConsumption] = useState('')
    const [type, setType] = useState('Home')
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleCalc = (e) => {
        e.preventDefault()
        if (!area || !consumption) return
        setLoading(true)
        setTimeout(() => {
            setResults(calcResults(Number(area), Number(consumption), type))
            setLoading(false)
        }, 600)
    }

    return (
        <section
            id="calculator"
            className="py-20 bg-hero-gradient relative overflow-hidden"
            aria-label="Solar ROI Calculator"
        >
            {/* Bg blobs */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-solar/10 rounded-full blur-3xl" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 bg-emerald/20 border border-emerald/30 text-emerald font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
                        <Calculator className="w-4 h-4" />
                        Solar ROI Calculator
                    </span>
                    <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mb-4">
                        Calculate Your{' '}
                        <span className="gradient-text">Solar Savings</span>
                    </h2>
                    <p className="text-white/65 text-lg max-w-xl mx-auto">
                        Enter your details below to instantly estimate your solar ROI, monthly savings, and payback period.
                    </p>
                </div>

                {/* Glassmorphism card */}
                <div className="glass-card p-8 sm:p-10">
                    <form onSubmit={handleCalc} noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Roof Area */}
                            <div>
                                <label className="block text-white/90 font-semibold text-sm mb-2" htmlFor="roofArea">
                                    Roof Area (sq ft)
                                </label>
                                <input
                                    id="roofArea"
                                    type="number"
                                    min="50"
                                    max="50000"
                                    placeholder="e.g. 1000"
                                    value={area}
                                    onChange={e => setArea(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 focus:border-emerald focus:ring-2 focus:ring-emerald/30 focus:outline-none transition-all"
                                    required
                                    aria-label="Roof area in square feet"
                                />
                            </div>

                            {/* Monthly Consumption */}
                            <div>
                                <label className="block text-white/90 font-semibold text-sm mb-2" htmlFor="monthlyConsumption">
                                    Monthly Consumption (kWh)
                                </label>
                                <input
                                    id="monthlyConsumption"
                                    type="number"
                                    min="10"
                                    max="10000"
                                    placeholder="e.g. 300"
                                    value={consumption}
                                    onChange={e => setConsumption(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/40 focus:border-emerald focus:ring-2 focus:ring-emerald/30 focus:outline-none transition-all"
                                    required
                                    aria-label="Monthly electricity consumption in kWh"
                                />
                            </div>

                            {/* Property Type */}
                            <div>
                                <label className="block text-white/90 font-semibold text-sm mb-2" htmlFor="propertyType">
                                    Property Type
                                </label>
                                <select
                                    id="propertyType"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-white focus:border-emerald focus:ring-2 focus:ring-emerald/30 focus:outline-none transition-all cursor-pointer appearance-none"
                                    aria-label="Property type"
                                >
                                    {propertyTypes.map(t => (
                                        <option key={t} value={t} className="bg-navy text-white">{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                type="submit"
                                disabled={loading || !area || !consumption}
                                className="px-10 py-4 rounded-full font-bold text-white text-base
                           bg-cta-gradient shadow-emerald
                           hover:scale-105 hover:shadow-xl active:scale-95
                           disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed
                           transition-all duration-200 flex items-center gap-2"
                                aria-label="Calculate solar savings"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        Calculate My Savings
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Results */}
                    {results && (
                        <div className="mt-10 pt-8 border-t border-white/15">
                            <h3 className="text-white font-bold text-xl text-center mb-6 flex items-center justify-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald" />
                                Your Solar Savings Estimate
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'System Capacity', value: `${results.capacityKW} kW`, icon: '⚡' },
                                    { label: 'Annual Generation', value: `${Number(results.annualGeneration).toLocaleString()} kWh`, icon: '☀️' },
                                    { label: 'Monthly Saving', value: `₹${Number(results.monthlySaving).toLocaleString()}`, icon: '💰', highlight: true },
                                    { label: 'Annual Saving', value: `₹${Number(results.annualSaving).toLocaleString()}`, icon: '📈', highlight: true },
                                    { label: 'System Cost Est.', value: `₹${Number(results.systemCost).toLocaleString()}`, icon: '🏷️' },
                                    { label: 'Payback Period', value: `${results.payback} yrs`, icon: '📅' },
                                    { label: 'CO₂ Saved/yr', value: `${results.co2Saved} tons`, icon: '🌿' },
                                    { label: 'ROI at 25 yrs', value: '300%+', icon: '🏆', highlight: true },
                                ].map(({ label, value, icon, highlight }) => (
                                    <div
                                        key={label}
                                        className={`rounded-xl p-4 text-center transition-all ${highlight
                                                ? 'bg-emerald/25 border border-emerald/40'
                                                : 'bg-white/10 border border-white/15'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{icon}</div>
                                        <div className={`font-bold text-lg ${highlight ? 'text-emerald' : 'text-white'}`}>
                                            {value}
                                        </div>
                                        <div className="text-white/55 text-xs mt-0.5">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-white/40 text-xs text-center mt-6">
                                * Estimates based on average Indian solar irradiance and prevailing electricity tariffs. Actual values may vary. Contact REON for a precise assessment.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
