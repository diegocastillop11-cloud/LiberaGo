-- LiberaGo — worker_notes pasa de texto unico a una lista de entradas
-- (mismo patron jsonb que locations), para que el trabajador pueda ir
-- agregando notas sin borrar las anteriores.

alter table requests
  alter column worker_notes type jsonb
  using (
    case
      when worker_notes is null or worker_notes = '' then '[]'::jsonb
      else jsonb_build_array(jsonb_build_object('text', worker_notes, 'created_at', now()))
    end
  );

alter table requests alter column worker_notes set default '[]'::jsonb;
alter table requests alter column worker_notes set not null;
