"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ShieldCheck,
    Building2,
    Users,
    CreditCard,
    DollarSign,
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Lock,
    Unlock,
    Search,
    ExternalLink,
    RefreshCw,
    Sliders,
    Zap,
    Percent,
    ArrowUpRight,
    TrendingUp,
    Server,
    X,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function SuperAdminPlatformPage() {
    const [metrics, setMetrics] = useState({
        total_tenants: 0,
        active_tenants: 0,
        trial_tenants: 0,
        suspended_tenants: 0,
        total_end_subscribers: 0,
        total_gross_processed: 0,
        total_commission_collected: 0,
        system_status: "operational"
    });
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Commission modal state
    const [showCommissionModal, setShowCommissionModal] = useState<any | null>(null);
    const [newCommissionRate, setNewCommissionRate] = useState(3.0);

    const router = useRouter();
    const supabase = createClient();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const getToken = () => {
        if (typeof window !== "undefined") return localStorage.getItem("isp_token") || "";
        return "";
    };

    const fetchSuperAdminData = async () => {
        setLoading(true);
        const token = getToken();
        try {
            // 1. Fetch Metrics
            const metricsRes = await fetch(`${backendUrl}/platform-admin/metrics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (metricsRes.ok) {
                const mData = await metricsRes.json();
                setMetrics(mData);
            }

            // 2. Fetch Tenants
            const tenantsRes = await fetch(`${backendUrl}/platform-admin/tenants`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (tenantsRes.ok) {
                const tData = await tenantsRes.json();
                setTenants(tData);
            }
        } catch (e: any) {
            console.error("Super Admin fetch failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuperAdminData();
    }, []);

    const handleImpersonateTenant = (tenant: any) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("impersonate_isp_id", tenant.id);
            localStorage.setItem("impersonate_isp_name", tenant.company_name);
            setActionMsg({ type: "success", text: `Switched context to ${tenant.company_name}. Redirecting to ISP Dashboard...` });
            setTimeout(() => {
                router.push("/admin");
            }, 1000);
        }
    };

    const handleToggleFreeze = async (tenant: any) => {
        setIsUpdating(true);
        const token = getToken();
        const willFreeze = !tenant.is_frozen;
        try {
            const res = await fetch(`${backendUrl}/platform-admin/tenants/${tenant.id}/status`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: willFreeze ? "suspended" : "active",
                    is_frozen: willFreeze
                })
            });

            if (!res.ok) throw new Error("Failed to update tenant status.");

            setActionMsg({
                type: "success",
                text: `${tenant.company_name} is now ${willFreeze ? "FROZEN (Access Restricted)" : "ACTIVE & UNFROZEN"}.`
            });
            await fetchSuperAdminData();
        } catch (err: any) {
            setActionMsg({ type: "error", text: err.message || "Failed to update." });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExtendTrial = async (tenant: any) => {
        setIsUpdating(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/platform-admin/tenants/${tenant.id}/extend-trial`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ extra_days: 14 })
            });

            if (!res.ok) throw new Error("Failed to extend trial.");

            setActionMsg({ type: "success", text: `Extended 14 days trial for ${tenant.company_name}!` });
            await fetchSuperAdminData();
        } catch (err: any) {
            setActionMsg({ type: "error", text: err.message || "Failed to extend trial." });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateCommission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showCommissionModal) return;
        setIsUpdating(true);
        const token = getToken();
        try {
            const res = await fetch(`${backendUrl}/platform-admin/tenants/${showCommissionModal.id}/commission-rate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ percentage: Number(newCommissionRate) })
            });

            if (!res.ok) throw new Error("Failed to update commission rate.");

            setActionMsg({
                type: "success",
                text: `Updated platform commission for ${showCommissionModal.company_name} to ${newCommissionRate}%.`
            });
            setShowCommissionModal(null);
            await fetchSuperAdminData();
        } catch (err: any) {
            setActionMsg({ type: "error", text: err.message || "Error updating rate." });
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredTenants = tenants.filter(t => {
        const matchesStatus = statusFilter === "all" || t.subscription_status === statusFilter;
        const matchesSearch =
            (t.company_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.slug || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.owner_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.county || "").toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                            <ShieldCheck size={16} /> My Net SaaS Platform Owner Portal
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            Super-Admin Operations Command
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Global oversight of all subscribed Kenyan ISPs, billing collection, system locks, and multi-tenant health.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2"
                        >
                            Return to ISP Panel
                        </Link>
                        <button
                            onClick={fetchSuperAdminData}
                            disabled={loading}
                            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-lg shadow-blue-500/20"
                            title="Refresh Platform State"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Status alert message */}
                {actionMsg && (
                    <div
                        className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
                            actionMsg.type === "success"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                                : "bg-rose-950/80 text-rose-300 border border-rose-800"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {actionMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                            {actionMsg.text}
                        </div>
                        <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Macro Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            <span>Subscribed ISPs</span>
                            <Building2 size={18} className="text-blue-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">{metrics.total_tenants}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="text-emerald-400 font-bold">{metrics.active_tenants} active</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-amber-400 font-medium">{metrics.trial_tenants} trial</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-rose-400 font-medium">{metrics.suspended_tenants} suspended</span>
                        </div>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            <span>Gross ISP Collections</span>
                            <DollarSign size={18} className="text-emerald-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">KES {metrics.total_gross_processed.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-2">Total customer M-Pesa volume processed</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            <span>Platform Commission (3%)</span>
                            <Percent size={18} className="text-purple-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-purple-300">KES {metrics.total_commission_collected.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-2">Collected into My Net platform account</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            <span>End Subscribers Managed</span>
                            <Users size={18} className="text-teal-400" />
                        </div>
                        <p className="text-3xl font-extrabold text-white">{metrics.total_end_subscribers.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400 font-medium">
                            <Activity size={14} /> Platform Status: Operational
                        </div>
                    </div>
                </div>

                {/* Tenant Directory Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter ISPs by name, email, county, or slug..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                        {["all", "active", "trial", "suspended"].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                                    statusFilter === st
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tenants Table */}
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/60 border-b border-slate-700 text-xs font-bold uppercase text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">ISP Company</th>
                                    <th className="px-6 py-4">Owner & Location</th>
                                    <th className="px-6 py-4">Customers</th>
                                    <th className="px-6 py-4">Commission</th>
                                    <th className="px-6 py-4">Status & Health</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                            Loading ISP tenant registry...
                                        </td>
                                    </tr>
                                ) : filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-400">
                                            No ISP tenants found matching your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTenants.map(t => {
                                        const isFrozen = t.is_frozen || t.subscription_status === "suspended";
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-750 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white text-base">{t.company_name}</div>
                                                    <div className="text-xs text-slate-400 font-mono">slug: /{t.slug}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-slate-200">{t.owner_email}</div>
                                                    <div className="text-xs text-slate-400">{t.county || "Kenya"} {t.phone ? `• ${t.phone}` : ""}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white">
                                                    {t.actual_customer_count || 0}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            setShowCommissionModal(t);
                                                            setNewCommissionRate(t.revenue_percentage || 3.0);
                                                        }}
                                                        className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold hover:bg-purple-900 transition flex items-center gap-1"
                                                    >
                                                        {t.revenue_percentage || 3.0}% Rev-Share <Sliders size={12} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                                                                isFrozen
                                                                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                                                                    : t.subscription_status === "active"
                                                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                                                    : "bg-amber-950 text-amber-300 border border-amber-800"
                                                            }`}
                                                        >
                                                            {isFrozen ? "FROZEN" : t.subscription_status}
                                                        </span>
                                                        {t.is_frozen && (
                                                            <Lock size={14} className="text-rose-400" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleImpersonateTenant(t)}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                                                        title="Log in as this ISP's administrator"
                                                    >
                                                        Impersonate
                                                    </button>
                                                    <button
                                                        onClick={() => handleExtendTrial(t)}
                                                        disabled={isUpdating}
                                                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition"
                                                        title="Add +14 Days Trial"
                                                    >
                                                        +14d Trial
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleFreeze(t)}
                                                        disabled={isUpdating}
                                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                                            isFrozen
                                                                ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                                                                : "bg-rose-800 hover:bg-rose-700 text-white"
                                                        }`}
                                                        title={isFrozen ? "Unfreeze ISP Access" : "Lock / Freeze ISP Access"}
                                                    >
                                                        {isFrozen ? <Unlock size={14} /> : <Lock size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL: CUSTOM COMMISSION */}
                {showCommissionModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Percent className="text-purple-400" size={20} /> Commission Rate: {showCommissionModal.company_name}
                                </h3>
                                <button onClick={() => setShowCommissionModal(null)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateCommission} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Platform Revenue Share (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="50"
                                        required
                                        value={newCommissionRate}
                                        onChange={(e) => setNewCommissionRate(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Default standard rate is 3.00% of gross monthly collections.</p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowCommissionModal(null)}
                                        className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                                    >
                                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : "Save Rate"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
