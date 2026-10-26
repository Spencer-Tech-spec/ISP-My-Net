"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Search,
    Filter,
    MoreHorizontal,
    UserPlus,
    Mail,
    Phone,
    Shield,
    Trash2,
    Edit2,
    X,
    Check,
    Loader2,
    MapPin,
    CreditCard,
    User
} from "lucide-react";

interface Subscriber {
    id: string;
    full_name?: string;
    username?: string;
    email?: string;
    phone?: string;
    plan?: string;
    status?: string;
    address?: string;
    id_number?: string;
    created_at?: string;
    [key: string]: any;
}

const EMPTY_FORM: Omit<Subscriber, "id"> = {
    full_name: "",
    email: "",
    phone: "",
    plan: "Basic",
    status: "Active",
    username: "",
    address: "",
    id_number: "",
};

export default function SubscribersPage() {
    const [users, setUsers] = useState<Subscriber[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<Subscriber | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Add New Subscriber state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSub, setNewSub] = useState<Omit<Subscriber, "id">>(EMPTY_FORM);
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Fetch via server route (bypasses RLS)
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch("/api/subscribers");
            const json = await res.json();

            if (!res.ok) {
                setErrorMsg(json.error || "Failed to load subscribers");
                setUsers([]);
            } else {
                setUsers(json.subscribers || []);
            }
        } catch (err: any) {
            console.error("Fetch users exception:", err);
            setErrorMsg("Network error loading subscribers");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Flash success messages then clear
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => setSuccessMsg(null), 4000);
            return () => clearTimeout(t);
        }
    }, [successMsg]);

    // ─── Add New Subscriber ────────────────────────────────────────────
    const handleAddSubscriber = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError(null);

        if (!newSub.full_name?.trim()) {
            setAddError("Full name is required.");
            return;
        }
        if (!newSub.phone?.trim()) {
            setAddError("Phone number is required.");
            return;
        }

        setIsAdding(true);
        try {
            const res = await fetch("/api/subscribers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSub),
            });

            const json = await res.json();

            if (!res.ok) {
                setAddError(json.error || "Failed to create subscriber");
                return;
            }

            // Add to top of local state for instant feedback
            if (json.subscriber) {
                setUsers((prev) => [json.subscriber, ...prev]);
            } else {
                await fetchUsers(); // fallback full refetch
            }

            setSuccessMsg(`✅ ${newSub.full_name} added successfully!`);
            setNewSub(EMPTY_FORM);
            setShowAddModal(false);
        } catch (err: any) {
            setAddError("Network error: " + (err.message || "please try again"));
        } finally {
            setIsAdding(false);
        }
    };

    // ─── Toggle Status ─────────────────────────────────────────────────
    const handleToggleStatus = async (user: Subscriber) => {
        const newStatus = user.status?.toLowerCase() === "active" ? "Inactive" : "Active";

        try {
            const res = await fetch("/api/subscribers", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: user.id, status: newStatus }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error);

            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        } catch (err: any) {
            alert("Failed to update status: " + err.message);
        }
    };

    // ─── Delete Subscriber ─────────────────────────────────────────────
    const handleDelete = async (userId: string) => {
        if (!window.confirm("Are you sure you want to delete this subscriber? This action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/subscribers?id=${encodeURIComponent(userId)}`, {
                method: "DELETE",
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error);

            setUsers(users.filter(u => u.id !== userId));
            setSuccessMsg("Subscriber deleted successfully.");
        } catch (err: any) {
            alert("Failed to delete subscriber: " + err.message);
        }
    };

    // ─── Edit / Save ───────────────────────────────────────────────────
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/subscribers", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingUser.id,
                    full_name: editingUser.full_name,
                    phone: editingUser.phone,
                    plan: editingUser.plan,
                    status: editingUser.status,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error);

            setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...editingUser } : u));
            setEditingUser(null);
            setSuccessMsg("Subscriber updated successfully.");
        } catch (err: any) {
            alert("Failed to save changes: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(user => {
        if (!user) return false;
        const nameMatch = (user.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = (user.phone || "").toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || emailMatch || phoneMatch;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Error Message Overlay */}
            {errorMsg && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="text-rose-500" size={20} />
                            <div>
                                <p className="text-sm font-black text-rose-800 uppercase tracking-wider">Database Error Detected</p>
                                <p className="text-xs text-rose-600 font-medium mt-0.5">{errorMsg}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-black uppercase rounded-lg transition-colors"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            )}

            {/* Success Banner */}
            {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <Check className="text-emerald-500" size={20} />
                        <p className="text-sm font-bold text-emerald-800">{successMsg}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Subscriber Management</h2>
                    <p className="text-slate-500 text-sm">Monitor and edit subscriber details and connectivity status.</p>
                </div>
                <button
                    id="btn-add-subscriber"
                    onClick={() => {
                        setNewSub(EMPTY_FORM);
                        setAddError(null);
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <UserPlus size={18} />
                    Add New Subscriber
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                        <Filter size={16} />
                        Filter
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">Internal ID</th>
                                <th className="px-6 py-5">Full Name & Email</th>
                                <th className="px-6 py-5">Phone Number</th>
                                <th className="px-6 py-5">Plan</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8 h-16 bg-slate-50/20"></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-400">#USR-{user.id?.toString().substring(0, 4) || "????"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform uppercase">
                                                    {(user.full_name || user.username || "U").charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{user.full_name || user.username || "Unknown Guest"}</p>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                        <Mail size={12} />
                                                        {user.email || "No email provided"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                                <Phone size={14} className="text-slate-400" />
                                                {user.phone || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${user.plan === "Diamond" ? "bg-purple-50 text-purple-600" :
                                                user.plan === "Gold" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                                }`}>
                                                {user.plan || "Standard"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleToggleStatus(user)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${user.status?.toLowerCase() === "active"
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                                    }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.status?.toLowerCase() === "active" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                                {user.status || "Inactive"}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-blue-600 transition-all" title="Edit User">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-red-500 transition-all" title="Delete User">
                                                    <Trash2 size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 transition-all">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <p className="text-slate-400 font-medium">No subscribers found matching your search.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-sm">
                    <p className="text-slate-500 font-medium">Showing <span className="text-slate-900 font-bold">{filteredUsers.length}</span> of {users.length} total subscribers</p>
                    <div className="flex items-center gap-2">
                        <button disabled className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 text-xs font-bold disabled:opacity-50">Previous</button>
                        <button disabled className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 text-xs font-bold disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {/* ═══════════ ADD NEW SUBSCRIBER MODAL ═══════════ */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <UserPlus size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-white text-lg">Add New Subscriber</h3>
                                    <p className="text-blue-100 text-xs">Fill in the details to register a new subscriber</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Error inside modal */}
                        {addError && (
                            <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold p-3 rounded-xl flex items-center gap-2">
                                <Shield size={16} className="text-rose-500 shrink-0" />
                                {addError}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleAddSubscriber} className="p-6 space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <User size={12} /> Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    id="input-add-name"
                                    type="text"
                                    required
                                    placeholder="e.g. John Kamau"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                    value={newSub.full_name || ""}
                                    onChange={(e) => setNewSub({ ...newSub, full_name: e.target.value })}
                                />
                            </div>

                            {/* Phone & Email row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        <Phone size={12} /> Phone <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="input-add-phone"
                                        type="tel"
                                        required
                                        placeholder="0712345678"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={newSub.phone || ""}
                                        onChange={(e) => setNewSub({ ...newSub, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        <Mail size={12} /> Email
                                    </label>
                                    <input
                                        id="input-add-email"
                                        type="email"
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={newSub.email || ""}
                                        onChange={(e) => setNewSub({ ...newSub, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* ID Number & Address row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        <CreditCard size={12} /> ID Number
                                    </label>
                                    <input
                                        id="input-add-id-number"
                                        type="text"
                                        placeholder="National ID"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={newSub.id_number || ""}
                                        onChange={(e) => setNewSub({ ...newSub, id_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        <MapPin size={12} /> Address / Location
                                    </label>
                                    <input
                                        id="input-add-address"
                                        type="text"
                                        placeholder="Estate, Town"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={newSub.address || ""}
                                        onChange={(e) => setNewSub({ ...newSub, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Plan & Status row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internet Plan</label>
                                    <select
                                        id="select-add-plan"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={newSub.plan || "Basic"}
                                        onChange={(e) => setNewSub({ ...newSub, plan: e.target.value })}
                                    >
                                        <option value="Basic">Basic</option>
                                        <option value="Gold">Gold</option>
                                        <option value="Diamond">Diamond</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Status</label>
                                    <select
                                        id="select-add-status"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                                        value={newSub.status || "Active"}
                                        onChange={(e) => setNewSub({ ...newSub, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Submit buttons */}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="btn-submit-subscriber"
                                    type="submit"
                                    disabled={isAdding}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                                >
                                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                    {isAdding ? "Creating..." : "Add Subscriber"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ EDIT SUBSCRIBER MODAL ═══════════ */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900">Edit Subscriber</h3>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={editingUser.full_name || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={editingUser.phone || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internet Plan</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editingUser.plan || "Basic"}
                                        onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value })}
                                    >
                                        <option value="Basic">Basic</option>
                                        <option value="Gold">Gold</option>
                                        <option value="Diamond">Diamond</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Status</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editingUser.status || "Inactive"}
                                        onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
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
        </div>
    );
}
