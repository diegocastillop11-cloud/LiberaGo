import { Router } from "express";
import { supabaseAdmin } from "../_lib/supabase.js";
import { getAuthedUserId } from "../_lib/auth.js";

export const pushRouter = Router();

pushRouter.post("/subscribe", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Suscripción inválida" });
    return;
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth_key: keys.auth },
      { onConflict: "endpoint" },
    );

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

pushRouter.post("/unsubscribe", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { endpoint } = req.body ?? {};
  if (endpoint) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
  }
  res.json({ ok: true });
});
