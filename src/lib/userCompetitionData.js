import { supabase } from "./supabase";

export async function loadOwnSelections(userId) {
  if (!supabase || !userId) {
    throw new Error("An authenticated user is required.");
  }

  const { data, error } = await supabase
    .from("selections")
    .select("id, round_id, fixture_id, team_id, is_automatic, selection_source, selected_at")
    .eq("user_id", userId)
    .order("selected_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function loadSelectionDetails(selections) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (selections.length === 0) return [];

  const teamIds = [...new Set(selections.map((selection) => selection.team_id))];
  const roundIds = [...new Set(selections.map((selection) => selection.round_id))];
  const fixtureIds = selections.map((selection) => selection.fixture_id).filter(Boolean);

  const [teamsResult, roundsResult, fixturesResult] = await Promise.all([
    supabase.from("teams").select("id, name").in("id", teamIds),
    supabase.from("rounds").select("id, round_number, name").in("id", roundIds),
    fixtureIds.length > 0
      ? supabase.from("fixtures").select("id, kickoff, location, home_team_id, away_team_id, result").in("id", fixtureIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error = teamsResult.error || roundsResult.error || fixturesResult.error;
  if (error) throw error;

  const teams = new Map((teamsResult.data ?? []).map((team) => [team.id, team]));
  const rounds = new Map((roundsResult.data ?? []).map((round) => [round.id, round]));
  const fixtures = new Map((fixturesResult.data ?? []).map((fixture) => [fixture.id, fixture]));

  const incomplete = selections.some(
    (selection) =>
      !teams.has(selection.team_id) ||
      !rounds.has(selection.round_id) ||
      (selection.fixture_id && !fixtures.has(selection.fixture_id))
  );

  if (incomplete) throw new Error("One or more historical selections are incomplete.");

  return selections.map((selection) => ({
    ...selection,
    team: teams.get(selection.team_id),
    round: rounds.get(selection.round_id),
    fixture: selection.fixture_id ? fixtures.get(selection.fixture_id) : null,
  }));
}

export async function loadRemainingTeams(userId) {
  const [teamsResult, selections] = await Promise.all([
    supabase.from("teams").select("id, name").eq("is_active", true).order("name"),
    loadOwnSelections(userId),
  ]);

  if (teamsResult.error) throw teamsResult.error;

  const teams = teamsResult.data ?? [];
  const teamIds = new Set(teams.map((team) => team.id));
  if (selections.some((selection) => !teamIds.has(selection.team_id))) {
    throw new Error("Selection history contains an unavailable team.");
  }

  const usedTeamIds = new Set(selections.map((selection) => selection.team_id));
  return {
    teams: teams.filter((team) => !usedTeamIds.has(team.id)),
    selections,
  };
}
