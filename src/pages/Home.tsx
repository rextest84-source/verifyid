import { Link } from "react-router";
import {
  Shield,
  Eye,
  CreditCard,
  Mail,
  ChevronRight,
  CheckCircle2,
  Zap,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Eye,
    title: "Liveness Check",
    desc: "Guided blink, turn, and hold — real-time anti-spoof with on-screen arrows",
    accent: "from-sky-500/20 to-cyan-500/5",
  },
  {
    icon: CreditCard,
    title: "ID Document",
    desc: "Scan your ID with smart framing and instant field extraction",
    accent: "from-cyan-500/20 to-teal-500/5",
  },
  {
    icon: Mail,
    title: "Email Confirm",
    desc: "One-click confirmation to complete your verification securely",
    accent: "from-emerald-500/20 to-green-500/5",
  },
] as const;

const STEPS = [
  { step: "1", title: "Enter Details", desc: "Name and email — takes 30 seconds." },
  { step: "2", title: "Complete Steps", desc: "Camera-guided liveness, then ID upload." },
  { step: "3", title: "Get Verified", desc: "Instant submission with email confirmation." },
] as const;

export default function Home() {
  return (
    <div className="space-y-24 pb-24">
      <section className="relative overflow-hidden px-4 pt-20 pb-12">
        <div className="mesh-orb w-[500px] h-[500px] bg-sky-500/12 top-0 left-1/2 -translate-x-1/2" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-300 text-xs font-semibold mb-8 border border-sky-500/25 shadow-sm shadow-sky-500/10">
            <Sparkles className="w-3.5 h-3.5" />
            Complete in under 5 minutes
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Identity
            <br />
            <span className="gradient-text">Verification</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Premium biometric verification with guided liveness, ID scanning, and
            email confirmation — all in three polished steps.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/start">
              <Button size="lg" className="btn-glow px-10 h-12 text-base font-semibold">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              Real-time liveness
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Encrypted & secure
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Mobile optimized
            </span>
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-3">
              3-Step Verification
            </h2>
            <p className="text-slate-400">Quick, secure, and beautifully guided</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card-hover p-6 relative overflow-hidden group"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center mb-4 border border-sky-500/20">
                    <f.icon className="w-6 h-6 text-sky-400" />
                  </div>
                  <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-slate-100">
            How It Works
          </h2>
          <div className="space-y-4">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="glass-card flex items-start gap-4 p-5 hover:border-slate-700/80 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center text-sky-300 font-bold shrink-0 border border-sky-500/25">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="max-w-xl mx-auto text-center glass-card p-10 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px shimmer-border" />
          <Shield className="w-12 h-12 text-sky-400 mx-auto mb-5 animate-float" />
          <h2 className="text-xl font-bold text-slate-100 mb-3">Ready to Verify?</h2>
          <p className="text-slate-400 mb-7 leading-relaxed">
            Complete your identity verification in minutes with our guided camera
            experience.
          </p>
          <Link to="/start">
            <Button size="lg" className="btn-glow px-10 font-semibold">
              Start Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
