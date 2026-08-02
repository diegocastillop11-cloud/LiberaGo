import { Router, type Request } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { getAuthedUserId } from "../lib/auth.js";
import { offerToNextWorker } from "../lib/offerDispatch.js";
import { createPaymentPreference, refundPayment } from "../lib/mercadopago.js";

export const requestsRouter = Router();

function baseUrlFor(req: Request) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}`;
}

// Crea la preferencia de pago (Checkout Pro) para una solicitud recien
// creada en 'pendiente_pago' y devuelve la URL a la que redirigir al
// cliente. El pago en si se confirma via /api/webhooks/mercadopago-payment.
requestsRouter.post("/:id/checkout", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, client_id, status, price, service_name")
    .eq("id", req.params.id)
    .single();

  if (!request || request.client_id !== userId || request.status !== "pendiente_pago") {
    res.status(409).json({ error: "Esta solicitud no está pendiente de pago" });
    return;
  }

  try {
    const { checkoutUrl, preferenceId } = await createPaymentPreference(
      baseUrlFor(req),
      request.id,
      request.service_name,
      request.price,
    );
    await supabaseAdmin.from("requests").update({ mp_preference_id: preferenceId }).eq("id", request.id);
    res.json({ checkoutUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error creando el pago";
    console.error("[checkout] error:", msg);
    res.status(500).json({ error: msg });
  }
});

// Reembolso manual (clausula de los T&C: 50% si "no completado", 100% si
// "cancelado") — disparado por un admin desde el panel, nunca automatico
// (ver CLAUDE.md).
requestsRouter.post("/:id/refund", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).single();
  if (!profile?.is_admin) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, status, mp_payment_id, price, refunded_at")
    .eq("id", req.params.id)
    .single();

  if (!request || (request.status !== "no_completado" && request.status !== "cancelado") || !request.mp_payment_id) {
    res.status(409).json({ error: "Esta solicitud no tiene un pago que reembolsar" });
    return;
  }
  if (request.refunded_at) {
    res.status(409).json({ error: "Ya se reembolsó esta solicitud" });
    return;
  }

  const amount = request.status === "cancelado" ? request.price : Math.round(request.price / 2);
  try {
    await refundPayment(request.mp_payment_id, amount);
    await supabaseAdmin
      .from("requests")
      .update({ refunded_at: new Date().toISOString(), refund_amount: amount })
      .eq("id", request.id);
    res.json({ ok: true, amount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al reembolsar";
    console.error("[refund] error:", msg);
    res.status(500).json({ error: msg });
  }
});

// Cancela una solicitud propia que todavia no se pago — nunca se cobro
// nada, asi que no hay nada que reembolsar. Solo aplica en 'pendiente_pago';
// una vez pagada, cancelarla pasa por Admin (y el reembolso del 100% ya
// construido), no por el cliente directamente.
requestsRouter.post("/:id/cancel", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, client_id, status")
    .eq("id", req.params.id)
    .single();

  if (!request || request.client_id !== userId || request.status !== "pendiente_pago") {
    res.status(409).json({ error: "Esta solicitud ya no se puede cancelar" });
    return;
  }

  const { error } = await supabaseAdmin.from("requests").update({ status: "cancelado" }).eq("id", request.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

requestsRouter.post("/:id/skip", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("status, offered_to, offer_queue")
    .eq("id", req.params.id)
    .single();

  if (!request || request.status !== "solicitado" || request.offered_to !== userId) {
    res.status(409).json({ error: "Esta solicitud ya no está disponible para ti" });
    return;
  }

  await offerToNextWorker(supabaseAdmin, baseUrlFor(req), req.params.id, request.offer_queue ?? []);
  res.json({ ok: true });
});
