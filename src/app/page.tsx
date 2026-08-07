import Link from 'next/link';
import { GraduationCap, Shield, FileText, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] flex flex-col">
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Teacher Welfare Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/transparency" className="text-blue-200 hover:text-white text-sm font-medium transition-colors px-2 py-2">
            Transparency Board
          </Link>
          <Link href="/login" className="text-blue-200 hover:text-white text-sm font-medium transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/register" className="bg-white text-[#1e3a5f] hover:bg-blue-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            Register
          </Link>
        </div>
      </nav>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Shield className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-blue-200 text-xs font-medium">Secure · Confidential · Faculty Welfare</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Faculty Welfare and Issue Resolution Platform
          </h1>
          <p className="text-blue-200 text-lg mt-6 max-w-xl mx-auto leading-relaxed">
            A dedicated channel for engineering university faculty to raise concerns, track resolutions,
            and connect with the welfare committee.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-white text-[#1e3a5f] hover:bg-blue-50 font-semibold px-7 py-3 rounded-xl transition-all text-base shadow-lg shadow-black/20"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 font-medium px-7 py-3 rounded-xl transition-all text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full">
          {[
            { icon: FileText, title: 'Submit Issues', desc: 'Submit concerns, suggestions or questions with full categorization and priority levels.' },
            { icon: MessageSquare, title: 'Track Progress', desc: 'Monitor your issues in real time and receive admin replies.' },
            { icon: CheckCircle2, title: 'Assured Resolution', desc: 'Issues are escalated to authorities and tracked until fully resolved or closed.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/8 border border-white/15 rounded-xl p-6 text-left backdrop-blur-sm">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-300" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
              <p className="text-blue-200 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="text-center py-6 text-blue-300/60 text-xs border-t border-white/10">
        Teacher Welfare Panel - Engineering University
      </footer>
    </div>
  );
}
