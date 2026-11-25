create or replace function clan_private.guard_attachment() returns trigger language plpgsql set search_path='' as $$
declare image_path text;
begin
 image_path:=new.data->>'image_path';
 if image_path is null then return new; end if;
 if image_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$' then raise exception 'Ungültiger Bildpfad'; end if;
 if TG_OP='UPDATE' then
  if image_path=old.data->>'image_path' then return new; end if;
 end if;
 if split_part(image_path,'/',1)<>auth.uid()::text then raise exception 'Nur eigene hochgeladene Bilder dürfen angehängt werden'; end if;
 return new;
end $$;
create trigger clan_attachment_guard before insert or update on public.clan_records for each row execute function clan_private.guard_attachment();
