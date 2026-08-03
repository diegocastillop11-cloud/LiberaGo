import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Logo } from "../components/Logo";
import type { Profile } from "../lib/types";
import { btnPrimary, btnSecondary, btnGhost, inputBase } from "../lib/ui";

const MIN_PASSWORD_LENGTH = 8;
const SIGNUP_INTENT_KEY = "liberago_signup_intent";

function friendlyError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (message.includes("User already registered")) return "Ya existe una cuenta con ese correo.";
  if (message.includes("Password should be at least")) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  return message;
}

function destinationFor(profile: Profile): string {
  if (profile.is_admin) return "/admin";
  if (profile.worker_status === "approved") return "/trabajador";
  return "/cliente";
}

export default function Login() {
  const navigate = useNavigate();
  const { session, profile, loading, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupAs, setSignupAs] = useState<"cliente" | "trabajador">("cliente");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setInfo(null);
    setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    if (signupAs === "trabajador") {
      window.localStorage.setItem(SIGNUP_INTENT_KEY, "trabajador");
    }

    setSubmitting(true);
    const err =
      mode === "signin"
        ? await signInWithPassword(cleanEmail, password)
        : await signUpWithPassword(cleanEmail, password);
    setSubmitting(false);

    if (err) {
      setError(friendlyError(err));
      return;
    }
    if (mode === "signup") {
      setInfo(
        signupAs === "trabajador"
          ? "Cuenta creada. Tu postulación como trabajador quedó pendiente de aprobación."
          : "Cuenta creada. Revisa tu correo si Supabase pide confirmarla, o ya puedes ingresar.",
      );
      setPassword("");
      setConfirmPassword("");
    }
    // Si fue "signin", el useEffect de abajo redirige apenas el perfil cargue.
  }

  useEffect(() => {
    if (mode === "signin" && !loading && session && profile) {
      navigate(destinationFor(profile), { replace: true });
    }
  }, [mode, loading, session, profile, navigate]);

  function handleGoogleClick() {
    if (mode === "signup" && signupAs === "trabajador") {
      window.localStorage.setItem(SIGNUP_INTENT_KEY, "trabajador");
    }
    signInWithGoogle();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-surface p-8">
        <button
          type="button"
          className={`${btnGhost} !px-0`}
          onClick={() => navigate(-1)}
        >
          ← Volver
        </button>
        <div className="mt-3 flex justify-center">
          <Logo className="h-9" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
          {mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>

        <div className="mt-5 flex rounded-sm border border-line p-1">
          <button
            type="button"
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
              mode === "signin" ? "bg-action text-on-action" : "text-ink-muted"
            }`}
            onClick={() => switchMode("signin")}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-action text-on-action" : "text-ink-muted"
            }`}
            onClick={() => switchMode("signup")}
          >
            Registrarme
          </button>
        </div>

        {mode === "signup" && (
          <div className="mt-5">
            <p className="text-sm font-medium text-ink-muted">¿Cómo quieres registrarte?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                  signupAs === "cliente"
                    ? "border-action bg-action/10 text-action-ink"
                    : "border-line text-ink-muted"
                }`}
                onClick={() => setSignupAs("cliente")}
              >
                Cliente
              </button>
              <button
                type="button"
                className={`flex-1 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                  signupAs === "trabajador"
                    ? "border-action bg-action/10 text-action-ink"
                    : "border-line text-ink-muted"
                }`}
                onClick={() => setSignupAs("trabajador")}
              >
                Trabajador
              </button>
            </div>
            {signupAs === "trabajador" && (
              <p className="mt-2 text-xs text-ink-muted">
                Tu postulación queda pendiente hasta que un admin la apruebe.
              </p>
            )}
          </div>
        )}

        <button type="button" className={`${btnSecondary} mt-5 w-full`} onClick={handleGoogleClick}>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
              spellCheck={false}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink-muted">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`${inputBase} pr-16`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted hover:text-ink"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {mode === "signup" && (
              <p className="text-xs text-ink-muted">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
            )}
          </div>

          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-ink-muted">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className={inputBase}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
          )}

          <button type="submit" className={btnPrimary} disabled={submitting}>
            {submitting ? "Un momento…" : mode === "signin" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
