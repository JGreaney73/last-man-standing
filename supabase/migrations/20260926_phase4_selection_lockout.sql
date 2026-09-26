alter table public.selections
  add column if not exists selection_source text not null default 'MANUAL';

alter table public.selections
  drop constraint if exists selections_selection_source_check;

update public.selections
set selection_source = case when is_automatic then 'AUTO' else 'MANUAL' end;

alter table public.selections
  add constraint selections_selection_source_check
  check (selection_source in ('MANUAL', 'AUTO'));

create or replace function public.enforce_selection_deadline()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  round_status text;
  configured_kickoff timestamptz;
  first_kickoff timestamptz;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if auth.uid() is not null then
    if new.user_id <> auth.uid() then
      raise exception 'You can only change your own selection.';
    end if;

    if tg_op = 'UPDATE'
      and (new.user_id <> old.user_id or new.round_id <> old.round_id) then
      raise exception 'A saved selection cannot be moved to another user or round.';
    end if;

    new.is_automatic := false;
    new.selection_source := 'MANUAL';
  elsif new.selection_source = 'AUTO' and new.is_automatic then
    return new;
  end if;

  select status, rounds.first_kickoff
  into round_status, configured_kickoff
  from public.rounds
  where id = new.round_id
  for update;

  if not found then
    raise exception 'The selected round does not exist.';
  end if;

  select coalesce(min(kickoff), configured_kickoff)
  into first_kickoff
  from public.fixtures
  where round_id = new.round_id;

  if first_kickoff is null then
    raise exception 'This round has no kickoff time, so selections are unavailable.';
  end if;

  if round_status not in ('open', 'scheduled')
    or clock_timestamp() >= first_kickoff - interval '2 hours' then
    raise exception 'Selections are now locked for this round.';
  end if;

  if new.fixture_id is not null and not exists (
    select 1
    from public.fixtures
    where id = new.fixture_id
      and round_id = new.round_id
      and new.team_id in (home_team_id, away_team_id)
  ) then
    raise exception 'The selected team is not in that round fixture.';
  end if;

  if exists (
    select 1
    from public.selections
    where user_id = new.user_id
      and team_id = new.team_id
      and round_id <> new.round_id
  ) then
    raise exception 'You have already selected this team in another round.';
  end if;

  return new;
end;
$$;

create trigger selections_enforce_deadline
  before insert or update on public.selections
  for each row execute function public.enforce_selection_deadline();

create policy "Users can update their own selections before lockout"
  on public.selections for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.allocate_overdue_round_selections()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  round_record record;
  player_record record;
  team_id_to_assign bigint;
  fixture_id_for_team bigint;
  assigned_count integer := 0;
  first_kickoff timestamptz;
begin
  for round_record in
    select id, status, first_kickoff
    from public.rounds
    where status in ('open', 'scheduled')
    order by id
    for update skip locked
  loop
    select coalesce(min(kickoff), round_record.first_kickoff)
    into first_kickoff
    from public.fixtures
    where round_id = round_record.id;

    if first_kickoff is null
      or now() < first_kickoff - interval '2 hours' then
      continue;
    end if;

    for player_record in
      select id
      from public.profiles
      where competition_status = 'active'
        and not exists (
          select 1 from public.selections
          where user_id = profiles.id and round_id = round_record.id
        )
      order by id
    loop
      select teams.id
      into team_id_to_assign
      from public.teams
      where is_active
        and not exists (
          select 1 from public.selections
          where user_id = player_record.id and team_id = teams.id
        )
      order by name, id
      limit 1;

      if team_id_to_assign is null then
        continue;
      end if;

      select id
      into fixture_id_for_team
      from public.fixtures
      where round_id = round_record.id
        and team_id_to_assign in (home_team_id, away_team_id)
      order by kickoff, id
      limit 1;

      insert into public.selections (
        user_id,
        round_id,
        fixture_id,
        team_id,
        is_automatic,
        selection_source
      ) values (
        player_record.id,
        round_record.id,
        fixture_id_for_team,
        team_id_to_assign,
        true,
        'AUTO'
      )
      on conflict (user_id, round_id) do nothing;

      if found then
        assigned_count := assigned_count + 1;
      end if;

      team_id_to_assign := null;
      fixture_id_for_team := null;
    end loop;

    update public.rounds
    set status = 'locked'
    where id = round_record.id
      and status in ('open', 'scheduled');
  end loop;

  return assigned_count;
end;
$$;

revoke all on function public.allocate_overdue_round_selections() from public;
revoke all on function public.allocate_overdue_round_selections() from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'allocate-overdue-round-selections';

select cron.schedule(
  'allocate-overdue-round-selections',
  '* * * * *',
  'select public.allocate_overdue_round_selections();'
);
