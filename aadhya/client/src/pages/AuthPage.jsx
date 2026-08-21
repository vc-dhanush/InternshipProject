import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { PasswordField, Spinner } from "../components/ui";
import { passwordChecklist } from "../utils/format";

export default function AuthPage() {
  const { user, loading, applyAuth } = useAuth();
  const [tab, setTab] = useState("login");
  if (loading) return <div className="auth-panel"><Spinner label="Loading…" /></div>;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return (
    <div className="auth-page">
      <div className="auth-art">
        <div>
          <img src="/assets/logo-placeholder.svg" alt="YOUR LOGO" width="48" height="48" style={{ borderRadius: 12 }} />
          <p className="muted" style={{ marginTop: 24 }}>Aadhya : attendance tracker</p>
          <h2>Attendance, tests, and academic insight in one workspace.</h2>
          <p>Built for teaching staff who need a fast, reliable record of every class, every student, every mark.</p>
        </div>
        <p className="muted">Developed by DHANUSH V C and DINESH DURGAPPA</p>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <h2 style={{ marginTop: 0 }}>Welcome</h2>
          <p className="muted">Sign in with your Gmail account to continue.</p>
          <div className="tabs">
            <button className={tab === "login" ? "on" : ""} type="button" onClick={() => setTab("login")}>Login</button>
            <button className={tab === "signup" ? "on" : ""} type="button" onClick={() => setTab("signup")}>Sign Up</button>
            <button className={tab === "forgot" ? "on" : ""} type="button" onClick={() => setTab("forgot")}>Forgot Password</button>
          </div>
          {tab === "login" && <LoginForm onDone={applyAuth} />}
          {tab === "signup" && <SignupForm onDone={applyAuth} />}
          {tab === "forgot" && <ForgotForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await onDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Gmail</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
      </div>
      <div className="field">
        <label>Password</label>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </div>
      <button className="btn" disabled={busy} type="submit">{busy ? <Spinner label="Signing in…" /> : "Sign in"}</button>
    </form>
  );
}

function SignupForm({ onDone }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checks = passwordChecklist(password);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/signup", { fullName, email, password, confirmPassword });
      await onDone(data);
    } catch (err) {
      setError(err.message + (err.details ? ` (${err.details.join(", ")})` : ""));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Full name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="field">
        <label>Gmail</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
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
      <button className="btn" disabled={busy} type="submit">{busy ? <Spinner label="Creating account…" /> : "Create account"}</button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [dev, setDev] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMsg(data.message);
      if (data.devResetUrl) setDev(data.devResetUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}
      <p className="muted">Enter your Gmail. When email is configured, a reset link will be sent. Until then, the server logs the link.</p>
      <div className="field">
        <label>Gmail</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
      </div>
      <button className="btn" disabled={busy} type="submit">{busy ? <Spinner label="Sending…" /> : "Send reset request"}</button>
      {dev && (
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Development reset link: <a href={dev}>{dev}</a>
        </p>
      )}
    </form>
  );
}

export function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checks = passwordChecklist(password);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password, confirmPassword });
      nav("/auth");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-art"><h2>Choose a new password</h2></div>
      <div className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <h2>Reset password</h2>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>New password</label>
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul className="req">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? "ok" : ""}>{c.ok ? "✓" : "○"} {c.label}</li>
              ))}
            </ul>
          </div>
          <div className="field">
            <label>Confirm password</label>
            <PasswordField value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn" disabled={busy}>{busy ? <Spinner /> : "Update password"}</button>
        </form>
      </div>
    </div>
  );
}
