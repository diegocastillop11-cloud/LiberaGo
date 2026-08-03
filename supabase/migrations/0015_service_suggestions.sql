-- Cola de sugerencias de servicios nuevos: cualquiera (con o sin sesión)
-- puede sugerir un servicio que no existe en el catálogo. El admin las
-- revisa y aprueba/rechaza. Sin policy de insert: el único camino de
-- escritura es el backend (supabaseAdmin, service_role bypassea RLS) —
-- así también pueden sugerir usuarios sin sesión. Sin policy de update:
-- solo vía la RPC de abajo (security definer, corre como owner).

create type service_suggestion_status as enum ('pending', 'approved', 'rejected');

create table service_suggestions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id),
  requester_name text not null,
  requester_contact text not null,
  service_name text not null,
  description text not null,
  status service_suggestion_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table service_suggestions enable row level security;

create policy "service_suggestions_select_admin" on service_suggestions
  for select using (public.is_admin());

create or replace function public.review_service_suggestion(
  target_id uuid,
  decision service_suggestion_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if decision = 'pending' then
    raise exception 'Decisión inválida';
  end if;
  update service_suggestions set status = decision, reviewed_at = now() where id = target_id;
end;
$$;

grant execute on function public.review_service_suggestion(uuid, service_suggestion_status) to authenticated;
