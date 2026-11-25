begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table public.clan_push_config(singleton boolean primary key default true check(singleton), value jsonb not null);
alter table public.clan_push_config enable row level security;
revoke all on public.clan_push_config from anon,authenticated;
grant select,insert,update on public.clan_push_config to service_role;
create table public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),endpoint text not null unique,subscription jsonb not null,created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security;
create policy subscriptions_own on public.push_subscriptions for select to authenticated using(user_id=auth.uid() and clan_private.member());
create policy subscriptions_delete on public.push_subscriptions for delete to authenticated using(user_id=auth.uid());
grant select,delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
create table public.push_deliveries(subscription_id uuid references public.push_subscriptions(id) on delete cascade,record_id uuid references public.clan_records(id) on delete cascade,event text not null,locked_until timestamptz not null default now(),sent_at timestamptz,created_at timestamptz not null default now(),primary key(subscription_id,record_id,event));
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
grant all on public.push_deliveries to service_role;
create function public.claim_push_delivery(sub uuid,rec uuid,stage text) returns boolean language sql security invoker set search_path='' as $$
 with claimed as(insert into public.push_deliveries(subscription_id,record_id,event,locked_until) values(sub,rec,stage,now()+interval '2 minutes') on conflict(subscription_id,record_id,event) do update set locked_until=now()+interval '2 minutes' where public.push_deliveries.sent_at is null and public.push_deliveries.locked_until<now() returning 1) select exists(select 1 from claimed)
$$;
revoke all on function public.claim_push_delivery(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_push_delivery(uuid,uuid,text) to service_role;
select cron.schedule('sick-clan-push','* * * * *',$job$
 select net.http_post(url:='https://piklnvlswdwxpmnpliwn.supabase.co/functions/v1/clan-push',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select value->>'cron_secret' from public.clan_push_config where singleton)),body:='{"action":"run"}'::jsonb,timeout_milliseconds:=15000)
 where exists(select 1 from public.push_subscriptions s join public.profiles p on p.id=s.user_id where p.active) and exists(select 1 from public.clan_push_config);
$job$);
commit;
create policy push_config_service on public.clan_push_config for all to service_role using(true) with check(true);
create policy push_deliveries_service on public.push_deliveries for all to service_role using(true) with check(true);
revoke execute on all functions in schema net from public,anon,authenticated;
