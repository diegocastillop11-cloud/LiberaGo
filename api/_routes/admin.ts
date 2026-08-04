import { Router } from "express";
import { supabaseAdmin } from "../_lib/supabase.js";
import { requireAdmin } from "../_lib/auth.js";

export const adminRouter = Router();

// Reparto fijo: 60% trabajador / 40% admin, por request. Se calcula solo
// sobre requests 'completado' — el reembolso nunca aplica a ese status (ver
// /:id/refund en requests.ts, solo permite 'no_completado'/'cancelado'), así
// que el pool repartible de una request completada nunca se ve afectado por
// reembolsos.
const WORKER_SHARE = 0.6;

adminRouter.get("/finance-summary", async (req, res) => {
  const admin = await requireAdmin(req);
  if ("error" in admin) {
    res.status(admin.status).json({ error: admin.error });
    return;
  }

  const { data: paidRequests, error } = await supabaseAdmin
    .from("requests")
    .select("id, price, refund_amount, refunded_at, worker_id, status")
    .not("paid_at", "is", null);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const { data: payouts } = await supabaseAdmin.from("worker_payouts").select("worker_id, amount");

  let revenueBruto = 0;
  let reembolsado = 0;
  const shareByWorker = new Map<string, number>();

  for (const r of paidRequests ?? []) {
    revenueBruto += r.price;
    if (r.refunded_at) reembolsado += r.refund_amount ?? 0;
    if (r.status === "completado" && r.worker_id) {
      const share = Math.round(r.price * WORKER_SHARE);
      shareByWorker.set(r.worker_id, (shareByWorker.get(r.worker_id) ?? 0) + share);
    }
  }

  const neto = revenueBruto - reembolsado;
  const poolCompletado = (paidRequests ?? [])
    .filter((r) => r.status === "completado")
    .reduce((sum, r) => sum + r.price, 0);
  const corteTrabajadores = [...shareByWorker.values()].reduce((a, b) => a + b, 0);
  const corteAdmin = poolCompletado - corteTrabajadores;

  const paidByWorker = new Map<string, number>();
  for (const p of payouts ?? []) {
    paidByWorker.set(p.worker_id, (paidByWorker.get(p.worker_id) ?? 0) + p.amount);
  }

  const workerIds = [...shareByWorker.keys()];
  const { data: workerProfiles } = workerIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email, deleted_at").in("id", workerIds)
    : { data: [] as { id: string; full_name: string | null; email: string; deleted_at: string | null }[] };

  const workers = workerIds.map((id) => {
    const profile = workerProfiles?.find((p) => p.id === id);
    const ganadoHistorico = shareByWorker.get(id) ?? 0;
    const pagado = paidByWorker.get(id) ?? 0;
    return {
      workerId: id,
      name: profile?.full_name ?? profile?.email ?? "Trabajador",
      deleted: !!profile?.deleted_at,
      ganadoHistorico,
      pagado,
      pendiente: ganadoHistorico - pagado,
    };
  });

  res.json({ revenueBruto, reembolsado, neto, corteAdmin, corteTrabajadores, workers });
});

adminRouter.post("/workers/:id/payout", async (req, res) => {
  const admin = await requireAdmin(req);
  if ("error" in admin) {
    res.status(admin.status).json({ error: admin.error });
    return;
  }

  const workerId = req.params.id;
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null;

  const { data: completed, error: reqError } = await supabaseAdmin
    .from("requests")
    .select("id, price")
    .eq("worker_id", workerId)
    .eq("status", "completado");
  if (reqError) {
    res.status(500).json({ error: reqError.message });
    return;
  }

  const { data: existingPayouts, error: payoutError } = await supabaseAdmin
    .from("worker_payouts")
    .select("request_ids")
    .eq("worker_id", workerId);
  if (payoutError) {
    res.status(500).json({ error: payoutError.message });
    return;
  }

  const covered = new Set((existingPayouts ?? []).flatMap((p) => p.request_ids as string[]));
  const uncovered = (completed ?? []).filter((r) => !covered.has(r.id));

  if (uncovered.length === 0) {
    res.status(409).json({ error: "No hay nada pendiente para este trabajador" });
    return;
  }

  const amount = uncovered.reduce((sum, r) => sum + Math.round(r.price * WORKER_SHARE), 0);

  const { error: insertError } = await supabaseAdmin.from("worker_payouts").insert({
    worker_id: workerId,
    amount,
    request_ids: uncovered.map((r) => r.id),
    paid_by: admin.userId,
    notes,
  });
  if (insertError) {
    res.status(500).json({ error: insertError.message });
    return;
  }

  res.json({ ok: true, amount });
});
