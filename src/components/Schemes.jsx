import { useRef, useEffect, useState } from 'react'
import { CheckCircle, Gift } from 'lucide-react'
import { API } from '../api'

const FALLBACK_SCHEMES = [
    {
        id: 'pm-surya-ghar', icon: '🏛️', badge: 'Central Govt.',
        name: 'PM Surya Ghar Muft Bijli Yojana',
        tagline: 'Free Electricity for 1 Crore Households',
        eligibility: ['Residential households', 'Must own the premises', 'Valid electricity connection'],
        subsidy_breakdown: [{ label: 'Up to 2 kW', value: '₹30,000/kW' }, { label: '2–3 kW', value: '₹18,000/kW' }, { label: 'Above 3 kW', value: '₹9,000/kW' }],
        reon_help: ['Free site survey & eligibility check', 'Full application support', 'DISCOM coordination'],
        total_subsidy: 'Up to ₹78,000', accent: 'from-navy to-navy/80', featured: true,
    },
    {
        id: 'alosree', icon: '🌞', badge: 'State Scheme',
        name: 'Alosree Solar Scheme', tagline: "Kerala Govt's Rooftop Solar Initiative",
        eligibility: ['Kerala residents', 'BPL and APL categories', 'Agricultural consumers'],
        subsidy_breakdown: [{ label: 'BPL Category', value: '40% subsidy' }, { label: 'APL Residential', value: '20% subsidy' }, { label: 'Agricultural', value: '30% subsidy' }],
        reon_help: ['Alosree portal registration', 'Document submission', 'KSEB net metering support'],
        total_subsidy: 'Up to 40% off', accent: 'from-emerald-700 to-emerald-600', featured: false,
    },
    {
        id: 'mnre', icon: '⚡', badge: 'Central Govt.',
        name: 'MNRE Solar Subsidy', tagline: 'Ministry of New & Renewable Energy Support',
        eligibility: ['Residential & institutional', 'Educational institutions', 'Hospitals & healthcare'],
        subsidy_breakdown: [{ label: 'General Category', value: '30% CFA' }, { label: 'NE States / Islands', value: '70% CFA' }, { label: 'SPV Water Pumps', value: '30% CFA' }],
        reon_help: ['MNRE vendor guidance', 'System design support', 'Audit & compliance docs'],
        total_subsidy: '30% – 70% CFA', accent: 'from-solar-700 to-solar-600', featured: false,
    },
    {
        id: 'pm-kusum', icon: '🌾', badge: 'Agricultural',
        name: 'PM-KUSUM Scheme', tagline: 'Solar for Farmers & Irrigation',
        eligibility: ['Farmers with agricultural land', 'Farmer producer organizations', 'Cooperatives & panchayats'],
        subsidy_breakdown: [{ label: 'Solar Pump', value: '60% subsidy' }, { label: 'Component A', value: '60% on lease' }, { label: 'Grid-connected', value: '30% subsidy' }],
        reon_help: ['Portal registration support', 'DPR preparation', 'End-to-end installation'],
        total_subsidy: 'Up to 60% off', accent: 'from-teal-700 to-teal-600', featured: false,
    },
]

export default function Schemes() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    const [schemes, setSchemes] = useState(FALLBACK_SCHEMES)

    useEffect(() => {
        fetch(`${API}/api/content/schemes`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                if (data.length > 0) {
                    setSchemes(data.map(s => ({
                        ...s,
                        subsidy_breakdown: typeof s.subsidy_breakdown === 'string' ? JSON.parse(s.subsidy_breakdown) : (s.subsidy_breakdown || []),
                    })))
                }
            })
            .catch(() => { /* keep fallback */ })
    }, [])

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.05 })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])

    return (
        <section id="schemes" className="py-20 bg-gray-50" aria-label="Government Solar Schemes">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                    <span className="section-tag">
                        <span className="text-base">🏛️</span>
                        Government Schemes
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-3">
                        Maximize Savings with <span className="gradient-text">Solar Subsidies</span>
                    </h2>
                    <p className="text-gray-500 text-base max-w-2xl mx-auto">
                        REON helps you avail every eligible government scheme — zero paperwork hassle, end-to-end support.
                    </p>
                </div>

                <div
                    ref={ref}
                    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
                      transition-all duration-700
                      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    {schemes.map((scheme, idx) => (
                        <article
                            key={scheme.id}
                            className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${scheme.accent}
                          shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300
                          flex flex-col`}
                            style={{ transitionDelay: `${idx * 80}ms` }}
                            itemScope
                            itemType="https://schema.org/GovernmentBenefit"
                        >
                            {scheme.featured && (
                                <div className="absolute top-0 left-0 right-0 bg-solar/90 text-navy text-[10px] font-black py-1 text-center tracking-widest uppercase">
                                    ⭐ Most Popular
                                </div>
                            )}

                            <div className={`p-5 flex flex-col flex-1 ${scheme.featured ? 'pt-7' : ''}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl">
                                        {scheme.icon}
                                    </div>
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                                        {scheme.badge}
                                    </span>
                                </div>

                                <h3 className="font-display font-bold text-white text-sm leading-tight mb-1" itemProp="name">
                                    {scheme.name}
                                </h3>
                                <p className="text-white/65 text-xs mb-3 leading-snug">{scheme.tagline}</p>

                                <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 mb-3">
                                    <Gift className="w-4 h-4 text-white flex-shrink-0" />
                                    <div>
                                        <p className="text-white/60 text-[10px] leading-none">Benefit</p>
                                        <p className="text-white font-bold text-sm leading-tight">{scheme.total_subsidy}</p>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1.5">Eligibility</p>
                                    <ul className="space-y-1">
                                        {(scheme.eligibility || []).map((e) => (
                                            <li key={e} className="flex items-start gap-1.5 text-white/80 text-xs">
                                                <CheckCircle className="w-3 h-3 text-white/60 flex-shrink-0 mt-0.5" />
                                                {e}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mb-3">
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1.5">Subsidy Breakdown</p>
                                    <div className="space-y-1">
                                        {(scheme.subsidy_breakdown || []).map((s) => (
                                            <div key={s.label} className="flex items-center justify-between bg-white/10 rounded-lg px-2.5 py-1.5 text-xs">
                                                <span className="text-white/70">{s.label}</span>
                                                <span className="font-bold text-white">{s.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1.5">REON Assists With</p>
                                    <ul className="space-y-1">
                                        {(scheme.reon_help || []).map((h) => (
                                            <li key={h} className="flex items-start gap-1.5 text-white/75 text-xs">
                                                <span className="w-1 h-1 bg-white/50 rounded-full flex-shrink-0 mt-1.5" />
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-8 bg-navy rounded-2xl p-7 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-left">
                        <h3 className="font-display font-bold text-white text-xl mb-1">
                            Not sure which scheme applies to you?
                        </h3>
                        <p className="text-white/55 text-sm">
                            Our experts will find the best combination for maximum savings.
                        </p>
                    </div>
                    <button
                        onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                        className="btn-primary flex-shrink-0 px-7 py-3"
                        aria-label="Get free scheme consultation"
                    >
                        Get Free Consultation
                    </button>
                </div>
            </div>
        </section>
    )
}
