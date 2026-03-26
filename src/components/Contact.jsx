import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, Building2, Zap } from 'lucide-react'

const UTILITIES = [
    { id: 'fan', label: 'Fan' },
    { id: 'light', label: 'Light' },
    { id: 'ac', label: 'AC' },
    { id: 'refrigerator', label: 'Refrigerator' },
    { id: 'casting_machine', label: 'Casting Machine' },
    { id: 'heavy_weight_machine', label: 'Heavy Weight Machine' },
    { id: 'industrial_machineries', label: 'Industrial Machineries' },
]

const initialForm = {
    name: '', phone: '', email: '', address: '',
    floors: '', monthly_bill: '', payment_method: 'Cash',
    installation_type: 'Residential', electricity_provider: 'WBSEDCL',
    utilities: [], message: ''
}

export default function Contact() {
    const [form, setForm] = useState(initialForm)
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setError('')
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleUtilityToggle = (utilityId) => {
        setForm(prev => ({
            ...prev,
            utilities: prev.utilities.includes(utilityId)
                ? prev.utilities.filter(u => u !== utilityId)
                : [...prev.utilities, utilityId]
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/enquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to submit')
            }

            setSubmitted(true)
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section id="contact" className="py-24 bg-white" aria-label="Customer Enquiry Form">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <span className="section-tag">
                        <Zap className="w-4 h-4" />
                        Customer Enquiry
                    </span>
                    <h2 className="section-heading text-4xl sm:text-5xl mb-4">
                        Get Your <span className="gradient-text">Solar Assessment</span>
                    </h2>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        Fill out the form below for a personalized solar installation plan. Our team responds within 24 hours.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Left — Enquiry Form */}
                    <div className="card-base p-8 sm:p-10 border border-gray-100">
                        {submitted ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <CheckCircle className="w-16 h-16 text-emerald mb-4" />
                                <h3 className="font-display font-bold text-2xl text-navy mb-2">Enquiry Submitted!</h3>
                                <p className="text-gray-500">
                                    Thank you for your interest. A REON expert will contact you within 24 hours with a customized solar plan.
                                </p>
                                <button
                                    onClick={() => { setSubmitted(false); setForm(initialForm) }}
                                    className="mt-6 btn-outline-emerald text-sm"
                                >
                                    Submit Another Enquiry
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} noValidate aria-label="Customer enquiry form">
                                <h3 className="font-display font-bold text-2xl text-navy mb-2">
                                    Request Solar Installation
                                </h3>
                                <p className="text-gray-400 text-sm mb-6">Fields marked with * are required</p>

                                {/* Trust badge */}
                                <div className="flex items-center gap-2 bg-emerald/8 rounded-xl px-4 py-2.5 mb-6">
                                    <Clock className="w-4 h-4 text-emerald flex-shrink-0" />
                                    <p className="text-sm text-emerald font-medium">We respond within 24 hours</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {/* Row: Name + Phone */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-semibold text-navy mb-1.5">
                                                Full Name *
                                            </label>
                                            <input
                                                id="name" name="name" type="text" required
                                                placeholder="e.g. Rajesh Kumar"
                                                value={form.name} onChange={handleChange}
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-semibold text-navy mb-1.5">
                                                Phone Number *
                                            </label>
                                            <input
                                                id="phone" name="phone" type="tel" required
                                                placeholder="+91 84366 49991"
                                                value={form.phone} onChange={handleChange}
                                                className="input-field"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-navy mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            id="email" name="email" type="email"
                                            placeholder="e.g. rajesh@example.com"
                                            value={form.email} onChange={handleChange}
                                            className="input-field"
                                        />
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label htmlFor="address" className="block text-sm font-semibold text-navy mb-1.5">
                                            Property Address *
                                        </label>
                                        <input
                                            id="address" name="address" type="text" required
                                            placeholder="e.g. 12, MG Road, Kolkata, West Bengal"
                                            value={form.address} onChange={handleChange}
                                            className="input-field"
                                        />
                                    </div>

                                    {/* Row: Floors + Monthly Bill */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="floors" className="block text-sm font-semibold text-navy mb-1.5">
                                                Floors in Building
                                            </label>
                                            <input
                                                id="floors" name="floors" type="number" min="1"
                                                placeholder="e.g. 2"
                                                value={form.floors} onChange={handleChange}
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="monthly_bill" className="block text-sm font-semibold text-navy mb-1.5">
                                                Monthly Electricity Bill (₹)
                                            </label>
                                            <input
                                                id="monthly_bill" name="monthly_bill" type="number" min="0"
                                                placeholder="e.g. 3500"
                                                value={form.monthly_bill} onChange={handleChange}
                                                className="input-field"
                                            />
                                        </div>
                                    </div>

                                    {/* Row: Payment Method + Installation Type (dropdowns) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="payment_method" className="block text-sm font-semibold text-navy mb-1.5">
                                                Payment Method
                                            </label>
                                            <select
                                                id="payment_method" name="payment_method"
                                                value={form.payment_method} onChange={handleChange}
                                                className="input-field appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center]"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="EMI">EMI</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="installation_type" className="block text-sm font-semibold text-navy mb-1.5">
                                                Installation Type
                                            </label>
                                            <select
                                                id="installation_type" name="installation_type"
                                                value={form.installation_type} onChange={handleChange}
                                                className="input-field appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center]"
                                            >
                                                <option value="Residential">Residential</option>
                                                <option value="Commercial">Commercial</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Electricity Provider */}
                                    <div>
                                        <label htmlFor="electricity_provider" className="block text-sm font-semibold text-navy mb-1.5">
                                            Electricity Provider
                                        </label>
                                        <select
                                            id="electricity_provider" name="electricity_provider"
                                            value={form.electricity_provider} onChange={handleChange}
                                            className="input-field appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center]"
                                        >
                                            <option value="WBSEDCL">WBSEDCL</option>
                                            <option value="WBSETCL">WBSETCL</option>
                                            <option value="CESC">CESC</option>
                                            <option value="IPCL">IPCL</option>
                                            <option value="DVC">DVC</option>
                                        </select>
                                    </div>

                                    {/* Utilities checkboxes */}
                                    <div>
                                        <label className="block text-sm font-semibold text-navy mb-3">
                                            Utilities / Appliances Used
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {UTILITIES.map(util => (
                                                <label
                                                    key={util.id}
                                                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 text-sm font-medium select-none ${
                                                        form.utilities.includes(util.id)
                                                            ? 'border-emerald bg-emerald/8 text-emerald'
                                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.utilities.includes(util.id)}
                                                        onChange={() => handleUtilityToggle(util.id)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                                                        form.utilities.includes(util.id)
                                                            ? 'bg-emerald border-emerald'
                                                            : 'border-gray-300'
                                                    }`}>
                                                        {form.utilities.includes(util.id) && (
                                                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {util.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label htmlFor="message" className="block text-sm font-semibold text-navy mb-1.5">
                                            Additional Message
                                        </label>
                                        <textarea
                                            id="message" name="message" rows={3}
                                            placeholder="Tell us about your energy needs, roof size, or any specific requirements..."
                                            value={form.message} onChange={handleChange}
                                            className="input-field resize-none"
                                        />
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={loading || !form.name || !form.phone || !form.address}
                                        className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Submit Enquiry
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Right — Info + Map */}
                    <div className="space-y-6">
                        {/* Contact cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                {
                                    icon: Phone,
                                    label: 'Call Us',
                                    value: '+91 84366 49991',
                                    sub: 'Mon–Sat, 9 AM – 6 PM',
                                    color: 'text-emerald',
                                    bg: 'bg-emerald/10',
                                    href: 'tel:+918436649991',
                                },
                                {
                                    icon: Mail,
                                    label: 'Email Us',
                                    value: 'support@reonenergy.in',
                                    sub: 'We reply within 24h',
                                    color: 'text-navy',
                                    bg: 'bg-navy/8',
                                    href: 'mailto:support@reonenergy.in',
                                },
                                {
                                    icon: MapPin,
                                    label: 'Office Address',
                                    value: 'Sinher Bheri',
                                    sub: 'West Bengal 712409',
                                    color: 'text-solar-700',
                                    bg: 'bg-solar/10',
                                    href: 'https://maps.app.goo.gl/oL56xfprFCjC2Dqg7',
                                },
                                {
                                    icon: Clock,
                                    label: 'Working Hours',
                                    value: 'Mon – Sat',
                                    sub: '9:00 AM – 6:00 PM',
                                    color: 'text-emerald',
                                    bg: 'bg-emerald/10',
                                    href: null,
                                },
                            ].map(({ icon: Icon, label, value, sub, color, bg, href }) => (
                                <div key={label} className="card-base p-5 border border-gray-100 flex items-start gap-4">
                                    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-5 h-5 ${color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                                        {href ? (
                                            <a href={href} className="font-semibold text-navy text-sm mt-0.5 hover:text-emerald transition-colors block">
                                                {value}
                                            </a>
                                        ) : (
                                            <p className="font-semibold text-navy text-sm mt-0.5">{value}</p>
                                        )}
                                        <p className="text-gray-400 text-xs">{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Google Maps embed */}
                        <div className="rounded-2xl overflow-hidden shadow-card border border-gray-100">
                            <iframe
                                title="REON Energies Office Location — Sinher Bheri, West Bengal"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3433.1002119570594!2d88.2271023!3d22.845160699999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f88901883fdcdb%3A0x8c068545ccc29605!2sM.%20Traders%20%26%20Builders!5e1!3m2!1sen!2sin!4v1773851442740!5m2!1sen!2sin"
                                width="100%"
                                height="260"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                aria-label="REON Energies office location map"
                            />
                            <a
                                href="https://maps.app.goo.gl/oL56xfprFCjC2Dqg7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-2.5 bg-emerald/5 hover:bg-emerald/10 text-emerald text-xs font-bold transition-colors border-t border-emerald/10"
                            >
                                <MapPin className="w-3.5 h-3.5" /> Open in Google Maps →
                            </a>
                        </div>

                        {/* Social proof */}
                        <div className="bg-navy rounded-2xl p-6 text-center">
                            <p className="text-white/70 text-sm mb-1">Rated by our satisfied customers</p>
                            <div className="flex justify-center gap-1 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="text-solar text-xl">★</span>
                                ))}
                            </div>
                            <p className="text-white font-bold text-lg">4.9 / 5.0</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
