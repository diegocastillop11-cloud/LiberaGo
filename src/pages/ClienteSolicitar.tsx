import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { Service, ServiceLocation } from "../lib/types";
import { LocationPicker, type LocationValue } from "../components/LocationPicker";
import { AppHeader } from "../components/AppHeader";
import { btnPrimary, btnGhost, inputBase, cardBase } from "../lib/ui";

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
    setError(null);
  }

  function updateLocationValue(index: number, value: LocationValue) {
    setLocationValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

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

    setSubmitting(true);
    const { data, error } = await supabase
      .from("requests")
      .insert({
        service_id: selected.id,
        service_name: selected.name,
        price: selected.price,
        locations,
        client_id: user.id,
        client_name: profile?.full_name ?? profile?.email ?? "Cliente",
        client_phone: phone.trim(),
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/cliente/solicitudes/${data.id}`);
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
                  className={`${cardBase} flex items-center justify-between gap-4 text-left transition-colors hover:border-action`}
                >
                  <div>
                    <p className="font-semibold text-ink">{service.name}</p>
                    {service.description && (
                      <p className="mt-1 text-pretty text-sm text-ink-muted">{service.description}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-data text-sm font-medium text-ink">
                    ${service.price.toLocaleString("es-CL")}
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

            <div className="mt-6 flex items-center justify-between">
              <span className="font-data text-lg font-semibold text-ink">
                ${selected.price.toLocaleString("es-CL")}
              </span>
              <button type="submit" className={btnPrimary} disabled={submitting}>
                {submitting ? "Enviando…" : "Confirmar solicitud"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
