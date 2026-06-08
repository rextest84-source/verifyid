import { Shield, Menu, X, Sparkles } from "lucide-react";
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
    <div className="min-h-screen ambient-bg text-slate-50 flex flex-col">
      <div className="mesh-orb w-72 h-72 bg-violet-500/10 -top-24 -right-24 fixed" />
      <div className="mesh-orb w-96 h-96 bg-fuchsia-500/8 top-1/2 -left-48 fixed" />

      <header className="border-b border-slate-800/50 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center border border-violet-500/20 group-hover:border-violet-500/40 transition-colors">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg tracking-tight text-slate-100">
                Verify<span className="text-violet-400">ID</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Secure verification
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {navLink("/", "Home")}
            {navLink("/dashboard", "Dashboard")}
            {navLink("/start", "Verify", ["/verify"])}
          </nav>

          <Link
            to="/start"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-glow text-sm font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start now
          </Link>

          <button
            className="md:hidden p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800/50 px-4 py-4 space-y-1.5 bg-slate-950/95 backdrop-blur-xl">
            {navLink("/", "Home")}
            {navLink("/dashboard", "Dashboard")}
            {navLink("/start", "Verify", ["/verify"])}
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

      <main className="flex-1 relative">{children}</main>

      <footer className="border-t border-slate-800/50 py-8 text-center">
        <p className="text-xs text-slate-500">
          VerifyID — Secure Identity Verification
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Biometric liveness · ID scanning · Email confirmation
        </p>
      </footer>
    </div>
  );
}
