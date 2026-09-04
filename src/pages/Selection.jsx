import { useEffect, useState } from "react";
import "./Selection.css";

const fixtures = [
  {
    id: 1,
    kickOff: "Friday, 8:00 pm",
    home: "Liverpool",
    away: "Bournemouth",
  },
  {
    id: 2,
    kickOff: "Saturday, 12:30 pm",
    home: "Arsenal",
    away: "Fulham",
  },
  {
    id: 3,
    kickOff: "Saturday, 3:00 pm",
    home: "Chelsea",
    away: "Everton",
  },
  {
    id: 4,
    kickOff: "Saturday, 3:00 pm",
    home: "Brighton",
    away: "West Ham",
  },
  {
    id: 5,
    kickOff: "Saturday, 5:30 pm",
    home: "Tottenham",
    away: "Brentford",
  },
];

const previouslyUsedTeams = [
  { team: "Arsenal", week: 1 },
  { team: "Chelsea", week: 2 },
  { team: "Aston Villa", week: 3 },
];

function Selection() {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [lockedSelection, setLockedSelection] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const savedSelection = localStorage.getItem(
      "lastManStandingLockedSelection"
    );

    if (savedSelection) {
      setLockedSelection(savedSelection);
      setSelectedTeam(savedSelection);
    }
  }, []);

  const isTeamUsed = (team) => {
    return previouslyUsedTeams.some(
      (usedSelection) => usedSelection.team === team
    );
  };

  const getUsedWeek = (team) => {
    const usedSelection = previouslyUsedTeams.find(
      (selection) => selection.team === team
    );

    return usedSelection?.week;
  };

  const handleTeamSelection = (team) => {
    if (lockedSelection || isTeamUsed(team)) {
      return;
    }

    setSelectedTeam(team);
  };

  const openConfirmation = () => {
    if (!selectedTeam || lockedSelection) {
      return;
    }

    setShowConfirmation(true);
  };

  const cancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const confirmSelection = () => {
    localStorage.setItem(
      "lastManStandingLockedSelection",
      selectedTeam
    );

    setLockedSelection(selectedTeam);
    setShowConfirmation(false);
  };

  const resetSelection = () => {
    localStorage.removeItem(
      "lastManStandingLockedSelection"
    );

    setLockedSelection("");
    setSelectedTeam("");
  };

  return (
    <div className="selection-page">

      <div className="selection-hero">
        <h1>Make Your Selection</h1>

        <p>
          Choose one Premier League team to win
          this weekend.
        </p>
      </div>

      {lockedSelection ? (
        <div className="locked-banner">
          <h2>
            Selection Locked ✓
          </h2>

          <p>
            Your selection:
            <strong> {lockedSelection}</strong>
          </p>
        </div>
      ) : (
        <div className="instruction-banner">
          Select a team and lock your choice.
        </div>
      )}

      <div className="selection-layout">

        <div className="fixtures-panel">

          <h2>Fixtures</h2>

          {fixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="fixture-card"
            >

              <div className="fixture-time">
                {fixture.kickOff}
              </div>

              <div className="fixture-teams">

                {[fixture.home, fixture.away].map(
                  (team) => {
                    const used =
                      isTeamUsed(team);

                    const selected =
                      selectedTeam === team;

                    return (
                      <button
                        key={team}
                        className={`team-button
                          ${
                            selected
                              ? "team-button-selected"
                              : ""
                          }
                          ${
                            used
                              ? "team-button-used"
                              : ""
                          }
                        `}
                        disabled={
                          used ||
                          Boolean(
                            lockedSelection
                          )
                        }
                        onClick={() =>
                          handleTeamSelection(
                            team
                          )
                        }
                      >

                        <span>
                          {team}
                        </span>

                        <small>
                          {used
                            ? `Used Week ${getUsedWeek(
                                team
                              )}`
                            : selected
                              ? "Selected"
                              : "Available"}
                        </small>

                      </button>
                    );
                  }
                )}

              </div>
            </div>
          ))}

        </div>

        <div className="selection-sidebar">

          <div className="selection-summary">

            <h2>Current Selection</h2>

            {selectedTeam ? (
              <>
                <h3>{selectedTeam}</h3>

                <p>
                  Selected for Week 4
                </p>
              </>
            ) : (
              <p>
                No team selected
              </p>
            )}

            {!lockedSelection && (
              <button
                className="lock-selection-button"
                disabled={
                  !selectedTeam
                }
                onClick={
                  openConfirmation
                }
                type="button"
              >
                Confirm and Lock
              </button>
            )}

            <button
              className="reset-selection-button"
              onClick={
                resetSelection
              }
              type="button"
            >
              Reset Selection
            </button>

          </div>

          <div className="used-teams-panel">

            <h2>
              Previously Used Teams
            </h2>

            {previouslyUsedTeams.map(
              (selection) => (
                <div
                  key={selection.team}
                  className="used-team-row"
                >
                  <span>
                    {selection.team}
                  </span>

                  <small>
                    Week {selection.week}
                  </small>
                </div>
              )
            )}

          </div>

        </div>

      </div>

      {showConfirmation && (
        <div className="modal-overlay">

          <div className="confirmation-modal">

            <h2>
              Lock in {selectedTeam}?
            </h2>

            <p>
              Once confirmed,
              this choice cannot be
              changed.
            </p>

            <div className="modal-actions">

              <button
                className="secondary-button"
                onClick={
                  cancelConfirmation
                }
              >
                Cancel
              </button>

              <button
                className="confirm-button"
                onClick={
                  confirmSelection
                }
              >
                Confirm Selection
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Selection;