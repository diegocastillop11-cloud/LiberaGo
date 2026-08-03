import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { startIdentityVerification } from "../lib/identity";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, cardBase } from "../lib/ui";
import type { IdentityStatus } from "../lib/types";

const STATUS_LABELS: Record<IdentityStatus, string> = {
  none: "Sin verificar",
  pending: "En revisión",
  verified: "Verificada",
  declined: "Rechazada",
};

export default function VerificarIdentidad() {
  const { profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const justReturned = searchParams.get("done") === "1";

  // Al volver del flujo hosteado de Didit, el veredicto llega async via
  // webhook — refrescamos el perfil cada pocos segundos mientras siga
  // "pending" para que el usuario vea el resultado sin recargar a mano.
  useEffect(() => {
    if (!justReturned || profile?.identity_status !== "pending") return;
    const interval = setInterval(refreshProfile, 3000);
    return () => clearInterval(interval);
  }, [justReturned, profile?.identity_status, refreshProfile]);

  async function start() {
    setStarting(true);
    setError(null);
    const err = await startIdentityVerification();
    if (err) {
      setError(err);
      setStarting(false);
    }
  }

  const status = profile?.identity_status ?? "none";

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader subtitle="Verificación de identidad" />
      <main className="mx-auto max-w-[520px] px-6 py-10">
        <div className={cardBase}>
          <p className="font-display text-xl font-semibold text-ink">{STATUS_LABELS[status]}</p>

          {error && (
            <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {status === "verified" && (
            <p className="mt-3 text-sm text-ink-muted">
              Tu identidad ya está verificada. No necesitas hacer esto de nuevo.
            </p>
          )}

          {status === "pending" && (
            <p className="mt-3 text-sm text-ink-muted">
              {justReturned
                ? "Estamos confirmando tu verificación, esto puede tardar unos segundos…"
                : "Tu verificación está en revisión."}
            </p>
          )}

          {(status === "none" || status === "declined") && (
            <>
              <p className="mt-3 text-sm text-ink-muted">
                {status === "declined"
                  ? "Tu verificación anterior no se pudo confirmar. Puedes volver a intentarlo."
                  : "Necesitamos confirmar tu identidad con tu cédula y una selfie, antes de que puedas postular como trabajador o hacer una segunda solicitud como cliente."}
              </p>
              <button className={`${btnPrimary} mt-4`} onClick={start} disabled={starting}>
                {starting ? "Redirigiendo…" : "Verificar mi identidad"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
