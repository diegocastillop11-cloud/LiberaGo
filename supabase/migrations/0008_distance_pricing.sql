-- LiberaGo — servicios con precio por distancia (recogida -> destino), ej.
-- "te paso a buscar y te dejo en otro lado". El admin define un precio base
-- + precio por km al crear el servicio; el cliente pide exactamente 2
-- direcciones (recogida, destino) y el precio se calcula en linea recta
-- (haversine, sin costo de API de ruteo — decision explicita del usuario,
-- ver CLAUDE.md sobre mapas). El calculo REAL y autoritativo se hace en
-- este trigger de insert, no confia en lo que mande el cliente — el
-- frontend solo muestra una estimacion con la misma formula.

alter table services add column pricing_type text not null default 'fixed'
  check (pricing_type in ('fixed', 'distance'));
alter table services add column price_per_km integer
  check (price_per_km is null or price_per_km >= 0);
alter table services add constraint services_price_per_km_required
  check (pricing_type = 'fixed' or price_per_km is not null);

alter table requests add column distance_km numeric;

-- available_requests() ya existia (0007) pero no conocia distance_km todavia.
create or replace function public.available_requests()
returns table (
  id uuid,
  service_id uuid,
  service_name text,
  price integer,
  locations jsonb,
  client_id uuid,
  client_name text,
  client_phone text,
  worker_id uuid,
  worker_name text,
  worker_notes jsonb,
  status request_status,
  notes text,
  distance_km numeric,
  created_at timestamptz,
  updated_at timestamptz
)
security definer
set search_path = public
stable
language sql
as $$
  select
    r.id, r.service_id, r.service_name, r.price, r.locations,
    r.client_id, null::text as client_name, null::text as client_phone,
    r.worker_id, r.worker_name, r.worker_notes,
    r.status, r.notes, r.distance_km, r.created_at, r.updated_at
  from requests r
  where r.status = 'solicitado'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.worker_status = 'approved')
  order by r.created_at;
$$;

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
    or new.status is distinct from 'solicitado'
    or new.worker_notes is distinct from '[]'::jsonb
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
    new.price := svc.price + round(km * svc.price_per_km);
  else
    new.distance_km := null;
    new.price := svc.price;
  end if;

  return new;
end;
$$;
