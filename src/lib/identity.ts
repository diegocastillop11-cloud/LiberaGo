import { supabase } from "./supabase";

// Crea una sesion de verificacion de identidad (Didit) y redirige al usuario
// al flujo hosteado. Mismo patron que startCheckout: redirige de verdad
// (window.location) porque es una pagina hosteada por el proveedor, no algo
// embebible en la app.
export async function startIdentityVerification(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "Tu sesión expiró, vuelve a iniciar sesión.";

  const res = await fetch("/api/identity/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json();
  if (!res.ok) return json.error ?? "No se pudo iniciar la verificación";

  window.location.href = json.url;
  return null;
}
