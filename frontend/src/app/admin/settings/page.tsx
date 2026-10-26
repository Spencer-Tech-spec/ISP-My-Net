"use client";

import React, { useState, useEffect } from "react";
import {
    Building,
    Globe,
    Mail,
    Phone,
    Bell,
    Shield,
    Database,
    Save,
    Router,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        company_name: "My Net ISP",
        support_email: "support@mynet.com",
        support_phone: "+254 712 345 678",
        currency: "KES (Kenyan Shilling)",
        // M-Pesa Credentials
        mpesa_consumer_key: "",
        mpesa_consumer_secret: "",
        mpesa_shortcode: "997960",
        mpesa_passkey: "",
        mpesa_callback_url: "",
        mpesa_initiator_name: "",
        mpesa_initiator_password: "",
        bank_account_number: "0010529",
        // PayHero Integration
        payhero_channel_id: "13240",
        payhero_api_key: "",
        payhero_api_secret: "",
        preferred_gateway: "payhero",
        // MikroTik Credentials
        mikrotik_ip: "",
        mikrotik_username: "",
        mikrotik_password: "",
        // OLT Credentials
        olt_ip: "",
        olt_username: "",
        olt_password: ""
    });

    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                // 1. Fetch from settings table
                const { data: sData } = await supabase
                    .from('settings')
                    .select('*')
                    .single();

                // 2. Fetch from active isp_tenants
                const storedIspId = typeof window !== "undefined" ? localStorage.getItem("impersonate_isp_id") : null;
                let tQuery = supabase.from('isp_tenants').select('*');
                if (storedIspId) {
                    tQuery = tQuery.eq('id', storedIspId);
                } else {
                    tQuery = tQuery.order('created_at', { ascending: false }).limit(1);
                }
                const { data: tData } = await tQuery.maybeSingle();

                setSettings((prev) => ({
                    ...prev,
                    ...(sData || {}),
                    ...(tData ? {
                        mpesa_shortcode: tData.mpesa_shortcode || prev.mpesa_shortcode,
                        mpesa_consumer_key: tData.mpesa_consumer_key || prev.mpesa_consumer_key,
                        mpesa_consumer_secret: tData.mpesa_consumer_secret || prev.mpesa_consumer_secret,
                        mpesa_passkey: tData.mpesa_passkey || prev.mpesa_passkey,
                        payhero_channel_id: tData.payhero_channel_id || prev.payhero_channel_id,
                        payhero_api_key: tData.payhero_api_key || prev.payhero_api_key,
                        payhero_api_secret: tData.payhero_api_secret || prev.payhero_api_secret,
                        preferred_gateway: tData.preferred_gateway || prev.preferred_gateway,
                    } : {})
                }));
            } catch (e) {
                console.error("Error loading settings:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [supabase]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save to settings table
            await supabase
                .from('settings')
                .upsert({ id: 1, ...settings });

            // 2. Save to isp_tenants table so backend APIs pick it up
            const storedIspId = typeof window !== "undefined" ? localStorage.getItem("impersonate_isp_id") : null;
            const tenantPayload = {
                mpesa_shortcode: settings.mpesa_shortcode,
                mpesa_consumer_key: settings.mpesa_consumer_key,
                mpesa_consumer_secret: settings.mpesa_consumer_secret,
                mpesa_passkey: settings.mpesa_passkey,
                mpesa_callback_url: settings.mpesa_callback_url,
                payhero_channel_id: settings.payhero_channel_id,
                payhero_api_key: settings.payhero_api_key,
                payhero_api_secret: settings.payhero_api_secret,
                preferred_gateway: settings.preferred_gateway,
            };

            if (storedIspId) {
                await supabase.from('isp_tenants').update(tenantPayload).eq('id', storedIspId);
            } else {
                const { data: firstT } = await supabase.from('isp_tenants').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
                if (firstT?.id) {
                    await supabase.from('isp_tenants').update(tenantPayload).eq('id', firstT.id);
                }
            }

            alert("Settings & Gateway credentials saved successfully!");
        } catch (error: any) {
            console.error("Error saving settings:", error);
            alert("Saved with notice: " + (error.message || "Updated successfully."));
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: "general", label: "General", icon: <Building size={18} /> },
        { id: "payments", label: "Payments (M-Pesa)", icon: <Database size={18} /> },
        { id: "hardware", label: "Hardware (Router/OLT)", icon: <Router size={18} /> },
        { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
        { id: "security", label: "Security", icon: <Shield size={18} /> },
    ];

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans">
            <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Settings</h2>
                <p className="text-slate-500 font-medium">Configure your ISP company profile and API integrations.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <aside className="lg:w-64 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-slate-500 hover:bg-slate-100"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </aside>

                <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-8 space-y-8">
                        {activeTab === "general" && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-4">Company Profile</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Company Name</label>
                                        <input
                                            type="text"
                                            value={settings.company_name}
                                            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Support Email</label>
                                        <input
                                            type="email"
                                            value={settings.support_email}
                                            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Support Phone</label>
                                        <input
                                            type="text"
                                            value={settings.support_phone}
                                            onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Currency</label>
                                        <select
                                            value={settings.currency}
                                            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700 appearance-none"
                                        >
                                            <option>KES (Kenyan Shilling)</option>
                                            <option>USD (US Dollar)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "payments" && (
                            <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                                {/* Option 1: PayHero Kenya (Active Channel 13240) */}
                                <div className="p-6 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl border border-emerald-200/80 space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-slate-800">Pay Hero Kenya Integration</h3>
                                                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    Active Channel: 13240
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Direct connection to your Bank Paybill <strong>997960</strong> (Picnic Technologies). Funds credit directly into your bank.
                                            </p>
                                        </div>
                                        <a
                                            href="https://app.payhero.co.ke/keys"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
                                        >
                                            Get API Keys on PayHero &rarr;
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest">PayHero Channel ID</label>
                                            <input
                                                type="text"
                                                value={settings.payhero_channel_id || "13240"}
                                                onChange={(e) => setSettings({ ...settings, payhero_channel_id: e.target.value })}
                                                placeholder="e.g. 13240"
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-slate-800"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest">Preferred Payment Gateway</label>
                                            <select
                                                value={settings.preferred_gateway || "payhero"}
                                                onChange={(e) => setSettings({ ...settings, preferred_gateway: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-slate-800"
                                            >
                                                <option value="payhero">PayHero Kenya (Bank Paybill 997960)</option>
                                                <option value="mpesa">Safaricom Daraja API</option>
                                                <option value="both">Dual-Rail (Both Gateways)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest">PayHero API Key</label>
                                            <input
                                                type="text"
                                                value={settings.payhero_api_key || ""}
                                                onChange={(e) => setSettings({ ...settings, payhero_api_key: e.target.value })}
                                                placeholder="Paste your API Key from PayHero"
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest">PayHero API Secret / Basic Auth</label>
                                            <input
                                                type="password"
                                                value={settings.payhero_api_secret || ""}
                                                onChange={(e) => setSettings({ ...settings, payhero_api_secret: e.target.value })}
                                                placeholder="••••••••••••"
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Safaricom Daraja Direct API */}
                                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Safaricom Daraja Direct API</h3>
                                        <p className="text-xs text-slate-500">For direct developer portal credentials from developer.safaricom.co.ke</p>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Daraja API
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Consumer Key</label>
                                        <input
                                            type="text"
                                            value={settings.mpesa_consumer_key || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_consumer_key: e.target.value })}
                                            placeholder="Enter Consumer Key"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Consumer Secret</label>
                                        <input
                                            type="password"
                                            value={settings.mpesa_consumer_secret || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_consumer_secret: e.target.value })}
                                            placeholder="••••••••••••"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">ShortCode</label>
                                        <input
                                            type="text"
                                            value={settings.mpesa_shortcode || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_shortcode: e.target.value })}
                                            placeholder="e.g. 174379"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Passkey</label>
                                        <input
                                            type="text"
                                            value={settings.mpesa_passkey || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_passkey: e.target.value })}
                                            placeholder="Enter M-Pesa Passkey"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Callback URL</label>
                                        <input
                                            type="text"
                                            value={settings.mpesa_callback_url || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_callback_url: e.target.value })}
                                            placeholder="https://your-domain.com/api/mpesa/callback"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Initiator Name</label>
                                        <input
                                            type="text"
                                            value={settings.mpesa_initiator_name || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_initiator_name: e.target.value })}
                                            placeholder="e.g. testapi"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Initiator Password</label>
                                        <input
                                            type="password"
                                            value={settings.mpesa_initiator_password || ""}
                                            onChange={(e) => setSettings({ ...settings, mpesa_initiator_password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-sm font-medium text-blue-700">
                                    Note: Credentials stored here will override your <code>.env</code> settings if provided.
                                </div>
                            </div>
                        )}
                        {activeTab === "hardware" && (
                            <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                                {/* MikroTik Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Router size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">MikroTik RouterOS</h3>
                                            <p className="text-xs text-slate-500 font-medium">Core router for bandwidth control and PPPoE/Hotspot.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Router IP / Host</label>
                                            <input
                                                type="text"
                                                value={settings.mikrotik_ip || ""}
                                                onChange={(e) => setSettings({ ...settings, mikrotik_ip: e.target.value })}
                                                placeholder="192.168.88.1"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Username</label>
                                            <input
                                                type="text"
                                                value={settings.mikrotik_username || ""}
                                                onChange={(e) => setSettings({ ...settings, mikrotik_username: e.target.value })}
                                                placeholder="admin"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                                            <input
                                                type="password"
                                                value={settings.mikrotik_password || ""}
                                                onChange={(e) => setSettings({ ...settings, mikrotik_password: e.target.value })}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* OLT Section */}
                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">Fiber OLT (ZTE/Huawei)</h3>
                                            <p className="text-xs text-slate-500 font-medium">Fiber Optical Line Terminal for GPON/EPON management.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">OLT IP Address</label>
                                            <input
                                                type="text"
                                                value={settings.olt_ip || ""}
                                                onChange={(e) => setSettings({ ...settings, olt_ip: e.target.value })}
                                                placeholder="10.0.0.1"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Username</label>
                                            <input
                                                type="text"
                                                value={settings.olt_username || ""}
                                                onChange={(e) => setSettings({ ...settings, olt_username: e.target.value })}
                                                placeholder="root"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                                            <input
                                                type="password"
                                                value={settings.olt_password || ""}
                                                onChange={(e) => setSettings({ ...settings, olt_password: e.target.value })}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-medium text-amber-700">
                                    Tip: Use a static IP address for your hardware to ensure the connection remains stable.
                                </div>
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-4">Notification Settings</h3>
                                <div className="space-y-4">
                                    {[
                                        { title: "Email Alerts", desc: "Receive system alerts via email." },
                                        { title: "SMS Notifications", desc: "Send payment reminders to customers." },
                                        { title: "Financial Reports", desc: "Weekly revenue summaries." }
                                    ].map((item, id) => (
                                        <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800">{item.title}</p>
                                                <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                                            </div>
                                            <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                <h3 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-4">Security & Access</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Admin Password</label>
                                        <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none font-semibold text-slate-700" />
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                                        <Shield className="text-amber-600 mt-1" size={20} />
                                        <div>
                                            <p className="font-bold text-amber-800 text-sm">Access Restricted</p>
                                            <p className="text-xs text-amber-700 font-medium mt-1">Only authorized emails (muneneoscar599@gmail.com) can access this hub.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-8 border-t border-slate-50 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                                {saving ? "Saving Changes..." : "Save All Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

