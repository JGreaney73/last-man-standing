import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Selection from "./pages/Selection";
import Journey from "./pages/Journey";
import Admin from "./pages/Admin";
import Leaderboard from "./pages/Leaderboard";
import stingraysLogo from "./assets/stingrays-logo.png";
import Login from "./components/Login";
import { useAuth } from "./context/useAuth";
import "./App.css";

const pageTitles = {
  dashboard: "Dashboard",
  selection: "Make Selection",
  journey: "My Journey",
  leaderboard: "Leaderboard",
  admin: "Admin",
};

const pagePaths = {
  dashboard: "/dashboard",
  selection: "/selection",
  journey: "/journey",
  leaderboard: "/leaderboard",
  admin: "/admin",
};

function pageFromPath(pathname) {
  return Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0]
    ?? "dashboard";
}

function App() {
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));
  const { configured, loading, user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const handlePopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPage) => {
    window.history.pushState({}, "", pagePaths[nextPage]);
    setPage(nextPage);
  };

  const handleSignedIn = () => {
    window.history.replaceState({}, "", pagePaths.dashboard);
    setPage("dashboard");
  };

  if (!configured) {
    return (
      <main className="setup-state">
        <h1>Supabase configuration required</h1>
        <p>
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local
          environment before starting the application.
        </p>
      </main>
    );
  }

  if (loading) {
    return <main className="setup-state">Loading your session…</main>;
  }

  if (!user) {
    return <Login onSignedIn={handleSignedIn} />;
  }

  const renderPage = () => {
    switch (page) {
      case "selection":
        return <Selection />;

      case "leaderboard":
        return <Leaderboard />;

      case "journey":
        return <Journey />;

      case "admin":
        return isAdmin ? (
          <Admin />
        ) : (
          <section className="access-state" role="alert">
            <h1>Admin access required</h1>
            <p>Your account is not authorised to view this area.</p>
          </section>
        );

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <nav className="navbar" aria-label="Primary navigation">
        <div className="navbar-brand">
          <img src={stingraysLogo} alt="Aspendale Stingrays FC" className="club-logo" />
          <div className="brand-copy">
            <div className="page-title">{pageTitles[page]}</div>
            <div className="brand-subtitle">Aspendale Stingrays FC</div>
          </div>
        </div>

        <div className="nav-buttons">
          <button type="button" aria-current={page === "dashboard" ? "page" : undefined} onClick={() => navigate("dashboard")}>
            Dashboard
          </button>
          <button type="button" aria-current={page === "selection" ? "page" : undefined} onClick={() => navigate("selection")}>
            Make Selection
          </button>
          <button type="button" aria-current={page === "journey" ? "page" : undefined} onClick={() => navigate("journey")}>
            My Journey
          </button>
          <button type="button" aria-current={page === "leaderboard" ? "page" : undefined} onClick={() => navigate("leaderboard")}>
            Leaderboard
          </button>
          <button type="button" aria-current={page === "admin" ? "page" : undefined} onClick={() => navigate("admin")}>
            Admin
          </button>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <main id="main-content" className="page-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
