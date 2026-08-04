import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppHeader } from "../components/AppHeader";
import { btnDanger, btnGhost, cardBase } from "../lib/ui";

type WorkerSummary = {
  workerId: string;
  name: string;
  deleted: boolean;
  ganadoHistorico: number;
  pagado: number;
  pendiente: number;
};

type FinanceSummary = {
  revenueBruto: number;
  reembolsado: number;
  neto: number;
  corteAdmin: number;
  corteTrabajadores: number;
  workers: WorkerSummary[];
};

function money(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

export default function AdminFinanzas() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError("Tu sesión expiró, vuelve a iniciar sesión.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/finance-summary", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar el resumen financiero");
      return;
    }
    setSummary(json as FinanceSummary);
  }

  useEffect(() => {
    load();
  }, []);

  async function marcarPagado(w: WorkerSummary) {
    if (!window.confirm(`¿Marcar ${money(w.pendiente)} como pagado a "${w.name}"?`)) return;

    setPayingId(w.workerId);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setPayingId(null);
      setError("Tu sesión expiró, vuelve a iniciar sesión.");
      return;
    }

    const res = await fetch(`/api/admin/workers/${w.workerId}/payout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setPayingId(null);
    if (!res.ok) {
      setError(json.error ?? "No se pudo registrar el pago");
      return;
    }
    load();
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Finanzas"
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
            <Link to="/admin/usuarios" className={btnGhost}>
              Usuarios
            </Link>
            <Link to="/admin/sugerencias" className={btnGhost}>
              Sugerencias
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

        {loading ? (
          <p className="text-sm text-ink-muted">Cargando…</p>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={cardBase}>
                <p className="text-xs text-ink-muted">Revenue bruto</p>
                <p className="mt-1 font-display text-lg font-semibold text-ink">{money(summary.revenueBruto)}</p>
              </div>
              <div className={cardBase}>
                <p className="text-xs text-ink-muted">Reembolsado</p>
                <p className="mt-1 font-display text-lg font-semibold text-ink">{money(summary.reembolsado)}</p>
              </div>
              <div className={cardBase}>
                <p className="text-xs text-ink-muted">Neto</p>
                <p className="mt-1 font-display text-lg font-semibold text-ink">{money(summary.neto)}</p>
              </div>
              <div className={cardBase}>
                <p className="text-xs text-ink-muted">Corte admin (40%)</p>
                <p className="mt-1 font-display text-lg font-semibold text-ink">{money(summary.corteAdmin)}</p>
              </div>
            </div>

            <h2 className="mt-10 font-display text-xl font-semibold text-ink">
              Pago a trabajadores (60% por servicio completado)
            </h2>

            {summary.workers.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Todavía no hay servicios completados.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {summary.workers.map((w) => (
                  <div key={w.workerId} className={`${cardBase} flex flex-wrap items-center justify-between gap-4`}>
                    <div>
                      <p className="font-semibold text-ink">
                        {w.name}
                        {w.deleted && <span className="ml-2 text-xs text-ink-muted">(cuenta eliminada)</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Ganado: {money(w.ganadoHistorico)} · Pagado: {money(w.pagado)} · Pendiente:{" "}
                        {money(w.pendiente)}
                      </p>
                    </div>
                    <button
                      className={btnDanger}
                      onClick={() => marcarPagado(w)}
                      disabled={w.pendiente <= 0 || payingId === w.workerId}
                    >
                      {payingId === w.workerId ? "Registrando…" : "Marcar pagado"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
