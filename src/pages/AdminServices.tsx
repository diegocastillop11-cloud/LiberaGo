import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import type { PricingType, Service } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { AdminNav } from "../components/AdminNav";
import { btnPrimary, btnGhost, btnDanger, inputBase, cardBase } from "../lib/ui";

const DISTANCE_LABELS = ["Punto de recogida", "Punto de llegada"];

const emptyForm = {
  id: null as string | null,
  name: "",
  description: "",
  price: "",
  pricingType: "fixed" as PricingType,
  pricePerKm: "",
  pricePerPerson: "",
  locationLabels: ["Dirección del servicio"],
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadServices() {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setServices(data as Service[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function startEdit(service: Service) {
    setForm({
      id: service.id,
      name: service.name,
      description: service.description ?? "",
      price: String(service.price),
      pricingType: service.pricing_type,
      pricePerKm: service.price_per_km != null ? String(service.price_per_km) : "",
      pricePerPerson: service.price_per_person != null ? String(service.price_per_person) : "",
      locationLabels: service.location_labels,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function setPricingType(pricingType: PricingType) {
    setForm((f) => ({
      ...f,
      pricingType,
      locationLabels: pricingType === "distance" ? DISTANCE_LABELS : f.locationLabels,
    }));
  }

  function updateLocationLabel(index: number, value: string) {
    setForm((f) => ({
      ...f,
      locationLabels: f.locationLabels.map((l, i) => (i === index ? value : l)),
    }));
  }

  function addLocationLabel() {
    setForm((f) => ({ ...f, locationLabels: [...f.locationLabels, ""] }));
  }

  function removeLocationLabel(index: number) {
    setForm((f) => ({
      ...f,
      locationLabels: f.locationLabels.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const locationLabels =
      form.pricingType === "distance"
        ? DISTANCE_LABELS
        : form.locationLabels.map((l) => l.trim()).filter(Boolean);

    if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
      setError("Completa nombre y un precio válido.");
      return;
    }

    let pricePerKm: number | null = null;
    if (form.pricingType === "distance") {
      pricePerKm = Number(form.pricePerKm);
      if (!Number.isFinite(pricePerKm) || pricePerKm < 0) {
        setError("Completa un precio por km válido.");
        return;
      }
    }

    let pricePerPerson: number | null = null;
    if (form.pricingType === "per_person") {
      pricePerPerson = Number(form.pricePerPerson);
      if (!Number.isFinite(pricePerPerson) || pricePerPerson < 0) {
        setError("Completa un precio por persona válido.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      pricing_type: form.pricingType,
      price_per_km: pricePerKm,
      price_per_person: pricePerPerson,
      location_labels: locationLabels,
    };

    const { error } = form.id
      ? await supabase.from("services").update(payload).eq("id", form.id)
      : await supabase.from("services").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);
    resetForm();
    loadServices();
  }

  async function toggleActive(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);
    if (error) {
      setError(error.message);
      return;
    }
    loadServices();
  }

  async function deleteService(service: Service) {
    if (!window.confirm(`¿Eliminar "${service.name}"? No se puede deshacer.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    if (error) {
      setError(error.message);
      return;
    }
    loadServices();
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader
        subtitle="Admin — Servicios"
        maxWidth={900}
        actions={<AdminNav current="/admin" />}
      />

      <main className="mx-auto max-w-[900px] px-6 py-10">
        {error && (
          <div className="mb-6 rounded-sm border border-error bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`${cardBase} mb-10`}>
          <h2 className="font-display text-lg font-semibold text-ink">
            {form.id ? "Editar servicio" : "Nuevo servicio"}
          </h2>

          <div className="mt-5 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-muted">Cómo se cobra</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPricingType("fixed")}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  form.pricingType === "fixed"
                    ? "bg-action text-on-action"
                    : "bg-surface-2 text-ink-muted hover:text-ink"
                }`}
              >
                Precio fijo
              </button>
              <button
                type="button"
                onClick={() => setPricingType("distance")}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  form.pricingType === "distance"
                    ? "bg-action text-on-action"
                    : "bg-surface-2 text-ink-muted hover:text-ink"
                }`}
              >
                Por distancia (recogida → destino)
              </button>
              <button
                type="button"
                onClick={() => setPricingType("per_person")}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  form.pricingType === "per_person"
                    ? "bg-action text-on-action"
                    : "bg-surface-2 text-ink-muted hover:text-ink"
                }`}
              >
                Por persona
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-ink-muted">
                Nombre
              </label>
              <input
                id="name"
                className={inputBase}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Revisión técnica"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="price" className="text-sm font-medium text-ink-muted">
                {form.pricingType === "distance" || form.pricingType === "per_person"
                  ? "Precio base (CLP)"
                  : "Precio (CLP)"}
              </label>
              <input
                id="price"
                className={inputBase}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="14500"
                required
              />
            </div>
            {form.pricingType === "distance" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pricePerKm" className="text-sm font-medium text-ink-muted">
                  Precio por km (CLP)
                </label>
                <input
                  id="pricePerKm"
                  className={inputBase}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.pricePerKm}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerKm: e.target.value }))}
                  placeholder="500"
                  required
                />
              </div>
            )}
            {form.pricingType === "per_person" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pricePerPerson" className="text-sm font-medium text-ink-muted">
                  Precio por persona (CLP)
                </label>
                <input
                  id="pricePerPerson"
                  className={inputBase}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.pricePerPerson}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerPerson: e.target.value }))}
                  placeholder="10000"
                  required
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-ink-muted">
              Descripción (opcional)
            </label>
            <textarea
              id="description"
              className={`${inputBase} min-h-20 resize-y`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Qué incluye este servicio"
            />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink-muted">Direcciones que pide este servicio</p>
            {form.pricingType === "distance" ? (
              <p className="mt-1 text-pretty text-xs text-ink-muted">
                Este servicio siempre pide "Punto de recogida" y "Punto de llegada" — el
                precio se calcula solo, según la distancia entre ambos.
              </p>
            ) : (
              <>
                <p className="mt-1 text-pretty text-xs text-ink-muted">
                  La mayoría necesita solo una. Servicios con varias paradas (ej. revisión
                  técnica) pueden pedir "Retiro del vehículo", "Lugar de la revisión",
                  "Entrega". Si el servicio no es presencial (ej. una fila virtual), quítalas
                  todas — no se pedirá ninguna dirección.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {form.locationLabels.map((label, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={inputBase}
                        value={label}
                        onChange={(e) => updateLocationLabel(i, e.target.value)}
                        placeholder={`Etiqueta ${i + 1}, ej. "Dirección del servicio"`}
                      />
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => removeLocationLabel(i)}
                        aria-label={`Quitar dirección ${i + 1}`}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  {form.locationLabels.length === 0 && (
                    <p className="text-xs text-ink-muted">Sin direcciones — servicio remoto.</p>
                  )}
                </div>
                <button
                  type="button"
                  className={`${btnGhost} mt-2 !justify-start !px-0`}
                  onClick={addLocationLabel}
                >
                  + Agregar otra dirección
                </button>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : form.id ? "Guardar cambios" : "Crear servicio"}
            </button>
            {form.id && (
              <button type="button" className={btnGhost} onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <h2 className="font-display text-lg font-semibold text-ink">Servicios</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Cargando…</p>
        ) : services.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Todavía no hay servicios creados.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {services.map((service) => (
              <div key={service.id} className={`${cardBase} flex items-start justify-between gap-4`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{service.name}</h3>
                    {!service.active && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                        Inactivo
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="mt-1 text-pretty text-sm text-ink-muted">{service.description}</p>
                  )}
                  <p className="mt-2 font-data text-sm font-medium text-ink">
                    ${service.price.toLocaleString("es-CL")}
                    {service.pricing_type === "distance" &&
                      ` + $${(service.price_per_km ?? 0).toLocaleString("es-CL")}/km`}
                    {service.pricing_type === "per_person" &&
                      ` + $${(service.price_per_person ?? 0).toLocaleString("es-CL")}/persona`}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {service.pricing_type === "distance"
                      ? "Por distancia — punto de recogida y de llegada"
                      : service.location_labels.length > 0
                        ? service.location_labels.join(" · ")
                        : "Servicio remoto (sin dirección)"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                  <button className={btnGhost} onClick={() => startEdit(service)}>
                    Editar
                  </button>
                  <button className={btnGhost} onClick={() => toggleActive(service)}>
                    {service.active ? "Desactivar" : "Activar"}
                  </button>
                  <button className={btnDanger} onClick={() => deleteService(service)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
