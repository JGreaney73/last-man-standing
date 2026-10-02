import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useCompetitionEntry } from "../context/useCompetitionEntry";
import { competitionWeek } from "../lib/competitionWeeks";
import { loadCompetitionStartingRound } from "../lib/competitionSettings";
import { loadRemainingTeams } from "../lib/userCompetitionData";
import "./Dashboard.css";

function Dashboard() {
  const { currentEntry, loadingEntries } = useCompetitionEntry();
  const [teams, setTeams] = useState([]);
  const [selectionCount, setSelectionCount] = useState(0);
  const [players, setPlayers] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentEntry) return;
      const [remainingResult, playersResult, startingRound] = await Promise.all([
        loadRemainingTeams(currentEntry.id),
        supabase.from("leaderboard_entries").select("id, entry_name, display_name, competition_status"),
        loadCompetitionStartingRound(),
      ]);

      if (playersResult.error) throw playersResult.error;
      const { data: rounds, error: roundsError } = await supabase
        .from("rounds")
        .select("round_number, status")
        .gte("round_number", startingRound)
        .order("round_number");

      if (roundsError) throw roundsError;
      setTeams(remainingResult.teams);
      setSelectionCount(remainingResult.selections.length);
      setPlayers(playersResult.data ?? []);
      const currentRound = rounds?.find((round) => round.status === "open")
        ?? rounds?.find((round) => round.status === "scheduled")
        ?? rounds?.at(-1);
      setCurrentWeek(currentRound
        ? competitionWeek(currentRound.round_number, startingRound)
        : null);
    };

    loadDashboard()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [currentEntry, loadingEntries]);

  const activePlayers = players.filter((player) => player.competition_status === "active");
  const eliminatedPlayers = players.filter((player) => player.competition_status === "eliminated");

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Competition Dashboard</h1>
        {currentEntry && <p className={`entry-status-pill ${currentEntry.competition_status === "eliminated" ? "entry-status-pill-out" : ""}`}>
          {currentEntry.name} · {currentEntry.competition_status === "active" ? "Active" : "Eliminated"}
        </p>}
      </header>

      {currentEntry?.competition_status === "eliminated" && (
        <div className="entry-eliminated-banner" role="status">
          <strong>Eliminated</strong>
          <span>Your selected team did not win. This entry is no longer active, but fixtures, standings and pick history remain available.</span>
        </div>
      )}

      {loading && <div className="data-status" role="status">Loading your competition data…</div>}
      {error && <div className="data-error" role="alert">Your dashboard data is unavailable: {error}</div>}

      <div className="dashboard-grid">
        <div className="stat-card"><h3>Current Week</h3><div className="stat-value">{currentWeek ?? "—"}</div></div>
        <div className="stat-card"><h3>Active Entries</h3><div className="stat-value">{activePlayers.length}</div></div>
        <div className="stat-card"><h3>Eliminated Entries</h3><div className="stat-value">{eliminatedPlayers.length}</div></div>
      </div>

      <div className="two-column">
        <div className="panel">
          <h2>Teams still available to you</h2>
          {loading ? (
            <p className="data-muted">Checking your selection history…</p>
          ) : error ? (
            <p className="data-muted">Available teams cannot be shown until your selection history is available.</p>
          ) : teams.length === 0 ? (
            <p className="data-muted">You have used every available team.</p>
          ) : (
            <div className="teams-grid">{teams.map((team) => <div key={team.id} className="team-chip">{team.name}</div>)}</div>
          )}
          {!loading && !error && <p className="data-muted">{selectionCount} previous selection{selectionCount === 1 ? "" : "s"} accounted for.</p>}
        </div>

        <div className="panel">
          <h2>Competition status</h2>
          <ul>
            <li>{activePlayers.length} active entr{activePlayers.length === 1 ? "y" : "ies"}</li>
            <li>{eliminatedPlayers.length} eliminated entr{eliminatedPlayers.length === 1 ? "y" : "ies"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
