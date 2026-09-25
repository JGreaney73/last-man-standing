import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import {
  loadOwnSelections,
  loadSelectionDetails,
} from "../lib/userCompetitionData";
import "./Selection.css";

function formatKickoff(value) {
  return new Date(value).toLocaleString([], {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Selection() {
  const { user } = useAuth();
  const [currentRound, setCurrentRound] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSelectionData = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("id, round_number, name, status")
      .in("status", ["open", "scheduled"])
      .order("round_number");

    if (roundsError) throw roundsError;

    const round =
      rounds?.find((item) => item.status === "open") ?? rounds?.[0] ?? null;

    if (!round) {
      setCurrentRound(null);
      setFixtures([]);
      setHistory([]);
      setSelectedTeamId("");
      setLoading(false);
      return;
    }

    const { data: fixtureRows, error: fixturesError } = await supabase
      .from("fixtures")
      .select("id, kickoff, location, home_team_id, away_team_id, result")
      .eq("round_id", round.id)
      .order("kickoff");

    if (fixturesError) throw fixturesError;

    const teamIds = [
      ...new Set(
        (fixtureRows ?? []).flatMap((fixture) => [
          fixture.home_team_id,
          fixture.away_team_id,
        ])
      ),
    ];

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamsError) throw teamsError;

    const teamMap = new Map(
      (teams ?? []).map((team) => [team.id, team])
    );

    const incompleteFixture = (fixtureRows ?? []).some(
      (fixture) =>
        !teamMap.has(fixture.home_team_id) ||
        !teamMap.has(fixture.away_team_id)
    );

    if (incompleteFixture) {
      throw new Error("One or more upcoming fixtures has incomplete team data.");
    }

    const selections = await loadOwnSelections(user.id);
    const selectionDetails = await loadSelectionDetails(selections);
    const roundSelection = selectionDetails.find(
      (selection) => selection.round_id === round.id
    );

    setCurrentRound(round);
    setFixtures(
      (fixtureRows ?? []).map((fixture) => ({
        ...fixture,
        home: teamMap.get(fixture.home_team_id),
        away: teamMap.get(fixture.away_team_id),
      }))
    );
    setHistory(selectionDetails);
    setSelectedTeamId(roundSelection?.team_id
      ? String(roundSelection.team_id)
      : "");
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadSelectionData().catch((loadError) => {
        setError(loadError.message);
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadSelectionData]);

  const currentSelection = currentRound
    ? history.find((selection) => selection.round_id === currentRound.id)
    : null;

  const usedTeamIds = new Set(
    history.map((selection) => String(selection.team_id))
  );

  const handleTeamSelection = (teamId) => {
    if (currentSelection || usedTeamIds.has(String(teamId))) return;
    setSelectedTeamId(String(teamId));
  };

  const confirmSelection = async () => {
    const selectedFixture = fixtures.find(
      (fixture) =>
        String(fixture.home_team_id) === selectedTeamId ||
        String(fixture.away_team_id) === selectedTeamId
    );

    if (!currentRound || !selectedFixture || currentSelection) return;

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("selections").insert({
      user_id: user.id,
      round_id: currentRound.id,
      fixture_id: selectedFixture.id,
      team_id: Number(selectedTeamId),
      is_automatic: false,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setShowConfirmation(false);
      await loadSelectionData();
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="selection-page" role="status">Loading fixtures and selection history…</div>;
  }

  return (
    <div className="selection-page">
      <div className="selection-hero">
        <h1>Make Your Selection</h1>
        <p>Choose one team to win this weekend.</p>
      </div>

      {error && <div className="data-error" role="alert">{error}</div>}

      {!currentRound ? (
        <div className="instruction-banner">
          There is no upcoming selection round available yet.
        </div>
      ) : currentSelection ? (
        <div className="locked-banner" role="status">
          <h2>Selection Locked ✓</h2>
          <p>
            Your selection: <strong>{currentSelection.team.name}</strong>
          </p>
        </div>
      ) : (
        <div className="instruction-banner">
          Select a team for Round {currentRound.round_number} and lock your choice.
        </div>
      )}

      {currentRound && (
        <div className="selection-layout">
          <div className="fixtures-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Round {currentRound.round_number}</p>
                <h2>Fixtures</h2>
              </div>
              <span className="fixture-count">{fixtures.length} fixtures</span>
            </div>

            {fixtures.length === 0 ? (
              <p className="data-muted">No fixtures have been added to this round.</p>
            ) : (
              <div className="fixture-list">
                {fixtures.map((fixture) => (
                  <div key={fixture.id} className="fixture-card">
                    <div className="fixture-time">
                      {formatKickoff(fixture.kickoff)}
                      {fixture.location && ` · ${fixture.location}`}
                    </div>

                    <div className="fixture-teams">
                      {[fixture.home, fixture.away].map((team) => {
                        const used = usedTeamIds.has(String(team.id));
                        const selected = selectedTeamId === String(team.id);
                        const unavailable = used || Boolean(currentSelection);

                        return (
                          <button
                            key={team.id}
                            type="button"
                            className={`team-button ${selected ? "team-button-selected" : ""} ${used ? "team-button-used" : ""}`}
                            disabled={unavailable}
                            aria-pressed={selected}
                            onClick={() => handleTeamSelection(team.id)}
                          >
                            <span className="team-name">{team.name}</span>
                            <small className="team-status">
                              {used ? "Already selected" : selected ? "Selected" : "Available"}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="selection-sidebar">
            <div className="selection-summary">
              <h2>Current Selection</h2>

              {currentSelection ? (
                <>
                  <h3>{currentSelection.team.name}</h3>
                  <p>Locked for Round {currentRound.round_number}</p>
                </>
              ) : selectedTeamId ? (
                <>
                  <h3>
                    {fixtures
                      .flatMap((fixture) => [fixture.home, fixture.away])
                      .find((team) => String(team.id) === selectedTeamId)?.name}
                  </h3>
                  <p>Ready to lock for Round {currentRound.round_number}</p>
                  <button
                    className="lock-selection-button"
                    type="button"
                    onClick={() => setShowConfirmation(true)}
                  >
                    Confirm and Lock
                  </button>
                </>
              ) : (
                <p>No team selected</p>
              )}
            </div>

            <div className="used-teams-panel">
              <h2>Previously Used Teams</h2>
              {history.length === 0 ? (
                <p className="data-muted">No previous selections.</p>
              ) : (
                history.map((selection) => (
                  <div key={selection.id} className="used-team-row">
                    <span>{selection.team.name}</span>
                    <small>Round {selection.round.round_number}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="modal-overlay" role="presentation">
          <div
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-heading"
          >
            <h2 id="confirmation-heading">Lock this selection?</h2>
            <p>Once confirmed, this choice cannot be changed.</p>

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={saving}
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                type="button"
                disabled={saving}
                onClick={confirmSelection}
              >
                {saving ? "Saving…" : "Confirm Selection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Selection;
