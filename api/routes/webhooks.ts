import { Router, type Request } from "express";
import { Receiver } from "@upstash/qstash";
import { supabaseAdmin } from "../lib/supabase.js";
import { offerToNextWorker, shuffle } from "../lib/offerDispatch.js";

export const webhooksRouter = Router();

function baseUrlFor(req: Request) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}`;
}

// Llamado por un Database Webhook de Supabase (INSERT en requests).
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

  const { data: workers } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("worker_status", "approved");

  const queue = shuffle((workers ?? []).map((w) => w.id as string));
  await offerToNextWorker(supabaseAdmin, baseUrlFor(req), record.id, queue);

  res.json({ ok: true });
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
