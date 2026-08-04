import { useState } from "react";
import { supabase } from "../lib/supabase";
import { btnPrimary, cardBase } from "../lib/ui";

export function PostularTrabajador({ onApplied }: { onApplied: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function apply() {
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.rpc("request_worker_status");
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onApplied();
  }

  return (
    <div className={cardBase}>
      <p className="font-display text-xl font-semibold text-ink">¿Quieres trabajar con nosotros?</p>
      <p className="mt-1 text-sm text-ink-muted">
        Postula para hacer trámites, filas y mandados y ganar plata cuando quieras.
      </p>

      {error && (
        <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <button type="button" className={`${btnPrimary} mt-4`} onClick={apply} disabled={submitting}>
        {submitting ? "Enviando…" : "Postular como trabajador"}
      </button>
    </div>
  );
}
