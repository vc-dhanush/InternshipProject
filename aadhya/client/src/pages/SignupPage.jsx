import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { PasswordField, Spinner } from "../components/ui";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import { isGmail, isStrongPassword, isValidStaffId, passwordChecklist } from "../utils/authValidation";

export default function SignupPage() {
  const { user, loading, applyAuth } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checks = passwordChecklist(password);

  if (loading) {
    return (
      <div className="auth-panel" style={{ minHeight: "100vh" }}>
        <Spinner label="Checking session…" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.onboardingComplete ? "/app/dashboard" : "/app/onboarding"} replace />;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isGmail(email)) {
      setError("Please use a valid Gmail address ending with @gmail.com.");
      return;
    }
    if (!isValidStaffId(staffId)) {
      setError("Staff ID must be 3–32 characters and use letters, numbers, dots, underscores, or hyphens.");
      return;
    }
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
      const { data } = await api.post("/auth/signup", {
        fullName,
        email,
        staffId,
        password,
        confirmPassword,
      });
      await applyAuth(data);
      nav("/app/onboarding", { replace: true });
    } catch (err) {
      setError(err.message + (err.details ? ` (${err.details.join(", ")})` : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your staff account" subtitle="Use a Gmail address. Your Staff ID stays unique to you.">
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </div>
        <div className="field">
          <label>Gmail address</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" />
        </div>
        <div className="field">
          <label>Staff ID</label>
          <input className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="e.g. ADH-1042" autoComplete="off" />
        </div>
        <div className="field">
          <label>Password</label>
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
          {confirmPassword && confirmPassword !== password && <p className="error">Passwords do not match.</p>}
        </div>
        <button className="btn" disabled={busy} type="submit">
          {busy ? <Spinner label="Creating account…" /> : "Create account"}
        </button>
      </form>
      <AuthLinks />
    </AuthShell>
  );
}
