-- LiberaGo — pago a trabajadores es manual: el admin transfiere afuera de
-- la app y después registra el pago acá para llevar el acumulado
-- ganado/pagado/pendiente por trabajador (60% trabajador / 40% admin por
-- servicio completado). Nunca se integra un payout automático de
-- MercadoPago.

create table worker_payouts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references auth.users(id),
  amount integer not null,
  request_ids uuid[] not null,
  paid_at timestamptz not null default now(),
  paid_by uuid not null references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

alter table worker_payouts enable row level security;

-- Igual que profiles (ver 0002): sin policy de insert/update/delete — solo
-- el backend con supabaseAdmin (service_role, bypassa RLS) escribe acá.
create policy "worker_payouts_select" on worker_payouts for select using (
  worker_id = auth.uid() or public.is_admin()
);
