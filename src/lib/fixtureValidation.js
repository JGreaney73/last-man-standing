export function validateFixture(values, existingFixtures = [], editingId = null) {
  const errors = {};
  const homeTeamId = Number(values.homeTeamId);
  const awayTeamId = Number(values.awayTeamId);
  const roundId = Number(values.roundId);
  const kickoff = new Date(values.kickoff);

  if (!values.location?.trim()) {
    errors.location = "Enter the venue.";
  }

  if (!Number.isInteger(roundId) || roundId <= 0) {
    errors.roundId = "Select a round.";
  }

  if (!Number.isInteger(homeTeamId) || homeTeamId <= 0) {
    errors.homeTeamId = "Select the home team.";
  }

  if (!Number.isInteger(awayTeamId) || awayTeamId <= 0) {
    errors.awayTeamId = "Select the away team.";
  }

  if (homeTeamId === awayTeamId && homeTeamId > 0) {
    errors.awayTeamId = "Home and away teams must be different.";
  }

  if (!values.kickoff || Number.isNaN(kickoff.getTime())) {
    errors.kickoff = "Enter a valid match date and time.";
  }

  const duplicate = existingFixtures.some((fixture) => {
    if (String(fixture.id) === String(editingId)) return false;

    return (
      Number(fixture.round_id) === roundId &&
      Number(fixture.home_team_id) === homeTeamId &&
      Number(fixture.away_team_id) === awayTeamId &&
      new Date(fixture.kickoff).getTime() === kickoff.getTime()
    );
  });

  if (duplicate) {
    errors.form = "This fixture already exists in the selected round.";
  }

  return errors;
}

export function toDatetimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
