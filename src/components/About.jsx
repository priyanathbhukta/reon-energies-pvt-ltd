import { useRef, useEffect, useState } from 'react'
import { Eye, Target, Building2, Users } from 'lucide-react'

const tiles = [
    {
        id: 'overview',
        size: 'lg:col-span-2 lg:row-span-1',
        bg: 'bg-navy',
        textLight: true,
        icon: <Building2 className="w-7 h-7 text-emerald" />,
        label: 'About REON',
        title: "Powering West Bengal's Solar Future",
        body: 'REON Energies Pvt Ltd is a forward-thinking renewable energy company headquartered in Singur, Hooghly, West Bengal. We deliver end-to-end solar solutions for homes, businesses, and industries — making clean power accessible, affordable, and reliable across India.',
    },
    {
        id: 'established',
        size: 'lg:col-span-1 lg:row-span-1',
        bg: 'bg-emerald',
        textLight: true,
        icon: null,
        label: 'Established',
        title: '2026',
        body: 'Pioneering solar energy in West Bengal.',
    },
    {
        id: 'vision',
        size: 'lg:col-span-1 lg:row-span-1',
        bg: 'bg-white',
        textLight: false,
        icon: <Eye className="w-7 h-7 text-emerald" />,
        label: 'Vision',
        title: 'A Solar-Powered India',
        body: 'We envision a future where every home and business in India runs on clean, renewable solar energy.',
    },
    {
        id: 'mission',
        size: 'lg:col-span-1 lg:row-span-1',
        bg: 'bg-solar',
        textLight: false,
        icon: <Target className="w-6 h-6 text-navy" />,
        label: 'Mission',
        title: 'Accessible Clean Energy',
        body: 'Deliver affordable, high-quality solar solutions with unmatched service and transparent processes.',
    },
    {
        id: 'directors',
        size: 'lg:col-span-2 lg:row-span-1',
        bg: 'bg-white border border-gray-100',
        textLight: false,
        icon: <Users className="w-7 h-7 text-emerald" />,
        label: 'Board of Directors',
        title: null,
        directors: [
            { name: 'Sk Hossain Ali', role: 'Executive Director', initials: 'HA' },
            { name: 'Jayanta Bhukta', role: 'Executive Director', initials: 'JB' },
            { name: 'Sk Zeeshan Ali', role: 'Executive Director', initials: 'ZA' },
            { name: 'Subham Bhukta', role: 'Executive Director', initials: 'SB' },
        ],
    },
    {
        id: 'history',
        size: 'lg:col-span-1 lg:row-span-1',
        bg: 'bg-navy/5',
        textLight: false,
        icon: null,
        label: 'Company History',
        title: null,
        timeline: [
            { year: '2026', event: 'Founded in Singur, Hooghly, WB' },
            { year: '2026', event: 'First residential installations' },
            { year: '2026', event: 'Industrial & pump projects launched' },
            { year: '2026', event: 'Expanding pan-India' },
        ],
    },
]

export default function About() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true) },
            { threshold: 0.1 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section
            id="about"
            ref={ref}
            className="py-24 bg-gray-50"
            aria-label="About REON Energy"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <span className="section-tag">
                        <Building2 className="w-4 h-4" />
                        Who We Are
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-4">
                        The <span className="gradient-text">REON Story</span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        A decade of innovation, integrity, and impact in Indian solar energy.
                    </p>
                </div>

                <div
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5
                       transition-all duration-700
                       ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    {tiles.map((tile, idx) => (
                        <div
                            key={tile.id}
                            className={`rounded-2xl p-7 shadow-card hover:shadow-card-hover
                         transition-all duration-300 hover:-translate-y-1 ${tile.bg} ${tile.size}
                         ${tile.id === 'overview' ? 'md:col-span-2' : ''}
                         ${tile.id === 'directors' ? 'md:col-span-2' : ''}
                         ${tile.id === 'established' ? 'flex flex-col justify-center' : ''}`}
                            style={{ transitionDelay: `${idx * 80}ms` }}
                        >
                            {/* Label */}
                            <div className={`text-xs font-bold tracking-widest uppercase mb-3 ${tile.textLight ? 'text-white/50' : 'text-gray-400'}`}>
                                {tile.icon && <span className="inline-block mb-2">{tile.icon}</span>}
                                <br />
                                {tile.label}
                            </div>

                            {/* Title */}
                            {tile.id === 'established' && (
                                <div className="text-6xl font-display font-black text-white leading-none">
                                    {tile.title}
                                </div>
                            )}
                            {tile.title && tile.id !== 'established' && (
                                <h3 className={`font-display font-bold text-xl mb-2 ${tile.textLight ? 'text-white' : 'text-navy'}`}>
                                    {tile.title}
                                </h3>
                            )}
                            {tile.body && (
                                <p className={`text-sm leading-relaxed ${tile.textLight ? 'text-white/75' : 'text-gray-600'}`}>
                                    {tile.body}
                                </p>
                            )}

                            {/* Directors */}
                            {tile.directors && (
                                <div className="space-y-3 mt-2">
                                    {tile.directors.map((d) => (
                                        <div key={d.name} className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald/15 rounded-full flex items-center justify-center font-bold text-emerald text-sm flex-shrink-0">
                                                {d.initials}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-navy text-sm">{d.name}</p>
                                                <p className="text-gray-500 text-xs">{d.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Timeline */}
                            {tile.timeline && (
                                <div className="space-y-2.5 mt-2">
                                    {tile.timeline.map((t, i) => (
                                        <div key={t.year} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2.5 h-2.5 bg-emerald rounded-full flex-shrink-0 mt-0.5" />
                                                {i < tile.timeline.length - 1 && <div className="w-0.5 h-4 bg-emerald/20 mt-0.5" />}
                                            </div>
                                            <div>
                                                <span className="text-emerald font-bold text-xs">{t.year}</span>
                                                <span className="text-gray-600 text-xs block leading-tight">{t.event}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
