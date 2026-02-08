import Link from "next/link";
import { ArrowRight, Globe, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <header className="px-6 lg:px-10 py-5 flex items-center justify-between bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            My Net
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-medium text-slate-600">
          <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
          <Link href="#about" className="hover:text-blue-600 transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden md:block px-5 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-tight">
              Manage Your ISP Network <br />
              <span className="text-blue-600">With Confidence</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Seamlessly integrate MikroTik and SmartOLT to control your fiber network.
              Automate billing, manage subscribers, and monitor devices in real-time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                View Demo
              </Link>
            </div>
          </div>

          {/* Abstract Background Decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50 rounded-full blur-3xl -z-10 opacity-60"></div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <FeatureCard
                icon={<Globe className="w-6 h-6 text-blue-600" />}
                title="Universal Connectivity"
                description="Connect any MikroTik router or SmartOLT device seamlessly."
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6 text-indigo-600" />}
                title="Secure & Reliable"
                description="Enterprise-grade security with regular backups and monitoring."
              />
              <FeatureCard
                icon={<Zap className="w-6 h-6 text-amber-500" />}
                title="Instant Activation"
                description="Automate subscriber provisioning and activation in seconds."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p>&copy; 2024 My Net ISP Solutions</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
