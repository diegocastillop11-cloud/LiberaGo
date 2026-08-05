// Recuerda "quiero registrarme como trabajador" a través del redirect de
// Google OAuth (que saca de la página, así que un closure/estado en memoria
// no sobrevive). Guardado como JSON con timestamp — no un string plano —
// porque si el usuario abandona ese flujo (cierra el popup, elige otra
// cuenta, etc.) el localStorage queda con el flag pegado — sin la
// expiración, el próximo login normal de CUALQUIER cuenta en ese mismo
// navegador heredaba la postulación a trabajador sin haberlo pedido (bug
// reportado en producción: una cuenta que nunca postuló apareció con
// worker_status pending). Ver CLAUDE.md § Gotchas.
export const SIGNUP_INTENT_KEY = "liberago_signup_intent";
const SIGNUP_INTENT_MAX_AGE_MS = 10 * 60 * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function setSignupIntent(storage: StorageLike = window.localStorage) {
  storage.setItem(SIGNUP_INTENT_KEY, JSON.stringify({ type: "trabajador", ts: Date.now() }));
}

export function clearSignupIntent(storage: StorageLike = window.localStorage) {
  storage.removeItem(SIGNUP_INTENT_KEY);
}

// Se consume al leerlo (siempre limpia la key) para que un login normal
// nunca vuelva a encontrarlo — sea cual sea el resultado de este intento.
export function readSignupIntent(storage: StorageLike = window.localStorage): "trabajador" | null {
  const raw = storage.getItem(SIGNUP_INTENT_KEY);
  storage.removeItem(SIGNUP_INTENT_KEY);
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
