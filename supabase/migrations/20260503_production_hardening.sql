-- Production hardening additions for Stickman Battles.

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bans (
  id uuid primary key default gen_random_uuid(),
  account_id text,
  peer_id text,
  device_id text,
  username text,
  reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.liveops_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.suspicious_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_claims (
  claim_key text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  reward_type text not null,
  reward_data jsonb not null default '{}'::jsonb,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'applied', 'rejected')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

alter table public.admin_roles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.bans enable row level security;
alter table public.liveops_config enable row level security;
alter table public.suspicious_activity enable row level security;
alter table public.reward_claims enable row level security;

create or replace function public.smb_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
      and role in ('admin', 'moderator')
  );
$$;

drop policy if exists "Admins read roles" on public.admin_roles;
create policy "Admins read roles" on public.admin_roles
for select to authenticated
using (public.smb_is_admin());

drop policy if exists "Admins read audit logs" on public.admin_audit_logs;
create policy "Admins read audit logs" on public.admin_audit_logs
for select to authenticated
using (public.smb_is_admin());

drop policy if exists "Admins insert audit logs" on public.admin_audit_logs;
create policy "Admins insert audit logs" on public.admin_audit_logs
for insert to authenticated
with check (public.smb_is_admin());

drop policy if exists "Admins manage bans" on public.bans;
create policy "Admins manage bans" on public.bans
for all to authenticated
using (public.smb_is_admin())
with check (public.smb_is_admin());

drop policy if exists "Admins manage liveops" on public.liveops_config;
create policy "Admins manage liveops" on public.liveops_config
for all to authenticated
using (public.smb_is_admin())
with check (public.smb_is_admin());

drop policy if exists "Users insert own suspicious activity" on public.suspicious_activity;
create policy "Users insert own suspicious activity" on public.suspicious_activity
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Admins read suspicious activity" on public.suspicious_activity;
create policy "Admins read suspicious activity" on public.suspicious_activity
for select to authenticated
using (public.smb_is_admin());

drop policy if exists "Users read own reward claims" on public.reward_claims;
create policy "Users read own reward claims" on public.reward_claims
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins manage reward claims" on public.reward_claims;
create policy "Admins manage reward claims" on public.reward_claims
for all to authenticated
using (public.smb_is_admin())
with check (public.smb_is_admin());

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists bans_identity_idx on public.bans (account_id, peer_id, device_id, username);
create index if not exists bans_active_idx on public.bans (expires_at, revoked_at) where revoked_at is null;
create index if not exists suspicious_activity_user_created_idx on public.suspicious_activity (user_id, created_at desc);
create index if not exists reward_claims_user_created_idx on public.reward_claims (user_id, created_at desc);
create index if not exists reward_claims_user_status_idx on public.reward_claims (user_id, status, claimed_at desc);
