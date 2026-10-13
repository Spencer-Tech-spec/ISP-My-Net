import Link from "next/link";
import { Zap, Lock } from "lucide-react";

export const metadata = { title: "Privacy Policy — ISP Cloud", description: "How ISP Cloud collects, uses, and protects your data." };

export default function PrivacyPage() {
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
        <span className="text-slate-400 text-sm">Privacy Policy</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Lock className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-4xl font-black">Privacy Policy</h1>
            <p className="text-slate-500 text-sm mt-1">Last updated: June 2026 · Kenya Data Protection Act, 2019</p>
          </div>
        </div>

        <div className="space-y-8 text-slate-400 leading-relaxed">

          <Section title="1. Who We Are">
            ISP Cloud is a SaaS platform operated in Kenya that provides management tools for Internet Service Providers. We act as a <strong className="text-white">Data Processor</strong> on behalf of ISP Operators (our customers), who are the <strong className="text-white">Data Controllers</strong> for their end-customers&apos; data.
          </Section>

          <Section title="2. Data We Collect">
            <div className="space-y-4">
              <SubSection title="ISP Operator Data (You)">
                When you register, we collect: company name, owner name, email address, phone number, county, and payment records (M-Pesa receipt numbers). We do not store your M-Pesa PIN.
              </SubSection>
              <SubSection title="End-Customer Data (Your Customers)">
                Through the Platform, you upload and manage your customers&apos; data including: names, phone numbers, location data, subscription packages, and payment history. You are responsible for ensuring lawful collection of this data.
              </SubSection>
              <SubSection title="Technical Data">
                We automatically collect: IP addresses, browser type, device information, login timestamps, and API usage logs for security and performance monitoring.
              </SubSection>
            </div>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and operate the ISP Cloud platform.</li>
              <li>To process subscription payments via M-Pesa.</li>
              <li>To send account notifications (subscription expiry, payment confirmations).</li>
              <li>To improve platform performance and features.</li>
              <li>To comply with legal obligations under Kenyan law.</li>
            </ul>
            <p className="mt-3">We <strong className="text-white">do not</strong> sell, rent, or trade your data to third parties for marketing purposes.</p>
          </Section>

          <Section title="4. Data Storage & Security">
            <ul className="list-disc pl-5 space-y-2">
              <li>All data is stored on <strong className="text-white">Supabase</strong> (PostgreSQL), hosted in secure cloud infrastructure.</li>
              <li>Data is encrypted at rest and in transit (TLS 1.3).</li>
              <li>Each ISP&apos;s data is logically isolated — ISP A cannot access ISP B&apos;s data (Row-Level Security).</li>
              <li>We perform daily automated database backups retained for 30 days.</li>
              <li>Access to production data is restricted to authorised personnel only.</li>
            </ul>
          </Section>

          <Section title="5. Multi-Tenancy & Data Isolation">
            ISP Cloud is a multi-tenant platform. Your data is tagged with a unique <code className="text-blue-300 bg-white/5 px-1.5 py-0.5 rounded text-xs">isp_id</code> and protected by PostgreSQL Row-Level Security policies. No ISP operator can view another&apos;s customers, staff, or payment records.
          </Section>

          <Section title="6. Your Rights (Kenya Data Protection Act, 2019)">
            Under the Kenya Data Protection Act, you have the right to:
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong className="text-white">Access</strong> — Request a copy of all data we hold about you.</li>
              <li><strong className="text-white">Rectification</strong> — Correct inaccurate personal data.</li>
              <li><strong className="text-white">Erasure</strong> — Request deletion of your data (subject to legal retention requirements).</li>
              <li><strong className="text-white">Portability</strong> — Export your data in CSV/JSON format at any time.</li>
              <li><strong className="text-white">Objection</strong> — Object to specific processing activities.</li>
            </ul>
            To exercise any right, email <a href="mailto:admin@ispcloud.co.ke" className="text-blue-400 hover:underline">admin@ispcloud.co.ke</a>.
          </Section>

          <Section title="7. Data Retention">
            <ul className="list-disc pl-5 space-y-2">
              <li>Active account data is retained for the duration of your subscription.</li>
              <li>After account cancellation, data is retained for <strong className="text-white">90 days</strong> then permanently deleted.</li>
              <li>Payment records are retained for <strong className="text-white">7 years</strong> for legal/financial compliance.</li>
            </ul>
          </Section>

          <Section title="8. Third-Party Services">
            We use the following processors:
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white font-semibold">Service</th>
                    <th className="text-left py-2 pr-4 text-white font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Supabase", "Database & authentication"],
                    ["Safaricom M-Pesa Daraja", "Payment processing"],
                    ["OpenAI", "AI support assistant (Standard & Enterprise plans)"],
                    ["Vercel", "Frontend hosting"],
                    ["Render", "Backend API hosting"],
                  ].map(([svc, purpose]) => (
                    <tr key={svc}>
                      <td className="py-2.5 pr-4 text-white">{svc}</td>
                      <td className="py-2.5 text-slate-400">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="9. Cookies">
            We use essential cookies only (session management, authentication). We do not use tracking or advertising cookies. You can disable cookies in your browser settings, though this may affect Platform functionality.
          </Section>

          <Section title="10. Changes to This Policy">
            We may update this Privacy Policy. We will notify you via email or in-app notification at least 14 days before major changes take effect.
          </Section>

          <Section title="11. Contact & Data Protection Officer">
            <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm space-y-1.5">
              <div>📧 <a href="mailto:admin@ispcloud.co.ke" className="text-blue-400">admin@ispcloud.co.ke</a></div>
              <div>💬 <a href="https://wa.me/254700000000" className="text-blue-400">WhatsApp: +254 700 000 000</a></div>
              <div>🏢 Nairobi, Kenya</div>
            </div>
          </Section>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} ISP Cloud · <Link href="/terms" className="hover:text-white">Terms of Service</Link>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pl-4 border-l-2 border-indigo-500/30">
      <div className="font-semibold text-white text-sm mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
