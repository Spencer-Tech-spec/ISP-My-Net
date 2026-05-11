"use client";

import React, { useState, useEffect } from "react";
import {
    Download,
    Search,
    Calendar,
    ChevronDown,
    CheckCircle,
    Clock,
    AlertCircle,
    BarChart3
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function PaymentsPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) console.error("Error fetching transactions:", error);
            else if (data) setTransactions(data);
            setLoading(false);
        };
        fetchTransactions();
    }, [supabase]);

    const stats = [
        { label: "Today's Revenue", value: "KES 42,500", icon: <BarChart3 size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Total Transactions", value: "842", icon: <CheckCircle size={18} />, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Failed Attempts", value: "12", icon: <AlertCircle size={18} />, color: "text-rose-600", bg: "bg-rose-50" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Finance & Payments</h2>
                    <p className="text-slate-500 text-sm">Review all M-Pesa transactions and reconcile payments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
                        <Calendar size={18} />
                        Check Date Range
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/10">
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Table Container */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                {/* Tabs & Search */}
                <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full lg:w-auto">
                        {["all", "completed", "pending", "failed"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by transaction ID or customer..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">Transaction ID</th>
                                <th className="px-6 py-5">Customer Details</th>
                                <th className="px-6 py-5">Method</th>
                                <th className="px-6 py-5">Amount</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.map((tx, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm font-bold text-slate-700">{tx.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-slate-800">{tx.customer}</p>
                                            <p className="text-xs text-slate-500 font-medium">{tx.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-tighter">
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-slate-900">KES {tx.amount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tx.status === "Completed" ? "bg-emerald-50 text-emerald-600" :
                                            tx.status === "Pending" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                            }`}>
                                            {tx.status === "Completed" ? <CheckCircle size={10} /> : tx.status === "Pending" ? <Clock size={10} /> : <AlertCircle size={10} />}
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-medium text-slate-600">{tx.date}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 flex items-center justify-center">
                    <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group transition-all">
                        Load More Transactions
                        <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
