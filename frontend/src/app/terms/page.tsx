import Link from "next/link";
import { Zap, Shield } from "lucide-react";

export const metadata = { title: "Terms of Service — ISP Cloud", description: "ISP Cloud platform terms of service." };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#060918] text-white">
      <nav className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-300">ISP Cloud</span>
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 text-sm">Terms of Service</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-4xl font-black">Terms of Service</h1>
            <p className="text-slate-500 text-sm mt-1">Last updated: June 2026</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">

          <Section title="1. Acceptance of Terms">
            By registering for or using ISP Cloud (&ldquo;the Platform&rdquo;), you (&ldquo;ISP Operator&rdquo; or &ldquo;you&rdquo;) agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
          </Section>

          <Section title="2. Description of Service">
            ISP Cloud is a Software-as-a-Service (SaaS) platform that provides Internet Service Providers (ISPs) with tools for customer management, billing automation (including M-Pesa integration), network equipment control (MikroTik / SmartOLT), staff management, payroll processing, and AI-powered support.
          </Section>

          <Section title="3. Subscription Plans & Billing">
            <ul className="list-disc pl-5 space-y-2">
              <li>All new accounts begin with a <strong>14-day free trial</strong> with no payment required.</li>
              <li>After the trial, continued use requires a paid subscription (Starter, Standard, or Enterprise).</li>
              <li>Subscription payments are processed via <strong>M-Pesa STK Push</strong>. It is your responsibility to ensure funds are available.</li>
              <li>Subscriptions are billed monthly. There are no refunds for partial months.</li>
              <li>ISP Cloud reserves the right to change pricing with 30 days&apos; notice.</li>
              <li>Failure to pay within 7 days of expiry will result in account suspension. Data is retained for 90 days after suspension.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            You agree not to:
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Use the Platform for any unlawful purpose or in violation of Kenyan law.</li>
              <li>Attempt to gain unauthorized access to other tenants&apos; data.</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Platform.</li>
              <li>Resell or sublicense access to the Platform without written permission.</li>
              <li>Upload malicious code, viruses, or harmful content.</li>
            </ul>
          </Section>

          <Section title="5. Data Ownership & Privacy">
            <ul className="list-disc pl-5 space-y-2">
              <li>You own all data you upload to the Platform (customer records, payment data, etc.).</li>
              <li>ISP Cloud acts as a <strong>Data Processor</strong> on your behalf under the Kenya Data Protection Act, 2019.</li>
              <li>You are the <strong>Data Controller</strong> and are responsible for obtaining consent from your customers to collect and process their personal data.</li>
              <li>We do not sell your data to third parties.</li>
              <li>See our <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link> for full details.</li>
            </ul>
          </Section>

          <Section title="6. Service Availability">
            We target 99.5% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated 24 hours in advance. ISP Cloud is not liable for downtime caused by Supabase, M-Pesa Daraja API, or third-party services.
          </Section>

          <Section title="7. Limitation of Liability">
            ISP Cloud&apos;s total liability to you for any claim shall not exceed the amount you paid in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages including loss of revenue or customer data.
          </Section>

          <Section title="8. Termination">
            You may cancel your account at any time from your billing settings. ISP Cloud may terminate your account if you violate these Terms. Upon termination, you may export your data within 30 days before it is permanently deleted.
          </Section>

          <Section title="9. Governing Law">
            These Terms are governed by the laws of the Republic of Kenya. Any disputes shall be resolved in the courts of Nairobi, Kenya.
          </Section>

          <Section title="10. Contact">
            For questions about these Terms, contact us:
            <div className="mt-3 p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm">
              <div>📧 Email: <a href="mailto:admin@ispcloud.co.ke" className="text-blue-400">admin@ispcloud.co.ke</a></div>
              <div className="mt-1">💬 WhatsApp: <a href="https://wa.me/254700000000" className="text-blue-400">+254 700 000 000</a></div>
            </div>
          </Section>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} ISP Cloud · <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <div className="text-slate-400">{children}</div>
    </div>
  );
}
