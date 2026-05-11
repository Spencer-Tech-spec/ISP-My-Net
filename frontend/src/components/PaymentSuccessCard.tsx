"use client";

import React from "react";
import { CheckCircle2, Mail, ArrowLeft, CreditCard, Calendar, ShoppingBag, Hash } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TransactionDetailProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
}

const TransactionDetail = ({ label, value, icon }: TransactionDetailProps) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-2 text-slate-500">
            {icon && <span className="text-slate-400">{icon}</span>}
            <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
);

export default function PaymentSuccessCard() {
    return (
        <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
            {/* Header Section */}
            <div className="pt-10 pb-6 px-8 text-center bg-white">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6 relative">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20 duration-1000"></div>
                    <CheckCircle2 className="w-12 h-12 text-green-500 relative z-10" />
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                    Payment Successful!
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                    Your payment has been processed successfully. You will receive a confirmation email shortly.
                </p>
            </div>

            {/* Transaction Details */}
            <div className="px-8 py-6 bg-white">
                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                    <TransactionDetail
                        label="Amount"
                        value={<span className="text-lg text-blue-600">$149.99</span>}
                        icon={<ShoppingBag className="w-4 h-4" />}
                    />
                    <TransactionDetail
                        label="Transaction ID"
                        value={
                            <span className="bg-white px-2 py-1 rounded-md border border-slate-200 text-xs font-mono text-slate-600">
                                TXN-789123456
                            </span>
                        }
                        icon={<Hash className="w-4 h-4" />}
                    />
                    <TransactionDetail
                        label="Payment Method"
                        value="**** 4242"
                        icon={<CreditCard className="w-4 h-4" />}
                    />
                    <TransactionDetail
                        label="Date"
                        value="Dec 15, 2024"
                        icon={<Calendar className="w-4 h-4" />}
                    />
                    <TransactionDetail
                        label="Merchant"
                        value="TechStore Pro"
                    />
                </div>
            </div>

            {/* Receipt Info Box */}
            <div className="px-8 pb-8">
                <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-700 font-medium mb-0.5">Receipt Notification</p>
                        <p className="text-sm text-blue-600/80 leading-snug">
                            Receipt sent to <span className="font-semibold text-blue-700">customer@example.com</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="px-8 pb-10">
                <Link
                    href="/"
                    className="group flex items-center justify-center gap-2 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                    <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    Return to Store
                </Link>
            </div>
        </div>
    );
}
