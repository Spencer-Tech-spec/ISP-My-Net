"use client";

import React, { useState, useEffect } from "react";
import { 
    Users, 
    Wifi, 
    Wallet, 
    TrendingUp, 
    Activity,
    ArrowRight,
    MapPin
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function EmployeeDashboard() {
    const [stats, setStats] = useState<any>({
        clients: 0,
        balance: 0,
        tickets: 0
    });
    const [recentClients, setRecentClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchStats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch assigned clients count
            const { count: clientCount } = await supabase
                .from('employee_clients')
                .select('*', { count: 'exact', head: true })
                .eq('employee_id', user.id);

            // Fetch balance
            const { data: employeeData } = await supabase
                .from('employees')
                .select('current_balance')
                .eq('id', user.id)
                .single();

            // Fetch recent clients
            const { data: clients } = await supabase
                .from('employee_clients')
                .select('*, profiles:client_id(full_name, address, status)')
                .eq('employee_id', user.id)
                .limit(3);

            setStats({
                clients: clientCount || 0,
                balance: employeeData?.current_balance || 0,
                tickets: 4 // Mocked for now
            });
            setRecentClients(clients || []);
            setLoading(false);
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Overview</h2>
                    <p className="text-slate-500 font-medium mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Status</p>
                        <p className="text-sm font-bold text-emerald-600">On Duty</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                        <Users size={28} />
                    </div>
                    <p className="text-slate-500 font-bold text-sm">Assigned Clients</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-4xl font-black text-slate-900">{stats.clients}</h3>
                        <span className="text-emerald-500 font-bold text-xs flex items-center gap-1 mb-1">
                            <TrendingUp size={14} /> +2 this week
                        </span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                        <Wallet size={28} />
                    </div>
                    <p className="text-slate-500 font-bold text-sm">Current Balance</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-4xl font-black text-slate-900">KES {stats.balance.toLocaleString()}</h3>
                        <ArrowRight size={20} className="text-slate-300 mb-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
                        <Activity size={28} />
                    </div>
                    <p className="text-slate-500 font-bold text-sm">Open Tickets</p>
                    <div className="flex items-end justify-between mt-2">
                        <h3 className="text-4xl font-black text-slate-900">{stats.tickets}</h3>
                        <span className="text-amber-500 font-bold text-xs mb-1 uppercase tracking-widest">Priority</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Clients */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">My Clients</h3>
                        <button className="text-indigo-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all">
                            View All <ArrowRight size={16} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentClients.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-medium">No clients assigned yet.</div>
                        ) : (
                            recentClients.map((item: any) => (
                                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-lg">
                                            {item.profiles?.full_name?.charAt(0) || "C"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{item.profiles?.full_name}</p>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                <MapPin size={12} />
                                                {item.profiles?.address || "No address set"}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        item.profiles?.status?.toLowerCase() === 'active' 
                                        ? 'bg-emerald-50 text-emerald-600' 
                                        : 'bg-rose-50 text-rose-600'
                                    }`}>
                                        {item.profiles?.status || 'Active'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Network Tools Quick Access */}
                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-2">Network Tools</h3>
                        <p className="text-indigo-100 font-medium mb-8">Access router settings and subscriber bandwidth controls.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl hover:bg-white/20 transition-all text-left">
                                <Wifi className="mb-2" size={24} />
                                <p className="font-bold text-sm">Router Status</p>
                            </button>
                            <button className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl hover:bg-white/20 transition-all text-left">
                                <Activity className="mb-2" size={24} />
                                <p className="font-bold text-sm">Bandwidth Test</p>
                            </button>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>
            </div>
        </div>
    );
}
