-- LiberaGo — el admin necesita poder eliminar o bloquear una cuenta ajena
-- (además del borrado lógico que ya podía hacer el propio usuario en
-- 0021). Bloquear es la acción reversible/blanda (para investigar un
-- reclamo, por ejemplo); eliminar es el mismo borrado lógico de 0021 pero
-- disparado por un admin, no por el dueño de la cuenta.

alter table profiles add column blocked_at timestamptz;
alter table profiles add column blocked_reason text;

create or replace function public.admin_set_blocked(target_user_id uuid, blocked boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'No puedes bloquearte a ti mismo';
  end if;

  update profiles
  set
    blocked_at = case when blocked then now() else null end,
    blocked_reason = case when blocked then nullif(trim(reason), '') else null end
  where id = target_user_id;
end;
$$;

grant execute on function public.admin_set_blocked(uuid, boolean, text) to authenticated;

create or replace function public.admin_delete_account(target_user_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_reason text := nullif(trim(reason), '');
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'No puedes eliminarte a ti mismo desde acá';
  end if;

  if clean_reason is null then
    raise exception 'Indica un motivo para eliminar la cuenta';
  end if;

  update profiles
  set deleted_at = now(), deletion_reason = clean_reason
  where id = target_user_id;
end;
$$;

grant execute on function public.admin_delete_account(uuid, text) to authenticated;

-- Un trabajador bloqueado tampoco debe seguir viendo/recibiendo
-- solicitudes nuevas — mismo motivo que el filtro de deleted_at en 0021.
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
        where p.id = auth.uid()
          and p.worker_status = 'approved'
          and p.deleted_at is null
          and p.blocked_at is null
      )
    )
  order by r.created_at;
$$;
