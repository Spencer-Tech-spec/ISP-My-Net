"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { 
    Ticket, 
    User, 
    Clock, 
    MapPin, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight,
    Search,
    Filter,
    UserPlus
} from 'lucide-react';

interface Ticket {
    id: number;
    client_id: string;
    subject: string;
    description: string;
    priority: string;
    status: string;
    assigned_employee_id: string | null;
    created_at: string;
    profiles?: {
        full_name: string;
        address: string;
        last_location_lat: number;
        last_location_lng: number;
    };
    assigned?: {
        full_name: string;
    };
}

interface Employee {
    id: string;
    full_name: string;
    role: string;
}

export default function TicketsPage() {
    const supabase = createClient();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch tickets with a more robust query
            const { data: ticketData, error } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    profiles:client_id (
                        full_name, 
                        address
                    ),
                    assigned:assigned_employee_id (
                        full_name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase Error:", error);
            }

            // Fetch employees
            const { data: empData } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('role', 'employee');

            setTickets((ticketData as any) || []);
            setEmployees(empData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (employeeId: string) => {
        if (!selectedTicket) return;

        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ 
                    assigned_employee_id: employeeId,
                    status: 'assigned'
                })
                .eq('id', selectedTicket.id);

            if (error) throw error;

            // Notify via employee_notifications
            await supabase.from('employee_notifications').insert({
                employee_id: employeeId,
                title: 'New Task Assigned',
                body: `You have been assigned to: ${selectedTicket.subject}`,
                type: 'client_assigned'
            });

            setShowAssignModal(false);
            setSelectedTicket(null);
            fetchData();
            alert("Ticket assigned successfully!");
        } catch (error) {
            console.error("Error assigning ticket:", error);
            alert("Failed to assign ticket");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-red-100 text-red-700';
            case 'assigned': return 'bg-amber-100 text-amber-700';
            case 'resolved': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const filteredTickets = tickets.filter(t => 
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">Support Tickets</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage client issues and assign field staff</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search tickets..."
                            className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl w-[300px] focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-[200px] bg-white rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTickets.map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-2 h-full ${ticket.priority === 'urgent' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                                    {ticket.status}
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-[#0f172a] mb-2 leading-tight">{ticket.subject}</h3>
                            <p className="text-slate-500 text-sm mb-6 line-clamp-2 font-medium">{ticket.description}</p>

                            <div className="space-y-4 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 leading-none mb-1">Client</p>
                                        <p className="text-sm font-bold text-slate-700">{ticket.profiles?.full_name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 leading-none mb-1">Location</p>
                                        <p className="text-sm font-bold text-slate-700">{ticket.profiles?.address || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                {ticket.assigned_employee_id ? (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <p className="text-xs font-bold text-slate-600">Assigned to: <span className="text-indigo-600">{ticket.assigned?.full_name}</span></p>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => { setSelectedTicket(ticket); setShowAssignModal(true); }}
                                        className="w-full py-4 bg-[#4f46e5] text-white rounded-2xl font-black text-sm hover:bg-[#4338ca] shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Assign Technician
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-[#0f172a]">Assign Technician</h2>
                                    <p className="text-slate-500 font-medium">Select a staff member near {selectedTicket?.profiles?.address}</p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600">×</button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {employees.map(emp => (
                                    <button 
                                        key={emp.id}
                                        onClick={() => handleAssign(emp.id)}
                                        className="w-full p-6 bg-slate-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-3xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 text-xl font-black border border-slate-100 group-hover:border-indigo-200">
                                                {emp.full_name?.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-lg font-bold text-[#0f172a]">{emp.full_name}</p>
                                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Available Technician</p>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
