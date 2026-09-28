import { supabase } from "./supabase";

export async function loadOwnSelections(entryId) {
  if (!supabase || !entryId) {
    throw new Error("A competition entry is required.");
  }

  const { data, error } = await supabase
    .from("selections")
    .select("id, round_id, fixture_id, team_id, is_automatic, selection_source, selected_at")
    .eq("entry_id", entryId)
    .order("selected_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function loadSelectionDetails(selections) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (selections.length === 0) return [];

  const roundIds = [...new Set(selections.map((selection) => selection.round_id))];
  const fixtureIds = selections.map((selection) => selection.fixture_id).filter(Boolean);

  const [roundsResult, fixturesResult] = await Promise.all([
    supabase.from("rounds").select("id, round_number, name").in("id", roundIds),
    fixtureIds.length > 0
      ? supabase.from("fixtures").select("id, kickoff, location, home_team_id, away_team_id, result, home_score, away_score").in("id", fixtureIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const relatedTeamIds = (fixturesResult.data ?? []).flatMap((fixture) => [
    fixture.home_team_id,
    fixture.away_team_id,
  ]);
  const teamIds = [...new Set([
    ...selections.map((selection) => selection.team_id),
    ...relatedTeamIds,
  ])];
  const teamsResult = await supabase.from("teams").select("id, name").in("id", teamIds);

  const error = teamsResult.error || roundsResult.error || fixturesResult.error;
  if (error) throw error;

  const teams = new Map((teamsResult.data ?? []).map((team) => [team.id, team]));
  const rounds = new Map((roundsResult.data ?? []).map((round) => [round.id, round]));
  const fixtures = new Map((fixturesResult.data ?? []).map((fixture) => [fixture.id, {
    ...fixture,
    home_team: teams.get(fixture.home_team_id),
    away_team: teams.get(fixture.away_team_id),
  }]));

  const incomplete = selections.some(
    (selection) =>
      !teams.has(selection.team_id) ||
      !rounds.has(selection.round_id) ||
      (selection.fixture_id && (
        !fixtures.has(selection.fixture_id) ||
        !teams.has(fixtures.get(selection.fixture_id).home_team_id) ||
        !teams.has(fixtures.get(selection.fixture_id).away_team_id)
      ))
  );

  if (incomplete) throw new Error("One or more historical selections are incomplete.");

  return selections.map((selection) => ({
    ...selection,
    team: teams.get(selection.team_id),
    round: rounds.get(selection.round_id),
    fixture: selection.fixture_id ? fixtures.get(selection.fixture_id) : null,
  }));
}

export async function loadRemainingTeams(entryId) {
  const [teamsResult, selections] = await Promise.all([
    supabase.from("teams").select("id, name").eq("is_active", true).order("name"),
    loadOwnSelections(entryId),
  ]);

  if (teamsResult.error) throw teamsResult.error;

  const teams = teamsResult.data ?? [];
  const usedTeamIds = new Set(selections.map((selection) => selection.team_id));
  return {
    teams: teams.filter((team) => !usedTeamIds.has(team.id)),
    selections,
  };
}
