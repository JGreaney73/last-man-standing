import fs from "node:fs";
import process from "node:process";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2] || "./epl-2026-GMTStandardTime.csv";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script."
  );
}

const csv = fs.readFileSync(csvPath, "utf8");
const { data: rows, errors } = Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
});

if (errors.length > 0 || rows.length === 0) {
  throw new Error("The fixture CSV could not be parsed or contains no rows.");
}

const requiredColumns = [
  "Round Number",
  "Date",
  "Location",
  "Home Team",
  "Away Team",
];

const missingColumns = requiredColumns.filter(
  (column) => !Object.hasOwn(rows[0], column)
);

if (missingColumns.length > 0) {
  throw new Error(`Missing CSV columns: ${missingColumns.join(", ")}`);
}

function parseGmtDate(value) {
  const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid GMT date/time: ${value}`);

  const [, day, month, year, hour, minute] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00Z`;
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) throw new Error(`Invalid GMT date/time: ${value}`);
  return date.toISOString();
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const teamNames = [
  ...new Set(rows.flatMap((row) => [row["Home Team"], row["Away Team"]])),
].map((name) => name.trim()).filter(Boolean);

const { error: teamsError } = await supabase
  .from("teams")
  .upsert(teamNames.map((name) => ({ name, is_active: true })), { onConflict: "name" });
if (teamsError) throw teamsError;

const { data: teams, error: teamLoadError } = await supabase
  .from("teams")
  .select("id, name")
  .in("name", teamNames);
if (teamLoadError) throw teamLoadError;

const teamIds = new Map(teams.map((team) => [team.name, team.id]));
const roundNumbers = [...new Set(rows.map((row) => Number(row["Round Number"])))];

const { error: roundsError } = await supabase.from("rounds").upsert(
  roundNumbers.map((roundNumber) => ({
    round_number: roundNumber,
    name: `Weekend ${roundNumber}`,
    status: "scheduled",
  })),
  { onConflict: "round_number" }
);
if (roundsError) throw roundsError;

const { data: rounds, error: roundLoadError } = await supabase
  .from("rounds")
  .select("id, round_number")
  .in("round_number", roundNumbers);
if (roundLoadError) throw roundLoadError;

const roundIds = new Map(rounds.map((round) => [round.round_number, round.id]));
const fixtures = rows.map((row) => ({
  round_id: roundIds.get(Number(row["Round Number"])),
  kickoff: parseGmtDate(row.Date),
  location: row.Location.trim(),
  home_team_id: teamIds.get(row["Home Team"].trim()),
  away_team_id: teamIds.get(row["Away Team"].trim()),
  result: "pending",
}));

if (fixtures.some((fixture) => !fixture.round_id || !fixture.home_team_id || !fixture.away_team_id)) {
  throw new Error("A fixture references a team or round that could not be resolved.");
}

const { error: fixturesError } = await supabase
  .from("fixtures")
  .upsert(fixtures, {
    onConflict: "round_id,kickoff,home_team_id,away_team_id",
  });
if (fixturesError) throw fixturesError;

console.log(`Imported ${fixtures.length} fixtures across ${roundNumbers.length} rounds.`);
