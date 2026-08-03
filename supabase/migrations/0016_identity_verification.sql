-- LiberaGo — verificacion de identidad (KYC con Didit) para cliente y
-- trabajador. Un solo check por persona en profiles (no por rol): si alguien
-- se verifica como cliente y despues postula como trabajador, no repite el
-- proceso.
--
-- No guardamos documento ni RUN crudo aca — solo el veredicto y la
-- referencia a la sesion de Didit (evita que la DB propia se vuelva deposito
-- de datos sensibles; el documento en si vive en Didit).
--
-- Gates:
-- 1) Trabajador: set_worker_status() no deja aprobar (-> 'approved') si el
--    perfil no tiene identity_status = 'verified'.
-- 2) Cliente: la primera solicitud NO se bloquea (es la "primera cosa
--    visible" de Fase 0 — CLAUDE.md). Desde la segunda en adelante,
--    enforce_requests_insert_columns exige identity_status = 'verified'.
--    El umbral (1 solicitud previa) es el unico numero magico de esta
--    migracion — cambiarlo es una migracion nueva, no una env var (no vale
--    la pena una tabla de configuracion para un solo entero).

create type identity_status as enum ('none', 'pending', 'verified', 'declined');

alter table profiles add column identity_status identity_status not null default 'none';
alter table profiles add column identity_session_id text;
alter table profiles add column identity_verified_at timestamptz;

-- 1) Gate de trabajador: aprobar exige identidad verificada.
create or replace function public.set_worker_status(target_user_id uuid, new_status worker_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if new_status = 'approved' and not exists (
    select 1 from profiles where id = target_user_id and identity_status = 'verified'
  ) then
    raise exception 'El trabajador debe verificar su identidad antes de ser aprobado';
  end if;

  update profiles set worker_status = new_status where id = target_user_id;
end;
$$;

-- 2) Gate de cliente: desde la 2da solicitud, exige identidad verificada.
-- Mismo cuerpo que 0013, solo se agrega el chequeo al principio.
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

  if (select count(*) from requests where client_id = auth.uid()) >= 1
    and not exists (select 1 from profiles where id = auth.uid() and identity_status = 'verified')
  then
    raise exception 'Verifica tu identidad antes de tu segunda solicitud';
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
    new.price := svc.price + round(km * svc.price_per_km);
  else
    new.distance_km := null;
    new.price := svc.price;
  end if;

  return new;
end;
$$;
