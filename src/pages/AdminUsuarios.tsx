import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Profile, WorkerStatus } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { btnGhost, cardBase } from "../lib/ui";

const STATUS_LABELS: Record<WorkerStatus, string> = {
  none: "Sin postular",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export default function AdminUsuarios() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setProfiles((data as Profile[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Usuarios"
        maxWidth={900}
        actions={
          <>
            <Link to="/admin" className={btnGhost}>
              Servicios
            </Link>
            <Link to="/admin/trabajadores" className={btnGhost}>
              Trabajadores
            </Link>
            <Link to="/admin/solicitudes" className={btnGhost}>
              Solicitudes
            </Link>
            <Link to="/admin/sugerencias" className={btnGhost}>
              Sugerencias
            </Link>
            <Link to="/admin/finanzas" className={btnGhost}>
              Finanzas
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

        <h2 className="font-display text-xl font-semibold text-ink">Usuarios registrados</h2>

        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Cargando…</p>
        ) : profiles.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No hay usuarios registrados.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {profiles.map((p) => (
              <div key={p.id} className={cardBase}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {p.full_name ?? p.email}
                      {p.is_admin && (
                        <span className="ml-2 rounded-full bg-action/10 px-2 py-0.5 text-xs font-medium text-action">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{p.email}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">RUT: {p.rut ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Registrado el {new Date(p.created_at).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm text-ink-muted">
                    {STATUS_LABELS[p.worker_status]}
                  </span>
                </div>

                {p.deleted_at && (
                  <div className="mt-3 rounded-sm border border-error bg-error/10 px-3 py-2 text-sm text-error">
                    <p className="font-medium">
                      Cuenta eliminada el {new Date(p.deleted_at).toLocaleDateString("es-CL")}
                    </p>
                    <p className="mt-0.5">Motivo: {p.deletion_reason}</p>
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
