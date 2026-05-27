"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Wifi,
    Wallet,
    LogOut,
    Menu,
    X,
    Shield
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // In dev, let's just mock it if no user
                setLoading(false);
                return;
            }
            
            // Check if role is employee
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role !== 'employee' && profile?.role !== 'admin') {
                router.push("/login?error=Unauthorized");
                return;
            }

            setUser(user);
            setLoading(false);
        };

        checkUser();
    }, [router, supabase.auth]);

    const navItems = [
        { label: "Dashboard", href: "/employee", icon: <LayoutDashboard size={20} /> },
        { label: "Assigned Clients", href: "/employee/clients", icon: <Users size={20} /> },
        { label: "Router Access", href: "/employee/routers", icon: <Wifi size={20} /> },
        { label: "Payroll", href: "/employee/payroll", icon: <Wallet size={20} /> },
    ];

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col fixed h-full z-50`}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && "hidden"}`}>
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Shield className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Staff Panel</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 flex flex-col gap-2 mt-4">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${pathname === item.href ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"}`}>
                            {item.icon}
                            {isSidebarOpen && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="flex items-center gap-3 w-full p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium">
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`${isSidebarOpen ? "ml-64" : "ml-20"} flex-1 transition-all duration-300 p-8`}>
                {children}
            </main>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
}
