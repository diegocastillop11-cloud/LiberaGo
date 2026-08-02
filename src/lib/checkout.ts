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
