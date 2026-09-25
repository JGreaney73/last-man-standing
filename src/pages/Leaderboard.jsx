import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { loadOwnSelections, loadSelectionDetails } from "../lib/userCompetitionData";
import "./Leaderboard.css";

function Leaderboard() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      const [playersResult, selections] = await Promise.all([
        supabase.from("leaderboard_players").select("id, display_name, username, competition_status"),
        loadOwnSelections(user.id),
      ]);

      if (playersResult.error) throw playersResult.error;
      setPlayers(playersResult.data ?? []);

      try {
        setHistory(await loadSelectionDetails(selections));
        setHistoryAvailable(true);
      } catch (historyError) {
        setHistory([]);
        setHistoryAvailable(false);
        setError(historyError.message);
      }
    };

    loadLeaderboard()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const activePlayers = players.filter((player) => player.competition_status === "active");
  const eliminatedPlayers = players.filter((player) => player.competition_status === "eliminated");
  const playerName = (player) => player.display_name || player.username || "Unnamed player";

  if (loading) return <div className="leaderboard-page" role="status">Loading leaderboard…</div>;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <p>Aspendale Stingrays Last Man Standing</p>
      </div>

      {error && <div className="data-error" role="alert">{error}</div>}

      <div className="leaderboard-stats">
        <div className="leaderboard-card"><h3>Active players</h3><div className="leaderboard-number">{activePlayers.length}</div></div>
        <div className="leaderboard-card"><h3>Eliminated players</h3><div className="leaderboard-number">{eliminatedPlayers.length}</div></div>
      </div>

      <LeaderboardSection title="Active players" players={activePlayers} playerName={playerName} statusLabel="Active" statusClass="alive" />
      <LeaderboardSection title="Eliminated players" players={eliminatedPlayers} playerName={playerName} statusLabel="Eliminated" statusClass="eliminated" />

      <section className="leaderboard-section">
        <h2>Your selection history</h2>
        {!historyAvailable ? (
          <p className="data-muted">Your selection history is unavailable.</p>
        ) : history.length === 0 ? (
          <p className="data-muted">You have no recorded selections yet.</p>
        ) : (
          <div className="history-list">
            {history.map((selection) => (
              <div className="history-row" key={selection.id}>
                <strong>Round {selection.round.round_number}</strong>
                <span>{selection.team.name}</span>
                <small>{selection.is_automatic ? "Automatically selected" : "Selected by you"}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LeaderboardSection({ title, players, playerName, statusLabel, statusClass }) {
  return (
    <section className="leaderboard-section">
      <h2>{title}</h2>
      {players.length === 0 ? (
        <p className="data-muted">No {title.toLowerCase()} yet.</p>
      ) : (
        <div className="leaderboard-list">
          {players.map((player, index) => (
            <div className="leaderboard-row" key={player.id}>
              <span>{index + 1}</span>
              <strong>{playerName(player)}</strong>
              <span className={statusClass}>{statusLabel}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Leaderboard;
