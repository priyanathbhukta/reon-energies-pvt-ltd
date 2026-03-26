import { ArrowRight, Linkedin, Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react'

const quickLinks = [
    { label: 'About Us', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Products', href: '#products' },
    { label: 'Schemes', href: '#schemes' },
    { label: 'Contact', href: '#contact' },
]

const services = [
    { label: 'Rooftop Solar', href: '#services' },
    { label: 'Solar Water Pump', href: '#services' },
    { label: 'Industry Solar Planning', href: '#services' },
    { label: 'Solar ROI Calculator', href: '#calculator' },
]

const social = [
    {
        href: 'https://linkedin.com',
        icon: Linkedin,
        label: 'LinkedIn',
        color: 'hover:bg-[#0077B5]',
    },
    {
        href: 'https://instagram.com',
        icon: Instagram,
        label: 'Instagram',
        color: 'hover:bg-gradient-to-tr hover:from-[#F9A825] hover:to-[#E91E8C]',
    },
    {
        href: 'https://facebook.com',
        icon: Facebook,
        label: 'Facebook',
        color: 'hover:bg-[#1877F2]',
    },
]

export default function Footer() {
    const scrollTo = (href) => {
        if (href.startsWith('#')) {
            document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <footer className="bg-navy text-white pt-16 pb-8" role="contentinfo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <a href="#" className="flex items-center mb-4 group" aria-label="REON Energies Home"
                            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                            <img
                                src="/logo.png"
                                alt="REON Energies Pvt Ltd logo"
                                className="h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                            />
                        </a>
                        <p className="text-white/55 text-sm leading-relaxed mb-6">
                            Empowering India with clean, intelligent solar solutions for homes, businesses, and industries since 2015.
                        </p>
                        {/* Social icons */}
                        <div className="flex gap-3">
                            {social.map(({ href, icon: Icon, label, color }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center ${color}
                               transition-all duration-200 hover:scale-110`}
                                    aria-label={`Follow REON Energy on ${label}`}
                                >
                                    <Icon className="w-4.5 h-4.5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-display font-bold text-base mb-5 text-white">Quick Links</h3>
                        <ul className="space-y-3">
                            {quickLinks.map((l) => (
                                <li key={l.label}>
                                    <button
                                        onClick={() => scrollTo(l.href)}
                                        className="text-white/55 hover:text-emerald text-sm font-medium transition-colors flex items-center gap-1.5 group"
                                    >
                                        <span className="w-1 h-1 bg-white/30 rounded-full group-hover:bg-emerald group-hover:w-2 transition-all" />
                                        {l.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="font-display font-bold text-base mb-5 text-white">Services</h3>
                        <ul className="space-y-3">
                            {services.map((l) => (
                                <li key={l.label}>
                                    <button
                                        onClick={() => scrollTo(l.href)}
                                        className="text-white/55 hover:text-emerald text-sm font-medium transition-colors flex items-center gap-1.5 group"
                                    >
                                        <span className="w-1 h-1 bg-white/30 rounded-full group-hover:bg-emerald group-hover:w-2 transition-all" />
                                        {l.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact & CTA */}
                    <div>
                        <h3 className="font-display font-bold text-base mb-5 text-white">Contact</h3>
                        <div className="space-y-4 mb-6">
                            <a
                                href="tel:+918436649991"
                                className="flex items-center gap-3 text-white/55 hover:text-emerald text-sm transition-colors group"
                                aria-label="Call REON Energy"
                            >
                                <Phone className="w-4 h-4 text-emerald flex-shrink-0" />
                                +91 84366 49991
                            </a>
                            <a
                                href="mailto:support@reonenergy.in"
                                className="flex items-center gap-3 text-white/55 hover:text-emerald text-sm transition-colors"
                                aria-label="Email REON Energy"
                            >
                                <Mail className="w-4 h-4 text-emerald flex-shrink-0" />
                                support@reonenergy.in
                            </a>
                            <div className="flex items-start gap-3 text-white/55 text-sm">
                                <MapPin className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                                <span>Sinher Bheri, Singur<br />Hooghly, West Bengal 712409</span>
                            </div>
                        </div>

                        <button
                            onClick={() => scrollTo('#contact')}
                            className="btn-primary w-full justify-center text-sm py-3"
                            aria-label="Schedule free solar consultation"
                        >
                            Schedule Consultation <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 pt-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/35 text-xs">
                        <p>
                            © {new Date().getFullYear()} REON Energy Pvt Ltd. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <span className="hover:text-white/60 cursor-pointer transition-colors">Privacy Policy</span>
                            <span className="hover:text-white/60 cursor-pointer transition-colors">Terms of Service</span>
                            <span className="hover:text-white/60 cursor-pointer transition-colors">Sitemap</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
