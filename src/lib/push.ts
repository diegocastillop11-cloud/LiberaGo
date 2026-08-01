import { supabase } from "./supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) return { ok: false, reason: "Notificaciones no configuradas todavía." };
  if (!("PushManager" in window)) return { ok: false, reason: "Tu navegador no soporta notificaciones push." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Permiso de notificaciones denegado." };

  const registration = await registerServiceWorker();
  if (!registration) return { ok: false, reason: "No se pudo registrar el service worker." };

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, reason: "Debes iniciar sesión." };

  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });

  if (!res.ok) return { ok: false, reason: "No se pudo guardar la suscripción." };
  return { ok: true };
}
