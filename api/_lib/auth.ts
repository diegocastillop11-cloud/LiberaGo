import type { Request } from "express";
import { supabaseAdmin } from "./supabase.js";

export async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function requireAdmin(
  req: Request,
): Promise<{ userId: string } | { status: 401 | 403; error: string }> {
  const userId = await getAuthedUserId(req);
  if (!userId) return { status: 401, error: "No autorizado" };

  const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).single();
  if (!profile?.is_admin) return { status: 403, error: "No autorizado" };

  return { userId };
}
