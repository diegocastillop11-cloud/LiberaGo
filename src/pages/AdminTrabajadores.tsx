import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { IdentityStatus, Profile, WorkerLead, WorkerStatus } from "../lib/types";
import { AdminLayout } from "../components/AdminLayout";
import { btnPrimary, btnGhost, btnDanger, cardBase } from "../lib/ui";

const STATUS_LABELS: Record<WorkerStatus, string> = {
  none: "Sin postular",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const IDENTITY_LABELS: Record<IdentityStatus, string> = {
  none: "Identidad: sin verificar",
  pending: "Identidad: en revisión",
  verified: "Identidad: verificada",
  declined: "Identidad: rechazada",
};

export default function AdminTrabajadores() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leadsByProfile, setLeadsByProfile] = useState<Map<string, WorkerLead>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [profilesRes, leadsRes] = await Promise.all([
      supabase.from("profiles").select("*").neq("worker_status", "none").order("created_at", { ascending: false }),
      supabase.from("worker_leads").select("*").eq("status", "converted"),
    ]);

    if (profilesRes.error) setError(profilesRes.error.message);
    else setProfiles((profilesRes.data as Profile[]) ?? []);

    const leads = (leadsRes.data as WorkerLead[]) ?? [];
    setLeadsByProfile(new Map(leads.filter((l) => l.converted_profile_id).map((l) => [l.converted_profile_id!, l])));

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
    <AdminLayout subtitle="Admin — Trabajadores">
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
            {pending.map((p) => {
              const canApprove = p.identity_status === "verified" && !!p.avatar_url;
              const missing = [
                p.identity_status !== "verified" && "identidad",
                !p.avatar_url && "foto de perfil",
              ].filter(Boolean);
              const lead = leadsByProfile.get(p.id);
              return (
                <div key={p.id} className={cardBase}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-ink-muted">
                          Sin foto
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-ink">{p.full_name ?? p.email}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{p.email}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{IDENTITY_LABELS[p.identity_status]}</p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button
                          className={btnPrimary}
                          onClick={() => setStatus(p, "approved")}
                          disabled={!canApprove}
                          title={canApprove ? undefined : `Falta: ${missing.join(", ")}`}
                        >
                          Aprobar
                        </button>
                        <button className={btnDanger} onClick={() => setStatus(p, "rejected")}>
                          Rechazar
                        </button>
                      </div>
                      <button
                        className={`${btnGhost} !py-1 text-xs`}
                        onClick={() => setStatus(p, "none")}
                        title="Para cuentas que nunca pidieron ser trabajador (ej. quedaron así por un bug ya corregido)"
                      >
                        Quitar postulación (nunca la pidió)
                      </button>
                    </div>
                  </div>

                  {lead && (
                    <div className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                      <p>Postuló desde el formulario público — Teléfono: {lead.phone ?? "—"}</p>
                      {lead.message && <p className="mt-1">"{lead.message}"</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {decided.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl font-semibold text-ink">Historial</h2>
            <div className="mt-4 flex flex-col gap-3">
              {decided.map((p) => {
                const lead = leadsByProfile.get(p.id);
                return (
                  <div key={p.id} className={cardBase}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">{p.full_name ?? p.email}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{p.email}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{IDENTITY_LABELS[p.identity_status]}</p>
                      </div>
                      <span className="flex-shrink-0 text-sm text-ink-muted">
                        {STATUS_LABELS[p.worker_status]}
                      </span>
                    </div>

                    {lead && (
                      <div className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                        <p>Postuló desde el formulario público — Teléfono: {lead.phone ?? "—"}</p>
                        {lead.message && <p className="mt-1">"{lead.message}"</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </AdminLayout>
  );
}
