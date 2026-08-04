-- LiberaGo — "Trabajar con nosotros" desde la landing no debe exigir login:
-- se guarda como lead (nombre/email/teléfono/mensaje) y cuando esa persona
-- eventualmente inicia sesión con ese MISMO correo (con cuenta nueva o
-- existente), se convierte sola en una postulación real
-- (worker_status='pending'), sin que el admin tenga que hacer nada.
--
-- A diferencia del intent de localStorage (ver AuthContext.tsx, tuvo un bug
-- de fuga entre cuentas), acá la conciliación compara contra el email real
-- y verificado de la sesión (profiles.email, viene de Supabase Auth, no lo
-- edita el usuario) — no hay forma de que le toque a la cuenta equivocada.

create table worker_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'converted')),
  converted_profile_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  converted_at timestamptz
);

alter table worker_leads enable row level security;

create policy "worker_leads_select_admin" on worker_leads for select using (public.is_admin());

-- Sin policy de insert: el único camino de escritura es el backend
-- (supabaseAdmin, service_role bypassea RLS) — mismo patrón que
-- service_suggestions (0015), así puede postular alguien sin sesión.

create or replace function public.claim_worker_lead()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_email text;
  lead_id uuid;
begin
  select email into my_email from profiles where id = auth.uid();
  if my_email is null then
    return;
  end if;

  select id into lead_id
  from worker_leads
  where status = 'pending' and lower(trim(email)) = lower(trim(my_email))
  order by created_at
  limit 1;

  if lead_id is null then
    return;
  end if;

  update worker_leads
  set status = 'converted', converted_profile_id = auth.uid(), converted_at = now()
  where id = lead_id;

  update profiles
  set worker_status = 'pending'
  where id = auth.uid() and worker_status = 'none';
end;
$$;

grant execute on function public.claim_worker_lead() to authenticated;
