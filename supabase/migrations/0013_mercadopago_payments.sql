-- LiberaGo — columnas y triggers para el flujo de pago con MercadoPago
-- (Checkout Pro, mismo patron que Ergania: preferencia + webhook con firma
-- HMAC, sin SDK, solo fetch directo a la API de MP).

alter table requests add column mp_preference_id text;
alter table requests add column mp_payment_id text;
alter table requests add column paid_at timestamptz;
alter table requests add column refunded_at timestamptz;
alter table requests add column refund_amount integer;

-- El backend crea la fila en 'pendiente_pago' (nunca 'solicitado' directo);
-- solo el webhook de pago la pasa a 'solicitado' una vez que MercadoPago
-- confirma el cobro (ver enforce_requests_update_columns mas abajo).
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
    new.price := svc.price + round(km * svc.price_per_km);
  else
    new.distance_km := null;
    new.price := svc.price;
  end if;

  return new;
end;
$$;

-- El webhook de pago corre con la service_role key (sin sesion de usuario)
-- y necesita poder pasar pendiente_pago -> solicitado. auth.role() para esa
-- key es 'service_role' (nunca llega al frontend, ver CLAUDE.md), asi que
-- se trata igual que is_admin(): un bypass explicito del trigger de
-- columnas, no de RLS (RLS ya no aplica para service_role via BYPASSRLS).
create or replace function public.enforce_requests_update_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
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
