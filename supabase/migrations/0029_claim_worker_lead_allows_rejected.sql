-- LiberaGo — claim_worker_lead() (0028) solo reactivaba cuentas con
-- worker_status='none', pero request_worker_status() (0002) siempre
-- permitió re-postular también desde 'rejected'. Si una cuenta de prueba
-- quedó en 'rejected' (por ej. al limpiar los leaks de localStorage) y esa
-- persona vuelve a postular desde /trabaja-con-nosotros, el lead se
-- guardaba pero nunca se convertía al loguear — silencioso, sin error.
-- Alinea la condición con request_worker_status().

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
  where id = auth.uid() and worker_status in ('none', 'rejected');
end;
$$;
