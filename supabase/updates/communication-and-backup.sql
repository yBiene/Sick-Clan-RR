begin;
create table if not exists public.message_receipts (
 record_id uuid references public.clan_records(id) on delete cascade,
 user_id uuid references public.profiles(id),
 read_at timestamptz not null default now(),
 primary key(record_id,user_id)
);
alter table public.message_receipts enable row level security;
create policy receipt_read on public.message_receipts for select to authenticated using (
 clan_private.member() and exists(select 1 from public.clan_records r where r.id=record_id and r.kind in ('chat','message'))
);
create policy receipt_insert on public.message_receipts for insert to authenticated with check (
 clan_private.member() and user_id=auth.uid() and exists(select 1 from public.clan_records r where r.id=record_id and r.kind in ('chat','message') and r.owner_id<>auth.uid())
);
grant select,insert on public.message_receipts to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clan-images','clan-images',false,1048576,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy clan_image_upload on storage.objects for insert to authenticated with check(
 bucket_id='clan-images' and clan_private.member() and (storage.foldername(name))[1]=auth.uid()::text
);
create policy clan_image_read on storage.objects for select to authenticated using(
 bucket_id='clan-images' and clan_private.member() and (
 (storage.foldername(name))[1]=auth.uid()::text or exists(
 select 1 from public.clan_records r where r.data->>'image_path'=name and r.kind in ('chat','message')
 ))
);
create policy clan_image_delete on storage.objects for delete to authenticated using(
 bucket_id='clan-images' and clan_private.member() and (storage.foldername(name))[1]=auth.uid()::text
);
create or replace function clan_private.restore_records(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; restored integer:=0; skipped integer:=0; affected integer;
begin
 if not clan_private.member() then raise exception 'Anmeldung erforderlich'; end if;
 if jsonb_typeof(payload)<>'array' or jsonb_array_length(payload)>5000 or octet_length(payload::text)>5000000 then raise exception 'Ungültige Sicherung oder Größenlimit überschritten'; end if;
 for item in select value from jsonb_array_elements(payload) loop
  if (item->>'kind') in ('finance','storage','setting') and not clan_private.leader() then skipped:=skipped+1; continue; end if;
  if (item->>'owner_id')::uuid<>auth.uid() and (not clan_private.leader() or item->>'kind' in ('message','notification')) then
   skipped:=skipped+1; continue;
  end if;
  if not exists(select 1 from public.profiles where id=(item->>'owner_id')::uuid) then raise exception 'Ein ursprünglicher Eigentümer fehlt. Accountzuordnung zuerst wiederherstellen.'; end if;
  insert into public.clan_records(id,kind,owner_id,recipient_id,title,data,created_at)
  values((item->>'id')::uuid,item->>'kind',(item->>'owner_id')::uuid,nullif(item->>'recipient_id','')::uuid,item->>'title',coalesce(item->'data','{}'),coalesce((item->>'created_at')::timestamptz,now()))
  on conflict do nothing;
  get diagnostics affected=row_count;
  restored:=restored+affected; skipped:=skipped+1-affected;
 end loop;
 return jsonb_build_object('restored',restored,'skipped',skipped);
end $$;
revoke all on function clan_private.restore_records(jsonb) from public;
grant execute on function clan_private.restore_records(jsonb) to authenticated;
create or replace function public.restore_clan_records(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select clan_private.restore_records(payload)$$;
revoke all on function public.restore_clan_records(jsonb) from public;
grant execute on function public.restore_clan_records(jsonb) to authenticated;
commit;
-- Serialize upload reservations and keep this bucket below the free storage allowance.
create or replace function clan_private.image_quota() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not clan_private.member() then return false; end if;
 perform pg_advisory_xact_lock(749921);
 return (select count(*)<256 from storage.objects where bucket_id='clan-images');
end $$;
revoke all on function clan_private.image_quota() from public;
grant execute on function clan_private.image_quota() to authenticated;
alter policy clan_image_upload on storage.objects with check(bucket_id='clan-images' and clan_private.member() and (storage.foldername(name))[1]=auth.uid()::text and clan_private.image_quota());

alter policy records_delete on public.clan_records using(clan_private.member() and (kind not in ('finance','storage','setting') or clan_private.leader()) and (owner_id=auth.uid() or (clan_private.leader() and kind not in ('message','notification'))));
