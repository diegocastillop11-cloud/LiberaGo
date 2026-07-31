import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Profile, WorkerStatus } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, btnGhost, btnDanger, cardBase } from "../lib/ui";

const STATUS_LABELS: Record<WorkerStatus, string> = {
  none: "Sin postular",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export default function AdminTrabajadores() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("worker_status", "none")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(profile: Profile, status: WorkerStatus) {
    const { error } = await supabase.rpc("set_worker_status", {
      target_user_id: profile.id,
      new_status: status,
    });
    if (error) {
      setError(error.message);
      return;
    }
    load();
  }

  const pending = profiles.filter((p) => p.worker_status === "pending");
  const decided = profiles.filter((p) => p.worker_status !== "pending");

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Trabajadores"
        maxWidth={900}
        actions={
          <>
            <Link to="/admin" className={btnGhost}>
              Servicios
            </Link>
            <Link to="/admin/solicitudes" className={btnGhost}>
              Solicitudes
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

        <h2 className="font-display text-xl font-semibold text-ink">Postulaciones pendientes</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Cargando…</p>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No hay postulaciones pendientes.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {pending.map((p) => (
              <div key={p.id} className={`${cardBase} flex items-center justify-between gap-4`}>
                <div>
                  <p className="font-semibold text-ink">{p.full_name ?? p.email}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{p.email}</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button className={btnPrimary} onClick={() => setStatus(p, "approved")}>
                    Aprobar
                  </button>
                  <button className={btnDanger} onClick={() => setStatus(p, "rejected")}>
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
              {decided.map((p) => (
                <div key={p.id} className={`${cardBase} flex items-center justify-between gap-4`}>
                  <div>
                    <p className="font-semibold text-ink">{p.full_name ?? p.email}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{p.email}</p>
                  </div>
                  <span className="flex-shrink-0 text-sm text-ink-muted">
                    {STATUS_LABELS[p.worker_status]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
