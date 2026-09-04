import "./Dashboard.css";

function Dashboard() {

  const stats = {
    prizePool: 2400,
    totalPlayers: 150,
    remainingPlayers: 87,
    eliminatedPlayers: 63,
    currentWeek: 4,
  };

  const remainingTeams = [
    "Liverpool",
    "Manchester City",
    "Newcastle",
    "Brighton",
    "Brentford",
    "West Ham",
    "Crystal Palace",
    "Bournemouth",
  ];

  const weeklySurvivors = [
    150,
    142,
    135,
    124,
    112,
    103,
    95,
    87,
  ];

  return (
    <div className="dashboard">

      <h1>Competition Dashboard</h1>

      {/* Stats */}

      <div className="dashboard-grid">

        <div className="stat-card">
          <h3>Prize Pool</h3>
          <div className="stat-value">
            ${stats.prizePool}
          </div>
        </div>

        <div className="stat-card">
          <h3>Current Week</h3>
          <div className="stat-value">
            {stats.currentWeek}
          </div>
        </div>

        <div className="stat-card">
          <h3>Players Remaining</h3>
          <div className="stat-value">
            {stats.remainingPlayers}
          </div>
        </div>

        <div className="stat-card">
          <h3>Eliminated</h3>
          <div className="stat-value">
            {stats.eliminatedPlayers}
          </div>
        </div>

      </div>

      {/* Survivor Funnel */}

      <div className="panel">
        <h2>Survivor Progression</h2>

        {weeklySurvivors.map((count, index) => {
          const width =
            (count / stats.totalPlayers) * 100;

          return (
            <div
              key={index}
              className="survivor-row"
            >
              <div className="week-label">
                Week {index + 1}
              </div>

              <div className="bar-container">
                <div
                  className="bar"
                  style={{
                    width: `${width}%`,
                  }}
                >
                  {count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lower Panels */}

      <div className="two-column">

        <div className="panel">

          <h2>Remaining Teams Available</h2>

          <div className="teams-grid">

            {remainingTeams.map((team) => (
              <div
                key={team}
                className="team-chip"
              >
                {team}
              </div>
            ))}

          </div>

        </div>

        <div className="panel">

          <h2>Recent Activity</h2>

          <ul>
            <li>
              8 players eliminated after
              selecting Chelsea
            </li>

            <li>
              Liverpool was selected by 35%
              of participants
            </li>

            <li>
              87 players remain standing
            </li>

            <li>
              Week 9 selections open now
            </li>
          </ul>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;