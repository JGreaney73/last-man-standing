import { useState } from "react";
import PasswordUpdateForm from "../components/PasswordUpdateForm";
import { useAuth } from "../context/useAuth";
import "./Account.css";

function ResetPassword() {
  const { user, updatePassword } = useAuth();
  const [updated, setUpdated] = useState(false);

  return (
    <main className="account-page reset-password-page">
      <section className="account-section">
        <p className="login-eyebrow">Aspendale Stingrays FC</p>
        <h1>Set a New Password</h1>
        {user ? (
          <>
            <p>Choose a new password for your account.</p>
            <PasswordUpdateForm onPasswordChange={(_currentPassword, newPassword) => updatePassword(newPassword)} onSuccess={() => setUpdated(true)} />
            {updated && <a className="account-link" href="/dashboard">Continue to the competition</a>}
          </>
        ) : (
          <>
            <p className="account-error" role="alert">
              This reset link is invalid or has expired. Request a new password reset email.
            </p>
            <a className="account-link" href="/">Back to sign in</a>
          </>
        )}
      </section>
    </main>
  );
}

export default ResetPassword;