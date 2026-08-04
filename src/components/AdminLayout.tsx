import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Logo } from "./Logo";
import { UserBadge } from "./UserBadge";
import { btnGhost, navLink } from "../lib/ui";

const MODULES = [
  { path: "/admin", label: "Servicios" },
  { path: "/admin/trabajadores", label: "Trabajadores" },
  { path: "/admin/solicitudes", label: "Solicitudes" },
  { path: "/admin/usuarios", label: "Usuarios" },
  { path: "/admin/sugerencias", label: "Sugerencias" },
  { path: "/admin/finanzas", label: "Finanzas" },
];

export function AdminLayout({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const { session, profile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-line bg-surface p-4">
        <Link to="/" className="mb-6 block px-2">
          <Logo className="h-9" />
        </Link>

        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Administración
        </p>
        <nav className="flex flex-col gap-1">
          {MODULES.map((m) => {
            const active = pathname === m.path;
            return (
              <Link
                key={m.path}
                to={m.path}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? "bg-action text-on-action" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>

        <Link to="/" className={`${navLink} mt-auto`}>
          ← Salir del panel
        </Link>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <span className="text-sm text-ink-muted">{subtitle}</span>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <UserBadge profile={profile} />
                <button className={btnGhost} onClick={signOut}>
                  Salir
                </button>
              </>
            ) : (
              <Link to="/login" className={btnGhost}>
                Iniciar sesión
              </Link>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
