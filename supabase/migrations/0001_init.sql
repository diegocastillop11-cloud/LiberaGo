-- LiberaGo — schema inicial: catálogo de servicios + solicitudes.
-- Sin auth todavía (usuario de prueba fijo, ver CLAUDE.md). Las policies de
-- este archivo son deliberadamente abiertas — hay que reemplazarlas por
-- policies basadas en auth.uid() antes de invitar usuarios reales.

create extension if not exists pgcrypto;

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0),
  location_labels jsonb not null default '["Dirección del servicio"]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create type request_status as enum ('solicitado', 'asignado', 'en_curso', 'completado', 'cancelado');

create table requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  service_name text not null,
  price integer not null,
  locations jsonb not null default '[]'::jsonb,
  client_name text not null,
  worker_name text,
  status request_status not null default 'solicitado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger requests_set_updated_at
before update on requests
for each row execute function set_updated_at();

alter table services enable row level security;
alter table requests enable row level security;

-- TEMPORAL — sin auth todavía. Reemplazar por policies con auth.uid() por rol
-- (admin/cliente/trabajador) antes de invitar usuarios reales.
create policy "temp_open_services" on services for all using (true) with check (true);
create policy "temp_open_requests" on requests for all using (true) with check (true);

-- Realtime: el trabajador necesita ver solicitudes nuevas sin refrescar.
alter publication supabase_realtime add table requests;
