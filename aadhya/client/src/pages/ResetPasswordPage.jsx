import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { PasswordField, Spinner } from "../components/ui";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import { isStrongPassword, passwordChecklist } from "../utils/authValidation";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checks = passwordChecklist(password);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError("Password does not meet the security requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { token, password, confirmPassword });
      nav("/auth", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="This link can be used once and then expires.">
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>New password</label>
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
          <ul className="req">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "ok" : ""}>
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="field">
          <label>Confirm password</label>
          <PasswordField value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" />
        </div>
        <button className="btn" disabled={busy} type="submit">
          {busy ? <Spinner label="Updating password…" /> : "Update password"}
        </button>
      </form>
      <AuthLinks />
    </AuthShell>
  );
}
