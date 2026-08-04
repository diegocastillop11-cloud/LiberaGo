import { Router } from "express";
import { supabaseAdmin } from "../_lib/supabase.js";
import { sendPushToUser } from "../_lib/push.js";

export const workerLeadsRouter = Router();

const MAX_SHORT = 200;
const MAX_LONG = 2000;

// Postulación pública para "trabajar con nosotros" sin necesitar cuenta —
// se convierte sola en worker_status='pending' cuando esa persona inicia
// sesión con el mismo correo (ver claim_worker_lead() en
// 0028_worker_leads.sql).
workerLeadsRouter.post("/", async (req, res) => {
  const { fullName, email, phone, message } = req.body ?? {};

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof phone !== "string" ||
    !phone.trim()
  ) {
    res.status(400).json({ error: "Faltan campos obligatorios." });
    return;
  }

  if (
    fullName.length > MAX_SHORT ||
    email.length > MAX_SHORT ||
    phone.length > MAX_SHORT ||
    (typeof message === "string" && message.length > MAX_LONG)
  ) {
    res.status(400).json({ error: "Alguno de los campos es demasiado largo." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("worker_leads")
      .insert({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: typeof phone === "string" ? phone.trim() || null : null,
        message: typeof message === "string" ? message.trim() || null : null,
      })
      .select("id")
      .single();

    if (error) throw error;

    const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("is_admin", true);
    for (const admin of admins ?? []) {
      await sendPushToUser(supabaseAdmin, admin.id, {
        title: "Nueva postulación para trabajar",
        body: fullName.trim(),
        url: "/admin/trabajadores",
      });
    }

    res.status(201).json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
