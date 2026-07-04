import { useRef, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const services = [
    {
        id: 'rooftop',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
                <rect x="6" y="22" width="36" height="20" rx="3" fill="#1DBF73" fillOpacity="0.15" stroke="#1DBF73" strokeWidth="2" />
                <path d="M4 22L24 6L44 22" stroke="#1DBF73" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="14" y="27" width="8" height="6" rx="1" fill="#1DBF73" />
                <rect x="26" y="27" width="8" height="6" rx="1" fill="#1DBF73" />
                <rect x="14" y="35" width="8" height="5" rx="1" fill="#1DBF73" fillOpacity="0.6" />
                <rect x="26" y="35" width="8" height="5" rx="1" fill="#1DBF73" fillOpacity="0.6" />
                <circle cx="38" cy="12" r="5" fill="#F9A825" fillOpacity="0.9" />
                <path d="M38 8v1M38 15v1M34 12h1M41 12h1" stroke="#F9A825" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
        title: 'Rooftop Solar',
        description:
            'Transform your rooftop into a power plant. Our end-to-end rooftop solar installations cover design, supply, installation, net metering support, and ongoing maintenance for homes and businesses.',
        benefits: ['Net Metering Ready', 'Govt. Subsidy Eligible', '25-Year Panel Warranty'],
        color: 'emerald',
        href: '#contact',
    },
    {
        id: 'water-pump',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
                <rect x="4" y="8" width="18" height="12" rx="2" fill="#0A2540" fillOpacity="0.12" stroke="#0A2540" strokeWidth="2" />
                <rect x="4" y="8" width="6" height="4" rx="1" fill="#1DBF73" />
                <rect x="12" y="8" width="6" height="4" rx="1" fill="#1DBF73" />
                <rect x="4" y="14" width="6" height="4" rx="1" fill="#1DBF73" fillOpacity="0.5" />
                <rect x="12" y="14" width="6" height="4" rx="1" fill="#1DBF73" fillOpacity="0.5" />
                <path d="M22 14h6c2 0 3 1 3 3v4" stroke="#0A2540" strokeWidth="2" strokeLinecap="round" />
                <rect x="27" y="21" width="8" height="18" rx="2" fill="#0A2540" fillOpacity="0.15" stroke="#0A2540" strokeWidth="2" />
                <path d="M31 33c0 0-4 4-4 8h8c0-4-4-8-4-8z" fill="#1DBF73" fillOpacity="0.8" />
                <circle cx="37" cy="10" r="5" fill="#F9A825" fillOpacity="0.9" />
                <path d="M37 6v1M37 13v1M33 10h1M40 10h1" stroke="#F9A825" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
        title: 'Solar Water Pump',
        description:
            'Power irrigation and water supply with zero electricity cost. Ideal for agriculture, farms, and rural properties. REON supplies and installs high-efficiency solar pumping systems with remote monitoring.',
        benefits: ['Zero Running Cost', 'Remote Monitoring', 'MNRE Approved Systems'],
        color: 'navy',
        href: '#contact',
    },
    {
        id: 'industry',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
                <rect x="4" y="28" width="40" height="16" rx="2" fill="#0A2540" fillOpacity="0.12" stroke="#0A2540" strokeWidth="2" />
                <path d="M4 28V18l8 6V18l8 6V18l8 6V18l8 6v10" stroke="#0A2540" strokeWidth="2" strokeLinejoin="round" />
                <rect x="8" y="10" width="22" height="14" rx="2" fill="#1DBF73" fillOpacity="0.15" stroke="#1DBF73" strokeWidth="2" />
                <rect x="10" y="12" width="6" height="5" rx="1" fill="#1DBF73" />
                <rect x="18" y="12" width="6" height="5" rx="1" fill="#1DBF73" />
                <rect x="10" y="18" width="6" height="4" rx="1" fill="#1DBF73" fillOpacity="0.5" />
                <rect x="18" y="18" width="6" height="4" rx="1" fill="#1DBF73" fillOpacity="0.5" />
                <circle cx="38" cy="12" r="6" fill="#F9A825" fillOpacity="0.9" />
                <path d="M38 7v2M38 15v2M33 12h2M41 12h2" stroke="#F9A825" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
        title: 'Industry Solar Planning',
        description:
            'Comprehensive energy auditing, solar demand analysis, and large-scale solar implementation for factories, warehouses, SEZs, and industrial estates. REON provides detailed feasibility reports and turnkey execution.',
        benefits: ['Energy Audit Included', 'Custom Feasibility Report', 'EPC Turnkey Model'],
        color: 'solar',
        href: '#contact',
    },
]

function ServiceCard({ service, index }) {
    const colorMap = {
        emerald: 'border-emerald/25 hover:border-emerald/50',
        navy: 'border-navy/20 hover:border-navy/40',
        solar: 'border-solar/25 hover:border-solar/50',
    }

    return (
        <motion.article
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -8 }}
            className={`card-base border ${colorMap[service.color]} group cursor-pointer p-8 transition-all duration-300`}
        >
            <div className="mb-6 group-hover:scale-110 transition-transform duration-300 inline-block">
                {service.icon}
            </div>
            <h3 className="font-display font-bold text-2xl text-navy mb-3">{service.title}</h3>
            <p className="text-gray-600 leading-relaxed mb-6 text-[0.95rem]">{service.description}</p>

            <ul className="space-y-2 mb-6">
                {service.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span className="w-1.5 h-1.5 bg-emerald rounded-full flex-shrink-0" />
                        {b}
                    </li>
                ))}
            </ul>

            <button
                onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 text-emerald font-semibold text-sm hover:gap-3 transition-all group-hover:text-emerald-700"
                aria-label={`Learn more about ${service.title}`}
            >
                Get a Quote <ArrowRight className="w-4 h-4" />
            </button>
        </motion.article>
    )
}

export default function Services() {
    return (
        <section id="services" className="py-24 bg-gray-50 relative overflow-hidden" aria-label="REON Energy Services">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald/5 rounded-full blur-3xl -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-solar/5 rounded-full blur-3xl translate-y-1/2" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-2xl mx-auto mb-16"
                >
                    <span className="section-tag">
                        <span className="w-2 h-2 bg-emerald rounded-full" />
                        What We Do
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-4 mt-4">
                        Solar Solutions for <span className="gradient-text">Every Need</span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        From residential rooftops to large industrial complexes, REON Energy delivers end-to-end solar solutions tailored to your energy requirements.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((s, i) => (
                        <ServiceCard key={s.id} service={s} index={i} />
                    ))}
                </div>
            </div>
        </section>
    )
}
