import { describe, expect, it } from "vitest";
import { SIGNUP_INTENT_KEY, clearSignupIntent, readSignupIntent, setSignupIntent } from "./signupIntent";

function fakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("signupIntent", () => {
  it("devuelve 'trabajador' si el intent es reciente", () => {
    const storage = fakeStorage();
    setSignupIntent(storage);
    expect(readSignupIntent(storage)).toBe("trabajador");
  });

  it("se consume al leerlo — no se puede reusar en un segundo login", () => {
    const storage = fakeStorage();
    setSignupIntent(storage);
    readSignupIntent(storage);
    expect(readSignupIntent(storage)).toBeNull();
  });

  // Regresión: este es exactamente el bug que llegó a producción — alguien
  // abandona el flujo de "registrarme como trabajador" (cierra el popup de
  // Google, elige otra cuenta) y el flag queda pegado; sin expiración, la
  // siguiente cuenta que hace login normal en ese navegador heredaba la
  // postulación sin haberla pedido.
  it("descarta un intent viejo (>10 min) sin aplicarlo a la siguiente cuenta que loguee", () => {
    const storage = fakeStorage();
    storage.setItem(
      SIGNUP_INTENT_KEY,
      JSON.stringify({ type: "trabajador", ts: Date.now() - 11 * 60 * 1000 }),
    );
    expect(readSignupIntent(storage)).toBeNull();
  });

  it("descarta un valor corrupto o del formato viejo (string plano)", () => {
    const storage = fakeStorage();
    storage.setItem(SIGNUP_INTENT_KEY, "trabajador");
    expect(readSignupIntent(storage)).toBeNull();
  });

  it("clearSignupIntent limpia cualquier intent pendiente sin aplicarlo", () => {
    const storage = fakeStorage();
    setSignupIntent(storage);
    clearSignupIntent(storage);
    expect(readSignupIntent(storage)).toBeNull();
  });

  it("un login normal (sin intent) no hace nada", () => {
    const storage = fakeStorage();
    expect(readSignupIntent(storage)).toBeNull();
  });
});
