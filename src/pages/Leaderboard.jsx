import { participants } from "../data/participants";
import "./Leaderboard.css";

function Leaderboard() {

  const alivePlayers = participants.filter(
    (player) => player.status === "Alive"
  );

  const eliminatedPlayers = participants.filter(
    (player) => player.status === "Eliminated"
  );

  return (
    <div className="leaderboard-page">

      <div className="leaderboard-header">

        <h1>Leaderboard</h1>

        <p>
          Aspendale Stingrays Last Man Standing
        </p>

      </div>

      <div className="leaderboard-stats">

        <div className="leaderboard-card">
          <h3>Still Alive</h3>
          <div className="leaderboard-number">
            {alivePlayers.length}
          </div>
        </div>

        <div className="leaderboard-card">
          <h3>Eliminated</h3>
          <div className="leaderboard-number">
            {eliminatedPlayers.length}
          </div>
        </div>

      </div>

      <div className="leaderboard-section">

        <h2>Survivors</h2>

        <table className="leaderboard-table">

          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Selection</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {alivePlayers.map((player) => (
              <tr key={player.id}>

                <td>1</td>

                <td>{player.name}</td>

                <td>{player.selection}</td>

                <td>
                  <span className="alive">
                    Alive
                  </span>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      <div className="leaderboard-section">

        <h2>Eliminated Players</h2>

        <table className="leaderboard-table">

          <thead>
            <tr>
              <th>Player</th>
              <th>Selection</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {eliminatedPlayers.map((player) => (
              <tr key={player.id}>

                <td>{player.name}</td>

                <td>{player.selection}</td>

                <td>
                  <span className="eliminated">
                    Eliminated
                  </span>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Leaderboard;