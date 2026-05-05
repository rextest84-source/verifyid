import { Shield, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-100">
              Verify<span className="text-sky-400">ID</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive("/")
                  ? "text-sky-400 bg-sky-500/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              }`}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard")
                  ? "text-sky-400 bg-sky-500/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/start"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive("/start") || isActive("/verify")
                  ? "text-sky-400 bg-sky-500/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              }`}
            >
              Verify
            </Link>
          </nav>

          <button
            className="md:hidden p-2 text-slate-400 hover:text-slate-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800/60 px-4 py-3 space-y-1 bg-slate-900/90">
            <Link
              to="/"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/start"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50"
              onClick={() => setMenuOpen(false)}
            >
              Verify
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        VerifyID — Secure Identity Verification
      </footer>
    </div>
  );
}
