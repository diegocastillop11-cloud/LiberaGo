import { Router, type Request } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { getAuthedUserId } from "../lib/auth.js";
import { offerToNextWorker } from "../lib/offerDispatch.js";

export const requestsRouter = Router();

function baseUrlFor(req: Request) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}`;
}

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
