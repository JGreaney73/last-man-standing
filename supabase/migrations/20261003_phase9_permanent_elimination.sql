create or replace function public.process_round(
  p_round_id bigint,
  p_confirm_reprocess boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  round_record record;
  entry_record record;
  selection_record record;
  run_id bigint;
  run_number integer;
  fixture_count integer;
  v_active_count integer;
  v_eliminated_count integer := 0;
  outcome_value text;
  result_value text;
  status_before_value text;
  status_after_value text;
  expected_result text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  perform pg_advisory_xact_lock(20260928, 1);

  select id, round_number, status, draw_rule into round_record
  from public.rounds where id = p_round_id for update;
  if not found then raise exception 'The selected round does not exist.'; end if;

  if exists (select 1 from public.round_processing_runs where round_id = p_round_id)
    and not p_confirm_reprocess then
    raise exception 'This round has already been processed. Confirm reprocessing to continue.';
  end if;
  if exists (
    select 1 from public.round_processing_runs as processing
    join public.rounds as processed_round on processed_round.id = processing.round_id
    where processed_round.round_number > round_record.round_number
  ) then
    raise exception 'This round cannot be reprocessed after a later round has been processed.';
  end if;

  select count(*) into fixture_count from public.fixtures where round_id = p_round_id;
  if fixture_count = 0 then raise exception 'This round has no fixtures.'; end if;
  if exists (
    select 1 from public.fixtures where round_id = p_round_id
      and ((home_score is null or away_score is null)
        and result not in ('home_win', 'away_win', 'draw'))
  ) then
    raise exception 'Every fixture needs a saved score or recorded result before processing.';
  end if;

  if exists (
    select 1 from public.competition_entries as entry
    where (entry.competition_status = 'active' or entry.eliminated_round_id = p_round_id)
      and not exists (
        select 1 from public.selections as selection
        join public.fixtures as fixture on fixture.id = selection.fixture_id
          and fixture.round_id = selection.round_id
          and selection.team_id in (fixture.home_team_id, fixture.away_team_id)
        where selection.entry_id = entry.id and selection.round_id = p_round_id
      )
  ) then
    raise exception 'Every active entry must have a valid selection for this round.';
  end if;

  select coalesce(max(processing.run_number), 0) + 1 into run_number
  from public.round_processing_runs as processing where processing.round_id = p_round_id;
  insert into public.round_processing_runs(round_id, run_number, processed_by)
  values (p_round_id, run_number, auth.uid()) returning id into run_id;

  for entry_record in
    select entry.id, entry.user_id, entry.name,
      entry.competition_status, entry.eliminated_round_id
    from public.competition_entries as entry
    where entry.competition_status = 'active' or entry.eliminated_round_id = p_round_id
    order by entry.id
  loop
    select selection.id as selection_id, selection.team_id, team.name as team_name,
      fixture.id as fixture_id, fixture.home_team_id, fixture.away_team_id,
      home_team.name || ' vs ' || away_team.name as fixture_label,
      fixture.home_score, fixture.away_score, fixture.result
    into selection_record
    from public.selections as selection
    join public.fixtures as fixture on fixture.id = selection.fixture_id
      and fixture.round_id = selection.round_id
      and selection.team_id in (fixture.home_team_id, fixture.away_team_id)
    join public.teams as team on team.id = selection.team_id
    join public.teams as home_team on home_team.id = fixture.home_team_id
    join public.teams as away_team on away_team.id = fixture.away_team_id
    where selection.entry_id = entry_record.id and selection.round_id = p_round_id;

    if selection_record.home_score is not null then
      result_value := case
        when selection_record.home_score > selection_record.away_score then 'home_win'
        when selection_record.home_score < selection_record.away_score then 'away_win'
        else 'draw'
      end;
    else
      result_value := selection_record.result;
    end if;

    expected_result := case
      when result_value = 'home_win' and selection_record.team_id = selection_record.home_team_id then 'survive'
      when result_value = 'away_win' and selection_record.team_id = selection_record.away_team_id then 'survive'
      else 'eliminate'
    end;
    outcome_value := case when expected_result = 'survive' then 'survived' else 'eliminated' end;
    status_before_value := entry_record.competition_status;
    status_after_value := case
      when status_before_value = 'eliminated' then 'eliminated'
      when outcome_value = 'survived' then 'active'
      else 'eliminated'
    end;

    if status_after_value = 'eliminated' then
      outcome_value := 'eliminated';
    end if;

    update public.competition_entries
    set competition_status = status_after_value,
      eliminated_round_id = case
        when status_after_value = 'eliminated' then coalesce(entry_record.eliminated_round_id, p_round_id)
        else null
      end,
      updated_at = clock_timestamp()
    where id = entry_record.id;

    if status_before_value <> 'eliminated' and status_after_value = 'eliminated' then
      v_eliminated_count := v_eliminated_count + 1;
    end if;

    insert into public.round_processing_entries (
      run_id, entry_id, profile_id, participant_name, selection_id,
      selected_team_id, selected_team_name, fixture_id, fixture_label,
      fixture_result, home_score, away_score, outcome, status_before, status_after
    ) values (
      run_id, entry_record.id, entry_record.user_id, entry_record.name,
      selection_record.selection_id, selection_record.team_id, selection_record.team_name,
      selection_record.fixture_id, selection_record.fixture_label, result_value,
      selection_record.home_score, selection_record.away_score, outcome_value,
      status_before_value, status_after_value
    );
  end loop;

  update public.profiles as profile
  set competition_status = case
        when exists (
          select 1 from public.competition_entries as entry
          where entry.user_id = profile.id and entry.competition_status = 'active'
        ) then 'active'
        else 'eliminated'
      end,
      eliminated_round_id = case
        when exists (
          select 1 from public.competition_entries as entry
          where entry.user_id = profile.id and entry.competition_status = 'active'
        ) then null
        else (
          select max(entry.eliminated_round_id)
          from public.competition_entries as entry where entry.user_id = profile.id
        )
      end,
      updated_at = clock_timestamp()
  where exists (
    select 1 from public.competition_entries as entry where entry.user_id = profile.id
  );

  select count(*) into v_active_count from public.competition_entries
  where competition_status = 'active';
  update public.rounds set status = 'complete', processed_at = clock_timestamp()
  where id = p_round_id;
  update public.round_processing_runs set active_count = v_active_count,
    eliminated_count = v_eliminated_count where id = run_id;

  return jsonb_build_object('run_id', run_id, 'run_number', run_number,
    'round_number', round_record.round_number, 'active_count', v_active_count,
    'eliminated_count', v_eliminated_count);
end;
$$;

revoke all on function public.process_round(bigint, boolean) from public, anon;
grant execute on function public.process_round(bigint, boolean) to authenticated;