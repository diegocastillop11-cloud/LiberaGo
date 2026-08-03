import { Router } from "express";
import { supabaseAdmin } from "../_lib/supabase.js";
import { getAuthedUserId } from "../_lib/auth.js";
import { sendPushToUser } from "../_lib/push.js";

export const serviceSuggestionsRouter = Router();

const MAX_SHORT = 200;
const MAX_LONG = 2000;

serviceSuggestionsRouter.post("/", async (req, res) => {
  const { requesterName, requesterContact, serviceName, description } = req.body ?? {};

  if (
    typeof requesterName !== "string" ||
    !requesterName.trim() ||
    typeof requesterContact !== "string" ||
    !requesterContact.trim() ||
    typeof serviceName !== "string" ||
    !serviceName.trim() ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    res.status(400).json({ error: "Faltan campos obligatorios." });
    return;
  }

  if (
    requesterName.length > MAX_SHORT ||
    requesterContact.length > MAX_SHORT ||
    serviceName.length > MAX_SHORT ||
    description.length > MAX_LONG
  ) {
    res.status(400).json({ error: "Alguno de los campos es demasiado largo." });
    return;
  }

  const clientId = await getAuthedUserId(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("service_suggestions")
      .insert({
        client_id: clientId,
        requester_name: requesterName.trim(),
        requester_contact: requesterContact.trim(),
        service_name: serviceName.trim(),
        description: description.trim(),
      })
      .select("id")
      .single();

    if (error) throw error;

    const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("is_admin", true);

    for (const admin of admins ?? []) {
      await sendPushToUser(supabaseAdmin, admin.id, {
        title: "Nueva sugerencia de servicio",
        body: serviceName.trim(),
        url: "/admin/sugerencias",
      });
    }

    res.status(201).json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
