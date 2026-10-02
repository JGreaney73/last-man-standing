import { useState } from "react";
import { useAuth } from "../context/useAuth";
import "./Login.css";

function Login({ onSignedIn }) {
  const { signIn, sendPasswordReset, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (!email.trim()) {
      setFormError("Enter your email address.");
      return;
    }

    setSubmitting(true);
    try {
      if (resetMode) {
        const result = await sendPasswordReset(email.trim());
        if (result.error) throw result.error;
        setMessage("If an account exists for that email, a password reset link has been sent.");
      } else {
        if (!password) {
          setFormError("Enter your password.");
          return;
        }
        const result = await signIn(email.trim(), password);
        if (result.error) throw result.error;
        onSignedIn();
      }
    } catch {
      setFormError(resetMode
        ? "The reset email could not be sent. Please try again."
        : "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <p className="login-eyebrow">Aspendale Stingrays FC</p>
        <h1 id="login-heading">Last Man Standing</h1>
        <p>{resetMode ? "Enter your email to receive a password reset link." : "Sign in to access the competition."}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {!resetMode && (
            <>
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </>
          )}

          {(formError || (!resetMode && error)) && (
            <p className="login-error" role="alert">
              {formError || error}
            </p>
          )}
          {message && <p className="login-success" role="status">{message}</p>}

          <button type="submit" disabled={submitting}>
            {submitting
              ? (resetMode ? "Sending…" : "Signing in…")
              : (resetMode ? "Send reset link" : "Sign in")}
          </button>
          <button
            className="login-text-button"
            type="button"
            onClick={() => {
              setResetMode(!resetMode);
              setFormError("");
              setMessage("");
            }}
          >
            {resetMode ? "Back to sign in" : "Forgot Password?"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
