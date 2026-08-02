import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { ServiceRequest } from "../lib/types";
import { btnPrimary } from "../lib/ui";

const STEP_ORDER = ["solicitado", "asignado", "en_curso", "completado"] as const;
const STEP_LABELS: Record<(typeof STEP_ORDER)[number], string> = {
  solicitado: "Solicitado",
  asignado: "Trabajador asignado",
  en_curso: "En curso",
  completado: "Completado",
};

export function RequestStatusCard({ request }: { request: ServiceRequest }) {
  if (request.status === "pendiente_pago") {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <p className="font-display text-lg font-semibold text-ink">{request.service_name}</p>
        <p className="mt-2 text-sm text-ink-muted">
          Todavía no se confirma el pago de esta solicitud — no se le ofrece a ningún trabajador hasta
          que se complete.
        </p>
        <RetryPaymentButton requestId={request.id} />
      </div>
    );
  }

  if (request.status === "cancelado") {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <p className="font-display text-lg font-semibold text-ink">{request.service_name}</p>
        <p className="mt-2 text-sm text-error">Esta solicitud fue cancelada.</p>
        <WorkerNotes request={request} />
      </div>
    );
  }

  if (request.status === "no_completado") {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <p className="font-display text-lg font-semibold text-ink">{request.service_name}</p>
        <p className="mt-2 text-sm text-error">No se pudo completar esta solicitud.</p>
        {request.failure_reason && (
          <p className="mt-1 text-sm text-ink-muted">Motivo: "{request.failure_reason}"</p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          Según nuestros Términos y Condiciones, esto da derecho a un reembolso del 50% del pago.
        </p>
        <WorkerNotes request={request} />
      </div>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(request.status as (typeof STEP_ORDER)[number]);

  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(16_32_45/0.08),0_12px_28px_rgb(16_32_45/0.12)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="font-display text-lg font-semibold text-ink">{request.service_name}</span>
        <span className="rounded-full bg-action/10 px-3 py-1 text-xs font-semibold text-action-ink">
          {STEP_LABELS[request.status as (typeof STEP_ORDER)[number]]}
        </span>
      </div>

      <ol className="flex flex-col">
        {STEP_ORDER.map((step, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const isLast = i === STEP_ORDER.length - 1;
          return (
            <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[6px] top-[18px] h-[calc(100%-6px)] w-0.5 ${
                    done ? "bg-confirmed" : "bg-line"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ${
                  current
                    ? "pulse-dot border-action bg-action"
                    : done
                      ? "border-confirmed bg-confirmed"
                      : "border-line bg-surface-2"
                }`}
              />
              <p
                className={`text-sm ${
                  current
                    ? "font-bold text-action-ink"
                    : done
                      ? "font-medium text-ink"
                      : "font-medium text-ink-muted"
                }`}
              >
                {STEP_LABELS[step]}
              </p>
            </li>
          );
        })}
      </ol>

      {request.worker_name && (
        <div className="mt-5 flex items-center gap-3 rounded-md bg-surface-2 p-3.5">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-muted"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{request.worker_name}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-confirmed px-2.5 py-0.5 text-[11px] font-semibold text-on-confirmed">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Verificado
            </span>
          </div>
        </div>
      )}

      <WorkerNotes request={request} />

      <div className="mt-5 flex flex-col gap-0">
        {request.locations.map((loc) => (
          <div
            key={loc.label}
            className="flex items-start justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0"
          >
            <span className="text-ink-muted">{loc.label}</span>
            <span className="text-right">
              <span className="block text-ink">{loc.address}</span>
              <span
                className={`mt-0.5 inline-block text-xs font-medium ${
                  loc.completed_at ? "text-success" : "text-ink-muted"
                }`}
              >
                {loc.completed_at ? "✓ Completado" : "Pendiente"}
              </span>
            </span>
          </div>
        ))}
        {request.distance_km != null && (
          <div className="flex justify-between gap-4 border-b border-line py-2.5 text-sm">
            <span className="text-ink-muted">Distancia</span>
            <span className="text-ink">~{request.distance_km} km</span>
          </div>
        )}
        <div className="flex justify-between gap-4 py-2.5 text-sm">
          <span className="text-ink-muted">Costo</span>
          <span className="font-data font-medium text-ink">${request.price.toLocaleString("es-CL")}</span>
        </div>
      </div>
    </div>
  );
}

function RetryPaymentButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      setError("Tu sesión expiró, vuelve a iniciar sesión.");
      return;
    }

    const res = await fetch(`/api/requests/${requestId}/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(json.error ?? "No se pudo iniciar el pago");
      return;
    }
    window.location.href = json.checkoutUrl;
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-error">{error}</p>}
      <button className={btnPrimary} onClick={retry} disabled={loading}>
        {loading ? "Redirigiendo…" : "Pagar ahora"}
      </button>
    </div>
  );
}

function WorkerNotes({ request }: { request: ServiceRequest }) {
  if (request.worker_notes.length === 0) return null;

  return (
    <div className="mt-5 flex flex-col gap-2">
      <p className="text-sm font-medium text-ink-muted">Notas del trabajador</p>
      {request.worker_notes.map((note, i) => (
        <div key={i} className="rounded-md bg-surface-2 p-3 text-sm">
          <p className="text-ink">{note.text}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {new Date(note.created_at).toLocaleString("es-CL")}
          </p>
        </div>
      ))}
    </div>
  );
}
