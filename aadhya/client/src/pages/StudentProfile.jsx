import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { EmptyState, Modal, Spinner } from "../components/ui";
import { initials } from "../components/Icons";

export default function StudentProfile() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", studentId: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: d } = await api.get(`/students/${studentId}`);
    setData(d);
    setForm({ name: d.student.name, studentId: d.student.studentId });
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/students/${studentId}`, { name: form.name, studentId: form.studentId, rollNo: form.studentId });
      setEdit(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card panel"><Spinner label="Loading student…" /></div>;
  if ((error && !data) || !data) {
    return (
      <div className="card panel error-panel">
        <h3>Unable to open this student.</h3>
        <p className="muted">{error || "You may not have access to this record."}</p>
        <Link className="btn secondary" to="/app/classes">Back to classes</Link>
      </div>
    );
  }

  const s = data.student;
  const att = data.attendance || {};
  const tests = data.tests || {};
  const assignments = data.assignments || { items: [] };
  const seminars = data.seminars || { items: [] };

  return (
    <div>
      <PageHeader
        title={s.name}
        text={`${s.class?.name || "Class"} · ${s.studentId}`}
        actions={<button className="btn secondary" type="button" onClick={() => setEdit(true)}>Edit</button>}
      />
      {error && <div className="error">{error}</div>}
      <section className="card profile-head">
        {s.profilePicture ? <img src={s.profilePicture} alt="" /> : <div className="ph">{initials(s.name)}</div>}
        <div>
          <h3 style={{ marginTop: 0 }}>Basic information</h3>
          <p><strong>Student name:</strong> {s.name}</p>
          <p><strong>Student ID:</strong> {s.studentId}</p>
          <p><strong>Class:</strong> {s.class?.name} {s.class?.section ? `· ${s.class.section}` : ""} · {s.class?.subject}</p>
          {s.archived && <span className="badge muted">Archived</span>}
        </div>
      </section>
      <div className="chart-grid" style={{ marginTop: 16 }}>
        <section className="card panel">
          <h3>Attendance</h3>
          {att.totalClasses ? (
            <div className="kpis">
              <div className="kpi"><span className="muted">Attendance %</span><b>{att.percentage}%</b></div>
              <div className="kpi"><span className="muted">Present</span><b>{att.present}</b></div>
              <div className="kpi"><span className="muted">Absent</span><b>{att.absent}</b></div>
              <div className="kpi"><span className="muted">Classes</span><b>{att.totalClasses}</b></div>
            </div>
          ) : (
            <EmptyState title="No attendance yet" text="Attendance appears here after sessions are saved for this class." />
          )}
        </section>
        <section className="card panel">
          <h3>Tests &amp; marks</h3>
          {tests.testsTaken ? (
            <div className="kpis">
              <div className="kpi"><span className="muted">Tests taken</span><b>{tests.testsTaken}</b></div>
              <div className="kpi"><span className="muted">Average marks</span><b>{tests.averageMarks}</b></div>
              <div className="kpi"><span className="muted">Highest</span><b>{tests.highest}</b></div>
              <div className="kpi"><span className="muted">Lowest</span><b>{tests.lowest}</b></div>
            </div>
          ) : (
            <EmptyState title="No tests yet" text="Marks appear here after tests are created and scores are entered." />
          )}
        </section>
        <section className="card panel">
          <h3>Assignments</h3>
          {assignments.items?.length ? (
            <ul>
              {assignments.items.map((a) => (
                <li key={a.id}><Link to={`/app/assignments/${a.id}`}>{a.title}</Link> · {a.obtainedMarks}/{a.maxMarks} ({a.percentage}%)</li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No assignments yet" text="Assignment marks appear here after they are recorded." />
          )}
        </section>
        <section className="card panel">
          <h3>Seminars</h3>
          {seminars.items?.length ? (
            <ul>
              {seminars.items.map((sm) => (
                <li key={sm.id}><Link to={`/app/seminars/${sm.id}`}>{sm.title}</Link> · {sm.participation || "recorded"}</li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No seminars yet" text="Seminar participation appears here after records are saved." />
          )}
        </section>
      </div>
      {edit && (
        <Modal title="Edit student" onClose={() => !saving && setEdit(false)}>
          <form onSubmit={save} className="form-grid">
            <div className="field span-2">
              <label>Student name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field span-2">
              <label>Student ID</label>
              <input className="input" required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
            </div>
            <div className="span-2 row-actions">
              <button className="btn" disabled={saving}>{saving ? <Spinner label="Saving…" /> : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
