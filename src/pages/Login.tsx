import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { btnPrimary, btnSecondary, inputBase } from "../lib/ui";

export default function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const err =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);

    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "signup") {
      setInfo("Cuenta creada. Revisa tu correo si Supabase pide confirmarla, o ya puedes ingresar.");
    } else {
      navigate("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-surface p-8">
        <Link to="/" className="font-display text-xl font-semibold text-ink">
          LiberaGo
        </Link>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
          {mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>

        <div className="mt-5 flex rounded-sm border border-line p-1">
          <button
            type="button"
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
              mode === "signin" ? "bg-action text-on-action" : "text-ink-muted"
            }`}
            onClick={() => setMode("signin")}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-action text-on-action" : "text-ink-muted"
            }`}
            onClick={() => setMode("signup")}
          >
            Registrarme
          </button>
        </div>

        <button type="button" className={`${btnSecondary} mt-5 w-full`} onClick={signInWithGoogle}>
          Continuar con Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-line" />
          o con tu correo
          <span className="h-px flex-1 bg-line" />
        </div>

        {error && (
          <div className="mb-4 rounded-sm border border-error bg-error/10 px-3.5 py-2.5 text-sm text-error">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-sm border border-success bg-success/10 px-3.5 py-2.5 text-sm text-success">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink-muted">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className={inputBase}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink-muted">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={inputBase}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </div>
          <button type="submit" className={btnPrimary} disabled={submitting}>
            {submitting ? "Un momento…" : mode === "signin" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
