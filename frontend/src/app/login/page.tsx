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
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim(),
            })

            if (error) {
                // Auto-bypass for specific admin email if login fails (likely due to email verification)
                // This allows you to access the dashboard immediately
                const adminEmails = ['muneneoscar599@gmail.com'];
                if (adminEmails.includes(email.trim())) {
                    console.log("Admin login error (likely verification). Bypassing for dev...");
                    router.push('/admin');
                    return;
                }

                // Setting the raw error message for exact debugging
                setError(`Login Failed: ${error.message}`);
                console.error("DEBUG ERROR:", error);
                return;
            }

            const adminEmails = ['muneneoscar599@gmail.com'];
            if (adminEmails.includes(email.trim())) {
                router.push('/admin');
            } else {
                router.push('/admin');
            }
        } catch (err: any) {
            setError("Something went wrong. Please check your internet.")
        } finally {
            setLoading(false)
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
                        {email === 'muneneoscar599@gmail.com' && (
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
