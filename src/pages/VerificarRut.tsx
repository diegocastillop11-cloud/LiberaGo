import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, cardBase, inputBase } from "../lib/ui";
import { isValidRut, formatRut } from "../lib/rut";

export default function VerificarRut() {
  const { profile, refreshProfile } = useAuth();
  const [rut, setRut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const alreadySet = !!profile?.rut;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!isValidRut(rut)) {
      setError("Ese RUT no parece válido. Revísalo e intenta de nuevo.");
      return;
    }

    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc("set_own_rut", { new_rut: formatRut(rut) });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSaved(true);
    await refreshProfile();
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader subtitle="RUT" />
      <main className="mx-auto max-w-[520px] px-6 py-10">
        <div className={cardBase}>
          <p className="font-display text-xl font-semibold text-ink">Tu RUT</p>
          <p className="mt-2 text-sm text-ink-muted">
            Lo pedimos para identificarte ante un eventual reclamo o disputa — no reemplaza la
            verificación con documento y selfie que hacen los trabajadores.
          </p>

          {error && (
            <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
          {saved && !error && (
            <div className="mt-4 rounded-sm border border-success bg-success/10 px-4 py-3 text-sm text-success">
              RUT guardado.
            </div>
          )}

          {alreadySet ? (
            <p className="mt-4 text-[15px] text-ink">
              {profile?.rut} — el RUT no se puede modificar una vez registrado.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <input
                type="text"
                className={inputBase}
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="12.345.678-9"
                required
              />
              <button type="submit" className={btnPrimary} disabled={submitting}>
                {submitting ? "Guardando…" : "Guardar RUT"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
