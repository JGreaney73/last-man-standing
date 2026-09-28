import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useCompetitionEntry } from "../context/useCompetitionEntry";
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
  const { currentEntry, loadingEntries } = useCompetitionEntry();
  const [currentRound, setCurrentRound] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const loadSelectionData = useCallback(async ({ showLoading = true } = {}) => {
    if (!currentEntry) {
      if (showLoading) setLoading(loadingEntries);
      return;
    }
    if (showLoading) setLoading(true);
    setError("");

    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("id, round_number, name, status, first_kickoff")
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
      if (showLoading) setLoading(false);
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

    const selections = await loadOwnSelections(currentEntry.id);
    const selectionDetails = await loadSelectionDetails(selections);
    const roundSelection = selectionDetails.find(
      (selection) => selection.round_id === round.id
    );
    const fixtureKickoffs = (fixtureRows ?? [])
      .map((fixture) => new Date(fixture.kickoff).getTime())
      .filter(Number.isFinite);
    const firstKickoff = fixtureKickoffs.length > 0
      ? Math.min(...fixtureKickoffs)
      : round.first_kickoff
        ? new Date(round.first_kickoff).getTime()
        : null;

    setNow(Date.now());
    setCurrentRound({
      ...round,
      lockout_at: Number.isFinite(firstKickoff)
        ? new Date(firstKickoff - 2 * 60 * 60 * 1000).toISOString()
        : null,
    });
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
    if (showLoading) setLoading(false);
  }, [currentEntry, loadingEntries]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadSelectionData().catch((loadError) => {
        setError(loadError.message);
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadSelectionData]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timerId);
  }, []);

  const currentSelection = currentRound
    ? history.find((selection) => selection.round_id === currentRound.id)
    : null;
  const lockoutTime = currentRound?.lockout_at
    ? new Date(currentRound.lockout_at).getTime()
    : null;
  const isLocked = Boolean(
    currentRound &&
    (currentRound.status === "locked" || lockoutTime === null || now >= lockoutTime)
  );
  const selectionIsLocked = isLocked || Boolean(currentSelection?.is_automatic);
  const entryIsEliminated = currentEntry?.competition_status === "eliminated";

  const usedTeamIds = new Set(
    history
      .filter((selection) => selection.round_id !== currentRound?.id)
      .map((selection) => String(selection.team_id))
  );

  const handleTeamSelection = (teamId) => {
    if (entryIsEliminated || selectionIsLocked || usedTeamIds.has(String(teamId))) return;
    setSelectedTeamId(String(teamId));
  };

  useEffect(() => {
    if (!isLocked || currentSelection || !currentRound) return undefined;

    const timerId = window.setInterval(() => {
      loadSelectionData({ showLoading: false }).catch((loadError) => {
        setError(loadError.message);
      });
    }, 15000);

    return () => window.clearInterval(timerId);
  }, [currentRound, currentSelection, isLocked, loadSelectionData]);

  const confirmSelection = async () => {
    const selectedFixture = fixtures.find(
      (fixture) =>
        String(fixture.home_team_id) === selectedTeamId ||
        String(fixture.away_team_id) === selectedTeamId
    );

    if (
      !currentRound ||
      !selectedFixture ||
      entryIsEliminated ||
      selectionIsLocked ||
      !selectedTeamId ||
      (currentSelection && String(currentSelection.team_id) === selectedTeamId)
    ) return;

    if (lockoutTime === null || Date.now() >= lockoutTime) {
      setError("Selections are now locked for this round.");
      setNow(Date.now());
      return;
    }

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("selections").upsert({
      user_id: user.id,
      entry_id: currentEntry.id,
      round_id: currentRound.id,
      fixture_id: selectedFixture.id,
      team_id: Number(selectedTeamId),
      is_automatic: false,
      selection_source: "MANUAL",
    }, { onConflict: "entry_id,round_id" });

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
        <div>
          <h1>Make Your Selection</h1>
          <p>{currentEntry?.name} · {entryIsEliminated ? "Eliminated" : "Active"}</p>
        </div>
        {entryIsEliminated && <span className="entry-status-marker">Eliminated</span>}
      </div>

      {error && <div className="data-error" role="alert">{error}</div>}

      {entryIsEliminated && (
        <div className="locked-banner entry-eliminated-banner" role="status">
          <h2>Eliminated</h2>
          <p>Your selected team did not win. This entry is no longer active; fixtures and selection history remain available to view.</p>
        </div>
      )}

      {!currentRound ? (
        <div className="instruction-banner">
          There is no upcoming selection round available yet.
        </div>
      ) : currentSelection?.is_automatic ? (
        <div className="locked-banner" role="status">
          <h2>Selection Locked</h2>
          <p>
            No selection was submitted before the deadline. {currentSelection.team.name} was automatically allocated.
          </p>
        </div>
      ) : isLocked ? (
        <div className="locked-banner" role="status">
          <h2>Selections are now locked for this round.</h2>
          <p>
            {currentSelection ? (
              <>Your selection: <strong>{currentSelection.team.name}</strong></>
            ) : "No selection was submitted before the deadline. Automatic allocation is being processed."}
          </p>
        </div>
      ) : (
        <div className="instruction-banner">
          {currentSelection
            ? `You can change your selection until ${new Date(currentRound.lockout_at).toLocaleString()}.`
            : `Select a team for Round ${currentRound.round_number}. Changes are allowed until two hours before kickoff.`}
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
                        const unavailable = used || selectionIsLocked || entryIsEliminated;

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

              {selectedTeamId && currentSelection && String(currentSelection.team_id) !== selectedTeamId ? (
                <>
                  <h3>
                    {fixtures
                      .flatMap((fixture) => [fixture.home, fixture.away])
                      .find((team) => String(team.id) === selectedTeamId)?.name}
                  </h3>
                  <p>Ready to update your selection</p>
                  <button
                    className="lock-selection-button"
                    type="button"
                    disabled={saving || entryIsEliminated}
                    onClick={() => setShowConfirmation(true)}
                  >
                    Update Selection
                  </button>
                </>
              ) : currentSelection ? (
                <>
                  <h3>{currentSelection.team.name}</h3>
                  <p>
                    {currentSelection.is_automatic
                      ? "Automatically allocated"
                      : isLocked
                        ? `Locked for Round ${currentRound.round_number}`
                        : `Saved for Round ${currentRound.round_number}`}
                  </p>
                </>
              ) : selectedTeamId ? (
                <>
                  <h3>
                    {fixtures
                      .flatMap((fixture) => [fixture.home, fixture.away])
                      .find((team) => String(team.id) === selectedTeamId)?.name}
                  </h3>
                  <p>Ready to save for Round {currentRound.round_number}</p>
                  <button
                    className="lock-selection-button"
                    type="button"
                    disabled={saving || entryIsEliminated || Boolean(currentSelection && String(currentSelection.team_id) === selectedTeamId)}
                    onClick={() => setShowConfirmation(true)}
                  >
                    {currentSelection ? "Update Selection" : "Save Selection"}
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
            <h2 id="confirmation-heading">{currentSelection ? "Update your selection?" : "Save this selection?"}</h2>
            <p>You can change your selection until two hours before the round's first kickoff.</p>

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
                disabled={saving || entryIsEliminated}
                onClick={confirmSelection}
              >
                {saving ? "Saving…" : currentSelection ? "Update Selection" : "Save Selection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Selection;
