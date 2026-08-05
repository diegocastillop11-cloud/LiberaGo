import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabase";
import { readSignupIntent } from "./signupIntent";
import type { Profile } from "./types";

const NATIVE_OAUTH_REDIRECT = "com.liberago.app://login";

function extractSessionParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const raw = hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : "";
  return new URLSearchParams(raw);
}

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

    // Si esta cuenta postuló a trabajador sin sesión (formulario público
    // /trabaja-con-nosotros, ver 0028/0029_worker_leads.sql), esto la activa
    // apenas el correo real de la sesión coincide con esa postulación —
    // seguro de re-ejecutar en cada login, es un no-op si no hay match. El
    // RPC decide la condición final (none o rejected); acá solo se evita la
    // llamada de más cuando ya está pending/approved.
    if (current?.worker_status === "none" || current?.worker_status === "rejected") {
      const { error } = await supabase.rpc("claim_worker_lead");
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
      await Browser.close().catch(() => {});

      const params = extractSessionParams(url);
      const code = params.get("code");
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, []);

  async function signInWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      // Google bloquea el login OAuth dentro de un WebView embebido
      // ("disallowed_useragent") — hay que abrirlo en Chrome Custom Tabs
      // (@capacitor/browser) y volver a la app por el deep link
      // com.liberago.app://login (ver intent-filter en AndroidManifest.xml).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: NATIVE_OAUTH_REDIRECT, skipBrowserRedirect: true },
      });
      if (!error && data?.url) await Browser.open({ url: data.url });
      return;
    }

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
