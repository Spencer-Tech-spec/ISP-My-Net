"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Zap, Globe, Shield, Users, CreditCard, BarChart3,
  Wifi, PhoneCall, Bot, CheckCircle, ArrowRight, Menu, X,
  Star, Building2, Wrench, MessageSquare
} from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how-it-works", label: "How It Works" },
];

const PLANS = [
  {
    id: "starter", name: "Starter", price: 400, popular: false,
    color: "from-slate-600 to-slate-800",
    features: ["Up to 100 customers", "3 staff accounts", "MikroTik control", "M-Pesa billing", "Basic support", "100 SMS/month"],
  },
  {
    id: "standard", name: "Standard", price: 700, popular: true,
    color: "from-blue-600 to-indigo-700",
    features: ["Up to 500 customers", "10 staff accounts", "AI Support Assistant", "SMS Notifications", "Advanced analytics", "Employee payroll", "Ticket management", "Priority email support"],
  },
  {
    id: "enterprise", name: "Enterprise", price: 1500, popular: false,
    color: "from-violet-600 to-purple-800",
    features: ["Unlimited customers", "50 staff accounts", "Everything in Standard", "API access", "White labeling", "Custom domain", "Priority phone support", "Dedicated onboarding"],
  },
];

const FEATURES = [
  { icon: Wifi, title: "MikroTik & SmartOLT", desc: "Directly control your routers and fiber OLT devices from one dashboard.", color: "text-blue-500" },
  { icon: CreditCard, title: "M-Pesa Integration", desc: "Automated STK push billing. Customers pay and get activated instantly.", color: "text-green-500" },
  { icon: Bot, title: "AI Support Assistant", desc: "AI-powered chatbot handles tier-1 support, freeing your team.", color: "text-purple-500" },
  { icon: Users, title: "Staff Management", desc: "Role-based access: Owner, Manager, Technician, Cashier — each sees only what they need.", color: "text-amber-500" },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Revenue trends, active subscribers, payment history — all in one place.", color: "text-rose-500" },
  { icon: PhoneCall, title: "SMS Notifications", desc: "Auto-notify customers on payment, expiry, and network events.", color: "text-teal-500" },
  { icon: Wrench, title: "Ticket Management", desc: "Track customer complaints, dispatch technicians with GPS, resolve faster.", color: "text-orange-500" },
  { icon: MessageSquare, title: "Customer Portal", desc: "Let customers check their own status, pay bills, and raise tickets online.", color: "text-indigo-500" },
];

const STEPS = [
  { step: "01", title: "Sign Up in 2 Minutes", desc: "Create your ISP account and start your 14-day free trial. No credit card required." },
  { step: "02", title: "Configure Your Network", desc: "Enter your MikroTik credentials, M-Pesa shortcode, and import your customer list." },
  { step: "03", title: "Go Live", desc: "Start billing customers, managing staff, and monitoring your network from anywhere." },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060918] text-white font-sans overflow-x-hidden max-w-full">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between bg-[#060918]/90 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">ISP Cloud</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white px-4 py-2 transition-colors">Log in</Link>
          <Link href="/signup" className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <button className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle Menu">
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 pt-24 bg-[#060918]/95 backdrop-blur-2xl flex flex-col gap-5 p-6 md:hidden animate-in fade-in duration-200">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-lg font-medium text-slate-200 hover:text-white py-2 border-b border-white/5" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-4 flex flex-col gap-3">
            <Link href="/login" className="text-center font-bold text-slate-300 py-3 bg-white/5 rounded-xl border border-white/10" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link href="/signup" className="text-center font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl shadow-lg shadow-blue-500/25" onClick={() => setMenuOpen(false)}>
              Start Free Trial
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
        {/* Glow orbs contained within section */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 md:left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 sm:right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
            <span>Trusted by Kenyan ISPs — 14-day free trial</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
            The Complete ISP Platform<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Built for Kenya</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Manage customers, automate M-Pesa billing, control MikroTik routers,
            and handle your entire ISP operation from one powerful platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
            <Link href="/signup" className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 font-bold text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#pricing" className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 font-semibold text-base bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-center">
              View Pricing
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-14 sm:mt-20 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-4 border-t border-white/5 pt-8 sm:pt-12">
            {[["14-Day", "Free Trial"], ["M-Pesa", "Integrated"], ["MikroTik", "Supported"], ["AI", "Powered"]].map(([val, label]) => (
              <div key={label} className="text-center min-w-[70px]">
                <div className="text-xl sm:text-2xl font-black text-white">{val}</div>
                <div className="text-xs sm:text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Everything your ISP needs</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">One platform to replace 5 different tools you&apos;re currently using.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Get started in 3 steps</h2>
            <p className="text-slate-400 text-lg">From zero to managing your ISP in under an hour.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06]">
                <div className="text-7xl font-black text-white/5 absolute top-4 right-6 select-none">{s.step}</div>
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm mb-5">{s.step}</div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-28">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-lg">Choose the plan that fits your ISP. Upgrade or downgrade anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.id} className={`relative rounded-3xl p-8 border transition-all ${plan.popular ? "border-blue-500/50 bg-gradient-to-br from-blue-950/60 to-indigo-950/60 shadow-2xl shadow-blue-500/10 md:scale-105" : "border-white/[0.08] bg-white/[0.03]"}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-slate-400">Ksh</span>
                    <span className="text-4xl font-black">{plan.price.toLocaleString()}</span>
                    <span className="text-slate-400 text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={`/signup?plan=${plan.id}`} className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${plan.popular ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25" : "bg-white/5 hover:bg-white/10 border border-white/10"}`}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-12 text-center">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <Building2 className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to modernize your ISP?</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">Join ISPs across Kenya using ISP Cloud. Start your free 14-day trial today — no card needed.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-400">ISP Cloud</span>
            <span className="ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
