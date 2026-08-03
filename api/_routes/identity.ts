import { Router, type Request } from "express";
import { supabaseAdmin } from "../_lib/supabase.js";
import { getAuthedUserId } from "../_lib/auth.js";
import { createVerificationSession } from "../_lib/didit.js";

export const identityRouter = Router();

function baseUrlFor(req: Request) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}`;
}

// Crea una sesion de verificacion de identidad (Didit) para el usuario
// logueado y devuelve la URL del flujo hosteado al que hay que redirigirlo.
// Sirve para cliente y trabajador por igual — la verificacion es por
// persona, no por rol (ver 0016_identity_verification.sql).
identityRouter.post("/session", async (req, res) => {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    const { sessionId, url } = await createVerificationSession(
      userId,
      `${baseUrlFor(req)}/verificacion?done=1`,
    );

    await supabaseAdmin
      .from("profiles")
      .update({ identity_status: "pending", identity_session_id: sessionId })
      .eq("id", userId);

    res.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error creando la verificación";
    console.error("[identity/session] error:", msg);
    res.status(500).json({ error: msg });
  }
});
