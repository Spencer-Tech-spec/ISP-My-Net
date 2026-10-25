'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            let sessionToken: string | null = null;
            let userId: string | null = null;
            let userRole: string = "admin";

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });

                if (error) {
                    const msg = error.message.toLowerCase();
                    if (msg.includes("invalid") || msg.includes("credentials")) {
                        setError("Invalid email or password. Please verify your credentials.");
                        return;
                    }
                    if (msg.includes("email not confirmed")) {
                        setError("Email is not confirmed yet. Please verify your email or check Supabase settings.");
                        return;
                    }
                    throw error;
                }

                if (data?.session) {
                    sessionToken = data.session.access_token;
                    userId = data.user.id;
                }
            } catch (clientErr: any) {
                // If client encounters CORS, network or connectivity failure, check if backend proxy is available
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const canUseBackend = backendUrl && !(isHttps && backendUrl.startsWith('http://localhost'));

                if (canUseBackend) {
                    try {
                        const fallbackRes = await fetch(`${backendUrl}/saas/login`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: email.trim(), password: password.trim() }),
                        });

                        if (!fallbackRes.ok) {
                            const errData = await fallbackRes.json().catch(() => ({}));
                            setError(errData.detail || "Invalid email or password.");
                            return;
                        }

                        const fallbackData = await fallbackRes.json();
                        sessionToken = fallbackData.access_token;
                        userId = fallbackData.user?.id;
                        userRole = fallbackData.role || "admin";

                        if (fallbackData.refresh_token) {
                            await supabase.auth.setSession({
                                access_token: fallbackData.access_token,
                                refresh_token: fallbackData.refresh_token,
                            }).catch(() => {});
                        }
                    } catch (_) {}
                }

                if (!sessionToken) {
                    const rawMsg = (clientErr?.message || "").toLowerCase();
                    if (rawMsg.includes("failed to fetch") || rawMsg.includes("networkerror") || rawMsg.includes("getaddrinfo")) {
                        setError("Unable to connect to the authentication server. Please verify that your Supabase database is active and restored in your Supabase Dashboard.");
                        return;
                    }
                    setError(clientErr?.message || "Invalid email or password.");
                    return;
                }
            }

            if (sessionToken && userId) {
                localStorage.setItem('isp_token', sessionToken);
                
                // Fetch user role if not already determined
                if (userRole === "admin") {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', userId)
                            .single();
                        if (profile?.role) userRole = profile.role;
                    } catch (_) {}
                }
                
                if (userRole === 'employee' || userRole === 'technician' || userRole === 'cashier') {
                    router.push('/employee');
                } else {
                    router.push('/admin'); // Admin / Owner goes to admin panel
                }
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-600 mt-2 text-sm">Sign in to your My Net account</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="leading-snug">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                            Email address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                            spellCheck={false}
                            className="w-full px-4 py-2.5 text-base font-medium text-slate-900 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none placeholder:text-slate-400 placeholder:font-normal transition-all shadow-sm"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="w-full pl-4 pr-11 py-2.5 text-base font-medium text-slate-900 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none placeholder:text-slate-400 placeholder:font-normal transition-all shadow-sm"
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none p-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-600">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    )
}
