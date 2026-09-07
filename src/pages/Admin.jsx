import { useState } from "react";
import "./Admin.css";

const startingFixtures = [
  {
    id: 1,
    home: "Liverpool",
    away: "Bournemouth",
    result: "Pending",
  },
  {
    id: 2,
    home: "Chelsea",
    away: "Everton",
    result: "Pending",
  },
  {
    id: 3,
    home: "Arsenal",
    away: "Fulham",
    result: "Pending",
  },
  {
    id: 4,
    home: "Tottenham",
    away: "Brentford",
    result: "Pending",
  },
];

const startingParticipants = [
  {
    id: 1,
    name: "James Greaney",
    selection: "Liverpool",
    status: "Alive",
  },
  {
    id: 2,
    name: "Fred Chan",
    selection: "Chelsea",
    status: "Alive",
  },
  {
    id: 3,
    name: "Jennifer Sun",
    selection: "Arsenal",
    status: "Alive",
  },
  {
    id: 4,
    name: "Ryan Townsend",
    selection: "Tottenham",
    status: "Alive",
  },
  {
    id: 5,
    name: "Sarah Thompson-Moule",
    selection: "Liverpool",
    status: "Alive",
  },
  {
    id: 6,
    name: "Jack Furness",
    selection: "Everton",
    status: "Alive",
  },
  {
    id: 7,
    name: "Frank Curcio",
    selection: "Fulham",
    status: "Alive",
  },
  {
    id: 8,
    name: "Aditya Biradar",
    selection: "Brentford",
    status: "Alive",
  },
];

