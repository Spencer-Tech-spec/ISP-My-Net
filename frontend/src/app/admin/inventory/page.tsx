"use client";

import React, { useState, useEffect } from "react";
import {
    Boxes,
    Package,
    Plus,
    Search,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    RefreshCw,
    Sliders,
    Barcode,
    Cpu,
    Radio,
    Wrench,
    CheckCircle2,
    Clock,
    X,
    Filter,
    Layers,
    DollarSign,
    Loader2,
    ShieldAlert
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<"catalog" | "assets" | "movements">("catalog");
    const [items, setItems] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [movements, setMovements] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total_items: 0,
        total_stock_value: 0,
        low_stock_count: 0,
        serialized_assets_count: 0,
        installed_assets_count: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Modals
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showAdjustStockModal, setShowAdjustStockModal] = useState<any | null>(null);
    const [showAddAssetModal, setShowAddAssetModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form states
    const [newItem, setNewItem] = useState({
        name: "",
        category: "router",
        model: "",
        sku: "",
        quantity: 1,
        unit: "pcs",
        unit_cost: 0,
        reorder_level: 5,
        location: "Central Warehouse",
        notes: ""
    });

    const [stockAdjustment, setStockAdjustment] = useState({
        adjustment_type: "stock_in",
        quantity: 1,
        recipient_name: "",
        reference_order: "",
        notes: ""
    });

    const [newAsset, setNewAsset] = useState({
        item_id: "",
        serial_number: "",
        mac_address: "",
        status: "in_stock",
        notes: ""
    });

    const supabase = createClient();

    const getApiBase = () => {
        if (typeof window !== "undefined") {
            const host = window.location.hostname;
            if (host.includes("vercel.app") || host.includes("netlify.app")) {
                return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            }
            return `http://${host}:8000`;
        }
        return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    };

    const resolveIspId = async (): Promise<string | null> => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("impersonate_isp_id");
            if (stored) return stored;
        }
        try {
            const { data } = await supabase.from("isp_tenants").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
            return data?.id || null;
        } catch {
            return null;
        }
    };

    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Catalog Items directly via Supabase
            const { data: itemData, error: itemError } = await supabase
                .from("inventory_items")
                .select("*")
                .order("created_at", { ascending: false });

            const itemsList = itemData || [];
            setItems(itemsList);

            // 2. Fetch Serialized Assets
            const { data: assetData } = await supabase
                .from("serialized_assets")
                .select("*, inventory_items(name, model, category)")
                .order("created_at", { ascending: false });

            const assetsList = assetData || [];
            setAssets(assetsList);

            // 3. Fetch Movements
            const { data: movData } = await supabase
                .from("inventory_movements")
                .select("*, inventory_items(name, unit)")
                .order("created_at", { ascending: false })
                .limit(50);

            setMovements(movData || []);

            // 4. Compute KPIs directly
            const totalVal = itemsList.reduce((acc: number, it: any) => acc + (Number(it.quantity || 0) * Number(it.unit_cost || 0)), 0);
            const lowCount = itemsList.filter((it: any) => Number(it.quantity || 0) <= Number(it.reorder_level || 5)).length;
            const installedCount = assetsList.filter((a: any) => a.status === "installed_client").length;

            setStats({
                total_items: itemsList.length,
                total_stock_value: Math.round(totalVal),
                low_stock_count: lowCount,
                serialized_assets_count: assetsList.length,
                installed_assets_count: installedCount
            });
        } catch (e: any) {
            console.error("Failed to load inventory data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventoryData();
    }, []);

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFeedbackMsg(null);
        try {
            const ispId = await resolveIspId();
            if (!ispId) throw new Error("No active ISP tenant found to associate equipment with.");

            // 1. Insert into Supabase
            const { data, error } = await supabase.from("inventory_items").insert({
                isp_id: ispId,
                name: newItem.name,
                category: newItem.category,
                model: newItem.model,
                sku: newItem.sku,
                quantity: newItem.quantity,
                unit: newItem.unit,
                unit_cost: newItem.unit_cost,
                reorder_level: newItem.reorder_level,
                location: newItem.location || "Central Warehouse",
                notes: newItem.notes
            }).select();

            if (error) throw error;

            // 2. Insert initial stock movement log if quantity > 0
            if (data && data[0] && newItem.quantity > 0) {
                await supabase.from("inventory_movements").insert({
                    isp_id: ispId,
                    item_id: data[0].id,
                    movement_type: "stock_in",
                    quantity_changed: newItem.quantity,
                    quantity_after: newItem.quantity,
                    notes: "Initial inventory catalog intake"
                });
            }

            setFeedbackMsg({ type: "success", text: `Equipment "${newItem.name}" added to inventory!` });
            setShowAddItemModal(false);
            setNewItem({
                name: "",
                category: "router",
                model: "",
                sku: "",
                quantity: 1,
                unit: "pcs",
                unit_cost: 0,
                reorder_level: 5,
                location: "Central Warehouse",
                notes: ""
            });
            await fetchInventoryData();
        } catch (err: any) {
            setFeedbackMsg({ type: "error", text: err.message || "Error adding item." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdjustStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showAdjustStockModal) return;
        setIsSubmitting(true);
        setFeedbackMsg(null);
        try {
            const currentQty = Number(showAdjustStockModal.quantity || 0);
            const delta = stockAdjustment.adjustment_type === "stock_in" || stockAdjustment.adjustment_type === "return"
                ? Number(stockAdjustment.quantity)
                : -Math.abs(Number(stockAdjustment.quantity));
            const newQty = Math.max(0, currentQty + delta);

            // 1. Update quantity
            const { error: updateErr } = await supabase
                .from("inventory_items")
                .update({ quantity: newQty })
                .eq("id", showAdjustStockModal.id);

            if (updateErr) throw updateErr;

            // 2. Insert Movement Log
            await supabase.from("inventory_movements").insert({
                isp_id: showAdjustStockModal.isp_id,
                item_id: showAdjustStockModal.id,
                movement_type: stockAdjustment.adjustment_type,
                quantity_changed: delta,
                quantity_after: newQty,
                recipient_name: stockAdjustment.recipient_name,
                reference_order: stockAdjustment.reference_order,
                notes: stockAdjustment.notes
            });

            setFeedbackMsg({ type: "success", text: `Stock adjusted for ${showAdjustStockModal.name} (${newQty} ${showAdjustStockModal.unit}).` });
            setShowAdjustStockModal(null);
            setStockAdjustment({
                adjustment_type: "stock_in",
                quantity: 1,
                recipient_name: "",
                reference_order: "",
                notes: ""
            });
            await fetchInventoryData();
        } catch (err: any) {
            setFeedbackMsg({ type: "error", text: err.message || "Error adjusting stock." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFeedbackMsg(null);
        try {
            const ispId = await resolveIspId();
            if (!ispId) throw new Error("No active ISP tenant found.");

            const { error } = await supabase.from("serialized_assets").insert({
                isp_id: ispId,
                item_id: newAsset.item_id || null,
                serial_number: newAsset.serial_number.trim().toUpperCase(),
                mac_address: newAsset.mac_address.trim().toUpperCase() || null,
                status: newAsset.status,
                notes: newAsset.notes
            });

            if (error) throw error;

            setFeedbackMsg({ type: "success", text: `Hardware asset ${newAsset.serial_number} recorded!` });
            setShowAddAssetModal(false);
            setNewAsset({ item_id: "", serial_number: "", mac_address: "", status: "in_stock", notes: "" });
            await fetchInventoryData();
        } catch (err: any) {
            setFeedbackMsg({ type: "error", text: err.message || "Error registering hardware." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = items.filter(it => {
        const matchesCat = categoryFilter === "all" || it.category === categoryFilter;
        const matchesSearch =
            (it.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (it.model || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (it.sku || "").toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const filteredAssets = assets.filter(a => {
        return (
            (a.serial_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.mac_address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.inventory_items?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <Boxes className="w-8 h-8 text-blue-600" />
                        Inventory & Field Equipment
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track router stock, fiber ONUs, drop cables, serial numbers, and technician dispatches.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchInventoryData}
                        disabled={loading}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-600"
                        title="Refresh Inventory"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setShowAddAssetModal(true)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition flex items-center gap-2"
                    >
                        <Barcode size={16} /> Scan Serial
                    </button>
                    <button
                        onClick={() => setShowAddItemModal(true)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Equipment
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {feedbackMsg && (
                <div
                    className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
                        feedbackMsg.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {feedbackMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        {feedbackMsg.text}
                    </div>
                    <button onClick={() => setFeedbackMsg(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog Items</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.total_items}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Valuation</p>
                        <p className="text-2xl font-bold text-slate-900">KES {stats.total_stock_value.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                        stats.low_stock_count > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
                    }`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.low_stock_count}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                        <Barcode size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Serialized Units</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.serialized_assets_count} <span className="text-xs font-normal text-slate-400">({stats.installed_assets_count} installed)</span></p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-8">
                <button
                    onClick={() => setActiveTab("catalog")}
                    className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
                        activeTab === "catalog"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Package size={18} /> Equipment Catalog & Stock
                </button>
                <button
                    onClick={() => setActiveTab("assets")}
                    className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
                        activeTab === "assets"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Barcode size={18} /> Serialized Hardware ({assets.length})
                </button>
                <button
                    onClick={() => setActiveTab("movements")}
                    className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
                        activeTab === "movements"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Clock size={18} /> Stock Movement Logs
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search items, serials, models..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {activeTab === "catalog" && (
                    <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                        {["all", "router", "onu_cpe", "cable", "access_point", "tool", "accessory"].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                                    categoryFilter === cat
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {cat.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* TAB 1: CATALOG & STOCK */}
            {activeTab === "catalog" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Item & Model</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Stock Level</th>
                                    <th className="px-6 py-4">Unit Cost</th>
                                    <th className="px-6 py-4">Total Value</th>
                                    <th className="px-6 py-4">Warehouse Location</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                            Loading inventory items...
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-400">
                                            No inventory items found. Click "Add Equipment" to register your stock.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map(item => {
                                        const isLow = item.quantity <= item.reorder_level;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{item.name}</div>
                                                    <div className="text-xs text-slate-400">{item.model || "Standard Spec"} {item.sku ? `• SKU: ${item.sku}` : ""}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                                        {item.category.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-base font-bold ${isLow ? "text-amber-600" : "text-slate-900"}`}>
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                        {isLow && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">
                                                                Low Stock
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium">KES {Number(item.unit_cost).toLocaleString()}</td>
                                                <td className="px-6 py-4 font-bold text-slate-900">KES {(item.quantity * Number(item.unit_cost)).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500">{item.location || "Central"}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setShowAdjustStockModal(item)}
                                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition"
                                                    >
                                                        Adjust Stock
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: SERIALIZED HARDWARE */}
            {activeTab === "assets" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Serial Number</th>
                                    <th className="px-6 py-4">MAC Address</th>
                                    <th className="px-6 py-4">Hardware Type</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Registered Date</th>
                                    <th className="px-6 py-4 text-right">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                            Loading hardware assets...
                                        </td>
                                    </tr>
                                ) : filteredAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-400">
                                            No serialized equipment tracked yet. Click "Scan Serial" to add a device.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAssets.map(asset => {
                                        const statusBadge: Record<string, string> = {
                                            in_stock: "bg-emerald-100 text-emerald-700",
                                            assigned_technician: "bg-blue-100 text-blue-700",
                                            installed_client: "bg-purple-100 text-purple-700",
                                            faulty: "bg-rose-100 text-rose-700"
                                        };
                                        const badgeClass = statusBadge[asset.status] || "bg-slate-100 text-slate-700";

                                        return (
                                            <tr key={asset.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-900">{asset.serial_number}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{asset.mac_address || "—"}</td>
                                                <td className="px-6 py-4 font-medium text-slate-800">
                                                    {asset.inventory_items?.name || "General Device"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${badgeClass}`}>
                                                        {asset.status.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400">
                                                    {new Date(asset.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs text-slate-500">
                                                    {asset.notes || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: STOCK MOVEMENTS AUDIT */}
            {activeTab === "movements" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4">Movement</th>
                                    <th className="px-6 py-4">Quantity Changed</th>
                                    <th className="px-6 py-4">Stock After</th>
                                    <th className="px-6 py-4">Recipient / Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {movements.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-400">
                                            No movements logged yet.
                                        </td>
                                    </tr>
                                ) : (
                                    movements.map(m => {
                                        const isPositive = m.quantity_changed > 0;
                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    {new Date(m.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900">{m.inventory_items?.name || "Equipment"}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                                        {m.movement_type.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {isPositive ? `+${m.quantity_changed}` : m.quantity_changed}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900">{m.quantity_after}</td>
                                                <td className="px-6 py-4 text-xs text-slate-600">{m.recipient_name || m.reference_order || m.notes || "—"}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: ADD CATALOG ITEM */}
            {showAddItemModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Package className="text-blue-600" size={20} /> Add New Equipment Item
                            </h3>
                            <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. MikroTik hEX RB750Gr3, 1-Core Drop Fiber"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                                    <select
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="router">Router / Gateway</option>
                                        <option value="onu_cpe">ONU / Fiber CPE</option>
                                        <option value="cable">Cable / Drop Wire</option>
                                        <option value="access_point">Access Point</option>
                                        <option value="tool">Tool / Splicer</option>
                                        <option value="accessory">Accessory / Patch Cord</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Model Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. HG8546M, RB750Gr3"
                                        value={newItem.model}
                                        onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                                    <select
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="pcs">Pieces</option>
                                        <option value="meters">Meters</option>
                                        <option value="rolls">Rolls</option>
                                        <option value="boxes">Boxes</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost (KES)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newItem.unit_cost}
                                        onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Location</label>
                                <input
                                    type="text"
                                    placeholder="Central Warehouse, Van 1, Site B Rack"
                                    value={newItem.location}
                                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddItemModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ADJUST STOCK */}
            {showAdjustStockModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Sliders className="text-blue-600" size={20} /> Adjust Stock: {showAdjustStockModal.name}
                            </h3>
                            <button onClick={() => setShowAdjustStockModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAdjustStock} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Type</label>
                                <select
                                    value={stockAdjustment.adjustment_type}
                                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustment_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="stock_in">Stock-In (Purchase / Restock)</option>
                                    <option value="stock_out">Stock-Out (Damaged / Missing)</option>
                                    <option value="installation">Installation Checkout (Technician / Client)</option>
                                    <option value="return">Return from Field</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Quantity ({showAdjustStockModal.unit})
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={stockAdjustment.quantity}
                                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient / Technician Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe (Technician)"
                                    value={stockAdjustment.recipient_name}
                                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, recipient_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference Order / Notes</label>
                                <input
                                    type="text"
                                    placeholder="Work order # or supplier invoice"
                                    value={stockAdjustment.notes}
                                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAdjustStockModal(null)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Confirm Adjustment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTER SERIALIZED ASSET */}
            {showAddAssetModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Barcode className="text-blue-600" size={20} /> Register Hardware Serial
                            </h3>
                            <button onClick={() => setShowAddAssetModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAsset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Catalog Item Type</label>
                                <select
                                    value={newAsset.item_id}
                                    onChange={(e) => setNewAsset({ ...newAsset, item_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">Select Equipment Model</option>
                                    {items.map(it => (
                                        <option key={it.id} value={it.id}>{it.name} ({it.model || it.category})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number (S/N)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. SN-871263910"
                                    value={newAsset.serial_number}
                                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">MAC Address (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 48:8F:5A:12:34:56"
                                    value={newAsset.mac_address}
                                    onChange={(e) => setNewAsset({ ...newAsset, mac_address: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Status</label>
                                <select
                                    value={newAsset.status}
                                    onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="in_stock">In Stock (Warehouse)</option>
                                    <option value="assigned_technician">Assigned to Field Technician</option>
                                    <option value="installed_client">Installed at Client Premises</option>
                                    <option value="faulty">Faulty / For Repair</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddAssetModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Save Serial"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
