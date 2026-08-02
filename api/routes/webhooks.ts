import { Router, type Request } from "express";
import { Receiver } from "@upstash/qstash";
import { supabaseAdmin } from "../lib/supabase.js";
import { dispatchToApprovedWorkers, offerToNextWorker } from "../lib/offerDispatch.js";
import { getPayment, verifyMpSignature } from "../lib/mercadopago.js";

export const webhooksRouter = Router();

function baseUrlFor(req: Request) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}`;
}

// Llamado por un Database Webhook de Supabase (INSERT en requests). Las
// solicitudes con MercadoPago nacen en 'pendiente_pago' (ver 0012/0013), asi
// que esto no dispara nada para ellas — las despacha /mercadopago-payment
// cuando el pago se confirma.
webhooksRouter.post("/request-created", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.headers["x-liberago-webhook-secret"] !== secret) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const record = req.body?.record;
  if (!record || record.status !== "solicitado") {
    res.json({ skipped: true });
    return;
  }

  await dispatchToApprovedWorkers(supabaseAdmin, baseUrlFor(req), record.id);

  res.json({ ok: true });
});

// Notificacion (IPN) de MercadoPago tras un pago de Checkout Pro. Sin auth
// propia — la firma HMAC de MP es la verificacion (ver verifyMpSignature).
// Siempre responde 200 salvo firma invalida ausente, para evitar que MP
// reintente en bucle por errores de logica de nuestro lado.
webhooksRouter.post("/mercadopago-payment", async (req, res) => {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers["x-signature"] as string | undefined;
    const reqId = req.headers["x-request-id"] as string | undefined;
    const dataId = (req.query["data.id"] ?? req.query.id) as string | undefined;
    if (!verifyMpSignature(secret, sig, reqId, dataId)) {
      res.sendStatus(200);
      return;
    }
  }

  try {
    const topic = (req.query.topic ?? req.query.type) as string | undefined;
    const id = (req.query.id ?? req.query["data.id"]) as string | undefined;
    if (topic !== "payment" || !id) {
      res.sendStatus(200);
      return;
    }

    const payment = await getPayment(id);
    const requestId = payment.metadata?.request_id;
    if (!requestId || payment.status !== "approved") {
      res.sendStatus(200);
      return;
    }

    const { data: confirmed } = await supabaseAdmin
      .from("requests")
      .update({
        status: "solicitado",
        mp_payment_id: String(payment.id),
        paid_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pendiente_pago")
      .select("id")
      .single();

    if (confirmed) {
      await dispatchToApprovedWorkers(supabaseAdmin, baseUrlFor(req), requestId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[mercadopago-payment] error:", err instanceof Error ? err.message : err);
    res.sendStatus(200);
  }
});

// Llamado por QStash 10s despues de ofrecer la solicitud a un trabajador.
webhooksRouter.post("/advance-offer", async (req, res) => {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (!currentSigningKey) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? "",
  });
  const signature = req.headers["upstash-signature"];
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
  const isValid = await receiver
    .verify({ signature: typeof signature === "string" ? signature : "", body: rawBody })
    .catch(() => false);
  if (!isValid) {
    res.status(401).json({ error: "Firma inválida" });
    return;
  }

  const { requestId, expectedWorkerId } = req.body ?? {};
  if (!requestId || !expectedWorkerId) {
    res.status(400).json({ error: "Payload inválido" });
    return;
  }

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("status, offered_to, offer_queue")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "solicitado" || request.offered_to !== expectedWorkerId) {
    res.json({ skipped: true });
    return;
  }

  await offerToNextWorker(supabaseAdmin, baseUrlFor(req), requestId, request.offer_queue ?? []);
  res.json({ ok: true });
});
