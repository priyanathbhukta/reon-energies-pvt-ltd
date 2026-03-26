import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Zap } from 'lucide-react'

export default function AdminLogin() {
    const navigate = useNavigate()
    const [form, setForm] = useState({ username: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            const text = await res.text()
            let data
            try {
                data = JSON.parse(text)
            } catch {
                throw new Error('Server is not responding. Please ensure the backend is running.')
            }

            if (!res.ok) {
                throw new Error(data.error || 'Login failed')
            }

            localStorage.setItem('reon_admin_token', data.token)
            localStorage.setItem('reon_admin_user', JSON.stringify(data.admin))
            navigate('/admin/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-navy via-navy-800 to-navy-900 flex items-center justify-center px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-solar/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald/15 rounded-2xl mb-4">
                        <Zap className="w-8 h-8 text-emerald" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-white mb-1">REON Admin</h1>
                    <p className="text-white/50 text-sm">Sign in to access the admin dashboard</p>
                </div>

                {/* Login card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="admin-username" className="block text-sm font-medium text-white/70 mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                                <input
                                    id="admin-username"
                                    type="text"
                                    required
                                    placeholder="Enter username"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-emerald/50 focus:ring-2 focus:ring-emerald/20 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="admin-password" className="block text-sm font-medium text-white/70 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                                <input
                                    id="admin-password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="Enter password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-emerald/50 focus:ring-2 focus:ring-emerald/20 focus:outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !form.username || !form.password}
                            className="w-full bg-emerald hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald/25"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-white/25 text-xs mt-6">
                    © 2026 REON Energies Pvt Ltd. Admin Panel.
                </p>
            </div>
        </div>
    )
}
