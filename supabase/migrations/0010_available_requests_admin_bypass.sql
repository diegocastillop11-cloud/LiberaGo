-- LiberaGo — RequireAuth deja pasar a los admins a /trabajador sin exigir
-- worker_status='approved' (igual que el resto del proyecto trata a
-- is_admin() como bypass universal), pero available_requests() solo
-- chequeaba worker_status, dejando la pagina vacia para un admin que no es
-- tambien trabajador aprobado. Se agrega el mismo bypass que ya usan las
-- policies/triggers de requests.

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
      or exists (select 1 from profiles p where p.id = auth.uid() and p.worker_status = 'approved')
    )
  order by r.created_at;
$$;
