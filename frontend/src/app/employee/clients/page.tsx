"use client";

import React, { useState, useEffect } from "react";
import { 
    Users, 
    Search, 
    Filter, 
    MapPin, 
    Phone, 
    Wifi, 
    Loader2,
    CheckCircle2,
    XCircle,
    ArrowRight
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AssignedClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const supabase = createClient();

    useEffect(() => {
        const fetchClients = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const response = await fetch(`http://localhost:8000/employees/${user.id}/clients`);
            const data = await response.json();
            setClients(data);
            setLoading(false);
        };

        fetchClients();
    }, []);

    const filteredClients = clients.filter(item => {
        const profile = item.profiles;
        if (!profile) return false;
        return (
            profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Assigned Clients</h2>
                    <p className="text-slate-500 font-medium mt-1">Manage and monitor the subscribers assigned to you.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by client name or address..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <Filter size={18} />
                    Filter
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredClients.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold">No assigned clients found.</p>
                    </div>
                ) : (
                    filteredClients.map((item: any) => (
                        <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all group">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                                        {item.profiles?.full_name?.charAt(0) || "C"}
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        item.profiles?.status?.toLowerCase() === 'active' 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                    }`}>
                                        {item.profiles?.status || 'Active'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 mb-4">{item.profiles?.full_name}</h3>
                                
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                        <MapPin size={16} className="text-indigo-600" />
                                        {item.profiles?.address || "No address provided"}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                        <Phone size={16} className="text-indigo-600" />
                                        {item.profiles?.phone || "No phone provided"}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                        <Wifi size={16} className="text-indigo-600" />
                                        Plan: <span className="font-bold text-slate-900">{item.profiles?.plan || 'Standard'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-6 border-t border-slate-50">
                                    <button className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all">
                                        Client History
                                    </button>
                                    <button className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
