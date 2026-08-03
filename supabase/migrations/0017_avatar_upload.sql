-- LiberaGo — foto de perfil obligatoria para trabajador (junto a la
-- verificación de identidad de 0016). El bucket es público de lectura (la
-- foto tiene que verse, es el punto) pero cada usuario solo puede escribir
-- dentro de su propia carpeta ({user_id}/...), igual que el patrón estándar
-- de Supabase Storage para avatares.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (
  bucket_id = 'avatars'
);

create policy "avatars_own_write" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_own_update" on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_own_delete" on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);

-- profiles no tiene ninguna policy de UPDATE (a propósito, ver 0002) — este
-- RPC es la única forma de que alguien toque su propio avatar_url.
create or replace function public.set_own_avatar_url(new_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set avatar_url = new_url where id = auth.uid();
end;
$$;

grant execute on function public.set_own_avatar_url(text) to authenticated;

-- Aprobar a un trabajador ahora exige identidad verificada Y foto de
-- perfil — mismo cuerpo que 0016, se agrega el segundo chequeo.
create or replace function public.set_worker_status(target_user_id uuid, new_status worker_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if new_status = 'approved' then
    if not exists (select 1 from profiles where id = target_user_id and identity_status = 'verified') then
      raise exception 'El trabajador debe verificar su identidad antes de ser aprobado';
    end if;
    if not exists (select 1 from profiles where id = target_user_id and avatar_url is not null) then
      raise exception 'El trabajador debe subir una foto de perfil antes de ser aprobado';
    end if;
  end if;

  update profiles set worker_status = new_status where id = target_user_id;
end;
$$;
