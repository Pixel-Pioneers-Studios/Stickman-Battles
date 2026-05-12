-- Harden Sovereign MK2 adaptive memory for production writes.
-- Keeps reads public, moves writes behind the server/service role path.

alter table public.sovereign_matchup_memory
  add column if not exists source_counts jsonb not null default '{"human":0,"self_play":0,"replay":0}'::jsonb;

alter table public.sovereign_matchup_memory
  alter column last_summary set default '{}'::jsonb;

drop policy if exists "Public insert sovereign matchup memory" on public.sovereign_matchup_memory;
drop policy if exists "Public update sovereign matchup memory" on public.sovereign_matchup_memory;

drop policy if exists "Public read sovereign matchup memory" on public.sovereign_matchup_memory;
create policy "Public read sovereign matchup memory"
on public.sovereign_matchup_memory
for select
to anon, authenticated
using (true);

create index if not exists sovereign_matchup_memory_type_value_idx
  on public.sovereign_matchup_memory (bucket_type, bucket_value);
