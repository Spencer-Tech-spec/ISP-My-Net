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
    BarChart3,
    RefreshCw,
    CreditCard,
    Percent
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function PaymentsPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching transactions:", error);
                setTransactions([]);
            } else if (data) {
                setTransactions(data);
            }
        } catch (err) {
            console.error("Transactions fetch exception:", err);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    // Calculate real live statistics from database
    const today = new Date().toISOString().slice(0, 10);
    const completedTxs = transactions.filter(t => (t.status || "").toUpperCase() === "COMPLETED" || (t.status || "").toLowerCase() === "completed");
    
    const todaysRevenue = completedTxs
        .filter(t => t.created_at && t.created_at.startsWith(today))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalRevenue = completedTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const failedAttempts = transactions.filter(t => (t.status || "").toUpperCase() === "FAILED" || (t.status || "").toLowerCase() === "failed").length;

    const stats = [
        {
            label: "Today's Revenue",
            value: `KES ${todaysRevenue.toLocaleString()}`,
            icon: <BarChart3 size={18} />,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            label: "Total Transactions",
            value: transactions.length.toLocaleString(),
            icon: <CheckCircle size={18} />,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            label: "Failed Attempts",
            value: failedAttempts.toLocaleString(),
            icon: <AlertCircle size={18} />,
            color: "text-rose-600",
            bg: "bg-rose-50"
        },
        {
            label: "Platform Fee (3%)",
            value: `KES ${(totalRevenue * 0.03).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            icon: <Percent size={18} />,
            color: "text-violet-600",
            bg: "bg-violet-50"
        },
    ];

    const filteredTransactions = transactions.filter(tx => {
        const statusMatch = activeTab === "all" ? true : (tx.status || "").toLowerCase() === activeTab.toLowerCase();
        const searchMatch = searchTerm
            ? (tx.phone_number?.includes(searchTerm) ||
               tx.mpesa_receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               tx.account_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               String(tx.id).includes(searchTerm))
            : true;
        return statusMatch && searchMatch;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Finance & Payments</h2>
                    <p className="text-slate-500 text-sm">Review real-time M-Pesa transactions and reconcile customer payments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchTransactions}
                        className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        title="Refresh Transactions"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => {
                            if (transactions.length === 0) {
                                alert("No transaction data available to export.");
                                return;
                            }
                            const csvContent = "data:text/csv;charset=utf-8," +
                                ["ID,Receipt,Phone,Amount,Status,Account,Date"].join(",") + "\n" +
                                transactions.map(t => `${t.id},${t.mpesa_receipt_number || ""},${t.phone_number},${t.amount},${t.status},${t.account_reference || ""},${t.created_at}`).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `mpesa_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/10"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
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
                                className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                                    activeTab === tab
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
                            placeholder="Search by receipt, phone, account..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">Receipt / ID</th>
                                <th className="px-6 py-5">Gateway</th>
                                <th className="px-6 py-5">Phone Number</th>
                                <th className="px-6 py-5">Account Ref</th>
                                <th className="px-6 py-5">Amount</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                                        Loading live transactions...
                                    </td>
                                </tr>
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm font-bold text-blue-600">
                                                {tx.mpesa_receipt_number || `#${tx.id}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                                                (tx.gateway || '').toLowerCase() === 'payhero'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            }`}>
                                                {(tx.gateway || '').toLowerCase() === 'payhero' ? 'EXPRESS' : 'DIRECT'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {tx.phone_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-tight">
                                                {tx.account_reference || "MyNetISP"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-900">KES {Number(tx.amount || 0).toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                (tx.status || "").toLowerCase() === "completed"
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : (tx.status || "").toLowerCase() === "pending"
                                                    ? "bg-amber-50 text-amber-600"
                                                    : "bg-rose-50 text-rose-600"
                                            }`}>
                                                {(tx.status || "").toLowerCase() === "completed" ? (
                                                    <CheckCircle size={10} />
                                                ) : (tx.status || "").toLowerCase() === "pending" ? (
                                                    <Clock size={10} />
                                                ) : (
                                                    <AlertCircle size={10} />
                                                )}
                                                {tx.status || "Completed"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-medium text-slate-600">
                                            {tx.created_at ? new Date(tx.created_at).toLocaleString() : "Just now"}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-400">
                                        <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                        <p className="font-bold text-slate-600">No transactions recorded yet</p>
                                        <p className="text-xs text-slate-400 mt-1">Live customer payments via mobile money will appear here automatically.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
