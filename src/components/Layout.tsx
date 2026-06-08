import { Shield, Menu, X, Sparkles, Mail } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLink = (path: string, label: string, alsoActive?: string[]) => {
    const active =
      isActive(path) || (alsoActive?.some((p) => isActive(p)) ?? false);
    return (
      <Link
        to={path}
        className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? "text-violet-300 bg-violet-500/15 border border-violet-500/25 shadow-sm shadow-violet-500/10"
            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
        }`}
        onClick={() => setMenuOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen ambient-bg text-slate-50 flex flex-col overflow-x-hidden w-full max-w-[100vw]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="mesh-orb w-48 h-48 sm:w-72 sm:h-72 bg-violet-500/10 top-0 right-0 translate-x-1/3 -translate-y-1/3" />
        <div className="mesh-orb w-56 h-56 sm:w-80 sm:h-80 bg-fuchsia-500/8 top-1/2 left-0 -translate-x-1/3 -translate-y-1/2" />
      </div>

      <header className="border-b border-slate-800/50 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 w-full">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between w-full min-w-0">
          <Link to="/" className="flex items-center gap-3 group min-w-0 shrink">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center border border-violet-500/20 group-hover:border-violet-500/40 transition-colors shrink-0">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-bold text-lg tracking-tight text-slate-100 truncate">
                Verify<span className="text-violet-400">ID</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase hidden sm:block">
                Secure verification
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {navLink("/", "Home")}
            {navLink("/dashboard", "Dashboard")}
            {navLink("/start", "Verify", ["/verify"])}
            {navLink("/compose", "Send Mail")}
          </nav>

          <Link
            to="/start"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-glow text-sm font-semibold shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start now
          </Link>

          <button
            className="md:hidden p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800/50 px-4 py-4 space-y-1.5 bg-slate-950/95 backdrop-blur-xl w-full">
            {navLink("/", "Home")}
            {navLink("/dashboard", "Dashboard")}
            {navLink("/start", "Verify", ["/verify"])}
            {navLink("/compose", "Send Mail")}
            <Link
              to="/start"
              className="block mt-3 text-center px-4 py-2.5 rounded-xl btn-glow text-sm font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              Start verification
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 relative w-full min-w-0 overflow-x-hidden">{children}</main>

      <footer className="border-t border-slate-800/50 py-8 text-center w-full">
        <p className="text-xs text-slate-500 px-4">
          VerifyID — Secure Identity Verification
        </p>
        <p className="text-[10px] text-slate-600 mt-1 px-4">
          Biometric liveness · ID scanning · Email confirmation
        </p>
        <Link
          to="/compose"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-violet-400 hover:text-violet-300"
        >
          <Mail className="w-3.5 h-3.5" />
          Compose & send email
        </Link>
      </footer>
    </div>
  );
}
