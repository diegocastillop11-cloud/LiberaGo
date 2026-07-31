import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { RequestStatus, ServiceRequest } from "../lib/types";
import { DEMO_WORKER_NAME } from "../lib/demoUsers";
import { btnPrimary, cardBase } from "../lib/ui";

const NEXT_STATUS: Partial<Record<RequestStatus, RequestStatus>> = {
  asignado: "en_curso",
  en_curso: "completado",
};

const NEXT_LABEL: Partial<Record<RequestStatus, string>> = {
  asignado: "Marcar en curso",
  en_curso: "Marcar completado",
};

export default function TrabajadorDisponibles() {
  const [available, setAvailable] = useState<ServiceRequest[]>([]);
  const [mine, setMine] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [{ data: solicitadas }, { data: propias }] = await Promise.all([
      supabase.from("requests").select("*").eq("status", "solicitado").order("created_at"),
      supabase
        .from("requests")
        .select("*")
        .eq("worker_name", DEMO_WORKER_NAME)
        .in("status", ["asignado", "en_curso"])
        .order("created_at"),
    ]);
    setAvailable((solicitadas as ServiceRequest[]) ?? []);
    setMine((propias as ServiceRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("requests-trabajador")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => loadData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function accept(request: ServiceRequest) {
    const { error } = await supabase
      .from("requests")
      .update({ worker_name: DEMO_WORKER_NAME, status: "asignado" })
      .eq("id", request.id)
      .eq("status", "solicitado");
    if (error) setError(error.message);
  }

  async function advance(request: ServiceRequest) {
    const next = NEXT_STATUS[request.status];
    if (!next) return;
    const { error } = await supabase.from("requests").update({ status: next }).eq("id", request.id);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-[720px] items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold text-ink">
            LiberaGo
          </Link>
          <span className="text-sm text-ink-muted">Trabajador</span>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-10">
        {error && (
          <div className="mb-6 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {mine.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold text-ink">Tus trabajos</h2>
            <div className="mt-4 flex flex-col gap-3">
              {mine.map((r) => (
                <div key={r.id} className={cardBase}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{r.service_name}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {r.locations.map((l) => l.address).join(" · ")}
                      </p>
                    </div>
                    <span className="flex-shrink-0 font-data text-sm font-medium text-ink">
                      ${r.price.toLocaleString("es-CL")}
                    </span>
                  </div>
                  {NEXT_LABEL[r.status] && (
                    <button className={`${btnPrimary} mt-4`} onClick={() => advance(r)}>
                      {NEXT_LABEL[r.status]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Solicitudes disponibles</h2>
          {loading ? (
            <p className="mt-4 text-sm text-ink-muted">Cargando…</p>
          ) : available.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No hay solicitudes disponibles ahora.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {available.map((r) => (
                <div key={r.id} className={cardBase}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{r.service_name}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {r.locations.map((l) => `${l.label}: ${l.address}`).join(" · ")}
                      </p>
                      {r.notes && <p className="mt-1 text-xs text-ink-muted">"{r.notes}"</p>}
                    </div>
                    <span className="flex-shrink-0 font-data text-sm font-medium text-ink">
                      ${r.price.toLocaleString("es-CL")}
                    </span>
                  </div>
                  <div className="mt-4">
                    <button className={btnPrimary} onClick={() => accept(r)}>
                      Aceptar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
