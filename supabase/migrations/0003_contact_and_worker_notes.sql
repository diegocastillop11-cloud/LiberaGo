-- LiberaGo — telefono de contacto del cliente + notas del trabajador en terreno.
-- Ambas son snapshot en la solicitud (mismo patron que client_name/worker_name,
-- no se leen desde profiles), asi que las policies existentes de requests
-- (row-level, no column-level) ya cubren lectura/escritura sin cambios.

alter table requests add column client_phone text;
alter table requests add column worker_notes text;
