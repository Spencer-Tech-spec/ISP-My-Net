"use client";

import React, { useState, useEffect } from "react";
import { 
    Wallet, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Clock, 
    CheckCircle2, 
    XCircle,
    Loader2,
    Plus,
    History,
    Building,
    CreditCard
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function EmployeePayrollPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState(false);
    const [amount, setAmount] = useState("");
    const [bankDetails, setBankDetails] = useState({
        bank_name: "",
        bank_account_number: "",
        bank_account_name: "",
        bank_code: ""
    });
    const [savingBank, setSavingBank] = useState(false);
    const supabase = createClient();

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch using the API we created
            const response = await fetch(`http://localhost:8000/employees/${user.id}/payroll`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Error fetching payroll:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, []);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Session expired. Please login again.");
                return;
            }
            const response = await fetch(`http://localhost:8000/employees/${user.id}/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(amount) })
            });

            if (response.ok) {
                setAmount("");
                fetchPayroll();
                alert("Withdrawal request submitted successfully!");
            } else {
                const err = await response.json();
                alert(err.detail || "Failed to submit request");
            }
        } catch (error) {
            alert("Network error");
        } finally {
            setWithdrawing(false);
        }
    };

    const handleSaveBank = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingBank(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const response = await fetch(`http://localhost:8000/employees/${user.id}/bank-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bankDetails)
            });
            if (response.ok) alert("Bank details saved!");
        } catch (error) {
            alert("Error saving bank details");
        } finally {
            setSavingBank(false);
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Payroll & Financials</h2>
                <p className="text-slate-500 font-medium mt-1">Track your earnings and manage withdrawal requests.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-12">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Available Balance</span>
                            </div>
                            <h3 className="text-sm font-medium opacity-80 mb-1">Total Balance</h3>
                            <p className="text-4xl font-black mb-8">KES {data.balance.toLocaleString()}</p>
                            <div className="flex items-center gap-2 text-xs font-bold opacity-80">
                                <Clock size={14} />
                                Last updated: Just now
                            </div>
                        </div>
                        {/* Abstract shapes */}
                        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                    </div>

                    {/* Withdrawal Form */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
                        <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-indigo-600" />
                            Request Withdrawal
                        </h4>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Amount (KES)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        required
                                        min="100"
                                        placeholder="Min. 100"
                                        className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">KES</span>
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={withdrawing || parseFloat(amount) > data.balance}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {withdrawing ? <Loader2 size={20} className="animate-spin" /> : "Request Funds"}
                            </button>
                            {parseFloat(amount) > data.balance && (
                                <p className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-widest">Insufficient balance</p>
                            )}
                        </form>
                    </div>

                    {/* Bank Details Form */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl mt-6">
                        <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                            <Building size={20} className="text-indigo-600" />
                            Bank Account Details
                        </h4>
                        <form onSubmit={handleSaveBank} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bank Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="e.g. Equity Bank"
                                    value={bankDetails.bank_name}
                                    onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account Number</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="1234567890"
                                    value={bankDetails.bank_account_number}
                                    onChange={(e) => setBankDetails({...bankDetails, bank_account_number: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account Holder Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="Full Name"
                                    value={bankDetails.bank_account_name}
                                    onChange={(e) => setBankDetails({...bankDetails, bank_account_name: e.target.value})}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={savingBank}
                                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {savingBank ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                                Update Bank Info
                            </button>
                        </form>
                    </div>
                </div>

                {/* History & Requests */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Payment History */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <History className="text-indigo-600" size={24} />
                                Transaction History
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {data.history.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium">No transactions found.</div>
                            ) : (
                                data.history.map((tx: any) => (
                                    <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                                tx.type === 'salary_credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                {tx.type === 'salary_credit' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{tx.description || tx.type}</p>
                                                <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-lg ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                            </p>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pending Requests */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Clock className="text-amber-500" size={24} />
                                Withdrawal Requests
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {data.withdrawal_requests.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium">No requests yet.</div>
                            ) : (
                                data.withdrawal_requests.map((req: any) => (
                                    <div key={req.id} className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                                <Clock size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">KES {req.amount.toLocaleString()}</p>
                                                <p className="text-xs text-slate-500">Requested: {new Date(req.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                req.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {req.status}
                                            </span>
                                            {req.admin_notes && (
                                                <p className="text-[10px] text-slate-400 mt-2 italic">"{req.admin_notes}"</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
