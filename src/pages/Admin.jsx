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
            {competitionStats.remaining}
          </div>
        </div>

        <div className="admin-card">
          <h3>Eliminated</h3>
          <div className="admin-number">
            {competitionStats.eliminated}
          </div>
        </div>

        <div className="admin-card">
          <h3>Prize Pool</h3>
          <div className="admin-number">
            ${competitionStats.prizePool}
          </div>
        </div>

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