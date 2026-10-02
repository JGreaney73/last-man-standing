import RoundResults from "./RoundResults";
import CompetitionStartingRound from "./CompetitionStartingRound";
import "./RoundResults.css";

function AdminConsole() {
  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Competition Administration</h1>
        <p>Last Man Standing Control Centre</p>
      </header>
      <CompetitionStartingRound />
      <RoundResults />
    </div>
  );
}

export default AdminConsole;
