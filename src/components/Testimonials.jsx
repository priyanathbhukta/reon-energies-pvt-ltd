import { useRef, useEffect, useState } from 'react'
import { Star, Quote } from 'lucide-react'
import { API } from '../api'

const FALLBACK_TESTIMONIALS = [
    { id: 1, name: 'Suresh Menon', role: 'Homeowner, Kochi', rating: 5, review: 'REON installed a 5 kW system at our home. The process was seamless — from design to net meter approval. Our electricity bill dropped from ₹4,500 to under ₹200 monthly!', avatar_initials: 'SM', avatar_color: 'bg-emerald', date_label: 'November 2024' },
    { id: 2, name: 'Anjali Krishnan', role: 'Restaurant Owner, Thrissur', rating: 5, review: "As a restaurant owner, electricity costs were killing our margins. REON's 15 kW commercial system paid for itself in under 3 years.", avatar_initials: 'AK', avatar_color: 'bg-solar', date_label: 'January 2025' },
    { id: 3, name: 'Ravi Shankar', role: 'Farmer, Palakkad', rating: 5, review: 'The REON solar pump has transformed my farm. No more power cuts affecting irrigation.', avatar_initials: 'RS', avatar_color: 'bg-navy', date_label: 'December 2024' },
    { id: 4, name: 'Meena Thomas', role: 'School Principal, Kozhikode', rating: 5, review: 'Our school now runs on 90% solar power. REON handled the entire project within the stipulated timeline.', avatar_initials: 'MT', avatar_color: 'bg-emerald', date_label: 'February 2025' },
    { id: 5, name: 'Dinesh Patel', role: 'Factory Owner, Coimbatore', rating: 5, review: "Installed 200 kW industrial solar system. REON's energy audit revealed we could save 40% on power costs.", avatar_initials: 'DP', avatar_color: 'bg-solar', date_label: 'October 2024' },
    { id: 6, name: 'Lakshmi Devi', role: 'Apartment Secretary, Calicut', rating: 5, review: 'Managing 40 flats, common area electricity was a huge expense. REON designed a perfect shared solar system.', avatar_initials: 'LD', avatar_color: 'bg-navy', date_label: 'March 2025' },
]

const FALLBACK_GALLERY = [
    { id: 1, image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80', alt_text: 'Rooftop solar installation', label: 'Residential Installation' },
    { id: 2, image_url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&q=80', alt_text: 'Commercial solar', label: 'Commercial Rooftop' },
    { id: 3, image_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80', alt_text: 'Solar water pump', label: 'Solar Water Pump' },
    { id: 4, image_url: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=600&q=80', alt_text: 'Industrial solar', label: 'Industrial Solar Plant' },
    { id: 5, image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80', alt_text: 'Battery storage', label: 'Battery Storage System' },
    { id: 6, image_url: 'https://images.unsplash.com/photo-1605980776566-e6ec37f4b5e4?w=600&q=80', alt_text: 'Ground mount', label: 'Ground-Mount Array' },
]

export default function Testimonials() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS)
    const [galleryImages, setGalleryImages] = useState(FALLBACK_GALLERY)

    useEffect(() => {
        fetch(`${API}/api/content/testimonials`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { if (data.length > 0) setTestimonials(data) })
            .catch(() => {})

        fetch(`${API}/api/content/gallery`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { if (data.length > 0) setGalleryImages(data) })
            .catch(() => {})
    }, [])

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])

    return (
        <section id="testimonials" ref={ref} className="py-24 bg-white" aria-label="Customer Testimonials and Project Gallery">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Testimonials */}
                <div className="text-center mb-14">
                    <span className="section-tag">
                        <Star className="w-4 h-4 fill-emerald" />
                        Customer Stories
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-4">
                        Trusted by <span className="gradient-text">Thousands</span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        Hear from homeowners, farmers, and businesses who made the switch to solar with REON.
                    </p>
                </div>

                <div
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    {testimonials.map((t, i) => (
                        <article
                            key={t.id}
                            className="card-base p-7 border border-gray-100 hover:-translate-y-1 transition-all duration-300"
                            style={{ transitionDelay: `${i * 80}ms` }}
                            itemScope
                            itemType="https://schema.org/Review"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 ${t.avatar_color || 'bg-emerald'} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
                                        {t.avatar_initials || t.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-navy text-sm" itemProp="author">{t.name}</p>
                                        <p className="text-gray-400 text-xs">{t.role}</p>
                                    </div>
                                </div>
                                <Quote className="w-8 h-8 text-emerald/20 flex-shrink-0" />
                            </div>

                            <div className="flex mb-3" aria-label={`${t.rating} out of 5 stars`} itemProp="reviewRating">
                                {[...Array(t.rating || 5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 text-solar fill-solar" />
                                ))}
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed mb-4" itemProp="reviewBody">
                                "{t.review}"
                            </p>

                            <p className="text-gray-400 text-xs font-medium">{t.date_label}</p>
                        </article>
                    ))}
                </div>

                {/* Gallery */}
                <div className="text-center mb-12">
                    <span className="section-tag">
                        <span className="text-base">📸</span>
                        Our Work
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-4">
                        Installation <span className="gradient-text">Gallery</span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        A snapshot of REON's solar projects — from compact residential systems to large industrial arrays.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((img, i) => (
                        <div
                            key={img.id}
                            className="group relative rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
                            style={{ transitionDelay: `${i * 60}ms` }}
                        >
                            <img
                                src={img.image_url}
                                alt={img.alt_text}
                                className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <p className="text-white font-semibold text-sm">{img.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
