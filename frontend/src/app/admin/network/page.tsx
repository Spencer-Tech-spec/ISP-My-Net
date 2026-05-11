"use client";

import React from "react";
import {
    Wifi,
    Server,
    Cpu,
    Activity,
    ShieldAlert,
    Plus,
    RefreshCw,
    Signal
} from "lucide-react";

export default function NetworkPage() {
    const nodes = [
        { name: "Router-Core-HQ", ip: "10.0.0.1", type: "MikroTik CCR1036", cpu: "12%", uptime: "42d 12h", status: "Online" },
        { name: "OLT-ZTE-C320", ip: "10.0.0.2", type: "ZTE OLT", cpu: "24%", uptime: "15d 08h", status: "Online" },
        { name: "Branch-Router-North", ip: "192.168.10.1", type: "MikroTik RB4011", cpu: "45%", uptime: "02d 04h", status: "Online" },
        { name: "Backup-OLT", ip: "10.0.0.5", type: "Huawei MA5608T", cpu: "0%", uptime: "0h", status: "Offline" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Network Infrastructure</h2>
                    <p className="text-slate-500 text-sm">Monitor core routers, OLTs, and individual customer connections.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => alert("Refreshing network status...")}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={() => alert("Opening wizard to connect new node...")}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        Connect New Node
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Network Health Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {nodes.map((node, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${node.status === 'Online' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                            <Server size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 tracking-tight">{node.name}</h4>
                                            <p className="text-xs font-bold text-slate-400">{node.ip}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${node.status === 'Online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                        {node.status}
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Cpu size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">CPU Load</span>
                                        </div>
                                        <p className="font-black text-slate-900">{node.cpu}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Signal size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Uptime</span>
                                        </div>
                                        <p className="font-black text-slate-900">{node.uptime}</p>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{node.type}</p>
                                    <button
                                        onClick={() => alert(`Opening configuration for ${node.name}...`)}
                                        className="text-[11px] font-black text-blue-600 hover:underline uppercase tracking-widest"
                                    >
                                        Configure
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Real-time Alerts */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-8 h-fit lg:sticky lg:top-24">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <ShieldAlert className="text-amber-500" size={20} />
                            Active System Log
                        </h3>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="relative">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                                <div className="absolute top-4 bottom-0 left-[2.5px] w-[1px] bg-slate-100"></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">4 mins ago</p>
                                <p className="text-sm font-bold text-slate-800">Login Attempt Successful</p>
                                <p className="text-xs text-slate-500 mt-1">Admin accessed Core Router settings via Web Console.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="relative">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                                <div className="absolute top-4 bottom-0 left-[2.5px] w-[1px] bg-slate-100"></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">2 hours ago</p>
                                <p className="text-sm font-bold text-slate-800">STK Push Confirmation</p>
                                <p className="text-xs text-slate-500 mt-1">Transaction MP82194BR successfully provisioned to client "John Doe".</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="relative">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2"></div>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">6 hours ago</p>
                                <p className="text-sm font-bold text-slate-800">Node Offline Alert</p>
                                <p className="text-xs text-rose-500/80 font-medium mt-1">Backup-OLT is not responding to heartbeat packets on Port 2231.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => alert("Loading full system event viewer...")}
                        className="w-full py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest transition-all"
                    >
                        Open Full Event Viewer
                    </button>
                </div>
            </div>
        </div>
    );
}
