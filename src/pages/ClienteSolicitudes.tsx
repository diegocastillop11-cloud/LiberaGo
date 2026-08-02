import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { RequestStatus, ServiceRequest } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { btnGhost, cardBase } from "../lib/ui";

const STATUS_LABELS: Record<RequestStatus, string> = {
  pendiente_pago: "Pendiente de pago",
  solicitado: "Solicitado",
  asignado: "Asignado",
  en_curso: "En curso",
  completado: "Completado",
  cancelado: "Cancelado",
  no_completado: "No completado",
};

const STATUS_PILL: Record<RequestStatus, string> = {
  pendiente_pago: "bg-surface-2 text-ink-muted",
  solicitado: "bg-confirmed/15 text-confirmed-ink",
  asignado: "bg-action/15 text-action-ink",
  en_curso: "bg-action/15 text-action-ink",
  completado: "bg-success/15 text-success",
  cancelado: "bg-error/15 text-error",
  no_completado: "bg-error/15 text-error",
};

export default function ClienteSolicitudes() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("requests")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests((data as ServiceRequest[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        actions={
          <Link to="/cliente" className={btnGhost}>
            Pedir un servicio
          </Link>
        }
      />

      <main className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink">Mis solicitudes</h1>

        {loading ? (
          <p className="mt-6 text-sm text-ink-muted">Cargando…</p>
        ) : requests.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            Todavía no has pedido nada.{" "}
            <Link to="/cliente" className="text-action underline-offset-4 hover:underline">
              Pide tu primer servicio
            </Link>
            .
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {requests.map((r) => (
              <Link
                key={r.id}
                to={`/cliente/solicitudes/${r.id}`}
                className={`${cardBase} flex items-center justify-between gap-4 transition-colors hover:border-action`}
              >
                <div>
                  <p className="font-semibold text-ink">{r.service_name}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(r.created_at).toLocaleDateString("es-CL")}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
