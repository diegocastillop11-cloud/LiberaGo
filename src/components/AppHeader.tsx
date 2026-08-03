import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { UserBadge } from "./UserBadge";
import { Logo } from "./Logo";
import { btnGhost } from "../lib/ui";

export function AppHeader({
  subtitle,
  actions,
  maxWidth = 720,
}: {
  subtitle?: string;
  actions?: ReactNode;
  maxWidth?: number;
}) {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-line px-6 py-4">
      <div className="mx-auto flex items-center justify-between" style={{ maxWidth }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`${btnGhost} !px-2.5`}
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            ←
          </button>
          <Logo className="h-9" />
          {subtitle && <span className="text-sm text-ink-muted">{subtitle}</span>}
        </div>

        <div className="flex items-center gap-3">
          {actions}
          {session ? (
            <div className="flex items-center gap-3">
              <UserBadge profile={profile} />
              <button className={btnGhost} onClick={signOut}>
                Salir
              </button>
            </div>
          ) : (
            <Link to="/login" className={btnGhost}>
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
