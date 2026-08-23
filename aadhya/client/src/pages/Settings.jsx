import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { PasswordField, Spinner } from "../components/ui";
import { passwordChecklist } from "../utils/format";

export default function Settings() {
  const { settings, user, refresh, setSettings } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState({ currentPassword: "", password: "", confirmPassword: "" });

  const s = form || settings || {};
  function set(k, v) {
    setForm({ ...s, [k]: v });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData();
    ["collegeName", "collegeAddress", "appName", "minAttendancePercent", "defaultAttendanceStatus", "theme"].forEach((k) => {
      fd.append(k, s[k] ?? "");
    });
    fd.append("fullName", user.fullName);
    fd.append("email", user.email);
    const file = e.target.logo?.files?.[0];
    if (file) fd.append("logo", file);
    const { data } = await api.put("/settings", fd);
    setSettings(data.settings);
    await refresh();
    setBusy(false);
    setMsg("Settings saved.");
  }

  async function changePassword(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.post("/auth/change-password", pw);
      setMsg("Password changed.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const checks = passwordChecklist(pw.password);

  return (
    <div className="chart-grid">
      <form className="card page-card" onSubmit={save}>
        <h3>College</h3>
        {msg && <div className="success">{msg}</div>}
        <div className="field"><label>College name</label><input className="input" value={s.collegeName || ""} onChange={(e) => set("collegeName", e.target.value)} /></div>
        <div className="field"><label>Address</label><input className="input" value={s.collegeAddress || ""} onChange={(e) => set("collegeAddress", e.target.value)} /></div>
        <div className="field"><label>College logo (YOUR LOGO)</label><input className="input" type="file" name="logo" accept="image/*" /></div>
        <h3>Attendance</h3>
        <div className="field"><label>Minimum attendance %</label><input type="number" className="input" value={s.minAttendancePercent ?? 75} onChange={(e) => set("minAttendancePercent", e.target.value)} /></div>
        <div className="field">
          <label>Default attendance status</label>
          <select className="select" value={s.defaultAttendanceStatus || "present"} onChange={(e) => set("defaultAttendanceStatus", e.target.value)}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>
        <h3>Application</h3>
        <div className="field"><label>Application name</label><input className="input" value={s.appName || "Aadhya : attendance tracker"} onChange={(e) => set("appName", e.target.value)} /></div>
        <div className="field">
          <label>Theme preference</label>
          <select className="select" value={s.theme || "light"} onChange={(e) => set("theme", e.target.value)}>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
        <button className="btn" disabled={busy}>{busy ? <Spinner /> : "Save settings"}</button>
      </form>
      <form className="card page-card" onSubmit={changePassword}>
        <h3>Account password</h3>
        <p className="muted">{user?.email}</p>
        <div className="field"><label>Current password</label><PasswordField value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></div>
        <div className="field"><label>New password</label><PasswordField value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></div>
        <ul className="req">{checks.map((c) => <li key={c.label} className={c.ok ? "ok" : ""}>{c.ok ? "✓" : "○"} {c.label}</li>)}</ul>
        <div className="field"><label>Confirm</label><PasswordField value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} /></div>
        <button className="btn" disabled={busy}>Change password</button>
      </form>
    </div>
  );
}
