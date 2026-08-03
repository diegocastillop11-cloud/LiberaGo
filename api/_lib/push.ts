import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

export const pushConfigured = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:soporte@liberago.cl",
    vapidPublicKey!,
    vapidPrivateKey!,
  );
}

export async function sendPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!pushConfigured) return;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}
