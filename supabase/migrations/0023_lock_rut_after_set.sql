-- LiberaGo — el RUT se declara una sola vez y nunca se modifica después
-- (dato de identificación/trazabilidad para disputas, ver 0019) — permitir
-- cambiarlo abriría una forma de que alguien reclame una identidad distinta
-- después de haber usado la app con la primera. set_own_rut() ahora solo
-- "rellena" (rut actual null); si ya hay un rut guardado, rechaza.

create or replace function public.set_own_rut(new_rut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from profiles where id = auth.uid() and rut is not null) then
    raise exception 'Tu RUT ya está registrado y no se puede modificar';
  end if;

  update profiles set rut = nullif(trim(new_rut), '') where id = auth.uid();
end;
$$;
