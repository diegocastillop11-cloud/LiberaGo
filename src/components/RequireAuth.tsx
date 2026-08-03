import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { AppHeader } from "./AppHeader";
import { btnPrimary } from "../lib/ui";

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-6 py-16 text-center">
        {children}
      </main>
    </div>
  );
}

export function RequireAuth({
  children,
  require,
}: {
  children: ReactNode;
  require?: "worker" | "admin";
}) {
  const { session, profile, loading, refreshProfile } = useAuth();

  if (loading) {
    return (
      <Screen>
        <p className="text-sm text-ink-muted">Cargando…</p>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <p className="font-display text-xl font-semibold text-ink">Necesitas iniciar sesión</p>
        <p className="text-sm text-ink-muted">Ingresa con tu correo o con Google para continuar.</p>
        <Link to="/login" className={btnPrimary}>
          Iniciar sesión
        </Link>
      </Screen>
    );
  }

  if (require === "admin" && !profile?.is_admin) {
    return (
      <Screen>
        <p className="font-display text-xl font-semibold text-ink">Sin acceso</p>
        <p className="text-sm text-ink-muted">Esta sección es solo para administradores.</p>
      </Screen>
    );
  }

  if (require === "worker" && !profile?.is_admin && profile?.worker_status !== "approved") {
    return (
      <Screen>
        <WorkerGate
          status={profile?.worker_status ?? "none"}
          identityVerified={profile?.identity_status === "verified"}
          hasAvatar={!!profile?.avatar_url}
          onApplied={refreshProfile}
        />
      </Screen>
    );
  }

  return <>{children}</>;
}

// Un admin no puede aprobar a alguien sin identidad verificada (ver
// set_worker_status en 0016_identity_verification.sql) — este CTA se
// muestra ademas del estado de la postulación, no en su lugar, porque
// ambos pasos (postular + verificar) son independientes y pueden hacerse
// en cualquier orden.
function IdentityCta() {
  return (
    <Link to="/verificacion" className={btnPrimary}>
      Verificar mi identidad
    </Link>
  );
}

// Un admin tampoco puede aprobar a alguien sin foto de perfil (ver
// set_worker_status en 0017_avatar_upload.sql) — mismo motivo que
// IdentityCta: pasos independientes, cualquier orden.
function AvatarCta() {
  return (
    <Link to="/perfil" className={btnPrimary}>
      Subir foto de perfil
    </Link>
  );
}

function WorkerGate({
  status,
  identityVerified,
  hasAvatar,
  onApplied,
}: {
  status: "none" | "pending" | "rejected";
  identityVerified: boolean;
  hasAvatar: boolean;
  onApplied: () => void;
}) {
  const pendingSteps = (
    <>
      {!identityVerified && (
        <>
          <p className="text-sm text-ink-muted">
            Un admin no puede aprobarte hasta que verifiques tu identidad.
          </p>
          <IdentityCta />
        </>
      )}
      {!hasAvatar && (
        <>
          <p className="text-sm text-ink-muted">
            Un admin no puede aprobarte hasta que subas una foto de perfil.
          </p>
          <AvatarCta />
        </>
      )}
    </>
  );

  if (status === "pending") {
    return (
      <>
        <p className="font-display text-xl font-semibold text-ink">Postulación en revisión</p>
        <p className="text-sm text-ink-muted">
          Ya pediste ser trabajador. Te avisamos apenas un admin la revise.
        </p>
        {pendingSteps}
      </>
    );
  }

  if (status === "rejected") {
    return (
      <>
        <p className="font-display text-xl font-semibold text-ink">Postulación rechazada</p>
        <p className="text-sm text-ink-muted">Puedes volver a postular si quieres.</p>
        <ApplyButton onApplied={onApplied} />
      </>
    );
  }

  return (
    <>
      <p className="font-display text-xl font-semibold text-ink">Todavía no eres trabajador</p>
      <p className="text-sm text-ink-muted">
        Postula y un admin revisa tu solicitud antes de darte acceso. También vas a necesitar
        verificar tu identidad y subir una foto de perfil antes de que te aprueben.
      </p>
      <ApplyButton onApplied={onApplied} />
      {pendingSteps}
    </>
  );
}

function ApplyButton({ onApplied }: { onApplied: () => void }) {
  async function apply() {
    const { error } = await supabase.rpc("request_worker_status");
    if (!error) onApplied();
  }

  return (
    <button className={btnPrimary} onClick={apply}>
      Postular como trabajador
    </button>
  );
}
