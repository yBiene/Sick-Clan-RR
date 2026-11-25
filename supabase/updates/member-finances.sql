alter table public.profiles
 add column if not exists dirty_cash numeric(16,2) check (dirty_cash >= 0),
 add column if not exists clean_cash numeric(16,2) check (clean_cash >= 0),
 add column if not exists money_updated_at timestamptz;
grant update(dirty_cash,clean_cash) on public.profiles to authenticated;
create or replace function clan_private.stamp_member_money() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.dirty_cash is distinct from old.dirty_cash or new.clean_cash is distinct from old.clean_cash then
  new.money_updated_at=now();
 end if;
 return new;
end;
$$;
revoke all on function clan_private.stamp_member_money() from public,anon,authenticated;
drop trigger if exists stamp_member_money on public.profiles;
create trigger stamp_member_money before update on public.profiles
 for each row execute function clan_private.stamp_member_money();

alter table public.profiles add constraint profiles_money_finite check (
 (dirty_cash is null or dirty_cash <= 99999999999999.99) and
 (clean_cash is null or clean_cash <= 99999999999999.99)
);
