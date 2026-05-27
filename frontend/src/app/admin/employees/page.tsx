'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Mail, Lock, User, DollarSign, Trash2, Shield, Loader2, CheckCircle, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Employee {
  id: string;
  base_salary: number;
  current_balance: number;
  created_at: string;
  profiles: { full_name: string; email?: string } | null;
}

interface NewEmployee {
  full_name: string;
  email: string;
  password: string;
  base_salary: string;
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState<NewEmployee>({
    full_name: '',
    email: '',
    password: '',
    base_salary: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (empError) throw empError;

      if (!empData || empData.length === 0) {
        setEmployees([]);
        return;
      }

      // Fetch matching profiles
      const ids = empData.map((e: any) => e.id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);

      // Merge
      const merged = empData.map((emp: any) => ({
        ...emp,
        profiles: profileData?.find((p: any) => p.id === emp.id) || null,
      }));

      setEmployees(merged);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.base_salary) {
      showToast('error', 'All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/payroll/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          base_salary: parseFloat(form.base_salary),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create employee');

      showToast('success', `Employee ${form.full_name} added successfully!`);
      setForm({ full_name: '', email: '', password: '', base_salary: '' });
      setShowForm(false);
      fetchEmployees();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Staff Management</h1>
            <p className="text-gray-500 mt-1">Add and manage employee accounts for the Staff Portal</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <UserPlus size={20} />
            Add Employee
          </button>
        </div>

        {/* Add Employee Form */}
        {showForm && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                <Shield className="text-white" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">New Employee Account</h2>
                <p className="text-sm text-gray-500">The employee can immediately log in to the Staff App</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. John Mwangi"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Corporate Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="employee@mynet.co.ke"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Temporary Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Base Salary (KES)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    value={form.base_salary}
                    onChange={e => setForm({ ...form, base_salary: e.target.value })}
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">
              Active Staff <span className="text-indigo-600">({employees.length})</span>
            </h2>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">EMPLOYEE ROLE</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-semibold">No employees added yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Employee" to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Employee</th>
                  <th className="px-6 py-4 text-left">Base Salary</th>
                  <th className="px-6 py-4 text-left">Current Balance</th>
                  <th className="px-6 py-4 text-left">Joined</th>
                  <th className="px-6 py-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                          {emp.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{emp.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 font-mono">{emp.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      KES {emp.base_salary?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-black ${emp.current_balance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        KES {emp.current_balance?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(emp.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
