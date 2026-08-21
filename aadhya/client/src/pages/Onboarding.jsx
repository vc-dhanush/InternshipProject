import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/ui";

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [collegeName, setName] = useState("");
  const [collegeAddress, setAddress] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user?.onboardingComplete) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (!collegeName.trim()) {
      setError("College name is required.");
      setBusy(false);
      return;
    }
    try {
      const fd = new FormData();
      fd.append("collegeName", collegeName.trim());
      fd.append("collegeAddress", collegeAddress);
      if (file) fd.append("logo", file);
      await api.post("/onboarding", fd);
      await refresh();
      nav("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card page-card" style={{ maxWidth: 560, margin: "40px auto" }}>
      <h2>Set up your college</h2>
      <p className="muted">Required once after your first sign-in. You can change this later in Settings.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="form-grid" style={{ marginTop: 16 }}>
        <div className="field span-2">
          <label>College name</label>
          <input className="input" required value={collegeName} onChange={(e) => setName(e.target.value)} placeholder="YOUR COLLEGE NAME" />
        </div>
        <div className="field span-2">
          <label>Address (optional)</label>
          <input className="input" value={collegeAddress} onChange={(e) => setAddress(e.target.value)} placeholder="YOUR COLLEGE ADDRESS" />
        </div>
        <div className="field span-2">
          <label>College logo (optional — YOUR LOGO)</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <div className="span-2">
          <button className="btn" disabled={busy}>{busy ? <Spinner label="Saving…" /> : "Continue to dashboard"}</button>
        </div>
      </form>
    </div>
  );
}
