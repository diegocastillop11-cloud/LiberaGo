import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { isValidRut, formatRut } from "../lib/rut";
import type { Profile } from "../lib/types";
import { AppHeader } from "./AppHeader";
import { btnPrimary, inputBase } from "../lib/ui";

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
  const { session, profile, loading, refreshProfile, signOut } = useAuth();
  const [accountDeleted, setAccountDeleted] = useState(false);

  useEffect(() => {
    if (profile?.deleted_at && !accountDeleted) {
      setAccountDeleted(true);
      signOut();
    }
  }, [profile?.deleted_at, accountDeleted, signOut]);

  if (loading) {
    return (
      <Screen>
        <p className="text-sm text-ink-muted">Cargando…</p>
      </Screen>
    );
  }

  if (accountDeleted) {
    return (
      <Screen>
        <p className="font-display text-xl font-semibold text-ink">Cuenta eliminada</p>
        <p className="text-sm text-ink-muted">Esta cuenta fue eliminada y ya no se puede usar.</p>
        <Link to="/" className={btnPrimary}>
          Volver al inicio
        </Link>
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

  // Nombre, RUT y aceptación de T&C se piden apenas hay sesión, sin importar
  // el método de login — "cliente" no es un rol exclusivo (CLAUDE.md), así
  // que no hay una cuenta que se libre de estos datos. El checkbox del
  // formulario de registro (Login.tsx) no alcanza por sí solo porque Google
  // OAuth no distingue "registrarme" de "ingresar" (ver
  // 0018_terms_acceptance.sql / 0020_full_name_rpc.sql).
  if (profile && (!profile.terms_accepted_at || !profile.full_name || !profile.rut)) {
    return (
      <Screen>
        <OnboardingGate profile={profile} onDone={refreshProfile} />
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

function OnboardingGate({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const needsName = !profile.full_name;
  const needsRut = !profile.rut;
  const needsTerms = !profile.terms_accepted_at;

  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    (!needsName || name.trim().length > 0) &&
    (!needsRut || isValidRut(rut)) &&
    (!needsTerms || checked);

  async function submit() {
    setError(null);
    if (needsRut && !isValidRut(rut)) {
      setError("Ese RUT no parece válido. Revísalo e intenta de nuevo.");
      return;
    }

    setSubmitting(true);

    if (needsName) {
      const { error: err } = await supabase.rpc("set_own_full_name", { new_name: name.trim() });
      if (err) {
        setError(err.message);
        setSubmitting(false);
        return;
      }
    }

    if (needsRut) {
      const { error: err } = await supabase.rpc("set_own_rut", { new_rut: formatRut(rut) });
      if (err) {
        setError(err.message);
        setSubmitting(false);
        return;
      }
    }

    if (needsTerms) {
      const { error: err } = await supabase.rpc("accept_terms");
      if (err) {
        setError(err.message);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    onDone();
  }

  return (
    <>
      <p className="font-display text-xl font-semibold text-ink">Antes de seguir</p>
      <p className="text-sm text-ink-muted">
        Necesitamos algunos datos básicos para que puedas usar LiberaGo.
      </p>

      {error && (
        <div className="w-full rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex w-full flex-col gap-3 text-left">
        {needsName && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onboardingName" className="text-sm font-medium text-ink-muted">
              Nombre completo
            </label>
            <input
              id="onboardingName"
              type="text"
              className={inputBase}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        {needsRut && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onboardingRut" className="text-sm font-medium text-ink-muted">
              RUT
            </label>
            <input
              id="onboardingRut"
              type="text"
              className={inputBase}
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12.345.678-9"
              required
            />
          </div>
        )}

        {needsTerms && (
          <label className="flex items-start gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border-line accent-action"
            />
            <span>
              He leído y acepto los{" "}
              <Link to="/terminos" target="_blank" className="text-action underline-offset-4 hover:underline">
                Términos y Condiciones
              </Link>
              .
            </span>
          </label>
        )}
      </div>

      <button className={btnPrimary} onClick={submit} disabled={!canSubmit || submitting}>
        {submitting ? "Guardando…" : "Continuar"}
      </button>
    </>
  );
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
