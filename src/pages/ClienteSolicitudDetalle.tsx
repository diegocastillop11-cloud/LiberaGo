import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { ServiceRequest } from "../lib/types";
import { RequestStatusCard } from "../components/RequestStatusCard";
import { AppHeader } from "../components/AppHeader";
import { btnGhost } from "../lib/ui";

export default function ClienteSolicitudDetalle() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRequest(data as ServiceRequest);
        setLoading(false);
      });

    const channel = supabase
      .channel(`request-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${id}` },
        (payload) => setRequest(payload.new as ServiceRequest),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        maxWidth={520}
        actions={
          <Link to="/cliente/solicitudes" className={btnGhost}>
            Mis solicitudes
          </Link>
        }
      />

      <main className="mx-auto max-w-[520px] px-6 py-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-confirmed-ink">
          Seguimiento en vivo
        </p>
        {loading ? (
          <p className="text-sm text-ink-muted">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-error">{error}</p>
        ) : request ? (
          <RequestStatusCard request={request} />
        ) : (
          <p className="text-sm text-ink-muted">No encontramos esa solicitud.</p>
        )}
      </main>
    </div>
  );
}
