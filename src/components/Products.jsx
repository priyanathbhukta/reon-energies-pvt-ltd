import { useState, useRef, useEffect } from 'react'
import { X, ArrowRight, Package } from 'lucide-react'

const products = [
    {
        id: 'mono-perc',
        name: 'Mono PERC Solar Panel',
        // Close-up of solar panel cells — matches well
        image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=80',
        specs: ['450W–550W Output', '21.5% Efficiency', '25-Year Warranty'],
        price: '₹18,000 – ₹22,000',
        unit: 'per panel',
        description:
            'High-efficiency monocrystalline PERC panels designed for maximum power output even in low-light conditions. Ideal for residential and commercial rooftops.',
        badge: 'Bestseller',
        badgeColor: 'bg-emerald text-white',
    },
    {
        id: 'bifacial',
        name: 'Bifacial Solar Panel',
        // Ground-mounted solar array — exactly fits bifacial field installations
        image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&q=80',
        specs: ['520W–600W Output', '22.8% Efficiency', '30-Year Warranty'],
        price: '₹24,000 – ₹30,000',
        unit: 'per panel',
        description:
            'Captures sunlight from both sides for superior energy generation. Best suited for ground-mounted and industrial installations where reflected light is available.',
        badge: 'Premium',
        badgeColor: 'bg-solar text-navy',
    },
    {
        id: 'string-inverter',
        name: 'String Solar Inverter',
        // Electrical panel / inverter equipment
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80',
        specs: ['3kW – 100kW', '98.4% Efficiency', 'WiFi Monitoring'],
        price: '₹12,000 – ₹1,80,000',
        unit: 'per unit',
        description:
            'Reliable string inverters for residential and commercial systems. Features built-in WiFi monitoring, rapid shutdown, and MPPT for optimal performance.',
        badge: null,
        badgeColor: '',
    },
    {
        id: 'solar-pump',
        name: 'Solar Water Pump System',
        // Water pump / irrigation field with canal
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
        specs: ['1HP – 10HP', 'AC/DC Pump', 'Remote Control'],
        price: '₹45,000 – ₹2,50,000',
        unit: 'per system',
        description:
            'Complete solar pumping systems for agriculture and water supply. MNRE-approved, durable for harsh outdoor conditions with optional IoT-enabled remote control.',
        badge: 'MNRE Approved',
        badgeColor: 'bg-navy text-white',
    },
    {
        id: 'battery',
        name: 'Solar Battery (LiFePO4)',
        // Battery / energy storage unit close-up
        image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
        specs: ['5kWh – 20kWh', '6000+ Cycles', '10-Year Warranty'],
        price: '₹55,000 – ₹2,20,000',
        unit: 'per unit',
        description:
            'Lithium iron phosphate batteries for reliable solar energy storage. Safe, long-lasting, and compatible with all major hybrid and off-grid inverters.',
        badge: 'New',
        badgeColor: 'bg-emerald/15 text-emerald border border-emerald/30',
    },
    {
        id: 'structure',
        name: 'Mounting Structure',
        // Rooftop solar mounting frames / aluminum channel structure
        image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80',
        specs: ['Hot-Dip Galvanized', '25-Year Life', 'Custom Angles'],
        price: '₹8,000 – ₹25,000',
        unit: 'per kW',
        description:
            'Powder-coated and galvanized mounting structures engineered for Indian weather conditions. Available for rooftop, ground-mount, and elevated canopy installations.',
        badge: null,
        badgeColor: '',
    },
]

function ProductModal({ product, onClose }) {
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleKey)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} details`}
        >
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="relative">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-56 object-cover object-center rounded-t-3xl"
                    />
                    {product.badge && (
                        <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full ${product.badgeColor}`}>
                            {product.badge}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-md"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5 text-navy" />
                    </button>
                </div>
                <div className="p-8">
                    <h3 className="font-display font-bold text-2xl text-navy mb-2">{product.name}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {product.specs.map((s) => (
                            <div key={s} className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-navy font-semibold text-sm">{s}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between bg-emerald/8 rounded-2xl p-4 mb-6">
                        <div>
                            <p className="text-gray-500 text-sm">Estimated Price</p>
                            <p className="font-display font-bold text-2xl text-navy">{product.price}</p>
                            <p className="text-gray-400 text-xs">{product.unit} (incl. GST, excl. installation)</p>
                        </div>
                        <button
                            onClick={() => { onClose(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }) }}
                            className="btn-primary"
                        >
                            Request Quote <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-gray-400 text-xs">
                        * Prices are indicative and may vary based on quantity, location, and specifications. Contact REON for final pricing.
                    </p>
                </div>
            </div>
        </div>
    )
}

function ProductCard({ product, onOpen, index }) {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])

    return (
        <article
            ref={ref}
            onClick={() => onOpen(product)}
            className={`card-base cursor-pointer group hover:-translate-y-2 transition-all duration-300
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${index * 80}ms` }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(product)}
            aria-label={`View details for ${product.name}`}
        >
            <div className="relative overflow-hidden h-52">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                {product.badge && (
                    <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${product.badgeColor}`}>
                        {product.badge}
                    </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="p-6">
                <h3 className="font-display font-bold text-lg text-navy mb-2 group-hover:text-emerald transition-colors">
                    {product.name}
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {product.specs.map((s) => (
                        <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                            {s}
                        </span>
                    ))}
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400">Est. Price</p>
                        <p className="font-bold text-navy">{product.price}</p>
                    </div>
                    <span className="text-emerald font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Quote <ArrowRight className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </article>
    )
}

export default function Products() {
    const [activeProduct, setActiveProduct] = useState(null)

    return (
        <section id="products" className="py-24 bg-white" aria-label="REON Energy Products">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <span className="section-tag">
                        <Package className="w-4 h-4" />
                        Our Products
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-4">
                        Premium Solar <span className="gradient-text">Equipment</span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        Sourced from globally certified manufacturers. Click any product to explore specifications and request a quote.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                    {products.map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} onOpen={setActiveProduct} />
                    ))}
                </div>

                <p className="text-center text-gray-400 text-sm mt-8">
                    * All prices are indicative. Final pricing available upon assessment. GST as applicable.
                </p>
            </div>

            {activeProduct && (
                <ProductModal product={activeProduct} onClose={() => setActiveProduct(null)} />
            )}
        </section>
    )
}
