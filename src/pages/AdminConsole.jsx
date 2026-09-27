import RoundResults from "./RoundResults";
import "./RoundResults.css";

function AdminConsole() {
  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Competition Administration</h1>
        <p>Last Man Standing Control Centre</p>
      </header>
      <RoundResults />
    </div>
  );
}

export default AdminConsole;