function Admin() {
  const [fixtures, setFixtures] = useState(startingFixtures);

  const [participants, setParticipants] = useState(
    startingParticipants
  );

  const [processingMessage, setProcessingMessage] =
    useState("");

  const [roundProcessed, setRoundProcessed] =
    useState(false);

  const entryFee = 20;
  const currentWeek = 4;

  const entrants = participants.length;

  const remaining = participants.filter(
    (player) => player.status === "Alive"
  ).length;

  const eliminated = participants.filter(
    (player) => player.status === "Eliminated"
  ).length;

  const prizePool = entrants * entryFee;

  const survivalRate =
    entrants === 0
      ? 0
      : Math.round((remaining / entrants) * 100);

  const selectionStats = participants.reduce(
    (statistics, player) => {
      const existingTeam = statistics.find(
        (item) => item.team === player.selection
      );

      if (existingTeam) {
        existingTeam.count += 1;
      } else {
        statistics.push({
          team: player.selection,
          count: 1,
        });
      }

      return statistics;
    },
    []
  );

  const updatePlayerStatus = (
    playerId,
    newStatus
  ) => {
    setParticipants((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId
          ? {
              ...player,
              status: newStatus,
            }
          : player
      )
    );

    setProcessingMessage("");
    setRoundProcessed(false);
  };

  const updateFixtureResult = (
    fixtureId,
    newResult
  ) => {
    setFixtures((currentFixtures) =>
      currentFixtures.map((fixture) =>
        fixture.id === fixtureId
          ? {
              ...fixture,
              result: newResult,
            }
          : fixture
      )
    );

    setProcessingMessage("");
    setRoundProcessed(false);
  };

  const getParticipantOutcome = (player) => {
    const playerFixture = fixtures.find(
      (fixture) =>
        fixture.home === player.selection ||
        fixture.away === player.selection
    );

    if (!playerFixture) {
      return {
        status: player.status,
        reason: "No matching fixture",
      };
    }

    if (playerFixture.result === "Pending") {
      return {
        status: player.status,
        reason: "Result pending",
      };
    }

    if (playerFixture.result === "Postponed") {
      return {
        status: "Alive",
        reason: "Selected match postponed",
      };
    }

    if (playerFixture.result === "Draw") {
      return {
        status: "Eliminated",
        reason: "Selected match was drawn",
      };
    }

    const winningTeam =
      playerFixture.result === "Home Win"
        ? playerFixture.home
        : playerFixture.away;

    if (player.selection === winningTeam) {
      return {
        status: "Alive",
        reason: "Selected team won",
      };
    }

    return {
      status: "Eliminated",
      reason: "Selected team lost",
    };
  };

  const getWinnerForFixture = (fixture) => {
    if (fixture.result === "Home Win") {
      return fixture.home;
    }

    if (fixture.result === "Away Win") {
      return fixture.away;
    }

    if (fixture.result === "Draw") {
      return "Draw";
    }

    if (fixture.result === "Postponed") {
      return "Postponed";
    }

    return "Awaiting result";
  };

  const processResults = () => {
    const completedFixtures = fixtures.filter(
      (fixture) => fixture.result !== "Pending"
    );

    if (completedFixtures.length === 0) {
      setProcessingMessage(
        "No results have been entered. Select at least one fixture result before processing."
      );

      return;
    }

    let newlyEliminated = 0;
    let survivingPlayers = 0;
    let pendingPlayers = 0;

    const updatedParticipants = participants.map(
      (player) => {
        const outcome = getParticipantOutcome(player);

        if (outcome.reason === "Result pending") {
          pendingPlayers += 1;

          return player;
        }

        if (
          player.status !== "Eliminated" &&
          outcome.status === "Eliminated"
        ) {
          newlyEliminated += 1;
        }

        if (outcome.status === "Alive") {
          survivingPlayers += 1;
        }

        return {
          ...player,
          status: outcome.status,
          processingReason: outcome.reason,
        };
      }
    );

    setParticipants(updatedParticipants);
    setRoundProcessed(true);

    setProcessingMessage(
      `Week ${currentWeek} processed. ` +
        `${newlyEliminated} participant${
          newlyEliminated === 1 ? "" : "s"
        } eliminated, ` +
        `${survivingPlayers} confirmed alive and ` +
        `${pendingPlayers} awaiting a result.`
    );
  };

  const resetSimulator = () => {
    setFixtures(
      startingFixtures.map((fixture) => ({
        ...fixture,
      }))
    );

    setParticipants(
      startingParticipants.map((player) => ({
        ...player,
      }))
    );

    setProcessingMessage("");
    setRoundProcessed(false);
  };

  const allResultsEntered = fixtures.every(
    (fixture) => fixture.result !== "Pending"
  );

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Competition Administration</h1>

        <p>Last Man Standing Control Centre</p>
      </div>

      <div className="admin-stats">
        <div className="admin-card">
          <h3>Entrants</h3>

          <div className="admin-number">
            {entrants}
          </div>
        </div>

        <div className="admin-card">
          <h3>Remaining</h3>

          <div className="admin-number">
            {remaining}
          </div>
        </div>

        <div className="admin-card">
          <h3>Eliminated</h3>

          <div className="admin-number">
            {eliminated}
          </div>
        </div>

        <div className="admin-card">
          <h3>Prize Pool</h3>

          <div className="admin-number">
            ${prizePool.toLocaleString()}
          </div>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-section-label">
              Week {currentWeek}
            </p>

            <h2>Enter Fixture Results</h2>
          </div>

          <span
            className={
              allResultsEntered
                ? "round-status round-status-ready"
                : "round-status round-status-pending"
            }
          >
            {allResultsEntered
              ? "Ready to process"
              : "Results pending"}
          </span>
        </div>

        <p className="section-description">
          Select the confirmed result for each
          fixture. Participants will not be updated
          until you click Process Week Results.
        </p>

        <div className="results-fixture-list">
          {fixtures.map((fixture) => (
            <div
              className="result-fixture-row"
              key={fixture.id}
            >
              <div className="result-fixture-details">
                <strong>
                  {fixture.home} vs {fixture.away}
                </strong>

                <span>
                  Recorded outcome:{" "}
                  {getWinnerForFixture(fixture)}
                </span>
              </div>

              <label className="result-field">
                <span className="visually-hidden">
                  Result for {fixture.home} versus{" "}
                  {fixture.away}
                </span>

                <select
                  className="result-dropdown"
                  onChange={(event) =>
                    updateFixtureResult(
                      fixture.id,
                      event.target.value
                    )
                  }
                  value={fixture.result}
                >
                  <option value="Pending">
                    Select result
                  </option>

                  <option value="Home Win">
                    {fixture.home} won
                  </option>

                  <option value="Draw">
                    Draw
                  </option>

                  <option value="Away Win">
                    {fixture.away} won
                  </option>

                  <option value="Postponed">
                    Postponed or cancelled
                  </option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-section-label">
              Live preview
            </p>

            <h2>Participant Status</h2>
          </div>

          <span className="participant-count">
            {participants.length} participants
          </span>
        </div>

        <div className="table-container">
          <table className="fixture-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Selection</th>
                <th>Expected Outcome</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {participants.map((player) => {
                const expectedOutcome =
                  getParticipantOutcome(player);

                return (
                  <tr key={player.id}>
                    <td>
                      <strong>{player.name}</strong>
                    </td>

                    <td>{player.selection}</td>

                    <td>
                      <span
                        className={
                          expectedOutcome.status ===
                          "Eliminated"
                            ? "outcome-preview outcome-eliminated"
                            : expectedOutcome.reason ===
                                "Result pending"
                              ? "outcome-preview outcome-pending"
                              : "outcome-preview outcome-survives"
                        }
                      >
                        {expectedOutcome.reason}
                      </span>
                    </td>

                    <td>
                      <select
                        className={
                          player.status === "Alive"
                            ? "status-dropdown-alive"
                            : "status-dropdown-out"
                        }
                        onChange={(event) =>
                          updatePlayerStatus(
                            player.id,
                            event.target.value
                          )
                        }
                        value={player.status}
                      >
                        <option value="Alive">
                          Alive
                        </option>

                        <option value="Eliminated">
                          Eliminated
                        </option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Selection Distribution</h2>

        <div className="selection-distribution">
          {selectionStats
            .sort((a, b) => b.count - a.count)
            .map((team) => {
              const percentage = Math.round(
                (team.count / entrants) * 100
              );

              return (
                <div
                  className="distribution-row"
                  key={team.team}
                >
                  <div className="distribution-team">
                    <strong>{team.team}</strong>

                    <span>
                      {team.count} selection
                      {team.count === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="distribution-bar-container">
                    <div
                      className="distribution-bar"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <strong className="distribution-percentage">
                    {percentage}%
                  </strong>
                </div>
              );
            })}
        </div>
      </section>

      <section className="admin-section">
        <h2>Competition Health</h2>

        <div className="health-grid">
          <div className="health-card">
            <h4>Entry Fee</h4>
            <div>${entryFee}</div>
          </div>

          <div className="health-card">
            <h4>Survival Rate</h4>
            <div>{survivalRate}%</div>
          </div>

          <div className="health-card">
            <h4>Current Week</h4>
            <div>Week {currentWeek}</div>
          </div>

          <div className="health-card">
            <h4>Results Entered</h4>

            <div>
              {
                fixtures.filter(
                  (fixture) =>
                    fixture.result !== "Pending"
                ).length
              }
              /{fixtures.length}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-section rules-section">
        <h2>Simulator Rules</h2>

        <div className="rule-card">
          <h4>Selected Team Wins</h4>

          <p>
            The participant remains alive and
            progresses to the next round.
          </p>
        </div>

        <div className="rule-card">
          <h4>Selected Team Draws or Loses</h4>

          <p>
            The participant is eliminated from the
            competition.
          </p>
        </div>

        <div className="rule-card">
          <h4>Selected Match Is Postponed</h4>

          <p>
            The participant remains alive. The selected
            team would still count as used.
          </p>
        </div>

        <div className="rule-card">
          <h4>Result Is Still Pending</h4>

          <p>
            The participant's existing status is not
            changed.
          </p>
        </div>
      </section>

      <section className="admin-section danger-section">
        <h2>Round Processing</h2>

        <p>
          Review the expected participant outcomes
          before processing. This prototype can be
          reset after testing.
        </p>

        {processingMessage && (
          <div
            className={
              roundProcessed
                ? "processing-message processing-success"
                : "processing-message processing-warning"
            }
            role="status"
          >
            {processingMessage}
          </div>
        )}

        <div className="processing-actions">
          <button
            className="danger-btn"
            onClick={processResults}
            type="button"
          >
            Process Week Results
          </button>

          <button
            className="reset-simulator-btn"
            onClick={resetSimulator}
            type="button"
          >
            Reset Simulator
          </button>
        </div>
      </section>
    </div>
  );
}

export default Admin;