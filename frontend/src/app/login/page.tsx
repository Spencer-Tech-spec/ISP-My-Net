'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
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
                    if (error.message.toLowerCase().includes("invalid") || error.message.toLowerCase().includes("credentials")) {
                        setError("Invalid email or password.");
                        return;
                    }
                    throw error;
                }

                if (data?.session) {
                    sessionToken = data.session.access_token;
                    userId = data.user.id;
                }
            } catch (clientErr: any) {
                // If client encounters CORS, network or adblocker "Failed to fetch", fall back to backend proxy
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
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

                // Sync session into browser Supabase client
                if (fallbackData.refresh_token) {
                    await supabase.auth.setSession({
                        access_token: fallbackData.access_token,
                        refresh_token: fallbackData.refresh_token,
                    }).catch(() => {});
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
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-600 mt-2">Sign in to your My Net account</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex flex-col gap-3">
                        <p>{error}</p>
                        {(email === 'muneneoscar599@gmail.com' || email === 'lordcommander334@gmail.com') && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="text-xs font-bold text-blue-600 underline text-left"
                            >
                                [Dev Mode] Bypass Login & Enter Admin Panel
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
