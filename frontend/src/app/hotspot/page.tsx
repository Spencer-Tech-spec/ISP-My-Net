"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Wifi,
    Zap,
    Phone,
    CreditCard,
    CheckCircle2,
    Loader2,
    Lock,
    KeyRound,
    Clock,
    Signal,
    Search,
    ChevronRight,
    HelpCircle,
    ShieldCheck,
    Copy,
    Check
} from "lucide-react";
import { createClient } from "@/lib/supabase";

function HotspotPortalContent() {
    const searchParams = useSearchParams();
    const routerId = searchParams.get("router");

    const [activeTab, setActiveTab] = useState<"buy" | "login" | "recover">("buy");
    const [packages, setPackages] = useState<any[]>([]);
    const [routerInfo, setRouterInfo] = useState<any | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [voucherCode, setVoucherCode] = useState("");
    const [recoveryPhone, setRecoveryPhone] = useState("");
    const [recoveredVouchers, setRecoveredVouchers] = useState<any[]>([]);
    const [searchingRecovery, setSearchingRecovery] = useState(false);

    const [loading, setLoading] = useState(true);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [loginProcessing, setLoginProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
    const [loginSuccess, setLoginSuccess] = useState<any | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    const supabase = createClient();
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    useEffect(() => {
        const fetchPortalData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Router Details if router ID is provided
                if (routerId) {
                    const { data: rData } = await supabase
                        .from("mikrotik_routers")
                        .select("*")
                        .eq("id", routerId)
                        .single();
                    if (rData) setRouterInfo(rData);
                }

                // 2. Fetch Packages for this router or global
                let query = supabase.from("hotspot_packages").select("*").eq("is_active", true);
                if (routerId) {
                    query = query.or(`router_id.eq.${routerId},router_id.is.null`);
                }
                const { data: pData } = await query.order("price", { ascending: true });

                if (pData && pData.length > 0) {
                    setPackages(pData);
                    setSelectedPackage(pData[0]);
                } else {
                    const defaults = [
                        { id: 1, name: "1 Hour Pass", price: 20, duration_label: "1 Hour", speed_limit: "5M/5M", device_limit: 1 },
                        { id: 2, name: "3 Hours Blast", price: 40, duration_label: "3 Hours", speed_limit: "5M/5M", device_limit: 1 },
                        { id: 3, name: "12 Hours Unlimited", price: 70, duration_label: "12 Hours", speed_limit: "6M/6M", device_limit: 1 },
                        { id: 4, name: "24 Hours Daily", price: 100, duration_label: "24 Hours", speed_limit: "8M/8M", device_limit: 1 },
                        { id: 5, name: "7 Days Weekly", price: 400, duration_label: "7 Days", speed_limit: "10M/10M", device_limit: 2 },
                        { id: 6, name: "30 Days Monthly", price: 1200, duration_label: "30 Days", speed_limit: "15M/15M", device_limit: 3 },
                    ];
                    setPackages(defaults);
                    setSelectedPackage(defaults[0]);
                }
            } catch (err) {
                console.error("Portal load error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPortalData();
    }, [routerId]);

    const handleBuyPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPackage) return;
        setPaymentProcessing(true);
        setErrorMessage(null);

        try {
            let cleanPhone = phoneNumber.replace(/[\s+]/g, "");
            if (cleanPhone.startsWith("0")) {
                cleanPhone = "254" + cleanPhone.substring(1);
            } else if (!cleanPhone.startsWith("254")) {
                cleanPhone = "254" + cleanPhone;
            }

            // 1. Trigger M-Pesa STK Push
            const response = await fetch(`${API_BASE}/api/mpesa/stk_push`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_number: cleanPhone,
                    amount: selectedPackage.price,
                    account_reference: `HOTSPOT-${routerId || "MAIN"}`,
                    transaction_desc: `Hotspot ${selectedPackage.name}`
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "Payment initiation failed");
            }

            // 2. Also prepare rescue/pending voucher for smooth user onboarding
            setPaymentSuccess({
                phone: cleanPhone,
                package: selectedPackage,
                amount: selectedPackage.price,
                message: "M-Pesa STK PIN prompt sent to your phone! Complete the payment on your device."
            });
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to process payment");
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handleVoucherLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginProcessing(true);
        setErrorMessage(null);

        try {
            const cleanCode = voucherCode.trim().toUpperCase();
            
            // Check voucher in Supabase
            const { data: vData, error } = await supabase
                .from("hotspot_vouchers")
                .select("*")
                .ilike("code", cleanCode)
                .single();

            if (error || !vData) {
                throw new Error("Invalid voucher code. Please check your spelling or contact support.");
            }

            if (vData.status === "expired") {
                throw new Error("This voucher code has expired.");
            }

            // Mark as active/connected
            setLoginSuccess({
                code: vData.code,
                packageName: vData.package_name,
                duration: `${vData.duration_minutes || 60} Minutes`,
                speed: vData.speed_limit || "High Speed",
            });
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setLoginProcessing(false);
        }
    };

    const handleRecoverVouchers = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchingRecovery(true);
        setRecoveredVouchers([]);

        try {
            let cleanPhone = recoveryPhone.replace(/[\s+]/g, "").trim();
            if (cleanPhone.startsWith("0")) cleanPhone = "254" + cleanPhone.substring(1);

            const { data } = await supabase
                .from("hotspot_vouchers")
                .select("*")
                .ilike("phone_number", `%${cleanPhone}%`)
                .order("created_at", { ascending: false })
                .limit(5);

            setRecoveredVouchers(data || []);
            if (!data || data.length === 0) {
                setErrorMessage("No recent vouchers found for this phone number.");
            }
        } catch (err: any) {
            setErrorMessage("Search failed: " + err.message);
        } finally {
            setSearchingRecovery(false);
        }
    };

    const handleCopyCode = async (code: string) => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2500);
                return;
            }
        } catch {
            // fallback below
        }

        try {
            const textArea = document.createElement("textarea");
            textArea.value = code;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2500);
        } catch (err) {
            console.error("Copy code failed:", err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white font-sans">
            {/* Top Bar / Header */}
            <header className="px-6 py-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-white">
                            <Wifi className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-lg leading-tight text-white tracking-tight">
                                {routerInfo?.hotspot_name || "MyNet High-Speed WiFi"}
                            </h1>
                            <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected to Hotspot
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center py-8">
                {/* Navigation Pills */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800 mb-6">
                    <button
                        onClick={() => {
                            setActiveTab("buy");
                            setErrorMessage(null);
                        }}
                        className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === "buy"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Zap size={14} /> Buy Pass
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("login");
                            setErrorMessage(null);
                        }}
                        className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === "login"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <KeyRound size={14} /> Enter Voucher
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("recover");
                            setErrorMessage(null);
                        }}
                        className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === "recover"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Search size={14} /> Find Voucher
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-semibold animate-in slide-in-from-top-2">
                        {errorMessage}
                    </div>
                )}

                {/* TAB 1: BUY PACKAGE */}
                {activeTab === "buy" && (
                    <>
                        {paymentSuccess ? (
                            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-8 text-center space-y-6 animate-in zoom-in-95">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={36} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white">M-Pesa STK Sent!</h3>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Enter your <strong>M-Pesa PIN</strong> on your phone (<strong>{paymentSuccess.phone}</strong>) for <strong>KES {paymentSuccess.amount}</strong>.
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-400">Package:</span>
                                        <span className="text-white">{paymentSuccess.package?.name}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-400">Duration:</span>
                                        <span className="text-white">{paymentSuccess.package?.duration_label}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-400">Speed:</span>
                                        <span className="text-emerald-400">{paymentSuccess.package?.speed_limit || "5M/5M"}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setActiveTab("login");
                                            setPaymentSuccess(null);
                                        }}
                                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/30"
                                    >
                                        I Have Paid / Enter Voucher Code →
                                    </button>
                                    <button
                                        onClick={() => setPaymentSuccess(null)}
                                        className="w-full py-2.5 text-slate-400 hover:text-white font-bold text-xs"
                                    >
                                        Cancel or Pay Again
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleBuyPackage} className="space-y-6">
                                {/* Package Selection Grid */}
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                        Select Internet Pass
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {packages.map((pkg) => {
                                            const isSelected = selectedPackage?.id === pkg.id;
                                            return (
                                                <button
                                                    type="button"
                                                    key={pkg.id}
                                                    onClick={() => setSelectedPackage(pkg)}
                                                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                                                        isSelected
                                                            ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-600/10"
                                                            : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-blue-300">
                                                                {pkg.duration_label}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-extrabold text-sm text-white mt-1">{pkg.name}</h4>
                                                    </div>

                                                    <div className="mt-4 pt-2 border-t border-white/5 flex items-baseline justify-between">
                                                        <span className="text-lg font-black text-white">KES {pkg.price}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{pkg.speed_limit || "5M/5M"}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Phone Number Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                        M-Pesa Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="0712345678 or 2547..."
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium ml-1">
                                        An STK Push PIN prompt will pop up on your phone instantly.
                                    </p>
                                </div>

                                {/* Pay Button */}
                                <button
                                    type="submit"
                                    disabled={paymentProcessing || !selectedPackage}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {paymentProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending M-Pesa Prompt...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5" />
                                            Pay KES {selectedPackage?.price || 0} via M-Pesa
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* TAB 2: VOUCHER LOGIN */}
                {activeTab === "login" && (
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
                        {loginSuccess ? (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                    <Wifi size={36} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white">Internet Connected!</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        You are now online with <strong>{loginSuccess.packageName}</strong>.
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-400">Duration:</span>
                                        <span className="text-white">{loginSuccess.duration}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-400">Speed:</span>
                                        <span className="text-emerald-400">{loginSuccess.speed}</span>
                                    </div>
                                </div>

                                <a
                                    href="https://www.google.com"
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all block"
                                >
                                    Start Browsing Internet →
                                </a>
                            </div>
                        ) : (
                            <form onSubmit={handleVoucherLogin} className="space-y-5">
                                <div className="text-center space-y-1 mb-2">
                                    <h3 className="text-xl font-extrabold text-white">Login with Voucher</h3>
                                    <p className="text-xs text-slate-400">Enter the voucher code sent to your phone or SMS.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                        Voucher Code
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. MNET-849-2XQ"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono font-bold text-lg uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={voucherCode}
                                            onChange={(e) => setVoucherCode(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loginProcessing || !voucherCode}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {loginProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                                    Connect to Internet
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* TAB 3: FIND / RECOVER VOUCHER */}
                {activeTab === "recover" && (
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-extrabold text-white">Find My Voucher</h3>
                            <p className="text-xs text-slate-400">
                                Paid but didn&apos;t get code? Search your active vouchers by phone number.
                            </p>
                        </div>

                        <form onSubmit={handleRecoverVouchers} className="space-y-4">
                            <div className="relative">
                                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter your phone number..."
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={recoveryPhone}
                                    onChange={(e) => setRecoveryPhone(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={searchingRecovery || !recoveryPhone}
                                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
                            >
                                {searchingRecovery ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Lookup Vouchers
                            </button>
                        </form>

                        {recoveredVouchers.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Found Vouchers ({recoveredVouchers.length}):
                                </label>
                                {recoveredVouchers.map((v) => (
                                    <div
                                        key={v.id}
                                        className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="text-xs font-bold text-blue-400">{v.package_name}</span>
                                            <div className="text-lg font-mono font-black text-white tracking-wider mt-0.5">
                                                {v.code}
                                            </div>
                                            <span className="text-[10px] text-slate-500">
                                                Status: {v.status} • {new Date(v.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setVoucherCode(v.code);
                                                setActiveTab("login");
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                                        >
                                            Use Code →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
                Powered by MyNet Billing & Hotspot Gateway • Secure & Instant
            </footer>
        </div>
    );
}

export default function HotspotPortalPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">Loading Hotspot Portal...</div>}>
            <HotspotPortalContent />
        </Suspense>
    );
}
