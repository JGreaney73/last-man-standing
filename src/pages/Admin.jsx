import { useState } from "react";
import "./Admin.css";

function Admin() {
  const competitionStats = {
    entrants: 150,
    remaining: 87,
    eliminated: 63,
    prizePool: 2400,
    currentWeek: 8,
  };

  const fixtures = [
    {
      match: "Liverpool vs Bournemouth",
      result: "Liverpool",
      status: "Completed",
    },
    {
      match: "Chelsea vs Everton",
      result: "Draw",
      status: "Completed",
    },
    {
      match: "Arsenal vs Fulham",
      result: "Postponed",
      status: "Postponed",
    },
  ];

  const [participants, setParticipants] = useState([
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
      status: "Eliminated",
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
  ]);

const remaining = participants.filter(
(player) => player.status === "Alive"
).length;

const eliminated = participants.filter(
(player) => player.status === "Eliminated"
).length;

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
};
  const selectionStats = [
  {
    team: "Liverpool",
    count: 35,
  },
  {
    team: "Arsenal",
    count: 24,
  },
  {
    team: "Tottenham",
    count: 16,
  },
  {
    team: "Brighton",
    count: 12,
  },
  ];

  return (
    <div className="admin-page">

      <div className="admin-header">
        <h1>Competition Administration</h1>
        <p>Last Man Standing Control Centre</p>
      </div>

      {/* Competition Stats */}

      <div className="admin-stats">

        <div className="admin-card">
          <h3>Entrants</h3>
          <div className="admin-number">
            {competitionStats.entrants}
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
            ${competitionStats.prizePool}
          </div>
        </div>

        <div className="admin-card">
          <h3>Current Week</h3>
          <div className="admin-number">
            {competitionStats.currentWeek}
          </div>
        </div>

      </div>


     {/* Selection Distribution */}

      <div className="admin-section">

        <h2>Selection Distribution</h2>

        {selectionStats.map((team) => (

          <div
            className="distribution-row"
            key={team.team}
          >

            <div>
              {team.team}
            </div>

            <div>
              {team.count} selections
            </div>

          </div>

        ))}

      </div>


     {/* Competition Health */}
     
      <div className="admin-section">

        <h2>Competition Health</h2>

        <div className="health-grid">

          <div className="health-card">
            <h4>Entry Fee</h4>
            <div>$20</div>
          </div>

          <div className="health-card">
            <h4>Survival Rate</h4>
            <div>58%</div>
          </div>

          <div className="health-card">
            <h4>Weeks Remaining</h4>
            <div>16</div>
          </div>

        </div>

      </div>


     {/* Round Processing */}
     
      <div className="admin-section danger-section">

        <h2>Round Processing</h2>

        <p>
          These actions affect participant outcomes.
        </p>

        <button className="danger-btn">
          Process Week Results
        </button>

        <button className="danger-btn">
          Eliminate Failed Selections
        </button>

        <button className="danger-btn">
          Finalise Round
        </button>

      </div>


      {/* Competition Actions */}

      <div className="admin-section">

        <h2>Competition Actions</h2>

        <div className="button-grid">

          <button className="action-btn">
            Import Fixtures
          </button>

          <button className="action-btn">
            Import Participants
          </button>

          <button className="action-btn">
            Lock Selections
          </button>

          <button className="action-btn">
            Calculate Auto Picks
          </button>

          <button className="action-btn">
            Process Results
          </button>

          <button className="action-btn">
            Determine Winners
          </button>

        </div>

      </div>

      {/* Fixture Management */}

      <div className="admin-section">

        <h2>Current Round Fixtures</h2>

        <table className="fixture-table">

          <thead>
            <tr>
              <th>Fixture</th>
              <th>Result</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {fixtures.map((fixture, index) => (
              <tr key={index}>
                <td>{fixture.match}</td>
                <td>{fixture.result}</td>
                <td>{fixture.status}</td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>


      {/* Participant Status */}

      <div className="admin-section">

        <h2>Participant Status</h2>

        <table className="fixture-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Selection</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {participants.map((player) => (
              <tr key={player.id}>

                <td>{player.name}</td>

                <td>{player.selection}</td>

                <td>

                <select
                  value={player.status}
                  onChange={(e) =>
                    updatePlayerStatus(
                      player.id,
                      e.target.value
                    )
                  }
                  className={
                    player.status === "Alive"
                      ? "status-dropdown-alive"
                      : "status-dropdown-out"
                  }
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
            ))}

          </tbody>
        </table>

      </div>


      {/* Round Processing Logic */}

      <div className="admin-section">

        <h2>Round Processing Rules</h2>

        <div className="rule-card">

          <h4>Winning Selection</h4>

          <p>
            Player survives and proceeds to next week.
          </p>

        </div>

        <div className="rule-card">

          <h4>Draw or Loss</h4>

          <p>
            Player eliminated from competition.
          </p>

        </div>

        <div className="rule-card">

          <h4>Postponed Match</h4>

          <p>
            Player advances automatically but the team
            becomes unavailable for future selection.
          </p>

        </div>

        <div className="rule-card">

          <h4>No Selection Submitted</h4>

          <p>
            First unused team in alphabetical order is
            automatically assigned.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Admin;