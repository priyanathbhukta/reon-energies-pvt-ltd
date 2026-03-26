import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown, Zap } from 'lucide-react'

const navLinks = [
    { label: 'About', href: '#about' },
    {
        label: 'Services',
        href: '#services',
        dropdown: [
            { label: 'Rooftop Solar', href: '#services', icon: '☀️' },
            { label: 'Solar Water Pump', href: '#services', icon: '💧' },
            { label: 'Industry Solar Planning', href: '#services', icon: '🏭' },
        ],
    },
    { label: 'Products', href: '#products' },
    { label: 'Schemes', href: '#schemes' },
    { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [mobileServicesOpen, setMobileServicesOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const handleNavClick = (href) => {
        setMobileOpen(false)
        setDropdownOpen(false)
        if (href.startsWith('#')) {
            const el = document.querySelector(href)
            if (el) el.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/97 shadow-lg backdrop-blur-md' : 'bg-white'
                }`}
            role="banner"
        >
            <nav
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3"
                aria-label="Main navigation"
            >
                {/* Official Logo */}
                <a
                    href="#"
                    className="flex items-center group"
                    aria-label="REON Energies Home"
                    onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                >
                    <img
                        src="/logo.png"
                        alt="REON Energies Pvt Ltd official logo"
                        className="h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                </a>

                {/* Desktop Nav */}
                <ul className="hidden md:flex items-center gap-8" role="menubar">
                    {navLinks.map((link) =>
                        link.dropdown ? (
                            <li
                                key={link.label}
                                className="relative"
                                onMouseEnter={() => setDropdownOpen(true)}
                                onMouseLeave={() => setDropdownOpen(false)}
                                role="none"
                            >
                                <button
                                    className="nav-link flex items-center gap-1 py-2"
                                    aria-haspopup="true"
                                    aria-expanded={dropdownOpen}
                                    role="menuitem"
                                >
                                    {link.label}
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {dropdownOpen && (
                                    <div
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-fade-in"
                                        role="menu"
                                    >
                                        {link.dropdown.map((item) => (
                                            <button
                                                key={item.label}
                                                onClick={() => handleNavClick(item.href)}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-navy/80 hover:bg-emerald/5 hover:text-emerald transition-all duration-150 text-sm font-medium text-left"
                                                role="menuitem"
                                            >
                                                <span className="text-base">{item.icon}</span>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </li>
                        ) : (
                            <li key={link.label} role="none">
                                <button
                                    onClick={() => handleNavClick(link.href)}
                                    className="nav-link py-2"
                                    role="menuitem"
                                >
                                    {link.label}
                                </button>
                            </li>
                        )
                    )}
                </ul>

                {/* CTA Desktop */}
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={() => handleNavClick('#contact')}
                        className="btn-primary text-sm py-2.5"
                    >
                        <Zap className="w-4 h-4" />
                        Get Free Assessment
                    </button>
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="md:hidden p-2 rounded-xl text-navy hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle mobile menu"
                    aria-expanded={mobileOpen}
                >
                    {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </nav>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
                    <nav className="px-4 py-4 space-y-1" aria-label="Mobile navigation">
                        {navLinks.map((link) =>
                            link.dropdown ? (
                                <div key={link.label}>
                                    <button
                                        className="flex items-center justify-between w-full px-4 py-3 text-navy font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                        onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                                        aria-expanded={mobileServicesOpen}
                                    >
                                        {link.label}
                                        <ChevronDown
                                            className={`w-4 h-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {mobileServicesOpen && (
                                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald/30 pl-4">
                                            {link.dropdown.map((item) => (
                                                <button
                                                    key={item.label}
                                                    onClick={() => handleNavClick(item.href)}
                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-navy/70 hover:text-emerald text-sm font-medium transition-colors"
                                                >
                                                    <span>{item.icon}</span>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    key={link.label}
                                    onClick={() => handleNavClick(link.href)}
                                    className="w-full text-left px-4 py-3 text-navy font-medium rounded-xl hover:bg-gray-50 hover:text-emerald transition-colors"
                                >
                                    {link.label}
                                </button>
                            )
                        )}
                        <div className="pt-2 pb-1">
                            <button
                                onClick={() => handleNavClick('#contact')}
                                className="btn-primary w-full justify-center"
                            >
                                <Zap className="w-4 h-4" />
                                Get Free Assessment
                            </button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
