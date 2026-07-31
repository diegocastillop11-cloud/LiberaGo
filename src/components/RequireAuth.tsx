import type { ReactNode } from "react";
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
  const { session, profile, loading, signInWithGoogle, refreshProfile } = useAuth();

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
        <p className="text-sm text-ink-muted">Usa tu cuenta de Google para continuar.</p>
        <button className={btnPrimary} onClick={signInWithGoogle}>
          Continuar con Google
        </button>
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
        <WorkerGate status={profile?.worker_status ?? "none"} onApplied={refreshProfile} />
      </Screen>
    );
  }

  return <>{children}</>;
}

function WorkerGate({
  status,
  onApplied,
}: {
  status: "none" | "pending" | "rejected";
  onApplied: () => void;
}) {
  if (status === "pending") {
    return (
      <>
        <p className="font-display text-xl font-semibold text-ink">Postulación en revisión</p>
        <p className="text-sm text-ink-muted">
          Ya pediste ser trabajador. Te avisamos apenas un admin la revise.
        </p>
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
        Postula y un admin revisa tu solicitud antes de darte acceso.
      </p>
      <ApplyButton onApplied={onApplied} />
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
