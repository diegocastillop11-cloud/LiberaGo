import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Profile, RequestStatus, ServiceRequest } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { btnDanger, btnGhost, cardBase, inputBase } from "../lib/ui";

const STATUS_LABELS: Record<RequestStatus, string> = {
  solicitado: "Solicitado",
  asignado: "Asignado",
  en_curso: "En curso",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_PILL: Record<RequestStatus, string> = {
  solicitado: "bg-confirmed/15 text-confirmed-ink",
  asignado: "bg-action/15 text-action-ink",
  en_curso: "bg-action/15 text-action-ink",
  completado: "bg-success/15 text-success",
  cancelado: "bg-error/15 text-error",
};

const FILTERS: Array<{ key: "todas" | RequestStatus; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "solicitado", label: "Solicitado" },
  { key: "asignado", label: "Asignado" },
  { key: "en_curso", label: "En curso" },
  { key: "completado", label: "Completado" },
  { key: "cancelado", label: "Cancelado" },
];

export default function AdminSolicitudes() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todas" | RequestStatus>("todas");

  async function load() {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRequests((data as ServiceRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("requests-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("worker_status", "approved")
      .order("full_name")
      .then(({ data }) => setWorkers((data as Profile[]) ?? []));
  }, []);

  async function cancelRequest(r: ServiceRequest) {
    if (!window.confirm(`¿Cancelar la solicitud de "${r.client_name}"? No se puede deshacer.`)) return;
    const { error } = await supabase.from("requests").update({ status: "cancelado" }).eq("id", r.id);
    if (error) setError(error.message);
  }

  async function reassign(r: ServiceRequest, workerId: string) {
    if (!workerId) {
      const { error } = await supabase
        .from("requests")
        .update({ worker_id: null, worker_name: null, status: "solicitado" })
        .eq("id", r.id);
      if (error) setError(error.message);
      return;
    }
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;
    const { error } = await supabase
      .from("requests")
      .update({
        worker_id: worker.id,
        worker_name: worker.full_name ?? worker.email,
        status: r.status === "solicitado" ? "asignado" : r.status,
      })
      .eq("id", r.id);
    if (error) setError(error.message);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  const filtered = filter === "todas" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Solicitudes"
        maxWidth={900}
        actions={
          <>
            <Link to="/admin" className={btnGhost}>
              Servicios
            </Link>
            <Link to="/admin/trabajadores" className={btnGhost}>
              Trabajadores
            </Link>
          </>
        }
      />

      <main className="mx-auto max-w-[900px] px-6 py-10">
        {error && (
          <div className="mb-6 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-action text-on-action"
                  : "bg-surface-2 text-ink-muted hover:text-ink"
              }`}
            >
              {f.label}
              {counts[f.key] ? ` (${counts[f.key]})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-ink-muted">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">No hay solicitudes en este filtro.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {filtered.map((r) => (
              <div key={r.id} className={cardBase}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{r.service_name}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {new Date(r.created_at).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                    <span className="font-data text-sm font-medium text-ink">
                      ${r.price.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
                  <span>
                    Cliente: <span className="text-ink">{r.client_name}</span>
                  </span>
                  <span>
                    Trabajador:{" "}
                    <span className="text-ink">{r.worker_name ?? "Sin asignar"}</span>
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-muted">
                  {r.locations.length > 0
                    ? r.locations.map((l) => `${l.label}: ${l.address}`).join(" · ")
                    : "Servicio remoto (sin dirección)"}
                </p>

                {r.notes && <p className="mt-1 text-xs text-ink-muted">"{r.notes}"</p>}

                {r.status !== "completado" && r.status !== "cancelado" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <label htmlFor={`worker-${r.id}`} className="text-xs font-medium text-ink-muted">
                      Reasignar a
                    </label>
                    <select
                      id={`worker-${r.id}`}
                      className={`${inputBase} !w-auto`}
                      value={r.worker_id ?? ""}
                      onChange={(e) => reassign(r, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.full_name ?? w.email}
                        </option>
                      ))}
                    </select>
                    <button className={`${btnDanger} !min-h-0 !px-3 !py-1.5 !text-xs`} onClick={() => cancelRequest(r)}>
                      Cancelar solicitud
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
