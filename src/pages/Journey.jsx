import { useCallback, useEffect, useState } from "react";
import { useCompetitionEntry } from "../context/useCompetitionEntry";
import { competitionWeekLabel } from "../lib/competitionWeeks";
import { loadCompetitionStartingRound } from "../lib/competitionSettings";
import {
  loadOwnSelections,
  loadRemainingTeams,
  loadSelectionDetails,
} from "../lib/userCompetitionData";
import "./Journey.css";

function Journey() {
  const { currentEntry, loadingEntries } = useCompetitionEntry();
  const [history, setHistory] = useState([]);
  const [remainingTeams, setRemainingTeams] = useState([]);
  const [startingRound, setStartingRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJourney = useCallback(async () => {
    if (!currentEntry) {
      setLoading(loadingEntries);
      return;
    }
    setLoading(true);
    setError("");

    const [selections, configuredStartingRound] = await Promise.all([
      loadOwnSelections(currentEntry.id),
      loadCompetitionStartingRound(),
    ]);
    const [details, remaining] = await Promise.all([
      loadSelectionDetails(selections),
      loadRemainingTeams(currentEntry.id),
    ]);

    setHistory(details);
    setRemainingTeams(remaining.teams);
    setStartingRound(configuredStartingRound);
    setLoading(false);
  }, [currentEntry, loadingEntries]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadJourney().catch((loadError) => {
        setError(loadError.message);
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadJourney]);

  const usedTeams = history.map((selection) => selection.team.name);

  if (loading) {
    return <div className="journey-page" role="status">Loading your journey…</div>;
  }

  return (
    <div className="journey-page">
      <div className="journey-header">
        <h1>My Journey</h1>
        <p>{currentEntry?.name} · {currentEntry?.competition_status === "eliminated" ? "Eliminated" : "Active"}</p>
      </div>

      {currentEntry?.competition_status === "eliminated" && (
        <div className="entry-eliminated-banner" role="status">
          <strong>Eliminated</strong>
          <span>Your selected team did not win. This entry is read-only; its selection history remains available below.</span>
        </div>
      )}

      {error && <div className="data-error" role="alert">Your journey is unavailable: {error}</div>}

      <div className="journey-layout">
        <div className="card">
          <h2>Selection Timeline</h2>

          {history.length === 0 ? (
            <p className="data-muted">No selections have been recorded yet.</p>
          ) : (
            <div className="timeline">
              {history.map((selection) => (
                <div className="timeline-item" key={selection.id}>
                  <div className="timeline-dot" />
                  <div className="week-info">
                    <div className="week-title">
                      {competitionWeekLabel(selection.round.round_number, startingRound)}
                      {` · EPL Round ${selection.round.round_number}`}
                    </div>
                    <div>Selected: {selection.team.name}</div>
                    {selection.fixture && (
                      <div>
                        Match: {selection.fixture.home_team.name} vs {selection.fixture.away_team.name}
                        {selection.fixture.home_score !== null && selection.fixture.away_score !== null
                          ? ` · ${selection.fixture.home_score}-${selection.fixture.away_score}`
                          : ""}
                        {selection.fixture.result && selection.fixture.result !== "pending"
                          ? ` · ${selection.fixture.result.replaceAll("_", " ")}`
                          : ""}
                      </div>
                    )}
                    <div className="result">
                      {selection.is_automatic || selection.selection_source === "AUTO"
                        ? "Automatically selected"
                        : "Selection recorded"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h2>Selections Made</h2>
            <div className="stat-number">{history.length}</div>
            <p>
              {history.length === 0
                ? "No rounds selected yet"
                : `${history.length} round${history.length === 1 ? "" : "s"} recorded`}
            </p>
          </div>

          <div className="card journey-card-spaced">
            <h2>Used Teams</h2>
            {usedTeams.length === 0 ? (
              <p className="data-muted">No teams used yet.</p>
            ) : (
              <div className="team-grid">
                {usedTeams.map((team) => (
                  <div key={team} className="team-chip">✓ {team}</div>
                ))}
              </div>
            )}
          </div>

          <div className="card journey-card-spaced">
            <h2>Remaining Teams</h2>
            {remainingTeams.length === 0 ? (
              <p className="data-muted">No remaining teams available.</p>
            ) : (
              <div className="team-grid">
                {remainingTeams.map((team) => (
                  <div key={team.id} className="team-chip">{team.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Journey;
