"use client";

import React, { useState, useEffect } from "react";
import {
    Wifi,
    Server,
    Cpu,
    Plus,
    RefreshCw,
    Signal,
    X,
    Check,
    Loader2,
    Trash2,
    MapPin,
    Link2,
    Copy,
    QrCode,
    Terminal,
    Sparkles,
    Ticket,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    Zap,
    Send,
    ExternalLink,
    HelpCircle,
    PhoneCall,
    Pencil,
    ToggleLeft,
    ToggleRight,
    Power
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function NetworkPage() {
    const [activeTab, setActiveTab] = useState<"routers" | "packages" | "vouchers">("routers");
    const [nodes, setNodes] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchPhone, setSearchPhone] = useState("");
    const [selectedRouterFilter, setSelectedRouterFilter] = useState<string>("all");

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRescueModal, setShowRescueModal] = useState(false);
    const [showAddPackageModal, setShowAddPackageModal] = useState(false);
    const [showEditPackageModal, setShowEditPackageModal] = useState(false);
    const [showScriptModal, setShowScriptModal] = useState<any | null>(null);
    const [showQrModal, setShowQrModal] = useState<any | null>(null);

    // Form States
    const [isSaving, setIsSaving] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    // New Router Form State
    const [newNode, setNewNode] = useState({
        name: "",
        host: "",
        port: 8728,
        username: "admin",
        password: "",
        router_type: "MikroTik",
        hotspot_name: "MyNet Hotspot WiFi",
        dns_name: "hotspot.mynet.local",
        location: "",
    });

    // Rescue Voucher Form State
    const [rescueForm, setRescueForm] = useState({
        phone_number: "",
        router_id: "",
        package_id: "",
        mpesa_receipt: "",
        notes: "",
    });
    const [rescueResult, setRescueResult] = useState<any | null>(null);
    const [isRescuing, setIsRescuing] = useState(false);

    // New Package Form State
    const [newPackage, setNewPackage] = useState({
        name: "",
        price: 50,
        duration_label: "24 Hours",
        duration_minutes: 1440,
        speed_limit: "5M/5M",
        device_limit: 1,
        router_id: "",
    });

    // Edit Package Form State
    const [editPackage, setEditPackage] = useState<{
        id: any;
        name: string;
        price: number;
        duration_label: string;
        duration_minutes: number;
        speed_limit: string;
        device_limit: number;
        router_id: string;
        is_active: boolean;
    }>({
        id: null,
        name: "",
        price: 50,
        duration_label: "24 Hours",
        duration_minutes: 1440,
        speed_limit: "5M/5M",
        device_limit: 1,
        router_id: "",
        is_active: true,
    });

    const supabase = createClient();
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Routers
            const { data: routerData } = await supabase
                .from("mikrotik_routers")
                .select("*")
                .order("created_at", { ascending: false });
            setNodes(routerData || []);

            // 2. Fetch Packages
            const { data: pkgData } = await supabase
                .from("hotspot_packages")
                .select("*")
                .order("price", { ascending: true });
            
            if (pkgData && pkgData.length > 0) {
                setPackages(pkgData);
            } else {
                // Fallback default packages
                setPackages([
                    { id: 1, name: "1 Hour Pass", price: 20, duration_label: "1 Hour", duration_minutes: 60, speed_limit: "5M/5M", device_limit: 1, is_active: true },
                    { id: 2, name: "3 Hours Blast", price: 40, duration_label: "3 Hours", duration_minutes: 180, speed_limit: "5M/5M", device_limit: 1, is_active: true },
                    { id: 3, name: "12 Hours Unlimited", price: 70, duration_label: "12 Hours", duration_minutes: 720, speed_limit: "6M/6M", device_limit: 1, is_active: true },
                    { id: 4, name: "24 Hours Daily", price: 100, duration_label: "24 Hours", duration_minutes: 1440, speed_limit: "8M/8M", device_limit: 1, is_active: true },
                    { id: 5, name: "7 Days Weekly", price: 400, duration_label: "7 Days", duration_minutes: 10080, speed_limit: "10M/10M", device_limit: 2, is_active: true },
                    { id: 6, name: "30 Days Monthly", price: 1200, duration_label: "30 Days", duration_minutes: 43200, speed_limit: "15M/15M", device_limit: 3, is_active: true }
                ]);
            }

            // 3. Fetch Vouchers
            const { data: voucherData } = await supabase
                .from("hotspot_vouchers")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);
            setVouchers(voucherData || []);
        } catch (err) {
            console.error("Error loading network data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const getPortalUrl = (routerId?: number) => {
        if (typeof window === "undefined") return "";
        const origin = window.location.origin;
        return routerId ? `${origin}/hotspot?router=${routerId}` : `${origin}/hotspot`;
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(key);
        setTimeout(() => setCopiedLink(null), 3000);
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setTestResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/mikrotik/test-connection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    host: newNode.host,
                    port: newNode.port,
                    username: newNode.username,
                    password: newNode.password,
                }),
            });
            const data = await res.json();
            if (res.ok && data.status === "success") {
                setTestResult({ success: true, message: data.message });
            } else {
                setTestResult({ success: false, message: data.message || "Connection failed. Please check IP & Port." });
            }
        } catch (err: any) {
            setTestResult({ success: false, message: "Could not reach backend API: " + err.message });
        } finally {
            setTestingConnection(false);
        }
    };

    const handleAddNode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { data, error } = await supabase.from("mikrotik_routers").insert({
                name: newNode.name,
                host: newNode.host,
                port: newNode.port,
                username: newNode.username,
                password: newNode.password,
                router_type: newNode.router_type,
                hotspot_name: newNode.hotspot_name,
                dns_name: newNode.dns_name,
                location: newNode.location,
            }).select();

            if (error) throw error;

            setShowAddModal(false);
            setNewNode({
                name: "",
                host: "",
                port: 8728,
                username: "admin",
                password: "",
                router_type: "MikroTik",
                hotspot_name: "MyNet Hotspot WiFi",
                dns_name: "hotspot.mynet.local",
                location: ""
            });
            setTestResult(null);
            fetchAllData();
        } catch (err: any) {
            alert("Failed to add router: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNode = async (id: number, name: string) => {
        if (!window.confirm(`Are you sure you want to remove "${name}" from the network?`)) return;
        try {
            const { error } = await supabase.from("mikrotik_routers").delete().eq("id", id);
            if (error) throw error;
            setNodes(nodes.filter((n) => n.id !== id));
        } catch (err: any) {
            alert("Failed to delete: " + err.message);
        }
    };

    const handleAddPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload: any = {
                name: newPackage.name,
                price: Number(newPackage.price),
                duration_label: newPackage.duration_label,
                duration_minutes: Number(newPackage.duration_minutes),
                speed_limit: newPackage.speed_limit,
                device_limit: Number(newPackage.device_limit),
                is_active: true,
            };
            if (newPackage.router_id) {
                payload.router_id = Number(newPackage.router_id);
            }

            const { error } = await supabase.from("hotspot_packages").insert(payload);
            if (error) throw error;

            setShowAddPackageModal(false);
            setNewPackage({
                name: "",
                price: 50,
                duration_label: "24 Hours",
                duration_minutes: 1440,
                speed_limit: "5M/5M",
                device_limit: 1,
                router_id: "",
            });
            fetchAllData();
        } catch (err: any) {
            console.error("Failed to create package:", err);
            const msg = err.message || err.details || err.hint || (typeof err === "object" ? JSON.stringify(err) : String(err));
            alert("Failed to create package: " + msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload: any = {
                name: editPackage.name,
                price: Number(editPackage.price),
                duration_label: editPackage.duration_label,
                duration_minutes: Number(editPackage.duration_minutes),
                speed_limit: editPackage.speed_limit,
                device_limit: Number(editPackage.device_limit),
                is_active: editPackage.is_active,
            };
            if (editPackage.router_id) {
                payload.router_id = Number(editPackage.router_id);
            } else {
                payload.router_id = null;
            }

            const { error } = await supabase.from("hotspot_packages").update(payload).eq("id", editPackage.id);
            if (error) throw error;

            setShowEditPackageModal(false);
            fetchAllData();
        } catch (err: any) {
            console.error("Failed to update package:", err);
            const msg = err.message || err.details || err.hint || (typeof err === "object" ? JSON.stringify(err) : String(err));
            alert("Failed to update package: " + msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePackage = async (id: number, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the package "${name}"? This cannot be undone.`)) return;
        try {
            const { error } = await supabase.from("hotspot_packages").delete().eq("id", id);
            if (error) throw error;
            setPackages(packages.filter((p) => p.id !== id));
        } catch (err: any) {
            console.error("Failed to delete package:", err);
            const msg = err.message || err.details || err.hint || (typeof err === "object" ? JSON.stringify(err) : String(err));
            alert("Failed to delete package: " + msg);
        }
    };

    const handleTogglePackageActive = async (pkg: any) => {
        try {
            const newStatus = !pkg.is_active;
            const { error } = await supabase
                .from("hotspot_packages")
                .update({ is_active: newStatus })
                .eq("id", pkg.id);
            if (error) throw error;
            setPackages(packages.map((p) => p.id === pkg.id ? { ...p, is_active: newStatus } : p));
        } catch (err: any) {
            console.error("Failed to toggle package:", err);
            const msg = err.message || err.details || err.hint || (typeof err === "object" ? JSON.stringify(err) : String(err));
            alert("Failed to toggle package: " + msg);
        }
    };

    const openEditPackageModal = (pkg: any) => {
        setEditPackage({
            id: pkg.id,
            name: pkg.name || "",
            price: pkg.price ?? 0,
            duration_label: pkg.duration_label || "",
            duration_minutes: pkg.duration_minutes ?? 0,
            speed_limit: pkg.speed_limit || "5M/5M",
            device_limit: pkg.device_limit ?? 1,
            router_id: pkg.router_id ? String(pkg.router_id) : "",
            is_active: pkg.is_active !== false,
        });
        setShowEditPackageModal(true);
    };

    const handleRescueVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsRescuing(true);
        setRescueResult(null);

        try {
            const selectedPkg = packages.find(p => p.id === Number(rescueForm.package_id));
            const selectedRouter = nodes.find(r => r.id === Number(rescueForm.router_id));

            const response = await fetch(`${API_BASE}/api/mikrotik/vouchers/rescue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_number: rescueForm.phone_number,
                    router_id: rescueForm.router_id ? Number(rescueForm.router_id) : null,
                    package_id: rescueForm.package_id ? Number(rescueForm.package_id) : null,
                    package_name: selectedPkg?.name || "Manual Hotspot Pass",
                    duration_minutes: selectedPkg?.duration_minutes || 1440,
                    price: selectedPkg?.price || 0,
                    speed_limit: selectedPkg?.speed_limit || "5M/5M",
                    mpesa_receipt: rescueForm.mpesa_receipt || "ADMIN-ALLOCATION",
                    notes: rescueForm.notes || "Admin allocated delayed/lost voucher package",
                    allocated_by: "admin"
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "Failed to allocate voucher");
            }

            setRescueResult(data);
            fetchAllData();
        } catch (err: any) {
            alert("Rescue allocation error: " + err.message);
        } finally {
            setIsRescuing(false);
        }
    };

    const filteredVouchers = vouchers.filter(v => {
        const matchesPhone = searchPhone ? v.phone_number?.includes(searchPhone) || v.code?.toLowerCase().includes(searchPhone.toLowerCase()) : true;
        const matchesRouter = selectedRouterFilter === "all" ? true : String(v.router_id) === selectedRouterFilter;
        return matchesPhone && matchesRouter;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Wifi className="text-blue-600 w-8 h-8" />
                        MikroTik & Hotspot Hub
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Link MikroTik routers to billing, generate captive portal links, manage packages, and rescue lost payments.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchAllData()}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        title="Refresh All Data"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => {
                            setRescueResult(null);
                            setShowRescueModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <Sparkles size={18} />
                        Rescue Lost Package
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        Link New MikroTik
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab("routers")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === "routers"
                            ? "bg-white text-blue-600 shadow-md shadow-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    <Server size={18} />
                    Connected Routers ({nodes.length})
                </button>
                <button
                    onClick={() => setActiveTab("packages")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === "packages"
                            ? "bg-white text-blue-600 shadow-md shadow-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    <Zap size={18} />
                    Hotspot Packages ({packages.length})
                </button>
                <button
                    onClick={() => setActiveTab("vouchers")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === "vouchers"
                            ? "bg-white text-blue-600 shadow-md shadow-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    <Ticket size={18} />
                    Vouchers & Rescue Station ({vouchers.length})
                </button>
            </div>

            {/* TAB 1: CONNECTED MIKROTIK ROUTERS */}
            {activeTab === "routers" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-64"></div>
                                ))}
                            </div>
                        ) : nodes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {nodes.map((node) => {
                                    const portalLink = getPortalUrl(node.id);
                                    return (
                                        <div
                                            key={node.id}
                                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 hover:border-blue-200 transition-all flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
                                                            <Server size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-extrabold text-slate-800 text-lg tracking-tight">
                                                                {node.name}
                                                            </h4>
                                                            <p className="text-xs font-bold text-slate-400">
                                                                {node.host}:{node.port}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        Linked
                                                    </span>
                                                </div>

                                                <div className="mt-6 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/60 space-y-1">
                                                    <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                                                        <span>Hotspot SSID</span>
                                                        <span className="text-slate-800">{node.hotspot_name || "MyNet Hotspot"}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                                                        <span>DNS Name</span>
                                                        <span className="text-slate-800 font-mono text-[11px]">{node.dns_name || "hotspot.mynet.local"}</span>
                                                    </div>
                                                </div>

                                                {/* Generated Portal Link Box */}
                                                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                                            <Link2 size={12} className="text-blue-600" />
                                                            Hotspot Purchase Link
                                                        </span>
                                                        <a
                                                            href={portalLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                                        >
                                                            Open <ExternalLink size={11} />
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                                        <span className="text-xs font-mono text-slate-600 truncate">{portalLink}</span>
                                                        <button
                                                            onClick={() => handleCopy(portalLink, `router-${node.id}`)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                            title="Copy Hotspot Link"
                                                        >
                                                            {copiedLink === `router-${node.id}` ? (
                                                                <Check size={16} className="text-emerald-600" />
                                                            ) : (
                                                                <Copy size={16} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setShowQrModal({ ...node, portalUrl: portalLink })}
                                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="View QR Code"
                                                    >
                                                        <QrCode size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowScriptModal(node)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                                        title="Generate RouterOS Script"
                                                    >
                                                        <Terminal size={14} /> Script
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDeleteNode(node.id, node.name)}
                                                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                                                        title="Delete Router"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                                <Server size={48} className="text-slate-200 mx-auto mb-4" />
                                <h3 className="font-black text-slate-700 text-lg">No MikroTik Routers Linked Yet</h3>
                                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                                    Click &quot;Link New MikroTik&quot; to connect your RouterOS device and generate your custom captive portal buy link.
                                </p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                                >
                                    <Plus size={18} /> Link MikroTik Now
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Side Guide Card */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 shadow-xl shadow-blue-600/10 space-y-5">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <Zap className="w-6 h-6 text-yellow-300" />
                            </div>
                            <h3 className="font-extrabold text-xl">How Hotspot Linking Works</h3>
                            <ul className="space-y-3 text-sm text-blue-100 leading-relaxed font-medium">
                                <li className="flex items-start gap-2">
                                    <span className="bg-white/20 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                                    <span>Enter MikroTik Router IP & API credentials to link it.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-white/20 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                                    <span>The system gives you a generated <strong>Hotspot Portal URL</strong>.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-white/20 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                                    <span>Apply the copy-paste RouterOS script into your MikroTik terminal.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-white/20 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                                    <span>Users connecting to WiFi see packages, pay via M-Pesa, and get activated immediately!</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: HOTSPOT PACKAGES */}
            {activeTab === "packages" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Available Hotspot Packages</h3>
                            <p className="text-slate-500 text-sm">Packages shown to customers on the captive portal buy page.</p>
                        </div>
                        <button
                            onClick={() => setShowAddPackageModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                        >
                            <Plus size={18} /> Add New Package
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {packages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`bg-white p-6 rounded-3xl border shadow-xl shadow-slate-100/50 hover:shadow-2xl transition-all relative overflow-hidden group ${
                                    pkg.is_active === false ? "border-slate-200 opacity-70" : "border-slate-100"
                                }`}
                            >
                                {/* Edit / Delete / Toggle Actions Bar */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => openEditPackageModal(pkg)}
                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                                        title="Edit Package"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleTogglePackageActive(pkg)}
                                        className={`p-1.5 rounded-lg transition-all ${
                                            pkg.is_active !== false
                                                ? "bg-amber-50 hover:bg-amber-100 text-amber-600"
                                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                        }`}
                                        title={pkg.is_active !== false ? "Deactivate Package" : "Activate Package"}
                                    >
                                        <Power size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all"
                                        title="Delete Package"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-wider">
                                            {pkg.duration_label}
                                        </span>
                                        <h4 className="text-xl font-black text-slate-900 mt-2">{pkg.name}</h4>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-slate-900">KES {pkg.price}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 py-4 border-y border-slate-100 text-xs font-bold text-slate-600">
                                    <div className="flex items-center justify-between">
                                        <span>Speed Limit</span>
                                        <span className="text-slate-900 font-extrabold">{pkg.speed_limit || "5M/5M"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Duration</span>
                                        <span className="text-slate-900 font-extrabold">{pkg.duration_minutes} Mins</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Device Limit</span>
                                        <span className="text-slate-900 font-extrabold">{pkg.device_limit || 1} Device</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Assigned Router</span>
                                        <span className="text-slate-900 font-extrabold">
                                            {pkg.router_id ? nodes.find(n => n.id === pkg.router_id)?.name || `Router #${pkg.router_id}` : "Global (All Routers)"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs">
                                    {pkg.is_active !== false ? (
                                        <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                                            <CheckCircle2 size={14} /> Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 font-bold text-slate-400">
                                            <Power size={14} /> Inactive
                                        </span>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => openEditPackageModal(pkg)}
                                            className="font-bold text-slate-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <Pencil size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                setRescueForm({
                                                    phone_number: "",
                                                    router_id: pkg.router_id ? String(pkg.router_id) : (nodes[0]?.id ? String(nodes[0].id) : ""),
                                                    package_id: String(pkg.id),
                                                    mpesa_receipt: "",
                                                    notes: `Direct allocation of ${pkg.name}`
                                                });
                                                setShowRescueModal(true);
                                            }}
                                            className="font-bold text-blue-600 hover:underline"
                                        >
                                            Rescue/Issue This Package →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: VOUCHERS & RESCUE STATION */}
            {activeTab === "vouchers" && (
                <div className="space-y-6">
                    {/* Filters & Search Bar */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
                            <div className="relative w-full">
                                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Phone (e.g. 254712...) or Voucher Code..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <select
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none"
                                value={selectedRouterFilter}
                                onChange={(e) => setSelectedRouterFilter(e.target.value)}
                            >
                                <option value="all">All MikroTik Routers</option>
                                {nodes.map((n) => (
                                    <option key={n.id} value={String(n.id)}>{n.name}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => {
                                    setRescueResult(null);
                                    setShowRescueModal(true);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/20 whitespace-nowrap"
                            >
                                <Sparkles size={18} />
                                Allocate Lost Package
                            </button>
                        </div>
                    </div>

                    {/* Vouchers Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="py-4 px-6">Voucher Code</th>
                                        <th className="py-4 px-6">Customer Phone</th>
                                        <th className="py-4 px-6">Package & Speed</th>
                                        <th className="py-4 px-6">Router Node</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">M-Pesa / Source</th>
                                        <th className="py-4 px-6">Issued At</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {filteredVouchers.length > 0 ? (
                                        filteredVouchers.map((v) => (
                                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-4 px-6 font-mono font-bold text-blue-600">
                                                    <div className="flex items-center gap-2">
                                                        <span>{v.code}</span>
                                                        <button
                                                            onClick={() => handleCopy(v.code, `vcode-${v.id}`)}
                                                            className="text-slate-400 hover:text-blue-600"
                                                            title="Copy Code"
                                                        >
                                                            {copiedLink === `vcode-${v.id}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-900">{v.phone_number}</td>
                                                <td className="py-4 px-6">
                                                    <span className="font-bold text-slate-800">{v.package_name}</span>
                                                    <span className="block text-xs text-slate-400">{v.speed_limit} • KES {v.price}</span>
                                                </td>
                                                <td className="py-4 px-6 font-semibold text-slate-600">
                                                    {v.router_name || (v.router_id ? `Router #${v.router_id}` : "Global")}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                            v.status === "rescued"
                                                                ? "bg-amber-100 text-amber-800"
                                                                : v.status === "active"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {v.status || "active"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 font-mono text-xs text-slate-500">
                                                    {v.mpesa_receipt || "ADMIN-ALLOCATION"}
                                                </td>
                                                <td className="py-4 px-6 text-xs text-slate-400">
                                                    {v.created_at ? new Date(v.created_at).toLocaleString() : "Just now"}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <button
                                                        onClick={() => {
                                                            const smsText = `Your MyNet Hotspot Voucher: Code is ${v.code} for ${v.package_name}. Connect to WiFi and log in!`;
                                                            handleCopy(smsText, `sms-${v.id}`);
                                                            alert("Voucher SMS copied to clipboard!\n\n" + smsText);
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                                                    >
                                                        Copy SMS
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                                                No vouchers found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: ADD MIKROTIK ROUTER */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                                <Server className="text-blue-600" size={20} />
                                Link MikroTik to Billing System
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddNode} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Router Name / Alias</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Town-Center-MikroTik-01"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newNode.name}
                                    onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">IP Address / Host</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 192.168.88.1 or your DDNS/Public IP"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newNode.host}
                                        onChange={(e) => setNewNode({ ...newNode, host: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">API Port</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newNode.port}
                                        onChange={(e) => setNewNode({ ...newNode, port: parseInt(e.target.value) || 8728 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">RouterOS Username</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="admin"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newNode.username}
                                        onChange={(e) => setNewNode({ ...newNode, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">RouterOS Password</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newNode.password}
                                        onChange={(e) => setNewNode({ ...newNode, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hotspot Name (SSID)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. MyNet Hotspot WiFi"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newNode.hotspot_name}
                                        onChange={(e) => setNewNode({ ...newNode, hotspot_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">DNS Captive Domain</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. hotspot.mynet.local"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newNode.dns_name}
                                        onChange={(e) => setNewNode({ ...newNode, dns_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Physical Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Main Plaza, 2nd Floor"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newNode.location}
                                    onChange={(e) => setNewNode({ ...newNode, location: e.target.value })}
                                />
                            </div>

                            {/* Test Connection Button & Result */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Verify Network Link</span>
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testingConnection || !newNode.host}
                                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <Signal size={14} />}
                                        Test API Connection
                                    </button>
                                </div>
                                {testResult && (
                                    <div
                                        className={`p-3 rounded-xl text-xs font-medium ${
                                            testResult.success
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-rose-50 text-rose-700 border border-rose-200"
                                        }`}
                                    >
                                        {testResult.message}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Link MikroTik
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: RESCUE / ALLOCATE LOST PACKAGE */}
            {showRescueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={22} className="text-yellow-200" />
                                <div>
                                    <h3 className="font-black text-lg leading-tight">Rescue / Allocate Delayed Package</h3>
                                    <p className="text-xs text-amber-100 font-medium">Issue active hotspot voucher for customers with pending/delayed payments</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRescueModal(false)} className="p-1.5 hover:bg-amber-600 rounded-xl text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {!rescueResult ? (
                            <form onSubmit={handleRescueVoucher} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Customer M-Pesa Phone Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 0712345678 or 254712345678"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                        value={rescueForm.phone_number}
                                        onChange={(e) => setRescueForm({ ...rescueForm, phone_number: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Select Package *
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                            value={rescueForm.package_id}
                                            onChange={(e) => setRescueForm({ ...rescueForm, package_id: e.target.value })}
                                        >
                                            <option value="">-- Choose Package --</option>
                                            {packages.map((pkg) => (
                                                <option key={pkg.id} value={String(pkg.id)}>
                                                    {pkg.name} (KES {pkg.price} - {pkg.duration_label})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Target MikroTik Router
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                            value={rescueForm.router_id}
                                            onChange={(e) => setRescueForm({ ...rescueForm, router_id: e.target.value })}
                                        >
                                            <option value="">Global / Any Router</option>
                                            {nodes.map((node) => (
                                                <option key={node.id} value={String(node.id)}>
                                                    {node.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        M-Pesa Receipt / Code (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. QKH827X91J or Delayed Payment"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                        value={rescueForm.mpesa_receipt}
                                        onChange={(e) => setRescueForm({ ...rescueForm, mpesa_receipt: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Notes / Reason
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Paid KES 100 via M-Pesa, SMS delayed"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                        value={rescueForm.notes}
                                        onChange={(e) => setRescueForm({ ...rescueForm, notes: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRescueModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isRescuing}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                    >
                                        {isRescuing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                        Generate & Rescue Voucher
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 space-y-6 animate-in zoom-in-95">
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-900">Voucher Allocated!</h4>
                                    <p className="text-slate-500 text-sm font-medium">
                                        Active package issued for <strong>{rescueResult.voucher?.phone_number}</strong>
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">Voucher Code:</span>
                                        <span className="text-xl font-mono font-black text-blue-600 tracking-wider">
                                            {rescueResult.code}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-slate-500">Package:</span>
                                        <span className="text-slate-900">{rescueResult.voucher?.package_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-slate-500">Speed Limit:</span>
                                        <span className="text-slate-900">{rescueResult.voucher?.speed_limit}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Ready-to-Send SMS Message:
                                    </label>
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 font-mono whitespace-pre-line">
                                        {rescueResult.sms_template}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(rescueResult.sms_template, "sms-template")}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                                    >
                                        {copiedLink === "sms-template" ? <Check size={16} /> : <Copy size={16} />}
                                        Copy SMS to Send via WhatsApp / Phone
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setRescueResult(null);
                                        setShowRescueModal(false);
                                    }}
                                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 3: ADD PACKAGE */}
            {showAddPackageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 text-lg">Create Hotspot Package</h3>
                            <button onClick={() => setShowAddPackageModal(false)} className="p-2 hover:bg-white rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddPackage} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Package Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 6 Hours Student Pass"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                    value={newPackage.name}
                                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (KES)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                        value={newPackage.price}
                                        onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration Label</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 6 Hours"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                        value={newPackage.duration_label}
                                        onChange={(e) => setNewPackage({ ...newPackage, duration_label: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="360"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                        value={newPackage.duration_minutes}
                                        onChange={(e) => setNewPackage({ ...newPackage, duration_minutes: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Speed Limit</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 5M/5M"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                        value={newPackage.speed_limit}
                                        onChange={(e) => setNewPackage({ ...newPackage, speed_limit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Device Limit</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                        value={newPackage.device_limit}
                                        onChange={(e) => setNewPackage({ ...newPackage, device_limit: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Router</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none"
                                        value={newPackage.router_id}
                                        onChange={(e) => setNewPackage({ ...newPackage, router_id: e.target.value })}
                                    >
                                        <option value="">Global (All Connected MikroTiks)</option>
                                        {nodes.map((node) => (
                                            <option key={node.id} value={String(node.id)}>{node.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddPackageModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                                >
                                    Save Package
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT PACKAGE */}
            {showEditPackageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Pencil size={20} />
                                <div>
                                    <h3 className="font-black text-lg leading-tight">Edit Package</h3>
                                    <p className="text-xs text-blue-200 font-medium">Update pricing, speed, duration &amp; limits</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditPackageModal(false)} className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditPackage} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Package Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 6 Hours Student Pass"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={editPackage.name}
                                    onChange={(e) => setEditPackage({ ...editPackage, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (KES)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editPackage.price}
                                        onChange={(e) => setEditPackage({ ...editPackage, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration Label</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 6 Hours"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editPackage.duration_label}
                                        onChange={(e) => setEditPackage({ ...editPackage, duration_label: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="360"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editPackage.duration_minutes}
                                        onChange={(e) => setEditPackage({ ...editPackage, duration_minutes: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Speed Limit</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 5M/5M"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editPackage.speed_limit}
                                        onChange={(e) => setEditPackage({ ...editPackage, speed_limit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Device Limit</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editPackage.device_limit}
                                        onChange={(e) => setEditPackage({ ...editPackage, device_limit: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Router</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editPackage.router_id}
                                        onChange={(e) => setEditPackage({ ...editPackage, router_id: e.target.value })}
                                    >
                                        <option value="">Global (All Routers)</option>
                                        {nodes.map((node) => (
                                            <option key={node.id} value={String(node.id)}>{node.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Active/Inactive Toggle */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-slate-700">Package Status</span>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {editPackage.is_active ? "Visible to customers on the captive portal" : "Hidden from the captive portal buy page"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditPackage({ ...editPackage, is_active: !editPackage.is_active })}
                                        className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                                            editPackage.is_active ? "bg-emerald-500" : "bg-slate-300"
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                                                editPackage.is_active ? "left-[22px]" : "left-0.5"
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditPackageModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: ROUTEROS CONFIGURATION SCRIPT */}
            {showScriptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Terminal className="text-emerald-400" size={20} />
                                <h3 className="font-black text-white text-base">
                                    RouterOS Hotspot Script for {showScriptModal.name}
                                </h3>
                            </div>
                            <button onClick={() => setShowScriptModal(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-400">
                                Copy and paste this script into your MikroTik WinBox Terminal to enable walled garden and redirect users to your billing captive portal.
                            </p>
                            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-emerald-400 font-mono text-xs overflow-x-auto max-h-72 whitespace-pre leading-relaxed">
{`# ============================================================
# MY NET BILLING - MIKROTIK HOTSPOT CONFIGURATION
# Router: ${showScriptModal.name} (ID: ${showScriptModal.id})
# ============================================================

/ip hotspot profile set [find default=yes] dns-name="${showScriptModal.dns_name || "hotspot.mynet.local"}" login-by=http-chap,http-pap,cookie use-radius=no

/ip hotspot walled-garden
add dst-host=*.safaricom.co.ke action=allow comment="Allow M-Pesa"
add dst-host=*.supabase.co action=allow comment="Allow Supabase Cloud"
add dst-host=*mynet* action=allow comment="Allow Billing Portal"
add dst-host=localhost action=allow comment="Local Dev Portal"

:put "MyNet Hotspot configuration applied for ${showScriptModal.name}!"`}
                            </pre>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        const scriptText = `/ip hotspot profile set [find default=yes] dns-name="${showScriptModal.dns_name || "hotspot.mynet.local"}" login-by=http-chap,http-pap,cookie use-radius=no\n/ip hotspot walled-garden\nadd dst-host=*.safaricom.co.ke action=allow\nadd dst-host=*.supabase.co action=allow\nadd dst-host=*mynet* action=allow\nadd dst-host=localhost action=allow`;
                                        handleCopy(scriptText, "router-script");
                                    }}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                                >
                                    {copiedLink === "router-script" ? <Check size={16} /> : <Copy size={16} />}
                                    Copy Script to Clipboard
                                </button>
                                <button
                                    onClick={() => setShowScriptModal(null)}
                                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 5: QR CODE MODAL */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8 space-y-6">
                        <div className="space-y-1">
                            <h3 className="font-extrabold text-xl text-slate-900">{showQrModal.name}</h3>
                            <p className="text-xs text-slate-500 font-bold">Hotspot Captive Portal Signage</p>
                        </div>

                        {/* Generates a QR Code image using dynamic public API */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block mx-auto">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(showQrModal.portalUrl)}`}
                                alt="Hotspot QR Code"
                                className="w-48 h-48 rounded-xl shadow-inner mx-auto"
                            />
                        </div>

                        <p className="text-xs font-mono text-slate-500 break-all px-2">
                            {showQrModal.portalUrl}
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleCopy(showQrModal.portalUrl, "qr-link")}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                            >
                                {copiedLink === "qr-link" ? <Check size={16} /> : <Copy size={16} />}
                                Copy Link
                            </button>
                            <button
                                onClick={() => setShowQrModal(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
