import crypto from "crypto";

// Mismo patron que Ergania (career-ops-ui/backend/src/services/subscriptionService.ts):
// fetch directo a la API de MP, sin SDK — Checkout Pro (pago unico, no
// suscripcion). BOM: copiar/pegar el token desde el dashboard de Vercel a
// veces deja un caracter invisible al principio.
const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const MP_TOKEN = () => stripBOM(process.env.MERCADOPAGO_ACCESS_TOKEN ?? "");
const MP_API = "https://api.mercadopago.com";

async function mpFetch(path: string, method: "GET" | "POST", body?: object) {
  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${MP_TOKEN()}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MercadoPago ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function createPaymentPreference(
  baseUrl: string,
  requestId: string,
  serviceName: string,
  price: number,
): Promise<{ checkoutUrl: string; preferenceId: string }> {
  if (!MP_TOKEN()) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

  const preference = await mpFetch("/checkout/preferences", "POST", {
    items: [{ title: serviceName, quantity: 1, unit_price: price, currency_id: "CLP" }],
    back_urls: {
      success: `${baseUrl}/cliente/solicitudes/${requestId}`,
      failure: `${baseUrl}/cliente/solicitudes/${requestId}`,
      pending: `${baseUrl}/cliente/solicitudes/${requestId}`,
    },
    auto_return: "approved",
    metadata: { request_id: requestId },
    notification_url: `${baseUrl}/api/webhooks/mercadopago-payment`,
  });

  return { checkoutUrl: preference.init_point as string, preferenceId: preference.id as string };
}

export async function getPayment(paymentId: string) {
  return mpFetch(`/v1/payments/${paymentId}`, "GET") as Promise<{
    id: number;
    status: string;
    transaction_amount?: number;
    metadata?: { request_id?: string };
  }>;
}

// Reembolso parcial (ej. el 50% de la clausula de "no completado" de los
// T&C) — MP soporta reembolso parcial pasando `amount`; sin `amount` seria
// reembolso total.
export async function refundPayment(paymentId: string, amount: number) {
  return mpFetch(`/v1/payments/${paymentId}/refunds`, "POST", { amount });
}

// Verificacion de firma del webhook (HMAC-SHA256), igual que Ergania —
// ver https://www.mercadopago.cl/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/webhooks#editor_1
export function verifyMpSignature(
  secret: string,
  signatureHeader: string | undefined,
  requestId: string | undefined,
  dataId: string | undefined,
): boolean {
  if (!signatureHeader || !requestId || !dataId) return false;

  const ts = signatureHeader.match(/ts=(\d+)/)?.[1];
  const v1 = signatureHeader.match(/v1=([a-f0-9]+)/)?.[1];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
