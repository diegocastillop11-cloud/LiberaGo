-- LiberaGo — eliminación de cuenta como borrado lógico: se conserva el
-- registro completo (nombre, RUT, motivo) para trazabilidad de pagos y
-- reembolsos ya hechos — nunca hard-delete.

alter table profiles add column deleted_at timestamptz;
alter table profiles add column deletion_reason text;

-- profiles no tiene policy de UPDATE (ver 0002) — este RPC es la única
-- forma de que alguien elimine (lógicamente) su propia cuenta. Se pide el
-- RUT como confirmación (no una contraseña — no todos los usuarios entran
-- con email/password, hay login con Google) y un motivo obligatorio,
-- visible después para el admin en /admin/usuarios.
create or replace function public.request_account_deletion(confirm_rut text, motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_motivo text := nullif(trim(motivo), '');
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
      and rut is not null
      and upper(regexp_replace(rut, '[^0-9kK]', '', 'g'))
        = upper(regexp_replace(coalesce(confirm_rut, ''), '[^0-9kK]', '', 'g'))
  ) then
    raise exception 'El RUT no coincide con el de tu cuenta';
  end if;

  if clean_motivo is null then
    raise exception 'Indica un motivo para eliminar tu cuenta';
  end if;

  if exists (
    select 1 from requests
    where (client_id = auth.uid() or worker_id = auth.uid())
      and status in ('asignado', 'en_curso')
  ) then
    raise exception 'No puedes eliminar tu cuenta mientras tengas un servicio asignado o en curso';
  end if;

  if (select is_admin from profiles where id = auth.uid()) then
    raise exception 'Quita tus permisos de administrador antes de eliminar tu cuenta';
  end if;

  update profiles
  set deleted_at = now(), deletion_reason = clean_motivo
  where id = auth.uid();
end;
$$;

grant execute on function public.request_account_deletion(text, text) to authenticated;

-- Redefinición idéntica a 0010_available_requests_admin_bypass.sql, solo
-- agrega "and p.deleted_at is null" — un trabajador con la cuenta
-- eliminada no debe seguir viendo/recibiendo solicitudes nuevas.
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
    and (
      public.is_admin()
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.worker_status = 'approved' and p.deleted_at is null
      )
    )
  order by r.created_at;
$$;
