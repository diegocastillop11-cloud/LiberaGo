import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUser } from "./push.js";
import { scheduleAdvanceOffer, qstashConfigured } from "./qstash.js";

const OFFER_WINDOW_SECONDS = 10;

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function offerToNextWorker(
  supabaseAdmin: SupabaseClient,
  baseUrl: string,
  requestId: string,
  queue: string[],
) {
  if (queue.length === 0) {
    await supabaseAdmin
      .from("requests")
      .update({ offered_to: null, offer_expires_at: null, offer_queue: [] })
      .eq("id", requestId)
      .eq("status", "solicitado");
    return;
  }

  const [next, ...rest] = queue;
  const expiresAt = new Date(Date.now() + OFFER_WINDOW_SECONDS * 1000).toISOString();

  const { data: request } = await supabaseAdmin
    .from("requests")
    .update({ offered_to: next, offer_expires_at: expiresAt, offer_queue: rest })
    .eq("id", requestId)
    .eq("status", "solicitado")
    .select("service_name, price")
    .single();

  if (!request) return;

  await sendPushToUser(supabaseAdmin, next, {
    title: "Nueva solicitud disponible",
    body: `${request.service_name} — $${Number(request.price).toLocaleString("es-CL")}. Tienes 10s para responder.`,
    url: "/trabajador",
  });

  if (qstashConfigured) {
    await scheduleAdvanceOffer(baseUrl, requestId, next, OFFER_WINDOW_SECONDS);
  }
}

// Arma la cola de trabajadores aprobados (orden aleatorio) y ofrece la
// solicitud al primero — usado tanto cuando se crea una solicitud ya
// pagada (servicios sin pago) como cuando el webhook de MercadoPago
// confirma el cobro de una que empezo en 'pendiente_pago'.
export async function dispatchToApprovedWorkers(
  supabaseAdmin: SupabaseClient,
  baseUrl: string,
  requestId: string,
) {
  const { data: workers } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("worker_status", "approved")
    .is("deleted_at", null);

  const queue = shuffle((workers ?? []).map((w) => w.id as string));
  await offerToNextWorker(supabaseAdmin, baseUrl, requestId, queue);
}
