import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { PasswordField, Spinner } from "../components/ui";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import { isGmail } from "../utils/authValidation";

export default function LoginPage() {
  const { user, loading, applyAuth } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isGmail(email)) {
      setError("Please use a valid Gmail address ending with @gmail.com.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { email, password, rememberMe });
      await applyAuth(data);
      nav(data.needsCollegeSetup ? "/app/onboarding" : "/app/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in with your staff Gmail to continue.">
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Gmail</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="username" />
        </div>
        <div className="field">
          <label>Password</label>
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <label className="auth-check">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          Keep me signed in on this device
        </label>
        <button className="btn" disabled={busy} type="submit">
          {busy ? <Spinner label="Signing in…" /> : "Sign in"}
        </button>
      </form>
      <AuthLinks />
    </AuthShell>
  );
}
