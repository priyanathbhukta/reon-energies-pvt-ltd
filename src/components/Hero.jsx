import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, Leaf, Shield, Award } from 'lucide-react'

const stats = [
    { value: '15+', label: 'Installations' },
    { value: '100kW+', label: 'Capacity Installed' },
    { value: '₹10L+', label: 'Customer Savings' },
    { value: '94%', label: 'Satisfaction Rate' },
]

const badges = [
    { icon: Shield, text: 'Installed across WB' },
    { icon: Award, text: 'Expert engineers' },
    { icon: Leaf, text: 'End-to-end service' },
]

export default function Hero() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100)
        return () => clearTimeout(timer)
    }, [])

    const scrollTo = (id) => {
        document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <section
            id="hero"
            className="relative min-h-screen bg-hero-gradient overflow-hidden flex items-center"
            aria-label="Hero - Power Your Future"
        >
            {/* Decorative background circles */}
            <div className="absolute top-20 right-10 w-96 h-96 bg-emerald/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-10 w-64 h-64 bg-solar/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-navy/30 rounded-full blur-3xl pointer-events-none" />

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        width: `${20 + i * 15}px`,
                        height: `${20 + i * 15}px`,
                        top: `${15 + i * 12}%`,
                        left: `${5 + i * 15}%`,
                        animationDelay: `${i * 0.8}s`,
                        animationDuration: `${4 + i * 0.5}s`,
                    }}
                />
            ))}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">
                    {/* Left Content — 60% */}
                    <div
                        className={`lg:col-span-3 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-emerald/20 border border-emerald/30 text-emerald font-semibold text-sm px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
                            <span className="w-2 h-2 bg-emerald rounded-full animate-pulse-slow" />
                            West Bengal's Premier Solar Company
                        </div>

                        {/* H1 */}
                        <h1 className="font-display font-black text-white leading-[1.05] mb-6">
                            <span className="text-4xl sm:text-5xl lg:text-6xl block">Reduce Your</span>
                            <span className="text-4xl sm:text-5xl lg:text-6xl block">Electricity Bill</span>
                            <span className="text-4xl sm:text-5xl lg:text-6xl block gradient-text">to ZERO</span>
                        </h1>

                        <p className="text-white/75 text-lg sm:text-xl leading-relaxed mb-6 max-w-xl">
                            Affordable solar solutions for every home in West Bengal
                        </p>

                        {/* Benefits Section */}
                        <ul className="space-y-3 mb-8">
                            {[
                                'No upfront investment',
                                'EMI less than electricity bill',
                                'ROI in 2.5–3 years',
                                '25+ years savings'
                            ].map((text) => (
                                <li key={text} className="flex items-center gap-3 text-white/90 text-lg">
                                    <div className="w-5 h-5 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-emerald text-sm">✔</span>
                                    </div>
                                    {text}
                                </li>
                            ))}
                        </ul>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-3 mb-10">
                            {badges.map(({ icon: Icon, text }) => (
                                <span
                                    key={text}
                                    className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm"
                                >
                                    <Icon className="w-3.5 h-3.5 text-emerald" />
                                    {text}
                                </span>
                            ))}
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => scrollTo('#contact')}
                                className="btn-primary text-base px-8 py-4 shadow-emerald hover:scale-105"
                                aria-label="Get Free Quote"
                            >
                                Get Free Quote
                                <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => scrollTo('#services')}
                                className="border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 active:scale-95 transition-all duration-200 inline-flex items-center gap-2 backdrop-blur-sm"
                                aria-label="Book Site Visit"
                            >
                                Book Site Visit
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Right Image — 40% */}
                    <div
                        className={`lg:col-span-2 transition-all duration-1000 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                    >
                        <div className="relative">
                            {/* Glow ring */}
                            <div className="absolute inset-0 bg-emerald/20 rounded-3xl blur-2xl scale-110" />
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                                <img
                                    src="/assets/hero_rooftop_solar.png"
                                    alt="Solar panels installation on rooftop — REON Energy"
                                    className="w-full h-[400px] lg:h-[500px] object-cover"
                                    loading="eager"
                                />
                                {/* Overlay gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
                                {/* Floating stat card */}
                                <div className="absolute bottom-6 left-6 right-6 glass-card p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald rounded-xl flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">⚡</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Live Energy Saving</p>
                                            <p className="text-emerald font-semibold text-xs">↑ 82% efficiency today</p>
                                        </div>
                                        <div className="ml-auto">
                                            <div className="w-12 h-6 bg-emerald/20 rounded-full flex items-center justify-end px-1">
                                                <div className="w-4 h-4 bg-emerald rounded-full animate-pulse-slow" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div
                    className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-1000 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    {stats.map(({ value, label }) => (
                        <div
                            key={label}
                            className="text-center p-5 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm hover:bg-white/12 transition-all"
                        >
                            <div className="font-display font-black text-3xl text-white mb-1">{value}</div>
                            <div className="text-white/60 text-sm font-medium">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                <span className="text-white/40 text-xs font-medium tracking-widest uppercase">Scroll</span>
                <ChevronDown className="w-5 h-5 text-white/40" />
            </div>
        </section>
    )
}
