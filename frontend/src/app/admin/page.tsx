"use client";

import React from "react";
import Link from "next/link";
import {
    Users,
    TrendingUp,
    CreditCard,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Wifi
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AdminDashboard() {
    const [liveTransactions, setLiveTransactions] = React.useState<any[]>([]);
    const [liveStats, setLiveStats] = React.useState({
        totalUsers: 0,
        revenue: 0,
        active: 0,
        pending: 0
    });
    const supabase = createClient();

    React.useEffect(() => {
        async function getLiveStats() {
            // Fetch stats
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { data: payments } = await supabase.from('transactions').select('amount').eq('status', 'Completed');

            // Fetch recent transactions
            const { data: recentTxs } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            const totalRevenue = (payments as any[])?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0;

            setLiveStats({
                totalUsers: userCount || 0,
                revenue: totalRevenue,
                active: userCount || 0,
                pending: 0
            });

            if (recentTxs) setLiveTransactions(recentTxs);
        }
        getLiveStats();
    }, [supabase]);

    const stats = [
        {
            title: "Total Subscribers",
            value: liveStats.totalUsers.toLocaleString(),
            change: "+1 new",
            isPositive: true,
            icon: <Users className="text-blue-600" size={24} />,
            bgColor: "bg-blue-50"
        },
        {
            title: "Monthly Revenue",
            value: `KES ${liveStats.revenue.toLocaleString()}`,
            change: "Live",
            isPositive: true,
            icon: <CreditCard className="text-emerald-600" size={24} />,
            bgColor: "bg-emerald-50"
        },
        {
            title: "Active Connections",
            value: liveStats.active.toLocaleString(),
            change: "Stable",
            isPositive: true,
            icon: <Activity className="text-amber-600" size={24} />,
            bgColor: "bg-amber-50"
        },
        {
            title: "Quick Support",
            value: "AI Online",
            change: "24/7",
            isPositive: true,
            icon: <CheckCircle2 className="text-indigo-600" size={24} />,
            bgColor: "bg-indigo-50"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Overview</h2>
                    <p className="text-slate-500">Real-time status of your ISP network and billing.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => alert("Downloading system report...")}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        Download Report
                    </button>
                    <button
                        onClick={() => alert("Checking for system updates...")}
                        className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                    >
                        Apply Updates
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                                }`}>
                                {stat.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {stat.change}
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-600" />
                            Recent M-Pesa Payments
                        </h3>
                        <Link href="/admin/payments" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Ref Code</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {liveTransactions.length > 0 ? (
                                    liveTransactions.map((tx: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                                                        {tx.customer_name?.charAt(0) || "U"}
                                                    </div>
                                                    <span className="font-semibold text-slate-700">
                                                        {tx.customer_name || "Unknown User"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">KES {tx.amount}</td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-500">{tx.mpesa_receipt || "PENDING"}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${tx.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-slate-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No transactions recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Network Status */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-slate-800">Network Nodes</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 text-blue-600">
                                    <Wifi size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Core Router 01</p>
                                    <p className="text-xs text-slate-500">MikroTik CCR1036</p>
                                </div>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 text-blue-600">
                                    <Wifi size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Main OLT</p>
                                    <p className="text-xs text-slate-500">ZTE C320</p>
                                </div>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        </div>

                        <div className="mt-8 p-4 bg-blue-600 rounded-2xl text-white">
                            <h4 className="font-bold mb-1">Backup Complete</h4>
                            <p className="text-xs text-blue-100 mb-4">Your entire database was backed up 2 hours ago.</p>
                            <Link
                                href="/admin/settings"
                                className="block w-full text-center py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all"
                            >
                                Manage Backups
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
