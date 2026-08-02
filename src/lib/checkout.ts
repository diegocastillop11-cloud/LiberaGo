import { supabase } from "./supabase";

// Compartido entre ClienteSolicitar (primer intento, justo despues de crear
// la solicitud) y el boton "Pagar ahora" de RequestStatusCard (reintento si
// el cliente abandono o rechazo el pago). Redirige de verdad (window.location)
// porque Checkout Pro es una pagina hosteada por MercadoPago, no algo que se
// pueda mostrar dentro de la app.
export async function startCheckout(requestId: string): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "Tu sesión expiró, vuelve a iniciar sesión.";

  const res = await fetch(`/api/requests/${requestId}/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json();
  if (!res.ok) return json.error ?? "No se pudo iniciar el pago";

  window.location.href = json.checkoutUrl;
  return null;
}

// Cancela una solicitud propia que todavia esta en 'pendiente_pago' (nunca
// se cobro nada). Usado por el boton "Cancelar" para volver a elegir
// servicio o simplemente salir sin pagar.
export async function cancelUnpaidRequest(requestId: string): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "Tu sesión expiró, vuelve a iniciar sesión.";

  const res = await fetch(`/api/requests/${requestId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json();
  if (!res.ok) return json.error ?? "No se pudo cancelar";
  return null;
}

// SOLO PRUEBAS — el backend rechaza esto en producción (VERCEL_ENV) sin
// importar si el botón queda visible acá.
export async function skipPaymentForTesting(requestId: string): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "Tu sesión expiró, vuelve a iniciar sesión.";

  const res = await fetch(`/api/requests/${requestId}/skip-payment-test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json();
  if (!res.ok) return json.error ?? "No se pudo saltar el pago";
  return null;
}
