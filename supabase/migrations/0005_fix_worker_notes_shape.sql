-- LiberaGo — corrige filas de worker_notes que quedaron como string/objeto
-- suelto (de un intento anterior de la 0004 sin el jsonb_build_array), en
-- vez de la lista que el frontend espera.

update requests
set worker_notes = case
  when jsonb_typeof(worker_notes) = 'string'
    then jsonb_build_array(jsonb_build_object('text', worker_notes #>> '{}', 'created_at', now()))
  when jsonb_typeof(worker_notes) = 'object'
    then jsonb_build_array(worker_notes)
  else worker_notes
end
where jsonb_typeof(worker_notes) <> 'array';
