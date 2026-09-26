import { useState } from "react";
import { useAuth } from "../context/useAuth";
import "./Login.css";

function Login({ onSignedIn }) {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!email.trim() || !password) {
      setFormError("Enter your email address and password.");
      return;
    }

    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setFormError("Invalid email or password.");
    } else {
      onSignedIn();
    }
    setSubmitting(false);
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <p className="login-eyebrow">Aspendale Stingrays FC</p>
        <h1 id="login-heading">Last Man Standing</h1>
        <p>Sign in to access the competition.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {(formError || error) && (
            <p className="login-error" role="alert">
              {formError || error}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
