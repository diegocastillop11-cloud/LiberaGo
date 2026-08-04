import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ServiceSuggestion } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { AdminNav } from "../components/AdminNav";
import { btnPrimary, btnDanger, cardBase } from "../lib/ui";

const STATUS_LABELS: Record<ServiceSuggestion["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export default function AdminSugerencias() {
  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("service_suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setSuggestions((data as ServiceSuggestion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(suggestion: ServiceSuggestion, decision: "approved" | "rejected") {
    const { error } = await supabase.rpc("review_service_suggestion", {
      target_id: suggestion.id,
      decision,
    });
    if (error) {
      setError(error.message);
      return;
    }
    load();
  }

  const pending = suggestions.filter((s) => s.status === "pending");
  const decided = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Sugerencias"
        maxWidth={900}
        actions={<AdminNav current="/admin/sugerencias" />}
      />

      <main className="mx-auto max-w-[900px] px-6 py-10">
        {error && (
          <div className="mb-6 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <h2 className="font-display text-xl font-semibold text-ink">Sugerencias pendientes</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Cargando…</p>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No hay sugerencias pendientes.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {pending.map((s) => (
              <div key={s.id} className={`${cardBase} flex items-center justify-between gap-4`}>
                <div>
                  <p className="font-semibold text-ink">{s.service_name}</p>
                  <p className="mt-1 text-sm text-ink-muted">{s.description}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {s.requester_name} — {s.requester_contact}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button className={btnPrimary} onClick={() => setStatus(s, "approved")}>
                    Aprobar
                  </button>
                  <button className={btnDanger} onClick={() => setStatus(s, "rejected")}>
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {decided.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl font-semibold text-ink">Historial</h2>
            <div className="mt-4 flex flex-col gap-3">
              {decided.map((s) => (
                <div key={s.id} className={`${cardBase} flex items-center justify-between gap-4`}>
                  <div>
                    <p className="font-semibold text-ink">{s.service_name}</p>
                    <p className="mt-1 text-sm text-ink-muted">{s.description}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {s.requester_name} — {s.requester_contact}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm text-ink-muted">{STATUS_LABELS[s.status]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
