begin;
create schema if not exists clan_private;
revoke all on schema clan_private from public;
grant usage on schema clan_private to authenticated;
create or replace function clan_private.member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and active)$$;
create or replace function clan_private.leader() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and active and role in ('Leitung','Stellvertreter'))$$;
revoke all on function clan_private.member(),clan_private.leader() from public;
grant execute on function clan_private.member(),clan_private.leader() to authenticated;
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
alter table public.profiles add column if not exists username text;
update public.profiles set username='ybiene' where id='4b9bbb2e-630f-40d9-ab38-761ce9aa57d8' and username is null;
create unique index if not exists profiles_username_unique on public.profiles(lower(username));
drop policy if exists own_read on public.profiles;
create policy clan_read on public.profiles for select to authenticated using(clan_private.member());
revoke update on public.profiles from authenticated,anon;
grant update(name,settlement,settlement_number,base_number,plantation,plant_counts,specialization,discord,bio) on public.profiles to authenticated;
create table if not exists public.clan_records(
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('inventory','wishlist','research','storage','finance','task','board','goal','specialization','vehicle','chat','message','notification','trade','loan','raid','timer','feedback','setting','plant','recipe','price','marker')),
 owner_id uuid not null default auth.uid() references public.profiles(id),
 recipient_id uuid references public.profiles(id), title text not null check(length(title) between 1 and 200),
 data jsonb not null default '{}' check(octet_length(data::text)<=20000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.clan_records enable row level security;
create index if not exists clan_records_kind on public.clan_records(kind,created_at);
create index if not exists clan_records_owner on public.clan_records(owner_id);
create index if not exists clan_records_recipient on public.clan_records(recipient_id);
create policy records_read on public.clan_records for select to authenticated using(clan_private.member() and (kind not in ('message','notification') or owner_id=auth.uid() or recipient_id=auth.uid()));
create policy records_insert on public.clan_records for insert to authenticated with check(clan_private.member() and owner_id=auth.uid() and (kind not in ('finance','setting','storage') or clan_private.leader()) and (kind not in ('message','notification') or recipient_id is not null));
create policy records_update on public.clan_records for update to authenticated using(clan_private.member() and (owner_id=auth.uid() or (clan_private.leader() and kind not in ('message','notification')))) with check(clan_private.member() and (owner_id=auth.uid() or (clan_private.leader() and kind not in ('message','notification'))));
create policy records_delete on public.clan_records for delete to authenticated using(clan_private.member() and (owner_id=auth.uid() or (clan_private.leader() and kind not in ('message','notification'))));
create or replace function clan_private.record_guard() returns trigger language plpgsql set search_path='' as $$begin
 if TG_OP='UPDATE' and (new.owner_id<>old.owner_id or new.kind<>old.kind or new.recipient_id is distinct from old.recipient_id) then raise exception 'Zuordnung unveränderlich'; end if;
 new.updated_at=now(); return new; end$$;
create trigger clan_record_guard before update on public.clan_records for each row execute function clan_private.record_guard();
grant select,insert,update,delete on public.clan_records to authenticated;
revoke all on public.clan_records from anon;
create table if not exists public.clan_audit(id bigint generated always as identity primary key, actor uuid, action text, entity text, created_at timestamptz not null default now());
alter table public.clan_audit enable row level security;
create policy audit_read on public.clan_audit for select to authenticated using(clan_private.leader());
grant select on public.clan_audit to authenticated;
create or replace function clan_private.audit_record() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.clan_audit(actor,action,entity) values(auth.uid(),TG_OP,TG_TABLE_NAME||':'||coalesce(new.id::text,old.id::text));
 return coalesce(new,old);end$$;
revoke all on function clan_private.audit_record() from public;
create trigger audit_records after insert or update or delete on public.clan_records for each row execute function clan_private.audit_record();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function clan_private.audit_record();
commit;
-- Required service grants for the account endpoint.
grant select,insert,update on public.profiles to service_role;
grant select,insert on public.clan_audit to service_role;
grant usage,select on all sequences in schema public to service_role;
create unique index if not exists research_member_node_unique on public.clan_records(owner_id,(data->>'node')) where kind='research';
create unique index if not exists plant_member_unique on public.clan_records(owner_id) where kind='plant';
alter policy records_update on public.clan_records using(clan_private.member() and (kind not in ('finance','setting','storage') or clan_private.leader()) and (owner_id=auth.uid() or (clan_private.leader() and kind not in ('message','notification')))) with check(clan_private.member() and (kind not in ('finance','setting','storage') or clan_private.leader()) and (owner_id=auth.uid() or (clan_private.leader() and kind not in ('message','notification'))));
