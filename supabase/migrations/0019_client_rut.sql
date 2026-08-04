-- LiberaGo — verificación de identidad asimétrica: el trabajador entra a
-- espacios del cliente (riesgo físico) y se verifica completo con Didit
-- (0016/0017). El cliente ya paga por adelantado vía MercadoPago (el riesgo
-- financiero está cubierto), así que para él alcanza con declarar su
-- RUT/DNI — un dato de identificación/trazabilidad para disputas, no una
-- verificación biométrica. Ver CLAUDE.md T&C sección 3 para la letra exacta.
--
-- Esto reemplaza el gate de la 2da solicitud: antes exigía
-- identity_status = 'verified' (Didit), ahora exige rut is not null.
-- identity_status/identity_session_id en profiles quedan como
-- exclusivos del flujo de trabajador desde ahora.

alter table profiles add column rut text;

-- profiles no tiene policy de UPDATE (a propósito, ver 0002) — este RPC es
-- la única forma de que alguien toque su propio rut. Sin validación de
-- dígito verificador acá a propósito: la validación de formato vive en el
-- frontend (src/lib/rut.ts), igual que el resto de los campos de contacto
-- de esta app (client_phone, etc.) — este RPC solo persiste.
create or replace function public.set_own_rut(new_rut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set rut = nullif(trim(new_rut), '') where id = auth.uid();
end;
$$;

grant execute on function public.set_own_rut(text) to authenticated;

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
    and not exists (select 1 from profiles where id = auth.uid() and rut is not null)
  then
    raise exception 'Ingresa tu RUT/DNI antes de tu segunda solicitud';
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
