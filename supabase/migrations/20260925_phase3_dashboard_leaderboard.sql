-- Apply this migration to an existing Supabase project.

alter table public.profiles add column if not exists competition_status text
  not null default 'active';

alter table public.profiles drop constraint if exists profiles_competition_status_check;
alter table public.profiles add constraint profiles_competition_status_check
  check (competition_status in ('active', 'eliminated'));

create or replace view public.leaderboard_players as
select id, display_name, username, competition_status
from public.profiles;

revoke all on public.leaderboard_players from public;
revoke all on public.leaderboard_players from anon;
grant select on public.leaderboard_players to authenticated;
