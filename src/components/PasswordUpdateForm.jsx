import { useState } from "react";

function PasswordUpdateForm({ requireCurrentPassword = false, onPasswordChange, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("The new password and confirmation do not match.");
      return;
    }
    if (requireCurrentPassword && currentPassword === newPassword) {
      setError("Choose a new password different from your current password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onPasswordChange(currentPassword, newPassword);
      if (result?.error) throw result.error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setMessage("Your password has been updated.");
      onSuccess?.();
    } catch (updateError) {
      setError(updateError.message || "Your password could not be updated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="password-form" onSubmit={handleSubmit}>
      {requireCurrentPassword && (
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
      )}
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
        />
      </label>
      <p className="password-hint">
        Use at least 8 characters. Any stricter Supabase Auth password requirements also apply.
      </p>
      {error && <p className="account-error" role="alert">{error}</p>}
      {message && <p className="account-success" role="status">{message}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default PasswordUpdateForm;