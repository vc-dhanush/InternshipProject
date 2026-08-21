import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { AttendanceToggle, Spinner } from "../components/ui";

export function AttendanceHistory() {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ classId: "", date: "", subject: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await api.get("/attendance/sessions", { params: filters });
      setSessions(data.sessions);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes));
    load();
  }, []);

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 240 }} value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="input" style={{ maxWidth: 180 }} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <input className="input" style={{ maxWidth: 180 }} placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
        <button className="btn secondary" onClick={load}>Filter</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Time</th><th>Class</th><th>Subject</th><th>Present</th><th>Absent</th><th>Session</th><th></th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.time}</td>
                <td>{s.class?.name}</td>
                <td>{s.subject}</td>
                <td>{s.presentCount}</td>
                <td>{s.absentCount}</td>
                <td>{s.sessionCode}</td>
                <td><Link to={`/app/history/${s.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AttendanceSession() {
  const id = window.location.pathname.split("/").pop();
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/attendance/sessions/${id}`).then(({ data: d }) => {
      setData(d);
      setRows(d.records.map((r) => ({ id: r.id || r._id, status: r.status, student: r.student })));
    });
  }, [id]);

  if (!data) return <Spinner label="Loading session…" />;

  async function save() {
    setSaving(true);
    await api.put(`/attendance/sessions/${id}`, { records: rows.map((r) => ({ id: r.id, status: r.status })) });
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Delete this session?")) return;
    await api.delete(`/attendance/sessions/${id}`);
    window.location.href = "/app/history";
  }

  return (
    <div>
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <h3>{data.session.class?.name} • {data.session.date} {data.session.time}</h3>
        <p className="muted">{data.session.sessionCode} • {data.session.subject}</p>
        <div className="row-actions">
          <button className="btn" onClick={save} disabled={saving}>{saving ? <Spinner /> : "Save edits"}</button>
          <button className="btn danger" onClick={remove}>Delete</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{r.student?.rollNo}</td>
                <td>{r.student?.name}</td>
                <td>
                  <AttendanceToggle value={r.status} onChange={(v) => {
                    const next = [...rows];
                    next[i] = { ...r, status: v };
                    setRows(next);
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
