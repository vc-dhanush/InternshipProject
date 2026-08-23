import { useState } from "react";
import api from "../services/api";
import { Spinner } from "../components/ui";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import { isGmail } from "../utils/authValidation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [devUrl, setDevUrl] = useState("");
  const [devMode, setDevMode] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    setDevUrl("");
    if (!email.trim()) {
      setError("Email is required.");
      setBusy(false);
      return;
    }
    if (!isGmail(email)) {
      setError("Please use a valid Gmail address ending with @gmail.com.");
      setBusy(false);
      return;
    }
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDevMode(Boolean(data.developmentMode));
      setMsg(data.message);
      if (data.developmentResetUrl) setDevUrl(data.developmentResetUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter the Gmail address on your staff account.">
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        {msg && <div className={devMode ? "error" : "success"}>{msg}</div>}
        <div className="field">
          <label>Gmail</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
        </div>
        <button className="btn" disabled={busy} type="submit">
          {busy ? <Spinner label="Requesting reset…" /> : "Send reset request"}
        </button>
      </form>
      {devUrl && (
        <p style={{ marginTop: 14, fontSize: 13 }}>
          Development reset link (email was not sent): <a href={devUrl}>{devUrl}</a>
        </p>
      )}
      <AuthLinks />
    </AuthShell>
  );
}
