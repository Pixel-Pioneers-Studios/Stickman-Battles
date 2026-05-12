-- Sovereign MK2 adaptive memory
-- Stores aggregated matchup priors by weapon, class, and loadout.

create table if not exists public.sovereign_matchup_memory (
  bucket_key text primary key,
  bucket_type text not null check (bucket_type in ('weapon', 'class', 'loadout')),
  bucket_value text not null,
  sample_count integer not null default 0,
  win_count integer not null default 0,
  loss_count integer not null default 0,
  action_counts jsonb not null default '{"attack":0,"shield":0,"jump":0,"dodge":0,"idle":0,"edge":0,"melee":0,"ranged":0}'::jsonb,
  context_counts jsonb not null default '{"grounded":0,"airborne":0,"edge":0}'::jsonb,
  punish_stats jsonb not null default '{"direct":{"hits":0,"escapes":0},"crossup":{"hits":0,"escapes":0},"delayed":{"hits":0,"escapes":0}}'::jsonb,
  tendency_stats jsonb not null default '{}'::jsonb,
  last_summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists smb_touch_sovereign_matchup_memory on public.sovereign_matchup_memory;
create trigger smb_touch_sovereign_matchup_memory
before update on public.sovereign_matchup_memory
for each row execute function public.smb_touch_updated_at();

alter table public.sovereign_matchup_memory enable row level security;

drop policy if exists "Public read sovereign matchup memory" on public.sovereign_matchup_memory;
create policy "Public read sovereign matchup memory"
on public.sovereign_matchup_memory
for select
to anon, authenticated
using (true);

drop policy if exists "Public insert sovereign matchup memory" on public.sovereign_matchup_memory;
create policy "Public insert sovereign matchup memory"
on public.sovereign_matchup_memory
for insert
to anon, authenticated
with check (true);

drop policy if exists "Public update sovereign matchup memory" on public.sovereign_matchup_memory;
create policy "Public update sovereign matchup memory"
on public.sovereign_matchup_memory
for update
to anon, authenticated
using (true)
with check (true);

create index if not exists sovereign_matchup_memory_type_updated_idx
  on public.sovereign_matchup_memory (bucket_type, updated_at desc);
