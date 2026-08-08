import Link from 'next/link';
import { GraduationCap, Shield, FileText, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2a4f7c] flex flex-col">
      <nav className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Teacher Welfare Panel</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end sm:gap-2">
          <Link href="/transparency" className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium text-blue-200 transition-colors hover:text-white">
            Transparency Board
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium text-blue-200 transition-colors hover:text-white sm:px-4">
            Sign In
          </Link>
          <Link href="/register" className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1e3a5f] transition-colors hover:bg-blue-50 sm:px-5">
            Register
          </Link>
        </div>
      </nav>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Shield className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-blue-200 text-xs font-medium">Secure · Confidential · Faculty Welfare</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Faculty Welfare and Issue Resolution Platform
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-blue-200 sm:mt-6 sm:text-lg">
            A dedicated channel for engineering university faculty to raise concerns, track resolutions,
            and connect with the welfare committee.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/register"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-semibold text-[#1e3a5f] shadow-lg shadow-black/20 transition-all hover:bg-blue-50 sm:px-7"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-base font-medium text-white transition-all hover:bg-white/10 sm:px-7"
            >
              Sign In
            </Link>
          </div>
        </div>
        <div className="mt-12 grid w-full max-w-5xl grid-cols-1 gap-4 sm:mt-16 sm:gap-6 md:mt-20 md:grid-cols-3">
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
