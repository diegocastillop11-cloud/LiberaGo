-- LiberaGo — cierra 3 huecos encontrados en revision de seguridad de la
-- feature de admin/solicitudes (2026-07-31 noche):
--
-- 1) El trigger de 0006 dejaba que un CLIENTE se auto-asignara como
--    trabajador de su propia solicitud (nunca chequeaba worker_status).
-- 2) client_phone/client_name viajaban a CUALQUIER trabajador aprobado
--    para solicitudes "solicitado" que todavia no acepto (RLS es solo a
--    nivel de fila, no de columna) — se resuelve moviendo el listado de
--    "disponibles" a un RPC security definer que oculta esos campos hasta
--    que el trabajador se asigna, y se le quita a la policy de select el
--    acceso directo a la tabla para ese caso.
-- 3) El INSERT de requests seguia sin control de columnas (huerfano desde
--    0002): un cliente podia crear una solicitud ya "completado", con
--    worker_id ajeno, o con price negativo.

-- 1) Fix Vuln 1: exige worker aprobado para auto-asignarse.
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

-- 2) Fix Vuln 2: quita a un trabajador aprobado el acceso directo a filas
-- "solicitado" (eso viajaba client_phone/client_name completos); ahora solo
-- se ven via el RPC de abajo, que los oculta.
drop policy if exists "requests_select" on requests;
create policy "requests_select" on requests for select using (
  client_id = auth.uid()
  or worker_id = auth.uid()
  or public.is_admin()
);

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
    r.status, r.notes, r.created_at, r.updated_at
  from requests r
  where r.status = 'solicitado'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.worker_status = 'approved')
  order by r.created_at;
$$;

grant execute on function public.available_requests() to authenticated;

-- 3) Fix Vuln 3 (preexistente desde 0002, cerrado ahora que estamos en modo
-- seguridad): price nunca puede ser negativo, y una solicitud siempre nace
-- "solicitado" sin trabajador — ni el cliente ni nadie mas puede fijarlo al
-- crearla.
alter table requests add constraint requests_price_check check (price >= 0);

create or replace function public.enforce_requests_insert_columns()
returns trigger
language plpgsql
as $$
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

  return new;
end;
$$;

create trigger requests_enforce_insert_columns
before insert on requests
for each row execute function public.enforce_requests_insert_columns();
