import PasswordUpdateForm from "../components/PasswordUpdateForm";
import { useAuth } from "../context/useAuth";
import "./Account.css";

function Settings() {
  const { changePassword } = useAuth();

  return (
    <div className="account-page">
      <header className="account-header">
        <h1>Settings</h1>
      </header>
      <section className="account-section">
        <h2>Change Password</h2>
        <PasswordUpdateForm requireCurrentPassword onPasswordChange={changePassword} />
      </section>
    </div>
  );
}

export default Settings;