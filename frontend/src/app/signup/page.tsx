"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, CheckCircle, Loader2, Building2 } from "lucide-react";

const PLANS: Record<string, { name: string; priceText: string }> = {
  revenue_share_3: { name: "Revenue Share (3%)", priceText: "3% monthly revenue" },
  starter: { name: "Starter Tier", priceText: "Ksh 2,000/mo" },
  standard: { name: "Standard Tier", priceText: "Ksh 5,000/mo" },
};


const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos",
  "Uasin Gishu", "Meru", "Nyeri", "Kakamega", "Kilifi", "Bungoma",
  "Trans Nzoia", "Kericho", "Embu", "Laikipia", "Murang'a", "Nandi",
  "Kisii", "Siaya", "Other",
];

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultPlan = searchParams.get("plan") || "revenue_share_3";

  const [form, setForm] = useState({
    company_name: "",
    owner_name: "",
    owner_email: "",
    owner_password: "",
    phone: "",
    county: "",
    plan_id: defaultPlan,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/saas/register-isp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed.");
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-white mb-3">You&apos;re all set! 🎉</h2>
        <p className="text-slate-400 mb-2">Your ISP Cloud account is ready.</p>
        <p className="text-slate-500 text-sm">Your 14-day free trial has started. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 3% Revenue Sharing Plan Badge */}
      <div className="p-4 rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-blue-950/40 backdrop-blur-sm flex items-center justify-between mb-2 shadow-lg shadow-blue-950/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Pure 3% Revenue Model</span>
          </div>
          <div className="font-extrabold text-white text-base mt-0.5">3% Monthly Revenue Share</div>
          <p className="text-xs text-slate-400 mt-0.5">Pay only 3% of collected revenue • Zero upfront fixed monthly fees</p>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            14-Day Free Trial
          </span>
        </div>
      </div>

      {/* Company Name */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">ISP Company Name *</label>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            required value={form.company_name} onChange={set("company_name")}
            placeholder="e.g. Alpha Net Kenya"
            className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Owner Name */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Your Full Name *</label>
        <input
          required value={form.owner_name} onChange={set("owner_name")}
          placeholder="John Kamau"
          className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Email Address *</label>
        <input
          required type="email" value={form.owner_email} onChange={set("owner_email")}
          placeholder="john@alphanet.co.ke"
          className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
        />
      </div>

      {/* Password */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Password *</label>
        <div className="relative">
          <input
            required type={showPass ? "text" : "password"} value={form.owner_password}
            onChange={set("owner_password")} placeholder="Min 8 characters"
            minLength={8}
            className="w-full px-4 pr-12 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Phone + County row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Phone</label>
          <input
            value={form.phone} onChange={set("phone")} placeholder="0712 345 678"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">County</label>
          <select
            value={form.county} onChange={set("county")}
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
          >
            <option value="">Select...</option>
            {COUNTIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Start Free 14-Day Trial"}
      </button>

      <p className="text-center text-xs text-slate-600">
        By signing up you agree to our{" "}
        <Link href="/terms" className="text-slate-400 hover:text-white underline">Terms</Link> and{" "}
        <Link href="/privacy" className="text-slate-400 hover:text-white underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#060918] flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ISP Cloud</span>
          </Link>
          <h1 className="text-3xl font-black text-white">Register your ISP</h1>
          <p className="text-slate-400 mt-2 text-sm">14-day free trial · No credit card needed</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
          <Suspense fallback={<div className="text-center text-slate-400 py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
            <SignupForm />
          </Suspense>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
