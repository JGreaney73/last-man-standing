import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { competition } from "../data/competition";
import { loadRemainingTeams } from "../lib/userCompetitionData";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectionCount, setSelectionCount] = useState(0);
  const [players, setPlayers] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      const [remainingResult, playersResult] = await Promise.all([
        loadRemainingTeams(user.id),
        supabase.from("leaderboard_players").select("id, competition_status"),
      ]);

      if (playersResult.error) throw playersResult.error;
      const { data: rounds, error: roundsError } = await supabase
        .from("rounds")
        .select("round_number, status")
        .in("status", ["open", "scheduled"])
        .order("round_number");

      if (roundsError) throw roundsError;
      setTeams(remainingResult.teams);
      setSelectionCount(remainingResult.selections.length);
      setPlayers(playersResult.data ?? []);
      setCurrentWeek(rounds?.[0]?.round_number ?? competition.currentWeek);
    };

    loadDashboard()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const activePlayers = players.filter((player) => player.competition_status === "active");
  const eliminatedPlayers = players.filter((player) => player.competition_status === "eliminated");
  const prizePool = competition.entryFee * players.length * 0.6;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Competition Dashboard</h1>
      </header>

      {loading && <div className="data-status" role="status">Loading your competition data…</div>}
      {error && <div className="data-error" role="alert">Your dashboard data is unavailable: {error}</div>}

      <div className="dashboard-grid">
        <div className="stat-card"><h3>Prize Pool</h3><div className="stat-value">${prizePool.toLocaleString()}</div></div>
        <div className="stat-card"><h3>Current Week</h3><div className="stat-value">{currentWeek ?? "—"}</div></div>
        <div className="stat-card"><h3>Players Active</h3><div className="stat-value">{activePlayers.length}</div></div>
        <div className="stat-card"><h3>Eliminated</h3><div className="stat-value">{eliminatedPlayers.length}</div></div>
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
            <li>{activePlayers.length} active player{activePlayers.length === 1 ? "" : "s"}</li>
            <li>{eliminatedPlayers.length} eliminated player{eliminatedPlayers.length === 1 ? "" : "s"}</li>
            <li>Prize pool allocation: 60% of entry fees</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
