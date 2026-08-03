import crypto from "crypto";

// Mismo patron que mercadopago.ts: fetch directo a la API del proveedor, sin
// SDK. stripBOM por el mismo motivo (copiar/pegar el api key desde el
// dashboard de Didit a veces deja un caracter invisible al principio).
const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const DIDIT_API_KEY = () => stripBOM(process.env.DIDIT_API_KEY ?? "");
const DIDIT_WORKFLOW_ID = () => stripBOM(process.env.DIDIT_WORKFLOW_ID ?? "");
const DIDIT_API = "https://verification.didit.me/v3";

async function diditFetch(path: string, method: "GET" | "POST", body?: object) {
  const res = await fetch(`${DIDIT_API}${path}`, {
    method,
    headers: {
      "x-api-key": DIDIT_API_KEY(),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Didit ${res.status}: ${text}`);
  return JSON.parse(text);
}

// vendor_data = nuestro propio user id: asi el webhook puede ubicar el
// perfil sin necesitar una tabla de mapeo aparte (ver api/_routes/webhooks.ts).
export async function createVerificationSession(
  userId: string,
  callbackUrl: string,
): Promise<{ sessionId: string; url: string }> {
  if (!DIDIT_API_KEY()) throw new Error("DIDIT_API_KEY no configurado");
  if (!DIDIT_WORKFLOW_ID()) throw new Error("DIDIT_WORKFLOW_ID no configurado");

  const session = await diditFetch("/session/", "POST", {
    workflow_id: DIDIT_WORKFLOW_ID(),
    vendor_data: userId,
    callback: callbackUrl,
  });

  return { sessionId: session.session_id as string, url: session.url as string };
}

// Verificacion de firma del webhook — variante "X-Signature-Simple" de Didit
// (https://docs.didit.me/integration/webhooks): mas simple que la V2 (que
// firma sobre JSON canonicalizado) porque no depende de reconstruir el mismo
// orden/formato de serializacion que uso Didit, solo de estos 4 campos.
// Fail-closed a proposito (a diferencia del webhook de MercadoPago, que es
// fail-open deliberado documentado en CLAUDE.md como riesgo a cerrar antes
// de produccion) — este no tiene ese wart desde el dia 1.
export function verifyDiditSignature(
  secret: string,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
  sessionId: string | undefined,
  status: string | undefined,
  webhookType: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !timestampHeader || !sessionId || !status || !webhookType) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false;

  const manifest = `${timestampHeader}:${sessionId}:${status}:${webhookType}`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
