import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, btnGhost, inputBase, cardBase } from "../lib/ui";

export default function SugerirServicio() {
  const { profile } = useAuth();
  const [requesterName, setRequesterName] = useState(profile?.full_name ?? "");
  const [requesterContact, setRequesterContact] = useState(profile?.email ?? "");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!requesterName.trim() || !requesterContact.trim() || !serviceName.trim() || !description.trim()) {
      setError("Completa todos los campos.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/service-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        requesterName: requesterName.trim(),
        requesterContact: requesterContact.trim(),
        serviceName: serviceName.trim(),
        description: description.trim(),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "No se pudo enviar la sugerencia.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader subtitle="Sugerir un servicio" />

      <main className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink">
          ¿No encuentras el servicio que necesitas?
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Cuéntanos qué te gustaría pedir. Evaluamos agregarlo al catálogo.
        </p>

        {sent ? (
          <div className={`${cardBase} mt-6`}>
            <p className="font-semibold text-ink">¡Gracias! Recibimos tu sugerencia.</p>
            <p className="mt-1 text-sm text-ink-muted">
              La vamos a evaluar. Si la aprobamos, el servicio va a aparecer en el catálogo.
            </p>
            <Link to="/" className={`${btnGhost} !px-0 mt-4 inline-flex`}>
              ← Volver al inicio
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`${cardBase} mt-6`}>
            {error && (
              <div className="mb-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="serviceName" className="text-sm font-medium text-ink-muted">
                  ¿Qué servicio te gustaría que agreguemos?
                </label>
                <input
                  id="serviceName"
                  type="text"
                  className={inputBase}
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ej. Retiro de paquetes en correo"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium text-ink-muted">
                  Cuéntanos más
                </label>
                <textarea
                  id="description"
                  className={`${inputBase} min-h-24 resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="En qué consiste, dónde, y cualquier detalle que ayude a evaluarlo"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="requesterName" className="text-sm font-medium text-ink-muted">
                  Tu nombre
                </label>
                <input
                  id="requesterName"
                  type="text"
                  className={inputBase}
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="requesterContact" className="text-sm font-medium text-ink-muted">
                  Teléfono o email de contacto
                </label>
                <input
                  id="requesterContact"
                  type="text"
                  className={inputBase}
                  value={requesterContact}
                  onChange={(e) => setRequesterContact(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button type="submit" className={btnPrimary} disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar sugerencia"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
