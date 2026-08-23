import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { AttendanceToggle, ConfirmDialog, EmptyState, Spinner } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export function AttendanceHistory() {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ classId: "", date: "", subject: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(next = filters) {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (next.classId) params.classId = next.classId;
      if (next.date) params.date = next.date;
      if (next.subject) params.subject = next.subject;
      const { data } = await api.get("/attendance/sessions", { params });
      setSessions(data.sessions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Attendance history" text="Filter saved sessions and open a sheet to review or edit." />
      {error && <div className="error">{error}</div>}
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 240 }} value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 180 }} placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
        <input type="date" className="input" style={{ maxWidth: 180 }} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <button className="btn secondary" type="button" onClick={() => load(filters)}>Filter</button>
      </div>
      {loading ? <Spinner label="Loading history…" /> : sessions.length === 0 ? (
        <EmptyState title="No attendance sessions" text="Saved attendance will appear here." />
      ) : (
        <div className="table-wrap mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Total</th>
                <th>Present</th>
                <th>Absent</th>
                <th>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td data-label="Date">{s.date} {s.time}</td>
                  <td data-label="Class">{s.class?.name}</td>
                  <td data-label="Subject">{s.subject}</td>
                  <td data-label="Total">{s.total}</td>
                  <td data-label="Present">{s.presentCount}</td>
                  <td data-label="Absent">{s.absentCount}</td>
                  <td data-label="%">{s.percentage}%</td>
                  <td><Link to={`/app/attendance/history/${s.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AttendanceSession() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const { settings } = useAuth();
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get(`/attendance/sessions/${sessionId}`)
      .then(({ data: d }) => {
        setData(d);
        setRows(d.records.map((r) => ({ id: r.id || r._id, status: r.status, student: r.student })));
      })
      .catch((err) => setError(err.message));
  }, [sessionId]);

  if (error && !data) {
    return <div className="card panel error-panel"><h3>Unable to open this session.</h3><p className="muted">{error}</p></div>;
  }
  if (!data) return <Spinner label="Loading session…" />;

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/attendance/sessions/${sessionId}`, { records: rows.map((r) => ({ id: r.id, status: r.status })) });
      setConfirmSave(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api.delete(`/attendance/sessions/${sessionId}`);
      nav("/app/attendance/history", { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title={`${data.session.class?.name || "Class"} · ${data.session.date}`} text={`${data.session.subject} · ${data.session.time}`} />
      {error && <div className="error">{error}</div>}
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <div className="college-chip" style={{ marginBottom: 10 }}>
          <img src={settings?.collegeLogo || "/assets/logo-placeholder.svg"} alt="" />
          <span>{settings?.collegeName || data.college?.collegeName || "YOUR COLLEGE NAME"}</span>
        </div>
        <div className="kpis">
          <div className="kpi"><span className="muted">Total</span><b>{rows.length}</b></div>
          <div className="kpi"><span className="muted">Present</span><b>{present}</b></div>
          <div className="kpi"><span className="muted">Absent</span><b>{absent}</b></div>
        </div>
        <div className="row-actions">
          <button className="btn" type="button" onClick={() => setConfirmSave(true)}>Save edits</button>
          <button className="btn danger" type="button" onClick={() => setConfirmDelete(true)}>Delete session</button>
        </div>
      </div>
      <div className="table-wrap mobile-cards">
        <table>
          <thead><tr><th>Student ID</th><th>Name</th><th>Attendance</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td data-label="Student ID">{r.student?.studentId}</td>
                <td data-label="Name">{r.student?.name}</td>
                <td data-label="Attendance">
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
      {confirmSave && (
        <ConfirmDialog
          title="Update saved attendance?"
          text="This changes a session that was already saved. Continue only if the original marks were incorrect."
          confirmLabel="Save changes"
          busy={saving}
          onClose={() => setConfirmSave(false)}
          onConfirm={save}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this session?"
          text="Attendance records for this session will be removed. This cannot be undone."
          confirmLabel="Delete session"
          danger
          busy={saving}
          onClose={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
