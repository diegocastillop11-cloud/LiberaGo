-- LiberaGo — el pago a trabajadores es manual por transferencia (ver
-- 0022) — para poder hacerla necesitamos que el trabajador cargue sus
-- datos bancarios. Campos opcionales igual que apellido/dirección de 0025,
-- pero se muestran solo en el perfil de alguien que ya es/postuló a
-- trabajador (frontend), no en el de un cliente.

alter table profiles add column banco text;
alter table profiles add column tipo_cuenta text;
alter table profiles add column numero_cuenta text;
alter table profiles add column titular_cuenta text;

create or replace function public.set_own_bank_info(
  new_banco text,
  new_tipo_cuenta text,
  new_numero_cuenta text,
  new_titular_cuenta text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    banco = nullif(trim(new_banco), ''),
    tipo_cuenta = nullif(trim(new_tipo_cuenta), ''),
    numero_cuenta = nullif(trim(new_numero_cuenta), ''),
    titular_cuenta = nullif(trim(new_titular_cuenta), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.set_own_bank_info(text, text, text, text) to authenticated;
