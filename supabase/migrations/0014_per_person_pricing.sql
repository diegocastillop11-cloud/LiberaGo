-- LiberaGo — nuevo tipo de cobro "por persona" (ej. fila virtual, asados
-- para eventos): el admin fija un precio base + un monto por persona: el
-- cliente indica cuantas personas y el precio se calcula solo, mismo
-- patron que 0008 (distance) pero con una cantidad que el cliente ingresa
-- en vez de calcularse por coordenadas. A diferencia de "distance", este
-- tipo SI pide direccion(es) — usa location_labels igual que "fixed".

alter table services drop constraint if exists services_pricing_type_check;
alter table services add constraint services_pricing_type_check
  check (pricing_type in ('fixed', 'distance', 'per_person'));

alter table services add column if not exists price_per_person integer
  check (price_per_person is null or price_per_person >= 0);

-- La constraint original de 0008 exigia price_per_km para cualquier tipo
-- distinto de 'fixed' (incluiria a 'per_person' incorrectamente). Se separa
-- en una constraint por tipo.
alter table services drop constraint if exists services_price_per_km_required;
alter table services add constraint services_price_per_km_required
  check (pricing_type <> 'distance' or price_per_km is not null);
alter table services add constraint services_price_per_person_required
  check (pricing_type <> 'per_person' or price_per_person is not null);

alter table requests add column if not exists people_count integer
  check (people_count is null or people_count > 0);

create or replace function public.enforce_requests_insert_columns()
returns trigger
language plpgsql
as $$
declare
  svc services%rowtype;
  lat1 numeric;
  lng1 numeric;
  lat2 numeric;
  lng2 numeric;
  km numeric;
begin
  if public.is_admin() then
    return new;
  end if;

  if new.worker_id is not null
    or new.worker_name is not null
    or new.status is distinct from 'pendiente_pago'
    or new.worker_notes is distinct from '[]'::jsonb
    or new.offered_to is not null
    or new.offer_queue is distinct from '[]'::jsonb
    or new.offer_expires_at is not null
    or new.mp_preference_id is not null
    or new.mp_payment_id is not null
    or new.paid_at is not null
  then
    raise exception 'No autorizado a fijar esos campos al crear una solicitud';
  end if;

  select * into svc from services where id = new.service_id;
  if not found or not svc.active then
    raise exception 'Servicio invalido';
  end if;

  if svc.pricing_type = 'distance' then
    if jsonb_array_length(new.locations) <> 2
      or (new.locations -> 0 ->> 'lat') is null or (new.locations -> 0 ->> 'lng') is null
      or (new.locations -> 1 ->> 'lat') is null or (new.locations -> 1 ->> 'lng') is null
    then
      raise exception 'Este servicio necesita punto de recogida y de llegada con coordenadas';
    end if;

    lat1 := (new.locations -> 0 ->> 'lat')::numeric;
    lng1 := (new.locations -> 0 ->> 'lng')::numeric;
    lat2 := (new.locations -> 1 ->> 'lat')::numeric;
    lng2 := (new.locations -> 1 ->> 'lng')::numeric;

    km := 6371 * acos(
      least(1, greatest(-1,
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
        + sin(radians(lat1)) * sin(radians(lat2))
      ))
    );

    new.distance_km := round(km, 2);
    new.people_count := null;
    new.price := svc.price + round(km * svc.price_per_km);
  elsif svc.pricing_type = 'per_person' then
    if new.people_count is null or new.people_count < 1 then
      raise exception 'Este servicio necesita indicar la cantidad de personas';
    end if;

    new.distance_km := null;
    new.price := svc.price + (new.people_count * svc.price_per_person);
  else
    new.distance_km := null;
    new.people_count := null;
    new.price := svc.price;
  end if;

  return new;
end;
$$;
