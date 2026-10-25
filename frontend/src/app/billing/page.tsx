"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Zap,
  Crown,
  ShieldAlert,
  Percent,
  Coins,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  Settings,
  Receipt
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface RevenueBillingData {
  billing_month: string;
  gross_revenue: number;
  revenue_percentage: number;
  fee_due: number;
  is_frozen: boolean;
  is_overdue: boolean;
  overdue_amount: number;
  subscription_status: string;
  current_invoice: any;
  past_invoices: any[];
  available_gateways: string[];
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<RevenueBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<"mpesa" | "payhero">("payhero");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  
  // Tenant Gateway Settings state
  const [payheroSettings, setPayheroSettings] = useState({
    payhero_api_key: "",
    payhero_channel_id: "",
    payhero_provider: "m-pesa",
    preferred_gateway: "both",
    has_api_secret: false
  });
  const [payheroSecret, setPayheroSecret] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?error=Please+log+in+to+access+billing");
        return;
      }
      // Ensure ISP token is available for backend calls
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem("isp_token", session.access_token);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [router, supabase.auth]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const getToken = () => {
    if (typeof window !== "undefined") return localStorage.getItem("isp_token") || "";
    return "";
  };

  const fetchBilling = async () => {
    const token = getToken();
    try {
      let billingDataRes = null;
      let settingsDataRes = null;

      try {
        const billingRes = await fetch(`${backendUrl}/subscriptions/revenue-billing`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (billingRes.ok) {
          billingDataRes = await billingRes.json();
        }
      } catch (err) {
        console.warn("Backend revenue billing endpoint unreachable, loading from Supabase:", err);
      }

      try {
        const settingsRes = await fetch(`${backendUrl}/payhero/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (settingsRes.ok) {
          settingsDataRes = await settingsRes.json();
        }
      } catch (err) {
        console.warn("Backend settings endpoint unreachable:", err);
      }

      if (billingDataRes) {
        setBillingData(billingDataRes);
      } else {
        // Fallback: Compute real metrics directly from Supabase
        const { data: txs } = await supabase
          .from("transactions")
          .select("amount, created_at, status")
          .eq("status", "completed");

        const gross = (txs || []).reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
        const fee = Math.round(gross * 0.03);

        setBillingData({
          billing_month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
          gross_revenue: gross,
          revenue_percentage: 3,
          fee_due: fee,
          is_frozen: false,
          is_overdue: false,
          overdue_amount: 0,
          subscription_status: "active",
          current_invoice: { id: "INV-CURRENT", amount: fee, status: "pending" },
          past_invoices: [],
          available_gateways: ["mpesa", "payhero"]
        });
      }

      if (settingsDataRes) {
        setPayheroSettings(settingsDataRes);
      }
    } catch (e) {
      console.warn("Billing fetch fallback engaged:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      fetchBilling();
    }
  }, [backendUrl, authChecked]);

  const [paymentAmount, setPaymentAmount] = useState<string>("10");

  const handlePayCommission = async () => {
    if (!payPhone) {
      setMessage({ type: "error", text: "Please enter your Kenyan phone number to receive the payment prompt." });
      return;
    }

    const calculatedFee = billingData?.is_overdue
      ? billingData.overdue_amount
      : (billingData?.fee_due || 0);

    const amountToPay = paymentAmount
      ? parseFloat(paymentAmount)
      : (calculatedFee > 0 ? calculatedFee : 10);

    if (!amountToPay || amountToPay < 1) {
      setMessage({ type: "error", text: "Minimum payment amount is KES 1.00." });
      return;
    }

    setPaying(true);
    setMessage(null);

    try {
      const endpoint = selectedGateway === "payhero"
        ? `${backendUrl}/payhero/saas/pay`
        : `${backendUrl}/subscriptions/pay-commission`;

      const payload = selectedGateway === "payhero"
        ? {
            amount: amountToPay,
            phone_number: payPhone,
            invoice_id: billingData?.current_invoice?.id
          }
        : {
            amount: amountToPay,
            phone_number: payPhone,
            invoice_id: billingData?.current_invoice?.id,
            gateway: "mpesa"
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Payment request failed.");

      setMessage({
        type: "success",
        text: data.message || `Payment prompt sent to ${payPhone}. Complete the transaction on your phone.`
      });

      // Poll for auto-update after 5s
      setTimeout(fetchBilling, 6000);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Payment failed. Please try again." });
    } finally {
      setPaying(false);
    }
  };

  const handleSavePayheroSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch(`${backendUrl}/payhero/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          payhero_api_key: payheroSettings.payhero_api_key,
          payhero_api_secret: payheroSecret || undefined,
          payhero_channel_id: payheroSettings.payhero_channel_id,
          payhero_provider: payheroSettings.payhero_provider,
          preferred_gateway: payheroSettings.preferred_gateway
        }),
      });
      if (res.ok) {
        setSettingsMessage("✅ Gateway configuration saved successfully!");
        setPayheroSecret("");
      } else {
        const err = await res.json();
        setSettingsMessage(`❌ ${err.detail || "Failed to save settings"}`);
      }
    } catch (err: any) {
      setSettingsMessage(`❌ ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const isFrozen = billingData?.is_frozen || billingData?.is_overdue;
  const grossRev = billingData?.gross_revenue || 0;
  const pct = billingData?.revenue_percentage || 3.0;
  const feeDue = billingData?.fee_due || (grossRev * (pct / 100));

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white">SaaS Platform Billing</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <Percent size={13} /> 3% Revenue Share Model
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Transparent Kenyan ISP pricing: pay only 3% of your collected monthly subscriber revenue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBilling}
              className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw size={14} /> Refresh Statement
            </button>
          </div>
        </div>

        {/* System Overdue Alert Banner if Frozen */}
        {isFrozen && (
          <div className="rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-orange-950/80 border-2 border-red-500/50 p-6 shadow-2xl shadow-red-500/20 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/40">
                <ShieldAlert size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🚨 SYSTEM UNRESPONSIVE: OVERDUE PLATFORM COMMISSION</span>
                </h3>
                <p className="text-red-200 text-sm mt-1 leading-relaxed">
                  Your monthly 3% platform commission payment is overdue. System controls (network provisioning, subscriber actions, and payroll) are currently unresponsive. Settle your pending invoice of <span className="font-bold text-white underline underline-offset-4">KES {billingData?.overdue_amount?.toLocaleString() || feeDue.toLocaleString()}</span> below to instantly restore access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Share Model Showcase Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Gross Monthly Revenue */}
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Collected Revenue</span>
              <Coins className="text-blue-400 w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-white mt-1">
              KES {grossRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Verified collections for cycle <span className="text-slate-300 font-semibold">{billingData?.billing_month || "Current"}</span>
            </p>
          </div>

          {/* Card 2: 3% Commission Due */}
          <div className={`border rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl transition-all ${
            isFrozen
              ? "bg-red-950/40 border-red-500/40"
              : "bg-slate-900/70 border-white/10"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">My Net Fee ({pct}%)</span>
              <Percent className="text-indigo-400 w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-white mt-1">
              KES {feeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                isFrozen
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}>
                {isFrozen ? "OVERDUE / FROZEN" : "CURRENT BILL"}
              </span>
              <span className="text-xs text-slate-400">Due 5th of month</span>
            </div>
          </div>

          {/* Card 3: Platform Status */}
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Account Health</span>
              <Crown className="text-amber-400 w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-white mt-1 capitalize flex items-center gap-2">
              {isFrozen ? (
                <span className="text-red-400 flex items-center gap-2">
                  <Lock size={20} /> Locked / Unresponsive
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle size={20} /> Active & Operational
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {isFrozen
                ? "Restricted network & subscriber operations."
                : "Unlimited customers, staff, and router sync."}
            </p>
          </div>
        </div>

        {/* Settlement / Payment Action Section */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-blue-400" /> Settle Platform Commission
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Select your preferred payment gateway to clear your 3% SaaS fee.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Due For Payment</span>
              <span className="text-2xl font-black text-white">
                KES {(isFrozen ? (billingData?.overdue_amount || feeDue) : feeDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Gateway Selector Tabs */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setSelectedGateway("payhero")}
              className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                selectedGateway === "payhero"
                  ? "border-blue-500 bg-blue-600/15 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">M-Pesa Express</span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full">Automated STK</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Instant Direct Mobile Money STK Push</p>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                selectedGateway === "payhero" ? "border-blue-500 bg-blue-500" : "border-slate-600"
              }`}>
                {selectedGateway === "payhero" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGateway("mpesa")}
              className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                selectedGateway === "mpesa"
                  ? "border-emerald-500 bg-emerald-600/15 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">Safaricom Direct</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full">Daraja API</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Official Safaricom M-Pesa STK Push</p>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                selectedGateway === "mpesa" ? "border-emerald-500 bg-emerald-500" : "border-slate-600"
              }`}>
                {selectedGateway === "mpesa" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          </div>

          {/* Amount Selection & Gateway Test Mode */}
          <div className="p-4 mb-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Payment Amount (KES)
              </span>
              <span className="text-xs text-slate-400">
                Test the live payment prompt or settle any custom amount.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {["10", "50", "100"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPaymentAmount(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    paymentAmount === preset
                      ? "bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  KES {preset} {preset === "10" && "(Test)"}
                </button>
              ))}
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">KES</span>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full pl-11 pr-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Form Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                placeholder="M-Pesa phone number e.g. 0712345678 or 2547..."
                className="w-full px-5 py-4 bg-white/[0.05] border border-white/15 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-medium tracking-wide"
              />
            </div>
            <button
              onClick={handlePayCommission}
              disabled={paying}
              className={`px-8 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50 ${
                selectedGateway === "payhero"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
              }`}
            >
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing STK...
                </>
              ) : (
                <>
                  <span>Pay KES {paymentAmount || "10"} with {selectedGateway === "payhero" ? "M-Pesa Express" : "Safaricom Direct"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {message && (
            <div className={`mt-5 p-4 rounded-2xl border flex items-start gap-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{message.text}</div>
            </div>
          )}
        </div>

        {/* Section: Automated Gateway Settings for Customer Billing */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
          <div className="border-b border-white/10 pb-4 mb-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" /> Automated Payment Gateway Configuration
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Configure your automated gateway credentials so subscribers and hotspot buyers can pay automatically via M-Pesa.
            </p>
          </div>

          <form onSubmit={handleSavePayheroSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Gateway API Key
                </label>
                <input
                  type="text"
                  value={payheroSettings.payhero_api_key}
                  onChange={(e) => setPayheroSettings({ ...payheroSettings, payhero_api_key: e.target.value })}
                  placeholder="Enter Gateway API Key"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Channel ID (Paybill / Till Number)
                </label>
                <input
                  type="text"
                  value={payheroSettings.payhero_channel_id}
                  onChange={(e) => setPayheroSettings({ ...payheroSettings, payhero_channel_id: e.target.value })}
                  placeholder="e.g. 1234"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Gateway API Secret {payheroSettings.has_api_secret && "(Configured)"}
                </label>
                <input
                  type="password"
                  value={payheroSecret}
                  onChange={(e) => setPayheroSecret(e.target.value)}
                  placeholder={payheroSettings.has_api_secret ? "•••••••••••• (Leave blank to keep)" : "Enter Gateway API Secret"}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Customer Gateway Preference
                </label>
                <select
                  value={payheroSettings.preferred_gateway}
                  onChange={(e) => setPayheroSettings({ ...payheroSettings, preferred_gateway: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="both">Multi-channel (Express STK & C2B Paybill)</option>
                  <option value="payhero">Express STK Push Only</option>
                  <option value="mpesa">Safaricom Direct Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {settingsMessage && <p className="text-xs font-medium text-slate-300">{settingsMessage}</p>}
              <button
                type="submit"
                disabled={savingSettings}
                className="ml-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                Save Gateway Settings
              </button>
            </div>
          </form>
        </div>

        {/* Section: Past Invoices */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" /> Platform Billing History
          </h2>
          {billingData?.past_invoices?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">ISP Gross Revenue</th>
                    <th className="py-3 px-4">Fee (3%)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {billingData.past_invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{inv.billing_month}</td>
                      <td className="py-3 px-4 text-slate-300">KES {Number(inv.gross_revenue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold text-white">KES {Number(inv.amount_due || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          inv.status === "paid"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : inv.status === "overdue"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 uppercase text-xs">{inv.payment_method || "-"}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs font-mono">{inv.payment_reference || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">
              No historical invoices recorded yet. Invoices are automatically calculated monthly at 3% of collected revenue.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}
