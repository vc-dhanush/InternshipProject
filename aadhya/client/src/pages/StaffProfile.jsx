import { useEffect, useState } from "react";
import api from "../services/api";
import { Spinner } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function StaffProfile() {
  const { refresh } = useAuth();
  const [pack, setPack] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get("/staff");
    setPack(data);
  }
  useEffect(() => { load(); }, []);

  if (!pack) return <Spinner label="Loading profile…" />;
  const u = pack.user;

  function set(k, v) {
    setPack({ ...pack, user: { ...u, [k]: v } });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("fullName", u.fullName || "");
      fd.append("phone", u.phone || "");
      fd.append("department", u.department || "");
      fd.append("designation", u.designation || "");
      fd.append("dateOfBirth", u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : "");
      fd.append("subjectsTaught", (u.subjectsTaught || []).join(", "));
      const file = e.target.photo?.files?.[0];
      if (file) fd.append("photo", file);
      await api.put("/staff", fd);
      await refresh();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="grid-stats" style={{ marginBottom: 16 }}>
        {Object.entries(pack.stats).map(([k, v]) => (
          <div className="card stat" key={k}>
            <div className="k">{k.replace(/([A-Z])/g, " $1")}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>
      <form className="card page-card form-grid" onSubmit={save}>
        <div className="field span-2">
          <label>Profile picture</label>
          <input className="input" type="file" name="photo" accept="image/*" />
        </div>
        <div className="field"><label>Full name</label><input className="input" value={u.fullName || ""} onChange={(e) => set("fullName", e.target.value)} /></div>
        <div className="field"><label>Staff ID</label><input className="input" disabled value={u.staffId} /></div>
        <div className="field"><label>Email</label><input className="input" disabled value={u.email} /></div>
        <div className="field"><label>Phone</label><input className="input" value={u.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
        <div className="field"><label>Date of birth</label><input type="date" className="input" value={u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : ""} onChange={(e) => set("dateOfBirth", e.target.value)} /></div>
        <div className="field"><label>Department</label><input className="input" value={u.department || ""} onChange={(e) => set("department", e.target.value)} /></div>
        <div className="field span-2"><label>Designation</label><input className="input" value={u.designation || ""} onChange={(e) => set("designation", e.target.value)} /></div>
        <div className="field span-2"><label>Subjects taught (comma separated)</label><input className="input" value={(u.subjectsTaught || []).join(", ")} onChange={(e) => set("subjectsTaught", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></div>
        <div className="field span-2">
          <label>Classes taught</label>
          <p className="muted">{pack.classesTaught.map((c) => `${c.name} (${c.subject})`).join(" • ") || "None yet"}</p>
        </div>
        <div className="span-2"><button className="btn" disabled={saving}>{saving ? <Spinner /> : "Save profile"}</button></div>
      </form>
    </div>
  );
}
