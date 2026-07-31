-- LiberaGo — auth real (Supabase Auth / Google) + roles.
-- "Cliente" no es un rol exclusivo: cualquier usuario logueado puede pedir
-- servicios. "Trabajador" es un estado que se solicita y el admin aprueba.
-- "Admin" nunca se auto-asigna — se activa manualmente por SQL (ver
-- instrucciones aparte).

create type worker_status as enum ('none', 'pending', 'approved', 'rejected');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  worker_status worker_status not null default 'none',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Security definer: evita la recursión infinita de RLS que da chequear
-- "is_admin" con una policy que consulta la misma tabla que protege.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create policy "profiles_select_own_or_admin" on profiles for select using (
  id = auth.uid() or public.is_admin()
);

-- Crea el perfil automáticamente cuando alguien se registra (Google u otro
-- provider). No expone insert directo a profiles desde el cliente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Un cliente logueado pide ser trabajador — queda "pending" hasta que un
-- admin lo apruebe. No se puede volver a pedir si ya está pending/approved.
create or replace function public.request_worker_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set worker_status = 'pending'
  where id = auth.uid() and worker_status in ('none', 'rejected');
end;
$$;

grant execute on function public.request_worker_status() to authenticated;

-- Solo un admin puede aprobar/rechazar postulaciones de trabajador.
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
  update profiles set worker_status = new_status where id = target_user_id;
end;
$$;

grant execute on function public.set_worker_status(uuid, worker_status) to authenticated;

-- Reemplaza el RLS temporal (sin auth) por policies reales.
drop policy if exists "temp_open_services" on services;
drop policy if exists "temp_open_requests" on requests;

create policy "services_select_all" on services for select using (true);
create policy "services_admin_write" on services for all using (public.is_admin()) with check (public.is_admin());

alter table requests add column client_id uuid references auth.users(id);
alter table requests add column worker_id uuid references auth.users(id);

create policy "requests_select" on requests for select using (
  client_id = auth.uid()
  or worker_id = auth.uid()
  or (
    status = 'solicitado'
    and exists (select 1 from profiles where id = auth.uid() and worker_status = 'approved')
  )
  or public.is_admin()
);

create policy "requests_insert_own" on requests for insert with check (client_id = auth.uid());

create policy "requests_update" on requests for update using (
  client_id = auth.uid()
  or worker_id = auth.uid()
  or (
    status = 'solicitado'
    and exists (select 1 from profiles where id = auth.uid() and worker_status = 'approved')
  )
  or public.is_admin()
);

-- NOTA (hardening pendiente): estas policies controlan qué FILAS se pueden
-- tocar, no qué COLUMNAS — un cliente autenticado podría en teoría enviar
-- un update con campos que no debería tocar (ej. price). El código del
-- frontend ya no lo hace, pero falta un trigger que lo valide a nivel de
-- base de datos antes de invitar usuarios reales. Ver CLAUDE.md.
