-- LiberaGo — despacho secuencial de solicitudes al trabajador (estilo Uber):
-- se ofrece a un trabajador aprobado a la vez, con una ventana de 10s (el
-- reloj lo lleva un servicio externo de scheduling, no este servidor —
-- ver api/lib/offer.ts). Si no responde o dice "Saltar", pasa al siguiente
-- de la cola. Tambien agrega push_subscriptions para las notificaciones
-- web push (PWA).

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_own" on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table requests add column offer_queue jsonb not null default '[]'::jsonb;
alter table requests add column offered_to uuid references auth.users(id);
alter table requests add column offer_expires_at timestamptz;

-- available_requests() ya no debe mostrar una solicitud a un trabajador
-- mientras le esta siendo ofrecida exclusivamente a otro.
drop function if exists public.available_requests();
create function public.available_requests()
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
  offered_to uuid,
  offer_expires_at timestamptz,
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
    r.status, r.notes, r.distance_km, r.offered_to, r.offer_expires_at,
    r.created_at, r.updated_at
  from requests r
  where r.status = 'solicitado'
    and (r.offered_to is null or r.offered_to = auth.uid())
    and exists (select 1 from profiles p where p.id = auth.uid() and p.worker_status = 'approved')
  order by r.created_at;
$$;

-- Aceptar solo vale si nadie mas tiene la oferta exclusiva en este momento.
create or replace function public.enforce_requests_update_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.worker_id is null and new.worker_id = auth.uid()
    and old.status = 'solicitado' and new.status = 'asignado'
    and exists (select 1 from profiles where id = auth.uid() and worker_status = 'approved')
    and (old.offered_to is null or old.offered_to = auth.uid())
  then
    if new.service_id is distinct from old.service_id
      or new.service_name is distinct from old.service_name
      or new.price is distinct from old.price
      or new.locations is distinct from old.locations
      or new.client_id is distinct from old.client_id
      or new.client_name is distinct from old.client_name
      or new.client_phone is distinct from old.client_phone
      or new.notes is distinct from old.notes
    then
      raise exception 'No autorizado a modificar esos campos';
    end if;
    return new;
  end if;

  if old.worker_id = auth.uid() then
    if new.service_id is distinct from old.service_id
      or new.service_name is distinct from old.service_name
      or new.price is distinct from old.price
      or new.client_id is distinct from old.client_id
      or new.client_name is distinct from old.client_name
      or new.client_phone is distinct from old.client_phone
      or new.notes is distinct from old.notes
      or new.worker_id is distinct from old.worker_id
      or new.worker_name is distinct from old.worker_name
    then
      raise exception 'No autorizado a modificar esos campos';
    end if;
    return new;
  end if;

  raise exception 'No autorizado a modificar esta solicitud';
end;
$$;

-- El despacho (a quien se le ofrece primero) lo decide el backend despues de
-- creada la fila (via webhook), nunca el cliente al insertar.
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
    or new.offered_to is not null
    or new.offer_queue is distinct from '[]'::jsonb
    or new.offer_expires_at is not null
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
