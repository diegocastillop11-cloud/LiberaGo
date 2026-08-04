-- LiberaGo — campos de perfil opcionales (no bloquean nada, a diferencia
-- de nombre/RUT/T&C del onboarding): apellido y datos de dirección, para
-- que el usuario los rellene si quiere desde /perfil.

alter table profiles add column if not exists apellido text;
alter table profiles add column if not exists direccion text;
alter table profiles add column if not exists comuna text;
alter table profiles add column if not exists ciudad text;
alter table profiles add column if not exists region text;

create or replace function public.set_own_extra_info(
  new_apellido text,
  new_direccion text,
  new_comuna text,
  new_ciudad text,
  new_region text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    apellido = nullif(trim(new_apellido), ''),
    direccion = nullif(trim(new_direccion), ''),
    comuna = nullif(trim(new_comuna), ''),
    ciudad = nullif(trim(new_ciudad), ''),
    region = nullif(trim(new_region), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.set_own_extra_info(text, text, text, text, text) to authenticated;
