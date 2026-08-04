import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const SIGNUP_INTENT_KEY = "liberago_signup_intent";
const SIGNUP_INTENT_MAX_AGE_MS = 10 * 60 * 1000;

// El intent se guarda como JSON con timestamp (no un string plano) porque
// si el usuario abandona el flujo de Google OAuth (cierra el popup, elige
// otra cuenta, etc.) el localStorage queda con el flag pegado — sin la
// expiración, el próximo login normal de CUALQUIER cuenta en ese mismo
// navegador heredaba la postulación a trabajador sin haberlo pedido (bug
// reportado en producción: una cuenta que nunca postuló apareció con
// worker_status pending).
function readSignupIntent(): "trabajador" | null {
  const raw = window.localStorage.getItem(SIGNUP_INTENT_KEY);
  window.localStorage.removeItem(SIGNUP_INTENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { type: "trabajador"; ts: number };
    if (parsed.type === "trabajador" && Date.now() - parsed.ts < SIGNUP_INTENT_MAX_AGE_MS) {
      return "trabajador";
    }
  } catch {
    // formato viejo (string plano) o corrupto — se descarta.
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    let current = (data as Profile) ?? null;

    // Si eligió "registrarme como trabajador", esto aplica esa postulación
    // apenas exista sesión real — cubre email/password y Google por igual,
    // sin depender de metadata que el proveedor OAuth no siempre deja pasar.
    const intent = readSignupIntent();
    if (intent === "trabajador" && current?.worker_status === "none") {
      const { error } = await supabase.rpc("request_worker_status");
      if (!error) {
        const refreshed = await supabase.from("profiles").select("*").eq("id", userId).single();
        current = (refreshed.data as Profile) ?? current;
      }
    }

    setProfile(current);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
  }

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function signUpWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
