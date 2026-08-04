import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { PostularTrabajador } from "../components/PostularTrabajador";
import type { Profile } from "../lib/types";
import { btnPrimary, btnGhost, inputBase, cardBase } from "../lib/ui";

export default function TrabajaConNosotros() {
  const { profile, loading, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader subtitle="Trabaja con nosotros" />
      <main className="mx-auto max-w-[520px] px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Haz trámites, filas y mandados y gana plata cuando quieras
        </h1>

        {loading ? (
          <p className="mt-6 text-sm text-ink-muted">Cargando…</p>
        ) : (
          <div className="mt-6">
            {profile ? <EstadoPostulacion profile={profile} onApplied={refreshProfile} /> : <LeadForm />}
          </div>
        )}
      </main>
    </div>
  );
}

function EstadoPostulacion({
  profile,
  onApplied,
}: {
  profile: Profile;
  onApplied: () => Promise<void>;
}) {
  if (profile.worker_status === "approved") {
    return (
      <div className={cardBase}>
        <p className="font-display text-xl font-semibold text-ink">Ya eres parte del equipo</p>
        <Link to="/trabajador" className={`${btnPrimary} mt-4 inline-flex`}>
          Ver solicitudes disponibles
        </Link>
      </div>
    );
  }

  if (profile.worker_status === "pending") {
    return (
      <div className={cardBase}>
        <p className="font-display text-xl font-semibold text-ink">Ya postulaste</p>
        <p className="mt-1 text-sm text-ink-muted">
          Te avisamos apenas un admin revise tu postulación.
        </p>
      </div>
    );
  }

  return <PostularTrabajador onApplied={onApplied} />;
}

function LeadForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Completa nombre, correo y teléfono.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/worker-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "No se pudo enviar la postulación.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className={cardBase}>
        <p className="font-display text-xl font-semibold text-ink">¡Gracias! Recibimos tu postulación.</p>
        <p className="mt-1 text-sm text-ink-muted">
          Te contactamos apenas la revisemos. Cuando esté aprobada, vas a necesitar iniciar sesión con
          este mismo correo ({email}) para empezar a trabajar — ahí también te vamos a pedir verificar tu
          identidad y subir una foto de perfil, requisitos antes de que un admin te apruebe.
        </p>
        <Link to="/" className={`${btnGhost} !px-0 mt-4 inline-flex`}>
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardBase}>
      <p className="text-sm text-ink-muted">
        Déjanos tus datos — no necesitas crear una cuenta todavía. Cuando aprobemos tu postulación, vas a
        necesitar iniciar sesión con el mismo correo que pongas acá para empezar a trabajar.
      </p>

      {error && (
        <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadNombre" className="text-sm font-medium text-ink-muted">
            Nombre completo
          </label>
          <input
            id="leadNombre"
            type="text"
            className={inputBase}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadEmail" className="text-sm font-medium text-ink-muted">
            Correo
          </label>
          <input
            id="leadEmail"
            type="email"
            className={inputBase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadTelefono" className="text-sm font-medium text-ink-muted">
            Teléfono
          </label>
          <input
            id="leadTelefono"
            type="text"
            className={inputBase}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadMensaje" className="text-sm font-medium text-ink-muted">
            Cuéntanos por qué quieres trabajar con nosotros (opcional)
          </label>
          <textarea
            id="leadMensaje"
            className={`${inputBase} min-h-24 resize-y`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className={`${btnPrimary} mt-4`} disabled={submitting}>
        {submitting ? "Enviando…" : "Enviar postulación"}
      </button>
    </form>
  );
}
