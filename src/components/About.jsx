import { useRef, useEffect, useState } from 'react'
import { Eye, Target, Building2, Users } from 'lucide-react'
import { API } from '../api'

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
        dynamicDirectors: true,
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
    const [directorsList, setDirectorsList] = useState([])
    const [hoveredDirector, setHoveredDirector] = useState(null)

    useEffect(() => {
        fetch(`${API}/api/content/directors`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setDirectorsList(data);
                } else {
                    console.error("Directors data is not an array:", data);
                    setDirectorsList([]);
                }
            })
            .catch(err => {
                console.error("Error fetching directors:", err);
                setDirectorsList([]);
            })
    }, [])

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
                            {tile.dynamicDirectors && (
                                <div className="space-y-4 mt-2 relative">
                                    {directorsList.map((d) => (
                                        <div 
                                            key={d.id} 
                                            className="flex items-center gap-3 group relative cursor-pointer"
                                            onMouseEnter={() => setHoveredDirector(d.id)}
                                            onMouseLeave={() => setHoveredDirector(null)}
                                        >
                                            <div className="w-10 h-10 bg-emerald/15 rounded-full overflow-hidden border border-emerald/20 flex items-center justify-center font-bold text-emerald text-sm flex-shrink-0">
                                                {d.image_url ? (
                                                    <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    d.name?.[0] || 'D'
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-navy text-sm group-hover:text-emerald transition-colors">{d.name}</p>
                                                <p className="text-gray-500 text-xs">{d.role}</p>
                                            </div>

                                            {/* Hover Pop Card */}
                                            {hoveredDirector === d.id && (
                                                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-fade-in p-4 origin-bottom overflow-hidden">
                                                    {d.image_url && (
                                                        <div className="h-32 -mx-4 -mt-4 mb-3 bg-gray-100 relative">
                                                            <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                            <p className="absolute bottom-2 left-3 text-white font-bold text-lg leading-tight">{d.name}</p>
                                                        </div>
                                                    )}
                                                    {!d.image_url && <p className="font-bold text-navy text-lg mb-1">{d.name}</p>}
                                                    <p className="text-emerald text-xs font-semibold mb-2 uppercase tracking-wide">{d.role}</p>
                                                    <p className="text-gray-600 text-xs leading-relaxed">{d.description || 'Dedicated to bringing sustainable energy to India.'}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Timeline */}
                            {tile.timeline && (
                                <div className="space-y-2.5 mt-2">
                                    {tile.timeline.map((item, index) => (
                                        <div key={`timeline-${item.year}-${index}`} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2.5 h-2.5 bg-emerald rounded-full flex-shrink-0 mt-0.5" />
                                                {index < tile.timeline.length - 1 && <div className="w-0.5 h-4 bg-emerald/20 mt-0.5" />}
                                            </div>
                                            <div>
                                                <span className="text-emerald font-bold text-xs">{item.year}</span>
                                                <span className="text-gray-600 text-xs block leading-tight">{item.event}</span>
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
