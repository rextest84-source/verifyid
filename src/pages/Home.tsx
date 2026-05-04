import { Link } from "react-router";
import { Shield, Eye, CreditCard, Mail, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-slate-950 to-slate-950" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-medium mb-6 border border-sky-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete in under 5 minutes
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Identity<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
              Verification
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Secure biometric verification using liveness detection, ID document scanning, and email confirmation — all in three quick steps.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/start">
              <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white px-8">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10 text-slate-100">
            3-Step Verification
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Quick, secure, and straightforward
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-sky-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Liveness Check</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Blink and nod to prove you are real
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-sky-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">ID Document</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Scan your ID card with auto-extraction
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-sky-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Email Confirm</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                One-click email verification to finish
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10 text-slate-100">
            How It Works
          </h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Enter Details", desc: "Fill in your name and email to begin." },
              { step: "2", title: "Complete Steps", desc: "Follow the 3 verification steps with your camera." },
              { step: "3", title: "Get Verified", desc: "Receive your identity confirmation instantly." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-medium text-slate-100 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4">
        <div className="max-w-xl mx-auto text-center rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-10">
          <Shield className="w-10 h-10 text-sky-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-100 mb-3">
            Ready to Verify?
          </h2>
          <p className="text-slate-400 mb-6">
            Complete your identity verification in minutes.
          </p>
          <Link to="/start">
            <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white px-8">
              Start Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
