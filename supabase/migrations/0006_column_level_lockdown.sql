-- LiberaGo — hardening pendiente desde 0002: las policies de requests
-- controlan que FILAS se pueden actualizar, no que COLUMNAS. Un cliente o
-- trabajador autenticado podia en teoria enviar un update con campos que
-- no deberia tocar (ej. price, client_phone). Este trigger cierra ese
-- hueco antes de invitar usuarios reales.
--
-- Admin: sin restriccion (ya es la unica via para reasignar/cancelar).
-- Trabajador aceptando una solicitud "solicitado": solo puede setear
-- worker_id/worker_name/status a "asignado".
-- Trabajador ya asignado: solo puede tocar locations/status/worker_notes.
-- Cliente dueno: la app nunca actualiza requests desde el cliente post-
-- creacion, asi que no se le da ningun campo editable.

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

create trigger requests_enforce_update_columns
before update on requests
for each row execute function public.enforce_requests_update_columns();
