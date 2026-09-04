import "./Journey.css";

function Journey() {

  const history = [
  {
    week: 1,
    team: "Arsenal",
    result: "Won"
  },
  {
    week: 2,
    team: "Chelsea",
    result: "Won"
  },
  {
    week: 3,
    team: "Liverpool",
    result: "Won"
  },
  {
    week: 4,
    team: "Brighton",
    result: "Current"
  }
];

  const usedTeams = history.map(
    (pick) => pick.team
  );

  const remainingTeams = [
    "Manchester City",
    "Newcastle",
    "Brentford",
    "Crystal Palace",
    "Forest",
    "Bournemouth",
    "West Ham",
    "Fulham",
    "Everton",
  ];

  return (
    <div className="journey-page">

      <div className="journey-header">
        <h1>My Journey</h1>

        <p>
          Track your progress through the
          competition.
        </p>
      </div>

      <div className="journey-layout">

        <div className="card">

          <h2>Selection Timeline</h2>

          <div className="timeline">

            {history.map((pick) => (
              <div
                key={pick.week}
                className="timeline-item"
              >

                <div className="timeline-dot"></div>

                <div className="week-info">

                  <div className="week-title">
                    Week {pick.week}
                  </div>

                  <div>
                    Selected: {pick.team}
                  </div>

                  <div className="result">
                    {pick.result === "Current"
                      ? "⏳ Current Week"
                      : "✅ Survived"}
                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

        <div>

          <div className="card">

            <h2>Survival Rate</h2>

            <div className="stat-number">
              100%
            </div>

            <p>
              4 weeks survived from 4 played
            </p>

          </div>

          <div
            className="card"
            style={{
              marginTop: "20px",
            }}
          >

            <h2>Used Teams</h2>

            <div className="team-grid">

              {usedTeams.map((team) => (
                <div
                  key={team}
                  className="team-chip"
                >
                  ✅ {team}
                </div>
              ))}

            </div>

          </div>

          <div
            className="card"
            style={{
              marginTop: "20px",
            }}
          >

            <h2>Remaining Teams</h2>

            <div className="team-grid">

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

        </div>

      </div>

    </div>
  );
}

export default Journey;