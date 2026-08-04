import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { Profile, WorkerStatus } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { AdminNav } from "../components/AdminNav";
import { btnDanger, btnGhost, cardBase } from "../lib/ui";

const STATUS_LABELS: Record<WorkerStatus, string> = {
  none: "Sin postular",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export default function AdminUsuarios() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleBlock(p: Profile) {
    setError(null);
    const willBlock = !p.blocked_at;

    let reason: string | null = null;
    if (willBlock) {
      reason = window.prompt(`¿Por qué bloqueas a "${p.full_name ?? p.email}"?`, "");
      if (reason === null) return;
    } else if (!window.confirm(`¿Desbloquear a "${p.full_name ?? p.email}"?`)) {
      return;
    }

    setBusyId(p.id);
    const { error: err } = await supabase.rpc("admin_set_blocked", {
      target_user_id: p.id,
      blocked: willBlock,
      reason,
    });
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  async function deleteAccount(p: Profile) {
    setError(null);
    const reason = window.prompt(`Motivo para eliminar la cuenta de "${p.full_name ?? p.email}":`, "");
    if (reason === null) return;
    if (reason.trim().length === 0) {
      setError("Indica un motivo para eliminar la cuenta.");
      return;
    }
    if (!window.confirm(`¿Eliminar definitivamente la cuenta de "${p.full_name ?? p.email}"?`)) return;

    setBusyId(p.id);
    const { error: err } = await supabase.rpc("admin_delete_account", {
      target_user_id: p.id,
      reason,
    });
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Usuarios"
        maxWidth={900}
        actions={<AdminNav current="/admin/usuarios" />}
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
            {profiles.map((p) => {
              const isSelf = p.id === user?.id;
              return (
                <div key={p.id} className={cardBase}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
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

                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="text-sm text-ink-muted">{STATUS_LABELS[p.worker_status]}</span>
                      {!isSelf && !p.deleted_at && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => toggleBlock(p)}
                            disabled={busyId === p.id}
                          >
                            {p.blocked_at ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() => deleteAccount(p)}
                            disabled={busyId === p.id}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {p.blocked_at && (
                    <div className="mt-3 rounded-sm border border-error bg-error/10 px-3 py-2 text-sm text-error">
                      <p className="font-medium">
                        Cuenta bloqueada el {new Date(p.blocked_at).toLocaleDateString("es-CL")}
                      </p>
                      {p.blocked_reason && <p className="mt-0.5">Motivo: {p.blocked_reason}</p>}
                    </div>
                  )}

                  {p.deleted_at && (
                    <div className="mt-3 rounded-sm border border-error bg-error/10 px-3 py-2 text-sm text-error">
                      <p className="font-medium">
                        Cuenta eliminada el {new Date(p.deleted_at).toLocaleDateString("es-CL")}
                      </p>
                      <p className="mt-0.5">Motivo: {p.deletion_reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
