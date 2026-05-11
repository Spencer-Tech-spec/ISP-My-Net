'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Phone, CreditCard, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function PaymentPage() {
    const [phoneNumber, setPhoneNumber] = useState('')
    const [amount, setAmount] = useState('1') // Default 1 for testing
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Clean phone number: remove spaces and +
            let cleanPhone = phoneNumber.replace(/[\s+]/g, '')
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '254' + cleanPhone.substring(1)
            } else if (!cleanPhone.startsWith('254')) {
                cleanPhone = '254' + cleanPhone
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/mpesa/stk_push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: cleanPhone,
                    amount: parseInt(amount),
                    account_reference: "MyNetISP",
                    transaction_desc: "Internet Service Payment"
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to initiate payment')
            }

            setSuccess(true)
            // Optional: Reset success after some time
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 text-center space-y-6 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">Push Sent!</h2>
                    <p className="text-slate-600 font-medium text-lg leading-relaxed">
                        Please check your phone and enter your <strong>M-Pesa PIN</strong> to complete the payment of <strong>KES {amount}</strong>.
                    </p>
                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            onClick={() => setSuccess(false)}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                        >
                            Pay Another
                        </button>
                        <Link href="/" className="inline-flex items-center justify-center gap-2 text-slate-500 font-semibold hover:text-slate-700 transition-colors py-2">
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="px-6 lg:px-10 py-5 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                        <Zap className="text-white w-5 h-5 shadow-sm" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        My Net
                    </span>
                </Link>
                <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Home
                </Link>
            </header>

            <main className="max-w-xl mx-auto px-6 py-12 md:py-20">
                <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 p-8 md:p-10">
                    <div className="mb-10 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <CreditCard className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Express Payment</h1>
                        <p className="text-slate-500 text-lg font-medium">Quick and secure M-Pesa STK Push</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handlePayment} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 ml-1">M-Pesa Phone Number</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg font-semibold placeholder:text-slate-300"
                                    placeholder="07XX XXX XXX"
                                />
                            </div>
                            <p className="text-xs text-slate-400 ml-1">The phone number that will receive the M-Pesa prompt</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 ml-1">Amount (KES)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 group-focus-within:text-blue-600 transition-colors">KES</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    min="1"
                                    className="w-full pl-14 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-xl font-black placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-5 px-6 rounded-2xl flex items-center justify-center gap-3 font-black text-lg transition-all shadow-lg active:scale-[0.98] ${loading
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 hover:shadow-blue-600/40'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Sending Prompt...</span>
                                </>
                            ) : (
                                <>
                                    <span>Initiate STK Push</span>
                                    <Zap className="w-5 h-5 fill-white" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Secure 256-bit Encryption</span>
                        </div>
                        <p className="text-xs text-slate-400">By clicking Initiate STK Push, you agree to Safaricom's payments terms and conditions.</p>
                    </div>
                </div>
            </main>
        </div>
    )
}
