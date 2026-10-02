import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function CompetitionStartingRound() {
  const [rounds, setRounds] = useState([]);
  const [startingRound, setStartingRound] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const [roundsResult, settingResult] = await Promise.all([
        supabase.from("rounds").select("round_number, name").order("round_number"),
        supabase.from("competition_settings").select("starting_round").eq("id", true).single(),
      ]);

      if (roundsResult.error) throw roundsResult.error;
      if (settingResult.error) throw settingResult.error;
      setRounds(roundsResult.data ?? []);
      setStartingRound(String(settingResult.data.starting_round));
    };

    loadSettings()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const saveStartingRound = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const { error: saveError } = await supabase
      .from("competition_settings")
      .update({
        starting_round: Number(startingRound),
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (saveError) setError(saveError.message);
    else setMessage("Competition starting round saved.");
    setSaving(false);
  };

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <p className="admin-section-label">Competition configuration</p>
          <h2>Competition Starting Round</h2>
        </div>
      </div>
      <p className="section-description">
        Choose the Premier League round that will be Week 1. Later rounds are numbered from this start.
      </p>
      {error && <div className="data-error" role="alert">{error}</div>}
      {message && <div className="processing-message processing-success" role="status">{message}</div>}
      <form className="starting-round-form" onSubmit={saveStartingRound}>
        <label className="round-picker">
          <span>Starting Premier League round</span>
          <select
            value={startingRound}
            onChange={(event) => setStartingRound(event.target.value)}
            disabled={loading || saving || rounds.length === 0}
            required
          >
            {rounds.map((round) => (
              <option key={round.round_number} value={round.round_number}>
                Round {round.round_number}{round.name ? `: ${round.name}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="action-btn" type="submit" disabled={loading || saving || !startingRound}>
          {saving ? "Saving…" : "Save starting round"}
        </button>
      </form>
    </section>
  );
}

export default CompetitionStartingRound;