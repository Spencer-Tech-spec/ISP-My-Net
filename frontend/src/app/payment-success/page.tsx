import React from "react";
import PaymentSuccessCard from "@/components/PaymentSuccessCard";

export const metadata = {
    title: "Payment Successful | TechStore Pro",
    description: "Your payment has been processed successfully.",
};

export default function PaymentSuccessPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-lg">
                <PaymentSuccessCard />

                {/* Simple Footer for the Page */}
                <p className="mt-8 text-center text-slate-400 text-xs">
                    &copy; 2024 TechStore Pro. Secure payment processing.
                </p>
            </div>
        </main>
    );
}
