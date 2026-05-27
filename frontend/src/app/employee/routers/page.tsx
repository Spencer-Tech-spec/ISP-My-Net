"use client";

import React, { useState, useEffect } from "react";
import { 
    Wifi, 
    Zap, 
    Activity, 
    Shield, 
    RefreshCcw, 
    Settings,
    Loader2,
    CheckCircle2,
    XCircle,
    Info
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function RouterAccessPage() {
    const [routers, setRouters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchRouters = async () => {
            // In a real app, you'd check if the employee has access to these routers
            const { data } = await supabase.from('mikrotik_routers').select('id, name, host, port');
            setRouters(data || []);
            setLoading(false);
        };

        fetchRouters();
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Router Access</h2>
                <p className="text-slate-500 font-medium mt-1">Manage network infrastructure and monitor connectivity.</p>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-[2rem]">
                <div className="flex items-start gap-4">
                    <Info className="text-indigo-600 shrink-0" size={24} />
                    <div>
                        <p className="text-indigo-900 font-bold">Maintenance Notice</p>
                        <p className="text-indigo-700 text-sm mt-1">Scheduled maintenance for MikroTik-02 is set for tonight at 02:00 AM. Please ensure all critical updates are performed before then.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {routers.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <Wifi className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold">No routers found in your sector.</p>
                    </div>
                ) : (
                    routers.map((router: any) => (
                        <div key={router.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all group">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                            <Wifi size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900">{router.name}</h3>
                                            <p className="text-xs text-slate-500 font-bold font-mono mt-1">{router.host}:{router.port}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 mb-2">
                                            Online
                                        </span>
                                        <p className="text-[10px] text-slate-400 font-bold">Uptime: 14d 6h 22m</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                                        <Activity className="mx-auto text-indigo-600 mb-2" size={18} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPU</p>
                                        <p className="text-sm font-black text-slate-900">12%</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                                        <Zap className="mx-auto text-amber-500 mb-2" size={18} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Traffic</p>
                                        <p className="text-sm font-black text-slate-900">45 Mbps</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                                        <Shield className="mx-auto text-emerald-500 mb-2" size={18} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Users</p>
                                        <p className="text-sm font-black text-slate-900">128</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                                        <Settings size={16} />
                                        Configuration
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all">
                                        <RefreshCcw size={16} />
                                        Reboot
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
