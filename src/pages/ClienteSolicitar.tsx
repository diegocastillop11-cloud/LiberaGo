import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { Service, ServiceLocation } from "../lib/types";
import { LocationPicker, type LocationValue } from "../components/LocationPicker";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, btnGhost, inputBase, cardBase } from "../lib/ui";
import { haversineKm } from "../lib/geo";

const emptyLocation: LocationValue = { address: "", lat: null, lng: null };

export default function ClienteSolicitar() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);
  const [locationValues, setLocationValues] = useState<LocationValue[]>([]);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setServices(data as Service[]);
        setLoading(false);
      });
  }, []);

  function selectService(service: Service) {
    setSelected(service);
    setLocationValues(service.location_labels.map(() => emptyLocation));
    setPeopleCount("");
    setError(null);
  }

  function updateLocationValue(index: number, value: LocationValue) {
    setLocationValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  const estimate = useMemo(() => {
    if (!selected) return null;

    if (selected.pricing_type === "distance") {
      const a = locationValues[0];
      const b = locationValues[1];
      if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
        return { price: null as number | null, km: null as number | null };
      }
      const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
      return { price: selected.price + Math.round(km * (selected.price_per_km ?? 0)), km };
    }

    if (selected.pricing_type === "per_person") {
      const n = Number(peopleCount);
      if (!peopleCount.trim() || !Number.isFinite(n) || n < 1) {
        return { price: null as number | null, km: null as number | null };
      }
      return { price: selected.price + Math.round(n * (selected.price_per_person ?? 0)), km: null as number | null };
    }

    return { price: selected.price, km: null as number | null };
  }, [selected, locationValues, peopleCount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected || !user) return;

    const locations: ServiceLocation[] = selected.location_labels.map((label, i) => {
      const v = locationValues[i] ?? emptyLocation;
      return {
        label,
        address: v.address.trim(),
        lat: v.lat,
        lng: v.lng,
        completed_at: null,
      };
    });

    if (locations.some((l) => !l.address || l.lat == null || l.lng == null)) {
      setError("Completa todas las direcciones buscándolas o marcando el punto en el mapa.");
      return;
    }

    if (!phone.trim()) {
      setError("Ingresa un teléfono de contacto.");
      return;
    }

    const peopleCountValue = Number(peopleCount);
    if (selected.pricing_type === "per_person" && (!peopleCount.trim() || !Number.isFinite(peopleCountValue) || peopleCountValue < 1)) {
      setError("Indica la cantidad de personas.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("requests")
      .insert({
        service_id: selected.id,
        service_name: selected.name,
        price: estimate?.price ?? selected.price,
        locations,
        people_count: selected.pricing_type === "per_person" ? peopleCountValue : null,
        client_id: user.id,
        client_name: profile?.full_name ?? profile?.email ?? "Cliente",
        client_phone: phone.trim(),
        notes: notes.trim() || null,
        status: "pendiente_pago",
      })
      .select("id")
      .single();

    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }

    // Navegamos a la pantalla de seguimiento ANTES de redirigir a MercadoPago
    // (no despues) — asi, si el cliente se arrepiente y vuelve atras con el
    // navegador, aterriza en una pantalla con mensaje claro, no en este
    // formulario congelado a mitad de la redireccion (bug reportado
    // 2026-08-02). El checkout en si lo dispara RequestStatusCard al ver
    // justCreated=true — asi evitamos la carrera entre esta navegacion y el
    // fetch de startCheckout, que hacia parpadear el mensaje de "el pago no
    // se completo" antes de siquiera haber ido a MercadoPago.
    navigate(`/cliente/solicitudes/${data.id}`, { replace: true, state: { justCreated: true } });
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        actions={
          <Link to="/cliente/solicitudes" className={btnGhost}>
            Mis solicitudes
          </Link>
        }
      />

      <main className="mx-auto max-w-[720px] px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {selected ? selected.name : "¿Qué necesitas?"}
        </h1>

        {error && (
          <div className="mt-4 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {!selected ? (
          loading ? (
            <p className="mt-6 text-sm text-ink-muted">Cargando servicios…</p>
          ) : services.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">No hay servicios disponibles todavía.</p>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => selectService(service)}
                  className={`${cardBase} flex flex-col items-start gap-3 text-left transition-colors hover:border-action`}
                >
                  <div>
                    <p className="font-semibold text-ink">{service.name}</p>
                    {service.description && (
                      <p className="mt-1 text-pretty text-sm text-ink-muted">{service.description}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-data text-sm font-medium text-ink">
                    ${service.price.toLocaleString("es-CL")}
                    {service.pricing_type === "distance" &&
                      ` + $${(service.price_per_km ?? 0).toLocaleString("es-CL")}/km`}
                    {service.pricing_type === "per_person" &&
                      ` + $${(service.price_per_person ?? 0).toLocaleString("es-CL")}/persona`}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className={`${cardBase} mt-6`}>
            <button
              type="button"
              className={`${btnGhost} !px-0`}
              onClick={() => setSelected(null)}
            >
              ← Elegir otro servicio
            </button>

            <div className="mt-4 flex flex-col gap-6">
              {selected.location_labels.map((label, i) => (
                <LocationPicker
                  key={i}
                  id={`addr-${i}`}
                  label={label}
                  value={locationValues[i] ?? emptyLocation}
                  onChange={(v) => updateLocationValue(i, v)}
                />
              ))}

              {selected.pricing_type === "per_person" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="peopleCount" className="text-sm font-medium text-ink-muted">
                    Cantidad de personas
                  </label>
                  <input
                    id="peopleCount"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    className={inputBase}
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(e.target.value)}
                    placeholder="Ej. 15"
                    required
                  />
                  <p className="text-xs text-ink-muted">
                    $
                    {(selected.price_per_person ?? 0).toLocaleString("es-CL")} por persona, sobre un base de
                    ${selected.price.toLocaleString("es-CL")}.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-ink-muted">
                  Teléfono de contacto
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={inputBase}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  required
                />
                <p className="text-xs text-ink-muted">
                  Por si el trabajador necesita coordinar algo contigo.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className="text-sm font-medium text-ink-muted">
                  Notas para el trabajador (opcional)
                </label>
                <textarea
                  id="notes"
                  className={`${inputBase} min-h-20 resize-y`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Algo que el trabajador deba saber antes de aceptar"
                />
              </div>
            </div>

            <p className="mt-6 text-xs text-ink-muted">
              Al confirmar te vamos a redirigir a Mercado Pago para pagar el total. Tu solicitud recién
              se ofrece a un trabajador cuando el pago se confirma. Al pagar aceptas nuestros{" "}
              <Link to="/terminos" className="text-action underline-offset-4 hover:underline">
                Términos y Condiciones
              </Link>
              .
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="font-data text-lg font-semibold text-ink">
                {estimate?.price != null
                  ? `$${estimate.price.toLocaleString("es-CL")}`
                  : selected.pricing_type === "per_person"
                    ? "Falta la cantidad de personas"
                    : "Falta la ruta"}
                {estimate?.km != null && (
                  <span className="ml-2 text-sm font-normal text-ink-muted">
                    (~{estimate.km.toFixed(1)} km)
                  </span>
                )}
              </span>
              <button type="submit" className={btnPrimary} disabled={submitting}>
                {submitting ? "Redirigiendo a Mercado Pago…" : "Confirmar y pagar"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
