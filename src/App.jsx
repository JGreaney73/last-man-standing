import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Selection from "./pages/Selection";
import Journey from "./pages/Journey";
import Admin from "./pages/Admin";

import "./App.css";

function App() {

  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    switch (page) {
      case "selection":
        return <Selection />;

      case "journey":
        return <Journey />;

      case "admin":
        return <Admin />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div>

      <nav className="navbar">

        <button
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          onClick={() => setPage("selection")}
        >
          Make Selection
        </button>

        <button
          onClick={() => setPage("journey")}
        >
          My Journey
        </button>

        <button
          onClick={() => setPage("admin")}
        >
          Admin
        </button>

      </nav>

      <main className="page-content">
        {renderPage()}
      </main>

    </div>
  );
}

export default App;