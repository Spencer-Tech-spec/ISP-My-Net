"use client";

import React, { useState, useEffect } from "react";
import { 
    DollarSign, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    User, 
    ArrowUpRight, 
    Plus,
    Loader2,
    Shield,
    Building
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function PayrollAdminPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [creditAmount, setCreditAmount] = useState("");
    const [creditDescription, setCreditDescription] = useState("");
    
    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);
        try {
            // In a real app, you'd call your backend API
            // But for now we can fetch directly from Supabase for simplicity
            const { data: employees } = await supabase
                .from('employees')
                .select('*, profiles:id(full_name, email)');
            
            const { data: requests } = await supabase
                .from('withdrawal_requests')
                .select('*, profiles:employee_id(full_name)')
                .eq('status', 'pending');

            setData({ employees: employees || [], pending_withdrawals: requests || [] });
        } catch (error) {
            console.error("Error fetching payroll data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleWithdrawal = async (requestId: number, status: string, transactionReference?: string) => {
        setActionLoading(requestId.toString());
        try {
            // Call the backend API we created earlier
            const response = await fetch(`http://localhost:8000/payroll/withdrawals/${requestId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status, 
                    admin_notes: `Processed on ${new Date().toLocaleDateString()}`,
                    transaction_reference: transactionReference
                })
            });
            
            if (response.ok) {
                fetchData();
            } else {
                alert("Failed to process withdrawal");
            }
        } catch (error) {
            alert("Network error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading("crediting");
        try {
            const response = await fetch(`http://localhost:8000/payroll/credit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    employee_id: selectedEmployee, 
                    amount: parseFloat(creditAmount), 
                    description: creditDescription 
                })
            });
            
            if (response.ok) {
                setShowCreditModal(false);
                setCreditAmount("");
                setCreditDescription("");
                fetchData();
            } else {
                alert("Failed to credit salary");
            }
        } catch (error) {
            alert("Network error");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Payroll Control</h2>
                    <p className="text-slate-500">Manage employee salaries and withdrawal requests.</p>
                </div>
                <button 
                    onClick={() => setShowCreditModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} />
                    Credit Salary
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                        <User size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Employees</p>
                    <h3 className="text-2xl font-bold text-slate-900">{data.employees.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                        <Clock size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Pending Withdrawals</p>
                    <h3 className="text-2xl font-bold text-slate-900">{data.pending_withdrawals.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                        <DollarSign size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Payroll Liability</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        KES {data.employees.reduce((acc: number, curr: any) => acc + (curr.current_balance || 0), 0).toLocaleString()}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Requests */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-amber-500" size={20} />
                            Pending Withdrawals
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {data.pending_withdrawals.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">No pending requests</div>
                        ) : (
                            data.pending_withdrawals.map((req: any) => (
                                <div key={req.id} className="p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                {req.profiles?.full_name?.charAt(0) || "E"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{req.profiles?.full_name}</p>
                                                <p className="text-xs text-slate-500">Requested: {new Date(req.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900 text-lg">KES {req.amount.toLocaleString()}</p>
                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pending Disbursement</span>
                                        </div>
                                    </div>

                                    {/* Bank Details Section */}
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Building size={12} />
                                            Target Bank Account
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500">Bank Name</p>
                                                <p className="text-sm font-bold text-slate-800">{req.employees?.bank_name || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Account Number</p>
                                                <p className="text-sm font-bold text-slate-800">{req.employees?.bank_account_number || "N/A"}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-slate-500">Account Holder</p>
                                                <p className="text-sm font-bold text-slate-800">{req.employees?.bank_account_name || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <input 
                                                id={`ref-${req.id}`}
                                                type="text" 
                                                placeholder="Enter Transaction Reference (Proof of Payment)"
                                                className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    const ref = (document.getElementById(`ref-${req.id}`) as HTMLInputElement).value;
                                                    if (!ref) { alert("Please enter a transaction reference first"); return; }
                                                    handleWithdrawal(req.id, 'approved', ref);
                                                }}
                                                disabled={!!actionLoading}
                                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-2"
                                            >
                                                {actionLoading === req.id.toString() ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                Approve & Disburse
                                            </button>
                                            <button 
                                                onClick={() => handleWithdrawal(req.id, 'rejected')}
                                                disabled={!!actionLoading}
                                                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Employee Balances */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Shield className="text-blue-500" size={20} />
                            Employee Balances
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {data.employees.map((emp: any) => (
                            <div key={emp.id} className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                        {emp.profiles?.full_name?.charAt(0) || "E"}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{emp.profiles?.full_name}</p>
                                        <p className="text-xs text-slate-500">{emp.profiles?.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-900">KES {(emp.current_balance || 0).toLocaleString()}</p>
                                    <p className="text-xs text-slate-400">Base: KES {(emp.base_salary || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Credit Modal */}
            {showCreditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900">Credit Employee Salary</h3>
                            <button onClick={() => setShowCreditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCredit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Employee</label>
                                <select 
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                >
                                    <option value="">Choose an employee...</option>
                                    {data.employees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>{emp.profiles?.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (KES)</label>
                                <input 
                                    type="number"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="0.00"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="May 2026 Salary"
                                    value={creditDescription}
                                    onChange={(e) => setCreditDescription(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={actionLoading === "crediting"}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {actionLoading === "crediting" ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Confirm Credit
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
