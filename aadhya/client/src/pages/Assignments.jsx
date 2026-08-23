import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { ConfirmDialog, EmptyState, Modal, Spinner } from "../components/ui";
import { todayISO } from "../utils/format";

const emptyForm = {
  title: "",
  subject: "",
  classId: "",
  description: "",
  assignedDate: todayISO(),
  dueDate: todayISO(),
  maxMarks: 20,
};

export default function Assignments() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const nav = useNavigate();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (classId) params.classId = classId;
      const { data } = await api.get("/assignments", { params });
      setItems(data.assignments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [classId]);

  function onClassChange(id) {
    const cls = classes.find((c) => c.id === id);
    setForm({ ...form, classId: id, subject: cls?.subject || form.subject });
  }

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/assignments", form);
      setOpen(false);
      nav(`/app/assignments/${data.assignment.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function archive() {
    try {
      await api.delete(`/assignments/${pending.id}`);
      setPending(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        text="Create unlimited assignments and record marks from the class list."
        actions={<button className="btn" type="button" onClick={() => { setForm(emptyForm); setOpen(true); }}>+ Create assignment</button>}
      />
      {error && !open && <div className="error">{error}</div>}
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 240 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {loading ? <Spinner label="Loading assignments…" /> : items.length === 0 ? (
        <EmptyState title="No assignments yet" text="Create an assignment for a class. Student names are loaded automatically when you enter marks." />
      ) : (
        <div className="table-wrap mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Assignment</th><th>Class</th><th>Subject</th><th>Assigned</th><th>Due</th><th>Max marks</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td data-label="Assignment">{a.title}</td>
                  <td data-label="Class">{a.class?.name}</td>
                  <td data-label="Subject">{a.subject}</td>
                  <td data-label="Assigned">{a.assignedDate}</td>
                  <td data-label="Due">{a.dueDate}</td>
                  <td data-label="Max">{a.maxMarks}</td>
                  <td data-label="Status"><span className="badge">{a.status}</span></td>
                  <td>
                    <div className="row-actions" style={{ marginTop: 0 }}>
                      <Link className="btn secondary" to={`/app/assignments/${a.id}`}>View</Link>
                      <button className="btn ghost" type="button" onClick={() => nav(`/app/assignments/${a.id}`)}>Edit</button>
                      <button className="btn ghost" type="button" onClick={() => setPending(a)}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal title="Create assignment" onClose={() => setOpen(false)}>
          {error && <div className="error">{error}</div>}
          <form onSubmit={create} className="form-grid">
            <div className="field span-2"><label>Assignment title</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label>Class</label>
              <select className="select" required value={form.classId} onChange={(e) => onClassChange(e.target.value)}>
                <option value="">Select</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Subject</label><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div className="field span-2"><label>Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="field"><label>Assigned date</label><input type="date" className="input" required value={form.assignedDate} onChange={(e) => setForm({ ...form, assignedDate: e.target.value })} /></div>
            <div className="field"><label>Due date</label><input type="date" className="input" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div className="field"><label>Maximum marks</label><input type="number" min="0" className="input" required value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} /></div>
            <div className="span-2"><button className="btn">Create & enter marks</button></div>
          </form>
        </Modal>
      )}
      {pending && (
        <ConfirmDialog
          title="Archive this assignment?"
          text={`${pending.title} will be hidden from the list. Marks are kept.`}
          confirmLabel="Archive"
          danger
          onClose={() => setPending(null)}
          onConfirm={archive}
        />
      )}
    </div>
  );
}

export function AssignmentDetail() {
  const { id } = useParams();
  const [pack, setPack] = useState(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const { data } = await api.get(`/assignments/${id}`);
    setPack(data);
  }
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (error && !pack) return <div className="card panel error-panel"><h3>Unable to open this assignment.</h3><p className="muted">{error}</p></div>;
  if (!pack) return <Spinner label="Loading assignment…" />;

  const rows = pack.rows.filter((r) => `${r.student.name} ${r.student.studentId}`.toLowerCase().includes(q.toLowerCase()));
  const a = pack.analytics || {};
  const max = pack.assignment.maxMarks;

  function setMark(i, value) {
    setPack({ ...pack, rows: pack.rows.map((r, idx) => (idx === i ? { ...r, obtainedMarks: value } : r)) });
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/assignments/${id}/marks`, {
        marks: pack.rows.map((r) => ({ studentId: r.student.id, obtainedMarks: r.obtainedMarks })),
      });
      await load();
      setSuccess("Marks saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function markComplete() {
    await api.put(`/assignments/${id}`, { completed: true });
    await load();
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{pack.assignment.title}</h2>
        <p className="muted">{pack.assignment.class?.name} · {pack.assignment.subject} · Due {pack.assignment.dueDate} · {pack.assignment.status}</p>
        {pack.assignment.description && <p>{pack.assignment.description}</p>}
        <div className="kpis">
          <div className="kpi"><span className="muted">Highest</span><b>{a.evaluated ? a.highest : "—"}</b></div>
          <div className="kpi"><span className="muted">Lowest</span><b>{a.evaluated ? a.lowest : "—"}</b></div>
          <div className="kpi"><span className="muted">Average</span><b>{a.evaluated ? a.average : "—"}</b></div>
          <div className="kpi"><span className="muted">Avg %</span><b>{a.averagePercent != null ? `${a.averagePercent}%` : "—"}</b></div>
          <div className="kpi"><span className="muted">Evaluated</span><b>{a.evaluated || 0}</b></div>
        </div>
        {!pack.assignment.completed && <button className="btn secondary" type="button" onClick={markComplete}>Mark completed</button>}
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" type="button" disabled={saving} onClick={save}>{saving ? <Spinner label="Saving…" /> : "Save marks"}</button>
      </div>
      <div className="table-wrap mobile-cards">
        <table>
          <thead><tr><th>Student ID</th><th>Student name</th><th>Maximum marks</th><th>Obtained marks</th><th>%</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const idx = pack.rows.indexOf(r);
              const obtained = r.obtainedMarks === "" || r.obtainedMarks == null ? "" : Number(r.obtainedMarks);
              const pct = obtained === "" || !max ? "—" : `${Math.round((obtained / max) * 1000) / 10}%`;
              return (
                <tr key={r.student.id}>
                  <td data-label="Student ID">{r.student.studentId}</td>
                  <td data-label="Name"><Link to={`/app/students/${r.student.id}`}>{r.student.name}</Link></td>
                  <td data-label="Max">{max}</td>
                  <td data-label="Obtained">
                    <input className="input mark-input" type="number" min="0" max={max} value={r.obtainedMarks} onChange={(e) => setMark(idx, e.target.value)} />
                  </td>
                  <td data-label="%">{pct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
