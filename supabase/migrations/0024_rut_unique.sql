-- LiberaGo — bug crítico: nada impedía que dos cuentas distintas
-- declararan el mismo RUT (el lock de 0023 solo evita que UNA cuenta lo
-- cambie después de puesto, no evita que otra cuenta use ese mismo valor).
-- El RUT es la identificación de una persona para trazabilidad de disputas
-- (ver 0019) — tiene que ser 1 a 1 con la cuenta.

-- Limpieza de datos existentes: si dos o más cuentas ya comparten un RUT,
-- se lo dejamos a la más antigua (probablemente la cuenta real/original) y
-- se lo sacamos a las más nuevas — vuelven a quedar en el onboarding gate
-- pidiéndoles su RUT la próxima vez que entren, esta vez con la validación
-- de unicidad activa.
update profiles p
set rut = null
where rut is not null
  and exists (
    select 1 from profiles p2
    where p2.rut = p.rut and p2.id <> p.id and p2.created_at < p.created_at
  );

create unique index profiles_rut_unique on profiles (rut) where rut is not null;

create or replace function public.set_own_rut(new_rut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_rut text := nullif(trim(new_rut), '');
begin
  if exists (select 1 from profiles where id = auth.uid() and rut is not null) then
    raise exception 'Tu RUT ya está registrado y no se puede modificar';
  end if;

  begin
    update profiles set rut = clean_rut where id = auth.uid();
  exception when unique_violation then
    raise exception 'Ese RUT ya está registrado en otra cuenta';
  end;
end;
$$;
