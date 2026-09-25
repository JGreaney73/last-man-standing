import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  toDatetimeLocal,
  toIsoDate,
  validateFixture,
} from "../lib/fixtureValidation";

const emptyForm = {
  roundId: "",
  kickoff: "",
  location: "",
  homeTeamId: "",
  awayTeamId: "",
};

function FixtureManagement() {
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setLoadError("");

    const [roundsResult, teamsResult, fixturesResult] = await Promise.all([
      supabase
        .from("rounds")
        .select("id, round_number, name, status")
        .order("round_number"),
      supabase
        .from("teams")
        .select("id, name, is_active")
        .order("name"),
      supabase
        .from("fixtures")
        .select("id, round_id, kickoff, location, home_team_id, away_team_id, result")
        .order("kickoff"),
    ]);

    const firstError =
      roundsResult.error || teamsResult.error || fixturesResult.error;

    if (firstError) {
      setLoadError(firstError.message);
    } else {
      setRounds(roundsResult.data ?? []);
      setTeams(teamsResult.data ?? []);
      setFixtures(fixturesResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(loadData, 0);

    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams]
  );

  const roundNames = useMemo(
    () =>
      new Map(
        rounds.map((round) => [
          round.id,
          `Round ${round.round_number}${round.name ? ` — ${round.name}` : ""}`,
        ])
      ),
    [rounds]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "", form: "" }));
    setMessage("");
  };

  const editFixture = (fixture) => {
    setEditingId(fixture.id);
    setForm({
      roundId: String(fixture.round_id),
      kickoff: toDatetimeLocal(fixture.kickoff),
      location: fixture.location ?? "",
      homeTeamId: String(fixture.home_team_id),
      awayTeamId: String(fixture.away_team_id),
    });
    setErrors({});
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveFixture = async (event) => {
    event.preventDefault();
    const validationErrors = validateFixture(form, fixtures, editingId);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setMessage("");

    const fixtureValues = {
      round_id: Number(form.roundId),
      kickoff: toIsoDate(form.kickoff),
      location: form.location.trim(),
      home_team_id: Number(form.homeTeamId),
      away_team_id: Number(form.awayTeamId),
    };

    const result = editingId
      ? await supabase
          .from("fixtures")
          .update(fixtureValues)
          .eq("id", editingId)
      : await supabase.from("fixtures").insert(fixtureValues);

    if (result.error) {
      setErrors({ form: result.error.message });
    } else {
      setMessage(editingId ? "Fixture updated." : "Fixture created.");
      resetForm();
      await loadData();
    }

    setSaving(false);
  };

  const deleteFixture = async (fixture) => {
    const fixtureName = `${teamNames.get(fixture.home_team_id) ?? "Home team"} vs ${teamNames.get(fixture.away_team_id) ?? "Away team"}`;
    if (!window.confirm(`Delete ${fixtureName}? This cannot be undone.`)) return;

    setMessage("");
    const result = await supabase.from("fixtures").delete().eq("id", fixture.id);

    if (result.error) {
      setErrors({ form: result.error.message });
    } else {
      setMessage("Fixture deleted.");
      if (String(editingId) === String(fixture.id)) resetForm();
      await loadData();
    }
  };

  return (
    <section className="admin-section fixture-management">
      <div className="admin-section-heading">
        <div>
          <p className="admin-section-label">Competition setup</p>
          <h2>{editingId ? "Edit fixture" : "Manage fixtures"}</h2>
        </div>
        <span className="participant-count">{fixtures.length} fixtures</span>
      </div>

      <p className="section-description">
        Create fixtures for a round with a local kickoff date and time. Only
        administrators can make changes.
      </p>

      {loadError && (
        <div className="processing-message processing-warning" role="alert">
          Unable to load fixture data: {loadError}
        </div>
      )}

      <form className="fixture-form" onSubmit={saveFixture}>
        <label>
          Round
          <select name="roundId" value={form.roundId} onChange={updateField}>
            <option value="">Select round</option>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                Round {round.round_number} — {round.name}
              </option>
            ))}
          </select>
          {errors.roundId && <small className="field-error">{errors.roundId}</small>}
        </label>

        <label>
          Match date and time
          <input
            name="kickoff"
            type="datetime-local"
            value={form.kickoff}
            onChange={updateField}
          />
          {errors.kickoff && <small className="field-error">{errors.kickoff}</small>}
        </label>

        <label>
          Venue
          <input
            name="location"
            type="text"
            value={form.location}
            onChange={updateField}
            placeholder="Stadium name"
          />
          {errors.location && <small className="field-error">{errors.location}</small>}
        </label>

        <label>
          Home team
          <select name="homeTeamId" value={form.homeTeamId} onChange={updateField}>
            <option value="">Select home team</option>
            {teams.filter((team) => team.is_active).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {errors.homeTeamId && <small className="field-error">{errors.homeTeamId}</small>}
        </label>

        <label>
          Away team
          <select name="awayTeamId" value={form.awayTeamId} onChange={updateField}>
            <option value="">Select away team</option>
            {teams.filter((team) => team.is_active).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {errors.awayTeamId && <small className="field-error">{errors.awayTeamId}</small>}
        </label>

        {errors.form && <p className="field-error form-error" role="alert">{errors.form}</p>}

        <div className="fixture-form-actions">
          <button className="action-btn" type="submit" disabled={saving || loading}>
            {saving ? "Saving…" : editingId ? "Update fixture" : "Add fixture"}
          </button>
          {editingId && (
            <button className="reset-simulator-btn" type="button" onClick={resetForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {message && <div className="processing-message processing-success" role="status">{message}</div>}

      {loading ? (
        <p role="status">Loading fixtures…</p>
      ) : fixtures.length === 0 ? (
        <p className="empty-state">No fixtures have been added yet.</p>
      ) : (
        <div className="table-container">
          <table className="fixture-table">
            <thead>
              <tr><th>Round</th><th>Kickoff</th><th>Venue</th><th>Fixture</th><th>Result</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {fixtures.map((fixture) => (
                <tr key={fixture.id}>
                  <td>{roundNames.get(fixture.round_id) ?? "Unknown round"}</td>
                  <td>{new Date(fixture.kickoff).toLocaleString()}</td>
                  <td>{fixture.location || "—"}</td>
                  <td>{teamNames.get(fixture.home_team_id) ?? "Unknown team"} vs {teamNames.get(fixture.away_team_id) ?? "Unknown team"}</td>
                  <td>{fixture.result}</td>
                  <td className="fixture-actions">
                    <button type="button" className="table-action" onClick={() => editFixture(fixture)}>Edit</button>
                    <button type="button" className="table-action table-action-danger" onClick={() => deleteFixture(fixture)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default FixtureManagement;
