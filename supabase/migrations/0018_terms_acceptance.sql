-- LiberaGo — aceptación de T&C persistida y obligatoria sin importar el
-- método de login. El checkbox del formulario de registro (Login.tsx) cubre
-- el registro por correo/contraseña, pero Google OAuth no distingue
-- "registrarme" de "ingresar" — cualquiera puede loguearse por primera vez
-- desde la pestaña "Ingresar" y crear cuenta sin pasar por el checkbox.
-- Por eso la fuente de verdad real es esta columna + un gate a nivel de
-- app (RequireAuth), no el checkbox por sí solo.

alter table profiles add column terms_accepted_at timestamptz;

-- profiles no tiene policy de UPDATE (a propósito, ver 0002) — este RPC es
-- la única forma de que alguien acepte sus propios T&C.
create or replace function public.accept_terms()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set terms_accepted_at = now() where id = auth.uid() and terms_accepted_at is null;
end;
$$;

grant execute on function public.accept_terms() to authenticated;
