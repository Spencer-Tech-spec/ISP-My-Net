"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    CreditCard,
    LayoutDashboard,
    Settings,
    LogOut,
    Wifi,
    ShieldCheck,
    UserCog,
    Menu,
    X,
    Ticket,
    AlertOctagon,
    Percent,
    Lock,
    ArrowRight,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface FreezeInfo {
    is_frozen: boolean;
    is_overdue: boolean;
    billing_month: string;
    gross_revenue: number;
    fee_due: number;
    overdue_amount: number;
    current_invoice?: any;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const [userName, setUserName] = useState("ISP Admin");
    const [userRole, setUserRole] = useState("Administrator");
    const [userInitials, setUserInitials] = useState("IA");

    // System Freeze / Overdue State
    const [freezeInfo, setFreezeInfo] = useState<FreezeInfo | null>(null);
    const [freezePhone, setFreezePhone] = useState("");
    const [freezeGateway, setFreezeGateway] = useState<"payhero" | "mpesa">("payhero");
    const [payingFreeze, setPayingFreeze] = useState(false);
    const [freezeMsg, setFreezeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const getToken = () => {
        if (typeof window !== "undefined") return localStorage.getItem("isp_token") || "";
        return "";
    };

    const checkFreezeStatus = async () => {
        try {
            const token = getToken();
            const res = await fetch(`${backendUrl}/subscriptions/revenue-billing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.is_frozen || data.is_overdue) {
                    setFreezeInfo(data);
                } else {
                    setFreezeInfo(null);
                }
            }
        } catch (e) {
            // Silently handle in case backend is offline
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            try {
                // First attempt getUser()
                let user = null;
                try {
                    const userRes = await supabase.auth.getUser();
                    if (userRes?.data?.user) {
                        user = userRes.data.user;
                    }
                } catch (_) {
                    // Ignored: fallback to session below
                }

                if (!user) {
                    // Fallback to getSession() in case getUser() had signal abort
                    const sessionRes = await supabase.auth.getSession().catch(() => null);
                    if (sessionRes?.data?.session?.user) {
                        user = sessionRes.data.session.user;
                    }
                }

                const adminEmails = ['muneneoscar599@gmail.com', 'lordcommander334@gmail.com'];

                if (!user) {
                    const token = getToken();
                    if (!token) {
                        router.push("/login?error=Please+login+to+access+admin");
                    }
                    return;
                }

                if (!adminEmails.includes(user.email || '') && user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'isp_owner') {
                    router.push("/login?error=Unauthorized");
                    return;
                }

                // Populate user info dynamically
                const fullName = user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : "ISP Admin");
                setUserName(fullName);
                const initials = fullName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || "IA";
                setUserInitials(initials);
                const isSuperAdmin = adminEmails.includes(user.email || '');
                setUserRole(isSuperAdmin ? "Super Administrator" : (user.user_metadata?.role === 'isp_owner' ? "ISP Owner" : "Administrator"));

                // Sync auth token
                const sessionRes = await supabase.auth.getSession().catch(() => null);
                if (sessionRes?.data?.session?.access_token) {
                    localStorage.setItem("isp_token", sessionRes.data.session.access_token);
                }

                // Check overdue & freeze status
                checkFreezeStatus();
            } catch (err) {
                console.warn("Auth check warning:", err);
            } finally {
                setLoading(false);
            }
        };

        checkUser();

        // Listen for token refreshes and auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session?.access_token) {
                localStorage.setItem("isp_token", session.access_token);
            }
        });

        // Check freeze status every 15 seconds
        const interval = setInterval(checkFreezeStatus, 15000);
        return () => {
            clearInterval(interval);
            subscription?.unsubscribe();
        };
    }, [router, supabase.auth]);

    const handleSettleFreeze = async () => {
        if (!freezePhone) {
            setFreezeMsg({ type: "error", text: "Please enter phone number to receive payment prompt." });
            return;
        }

        const amount = freezeInfo?.overdue_amount || freezeInfo?.fee_due || 0;
        setPayingFreeze(true);
        setFreezeMsg(null);

        try {
            const endpoint = freezeGateway === "payhero"
                ? `${backendUrl}/payhero/saas/pay`
                : `${backendUrl}/subscriptions/pay-commission`;

            const payload = freezeGateway === "payhero"
                ? {
                    amount: amount,
                    phone_number: freezePhone,
                    invoice_id: freezeInfo?.current_invoice?.id
                }
                : {
                    amount: amount,
                    phone_number: freezePhone,
                    invoice_id: freezeInfo?.current_invoice?.id,
                    gateway: "mpesa"
                };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.message || "Payment initiation failed.");

            setFreezeMsg({
                type: "success",
                text: `Payment prompt sent to ${freezePhone}. Please enter your PIN on your phone. System will automatically unfreeze once confirmed.`
            });

            // Poll rapidly every 3 seconds for unfreeze
            const pollInterval = setInterval(async () => {
                await checkFreezeStatus();
            }, 3000);

            setTimeout(() => clearInterval(pollInterval), 60000);
        } catch (err: any) {
            setFreezeMsg({ type: "error", text: err.message || "Failed to initiate payment." });
        } finally {
            setPayingFreeze(false);
        }
    };

    const navItems = [
        { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
        { label: "Subscribers", href: "/admin/users", icon: <Users size={20} /> },
        { label: "Payments", href: "/admin/payments", icon: <CreditCard size={20} /> },
        { label: "Network Management", href: "/admin/network", icon: <Wifi size={20} /> },
        { label: "Payroll Control", href: "/admin/payroll", icon: <CreditCard size={20} /> },
        { label: "Staff Management", href: "/admin/employees", icon: <UserCog size={20} /> },
        { label: "Support Tickets", href: "/admin/tickets", icon: <Ticket size={20} /> },
        { label: "Platform Billing (3%)", href: "/billing", icon: <Percent size={20} /> },
        { label: "Settings", href: "/admin/settings", icon: <Settings size={20} /> },
    ];

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-slate-600 font-medium">Authenticating Admin...</p>
                </div>
            </div>
        );
    }

    const isSystemFrozen = !!(freezeInfo && (freezeInfo.is_frozen || freezeInfo.is_overdue));

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative">
            {/* Mobile Drawer Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <aside
                className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 md:hidden ${
                    mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                }`}
            >
                <div className="p-5 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                            <ShieldCheck className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-900">Admin Hub</span>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                        aria-label="Close Menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${
                                pathname === item.href
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            }`}
                        >
                            <div className={pathname === item.href ? "text-white" : "text-slate-400"}>
                                {item.icon}
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={async () => {
                            if (typeof window !== "undefined") {
                                localStorage.removeItem("isp_token");
                            }
                            await supabase.auth.signOut();
                            router.push("/login");
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium text-sm"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex ${isSidebarOpen ? "w-64" : "w-20"
                    } transition-all duration-300 bg-white border-r border-slate-200 flex-col fixed h-full z-40`}
            >
                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && "hidden"}`}>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <ShieldCheck className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Admin Hub</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto mt-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${pathname === item.href
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                }`}
                        >
                            <div className={`${pathname === item.href ? "text-white" : "text-slate-400 group-hover:text-blue-600"}`}>
                                {item.icon}
                            </div>
                            {isSidebarOpen && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={async () => {
                            if (typeof window !== "undefined") {
                                localStorage.removeItem("isp_token");
                            }
                            await supabase.auth.signOut();
                            router.push("/login");
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ml-0 ${isSidebarOpen ? "md:ml-64" : "md:ml-20"} min-w-0 max-w-full overflow-x-hidden`}>
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600 md:hidden transition-colors"
                            aria-label="Open Navigation"
                        >
                            <Menu size={22} />
                        </button>
                        <h1 className="text-base sm:text-xl font-bold text-slate-800 truncate">
                            {navItems.find(item => item.href === pathname)?.label || "Dashboard"}
                        </h1>
                        <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            3% Revenue Plan
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <Link
                            href="/billing"
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-100 transition-all"
                        >
                            Billing
                        </Link>
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900 leading-tight">{userName}</span>
                            <span className="text-xs text-slate-500">{userRole}</span>
                        </div>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm">
                            {userInitials}
                        </div>
                    </div>
                </header>

                <div className="p-3 sm:p-6 md:p-8 max-w-full overflow-x-hidden">
                    {children}
                </div>
            </main>

            {/* ─── SYSTEM UNRESPONSIVE / OVERDUE LOCKOUT MODAL ─── */}
            {isSystemFrozen && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-slate-900 border-2 border-red-500/80 rounded-3xl p-8 shadow-2xl shadow-red-500/20 text-white animate-in zoom-in-95 duration-300">
                        {/* Red Warning Header */}
                        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                            <div className="w-14 h-14 rounded-2xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-600/20">
                                <AlertOctagon size={32} />
                            </div>
                            <div>
                                <span className="text-xs font-extrabold uppercase tracking-widest text-red-400 block">
                                    CRITICAL SERVICE LOCKOUT
                                </span>
                                <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
                                    System Unresponsive
                                </h2>
                            </div>
                        </div>

                        {/* Lockout Explanation */}
                        <div className="my-6 space-y-4">
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Your My Net platform subscription is <strong className="text-red-400">overdue</strong>. In accordance with your 3% monthly revenue agreement, router automation, client activations, and staff controls are <strong className="text-white">temporarily unresponsive</strong> until settled.
                            </p>

                            {/* Financial breakdown card */}
                            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-slate-400 block font-medium">Billing Period</span>
                                    <span className="text-sm font-bold text-white">{freezeInfo?.billing_month || "Current Cycle"}</span>
                                    <span className="text-xs text-slate-400 block mt-1">ISP Gross Revenue</span>
                                    <span className="text-xs font-semibold text-slate-300">KES {(freezeInfo?.gross_revenue || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-red-400 font-bold block uppercase tracking-wider">Amount Due (3%)</span>
                                    <span className="text-2xl font-black text-white">
                                        KES {(freezeInfo?.overdue_amount || freezeInfo?.fee_due || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Gateway Selector */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFreezeGateway("payhero")}
                                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                        freezeGateway === "payhero"
                                            ? "border-blue-500 bg-blue-600/20 text-white ring-1 ring-blue-500"
                                            : "border-white/10 text-slate-400 hover:bg-white/5"
                                    }`}
                                >
                                    PayHero Gateway
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFreezeGateway("mpesa")}
                                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                        freezeGateway === "mpesa"
                                            ? "border-emerald-500 bg-emerald-600/20 text-white ring-1 ring-emerald-500"
                                            : "border-white/10 text-slate-400 hover:bg-white/5"
                                    }`}
                                >
                                    M-Pesa Daraja Direct
                                </button>
                            </div>

                            {/* Phone Input & Trigger */}
                            <div className="flex gap-2 pt-1">
                                <input
                                    type="text"
                                    value={freezePhone}
                                    onChange={(e) => setFreezePhone(e.target.value)}
                                    placeholder="Enter M-Pesa phone (07... or 254...)"
                                    className="flex-1 px-4 py-3 bg-white/[0.06] border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500"
                                />
                                <button
                                    onClick={handleSettleFreeze}
                                    disabled={payingFreeze}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/40 flex items-center gap-2 disabled:opacity-50 transition-all shrink-0"
                                >
                                    {payingFreeze ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Settle & Restore</span>
                                            <ArrowRight size={14} />
                                        </>
                                    )}
                                </button>
                            </div>

                            {freezeMsg && (
                                <div className={`p-3 rounded-xl text-xs font-medium ${
                                    freezeMsg.type === "success"
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                                }`}>
                                    {freezeMsg.text}
                                </div>
                            )}
                        </div>

                        <div className="pt-2 text-center border-t border-white/10">
                            <span className="text-[11px] text-slate-400">
                                Need manual review? Contact My Net Platform Support: <span className="text-white font-medium">+254 706 656 544</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
