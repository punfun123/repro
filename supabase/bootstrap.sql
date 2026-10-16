-- Run in a dedicated REPRO project. Client roles have no direct table access.
create table if not exists public.experiments (
  id uuid primary key, owner_hash text not null check (length(owner_hash)=64),
  created_at timestamptz not null default now(), status text not null,
  record jsonb not null, is_public boolean not null default false
);
create index if not exists experiments_owner_idx on public.experiments(owner_hash, created_at desc);
alter table public.experiments enable row level security;
revoke all on public.experiments from anon, authenticated;
grant select, insert, update, delete on public.experiments to service_role;

create table if not exists public.public_receipts (
  id uuid primary key references public.experiments(id) on delete cascade,
  created_at timestamptz not null, status text not null, test_count integer not null
);
alter table public.public_receipts enable row level security;
revoke all on public.public_receipts from anon, authenticated;
grant select, insert, update, delete on public.public_receipts to service_role;

create table if not exists public.run_leases (id uuid primary key default gen_random_uuid(), owner_hash text not null, expires_at timestamptz not null default now()+interval '4 minutes');
create table if not exists public.run_events (id uuid primary key default gen_random_uuid(), owner_hash text not null, ip_hash text not null, created_at timestamptz not null default now());
create index if not exists run_events_owner_idx on public.run_events(owner_hash, created_at);
create index if not exists run_events_ip_idx on public.run_events(ip_hash, created_at);
alter table public.run_leases enable row level security;
alter table public.run_events enable row level security;
revoke all on public.run_leases, public.run_events from anon, authenticated;
grant select, insert, update, delete on public.run_leases, public.run_events to service_role;

create or replace function public.claim_repro_run(p_owner text, p_ip text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare lease_id uuid;
begin
  perform pg_advisory_xact_lock(84371009);
  delete from public.run_leases where expires_at < now();
  delete from public.run_events where created_at < now()-interval '1 hour';
  if (select count(*) from public.run_leases)>=2
    or exists(select 1 from public.run_leases where owner_hash=p_owner)
    or (select count(*) from public.run_events where owner_hash=p_owner)>=3
    or (select count(*) from public.run_events where ip_hash=p_ip)>=12
    or exists(select 1 from public.run_events where owner_hash=p_owner and created_at>now()-interval '20 seconds')
  then raise exception 'RATE_LIMITED'; end if;
  insert into public.run_events(owner_hash, ip_hash) values (p_owner, p_ip);
  insert into public.run_leases(owner_hash) values (p_owner) returning id into lease_id;
  return lease_id;
end $$;
revoke all on function public.claim_repro_run(text,text) from public, anon, authenticated;
grant execute on function public.claim_repro_run(text,text) to service_role;
