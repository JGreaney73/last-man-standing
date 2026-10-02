import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const resultLabels = {
  home_win: "Home win",
  away_win: "Away win",
  draw: "Draw",
};

function RoundResults() {
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [fixtures, setFixtures] = useState([]);
  const [scores, setScores] = useState({});
  const [latestRun, setLatestRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [loadingRound, setLoadingRound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timerId = window.setTimeout(async () => {
      const { data, error: roundsError } = await supabase
        .from("rounds")
        .select("id, round_number, name, status, draw_rule")
        .order("round_number");

      if (roundsError) {
        setError(roundsError.message);
      } else {
        const loadedRounds = data ?? [];
        setRounds(loadedRounds);
        const nextRound = loadedRounds.find((round) => (
          round.status !== "complete" && round.status !== "break"
        )) ?? loadedRounds.at(-1);
        setSelectedRoundId((currentId) => currentId || String(nextRound?.id ?? ""));
      }
      setLoadingRounds(false);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const loadRoundData = useCallback(async () => {
    if (!selectedRoundId) return;

    setLoadingRound(true);
    setError("");

    const roundId = Number(selectedRoundId);
    const [fixturesResult, runResult] = await Promise.all([
      supabase
        .from("fixtures")
        .select("id, round_id, kickoff, location, home_team_id, away_team_id, result, home_score, away_score")
        .eq("round_id", roundId)
        .order("kickoff"),
      supabase
        .from("round_processing_runs")
        .select("id, run_number, processed_at, active_count, eliminated_count")
        .eq("round_id", roundId)
        .order("run_number", { ascending: false })
        .limit(1),
    ]);

    const loadError = fixturesResult.error || runResult.error;
    if (loadError) throw loadError;

    const fixtureRows = fixturesResult.data ?? [];
    const roundRun = runResult.data?.[0] ?? null;
    const teamIds = [...new Set(fixtureRows.flatMap((fixture) => [
      fixture.home_team_id,
      fixture.away_team_id,
    ]))];

    const { data: teams, error: teamsError } = teamIds.length > 0
      ? await supabase.from("teams").select("id, name").in("id", teamIds)
      : { data: [], error: null };
    if (teamsError) throw teamsError;

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const enrichedFixtures = fixtureRows.map((fixture) => ({
      ...fixture,
      home_name: teamMap.get(fixture.home_team_id) ?? "Unknown team",
      away_name: teamMap.get(fixture.away_team_id) ?? "Unknown team",
    }));

    let runEntries = [];
    if (roundRun) {
      const { data: entryRows, error: entriesError } = await supabase
        .from("round_processing_entries")
        .select("participant_name, selected_team_name, fixture_label, fixture_result, home_score, away_score, outcome, status_before, status_after")
        .eq("run_id", roundRun.id)
        .order("participant_name");
      if (entriesError) throw entriesError;
      runEntries = entryRows ?? [];
    }

    setFixtures(enrichedFixtures);
    setScores(Object.fromEntries(enrichedFixtures.map((fixture) => [fixture.id, {
      home: fixture.home_score ?? "",
      away: fixture.away_score ?? "",
    }])));
    setLatestRun(roundRun);
    setEntries(runEntries);
    setResultsSaved(enrichedFixtures.length > 0 && enrichedFixtures.every((fixture) => (
      (Number.isInteger(fixture.home_score) && Number.isInteger(fixture.away_score)) ||
      ["home_win", "away_win", "draw"].includes(fixture.result)
    )));
    setLoadingRound(false);
  }, [selectedRoundId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadRoundData().catch((loadError) => {
        setError(loadError.message);
        setLoadingRound(false);
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadRoundData]);

  const selectedRound = rounds.find((round) => String(round.id) === selectedRoundId);
  const allScoresComplete = fixtures.length > 0 && fixtures.every((fixture) => {
    const score = scores[fixture.id] ?? {};
    return score.home !== "" && score.away !== "" &&
      Number.isInteger(Number(score.home)) && Number.isInteger(Number(score.away)) &&
      Number(score.home) >= 0 && Number(score.away) >= 0;
  });

  const updateScore = (fixtureId, side, value) => {
    setScores((current) => ({
      ...current,
      [fixtureId]: { ...current[fixtureId], [side]: value },
    }));
    setResultsSaved(false);
    setMessage("");
    setSummary(null);
  };

  const saveResults = async () => {
    if (!allScoresComplete) {
      setError("Enter a non-negative whole-number score for every fixture.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const resultPayload = fixtures.map((fixture) => ({
      fixture_id: fixture.id,
      home_score: Number(scores[fixture.id].home),
      away_score: Number(scores[fixture.id].away),
    }));

    try {
      const { error: saveError } = await supabase.rpc("save_round_results", {
        p_round_id: Number(selectedRoundId),
        p_results: resultPayload,
      });

      if (saveError) throw saveError;
      setResultsSaved(true);
      await loadRoundData();
      setMessage(latestRun
        ? "Scores saved. Reprocess this round to apply the corrected results."
        : "All fixture scores saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const processRound = async () => {
    const confirmReprocess = Boolean(latestRun);
    if (confirmReprocess && !window.confirm(
      `Round ${selectedRound.round_number} has already been processed. Reprocessing may change competition outcomes. Are you sure?`
    )) return;

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const { data, error: processError } = await supabase.rpc("process_round", {
        p_round_id: Number(selectedRoundId),
        p_confirm_reprocess: confirmReprocess,
      });

      if (processError) throw processError;
      setSummary(data);
      await loadRoundData();
      setSummary(data);
      setMessage(`Round ${data.round_number} processed successfully.`);
    } catch (processError) {
      setError(processError.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loadingRounds) {
    return <section className="admin-section" role="status">Loading rounds…</section>;
  }

  return (
    <section className="admin-section round-results">
      <div className="admin-section-heading">
        <div>
          <p className="admin-section-label">Competition administration</p>
          <h2>Round Results</h2>
        </div>
        {selectedRound && (
          <label className="round-picker">
            <span>Round</span>
            <select value={selectedRoundId} onChange={(event) => {
              setMessage("");
              setSummary(null);
              setSelectedRoundId(event.target.value);
            }}>
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  Round {round.round_number}{round.name ? `: ${round.name}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!selectedRound ? (
        <p className="data-muted">No competition rounds are configured.</p>
      ) : (
        <>
          <p className="section-description">
            Enter the final score for each fixture, save all scores, then process the round. Entries survive only when their selected team wins; draws and losses eliminate the entry.
          </p>

          {error && <div className="data-error" role="alert">{error}</div>}
          {message && <div className="processing-message processing-success" role="status">{message}</div>}

          {summary && (
            <div className="round-summary" aria-live="polite">
              <h3>Round {summary.round_number} Processed</h3>
              <div className="round-summary-stats">
                <p><strong>{summary.active_count}</strong><span>Active competitors</span></p>
                <p><strong>{summary.eliminated_count}</strong><span>Eliminated this run</span></p>
              </div>
            </div>
          )}

          {latestRun && (
            <p className="round-run-meta">
              Latest run #{latestRun.run_number} · {new Date(latestRun.processed_at).toLocaleString()}
              {latestRun.active_count !== null && ` · ${latestRun.active_count} active · ${latestRun.eliminated_count} eliminated`}
            </p>
          )}

          {loadingRound ? (
            <p role="status">Loading fixtures and processing history…</p>
          ) : fixtures.length === 0 ? (
            <p className="data-muted">No fixtures have been added to this round.</p>
          ) : (
            <div className="table-container">
              <table className="fixture-table result-entry-table">
                <thead>
                  <tr>
                    <th>Kickoff</th>
                    <th>Fixture</th>
                    <th>Home score</th>
                    <th>Away score</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((fixture) => {
                    const score = scores[fixture.id] ?? { home: "", away: "" };
                    const homeScore = score.home === "" ? null : Number(score.home);
                    const awayScore = score.away === "" ? null : Number(score.away);
                    const outcome = homeScore === null || awayScore === null
                      ? resultLabels[fixture.result] ?? "Not entered"
                      : homeScore > awayScore
                        ? "Home win"
                        : homeScore < awayScore
                          ? "Away win"
                          : "Draw";

                    return (
                      <tr key={fixture.id}>
                        <td>{new Date(fixture.kickoff).toLocaleString()}</td>
                        <td>
                          <strong>{fixture.home_name} vs {fixture.away_name}</strong>
                          {fixture.location && <small className="fixture-venue">{fixture.location}</small>}
                        </td>
                        <td>
                          <label className="visually-hidden" htmlFor={`home-score-${fixture.id}`}>{fixture.home_name} score</label>
                          <input
                            id={`home-score-${fixture.id}`}
                            className="score-input"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={score.home}
                            onChange={(event) => updateScore(fixture.id, "home", event.target.value)}
                            disabled={saving || processing}
                          />
                        </td>
                        <td>
                          <label className="visually-hidden" htmlFor={`away-score-${fixture.id}`}>{fixture.away_name} score</label>
                          <input
                            id={`away-score-${fixture.id}`}
                            className="score-input"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={score.away}
                            onChange={(event) => updateScore(fixture.id, "away", event.target.value)}
                            disabled={saving || processing}
                          />
                        </td>
                        <td>{outcome}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {fixtures.length > 0 && !loadingRound && (
            <div className="round-result-actions">
              <button className="action-btn" type="button" onClick={saveResults} disabled={saving || processing || !allScoresComplete || resultsSaved}>
                {saving ? "Saving scores…" : "Save Results"}
              </button>
              <button className="danger-btn process-round-button" type="button" onClick={processRound} disabled={saving || processing || !resultsSaved}>
                {processing ? "Processing…" : latestRun ? "Reprocess Round" : "Process Round"}
              </button>
            </div>
          )}

          {entries.length > 0 && (
            <div className="processing-audit">
              <h3>Participant outcomes</h3>
              <div className="table-container">
                <table className="fixture-table">
                  <thead>
                    <tr><th>Participant</th><th>Selection</th><th>Fixture result</th><th>Outcome</th></tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={`${entry.participant_name}-${index}`}>
                        <td>{entry.participant_name}</td>
                        <td>{entry.selected_team_name}</td>
                        <td>{entry.fixture_label}: {entry.home_score === null || entry.away_score === null
                          ? resultLabels[entry.fixture_result] ?? entry.fixture_result
                          : `${entry.home_score}-${entry.away_score} (${resultLabels[entry.fixture_result] ?? entry.fixture_result})`}</td>
                        <td className={entry.outcome === "eliminated" ? "outcome-eliminated" : "outcome-survives"}>
                          {entry.outcome === "eliminated" ? "Eliminated" : "Survived"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default RoundResults;
